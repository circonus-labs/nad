#!/usr/bin/env bash
#
# ZFSonLinux collector for nad
#

PROC_DIR=${PROC_DIR:=/proc/spl/kstat/zfs}

# kstat-compatible files in /proc
# depending on the ZFS version, these files may or may not exist, but that is ok
#
# for those kstat files that do exist, but aren't listed here:
#   + vdev_cache_stats are effectively deprecated and will contain zeroes (boring)
#   + xuio_stats -- XUIO interface on ZFSonLinux has no known consumer as of 1-Jan-2018
GLOBAL_KSTAT_FILES="
    abdstats
    arcstats
    dbufcachestats
    dmu_tx
    dnodestats
    fm
    vdev_mirror_stats
    zfetchstats
    zil
"

# ZFSonLinux currently only implements the KSTAT_DATA_UINT64 entries
KSTAT_DATA_UINT64="4"

for f in ${GLOBAL_KSTAT_FILES}
do
    filename=${PROC_DIR}/${f}
    [[ -f ${filename} ]] || continue

    while read -r line
    do
        a=(${line})
        [[ ${#a[*]} != 3 ]] && continue
        type=
        case ${a[1]} in
            ${KSTAT_DATA_UINT64})  type=L ;;
            *)  continue ;;
        esac
        [[ -n ${type} ]] && printf "%s\`%s\t%s\t%s\n" ${f} ${a[0]} ${type} ${a[2]}
    done < ${filename}
done

# The "io" stats file contains the traditional KSTAT_TYPE_IO statistics in a
# single row format.
#
# NB, if you notice rlentime == wlentime and find yourself looking at this code,
# then be aware of https://github.com/zfsonlinux/spl/issues/651 and consider
# the simple fix therein
for io_stats in ${PROC_DIR}/*/io
do
    pool_dir=${io_stats%/*}
    pool_name=${pool_dir##*/}
    [[ ${pool_name} == "*" ]] && continue
    line_count=0
    while read -r line
    do
        ((line_count++))
        [[ ${line_count} == 2 ]] && header=(${line})
        [[ ${line_count} < 3 ]] && continue
        value=(${line})
        index=0
        for i in ${header[*]}
        do
            printf "zpool_io\`%s\`%s\tL\t%s\n" ${pool_name} ${header[${index}]} ${value[${index}]}
            ((index++))
        done
        break
    done < ${io_stats}
done
