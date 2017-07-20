local circll = require("circll")

local SYSCALLS = {
  "sys_read",
  "sys_write",
  "sys_open",
  "sys_close",
  "sys_stat",
  "sys_fstat",
  "sys_lstat",
  "sys_poll",
  "sys_lseek",
  "sys_mmap",
  "sys_mprotect",
  "sys_munmap",
  "sys_brk",
  "sys_rt_sigaction",
  "sys_rt_sigprocmask",
  "sys_rt_sigreturn",
  "sys_ioctl",
  "sys_pread",
  "sys_pwrite",
  "sys_readv",
  "sys_writev",
  "sys_access",
  "sys_pipe",
  "sys_select",
  "sys_sched_yield",
  "sys_mremap",
  "sys_msync",
  "sys_mincore",
  "sys_madvise",
  "sys_shmget",
  "sys_shmat",
  "sys_shmctl",
  "sys_dup",
  "sys_dup2",
  "sys_pause",
  "sys_nanosleep",
  "sys_getitimer",
  "sys_alarm",
  "sys_setitimer",
  "sys_getpid",
  "sys_sendfile",
  "sys_socket",
  "sys_connect",
  "sys_accept",
  "sys_sendto",
  "sys_recvfrom",
  "sys_sendmsg",
  "sys_recvmsg",
  "sys_shutdown",
  "sys_bind",
  "sys_listen",
  "sys_getsockname",
  "sys_getpeername",
  "sys_socketpair",
  "sys_setsockopt",
  "sys_getsockopt",
  "sys_clone",
  "sys_fork",
  "sys_vfork",
  "sys_execve",
  -- "sys__exit",
  "sys_wait4",
  "sys_kill",
  "sys_uname",
  "sys_semget",
  "sys_semop",
  "sys_semctl",
  "sys_shmdt",
  "sys_msgget",
  "sys_msgsnd",
  "sys_msgrcv",
  "sys_msgctl",
  "sys_fcntl",
  "sys_flock",
  "sys_fsync",
  "sys_fdatasync",
  "sys_truncate",
  "sys_ftruncate",
  "sys_getdents",
  "sys_getcwd",
  "sys_chdir",
  "sys_fchdir",
  "sys_rename",
  "sys_mkdir",
  "sys_rmdir",
  "sys_creat",
  "sys_link",
  "sys_unlink",
  "sys_symlink",
  "sys_readlink",
  "sys_chmod",
  "sys_fchmod",
  "sys_chown",
  "sys_fchown",
  "sys_lchown",
  "sys_umask",
  "sys_gettimeofday",
  "sys_getrlimit",
  "sys_getrusage",
  "sys_sysinfo",
  "sys_times",
  "sys_ptrace",
  "sys_getuid",
  "sys_syslog",
  "sys_getgid",
  "sys_setuid",
  "sys_setgid",
  "sys_geteuid",
  "sys_getegid",
  "sys_setpgid",
  "sys_getppid",
  "sys_getpgrp",
  "sys_setsid",
  "sys_setreuid",
  "sys_setregid",
  "sys_getgroups",
  "sys_setgroups",
  "sys_setresuid",
  "sys_getresuid",
  "sys_setresgid",
  "sys_getresgid",
  "sys_getpgid",
  "sys_setfsuid",
  "sys_setfsgid",
  "sys_getsid",
  "sys_capget",
  "sys_capset",
  "sys_rt_sigpending",
  "sys_rt_sigtimedwait",
  "sys_rt_sigqueueinfo",
  "sys_rt_sigsuspend",
  "sys_sigaltstack",
  "sys_utime",
  "sys_mknod",
  "sys_uselib",
  "sys_personality",
  "sys_ustat",
  "sys_statfs",
  "sys_fstatfs",
  "sys_sysfs",
  "sys_getpriority",
  "sys_setpriority",
  "sys_sched_setparam",
  "sys_sched_getparam",
  "sys_sched_setscheduler",
  "sys_sched_getscheduler",
  "sys_sched_get_priority_max",
  "sys_sched_get_priority_min",
  "sys_sched_rr_get_interval",
  "sys_mlock",
  "sys_munlock",
  "sys_mlockall",
  "sys_munlockall",
  "sys_vhangup",
  "sys_modify_ldt",
  "sys_pivot_root",
  "sys__sysctl",
  "sys_prctl",
  "sys_arch_prctl",
  "sys_adjtimex",
  "sys_setrlimit",
  "sys_chroot",
  "sys_sync",
  "sys_acct",
  "sys_settimeofday",
  "sys_mount",
  "sys_umount",
  "sys_swapon",
  "sys_swapoff",
  "sys_reboot",
  "sys_sethostname",
  "sys_setdomainname",
  "sys_iopl",
  "sys_ioperm",
  "sys_create_module",
  "sys_init_module",
  "sys_delete_module",
  "sys_get_kernel_syms",
  "sys_query_module",
  "sys_quotactl",
  "sys_nfsservctl",
  "sys_getpmsg",
  "sys_putpmsg",
  "sys_afs_syscall",
  "sys_tuxcall",
  "sys_security",
  "sys_gettid",
  "sys_readahead",
  "sys_setxattr",
  "sys_lsetxattr",
  "sys_fsetxattr",
  "sys_getxattr",
  "sys_lgetxattr",
  "sys_fgetxattr",
  "sys_listxattr",
  "sys_llistxattr",
  "sys_flistxattr",
  "sys_removexattr",
  "sys_lremovexattr",
  "sys_fremovexattr",
  "sys_tkill",
  "sys_time",
  "sys_futex",
  "sys_sched_setaffinity",
  "sys_sched_getaffinity",
  "sys_set_thread_area",
  "sys_io_setup",
  "sys_io_destroy",
  "sys_io_getevents",
  "sys_io_submit",
  "sys_io_cancel",
  "sys_get_thread_area",
  "sys_lookup_dcookie",
  "sys_epoll_create",
  "sys_epoll_ctl_old",
  "sys_epoll_wait_old",
  "sys_remap_file_pages",
  "sys_getdents64",
  "sys_set_tid_address",
  "sys_restart_syscall",
  "sys_semtimedop",
  "sys_fadvise64",
  "sys_timer_create",
  "sys_timer_settime",
  "sys_timer_gettime",
  "sys_timer_getoverrun",
  "sys_timer_delete",
  "sys_clock_settime",
  "sys_clock_gettime",
  "sys_clock_getres",
  "sys_clock_nanosleep",
  "sys_exit_group",
  "sys_epoll_wait",
  "sys_epoll_ctl",
  "sys_tgkill",
  "sys_utimes",
  "sys_vserver",
  "sys_mbind",
  "sys_set_mempolicy",
  "sys_get_mempolicy",
  "sys_mq_open",
  "sys_mq_unlink",
  "sys_mq_timedsend",
  "sys_mq_timedreceive",
  "sys_mq_notify",
  "sys_mq_getsetattr",
  "sys_kexec_load",
  "sys_waitid",
  "sys_add_key",
  "sys_request_key",
  "sys_keyctl",
  "sys_ioprio_set",
  "sys_ioprio_get",
  "sys_inotify_init",
  "sys_inotify_add_watch",
  "sys_inotify_rm_watch",
  "sys_migrate_pages",
  "sys_openat",
  "sys_mkdirat",
  "sys_mknodat",
  "sys_fchownat",
  "sys_futimesat",
  "sys_newfstatat",
  "sys_unlinkat",
  "sys_renameat",
  "sys_linkat",
  "sys_symlinkat",
  "sys_readlinkat",
  "sys_fchmodat",
  "sys_faccessat",
  "sys_pselect6",
  "sys_ppoll",
  "sys_unshare",
  "sys_set_robust_list",
  "sys_get_robust_list",
  "sys_splice",
  "sys_tee",
  "sys_sync_file_range",
  "sys_vmsplice",
  "sys_move_pages",
  "sys_utimensat",
  "sys_epoll_pwait",
  "sys_signalfd",
  "sys_timerfd_create",
  "sys_eventfd",
  "sys_fallocate",
  "sys_timerfd_settime",
  "sys_timerfd_gettime",
  "sys_accept4",
  "sys_signalfd4",
  "sys_eventfd2",
  "sys_epoll_create1",
  "sys_dup3",
  "sys_pipe2",
  "sys_inotify_init1",
  "sys_preadv",
  "sys_pwritev",
  "sys_rt_tgsigqueueinfo",
  "sys_perf_event_open",
  "sys_recvmmsg",
  "sys_fanotify_init",
  "sys_fanotify_mark",
  "sys_prlimit64",
  "sys_name_to_handle_at",
  "sys_open_by_handle_at",
  "sys_clock_adjtime",
  "sys_syncfs",
  "sys_sendmmsg",
  "sys_setns",
  "sys_getcpu",
  "sys_process_vm_readv",
  "sys_process_vm_writev",
  "sys_kcmp",
  "sys_finit_module",
}

