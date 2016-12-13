#!/usr/bin/env bash

plugin_dir=$(dirname $(readlink -f ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] || { echo "Unable to find pg functions ${pgfuncs}"; exit 1; }
source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

IFS=','
LINEBREAKS=$'\n\b'

PARTITIONS=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'childnum', coalesce(count(distinct inhrelid),0) as count from pg_inherits")

DATA=( $PARTITIONS )

print_int ${DATA[0]} ${DATA[1]}

# END
