#!/bin/sh
#
# CPU usage statistics, via sysctl

# Print ordinary metrics
print_cssum() {
    printf "%s\tL\t%s\n" $1 $2
}

# Print metrics normalized to a single CPU and 100Hz tick rate
print_norm_cssum() {
    per_cpu_count=`expr $2 / $NCPUS`
    rate_factor=`echo "scale=2; 100/$STATHZ" | bc`
    value=`echo "$per_cpu_count*$rate_factor" | bc`
    printf "%s\tL\t%.0f\n" $1 $value
}

NCPUS=`sysctl -n hw.ncpu`
STATHZ=`sysctl -n kern.clockrate | awk '{ print $15 }'`

ALLCPU=`sysctl -n kern.cp_time`
CPU_USER_NORMAL=`echo $ALLCPU | cut -d',' -f1`
CPU_USER_NICE=`echo $ALLCPU | cut -d',' -f2`
CPU_SYS=`echo $ALLCPU | cut -d',' -f3`
CPU_IRQ=`echo $ALLCPU | cut -d',' -f4`
CPU_IDLE_NORMAL=`echo $ALLCPU | cut -d',' -f5`

# Not implemented
CPU_WAIT_IO=0
CPU_STEAL=0
CPU_GUEST=0
CPU_GUEST_NICE=0
CPU_SOFTIRQ=0

# Summarize interrupts
CPU_INTR=`expr $CPU_IRQ + $CPU_SOFTIRQ`

# Summarize kernel time
#
# "guest" and "guest_nice" are time spent running virtual CPUs, and count as
# kernel time
CPU_KERNEL=`expr $CPU_SYS + $CPU_GUEST + $CPU_GUEST_NICE`

# Summarize idle time
#
# "steal" is time while we, a guest, are runnable but a real CPU isn't
# servicing our virtual CPU
CPU_IDLE=`expr $CPU_IDLE_NORMAL + $CPU_STEAL`

# Summarize user time
CPU_USER=`expr $CPU_USER_NORMAL + $CPU_USER_NICE`

# Not implemented; these are not exposed via sysctl and would need to be
# accessed via a C library call.  See uvm(9).
# Context switches
CTXT=0
# System calls
SYSCALL=0

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
