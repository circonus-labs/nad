--
-- iolatency
--
-- based on biolatency.py
--
-- Metric 'sd' contains comulative statistics for all block devices
--

local ffi = require("ffi")
local circll = require("circll")

return {
  text = [[
#include <uapi/linux/ptrace.h>
#include <linux/blkdev.h>

typedef struct disk_key {
    char disk[DISK_NAME_LEN];
    circll_bin_t bin;
} disk_key_t;

BPF_HASH(iolat_start, struct request *);
BPF_HASH(iolat_dist, disk_key_t);
BPF_HASH(iosize_dist, disk_key_t);

// time block I/O
int trace_req_iolat_start(struct pt_regs *ctx, struct request *req) {
    u64 ts = bpf_ktime_get_ns();
    iolat_start.update(&req, &ts);
    return 0;
}

// output
int trace_req_completion(struct pt_regs *ctx, struct request *req) {
    u64 *old, *tsp, delta, size, zero = 0;

    // fetch timestamp and calculate delta
    tsp = iolat_start.lookup(&req);
    if (tsp == 0) {
        return 0;   // missed issue
    }
    delta = bpf_ktime_get_ns() - *tsp;
    size = req->__data_len / 1024;

    // store as histogram
    disk_key_t lat_key = {.bin = circll_bin(delta, -9)};
    disk_key_t size_key = {.bin = circll_bin(size, 0)};

    // 1) current disk
    bpf_probe_read(&lat_key.disk, sizeof(lat_key.disk), req->rq_disk->disk_name);
    bpf_probe_read(&size_key.disk, sizeof(size_key.disk), req->rq_disk->disk_name);
    old = iolat_dist.lookup_or_init(&lat_key, &zero); (*old)++;
    old = iosize_dist.lookup_or_init(&size_key, &zero); (*old)++;

    // 2) aggregated disk
    memcpy(lat_key.disk, "sd", 3);
    memcpy(size_key.disk, "sd", 3);
    old = iolat_dist.lookup_or_init(&lat_key, &zero); (*old)++;
    old = iosize_dist.lookup_or_init(&size_key, &zero); (*old)++;

    // cleanup
    iolat_start.delete(&req);
    return 0;
}
]],

  init = function(self, bpf)
    bpf:attach_kprobe{event="blk_start_request", fn_name="trace_req_iolat_start"}
    bpf:attach_kprobe{event="blk_mq_start_request", fn_name="trace_req_iolat_start"}
    bpf:attach_kprobe{event="blk_account_io_completion", fn_name="trace_req_completion"}
    self.pipe_lat = bpf:get_table("iolat_dist")
    self.pipe_size = bpf:get_table("iosize_dist")
  end,

  pull = function(self)
    local metrics = {}
    for k, v in self.pipe_lat:items() do
      local m = "latency`" .. ffi.string(k.disk)
      metrics[m] = metrics[m] or circll.hist()
      metrics[m]:add(k.bin, v)
    end
    circll.clear(self.pipe_lat)
    for k, v in self.pipe_size:items() do
      local m = "size`" .. ffi.string(k.disk)
      metrics[m] = metrics[m] or circll.hist()
      metrics[m]:add(k.bin, v)
    end
    circll.clear(self.pipe_size)
    return metrics
  end,
}
