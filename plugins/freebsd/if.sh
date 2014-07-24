#!/bin/sh

# Network interface statistics

netstat -i -b -n -W -f link | awk '{
    if ($1 == "Name") next;
    if ($1 ~ /^lo[0-9]/) next;
    printf("%s`in_bytes\tL\t%d\n", $1, $8);
    printf("%s`in_packets\tL\t%d\n", $1, $5);
    printf("%s`in_errors\tL\t%d\n", $1, $6);
    printf("%s`out_bytes\tL\t%d\n", $1, $11);
    printf("%s`out_packets\tL\t%d\n", $1, $9);
    printf("%s`out_errors\tL\t%d\n", $1, $10);
}'
