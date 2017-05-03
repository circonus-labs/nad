#!/bin/bash

awk '
BEGIN {
    # define devices to exclude
    excluded_devices[0] = "^ram"
    excluded_devices[1] = "^loop"
}
function foo(device, mdmap, result) {
    for (ij in mdmap) {
        split(ij, xx, SUBSEP)
        if (xx[1] == device) {
            result[xx[2]] = 1
        }
    }
}
{
    if (NR == FNR) {
        FS = ":"
        $0=$0
        if (match($1, "md[0-9]+")) {
            mddevice = $1
            gsub(/ /, "", mddevice)
            gsub(/\[[0-9]+\]/, "", $2)
            split($2, devices, " ")
            dev_status[mddevice] = devices[1]
            for (i in devices) {
                # first two fields are status, type
                if (i > 2) {
                    mdmap[mddevice,devices[i]] = 1
                }
            }
        }
    } else {
        FS = " "
        $0=$0

        # exclude devices
        for (i in excluded_devices) {
            if ($3 ~ excluded_devices[i]) {
                next
            }
        }

        rd_ms[$3] = $7
        wr_ms[$3] = $11
        io_in_progress[$3] = $12
        io_ms[$3] = $13

        if ($3 ~ /md/) {
            # initialize array
            split("", devices)
            foo($3, mdmap, devices)
            for (d in devices) {
                $7+= rd_ms[d]
                $11 += wr_ms[d]
                $12 += io_in_progress[d]
                $13 += io_ms[d]
            }
        }

        print $3"`rd_completed\tL\t"$4
        print $3"`rd_merged\tL\t"$5
        print $3"`rd_sectors\tL\t"$6
        print $3"`rd_ms\tL\t"$7
        print $3"`wr_completed\tL\t"$8
        print $3"`wr_merged\tL\t"$9
        print $3"`wr_sectors\tL\t"$10
        print $3"`wr_ms\tL\t"$11
        print $3"`io_in_progress\tL\t"$12
        print $3"`io_ms\tL\t"$13
        print $3"`io_ms_weighted\tL\t"$14
    }
}
' /proc/mdstat /proc/diskstats
