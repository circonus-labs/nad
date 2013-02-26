#!/bin/sh
DIR=`dirname $0`
if [ -d $DIR/illumos ]; then . $DIR/illumos/lib/kstat.lib
else . $DIR/lib/kstat.lib
fi

if [ "`/usr/bin/zonename`" = "global" ]; then
  IFACES=`ifconfig -a | awk -F: '/^[^\t]/ {if($1 != "lo0") {print $1}}' | uniq`
elif [ "`grep OmniOS /etc/release | awk '{print $1}'`" = "OmniOS" ]; then
  IFACES=`ifconfig -a | awk -F: '/^[^\t]/ {if($1 != "lo0") {print $1}}' | uniq`
else
  ZN=`kstat -p -m tcp -n tcp -s crtime | awk -F: '{print $2;}'`
  IFACES=`ifconfig -a | awk -F: '/^[^\t]/ {if($1 != "lo0") {print "z'$ZN'_"$1;}}' | uniq`
fi

for iface in $IFACES
do
  /usr/bin/kstat -p -m $iface | \
        /usr/xpg4/bin/awk '{
                if(match($1, /:(class|crtime|snaptime)$/)) next; \
                if(match($1, /_fanout[0-9]+:/)) next; \
                if(match($1, /_misc_/) && !match($1, /(brd|multi)/)) next; \
                if(index($2,".")) { print $1"\tn\t"$2; } \
                else { print $1"\tL\t"$2; }
        }' | \
        sed -e 's/^z[0-9]*_//g;' \
				    -e 's/_[hs]wlane[0-9]*//g;' \
				    -e 's/:[0-9][0-9]*:mac[^:]*//;'
done
