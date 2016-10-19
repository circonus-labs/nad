#!/usr/bin/env bash

plugin_dir="/opt/circonus/etc/node-agent.d/postgresql"
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] && source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

LINEBREAKS=$'\n\b'

MASTER_LIST=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select client_addr, pg_xlog_location_diff(sent_location, write_location) from pg_stat_replication")
REPLICA=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F " " -Atc "select pg_xlog_location_diff(pg_last_xlog_receive_location(), pg_last_xlog_replay_location()), extract(epoch from now()) - extract(epoch from pg_last_xact_replay_timestamp())")

# This check runs on a master. Large numbers can indicate problems sending
# xlogs to replicas, ie network problems
#
# each client comes in the form
#     client_addr,xlog_diff(sent,written)
for slave in $MASTER_LIST; do
    IFS=','
    DATA=( $slave )
    print_int "pg_replication:${DATA[0]}:master:xlog_sent_diff" ${DATA[1]}
done

# This check runs on replicas. Large numbers indicate problems applying xlogs
# ie file system or disk saturation.
#
# replica data comes in the form
#     xlog_diff(received,written),time_since(commit|rollback)
IFS=','
DATA=( $REPLICA )

print_int "pg_replication:0:replica:xlog_applied_diff" ${DATA[0]}
print_int "pg_replication:0:replica:time_since_commit" ${DATA[1]}

# END
