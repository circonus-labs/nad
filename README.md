# nad

nad is a portable, extensible, lightweight metric collection
agent. It is the recommended way to collect system metrics
for the [Circonus](Circonus.com) monitoring platform.

nad comes with a [rich set of plugins](https://github.com/circonus-labs/nad/tree/master/plugins) which collect:
- System metrics on Linux, Solaris, FreeBSD and OpenBSD
- Application metrics for [MySQL](https://www.mysql.com), [PostgreSQL](https://www.postgresql.org/), [HAProxy](http://www.haproxy.org), [Cassandra](http://cassandra.apache.org/) and more

Further applications can be easily added using a simple but powerful
plugin system. We welcome further contributions by the
community. Just submit a pull request against this repository.

### Unique Features

- Full support for [histogram metrics](https://www.circonus.com/understanding-data-with-histograms/).

- Support for Circonus real-time (1s) dashboards and graphing.

- Multiple data submission paradigms:

  - pull - nad exposes and JSON/HTTP endpoint (default:http://localhost:2609),
    and Circonus collects metrics from there.

  - [reverse pull](https://www.circonus.com/pully-mcpushface/) - nad
    initiates a TCP connection with Circonus. Circonus uses that
    connection to request data as needed. This allows nad to operate
    behind a NAT.

- nad can automatically configure itself with Circonus via a few command line options.

## Installation

### COSI

The easiest way to install nad is via the Circonus one-step-installer (COSI).
This will allow you to install and configure nad with a shell one-liner.
See <https://github.com/circonus-labs/circonus-one-step-install> for details.

### Packages

For convenience, we provide nad packages for selected platforms under
[omnibus packages](http://updates.circonus.net/node-agent/packages/ "nad omnibus packages").
At the time of this writing, these are:

* Ubuntu: 12.04, 14.04, 16.04
* RedHat: EL5, EL6, EL7

These are self-contained packages that come with a private copy of Node.js
and will automatically install and start the nad service.

### Manual Installation

Node.js v4.0.0 or later must be installed and available as `node` on
the PATH.

You will need a basic development environment (compiler, GNU make,
etc.) in order to build the default plugins.

```
git clone https://github.com/circonus-labs/nad.git
cd nad
sudo make install
```

This will build a default set of plugins and install nad related files
under `/opt/circonus`. You can then execute nad with:

```
NODE_PATH=/opt/circonus/lib/node_modules /opt/circonus/sbin/nad
```

There are daemon install targets for some operating systems, which enable
all the default checks and install init scripts and default configuration
helper files. For more details, see below.

### OS Specific Installation Notes

* On Ubuntu 13.10 and later, the node binary has been renamed, so you
  will also need the `nodejs-legacy` package.  See [these notes](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#ubuntu-mint-elementary-os
"Ubuntu notes").

  Optionally, to build the default plugins and install an init script:
  ```
  make install-ubuntu
  ```

* On RHEL/CentOS, optionally, to build the default plugins and install an
  init script:
  ```
  make install-rhel
  ```

* On illumos (SmartOS, OmniOS, OpenIndiana, etc.), use `gmake` to build:
  ```
  gmake install
  ```
  Optionally, to build the default plugins and create an SMF manifest:
  ```
  gmake install-illumos
  ```

* On FreeBSD use:
  ```
  PREFIX=/usr/local gmake install
  ```
  Optionally, to build the default plugins and install an init script:
  ```
  PREFIX=/usr/local gmake install-freebsd
  ```

  The init script defaults to nad being enabled. If you wish to disable
  nad, add `nad_enable="NO"` to `/etc/rc.conf`. Starting with FreeBSD 9.2,
  you may instead use `sysrc nad_enable=NO` to disable the service.

  Additionally, if you wish to override the default options, you may add
  them to rc.conf as `nad_flags`. Starting with FreeBSD 9.2, you may
  instead use `sysrc nad_flags="<flags>"` to set additional options.

* On OpenBSD use:
  ```
  PREFIX=/usr/local gmake install
  ```
  Optionally, to build the default plugins:
  ```
  PREFIX=/usr/local gmake install-openbsd
  ```

## Plugins

nad will run scripts from the config directory, only from that
directory, and not subdirectories. The best practice is to write your
scripts in subdirectories of the config dir and soft link to them to
enable their execution.

Some scripts distributed with nad need to be compiled (yes, they aren't
actually scripts, they are ELF executables).  Since not all programs
can be compiled on all platforms, you need to go build them as needed.
There are makefiles from which to pick and choose.

If you write a set of scripts/programs, you can describe them in a
`.index.json` file and they will be reported on when you run `nad -i`.

## Operations

First, there are no config files for nad. You just run it and it works.
It has a default directory out of which it executes scripts/executables.
When you install it, all available plugins will be installed in
subdirectories under the "config dir".  To enable a script, simply link
it from the "config dir".

The defaults are as follows:

- config dir: `/opt/circonus/etc/node-agent.d/`, change using `-c` on the command line.
- port: `2609`, this can be changed using `-p` on the command line.

### Running

On Solaris or illumos you can use smf.  First, node needs to be in your path,
so you might need to edit the SMF manifest to alter the PATH. After install:

    # svccfg import /var/svc/manifest/network/circonus/nad.xml

On RHEL/CentOS, assuming you did `make install-rhel`:

    # /sbin/chkconfig nad on && /etc/init.d/nad start

On Ubuntu, assuming you did `make install-ubuntu`:

    # /usr/sbin/update-rc.d nad defaults 98 02 && /etc/init.d/nad start

On FreeBSD, assuming you did `make install-freebsd`:

    # /etc/rc.d/nad start

On OpenBSD, assuming you did `make install-openbsd`, add the following to your `/etc/rc.local`:

    if [ -x /opt/circonus/sbin/nad ]; then
        export NODE_PATH="/opt/circonus/lib/node_modules"
        echo -n ' nad'; /opt/circonus/sbin/nad >/dev/null 2>&1 &
    fi

On other platforms, just run nad in the background. There is one required
environment variable:

   `# export NODE_PATH="/opt/circonus/lib/node_modules"`

### Setup

If you used one of the `install-<os>` options above, the default set of
plugins is already enabled.  You may enable additional plugins and/or
create your own custom plugins.  See the man page for details on creating
and activating plugins.

After which, you should be able to:

    # curl http://localhost:2609/

and see all the beautiful metrics.

You can run a single plugin by name, like so:

    # curl http://localhost:2609/run/name

where "name" is the plugin name, minus any file extension.

#### Why did we "make" in the config directory?

You'll notice that some plugins require compilation, and you may ask "Why?"
For example, on illumos, aggcpu.elf is a compiled binary
(because calculating aggregate CPU info is expensive using "the UNIX way").
The install will compile and link any plugins that need compiling and linking.

#### What about SSL?


nad supports SSL. Refer to the man page for more information.

## Automatic Configuration with Circonus

nad can automatically configure itself with Circonus via a few command
line options.  When running in configuration mode, nad will create a check
and graphs with Circonus, and then exit. It will not attempt to bind to any port,
so is safe to use while running normally.

 * `--authtoken <UUID>`  This is the Circonus API auth token to use when talking with the API. This "activates" the configuration mode.

 * `--target <string>` This should be either the IP or hostname that the Circonus broker can talk to                   this host at.  Required.

 * `--hostname <string>` This is the hostname to use in the check and graph names. If not passed, nad will attempt to look it up via commands like /usr/bin/zonename

 * `--brokerid <integer>` The ID from Circonus for the broker on which you wish to configure the check.  Required.

 * `--configfile <string>` The path to the config file to use that defines the metrics and graphs to create in Circonus.  Look at config/illumos.json for an example.  Required.

 * `--debugdir <string>` Creates debug files for each script and write them to this directory. Optional.

 * `--wipedebugdir` Wipes debug files clean before each write. Optional.

By default, nad talks to the main Circonus installation.  You can also
configure nad to talk to a Circonus Inside install with the following
config options:

 * `--apihost <string>` An alternative host to 'api.circonus.com'

 * `--apiport <integer> An alternative port to `443`

 * `--apiprotocol <stirng>` An alternative protocol to 'https' (i.e. 'http')

 * `--apipath <string>` An alternative base path for the API server

### Config file

The `--configfile` parameter defines which config file to use when setting up
checks and graphs in Circonus.  There are two keys the nad looks for.

The check key contains the definition that will be passed to the check bundle
endpoint in the Cirocnus API.  You can set values like the period and timeout
here, as well as config options (in the config key).  The metrics key defines
which metrics we will collect and has 2 subkeys, numeric and text, which are
simply lists of metric names.  When nad attempts to create the check, if it
gets back a pre-existing check, then nad will update the check, adding the new
metric names.

The graphs key defines a collection of graphs to create.  Each subkey is the
name of the graph that will be created in Circonus, with the hostname
prepended to it.  Under the names, the structure is identical to the
documentation for the Circonus graph API. Any values added will be passed to
the API as is.

## Man

Further documentation can be found in the nad manpage: `man nad`.

If nad is not installed, you can render the manpage locally with:
```
groff -mmandoc -Tascii nad.8 | less
```

A copy is also available on the [wiki](https://github.com/circonus-labs/nad/wiki/manpage).

