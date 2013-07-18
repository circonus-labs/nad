#!/usr/bin/env perl
use strict;
use warnings;

# So let's see
# We want...
# total processes
# process count by state
# Parametrically report above restricted by username

my $username_opt = '';

# We need: user, a pid, and state
#    no header please
#   -o pid= -o user= -o s=
#  above works on solaris and gnu ps

my @ps_output = `ps -e -o pid= -o user= -o s= $username_opt`;
my %count_by_state = map { $_ => 0 } qw(D R S Z O); # Others?
for my $proc (@ps_output) {
    $proc =~ s/^\s+//;
    my ($pid, $user, $state) = split(/\s+/, $proc);
    $count_by_state{$state}++;
}

$count_by_state{total} = scalar @ps_output;

for my $kind (keys %count_by_state) {
    print "count`$kind\t\L\t" . $count_by_state{$kind} . "\n";
}
