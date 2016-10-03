#!/usr/bin/env bash

source /opt/circonus/etc/pg-po-conf.sh

# default location
po=/opt/circonus/bin/protocol_observer

if [[ ! -x $po ]]; then
        po=`type -P protocol_observer`
        [[ $? -eq 0 ]] || { echo 'Unable to locate protocol_observer binary'; exit 1; }
fi
IFACE="${IFACE:="auto"}"
NADURL="${NADURL:="http://localhost:2609"}"

NADURL=${NADURL%/}

popid=$(pgrep -n -f 'protocol_observer -wire postgres')
if [[ -n "$popid" ]]; then
        echo "already running with pid $popid"
        exit 0
fi

sudo $po -wire postgres -submissionurl ${NADURL}/write/postgres_protocol_observer &
