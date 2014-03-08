#!/bin/sh
DIR=`dirname $0`
if [ -d $DIR/illumos ]; then . $DIR/illumos/lib/kstat.lib
else . $DIR/lib/kstat.lib
fi

kstat_opts="-p -m"
distro=`awk 'NR==1 { print $1 }' /etc/release`
case $distro in
  SmartOS|Joyent)
    kstat_opts="-p -c net -n"
    ;;
esac

IFACES=`ifconfig -a | awk -F: '/^[^\t]/ {if($1 != "lo0") {print $1}}' | uniq`

for iface in $IFACES
do
  /usr/bin/kstat $kstat_opts $iface | \
        /usr/xpg4/bin/awk '{
                if(match($1, /:(class|crtime|snaptime|zonename)$/)) next; \
                if(match($1, /_fanout[0-9]+:/)) next; \
                if(match($1, /_misc_/) && !match($1, /(brd|multi)/)) next; \
                if(index($2,".")) { print $1"\tn\t"$2; } \
                else { print $1"\tL\t"$2; }
        }' | \
        sed -e 's/^z[0-9]*_//g;' \
				    -e 's/_[hs]wlane[0-9]*//g;' \
				    -e 's/:[0-9][0-9]*:mac[^:]*//;'
done
