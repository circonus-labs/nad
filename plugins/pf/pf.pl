#!/usr/bin/perl
#
# Provides pf statistics. See pfctl(8), pf.conf(5)
#  - info (pfctl -s info)
#  - labels (pfctl -s labels), summarized by label
#
# Copyright 2015 Circonus, Inc.
# All rights reserved.
# 
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
# 
#     * Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
#       copyright notice, this list of conditions and the following
#       disclaimer in the documentation and/or other materials provided
#       with the distribution.
#     * Neither the name of the copyright holder nor the names
#       of its contributors may be used to endorse or promote products
#       derived from this software without specific prior written
#       permission.
# 
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

use strict;
use Math::BigInt try => 'GMP';

my $pfctl = '/sbin/pfctl';

##
# Status
##

my $status = {};
my $getstats = $pfctl . ' -si';
my ($in_state_tbl, $in_counters);

open(my $gs, '-|', $getstats);
while(<$gs>) {
  my $statline = $_;
  chomp $statline;

  if ($statline =~ /^Status: (\S+)/) {
    $status->{'status'} = $1;
  }
  if ($statline =~ /^State Table/) {
    $in_state_tbl = 1;
  }
  if ($in_state_tbl) {
    if ($statline =~ /^\s+current entries\s+(\d+)/) {
      $status->{'state'}{'current_entries'} = Math::BigInt->new($1);
    }
    if ($statline =~ /^\s+(\S+)\s+(\d+)/) {
      $status->{'state'}{$1} = Math::BigInt->new($2);
    }
  }
  if ($statline =~ /^Counters/) {
    $in_state_tbl = undef;
    $in_counters = 1;
  }
  if ($in_counters) {
    if ($statline =~ /^\s+(\S+)\s+(\d+)/) {
      $status->{'counters'}{$1} = Math::BigInt->new($2);
    }
  }
}
close($gs);

printf("status s %s\n", $status->{'status'});
foreach my $tblstat (keys $status->{'state'}) {
  printf("state`%s L %d\n", $tblstat, $status->{'state'}{$tblstat}->bstr());
}
foreach my $counter (keys $status->{'counters'}) {
  printf("counter`%s L %d\n", $counter, $status->{'counters'}{$counter}->bstr());
}


##
# Labels
##

my $labels = {};
my $getlabels = $pfctl . ' -sl';
open(my $gl, '-|', $getlabels);
while(<$gl>) {
  my $lline = $_;
  chomp $lline;
  my @line = split(/\s+/, $lline);
  my $label = shift @line;
  if (exists $labels->{$label}) {
    foreach (0 .. $#line) {
      my $idx = $_;
      $labels->{$label}->[$idx]->badd(Math::BigInt->new($line[$idx]));
    }
  } else {
    $labels->{$label} = [ map { Math::BigInt->new($_) } @line ];
  }
}
close($gl);

foreach my $label (keys %$labels) {
  printf("label`%s`evals L %d\n", $label, $labels->{$label}->[0]->bstr());
  printf("label`%s`pkts L %d\n", $label, $labels->{$label}->[1]->bstr());
  printf("label`%s`octets L %d\n", $label, $labels->{$label}->[2]->bstr());
  printf("label`%s`inpkts L %d\n", $label, $labels->{$label}->[3]->bstr());
  printf("label`%s`inoctets L %d\n", $label, $labels->{$label}->[4]->bstr());
  printf("label`%s`outpkts L %d\n", $label, $labels->{$label}->[5]->bstr());
  printf("label`%s`outoctets L %d\n", $label, $labels->{$label}->[6]->bstr());
  printf("label`%s`states L %d\n", $label, $labels->{$label}->[7]->bstr());
}

exit;
