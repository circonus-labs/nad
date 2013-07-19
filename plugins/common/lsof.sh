#!/bin/bash

OPEN_FILE_COUNT=`lsof -t $@ | wc -l`
printf "count\tL\t$OPEN_FILE_COUNT\n"

