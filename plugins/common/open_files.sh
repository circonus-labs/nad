#!/bin/bash

OPEN_FILE_COUNT=`ls -1U /proc/*/fd/* 2>/dev/null | wc -l`
printf "count\tL\t$OPEN_FILE_COUNT\n"

