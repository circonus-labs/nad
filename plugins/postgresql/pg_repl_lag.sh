#!/usr/bin/env bash

plugin_dir=$(dirname $(readlink -f ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] || { echo "Unable to find pg functions ${pgfuncs}"; exit 1; }
source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

LINEBREAKS=$'\n\b'

LAG=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "SELECT application_name, pg_xlog_location_diff(pg_current_xlog_insert_location(), flush_location) AS lag_bytes FROM pg_stat_replication")

for a in $LAG; do
    IFS=','
    DATA=( $a )
	print_str "application_name" ${DATA[0]}
    print_uint "lag" ${DATA[1]}
done

# END
