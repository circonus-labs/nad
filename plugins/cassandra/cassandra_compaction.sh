#!/bin/bash
which nodetool >/dev/null 2>&1 || exit 1
which awk >/dev/null 2>&1 || exit 1
CASS_USER="${CASS_USER:="admin"}"

nodetool compactionstats 2>/dev/null | awk '
/pending tasks/ { print "pending_tasks\tL\t"$3 }
' 