SYSCALLS[0] = "all"

local BPF_HEAD = [[
#include <uapi/linux/ptrace.h>

typedef struct {
  u64          id;
  circll_bin_t bin;
} syscall_dist_key_t;

BPF_HASH(syscall_start, u64, u64);
BPF_HASH(syscall_count, u64, u64);
BPF_HASH(syscall_dist,  syscall_dist_key_t, u64);

int syscall_trace_start(struct pt_regs *ctx) {
  u64 pid_tgid = bpf_get_current_pid_tgid();
  u64 t = bpf_ktime_get_ns();
  syscall_start.update(&pid_tgid, &t);
  return 0;
}

static int syscall_trace_completion_with_id(u64 id) {
  u64 pid_tgid = bpf_get_current_pid_tgid();
  u64 *start_ns = syscall_start.lookup(&pid_tgid);
  if (!start_ns) return 0;
  u64 delta = bpf_ktime_get_ns() - *start_ns;

  // increment syscall count
  u64 *val, zero = 0;
  val = syscall_count.lookup_or_init(&id, &zero);
  (*val)++;
  // record syscall latency
  syscall_dist_key_t key = {};
  key.id = id;
  key.bin = circll_bin(delta, -9);
  val = syscall_dist.lookup_or_init(&key, &zero);
  (*val)++;
  // record syscall summary
  key.id = 0;
  val = syscall_dist.lookup_or_init(&key, &zero);
  (*val)++;
  return 0;
}

]]

