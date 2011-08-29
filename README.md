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

Operations
===

First, there are no config files for nad. You just run it and it works.
It has a default directory out of which it executes scripts/executables.
When you install it, all available plugins will be installed in
subdirectories under the "config dir".  To enable a script, simply link
it from the top-level directory.

By default, the config dir is /opt/omni/etc/node-agent.d/, you can change
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

    # cd /opt/omni/etc/node-agent.dA
    # (cd smartos && test -f Makefile && make)
    # ln -s smartos/aggcpu.elf
    # ln -s smartos/zfsinfo.sh
    # ln -s smartos/vminfo.sh

After which, you should be able to:

    # curl http://localhost:2609/

and see all the beautiful metrics.

Why did we "make" in the config directory?
---

You'll notice above we actually did a "make" before we linked thing up.
Why? For smartos, aggcpu.elf is a compiled binary (as calculating
aggregate CPU info is expensive using "the UNIX way"). The make will
compile an d link any plugins that need compiling and linking.  We
don't build this on install because we're lazy and think it is a tad
easier to only build what you need as you need it; it is very rare that
you can't write your metrics check in shell or some other scripting
language.

What about SSL?
---

nad supports SSL, look at the man page.
