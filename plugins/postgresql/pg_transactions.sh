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

IFS=','
OLDIFS=$IFS
LINEBREAKS=$'\n\b'
TRANSACTIONS=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'transactions', txid_snapshot_xmax(txid_current_snapshot()) as xmax, commits, rollback from (select sum(xact_commit) as commits, sum(xact_rollback) as rollback from pg_stat_database) as x")

print_norm() {
    printf "%s\tL\t%s\n" $1 $2
}
DATA=( `echo "${TRANSACTIONS}"` )

XMAX=${DATA[1]}
COMMITS=${DATA[2]}
ROLLBACK=${DATA[3]}

print_norm xmax $XMAX
print_norm commits $COMMITS
print_norm rollback $ROLLBACK


