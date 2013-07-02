#!/bin/sh

((cat ; /bin/svcs -H) | sed -e 's/\*//g;' | cut -f1 -d' ' | sort | uniq -c | nawk '{print "state`"$2"\tL\t"($1-1);}') << EOF
online
disabled
maintenance
legacy_run
EOF
/bin/svcs -s stime | nawk 'BEGIN{S["maintenance"] = "[[null]]"; S["offline"] = "[[null]]"; } /^(offline|maintenance)/ {S[$1] = $3;} END {print("service`offline\ts\t" S["offline"]); print("service`maintenance\ts\t" S["maintenance"]);}'
