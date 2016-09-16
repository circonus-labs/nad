#!/bin/bash
source /opt/circonus/etc/pg-po-conf.sh

which protocol_observer >/dev/null 2>&1 || exit 1
IFACE="${IFACE:="auto"}"
NAD_PORT="${NAD_PORT:="2609"}"

# if protocol_observer is already running, exit
POPID=`ps ax | grep protocol_observer | grep -v grep`
if [ -n "$POPID" ]; then
  exit 0;
fi

sudo protocol_observer -wire postgres -submissionurl http://localhost:${NAD_PORT}/write/postgres_protocol_observer &
