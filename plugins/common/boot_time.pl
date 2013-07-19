#!/usr/bin/env perl
use strict;
use warnings;

use Time::Local;

my $boot_time = `who -b`;

# ubuntu:
#         system boot  2012-10-19 05:30
# omnios:
#         system boot  2013-07-15 19:16
# centos:
#         system boot  2013-07-16 22:43
my ($year, $month, $day, $hour, $minute) = $boot_time 
  =~ /system\s+boot\s+(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/;
my $epoch = timelocal(0, $minute, $hour, $day, $month -1, $year - 1900);

print "epoch\tL\t$epoch\n";
print "date\ts\t$year-$month-$day $hour:$minute\n";
