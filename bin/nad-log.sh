#!/usr/bin/env bash

# Copyright 2016 Circonus, Inc. All rights reserved.
# Use of this source code is governed by a BSD-style
# license that can be found in the LICENSE file.

export PATH="$PATH:@@PREFIX@@/bin"
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
