#!/usr/bin/python
"""Emits io latency as circonus histogram in json"""
# pylint: disable=C0301

# This program was created as a modification to Brendan Gregg's
# biolatency script.
from __future__ import print_function
import argparse
import json
from time import sleep
#, strftime

from bcc import BPF # pylint: disable=E0401

# define BPF program
BPF_TEXT = """
#include <uapi/linux/ptrace.h>
#include <linux/blkdev.h>

typedef struct disk_key {
    char disk[DISK_NAME_LEN];
    u64 slot;
} disk_key_t;

BPF_HASH(start, struct request *);
BPF_HASH(dist, disk_key_t);

// time block I/O
int trace_req_start(struct pt_regs *ctx, struct request *req) {
    u64 ts = bpf_ktime_get_ns();
    start.update(&req, &ts);
    return 0;
}

#define LLN() if(v > 100) { exp++; v /= 10; } else goto good;
#define LLN2() LLN() LLN()
#define LLN4() LLN2() LLN2()
#define LLN8() LLN4() LLN4()
#define LLN16() LLN8() LLN8()
#define LLN32() LLN16() LLN16()
#define LLN64() LLN32() LLN32()
#define LLN128() LLN64() LLN64()

static unsigned int bpf_circll(unsigned long v) {
  int exp = 1;
  if(v == 0) return 0;
  if(v < 10) return (v*10 << 8) | exp;
  LLN128()
  if(v > 100) return 0xff00;
 good:
  return (v << 8) | (exp & 0xff);
}

// output
int trace_req_completion(struct pt_regs *ctx, struct request *req) {
    u64 *old, *tsp, delta, zero = 0;

    // fetch timestamp and calculate delta
    tsp = start.lookup(&req);
    if (tsp == 0) {
        return 0;   // missed issue
    }
    delta = bpf_ktime_get_ns() - *tsp;
    delta /= 1000;

    // store as histogram
    disk_key_t key = {.slot = bpf_circll(delta)};
    bpf_probe_read(&key.disk, sizeof(key.disk), req->rq_disk->disk_name);
    old = dist.lookup_or_init(&key, &zero);
    (*old)++;
    memcpy(key.disk, "sd", 3);
    old = dist.lookup_or_init(&key, &zero);
    (*old)++;
    start.delete(&req);
    return 0;
}
"""

def main():
    """main"""
    # arguments
    examples = """examples:
        ./iolat-bcc            # summarize block I/O latency as a histogram
        ./iolat-bcc -Q         # include OS queued time in I/O time
    """
    parser = argparse.ArgumentParser(
        description="Summarize block device I/O latency as a histogram",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=examples)
    parser.add_argument(
        "-Q",
        "--queued",
        action="store_true",
        help="include OS queued time in I/O time")
    args = parser.parse_args()

    # load BPF program
    bpf = BPF(text=BPF_TEXT)

    if args.queued:
        bpf.attach_kprobe(event="blk_account_io_start", fn_name="trace_req_start")
    else:
        bpf.attach_kprobe(event="blk_start_request", fn_name="trace_req_start")
        bpf.attach_kprobe(event="blk_mq_start_request", fn_name="trace_req_start")

    bpf.attach_kprobe(event="blk_account_io_completion", fn_name="trace_req_completion")

    # output
    interval = 5
    dist = bpf.get_table("dist")
    while 1:
        try:
            sleep(int(interval))
        except KeyboardInterrupt:
            exit()

        metrics = {}
        for key, val in dist.items():
            # print(" [%-8s (%f)] %d" % (key.disk, ((0xff & (key.slot >> 8)) / 10.0) * 10.0 ** (key.slot & 0xff), val.value))
            dsk = key.disk
            bkt = ((0xff & (key.slot >> 8)) / 10.0) * 10.0 ** (key.slot & 0xff)
            cnt = val.value

            if dsk not in metrics:
                metrics[dsk] = {'_type': 'n', '_value': []}

            metrics[dsk]['_value'].append('[%.2f]=%d' % (bkt, cnt))

        if len(metrics) > 0:
            print(json.dumps(metrics), '\n')
        dist.clear()

if __name__ == "__main__":
    main()
