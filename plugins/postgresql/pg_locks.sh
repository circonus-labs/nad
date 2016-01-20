#!/bin/bash

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
IFS=','
OLDIFS=$IFS
LINEBREAKS=$'\n\b'
LOCKS=$(psql -U "$PGUSER" -F, -Atc "select 'locks', count(*) as total, count(nullif(granted,true)) as waiting, count(nullif(mode ilike '%exclusive%',false)) as exclusive from pg_locks")

print_norm_int() {
    printf "%s\tL\t%s\n" $1 $2
}
print_norm_dbl() {
    printf "%s\tn\t%s\n" $1 $2
}
    
DATA=( `echo "${LOCKS}"` )

TOTAL=${DATA[1]}
WAITING=${DATA[2]}
EXCLUSIVE=${DATA[3]}

print_norm_int total $TOTAL
print_norm_int waiting $WAITING
print_norm_int exclusive $EXCLUSIVE




