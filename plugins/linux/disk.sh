#!/bin/bash
#
# Block device I/O metrics
# See Documentation/iostats.txt in the Linux kernel source.

print_bdev() {
    printf "%s\`%s\tL\t%s\n" $1 $2 $3
}

DEVICES=($(/bin/ls /sys/block))
for bdev in "${DEVICES[@]}" ; do
    DEVSTAT=($(cat /sys/block/$bdev/stat))

    # If physical sector size is discoverable, use it.
    # Otherwise, assume 512b. iostat always assumes 512b.
    if [[ -f /sys/block/$bdev/queue/physical_block_size ]]; then
        SECSZ=$(cat /sys/block/$bdev/queue/physical_block_size)
    else
        SECSZ=512
    fi

    let R_BYTES=${DEVSTAT[2]}*$SECSZ
    let W_BYTES=${DEVSTAT[6]}*$SECSZ

    print_bdev $bdev reads ${DEVSTAT[0]}
    print_bdev $bdev writes ${DEVSTAT[4]}
    print_bdev $bdev nread $R_BYTES
    print_bdev $bdev nwritten $W_BYTES
done
