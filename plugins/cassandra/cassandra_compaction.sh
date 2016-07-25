#!/bin/bash
source /opt/circonus/etc/cassandra-conf.sh

which nodetool >/dev/null 2>&1 || exit 1
which gawk >/dev/null 2>&1 || exit 1
CASS_USER="${CASS_USER:="admin"}"

nodetool compactionstats 2>/dev/null | gawk '
/pending tasks/ { print "pending_tasks\tL\t"$3 }
' 

