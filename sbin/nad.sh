#!/usr/bin/env bash
set -o nounset
set -o errexit
set -o pipefail

nad_dir="@@PREFIX@@"

node_bin="${nad_dir}/bin/node"
nad_script="${nad_dir}/sbin/nad.js"
lib_dir="${nad_dir}/lib/node_modules"
nad_conf="${nad_dir}/etc/nad.conf"
log_dir=""

[[ -d $lib_dir ]] || {
    echo "Unable to find NAD modules directory ${lib_dir}"
    exit 1
}

[[ -x $node_bin ]] || {
    node_bin=$(command -v node)
    [[ -x $node_bin ]] || {
        echo "Unable to find node binary in path ${PATH}:${nad_dir}/bin"
        exit 1
    }
}

[[ -s $nad_script ]] || {
    echo "Unable to find NAD script ${nad_script}"
    exit 1
}

# set log_dir if nad logrotate config detected
#     linux                       freebsd
[[ -f /etc/logrotate.d/nad || -f /usr/local/etc/logrotate.d/nad ]] && {
    log_dir="${nad_dir}/log"
    [[ -d $log_dir ]] || mkdir -p $log_dir
}

extra_opts=""
pid_file="@@PID_FILE@@"
daemon=0
syslog=0

while [[ $# -gt 0 ]]; do
	case $1 in
	--daemon)
		daemon=1
		;;
    --syslog)
        syslog=1
        ;;
	--pid_file)
		pid_file="$2"
		shift
		;;
	*)
		extra_opts="${extra_opts} $1"
		;;
	esac
	shift
done

NAD_OPTS=""

if [[ -s $nad_conf ]]; then
    set -o allexport
    source $nad_conf
    set +o allexport
fi

export NODE_PATH=$lib_dir #ensure node can find nad specific packages

cmd="${node_bin} ${nad_script} ${NAD_OPTS} ${extra_opts}"

if [[ $daemon -eq 1 ]]; then # start nad in background
    if [[ -n "$log_dir" ]]; then
        # Linux - sends to /opt/circonus/log/nad.log, rotates with logrotate
        $cmd >> ${log_dir}/nad.log 2>&1 &
        pid=$!
        ret=$?
    elif [[ $syslog -eq 1 ]]; then
        # FreeBSD - sends to /var/log/messages (newsyslog can't copytruncate) by default
        # Makefile and this script will detect if logrotate is installed and preference it
        $cmd | logger -t 'nad' 2>&1 &
        ret=${PIPESTATUS[0]}
        pid=$(pgrep -f -n sbin/nad)
    else
        # OmniOS (illumos) - send to svcs -L nad
        $cmd &
        pid=$!
        ret=$?
    fi
    echo $pid > $pid_file
    exit $ret
fi

# run nad in foreground
$cmd

#END
