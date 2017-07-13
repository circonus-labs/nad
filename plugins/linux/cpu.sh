#!/bin/bash
#
# CPU usage statistics, via /proc/stat. See proc(5).

# Print ordinary metrics
print_cssum() {
    printf "%s\tL\t%s\n" $1 $2
}

# Print metrics normalized to a single CPU and 100 Hz tick rate
print_norm_cssum() {
    let norm_val="($2 / $NCPUS) / $NORMHZ"
    printf "%s\tL\t%s\n" $1 $norm_val
}

if [[ -x /usr/bin/nproc ]]; then
    NCPUS=$(/usr/bin/nproc)
else
    NCPUS=$(/bin/grep -c ^processor /proc/cpuinfo)
fi

# System tick rate, and divisor to normalize to 100 Hz
TICKHZ=`getconf CLK_TCK`
NORMHZ=`expr $TICKHZ / 100`

# Kernel version madness.  Number of columns in cpu line changed several times.
OSREV=`/bin/uname -r`
KVER=($(echo ${OSREV%%-*} | tr "." "\n"))

ALLCPU=($(awk '$1 == "cpu" { print }' /proc/stat))
CPU_USER_NORMAL=${ALLCPU[1]}
CPU_USER_NICE=${ALLCPU[2]}
CPU_SYS=${ALLCPU[3]}
CPU_IDLE_NORMAL=${ALLCPU[4]}
CPU_WAIT_IO=${ALLCPU[5]}
CPU_IRQ=${ALLCPU[6]}
CPU_SOFTIRQ=${ALLCPU[7]}
CPU_STEAL=${ALLCPU[8]}

if [[ ${KVER[0]} > 2 || ("${KVER[0]}" == "2" && ${KVER[2]} -ge 24) ]]; then
    CPU_GUEST=${ALLCPU[9]}
else
    CPU_GUEST=0
fi

if [[ ${KVER[0]} > 2 || ("${KVER[0]}" == "2" && ${KVER[2]} -ge 33) ]]; then
    CPU_GUEST_NICE=${ALLCPU[10]}
else
    CPU_GUEST_NICE=0
fi

# Summarize interrupts
let CPU_INTR=$CPU_IRQ+$CPU_SOFTIRQ

# Summarize kernel time
#
# "guest" and "guest_nice" are time spent running virtual CPUs, and count as
# kernel time
let CPU_KERNEL=$CPU_SYS+$CPU_GUEST+$CPU_GUEST_NICE

# Summarize idle time
#
# "steal" is time while we, a guest, are runnable but a real CPU isn't
# servicing our virtual CPU
let CPU_IDLE=$CPU_IDLE_NORMAL+$CPU_STEAL

# Summarize user time
let CPU_USER=$CPU_USER_NORMAL+$CPU_USER_NICE

# Context switches
CTXT=($(awk '$1 == "ctxt" { print $2 }' /proc/stat))

# Linux does not provide a metric for total syscalls
SYSCALL='[[null]]'

print_norm_cssum user $CPU_USER
print_norm_cssum user\`normal $CPU_USER_NORMAL
print_norm_cssum user\`nice $CPU_USER_NICE
print_norm_cssum kernel $CPU_KERNEL
print_norm_cssum kernel\`sys $CPU_SYS
print_norm_cssum kernel\`guest $CPU_GUEST
print_norm_cssum kernel\`guest_nice $CPU_GUEST_NICE
print_norm_cssum idle $CPU_IDLE
print_norm_cssum idle\`normal $CPU_IDLE_NORMAL
print_norm_cssum idle\`steal $CPU_STEAL
print_norm_cssum wait_io $CPU_WAIT_IO
print_norm_cssum intr $CPU_INTR
print_norm_cssum intr\`hard $CPU_IRQ
print_norm_cssum intr\`soft $CPU_SOFTIRQ
print_cssum context_switch $CTXT
print_cssum syscall $SYSCALL

# Process statistics
while IFS=" " read NAME VAL
do
    # METRIC { name="cpu`processes", desc="number of processes created since boot, e.g. by fork()/clone() syscalls" }
    [[ $NAME = processes ]] && print_cssum $NAME $VAL
    # Rename: procs_running -> procs_runnable, since that is what's reported (http://lxr.linux.no/linux+v2.6.29/kernel/sched.c#L2699)
    # METRIC { name="cpu`procs_runnable", desc="The number of processes currently in a runnable state." }
    [[ $NAME = procs_running ]] && print_cssum procs_runnable $VAL
    # METRIC { name="cpu`procs_blocked", desc="The number of processes currently blocked, waiting for I/O to complete" }
    [[ $NAME = procs_blocked ]] && print_cssum $NAME $VAL
done < /proc/stat

exit 0
