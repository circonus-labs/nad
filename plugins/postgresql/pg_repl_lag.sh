#!/bin/bash

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"

LAG=$(psql -U "$PGUSER" -F, -Atc "SELECT application_name, pg_xlog_location_diff(pg_current_xlog_insert_location(), flush_location) AS lag_bytes FROM pg_stat_replication")

for a in $LAG; do
    IFS=','
    DATA=( `echo "$a"` )
	echo -e "application_name\ts\t${DATA[0]}"
	echo -e "lag\tL\t${DATA[1]}"
done
       


