#!/bin/sh
DIR=`dirname $0`
if [ -d $DIR/smartos ]; then . $DIR/smartos/lib/kstat.lib
else . $DIR/lib/kstat.lib
fi

_kstat -m zfs
_kstat -m unix -n vopstats_zfs
