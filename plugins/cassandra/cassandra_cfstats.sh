#!/bin/bash
which nodetool >/dev/null 2>&1 || exit 1
which awk >/dev/null 2>&1 || exit 1

nodetool cfstats 2>/dev/null | awk 'BEGIN {}
/^Keyspace:/ { KS=$2 };
/Read Count:/ {print KS"`read_count\tL\t"$3};
/Write Count:/ {print KS"`write_count\tL\t"$3};
/Read Latency:/ {print KS"`read_latency\tn\t"$3};
/Write Latency:/ {print KS"`write_latency\tn\t"$3};
/Table:/ { T = $2 };
/Space used \(total\):/ { print KS"`"T"`space_used_total\tL\t"$4 };
/Space used \(live\):/ { print KS"`"T"`space_used_live\tL\t"$4 };
/Off heap memory used \(total\):/ { print KS"`"T"`off_heap_mem_used\tL\t"$6 };
/SSTable Compression Ratio:/ { print KS"`"T"`sstable_compression_ratio\tn\t"$4 };
/Number of keys \(estimate\):/ { print KS"`"T"`num_keys_estimate\tl\t"$5 };
/Memtable cell count:/ { print KS"`"T"`memtable_cell_count\tL\t"$4 };
/Memtable data size:/ { print KS"`"T"`memtable_data_size\tL\t"$4 };
/Memtable off heap memory used:/ { print KS"`"T"`memtable_off_heap_mem_used\tL\t"$6 };
/Memtable switch count:/ { print KS"`"T"`memtable_switch_count\tL\t"$4 };
/Local read count:/ { print KS"`"T"`local_read_count\tL\t"$4 };
/Local read latency:/ { print KS"`"T"`local_read_latency\tn\t"$4 };
/Local write count:/ { print KS"`"T"`local_write_count\tL\t"$4 };
/Local write latency:/ { print KS"`"T"`local_write_latency\tn\t"$4 };
/Pending flushes:/ { print KS"`"T"`pending_flushes\tL\t"$3 };
/Bloom filter false positives:/ { print KS"`"T"`bloom_false_positives\tL\t"$5 };
/Bloom filter false ratio:/ { print KS"`"T"`bloom_false_ratio\tn\t"$5 };
/Bloom filter space used:/ { print KS"`"T"`bloom_space_used\tL\t"$5 };
/Bloom filter off heap memory used:/ { print KS"`"T"`bloom_off_heap_mem_used\tL\t"$7 };
/Index summary off heap memory used:/ { print KS"`"T"`index_summary_off_heap_mem_used\tL\t"$7 };
/Compression metadata off heap memory used:/ { print KS"`"T"`compression_metadata_off_heap_mem_used\tL\t"$7 };
/Compacted partition minimum bytes:/ { print KS"`"T"`compacted_partition_min_bytes\tL\t"$5 };
/Compacted partition maximum bytes:/ { print KS"`"T"`compacted_partition_max_bytes\tL\t"$5 };
/Compacted partition mean bytes:/ { print KS"`"T"`compacted_partition_mean_bytes\tL\t"$5 };
/Average live cells per slice/ { print KS"`"T"`avg_live_cells_per_slice\tn\t"$9 };
/Maximum live cells per slice/ { print KS"`"T"`max_live_cells_per_slice\tL\t"$9 };
/Average tombstones per slice/ { print KS"`"T"`avg_live_cells_per_slice\tn\t"$8 };
/Maximum tombstones per slice/ { print KS"`"T"`max_live_cells_per_slice\tL\t"$8 };
END {}' 


