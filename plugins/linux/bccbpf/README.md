# BPF metrics

## Requirements

### BCC/BPF kernel support

Ensure running kernel [supports BCC/BPF](http://www.tecmint.com/bcc-best-linux-performance-monitoring-tools/).

### bcc-tools installed

Ensure that [bcc-tools](https://github.com/iovisor/bcc) are installed

## Install

1. Verify the plugin works by running it manually first (e.g. `./iolatency.py`).
1. Link plugin into NAD plugin_dir (e.g. `cd /opt/circonus/etc/node-agent.d/linux/bccbpf; ln -s iolatency.py ../..`)
