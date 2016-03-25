#!/bin/bash

print_vm() {
    printf "%s\`%s\tL\t%s\n" $1 $2 $3
}

MEM=($(free -k | grep ^Mem:))
MEM_TOTAL=${MEM[1]}
# For consistency across platforms, count cache as free, not used
let MEM_USED=${MEM[1]}-${MEM[3]}-${MEM[5]}-${MEM[6]}
let MEM_FREE=${MEM[3]}+${MEM[5]}+${MEM[6]}
let MEM_PERC=$MEM_USED/$MEM_TOTAL

SWAP=($(free -k | grep ^Swap:))
SWAP_TOTAL=${SWAP[1]}
SWAP_USED=${SWAP[2]}
SWAP_FREE=${SWAP[3]}
let SWAP_PERC=${SWAP[2]}/${SWAP[1]}

# pgfault is min+maj
PG_FAULTS=$(grep ^pgfault /proc/vmstat | awk '{ print $2 }')
PG_MAJFAULTS=$(grep ^pgmajfault /proc/vmstat | awk '{ print $2 }')
let PG_MINFAULTS=$PG_FAULTS-$PG_MAJFAULTS

print_vm memory total $MEM_TOTAL
print_vm memory used $MEM_USED
print_vm memory free $MEM_FREE
print_vm memory percent_used $MEM_PERC
print_vm swap total $SWAP_TOTAL
print_vm swap used $SWAP_USED
print_vm swap free $SWAP_FREE
print_vm swap percent_used $SWAP_PERC
print_vm info page_fault $PG_FAULTS
print_vm info page_fault\`minor $PG_MINFAULTS
print_vm info page_fault\`major $PG_MAJFAULTS
