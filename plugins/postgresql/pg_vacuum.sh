#!/bin/bash

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
#IFS=','
#OLDIFS=$IFS
#LINEBREAKS=$'\n\b'

DB_LIST=`psql -U "$PGUSER" -F, -Atc "SELECT datname from pg_database where datallowconn"`

print_norm_int() {
    printf "%s\tL\t%s\n" $1 $2
}

for db in $DB_LIST ; do
vacuum_data=$(psql -U "$PGUSER" -F, -Atc "WITH max_age AS (SELECT 2000000000 as max_old_xid, setting AS autovacuum_freeze_max_age FROM pg_settings WHERE name = 'autovacuum_freeze_max_age'), per_database_stats AS (SELECT datname, m.max_old_xid::int, m.autovacuum_freeze_max_age::int, age(d.datfrozenxid) AS oldest_current_xid FROM pg_database d JOIN max_age m ON (true) WHERE d.datallowconn) SELECT datname, oldest_current_xid, ROUND(100*(oldest_current_xid/max_old_xid::float)) AS percent_towards_wraparound, ROUND(100*(oldest_current_xid/autovacuum_freeze_max_age::float)) AS percent_towards_emergency_autovac FROM per_database_stats WHERE datname = '$db' ORDER BY 3 DESC, 2 DESC, 1 ASC;")
IFS=','
DATA=( `echo "${vacuum_data}"` )
echo -e "${DATA[0]}:oldest_current_xid\tL\t${DATA[1]}"
echo -e "${DATA[0]}:percent_towards_wraparound\tL\t${DATA[2]}"
echo -e "${DATA[0]}:percent_towards_emergency_autovac\tL\t${DATA[3]}"
done
