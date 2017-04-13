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

