#!/bin/bash

OUTPUT_DIR=/opt/circonus/var/run/nad
OUTPUT_FILE=$OUTPUT_DIR/cpkg.list
SUPPRESS_FILE=$OUTPUT_DIR/cpkg.wip
CACHE_MINUTES=5

suppressions() {
	if [ -r $SUPPRESS_FILE ]; then
		while read -r line || [[ -n "$line" ]]; do
			pkg=`echo $line | awk -F= '{print $1;}'`
			user=`echo $line | awk -F= '{if($2) {print $2;} else { print "unspecified"; }}'`
			echo "$pkg	s	wip:$user"
		done < $SUPPRESS_FILE
	fi
}

if [ ! -d $OUTPUT_DIR ]; then
	echo "error\ts\tbad cache directory"
	OUTPUT_FILE=/dev/null
else
	find $OUTPUT_FILE -mmin +$CACHE_MINUTES -exec rm {} \; 2>/dev/null
	if [ -r $OUTPUT_FILE ]; then
		LMOD=`/bin/stat -c "%Y" $OUTPUT_FILE`
		CTIME=`/bin/date +%s`
		((AGE=$CTIME-$LMOD))
		echo "cached\tl\t$AGE"
		cat $OUTPUT_FILE
		suppressions
		exit
	fi
	if [ ! -w $OUTPUT_FILE ]; then
		if ! touch $OUTPUT_FILE 2> /dev/null; then
			echo "error\ts\tcannot create cache file"
			OUTPUT_FILE=/dev/null
		fi
	fi
fi

case `uname -s` in
	Linux)
	;;
	SunOS)
	/bin/pkg list -v | /bin/perl -n -e 's#^pkg://circonus/([^@]+)@([^-]+).*$#$1\ts\t$2#g && print;' | /bin/tee $OUTPUT_FILE
	suppressions
	;;
	*)
	echo "error\ts\tunsuported platform"
	exit
	;;
esac

