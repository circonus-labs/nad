# NAD development

# Environment

A [Vagrantfile](Vagrantfile) is provided with current OS targets.

* `vagrant up c7` CentOS 7.3.1611 x86_64
* `vagrant up c6` CentOS 6.8 x86_64
* `vagrant up u16` Ubuntu 16.04 (xenial) x86_64
* `vagrant up u14` Ubuntu 14.04 (trusty) x86_64
* `vagrant up o14` OmniOS r151014
* `vagrant up bsd11` FreeBSD 11.0-RELEASE-p1
* `vagrant up bsd10` FreeBSD 10.3-RELEASE

Deprecated, no longer supported/built:

* 3/31/2017 - CentOS 5 end of life
* 4/2017 - Ubuntu 12.04 (precise) end of life

Development host environment (at the time of this writing):

```sh
$  echo $(system_profiler SPSoftwareDataType | grep 'System Version' | cut -d ':' -f 2) ;\
   vagrant -v ; vboxmanage --version ; node -v ; eslint -v
macOS 10.12.4 (16E195)
Vagrant 1.9.4
5.1.20r114629
v6.10.2
v3.19.0
```

## Basics

If you plan to develop and contribute to NAD, fork the repository and clone your fork. If you want to build your own packages, you do not necessarily _need_ to fork, simply clone the main repository.

e.g. cloning the master repository:

```sh
git clone https://github.com/circonus-labs/nad
cd nad
npm install
```

# Core

