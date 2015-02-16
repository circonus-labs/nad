#!/bin/sh

# Network interface statistics
#
# Since OpenBSD's netstat(1) can only report packet OR byte stats at any given
# time, we must invoke it twice per interface.

# List of datalink interfaces, excluding local and inactive interfaces (<name>*)
ints=`netstat -n -i | awk '$1 !~ /(^lo[0-9]|\*)/ && $3 == "<Link>" { print $1 }'`

for iface in $ints; do \
    netstat -n -I $iface | grep Link | awk '{
        if (NF == 8) {
            inp = $4; ine = $5; outp = $6; oute = $7; }
        if (NF == 9) {
            inp = $5; ine = $6; outp = $7; oute = $8; }
        printf("%s`in_packets\tL\t%d\n", $1, inp);
        printf("%s`in_errors\tL\t%d\n", $1, ine);
        printf("%s`out_packets\tL\t%d\n", $1, outp);
        printf("%s`out_errors\tL\t%d\n", $1, oute);
        inp = ""; ine = ""; outp = ""; oute = "";
    }'
    netstat -n -I $iface -b | grep Link | awk '{
        if (NF == 5) {
            inb = $4; outb = $5; }
        if (NF == 6) {
            inb = $5; outb = $6; }
        printf("%s`in_bytes\tL\t%d\n", $1, inb);
        printf("%s`out_bytes\tL\t%d\n", $1, outb);
        inb = ""; outb = "";
    }'
done
