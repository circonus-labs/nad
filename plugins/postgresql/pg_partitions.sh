#!/bin/bash

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"

OLDIFS=$IFS
LINEBREAKS=$'\n\b'

PARTITIONS=$(psql -U "$PGUSER" -F, -Atc "select 'childnum', coalesce(count(distinct inhrelid),0) as count from pg_inherits")
IFS=','
DATA=( `echo "${PARTITIONS}"` )
echo -e "${DATA[0]}\tl\t${DATA[1]}"
