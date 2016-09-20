#!/bin/bash
source /opt/circonus/etc/pg-conf.sh

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
PGDATABASE="${PGDATABASE:="postgres"}"
PGPASS="${PGPASS:=""}"
PGPORT="${PGPORT:="5432"}"

if [ -n "$PGPASS" ]; then
    export PGPASSWORD="$PGPASS"
fi

IFS=','
OLDIFS=$IFS
LINEBREAKS=$'\n\b'
STATS=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select 'tables', sum(n_tup_ins) as inserts, sum(n_tup_upd) as updates, sum(n_tup_del) as deletes, sum(idx_scan) as index_scans, sum(seq_scan) as seq_scans, sum(idx_tup_fetch) as index_tup_fetch, sum(seq_tup_read) as seq_tup_read, coalesce(extract(epoch from now() - max(last_autovacuum))) as max_last_autovacuum , coalesce(extract(epoch from now() - max(last_vacuum))) as max_last_vacuum , coalesce(extract(epoch from now() - max(last_autoanalyze))) as max_last_autoanalyze , coalesce(extract(epoch from now() - max(last_analyze))) as max_last_analyze from pg_stat_all_tables")

print_norm_int() {
    printf "%s\tL\t%s\n" $1 $2
}
print_norm_dbl() {
    printf "%s\tn\t%s\n" $1 $2
}
    
DATA=( `echo "${STATS}"` )

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

print_norm_int inserts $INSERTS
print_norm_int updates $UPDATES
print_norm_int deletes $DELETES
print_norm_int index_scans $INDEX_SCANS
print_norm_int seq_scans $SEQ_SCANS
print_norm_int index_tup_fetch $INDEX_TUP_FETCH
print_norm_int seq_tup_read $SEQ_TUP_READ
print_norm_dbl max_last_autovacuum $MAX_LAST_AUTOVACUUM
print_norm_dbl max_last_vacuum $MAX_LAST_VACUUM
print_norm_dbl max_last_autoanalyze $MAX_LAST_AUTOANALYZE
print_norm_dbl max_last_analyze $MAX_LAST_ANALYZE




