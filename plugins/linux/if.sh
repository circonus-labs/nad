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
    # METRIC { name="if`<IF>`in_bytes", desc="Number of received bytes", unit="byte" }
    print_iface $iface in_bytes ${IFSTAT[1]}
    # METRIC { name="if`<IF>`in_packets", desc="Number of packets received" }
    print_iface $iface in_packets ${IFSTAT[2]}
    # METRIC { name="if`<IF>`in_errors", desc="Number of bad packets received" }
    print_iface $iface in_errors ${IFSTAT[3]}
    # METRIC { name="if`<IF>`in_drop", desc="Number of dropped packets due to lack of space in kernel buffers" }
    print_iface $iface in_drop ${IFSTAT[4]}
    # METRIC { name="if`<IF>`in_fifo_overrun", desc="Number of fifo overrun errors" }
    print_iface $iface in_fifo_overrun ${IFSTAT[5]}

    # METRIC { name="if`<IF>`out_bytes", desc="Number of tranmitted bytes", unit="byte" }
    print_iface $iface out_bytes ${IFSTAT[9]}
    # METRIC { name="if`<IF>`out_packets", desc="Number of outgoing packets" }
    print_iface $iface out_packets ${IFSTAT[10]}
    # METRIC { name="if`<IF>`out_errors", desc="Number of errors that happend while transmitting packets" }
    print_iface $iface out_errors ${IFSTAT[11]}
    # METRIC { name="if`<IF>`out_drop", desc="Number of dropped packets due to lack of space in kernel buffers" }
    print_iface $iface out_drop ${IFSTAT[12]}
    # METRIC { name="if`<IF>`out_fifo_overrun", desc="Number of fifo overrun errors" }
    print_iface $iface out_fifo_overrun ${IFSTAT[13]}
done

# Read segment retransmitted from /proc/net/snmp
# METRIC { name="if`tcp`segments_retransmitted", descr="Retransmitted tcp segments, systemwide" }
let ROW=0
while IFS=":" read HEAD TAIL
do
    [[ $HEAD = "Tcp" ]] && let ROW+=1
    [[ $HEAD = "Tcp" ]] && [[ $ROW -gt 1 ]] && break
done < /proc/net/snmp
FIELDS=( $TAIL )
printf "%s\tL\t%s\n" tcp\'segments_retransmitted ${FIELDS[11]}

# Connection Statistics from /proc/net/socstat{,6}
# METRIC { name="if`tcp`connections", descr="Number of currently open TCP connections." }
# It would be much better if this was a counter: "number of connections since boot", so we could calculate #con/sec, etc.
let CONNECTIONS=0
while IFS=" " read HEAD inuse COUNT
do
    [[ $HEAD == "TCP:" ]] && let CONNECTIONS+=$COUNT && break
done </proc/net/sockstat
while IFS=" " read HEAD inuse COUNT
do
    [[ $HEAD == "TCP6:" ]] && let CONNECTIONS+=$COUNT && break
done </proc/net/sockstat6
printf "%s\tL\t%s\n" tcp\`connections $CONNECTIONS
