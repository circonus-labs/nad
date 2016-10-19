#!/usr/bin/env bash

plugin_dir=$(cd $(dirname ${BASH_SOURCE[0]}) && pwd -P)
pgfuncs="${plugin_dir}/pg_functions.sh"
[[ -f $pgfuncs ]] && source $pgfuncs
[[ ${pg_functions:-0} -eq 0 ]] && { echo "Invalid plugin configuration."; exit 1; }

IFS=','
LINEBREAKS=$'\n\b'
STATS=$($PSQL -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'tables', sum(n_tup_ins) as inserts, sum(n_tup_upd) as updates, sum(n_tup_del) as deletes, sum(idx_scan) as index_scans, sum(seq_scan) as seq_scans, sum(idx_tup_fetch) as index_tup_fetch, sum(seq_tup_read) as seq_tup_read, coalesce(extract(epoch from now() - max(last_autovacuum))) as max_last_autovacuum , coalesce(extract(epoch from now() - max(last_vacuum))) as max_last_vacuum , coalesce(extract(epoch from now() - max(last_autoanalyze))) as max_last_autoanalyze , coalesce(extract(epoch from now() - max(last_analyze))) as max_last_analyze from pg_stat_all_tables")

DATA=( $STATS )

INSERTS=${DATA[1]}
UPDATES=${DATA[2]}
DELETES=${DATA[3]}
INDEX_SCANS=${DATA[4]}
SEQ_SCANS=${DATA[5]}
INDEX_TUP_FETCH=${DATA[6]}
SEQ_TUP_READ=${DATA[7]}
MAX_LAST_AUTOVACUUM=${DATA[8]}
MAX_LAST_VACUUM=${DATA[9]}
MAX_LAST_AUTOANALYZE=${DATA[10]}
MAX_LAST_ANALYZE=${DATA[11]}

print_uint inserts $INSERTS
print_uint updates $UPDATES
print_uint deletes $DELETES
print_uint index_scans $INDEX_SCANS
print_uint seq_scans $SEQ_SCANS
print_uint index_tup_fetch $INDEX_TUP_FETCH
print_uint seq_tup_read $SEQ_TUP_READ
print_dbl max_last_autovacuum $MAX_LAST_AUTOVACUUM
print_dbl max_last_vacuum $MAX_LAST_VACUUM
print_dbl max_last_autoanalyze $MAX_LAST_AUTOANALYZE
print_dbl max_last_analyze $MAX_LAST_ANALYZE

# END
