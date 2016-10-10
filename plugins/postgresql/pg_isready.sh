#!/bin/bash
source /opt/circonus/etc/pg-conf.sh

which pg_isready >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
PGDATABASE="${PGDATABASE:="postgres"}"
PGPASS="${PGPASS:=""}"
PGPORT="${PGPORT:="5432"}"

if [ -n "$PGPASS" ]; then
    export PGPASSWORD="$PGPASS"
fi

pg_isready -U $PGUSER -d $PGDATABASE -p $PGPORT -w -q
DATA=$?

print_norm() {
    printf "%s\tL\t%s\n" $1 $2
}

print_norm isready_status $DATA


