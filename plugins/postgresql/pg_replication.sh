#!/bin/bash
source /opt/circonus/etc/pg-conf.sh

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
PGDATABASE="${PGDATABASE:="postgres"}"
PGPASS="${PGPASS:=""}"
PGPORT="${PGPORT:="5432"}"

if [ -n "$PGPASS" ]; then
    export PGPASSWORD="$PGPASS"
fi

OLDIFS=$IFS
LINEBREAKS=$'\n\b'

MASTER_LIST=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select client_addr, pg_xlog_location_diff(sent_location, write_location) from pg_stat_replication")
REPLICA=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F " " -Atc "select pg_xlog_location_diff(pg_last_xlog_receive_location(), pg_last_xlog_replay_location()), extract(epoch from now()) - extract(epoch from pg_last_xact_replay_timestamp())")

# This check runs on a master. Large numbers can indicate problems sending
# xlogs to replicas, ie network problems
#
# each client comes in the form
#     client_addr,xlog_diff(sent,written)
for slave in $MASTER_LIST; do
  IFS=','
  DATA=( `echo "${slave}"` )
  echo -e "pg_replication:${DATA[0]}:master:xlog_sent_diff\tl\t${DATA[1]}"
done

# This check runs on replicas. Large numbers indicate problems applying xlogs
# ie file system or disk saturation.
#
# replica data comes in the form
#     xlog_diff(received,written),time_since(commit|rollback)
IFS=$OLDIFS
DATA=( `echo ${REPLICA}` )
echo -e "pg_replication:0:replica:xlog_applied_diff\tl\t${DATA[0]}"
echo -e "pg_replication:0:replica:time_since_commit\tl\t${DATA[1]}"
