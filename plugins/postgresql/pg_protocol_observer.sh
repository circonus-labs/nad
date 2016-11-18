#!/usr/bin/env bash

popid=$(pgrep -n -f 'protocol_observer -wire postgres')
if [[ -n $popid ]]; then
        echo "protocol_observer is already running with PID ${popid}"
        exit 0
fi

# check sudo access for user running NAD if not id 0
SUDO=""
if [[ $UID -ne 0 ]]; then
    SUDO=sudo
    $SUDO -l </dev/null >/dev/null 2>&1
    [[ $? -ne 0 ]] && { echo "Error checking sudo access for $UID"; exit 1; }
fi

poconf="/opt/circonus/etc/pg-po-conf.sh"
[[ -f $poconf ]] && source $poconf

# default location
po=/opt/circonus/bin/protocol_observer

if [[ ! -x $po ]]; then
        po=`type -P protocol_observer`
        [[ $? -eq 0 ]] || { echo 'Unable to locate protocol_observer binary'; exit 1; }
fi
IFACE="${IFACE:="auto"}"
NADURL="${NADURL:="http://localhost:2609"}"

NADURL=${NADURL%/}

$SUDO $po -wire postgres -submissionurl ${NADURL}/write/postgres_protocol_observer &

# END
