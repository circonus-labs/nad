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

OLDIFS=$IFS
LINEBREAKS=$'\n\b'

DB_LIST=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "select datname,pg_database_size(datname) from pg_database;")

for db in $DB_LIST; do
   IFS=','
  DATA=( `echo "${db}"` )
  echo -e "${DATA[0]}\tL\t${DATA[1]}"
done

