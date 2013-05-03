#!/bin/bash
#
# Network interface statistics

print_iface() {
    printf "%s\`%s\tL\t%s\n" $1 $2 $3
}

# If numbers get large, they can use up whitespace separating interface name
# from first value. We don't want the ':' anyway, so we convert it to space.
# We also don't care about the lo interface.
DEVICES=(
    $(
        tr ':' ' ' < /proc/net/dev | \
        awk '{
            if(match($1, /^Inter/)) next; \
            if($1 == "face") next; \
            if($1 == "lo") next; \
            print $1 }'
    )
)

for iface in "${DEVICES[@]}" ; do
    IFSTAT=($(grep $iface /proc/net/dev | tr ':' ' '))
    print_iface $iface in_bytes ${IFSTAT[1]}
    print_iface $iface in_packets ${IFSTAT[2]}
    print_iface $iface in_errors ${IFSTAT[3]}
    print_iface $iface out_bytes ${IFSTAT[9]}
    print_iface $iface out_packets ${IFSTAT[10]}
    print_iface $iface out_errors ${IFSTAT[11]}
done
