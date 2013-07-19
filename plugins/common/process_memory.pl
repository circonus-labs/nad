#!/usr/bin/env perl
use strict;
use warnings;

use List::Util qw(sum max min);

# Given a regex pattern to match against the full command line (like pgrep -f)
# Find matching processes in process table
# Report on count of processes
# Report on vsize (vsz)
# Report on resident size (rss)
# report on memory % (pmem)
#
# count	        L	2
# vsz_sum	L	233272
# vsz_min	L	108396
# vsz_max	L	124876
# vsz_median	n	116636
# rss_sum	L	4644
# rss_min	L	2028
# rss_max	L	2616
# rss_median	n	2322
# pmem_sum	n	0.3
# pmem_min	n	0.1
# pmem_max	n	0.2
# pmem_median	n	0.15


my $pattern = shift;

unless ($pattern) {
    die "Usage: $0 PATTERN\n";
}
if (@ARGV) {
    die "Usage: $0 PATTERN\n";
}

# We need: a pid, virt mem size, resident size, % memory, command and args
#    no header please
#   -o pid= -o vsz= -o rss= -o pmem= -o args=
#  above works on solaris and gnu ps
my $cmd = "ps -e -o pid= -o vsz= -o rss= -o pmem= -o args=";
my @matches = ();
foreach my $proc (`$cmd`) {
    my %info = ();
    @info{qw(pid vsz rss pmem cmd)} = $proc =~ /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+\.\d+)\s+(.+)$/;
    # This ought to be thrilling
    if ($info{cmd} =~ $pattern) {
        push @matches, \%info;
    }
}

print "count\tL\t" . (scalar @matches) . "\n";
foreach my $metric (qw(vsz rss pmem)) {
    my $type = $metric eq 'pmem' ? 'n' : 'L';
    my @vals = sort map { $_->{$metric} }  @matches;
    print "${metric}_sum\t$type\t" . sum(@vals) . "\n";
    print "${metric}_min\t$type\t" . min(@vals) . "\n";
    print "${metric}_max\t$type\t" . max(@vals) . "\n";
    print "${metric}_median\tn\t" . ((scalar @vals) % 2 ? $vals[$#vals/2] : ($vals[$#vals/2 -0.5] + $vals[$#vals/2 +0.5])/2) . "\n";
}





