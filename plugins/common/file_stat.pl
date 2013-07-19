#!/usr/bin/env perl

use strict;
use warnings;
use Fcntl ':mode';

my $path = shift;

unless ($path) {
    die "Usage: $0 PATH\n";
}
if (@ARGV) {
    die "Usage: $0 PATH\n";
}

my %info = (
            exists       => 0,
            owner        => undef,
            group        => undef,
            permissions  => undef,
            size         => undef,
            type         => undef,
            hardlinks    => undef,
            atime        => undef,
            aage         => undef,
            mtime        => undef,
            mage         => undef,
            ctime        => undef,
            cage         => undef,
           );

my %strings = map { $_ => 1 } qw(owner group permissions type selinux);

my @stat = stat $path;
my $now = time;
if (@stat) {
    
    $info{exists} = 1;
    @info{qw(hardlinks size atime mtime ctime)} = @stat[3,7,8,9,10];
    $info{permissions} = sprintf("%04o", S_IMODE($stat[2]));
    for (qw(a m c)) { $info{$_ . 'age'} = $now - $info{$_ . 'time'}   }
    $info{owner} = getpwuid($stat[4]) || $stat[4];
    $info{group} = getgrgid($stat[5]) || $stat[5];

    my $m = $stat[2];
    $info{type} = 
      S_ISREG($m) ? 'f' :
        S_ISDIR($m) ? 'd' :
          S_ISLNK($m) ? 'l' :
            S_ISBLK($m) ? 'b' :
              S_ISCHR($m) ? 'c' :
                S_ISFIFO($m) ? 'p' :
                  S_ISSOCK($m) ? 's' :
                    '?';
}

for my $k (sort keys %info) {
    my $type = $strings{$k} ? 's' : 'L';
    if (defined $info{$k}) {
        print "$k\t$type\t$info{$k}\n";
    } else {
        print "$k\t$type\n";
    }
}
