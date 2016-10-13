#!/usr/bin/env bash
source /opt/circonus/etc/pg-conf.sh

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
PGDATABASE="${PGDATABASE:="postgres"}"
PGPASS="${PGPASS:=""}"
PGPORT="${PGPORT:="5432"}"

if [ -n "$PGPASS" ]; then
    export PGPASSWORD="$PGPASS"
fi

IFS=','
OLDIFS=$IFS
LINEBREAKS=$'\n\b'
CONNECTIONS=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'connections', max_connections, total_used, coalesce(round(100*(total_used/max_connections)),0) as pct_used, idle, idle_in_txn, ((total_used - idle) - idle_in_txn) as active, (select coalesce(extract(epoch from (max(now() - query_start))),0) from pg_stat_activity where query = ' in transaction') as max_idle_in_txn from (select count(*) as total_used, coalesce(sum(case when query = '' then 1 else 0 end),0) as idle, coalesce(sum(case when query = ' in transaction' then 1 else 0 end),0) as idle_in_txn from pg_stat_activity) x join (select setting::float AS max_connections FROM pg_settings WHERE name = 'max_connections') xx ON (true);")

print_norm() {
    printf "%s\tL\t%s\n" $1 $2
}
DATA=( `echo "${CONNECTIONS}"` )

MAX_CONNECTIONS=${DATA[1]}
TOTAL_USED=${DATA[2]}
PCT_USED=${DATA[3]}
IDLE=${DATA[4]}
IDLE_IN_TXN=${DATA[5]}
ACTIVE=${DATA[6]}
MAX_IDLE_IN_TXN=${DATA[7]}

#echo -e "pg_connections\tl\t${DATA[0]}"
print_norm max_connections $MAX_CONNECTIONS
print_norm total_used $TOTAL_USED
print_norm pct_used $PCT_USED
print_norm idle $IDLE
print_norm idle_in_txn $IDLE_IN_TXN
print_norm active $ACTIVE
print_norm max_idle_in_txn $MAX_IDLE_IN_TXN


