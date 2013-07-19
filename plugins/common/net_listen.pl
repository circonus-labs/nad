#!/usr/bin/env perl
use strict;
use warnings;

# Given a port or ip:port, determines what (if anything) is listening there
# listening	I	1
# command	s	node /opt/circonus/sbin/nad -c /opt/circonus/etc/node-agent.d -p 2609

my $portspec = shift;

my %YAY_PORTABILITY = 
  (
   'linux' => {
               netstat => "netstat -nlp --inet 2>/dev/null | grep LISTEN",
               all_iface => '0.0.0.0',
               match_col => 3,
               proc_col => 6,
              },
   'solaris' => {
                 netstat => "netstat -n -a -f inet | grep LISTEN",
                 all_iface => '*',
                 match_col => 0,
                 proc_col => undef, # Not without pfiles or lsof anyway :effort:
                },
  );

unless ($portspec) {
    die "Usage: $0 [IP:]PORT\n";
}
if (@ARGV) {
    die "Usage: $0 [IP:]PORT\n";
}


if ($portspec !~ /:/) {
    $portspec = $YAY_PORTABILITY{$^O}{all_iface} . ':'. $portspec;
}


my $cmd = $YAY_PORTABILITY{$^O}{netstat};
my $matched = 0;
my $pid = undef;
foreach my $listener (`$cmd`) {
    $listener =~ s/^\s+//;
    my @cols = split(/\s+/, $listener);
    my $local = $cols[$YAY_PORTABILITY{$^O}{match_col}];
    next unless $local && $local eq $portspec;

    # Yay
    $matched = 1;
    if ($YAY_PORTABILITY{$^O}{proc_col}) {
        ($pid) = $cols[$YAY_PORTABILITY{$^O}{proc_col}] =~ /^(\d+)/
    }
    last;
}

# TODO solaris pfiles hunt?

print "listening\tI\t$matched\n";
if ($pid) {
    my $command = `ps -o args= -p $pid`;
    chomp $command;
    print "command\ts\t$command\n";
} else {
    print "command\ts\n";
}