local BPF_PROBE_TEMPLATE = [[
// PROBE $ID : $NAME
int syscall_trace_completion_$NAME(struct pt_regs *ctx){
  return syscall_trace_completion_with_id($ID);
}
]]

local function bpf_text()
  local parts = { BPF_HEAD }
  for id, name in ipairs(SYSCALLS) do
    parts[#parts + 1] = BPF_PROBE_TEMPLATE
      :gsub("$NAME",name)
      :gsub("$ID",id)
  end
  return table.concat(parts)
end

return {

  text = bpf_text();

  init = function(self, bpf)
    for id, name in ipairs(SYSCALLS) do
      io.stderr:write("attaching " .. name .. " ... ")
      local ok = pcall(function()
          bpf:attach_kprobe { event=name, fn_name="syscall_trace_start" }
          bpf:attach_kprobe { event=name, fn_name="syscall_trace_completion_" .. name, retprobe = 1 }
      end)
      io.stderr:write(ok and "OK\n" or "FAILED\n")
    end
    self.pipe = bpf:get_table("syscall_dist")
    self.pipe_count = bpf:get_table("syscall_count")
  end,

  pull = function(self)
    local metrics = {}
    for k,v in self.pipe:items() do
      local m = "latency`" .. SYSCALLS[tonumber(k.id)]
      metrics[m] = metrics[m] or circll.hist()
      metrics[m]:add(k.bin, v)
    end
    circll.clear(self.pipe)
    for k,v in self.pipe_count:items() do
      local m = "count`" .. SYSCALLS[tonumber(k)]
      metrics[m] = metrics[m] and metrics[m] + tonumber(v) or tonumber(v)
    end
    return metrics
  end

}
