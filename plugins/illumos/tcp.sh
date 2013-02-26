#!/bin/sh
DIR=`dirname $0`
if [ -d $DIR/illumos ]; then . $DIR/illumos/lib/kstat.lib
else . $DIR/lib/kstat.lib
fi

if [ "`/usr/bin/zonename`" = global ]; then
	_kstat -m tcp -n tcp -i 0 -- cut -f1,4- -d:
else
	_kstat -m tcp -n tcp -- cut -f1,4- -d:
fi