1. Fork the [NAD repository on github](https://github.com/circonus-labs/nad)
1. Clone fork on development host
1. `vagrant up <target_os>` where `<target_os>` is the desired OS from the list above
1. `vagrant ssh <target_os>`
1. `cd /vagrant && make install`
1. `/opt/circonus/nad/sbin/nad`
1. In another terminal, `vagrant ssh <target_os> -c 'curl http://127.0.0.1:2609/'`

For example:

Term 1:
```sh
$ vagrant up c7
$ vagrant ssh c7
[vagrant@centos7 ~]$ cd /vagrant
[vagrant@centos7 vagrant]$ sudo make install
--snip--
[vagrant@centos7 ~]$  /opt/circonus/nad/sbin/nad
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697222,"msg":"initializing","module":"main","name":"nad","version":"2.0.0","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697226,"msg":"push receiver handler loaded","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697231,"msg":"plugin scan start","module":"plugins","submodule":"scanner","dir":"/opt/circonus/nad/etc/node-agent.d","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697234,"msg":"plugin scan complete","module":"plugins","submodule":"scanner","active_plugins":0,"v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697234,"msg":"installing SIGHUP handler for plugin rescans","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697237,"msg":"listening","module":"main","server":{"address":null,"port":2609},"v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697237,"msg":"http servers started","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":40,"time":1493138697238,"msg":"no https servers configured, skipping","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":40,"time":1493138697238,"msg":"reverse connector not enabled, skipping","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697272,"msg":"initialized, no check id supplied","module":"nad-statsd","submodule":"circonus","submodule":"trap","type":"group","enabled":false,"v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697272,"msg":"statsd listener loaded","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697272,"msg":"initialized","module":"nad-statsd","submodule":"circonus","submodule":"trap","type":"host","enabled":true,"v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697272,"msg":"dropping privileges","module":"main","gid":"nobody","uid":"nobody","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":40,"time":1493138697272,"msg":"not running as root, skipping drop privileges","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697273,"msg":"started","module":"nad-statsd","submodule":"circonus","enabled":true,"v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697276,"msg":"listener up","module":"nad-statsd","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138697276,"msg":"NAD bootstrap complete","module":"main","v":1}
{"pid":3171,"hostname":"centos7","name":"nad","level":30,"time":1493138723829,"msg":"responding with metrics","module":"plugins","est_metrics":17,"v":1}
```

Term 2:
```sh
$ vagrant ssh c7 -c 'curl 127.0.0.1:2609'
{"nad":{"memory":{"rss":26202112,"heapTotal":13668352,"heapUsed":8703872,"external":138886},"uptime":26.771,"cpu":{"user":258921,"system":26636}},"statsd":{"open_req_count":{"_type":"n","_value":[0,0]},"open_handle_count":{"_type":"n","_value":[5,5]},"uptime_seconds":{"_type":"n","_value":[10.221,20.169]},"bad_lines_seen":{"_type":"n","_value":[0,0]},"last_packet_seen":{"_type":"n","_value":[1493138697.218,1493138697.218]},"metrics_received":{"_type":"n","_value":[0,0]},"packets_received":{"_type":"n","_value":[0,0]},"host_last_flush":{"_type":"n","_value":[0,1493138707]},"host_last_exception":{"_type":"n","_value":[0,0]},"host_flush_time_ms":{"_type":"n","_value":[0,19]},"host_flush_length_bytes":{"_type":"n","_value":[0,606]},"calculation_time_ms":{"_type":"n","_value":[1.315842,0.796727]},"host_num_stats":{"_type":"n","_value":[13,14]},"timestamp_lag_ms":{"_type":"n","_value":[-52]}}}Connection to 127.0.0.1 closed.
$
```

## Building a custom omnibus package

The `packaging/make-omnibus` shell script is used to build the omnibus packages (.rpm, .deb, or .tar.gz). The build can be customized by copying `example-omnibus.conf` to `omnibus.conf` and setting the applicable variables. `make-omnibus` will clone its own copy of the repository so, ensure any changes are committed and pushed to the fork represented in `NAD_REPO`.

1. Clone fork
1. Copy `packaging/example-omnibus.conf` to `packaging/omnibus.conf` and customize
    1. Ensure `NAD_REPO` is set to the fork's clone URL in `packaging/omnibus.conf`
    1. *If working on a custom feature branch*, ensure `NAD_BRANCH` is set to the correct branch in `packaging/omnibus.conf`
1. `vagrant up <target_os>`
1. `vagrant ssh <target_os>`
1. `cd /vagrant/packaging && ./make-omnibus`
1. The result should be an installable omnibus package in `PUBLISHDIR` (as set in `omnibus.conf`)

## Testing

* Live testing can be performed by developing on host and running `make install` or `make install-(rhel|ubuntu|illumos|etc.)` in the guest VM.
* Run NAD in the foreground with debugging. `/opt/circonus/nad/sbin/nad --debug`
* Leverage `curl` to simulate requests. `curl 'http://127.0.0.1:2609/'`
* If working on an executable plugin, ensure the plugin works from the command line first, then integrate the plugin with NAD.

# Plugins

NAD uses a *plugin* system for gathering metrics. NAD supports two primary types of plugins - **executable** and **native**. Each type of plugin produces output that NAD consumes and makes available to Circonus. Minimal examples of both, native and executable plugins can be found in the [`plugins/example`](https://github.com/circonus-labs/nad/tree/master/plugins/example) directory.

NAD/Circonus support the following *types* of metrics:

## Metric types

* `i` - a signed 32bit integer value
* `I` - an unsigned 32bit integer value
* `l` - a signed 64bit integer value
* `L` - an unsigned 64bit integer value
* `n` - a value to be represented as a double
* `s` - the the value is a string


## Executable plugins

An executable can be a shell script, perl/python/ruby/etc. script, a compiled binary, etc. Anything that one can *run* from the command line. See the [plugins](plugins/) directory for examples of several types of executable plugins. Executables must produce metrics to standard output. They may produce JSON or tab-delimited output.  


### Tab-delimited output format

* `<metric_name>\t<metric_type>` - the specified metric has a null value.
* `<metric_name>\t<metric_type>\t<value>` - the specified metric has a value.

### JSON output format

```json
{ "<metric_name>": { "_type": "<metric_type>", "_value": <value> } }
```

The JSON form allows for histogram input in the following format:

- List of values `[<val1>, <val2>, ... ]`
- Pre-bucketed histograms `["H[12]=3", "H[3.1]=4"]`

Example:

```json
{ "my_metric": { "_type": "i", "_value": 10 }, "cherry`pi": { "_type": "n", "_value": 3.14 } }
```

### Control Information

An executable plugin may provide control information in a line starting with a `#` character followed by a JSON block. Currently, `timeout` is the only parameter accepted and the argument is interpreted as seconds. For example, to indicate that the script should be aborted if a set of output metrics cannot be completed in 1.12 seconds, the plugin would emit:

`# { "timeout": 1.12 }`

### Continuous Output

Continuous output is supported for long-running executables. After a set of metrics is emitted to standard output, emit a single empty line. NAD will accept the previous output into a result set and return them on the next request for metrics. The executable can then pause for some ad-hoc amount of time and produce more output followed by another empty line. This mode can be useful for collection of information from tools such as `mpstat` or `vmstat`.

> Note: in most cases if you can get raw accumulated counters (instead of averages over some amount of time), that the output can be more useful to monitoring applications as a derivative can be applied after the fact without the risk of data loss.

## Native plugins

 A native plugin is a NodeJS module which will be loaded into NAD. See [native example](examples/plugins/native), additionally, there are several native plugins in the [plugins](plugins/) directory.

 1. Written as a module
 1. Expose a `run()` method which will be passed five arguments.
     1. The plugin definition object
     1. A callback function
     1. The incoming request object that fired the plugin
     1. The plugin arguments (as an object), if there are any
     1. The plugin instance ID
 1. The `run()` method is responsible for calling the callback with three arguments
     1. The plugin definition object (which was passed to the `run()` method)
     1. The metrics (as an object)
     1. The instance ID (which was passed to the `run()` method)
 1. Additionally, the `run()` method should set its plugin definition object property `running` to false when done. (`def.running = false;`)

### Metrics from native plugin

```js
{
    <metric_name>: {
        _type: "<metric_type>",
        _value: <metric_value>
    }
}
```

Example:

```js
{
    my_metric: {
        _type: "i",
        _value: 10
    }
}
```

## Creating a new plugin

1. Create a directory for the plugin - `mkdir /opt/circonus/nad/etc/node-agent.d/my_plugin && cd /opt/circonus/nad/etc/node-agent.d/my_plugin`
1. Write the plugin - running from command line during development
1. When ready to test the plugin - create symlink in parent directory `ln -s my_plugin.sh ..`
