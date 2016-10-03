#!/usr/bin/env bash
source /opt/circonus/etc/pg-conf.sh

which pg_isready >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"

pg_isready -U "$PGUSER" -q
DATA=$?

print_norm() {
    printf "%s\tL\t%s\n" $1 $2
}

print_norm isready_status $DATA


