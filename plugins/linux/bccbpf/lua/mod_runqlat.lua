local circll = require("circll")

local BPF_TEXT = [[
#include <uapi/linux/ptrace.h>
#include <linux/sched.h>
#include <linux/nsproxy.h>
#include <linux/pid_namespace.h>

typedef struct pid_key {
    u64 id;    // work around
    u64 slot;
} pid_key_t;

typedef struct pidns_key {
    u64 id;    // work around
    u64 slot;
} pidns_key_t;

BPF_HASH(runqlat_start, u32);
BPF_HASH(runqlat_dist, circll_bin_t);

struct rq;

// record enqueue timestamp
int trace_enqueue(struct pt_regs *ctx, struct rq *rq, struct task_struct *p,
    int flags)
{
    u32 tgid = p->tgid;
    u32 pid = p->pid;
    u64 ts = bpf_ktime_get_ns();
    runqlat_start.update(&pid, &ts);
    return 0;
}

// calculate latency
int trace_run(struct pt_regs *ctx, struct task_struct *prev)
{
    u32 pid, tgid;

    // ivcsw: treat like an enqueue event and store timestamp
    if (prev->state == TASK_RUNNING) {
        tgid = prev->tgid;
        pid = prev->pid;
        u64 ts = bpf_ktime_get_ns();
        runqlat_start.update(&pid, &ts);
    }

    tgid = bpf_get_current_pid_tgid() >> 32;
    pid = bpf_get_current_pid_tgid();
    u64 *tsp, delta;

    // fetch timestamp and calculate delta
    tsp = runqlat_start.lookup(&pid);
    if (tsp == 0) {
        return 0;   // missed enqueue
    }
    delta = bpf_ktime_get_ns() - *tsp;

    // store as histogram
    u64 *val, zero = 0;
    circll_bin_t key = circll_bin(delta, -9);
    val = runqlat_dist.lookup_or_init(&key, &zero);
    (*val)++;

    runqlat_start.delete(&pid);
    return 0;
}
]]

return {

  text = BPF_TEXT,

  init = function(self, bpf)
    for event in io.open("/sys/kernel/debug/tracing/available_filter_functions"):lines() do
      if event:match("enqueue_task_.*") then
        bpf:attach_kprobe { event=event, fn_name="trace_enqueue" }
      end
    end
    bpf:attach_kprobe { event="finish_task_switch", fn_name="trace_run" }
    self.pipe = bpf:get_table("runqlat_dist")
  end,

  pull = function(self)
    local hist = circll.hist()
    for k,v in self.pipe:items() do
      hist:add(k, v)
    end
    circll.clear(self.pipe)
    return { latency = hist }
  end
}
