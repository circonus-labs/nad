# BPF metrics

bpf plugins require root privileges in order to execute.
We use the [setuid](https://en.wikipedia.org/wiki/Setuid) mechanism to escalate privileges while running these plugins.

## Contents

* bpf.lua / bpf.elf A long running nad plugin that collects bpf metrics from:
  - block devices: ``bpf`bio`latency`*``
  - CPU run queue latencies: ``bpf`runq`latency`*``
  - Syscall counts and latencies: ``bpf`syscall`latency`*``, ``bpf`syscall`count`*``

* lua/*.lua Supporting files for bpf.lua

* iolatency.py / iolatency.elf A long running nad plugin, that collects IO latencies from block devices.
  This plugin is super seeded by bpf.lua

## Requirements

### BCC/BPF kernel support

Ensure running kernel [supports BCC/BPF](http://www.tecmint.com/bcc-best-linux-performance-monitoring-tools/).
Version 4.3 should be enough. We have tested this on 4.4.

### bcc-tools installed

Install the [iovisor/bcc](https://github.com/iovisor/bcc) toolchain, including the [lua front end](https://github.com/iovisor/bcc/tree/master/src/lua).

For Ubuntu 16.04:
```
echo "deb [trusted=yes] https://repo.iovisor.org/apt/xenial xenial-nightly main" | sudo tee /etc/apt/sources.list.d/iovisor.list
sudo apt-get update
sudo apt-get install -y bcc-tools libbcc-examples bcc-lua
```

## Install

1. Compile the setuid warppers if necessary (`sudo make`)

1. Verify the plugin works by running it manually by running `./bpf.elf` in this directory. 
   Leave this running for about a minute to verify that metrics are collected.

1. Link plugin into NAD plugin_dir
   ```
   cd /opt/circonus/etc/node-agent.d/
   ln -s linux/bccbpf/bpf.elf
   ```

Similar steps apply to `iolatency.py`.
