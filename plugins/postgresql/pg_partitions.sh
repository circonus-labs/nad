#!/usr/bin/env bash
source /opt/circonus/etc/pg-conf.sh

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
PGDATABASE="${PGDATABASE:="postgres"}"

OLDIFS=$IFS
LINEBREAKS=$'\n\b'

PARTITIONS=$(psql -U "$PGUSER" -F, -Atc "select 'childnum', coalesce(count(distinct inhrelid),0) as count from pg_inherits" $PGDATABASE)
IFS=','
DATA=( `echo "${PARTITIONS}"` )
echo -e "${DATA[0]}\tl\t${DATA[1]}"
