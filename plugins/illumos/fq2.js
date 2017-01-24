/* eslint-env node, es6 */

'use strict';

/*
This plugin requires node v4.4+ (if the version of node installed is v0.10, use the io.js plugin).

To use this module the user NAD runs as needs privileges to run DTrace.

By default NAD runs as the unprivileged user 'nobody'. The 'nobody' user, by default,
cannot run dtrace. What additional privileges are required can be displayed by running
'ppriv -eD /opt/circonus/etc/node\-agent.d/illumos/fq.dtrace' as user nobody. The final
attempt will simply yield an error 'dtrace: failed to initialize dtrace: DTrace
requires additional privileges' which indicates the 'dtrace_kernel' privilege
is required, 'kernel' because this plugin tracks system-wide fq events.

Adding a line such as the following to /etc/user_attr will add the two privileges
required (dtrace_kernel and file_dac_read) in a default OmniOS install. Different
OSes and/or local security modfications may require different privileges:

nobody::::type=normal;defaultpriv=basic,dtrace_kernel,file_dac_read

Note: if there is already a line for nobody, modify it by adding the additional privileges.

### enabling the plugin ###

1. Disable NAD:

svcadm disable nad

2. Enable the plugin:

cd /opt/circonus/etc/node-agent.d
ln -s illumous/fq2.js fq.js

3. Add additional privileges for nobody if not already done. (see above)

4. Enable NAD:

svcadm enable nad


### disabling the plugin ###

1. Disable NAD:

svcadm disable nad

2. Remove the symlink for the plugin:

cd /opt/circonus/etc/node-agent.d
rm fq.js

3. Remove the additional privileges for nobody that were added to /etc/user_attr.
   If a line was added, remove it. If an existing line was modified, remove the modifications.

4. Enable NAD:

svcadm enable nad

*/

const path = require('path');
const Dtrace = require('dtrace_aggr2');

const DEFAULT_SAMPLES = 60;
const MILLISECOND = 1000;

let singleton = null;

module.exports = class FQ {
    constructor() {
        if (singleton !== null) {
            return singleton;
        }

        this.dtrace = new Dtrace(path.resolve(path.join(__dirname, 'fq.dtrace')));
        this.dtrace.start();

        singleton = this; // eslint-disable-line consistent-this

        return singleton;
    }

    run(details, cb, req, args, instance) { // eslint-disable-line max-params
        let samples = DEFAULT_SAMPLES;

        if (req && {}.hasOwnProperty.call(req, 'headers') && {}.hasOwnProperty.call(req.headers, 'x-reconnoiter-period')) {
            samples = Math.floor(req.headers['x-reconnoiter-period'] / MILLISECOND);
        }

        const metrics = this.dtrace.flush(samples);

        cb(details, metrics, instance); // eslint-disable-line callback-return
        details.running = false; // eslint-disable-line no-param-reassign

    }
};
