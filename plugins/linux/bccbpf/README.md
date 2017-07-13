# BPF metrics

bpf plugins require root privileges in order to execute. We use
the [setuid](https://en.wikipedia.org/wiki/Setuid) mechanism to escalate privileges while running
these plugins.

## Requirements

### BCC/BPF kernel support

Ensure running kernel [supports BCC/BPF](http://www.tecmint.com/bcc-best-linux-performance-monitoring-tools/).

### bcc-tools installed

Ensure that [bcc-tools](https://github.com/iovisor/bcc) are installed

## Install

1. Verify the plugin works by running it manually first (e.g. `./iolatency.py`).
1. Compile the setuid wrapper, with using `make`
1. Link plugin into NAD plugin_dir (e.g. `cd /opt/circonus/etc/node-agent.d/; ln -s linux/bccbpf/iolatency.elf`)
