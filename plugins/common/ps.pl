#!/usr/bin/env perl
use strict;
use warnings;

# So let's see
# We want...
# total processes
# process count by state
# Parametrically report above restricted by username(s)

my $username_opt = @ARGV ? "-u " . join(',', @ARGV)  : '-e ';

# We need: user, a pid, and state
#    no header please
#   -o pid= -o user= -o s=
#  above works on solaris and gnu ps
my $cmd = "ps -o pid= -o user= -o s= $username_opt";
print "Have command: '$cmd'\n";

my %count_by_state = map { $_ => 0 } qw(D R S Z O total); # Others?
for my $proc (`$cmd`) {
    $proc =~ s/^\s+//;
    my ($pid, $user, $state) = split(/\s+/, $proc);
    $count_by_state{$state}++;
    $count_by_state{total}++;
}

for my $kind (keys %count_by_state) {
    print "count`$kind\t\L\t" . $count_by_state{$kind} . "\n";
}
