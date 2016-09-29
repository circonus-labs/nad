#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

config_file='/opt/circonus/etc/mysql-conf.sh'
[ -f $config_file ] && source $config_file

user=${MYSQL_USER:-none}
pass=${MYSQL_PASS:-none}
host=${MYSQL_HOST:-127.0.0.1}
port=${MYSQL_PORT:-3306}
metrics=("${MYSQL_METRICS[@]:-default}")
[ "${metrics}" == "default" ] && metrics=(Aborted_clients Aborted_connects \
    Bytes_received Bytes_sent Connections Open_files Qcache_hits Qcache_inserts \
    Queries Slow_queries Table_locks_waited Threads_connected Threads_running \
    Uptime_since_flush_status)

mysql=$(which mysql)

mysql_opts="--batch --silent --host=${host} --port=${port}"
[ "${user}" != "none" ] && mysql_opts="${mysql_opts} --user=${user}"
[ "${pass}" != "none" ] && mysql_opts="${mysql_opts} --password=${pass}"

# format the metric list (quoted strings separated by commas)
function join { local IFS="${1}"; shift; echo "$*"; }
var_list=$(join , $(printf "\"%s\" " "${metrics[@]}"))
query="SHOW STATUS WHERE variable_name IN (${var_list})"

echo $query | $mysql $mysql_opts | while read line; do
    printf "%s\tL\t%s\n" $line
done

### END
