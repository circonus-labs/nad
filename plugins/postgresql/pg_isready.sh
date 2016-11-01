#!/usr/bin/env bash

plugin_dir=$(dirname $(readlink -e ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] || { echo "Unable to find pg functions ${pgfuncs}"; exit 1; }
source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

PGCMD=$(command -v pg_isready)
[[ $? -eq 0 ]] || { echo "Unable to find 'pg_isready' command"; exit 1; }

$PGCMD -U $PGUSER -d $PGDATABASE -p $PGPORT -q
DATA=$?

print_int "isready_status" $DATA

# END
