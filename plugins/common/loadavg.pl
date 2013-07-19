#!/usr/bin/env perl

use strict;
use warnings;

if (my($l1,$l5,$l15) = `uptime` =~ /load\s+average:\s+(\d+\.\d+),\s+(\d+\.\d+),\s+(\d+\.\d+)/) {
    print "1\tn\t$l1\n";
    print "5\tn\t$l5\n";
    print "15\tn\t$l15\n";
}
