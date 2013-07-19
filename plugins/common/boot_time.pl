#!/usr/bin/env perl
use strict;
use warnings;

use Time::Local;
my $boot_time = `who -b`;

# ubuntu:
#         system boot  2012-10-19 05:30
# omnios:
#   .      system boot  Jul 19 21:23
# centos:
#         system boot  2013-07-16 22:43

$boot_time =~ s/^\s+\.?\s+system\s+boot\s+//;
chomp $boot_time;
my $epoch;
my %m = (Jan => 0, Feb => 1, Mar => 2, Apr => 3, May => 4, Jun => 5, Jul => 6, Aug => 7, Sep => 8, Oct => 9, Nov => 10, Dec => 11);
if ($boot_time =~ /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/) {
    $epoch = timelocal(0,$5,$4,$3,$2-1,$1);
} elsif ($boot_time =~ /(\w{3})\s(\d{1,2})\s+(\d{2}):(\d{2})/) {
    $epoch = timelocal(0,$4,$3,$2,$m{$1}, (localtime())[5]+1900);
}

if ($epoch) {
    print "epoch\tL\t$epoch\n";
} else {
    print "epoch\tL\n";
}

print "date\ts\t$boot_time\n";
