#!/usr/bin/env bash

plugin_dir=$(dirname $(realpath ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] && source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

LINEBREAKS=$'\n\b'

DB_LIST=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select sum(heap_blks_read) * current_setting('block_size')::NUMERIC, sum(heap_blks_hit) * current_setting('block_size')::NUMERIC, sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read) + 0.000001) from pg_statio_user_tables")

for db in $DB_LIST; do
    IFS=','
    DATA=( $db )
    print_uint "${PGDATABASE}\`disk_bytes_read" ${DATA[0]}
    print_uint "${PGDATABASE}\`cache_bytes_read" ${DATA[1]}
    print_dbl "${PGDATABASE}\`cache_hit_ratio" ${DATA[2]}
done

# END
