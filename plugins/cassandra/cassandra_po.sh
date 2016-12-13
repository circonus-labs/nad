#!/bin/bash
# if protocol_observer is already running, exit
popid=$(pgrep -n -f 'protocol_observer -wire cassandra_cql')
[[ -n "$popid" ]] && {
    printf "pid\tL\t%s\n" $popid
    exit 0
}

# check sudo access for user running NAD if not id 0
SUDO_CMD=""
if [[ $UID -ne 0 ]]; then
    sudo -l </dev/null >/dev/null 2>&1
    [[ $? -ne 0 ]] && {
        echo "Error checking sudo access for $UID"
        exit 1
    }
    SUDO_CMD="sudo -b"
fi

# default location
po=/opt/circonus/bin/protocol_observer

if [[ ! -x $po ]]; then
    po=`type -P protocol_observer`
    [[ $? -eq 0 ]] || {
        >&2 echo 'Unable to location protocol_observer binary'
        exit 1
	}
fi

source /opt/circonus/etc/cass-po-conf.sh

: ${IFACE:=auto}
: ${NADURL:=http://localhost:2609}
NADURL=${NADURL%/}

$SUDO_CMD $po -wire cassandra_cql -iface $IFACE -submissionurl ${NADURL}/write/cassandra_protocol_observer > /dev/null

printf "pid\tL\t-1\n"

exit 0
# END
