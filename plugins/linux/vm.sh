#!/usr/bin/env bash

AWK=$(type -P awk)
[[ $? -eq 0 ]] || {
    echo "Unable to find 'awk'"
    exit 1
}

print_vm() {
    printf "%s\`%s\tL\t%s\n" $1 $2 $3
}

PROCFILE="/proc/meminfo"
[[ -f "$PROCFILE" ]] || {
    echo "Unable to find '${PROCFILE}'"
    exit 1
}

set -eu

$AWK 'BEGIN {
    list[""] = 0;
}
{
    item=$1
    value=$2

    if ((idx = index(item, ":")) > 0) {
        item = substr(item, 1, idx - 1)
    }

    if (substr(item, 0, 9) == "HugePages") {
        list[item] = value
    } else {
        list[item] = value * 1024
    }
}
END {
    memTotal=list["MemTotal"]

    memFree=list["MemFree"]
    memBuffers=list["Buffers"]
    memCached=list["Cached"]
    memFreeTotal=(memFree + memBuffers + memCached)

    memUsed=memTotal - memFreeTotal
    memFreePct=memFreeTotal / memTotal * 100
    memUsedPct=memUsed / memTotal * 100

    swapTotal=list["SwapTotal"]
    swapFree=list["SwapFree"]
    swapUsed=swapTotal - swapFree
    if (swapTotal > 0) {
        swapFreePct=swapFree / swapTotal * 100
        swapUsedPct=swapUsed / swapTotal * 100
    } else {
        swapFreePct=0
        swapUsedPct=0
    }

    for (key in list) {
        if (key != "") {
            printf("meminfo`%s\tL\t%.0f\n", key, list[key])
        }
    }

    printf("memory`total\tL\t%.0f\n", memTotal)
    printf("memory`used\tL\t%.0f\n", memUsed)
    printf("memory`free\tL\t%.0f\n", memFreeTotal)
    printf("memory`percent_used\tn\t%.02f\n", memUsedPct / 100) # deprecated
    printf("memory`percent_free\tn\t%.02f\n", memFreePct / 100) # deprecated
    printf("memory`used_percent\tn\t%.02f\n", memUsedPct)
    printf("memory`free_percent\tn\t%.02f\n", memFreePct)
    printf("swap`total\tL\t%.0f\n", swapTotal)
    printf("swap`used\tL\t%.0f\n", swapUsed)
    printf("swap`free\tL\t%.0f\n", swapFreeTotal)
    printf("swap`percent_used\tn\t%.02f\n", swapUsedPct / 100) # deprecated
    printf("swap`percent_free\tn\t%.02f\n", swapFreePct / 100) # deprecated
    printf("swap`used_percent\tn\t%.02f\n", swapUsedPct)
    printf("swap`free_percent\tn\t%.02f\n", swapFreePct)
}' < $PROCFILE


PROCFILE="/proc/vmstat"
[[ -f "$PROCFILE" ]] || {
    echo "Unable to find '${PROCFILE}'"
    exit 1
}

let PG_SCAN=0
let PG_FAULTS=0
let PG_MAJFAULTS=0
while IFS=" " read NAME VAL
do
    [[ "$NAME" = pgfault ]]    && PG_FAULTS="$VAL"
    [[ "$NAME" = pgmajfault ]] && PG_MAJFAULTS="$VAL"
    [[ "$NAME" = pswp* ]]      && print_vm vmstat $NAME $VAL
    [[ "$NAME" = pgscan* ]]    && PG_SCAN=$(($PG_SCAN + $VAL))
done < $PROCFILE

let PG_MINFAULTS=$PG_FAULTS-$PG_MAJFAULTS

print_vm info page_fault $PG_FAULTS
print_vm info page_fault\`minor $PG_MINFAULTS
print_vm info page_fault\`major $PG_MAJFAULTS
print_vm info page_scan $PG_SCAN
