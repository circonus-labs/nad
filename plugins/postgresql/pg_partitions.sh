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

PARTITIONS=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'childnum', coalesce(count(distinct inhrelid),0) as count from pg_inherits")
IFS=','
DATA=( `echo "${PARTITIONS}"` )
echo -e "${DATA[0]}\tl\t${DATA[1]}"
