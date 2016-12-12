#!/usr/bin/env bash

plugin_dir=$(dirname $(readlink -f ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] || { echo "Unable to find pg functions ${pgfuncs}"; exit 1; }
source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

IFS=','
LINEBREAKS=$'\n\b'
CONNECTIONS=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'connections', max_connections, total_used, coalesce(round(100*(total_used/max_connections)),0) as pct_used, idle, idle_in_txn, ((total_used - idle) - idle_in_txn) as active, (select coalesce(extract(epoch from (max(now() - query_start))),0) from pg_stat_activity where query = ' in transaction') as max_idle_in_txn from (select count(*) as total_used, coalesce(sum(case when query = '' then 1 else 0 end),0) as idle, coalesce(sum(case when query = ' in transaction' then 1 else 0 end),0) as idle_in_txn from pg_stat_activity) x join (select setting::float AS max_connections FROM pg_settings WHERE name = 'max_connections') xx ON (true);")

DATA=( $CONNECTIONS )

MAX_CONNECTIONS=${DATA[1]}
TOTAL_USED=${DATA[2]}
PCT_USED=${DATA[3]}
IDLE=${DATA[4]}
IDLE_IN_TXN=${DATA[5]}
ACTIVE=${DATA[6]}
MAX_IDLE_IN_TXN=${DATA[7]}

print_uint max_connections $MAX_CONNECTIONS
print_uint total_used $TOTAL_USED
print_uint pct_used $PCT_USED
print_uint idle $IDLE
print_uint idle_in_txn $IDLE_IN_TXN
print_uint active $ACTIVE
print_uint max_idle_in_txn $MAX_IDLE_IN_TXN

# END
