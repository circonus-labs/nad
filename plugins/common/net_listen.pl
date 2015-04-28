#!/usr/bin/env perl
use strict;
use warnings;

# Given a port or ip:port, determines what (if anything) is listening there
# listening	I	1
# command	s	node /opt/circonus/sbin/nad -c /opt/circonus/etc/node-agent.d -p 2609

my $portspec = shift;

my %YAY_PORTABILITY = 
  (
   'freebsd' => {
               netstat => 'sockstat -l -L -4 -6 | grep -v ^USER',
               all_iface => '*',
               separator => ':',
               match_col => 5,
               proc_col => 2,
              },
   'linux' => {
               netstat => "netstat -nlp --inet 2>/dev/null | grep LISTEN",
               all_iface => '0.0.0.0',
               separator => ':',  # Can't we agree on anything?
               match_col => 3,
               proc_col => 6,
              },
   'solaris' => {
                 netstat => "netstat -n -a -f inet | grep LISTEN",
                 all_iface => '*',
                 separator => '.',  # Can't we agree on anything?
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
my ($sought_ip, $sought_port) = split(':', $portspec);
$portspec = join($YAY_PORTABILITY{$^O}{separator}, split(':', $portspec));

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

# Solaris pfiles hunt?
if ($^O eq 'solaris') {
    unless ($>) {
        # I'm root, it's worth a try
        my $matcher = $sought_ip eq $YAY_PORTABILITY{$^O}{all_iface} ? 
          "sockname: AF_INET.+port:\\s+$sought_port" :
            "sockname: AF_INET.+$sought_ip\\s+port:\\s+$sought_port";

      PROC:
        foreach my $cpid (`ps -e -o pid=`) {
          LINE:
            foreach my $line (`pfiles $cpid 2>/dev/null`) {
                # sockname: AF_INET6 ::ffff:10.0.2.15  port: 22
                if ($line =~ $matcher) {
                    $pid = $cpid;
                    last PROC;
                }
            }
        }
    }
}

print "listening\tI\t$matched\n";
if ($pid) {
    my $command = `ps -o args= -p $pid`;
    chomp $command;
    print "command\ts\t$command\n";
} else {
    print "command\ts\n";
}


