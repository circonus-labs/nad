# nad(8) -- Node Agent Daemon

## SYNOPSIS

`nad [options]`

## DESCRIPTION

The node agent daemon (NAD) provides a simple mechanism to expose systems and application metrics to external onlookers. It inventories all executable programs/scripts in the *plugin directory* and executes them upon external request (via http or https) and returns the results in JSON format.

Full documentation is available online in the NAD github repository - https://github.com/circonus-labs/nad.

## OPTIONS

```
  -h, --help                      output usage information
  -V, --version                   output the version number
  --plugin-dir <path>             Plugin directory [/opt/circonus/etc/node-agent.d]
  -p, --listen <ip|port|ip:port>  Listening IP address and port [2609]
  -r, --reverse                   Use reverse connection to broker [false]
  --cid <cid>                     Check bundle id for reverse connection []
  --broker-ca <file>              CA file for broker reverse connection and statsd []
  --api-key <key>                 Circonus API Token key []
  --api-app <app>                 Circonus API Token app [nad]
  --api-url <url>                 Circonus API URL [https://api.circonus.com/v2/]
  --api-ca <file>                 CA file for API URL []
  --hostname <host>               Hostname self-configure to use in check and graph names [centos7]
  --brokerid <id>                 Broker ID for self-configure to use for creating check []
  --configfile <file>             File in plugin-dir for self-configure []
  --target <target>               Target host [centos7] -- see Target below
  --ssl-listen <ip|port|ip:port>  SSL listening IP address and port []
  --ssl-cert <file>               SSL certificate PEM file, required for SSL [<plugin_dir>/na.crt]
  --ssl-key <file>                SSL certificate key PEM file, required for SSL [<plugin_dir>/na.key]
  --ssl-ca <file>                 SSL CA certificate PEM file, required for SSL w/verify [<plugin_dir>/na.ca]
  --ssl-verify                    Enable SSL verification
  --no-statsd                     Disable builtin StatsD interface
  --statsd-config <file>          Config file for builtin StatsD interface []
  -u, --uid <id>                  User id to drop privileges to on start []
  --log-level <level>             Log level (trace|debug|info|warn|error|fatal) [info]
  -d, --debug                     Enable debug logging (verbose) [false]
  -t, --trace                     Enable trace logging (very verbose) [false]
  --no-watch                      Disable automatic watches of plugin directory, script files, config files. Send SIGHUP to rescan plugins. [true]
  --debugdir                      Create debug files for each plugin and write to this directory []
  --wipedebugdir                  Wipe debug directory clean before each write [false]
  -i, --inventory                 Offline inventory
  -c <path>                       DEPRECATED use --plugin-dir
  -p <spec>                       DEPRECATED use --listen
  -s <spec>                       DEPRECATED use --ssl-listen
  -v                              DEPRECATED use --ssl-verify
  --authtoken <token>             DEPRECATED use --api-key
  --apihost <host>                DEPRECATED use --api-url
  --apiport <port>                DEPRECATED --api-url
  --apipath <path>                DEPRECATED --api-url
  --apiprotocol <proto>           DEPRECATED --api-url
  --apiverbose                    DEPRECATED NOP, see --debug
  --sslcert <file>                DEPRECATED use --ssl-cert
  --sslkey <file>                 DEPRECATED use --ssl-key
  --sslca <file>                  DEPRECATED use --ssl-ca
  --cafile <file>                 DEPRECATED use --broker-ca
```

## BUGS

https://github.com/circonus-labs/nad/issues

## AUTHOR
Circonus, Inc. <support@circonus.com>

## COPYRIGHT
Copyright &copy; 2017, Circonus, Inc.
