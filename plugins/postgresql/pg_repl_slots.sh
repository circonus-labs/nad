#!/usr/bin/env bash

plugin_dir=$(dirname $(readlink -f ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] || { echo "Unable to find pg functions ${pgfuncs}"; exit 1; }
source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

LINEBREAKS=$'\n\b'

SLOT=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "SELECT slot_name, active, pg_xlog_location_diff(pg_current_xlog_insert_location(), restart_lsn) AS retained_bytes FROM pg_replication_slots")

for a in $SLOT; do
    IFS=','
    DATA=( $a )
	print_str "slot_name" ${DATA[0]}
	print_str "active" ${DATA[1]}
	print_uint "retained_bytes" ${DATA[2]}
done

# END
