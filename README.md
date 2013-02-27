For running nad, man nad.

These are the poor man's docs.

Description
===

nad will run scripts from the config directory; only from that
and not subdirectories.  The best practice it to write your scripts
in subdirectories of the config dir and soft link to them to enable
their execution.

Some scripts distributed with nad need to be compiled (yes, they aren't
actually scripts, they are elf executables).  Since not all programs
can be compiled on all platforms, you need to go build them as needed.
There are makefiles, pick and choose.

If you write a set of scripts/programs, you can describe them in a
.index.json file and they will be reported on when you run nad -i.

Installation
===

If your operating system vendor doesn't package it for you, just check
it out and run make install.

Operations
===

First, there are no config files for nad. You just run it and it works.
It has a default directory out of which it executes scripts/executables.
When you install it, all available plugins will be installed in
subdirectories under the "config dir".  To enable a script, simply link
it from the top-level directory.

By default, the config dir is /opt/circonus/etc/node-agent.d/, you can change
this using -c on the command line.  The default port is 2609, this can be
changed using -p.

Running
---

On Solaris/Illumos you can use smf.  First, node needs to be in your path,
so you might need to edit the SMF manifest to alter the PATH. After install:

    # svccfg import smf/nad.xml

On other platforms, just run nad in the background.

Setup
---

So, if you are on a Joyent SmartOS box and you want to monitor vm, cpu,
and zfs stuff, you would do the following as root:

    # cd /opt/circonus/etc/node-agent.d
    # (cd illumos && test -f Makefile && make)
    # ln -s illumos/aggcpu.elf
    # ln -s illumos/zfsinfo.sh
    # ln -s illumos/vminfo.sh

After which, you should be able to:

    # curl http://localhost:2609/

and see all the beautiful metrics.

Why did we "make" in the config directory?
---

You'll notice above we actually did a "make" before we linked thing up.
Why? For illumos, aggcpu.elf is a compiled binary (as calculating
aggregate CPU info is expensive using "the UNIX way"). The make will
compile an d link any plugins that need compiling and linking.  We
don't build this on install because we're lazy and think it is a tad
easier to only build what you need as you need it; it is very rare that
you can't write your metrics check in shell or some other scripting
language.

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

Config file
---

The --configfile parameter defines which config file to use when setting up checks and graphs in Circonus.  There are 2 keys the nad looks for.

The metrics key defines which metrics we will collect and has 2 subkeys, numeric and text which are simply lists of metric names.  When nad attempts to create the check, if it gets back a pre-existing check, nad will update the check, adding the new metric names.

The graphs key defined a collection of graphs to create.  Each subkey is the name of the graph that will be created in Circonus, with the hostname prepended to it.  Under the names, the structure is identical to the documentation for the Circonus graph API, any values added will be passed to the API as is.
