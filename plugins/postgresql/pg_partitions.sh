#!/usr/bin/env bash

plugin_dir="/opt/circonus/etc/node-agent.d/postgresql"
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] && source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

IFS=','
LINEBREAKS=$'\n\b'

PARTITIONS=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'childnum', coalesce(count(distinct inhrelid),0) as count from pg_inherits")

DATA=( $PARTITIONS )

print_int ${DATA[0]} ${DATA[1]}

# END
