#!/bin/bash
source /opt/circonus/etc/pg-po-conf.sh

which protocol_observer >/dev/null 2>&1 || exit 1
IFACE="${IFACE:="auto"}"
NADURL="${NADURL:="http://localhost:2609"}"

NADURL=${NADURL%/}

# if protocol_observer is already running, exit
POPID=`ps ax | grep protocol_observer | grep -v grep`
if [ -n "$POPID" ]; then
  exit 0;
fi

sudo protocol_observer -wire postgres -submissionurl ${NADURL}/write/postgres_protocol_observer &
