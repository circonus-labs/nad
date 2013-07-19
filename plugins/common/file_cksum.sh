#!/bin/bash
CKSUM=`cksum $1 |cut -f1 -d' '`
printf "cksum\tL\t$CKSUM\n"
