#!/bin/bash
MD5SUM=`md5sum $1 |cut -f1 -d' '`
printf "md5\ts\t$MD5SUM\n"
