#!/bin/bash
source /opt/circonus/etc/cass-po-conf.sh

# default location
po=/opt/circonus/bin/protocol_observer

if [[ ! -x $po ]]; then
        po=`type -P protocol_observer`
        [[ $? -eq 0 ]] || { echo 'Unable to location protocol_observer binary'; exit 1; }
fi

IFACE="${IFACE:="auto"}"
NADURL="${NADURL:="http://localhost:2609"}"

NADURL=${NADURL%/}

# if protocol_observer is already running, exit
popid=$(pgrep -n -f 'protocol_observer -wire cassandra_cql')
if [[ -n "$popid" ]]; then
           echo "already running with pid $popid"
           exit 0
fi

sudo $po -wire cassandra_cql -submissionurl ${NADURL}/write/cassandra_protocol_observer &
