#!/bin/bash

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"
#IFS=','
#OLDIFS=$IFS
#LINEBREAKS=$'\n\b'

DB_LIST=`psql -U "$PGUSER" -F, -Atc "SELECT datname from pg_database where datname !='template0'"`

print_norm_int() {
    printf "%s\tL\t%s\n" $1 $2
}

for db in $DB_LIST ; do
vacuum_data=$(psql -U "$PGUSER" -F, -Atc "SELECT datname, txns as \"age/txn\", wrap, ROUND(100*(txns/wrap::float)) as wrap_perc , freez, ROUND(100*(txns/freez::float)) AS perc FROM (SELECT foo.wrap::int, foo.freez::int, age(datfrozenxid) AS txns, datname FROM pg_database d JOIN (SELECT 2000000000 as wrap, setting AS freez FROM pg_settings WHERE name = 'autovacuum_freeze_max_age') AS foo ON (true) WHERE d.datallowconn) AS foo2 where datname='$db' ORDER BY 6 DESC, 1 ASC")
IFS=','
DATA=( `echo "${vacuum_data}"` )
echo -e "${DATA[0]}:age\tL\t${DATA[1]}"
echo -e "${DATA[0]}:wrap\tL\t${DATA[2]}"
echo -e "${DATA[0]}:wrap_perc\tL\t${DATA[3]}"
echo -e "${DATA[0]}:freez\tL\t${DATA[4]}"
echo -e "${DATA[0]}:perc\tL\t${DATA[5]}"
done
