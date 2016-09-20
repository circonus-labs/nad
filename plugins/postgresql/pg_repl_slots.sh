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

SLOT=$(psql -U $PGUSER -d $PGDATABASE -p $PGPORT -w -F, -Atc "SELECT slot_name, active, pg_xlog_location_diff(pg_current_xlog_insert_location(), restart_lsn) AS retained_bytes FROM pg_replication_slots")

print_norm_int() {
    printf "%s\tL\t%s\n" $1 $2
}
print_norm_str() {
    printf "%s\ts\t%s\n" $1 $2
}

for a in $SLOT; do
    IFS=','
    DATA=( `echo "$a"` )
	echo -e "slot_name\ts\t${DATA[0]}"
	echo -e "active\ts\t${DATA[1]}"
	echo -e "retained_bytes\tL\t${DATA[2]}"	
done
       
