#!/bin/sh
DIR=`dirname $0`
if [ -d $DIR/illumos ]; then . $DIR/illumos/lib/kstat.lib
else . $DIR/lib/kstat.lib
fi

physmem=`_kstat_val :::physmem`
pagesfree=`_kstat_val :::pagesfree`
pagesused=$(($physmem-$pagesfree))
pagesize=`pagesize`
a=$(($physmem * $pagesize))
b=$(($pagesused * $pagesize))
mem_perc=`printf "%s\n" "scale = 2; $b/$a" | bc `

printf "mempercent_used\tn\t%0.2f\n" $mem_perc


_kstat -n vminfo
