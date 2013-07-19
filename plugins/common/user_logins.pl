#!/usr/bin/env perl

use strict;
use warnings;

my @logged_in_users = map { chomp; $_ } `w -h | cut -f 1 -d ' '`;
my %u = ();
for (@logged_in_users) { $u{$_} = 1; }
my @unique_users = sort keys %u;

print "logged_in_users\ts\t" . join(',', @logged_in_users) . "\n";
print "logged_in_count\tL\t" . (scalar @logged_in_users) . "\n";
print "uniq_logged_in_users\ts\t" . join(',', @unique_users) . "\n";
print "uniq_logged_in_count\tL\t" . (scalar @unique_users) . "\n";

