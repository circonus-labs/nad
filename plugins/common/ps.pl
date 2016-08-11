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
#  If nonexistent user specified, we get a usage message to STDERR - ignore it
my $state_fmt = "s=";
if ($^O eq 'darwin') {
    $state_fmt = "state=";
}
my $cmd = "ps -o pid= -o user= -o $state_fmt $username_opt 2>/dev/null";

my %count_by_state = map { $_ => 0 } qw(D R S Z O total); # Others?
for my $proc (`$cmd`) {
    $proc =~ s/^\s+//;
    my ($pid, $user, $state) = split(/\s+/, $proc);
    $count_by_state{$state}++;
    $count_by_state{total}++;
}

for my $kind (keys %count_by_state) {
    print "count`$kind\tL\t" . $count_by_state{$kind} . "\n";
}
