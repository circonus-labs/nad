#!/bin/sh --
#
# Memory usage statistics, via sysctl

. @@CONF@@/freebsd/common.sh

print_vm() {
    printf "%s\`%s\tL\t%s\n" $1 $2 $3
}

# Total system memory: active + wired + cache + inactive + free
# "Used" is active + wired
# "Free" is cache + inactive + free
# These are counted in pages, so we multiply by pagesize to get bytes

PGSIZE=`${BIN_SYSCTL} -n vm.stats.vm.v_page_size`
PG_ACTIVE=`${BIN_SYSCTL} -n vm.stats.vm.v_active_count`
PG_WIRED=`${BIN_SYSCTL} -n vm.stats.vm.v_wire_count`
PG_CACHE=`${BIN_SYSCTL} -n vm.stats.vm.v_cache_count`
PG_INACTIVE=`${BIN_SYSCTL} -n vm.stats.vm.v_inactive_count`
PG_FREE=`${BIN_SYSCTL} -n vm.stats.vm.v_free_count`

ACTIVE=$(($PG_ACTIVE*$PGSIZE))
WIRED=$(($PG_WIRED*$PGSIZE))
CACHE=$(($PG_CACHE*$PGSIZE))
INACTIVE=$(($PG_INACTIVE*$PGSIZE))
FREE=$(($PG_FREE*$PGSIZE))

MEM_USED=$(($ACTIVE+$WIRED))
MEM_TOTAL=$(($ACTIVE+$WIRED+$CACHE+$INACTIVE+$FREE))
MEM_PERC=`echo "scale=2;$MEM_USED/$MEM_TOTAL" | ${BIN_BC}`

# Swap
# There doesn't seem to be a direct sysctl for swap used. Use pstat instead.
# pstat seems to always use 'M' as the unit for swap
stats=`${BIN_PSTAT} -T | ${BIN_AWK} '$2 == "swap" { print $1; }'`
SWAP_USED=$((`echo $stats | ${BIN_CUT} -d'/' -f1 | ${BIN_SED} -e 's/M//'`*1048576))
SWAP_TOTAL=$((`echo $stats | ${BIN_CUT} -d'/' -f2 | ${BIN_SED} -e 's/M//'`*1048576))
SWAP_FREE=$(($SWAP_TOTAL-$SWAP_USED))
SWAP_PERC=`echo "scale=2;$SWAP_USED/$SWAP_TOTAL" | ${BIN_BC}`

print_vm memory total $(($ACTIVE+$WIRED+$CACHE+$INACTIVE+$FREE))
print_vm memory used $(($ACTIVE+$WIRED))
print_vm memory free $(($CACHE+$INACTIVE+$FREE))
printf "memory\`percent_used\tn\t%0.2f\n" $MEM_PERC
print_vm swap total $SWAP_TOTAL
print_vm swap used $SWAP_USED
print_vm swap free $SWAP_FREE
printf "swap\`percent_used\tn\t%0.2f\n" $SWAP_PERC
