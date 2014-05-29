For running nad, man nad.

These are the poor man's docs.

Description
===

nad will run scripts from the config directory; only from that
and not subdirectories.  The best practice is to write your scripts
in subdirectories of the config dir and soft link to them to enable
their execution.

Some scripts distributed with nad need to be compiled (yes, they aren't
actually scripts, they are ELF executables).  Since not all programs
can be compiled on all platforms, you need to go build them as needed.
There are makefiles, pick and choose.

If you write a set of scripts/programs, you can describe them in a
.index.json file and they will be reported on when you run nad -i.

Installation
===

If your operating system vendor doesn't package it for you, you may be
interested in Circonus-maintained 
[omnibus packages](http://updates.circonus.net/node-agent/packages/ "nad omnibus packages").
These are self-contained packages that come with a private copy of node
and will automatically install and start the service.

Otherwise, check it out and run make install.

There are install targets for some operating systems, which enable
all the default checks and install init scripts and default configuration 
helper files.

System Requirements
---
You will need a basic development environment (compiler, GNU make, etc.)
in order to build the default plugins.

Node.js v0.10 or later is required.

RHEL/CentOS
---
    # make install

Optionally, to build the default plugins and install an init script:

    # make install-rhel

Ubuntu
---
Note: on Ubuntu 13.10 and later, the node binary has been renamed, so you will
also need the `nodejs-legacy` package.
See [these notes](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#ubuntu-mint-elementary-os "Ubuntu notes").

    # make install

Optionally, to build the default plugins and install an init script:

    # make install-ubuntu

illumos (SmartOS, OmniOS, OpenIndiana, etc.)
---
    # gmake install

Optionally, to build the default plugins and create an SMF manifest:

    # gmake install-illumos


Operations
===

First, there are no config files for nad. You just run it and it works.
It has a default directory out of which it executes scripts/executables.
When you install it, all available plugins will be installed in
subdirectories under the "config dir".  To enable a script, simply link
it from the "config dir".

By default, the config dir is /opt/circonus/etc/node-agent.d/, you can change
this using -c on the command line.  The default port is 2609, this can be
changed using -p.

Running
---

On Solaris or illumos you can use smf.  First, node needs to be in your path,
so you might need to edit the SMF manifest to alter the PATH. After install:

    # svccfg import /var/svc/manifest/network/circonus/nad.xml

On RHEL/CentOS, assuming you did `make install-rhel`:

    # /sbin/chkconfig nad on && /etc/init.d/nad start

On Ubuntu, assuming you did `make install-ubuntu`:

    # /usr/sbin/update-rc.d nad defaults 98 02 && /etc/init.d/nad start

On other platforms, just run nad in the background. There is one required
environment variable:

   `# export NODE_PATH="/opt/circonus/lib/node_modules"`

Setup
---
If you used one of the `install-<os>` options above, the default set of
plugins is already enabled.  You may enable additional plugins and/or
create your own custom plugins.  See the man page for details on creating
and activating plugins.

After which, you should be able to:

    # curl http://localhost:2609/

and see all the beautiful metrics.

Why did we "make" in the config directory?
---

You'll notice that some plugins require compilation.  Why?
For example, on illumos, aggcpu.elf is a compiled binary 
(as calculating aggregate CPU info is expensive using "the UNIX way").
The install will compile and link any plugins that need compiling and linking.

What about SSL?
---

nad supports SSL, look at the man page.

Automatic Configuration with Circonus
===

nad can automatically configure itself with Circonus via a few command
line options.  When running in configuration mode, nad will create a check
and graphs with Circonus and then exit, it will not attempt to bind to any port
so is safe to use while running normally.

 * --authtoken <UUID>  The Circonus API auth token to use when talking with the API. This "activates" the configuration mode

 * --target <string> This should be either the IP or hostname that the Circonus broker can talk to                   this host at.  Required

 * --hostname <string> The hostname to use in the check and graph names.  If not passed nad will attempt to look it up via commands like /usr/bin/zonename

 * --brokerid <integer> The ID from Circonus for the broker you wish to configure the check on.  Required

 * --configfile <string> The path to the config file to use that defines the metrics and graphs to create in Circonus.  Look at config/illumos.json for an example.  Required

 * --debugdir <string> Create debug files for each script and write them to this directory. Optional

Config file
---

The --configfile parameter defines which config file to use when setting up
checks and graphs in Circonus.  There are two keys the nad looks for.

The check key contains the definition that will be passed to the check bundle
endpoint in the Cirocnus API.  You can set values like the period and timeout
here, as well as config options (in the config key).  The metrics key defines
which metrics we will collect and has 2 subkeys, numeric and text which are 
simply lists of metric names.  When nad attempts to create the check, if it 
gets back a pre-existing check, nad will update the check, adding the new 
metric names.

The graphs key defines a collection of graphs to create.  Each subkey is the 
name of the graph that will be created in Circonus, with the hostname 
prepended to it.  Under the names, the structure is identical to the 
documentation for the Circonus graph API, any values added will be passed to 
the API as is.
