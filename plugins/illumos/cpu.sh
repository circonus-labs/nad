#!/bin/sh
DIR=`dirname $0`
if [ -d $DIR/illumos ]; then . $DIR/illumos/lib/kstat.lib
else . $DIR/lib/kstat.lib
fi

_kstat -m cpu_stat
