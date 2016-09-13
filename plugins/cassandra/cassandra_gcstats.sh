#!/bin/bash

which nodetool >/dev/null 2>&1 || exit 1
which awk >/dev/null 2>&1 || exit 1

nodetool gcstats 2>/dev/null | awk '$1 !~ /Interval/ { print "interval_ms\tL\t"$1"\nmax_gc_ms\tL\t"$2"\ntotal_gc_ms\tL\t"$3"\nstddev_gc_ms\tn\t"$4"\nreclaimed_mb\tn\t"$5"\ngc_collections_count\tL\t"$6"\ndirect_memory_bytes\tl\t"$7 };' 


