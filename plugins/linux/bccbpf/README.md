# BPF metrics

This plugin captures high frequency low level metrics on recent Linux system (v4.3+), including:

- latencies of all syscalls as histograms: ``bpf`syscall`latency`*``
- counts of all syscalls as numeric metric: ``bpf`syscall`count`*``
- latencies of all block devices as histograms: ``bpf`bio`latency`*``
- latencies of all scheduler events (run-queue latencies) as histogram: ``bpf`runq`latency``

It does so by using the [BCC/BPF](https://github.com/iovisor/bcc) toolchain for efficient kernel tracing.

This plugin is supported on Ubuntu 16.04 only. All other platforms supported by nad do not have a
recent enough kernel.

## Security Notice

The bpf plugins require root privileges in order to execute.

We recommend to use the [setuid](https://en.wikipedia.org/wiki/Setuid) mechanism to escalate
privileges for the bccbpf plugins (see installation instructions below). The setuid executables
themselves do not take any arguments and ignore the environment, keeping the attack surface to a
minimum.

It's also possible to run the entire nad process as root.

## Installation


1. Install the bcc compiler collection for BPF


   Install the bcc tools including the [lua front end](https://github.com/iovisor/bcc/tree/master/src/lua) end from [Github:iovisor/bcc](https://github.com/iovisor/bcc).

   For Ubuntu 16.04:
   ```
   echo "deb [trusted=yes] https://repo.iovisor.org/apt/xenial xenial-nightly main" | sudo tee /etc/apt/sources.list.d/iovisor.list
   sudo apt-get update
   sudo apt-get install bcc-tools libbcc-examples bcc-lua
   ```

1. Set the setuid bit for the bpf.elf executable (**INSECURE** see below)
   ```
   sudo chmod u+s /opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.elf
   ```
   You might want to verify, that the file is owned by root.

1. Link plugin into NAD plugin_dir
   ```
   cd /opt/circonus/etc/node-agent.d/
   ln -s linux/bccbpf/bpf.elf
   ```

1. (optional) Restart the nad service
   ```
   sudo systemctl restart nad
   ```

> NOTE: using the setuid bit is **INSECURE**, a more secure method of implementing this would be to add an entry in `/etc/sudoers` allowing user `nobody` to run the specific `bpf.elf` command. Then, creating a stub `bpf.sh` which simply runs `sudo bpf.elf`.

1. Add entry to `sudoers`

    `echo "nobody $(hostname)=(root) NOPASSWD: /opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.elf" >> /etc/sudoers`

2. Create stub

    Create `/opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.sh` with the following contents:

    ```sh
    #!/usr/bin/env bash

    cmd=$(readlink -f $0)
    sudo ${cmd/.sh/.elf}
    ```

3. Make stub executable

    Run `chmod 755 /opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.sh`

4. Create a symlink for the plugin

    ```sh
    cd /opt/circonus/nad/etc/node-agent.d
    ln -s linux/bccbpf/bpf.sh
    ```


Similar steps apply to `iolatency.py`.

### Install script

Here are the above instructions in copy/paste-able form:

```
# Install bcc-tools
echo "deb [trusted=yes] https://repo.iovisor.org/apt/xenial xenial-nightly main" | sudo tee /etc/apt/sources.list.d/iovisor.list
sudo apt-get update
sudo apt-get install -y bcc-tools libbcc-examples bcc-lua

# setuid
sudo chmod u+s /opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.elf

# Install plugin
( cd /opt/circonus/nad/etc/node-agent.d/ && sudo ln -s linux/bccbpf/bpf.elf )

# Restart nad
sudo systemctl restart nad
```

## Trouble Shooting

If the metrics ``bpf`*`` do not show up in your Circonus account, try the following debugging steps:

1. Verify the plugin works by running it manually by running `bpf.elf` in this directory.
   Leave the process running for a minute to verify that metrics are printed to stdout.

   ```
   /opt/circonus/nad/etc/node-agent.d/linux/bccbpf/bpf.elf
   ```

1. Check that nad is able to retrieve data from the bpf plugin, via it's HTTP endpoint:
   ```
   curl -s localhost:2609
   ```
   This should return a JSON document, with bpf metrics under `.bpf`. The nad process needs to be
   running for longer than a minute for this object to contain any data.

## Contents

* bpf.elf A long running nad plugin that collects bpf metrics.

* lua/*.lua Supporting files for bpf.elf

* iolatency.elf (deprecated) A long running nad plugin, that collects IO latencies from block devices.
  This plugin is super-seeded by bpf.elf
