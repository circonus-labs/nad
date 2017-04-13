#!/usr/bin/env bash

export PATH="$PATH:@@BIN@@"
LOG="@@LOG@@/nad.log"
PINO="@@MODULES@@/.bin/pino"

[[ -f $LOG ]] || {
    echo "Unable to find NAD log ($LOG)"
    exit 1
}

[[ -x $PINO ]] || {
    echo "Unable to find required command ($PINO)"
    exit 1
}

tail -F $LOG | $PINO
