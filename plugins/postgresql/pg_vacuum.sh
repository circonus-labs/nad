#!/bin/bash
source /opt/circonus/etc/pg-conf.sh

which psql >/dev/null 2>&1 || exit 1
PGUSER="${PGUSER:="postgres"}"

print_norm() {
    printf "%s\tL\t%s\n" $1 $2
}

vacuum_data=$(psql -U "$PGUSER" -F, -Atc "WITH max_age AS (SELECT 2000000000 as max_old_xid, setting AS autovacuum_freeze_max_age FROM pg_settings WHERE name = 'autovacuum_freeze_max_age'), per_database_stats AS (SELECT datname, m.max_old_xid::int, m.autovacuum_freeze_max_age::int, age(d.datfrozenxid) AS oldest_current_xid FROM pg_database d JOIN max_age m ON (true) WHERE d.datallowconn) SELECT 'autovac', max(oldest_current_xid) AS oldest_current_xid, max(ROUND(100*(oldest_current_xid/max_old_xid::float))) AS percent_towards_wraparound, max(ROUND(100*(oldest_current_xid/autovacuum_freeze_max_age::float))) AS percent_towards_emergency_autovac FROM per_database_stats;")
IFS=','
DATA=( `echo "${vacuum_data}"` )

print_norm oldest_current_xid ${DATA[1]}
print_norm percent_towards_wraparound ${DATA[2]}
print_norm percent_towards_emergency_autovac ${DATA[3]}

