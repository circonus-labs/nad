#!/bin/bash

which nodetool >/dev/null 2>&1 || exit 1
which gawk >/dev/null 2>&1 || exit 1

nodetool info 2>/dev/null | gawk '
function hr_to_bytes(NUMBER, U) {
  if (toupper(U) == "KB")
    return (NUMBER * 1024);
  else if (toupper(U) == "MB")
    return (NUMBER * 1024 * 1024);
  else if (toupper(U) == "GB")
    return (NUMBER * 1024 * 1024 * 1024);  
}

function or_one(NUMBER) {
  if (NUMBER == 0) {
    return 1.0;
  }
  return NUMBER;
}

/^Load/ { printf "load_bytes\tL\t%0.0f\n", hr_to_bytes($3, $4) }
/^Generation No/ { print "generation_number\tL\t"$4 }
/^Uptime \(seconds\)/ { print "uptime_secs\tL\t"$4 }
/^Heap Memory \(MB\)/ { printf "heap_mem_used\tL\t%0.0f\nheap_mem_max\tL\t%0.0f\n", hr_to_bytes($5, "MB"), hr_to_bytes($7, "MB") }
/^Off Heap Memory \(MB\)/ { printf "off_heap_mem_used\tL\t%0.0f\n", hr_to_bytes($6, "MB") }
/Key Cache/ { sub(/,/,"", $5); sub(/,/, "", $8); sub(/,/, "", $11); printf "key_cache_entries\tL\t%s\nkey_cache_size\tL\t%0.0f\nkey_cache_capacity\tL\t%0.0f\nkey_cache_hits\tL\t%s\nkey_cache_requests\tL\t%s\nkey_cache_hit_pct\tn\t%s\n", $5, hr_to_bytes($7, $8), hr_to_bytes($10, $11), $12, $14, ($12/or_one($14)) * 100}
/Row Cache/ { sub(/,/,"", $5); sub(/,/, "", $8); sub(/,/, "", $11); printf "row_cache_entries\tL\t%s\nrow_cache_size\tL\t%0.0f\nrow_cache_capacity\tL\t%0.0f\nrow_cache_hits\tL\t%s\nrow_cache_requests\tL\t%s\nrow_cache_hit_pct\tn\t%s\n", $5, hr_to_bytes($7, $8), hr_to_bytes($10, $11), $12, $14, ($12/or_one($14)) * 100 }
/Counter Cache/ { sub(/,/,"", $5); sub(/,/, "", $8); sub(/,/, "", $11); printf "counter_cache_entries\tL\t%s\ncounter_cache_size\tL\t%0.0f\ncounter_cache_capacity\tL\t%0.0f\ncounter_cache_hits\tL\t%s\ncounter_cache_requests\tL\t%s\ncounter_cache_hit_pct\tn\t%s\n", $5, hr_to_bytes($7, $8), hr_to_bytes($10, $11), $12, $14, ($12/or_one($14)) * 100 }

' 


