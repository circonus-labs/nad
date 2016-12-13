#!/usr/bin/env bash

plugin_dir=$(dirname $(readlink -f ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] || { echo "Unable to find pg functions ${pgfuncs}"; exit 1; }
source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

LINEBREAKS=$'\n\b'

DB_LIST=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "SELECT buffers_checkpoint, buffers_clean, buffers_backend, buffers_alloc FROM pg_stat_bgwriter")

for db in $DB_LIST; do
    IFS=','
    DATA=( $db )
    print_uint "buffers_at_checkpoint" ${DATA[0]}
    print_uint "buffers_cleaned" ${DATA[1]}
    print_uint "buffers_by_backend" ${DATA[2]}
    print_uint "buffers_allocated" ${DATA[3]}
done

# END
