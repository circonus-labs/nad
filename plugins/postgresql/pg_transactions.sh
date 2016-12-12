#!/usr/bin/env bash

plugin_dir=$(dirname $(readlink -f ${BASH_SOURCE[0]}))
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] || { echo "Unable to find pg functions ${pgfuncs}"; exit 1; }
source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

IFS=','
LINEBREAKS=$'\n\b'
TRANSACTIONS=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'transactions', txid_snapshot_xmax(txid_current_snapshot()) as xmax, commits, rollback from (select sum(xact_commit) as commits, sum(xact_rollback) as rollback from pg_stat_database) as x")

DATA=( $TRANSACTIONS )

XMAX=${DATA[1]}
COMMITS=${DATA[2]}
ROLLBACK=${DATA[3]}

print_uint xmax $XMAX
print_uint commits $COMMITS
print_uint rollback $ROLLBACK

# END
