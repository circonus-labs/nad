#!/bin/bash
source /opt/circonus/etc/pg-conf.sh

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
PGDATABASE="${PGDATABASE:="postgres"}"
OLDIFS=$IFS
LINEBREAKS=$'\n\b'

DB_LIST=$(psql -U "$PGUSER" -F, -Atc "select sum(heap_blks_read) * current_setting('block_size')::NUMERIC, sum(heap_blks_hit) * current_setting('block_size')::NUMERIC, sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) from pg_statio_user_tables" ${PGDATABASE})

for db in $DB_LIST; do
   IFS=','
  DATA=( `echo "${db}"` )
  echo -e "${PGDATABASE}\\\`disk_bytes_read\tL\t${DATA[0]}"
  echo -e "${PGDATABASE}\\\`cache_bytes_read\tL\t${DATA[1]}"
  echo -e "${PGDATABASE}\\\`cache_hit_ratio\tn\t${DATA[2]}"
done

IFS=$OLDIFS
