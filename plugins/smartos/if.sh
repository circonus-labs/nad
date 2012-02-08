#!/bin/sh
DIR=`dirname $0`
if [ -d $DIR/smartos ]; then . $DIR/smartos/lib/kstat.lib
else . $DIR/lib/kstat.lib
fi

ZN=`kstat -p -m tcp -n tcp -s crtime | awk -F: '{print $2;}'`

for iface in `netstat -in | awk '/^net/ {print $1;}'`
do
  /usr/bin/kstat -p -m z${ZN}_$iface | \
        /usr/xpg4/bin/awk '{
                if(match($1, /:(class|crtime|snaptime)$/)) next; \
                if(match($1, /_fanout[0-9]+:/)) next; \
                if(match($1, /_misc_/) && !match($1, /(brd|multi)/)) next; \
                if(index($2,".")) { print $1"\tn\t"$2; } \
                else { print $1"\tL\t"$2; }
        }' | \
        sed -e 's/^z[0-9]*_//g;' -e 's/_[hs]wlane[0-9]*//g;'
done
