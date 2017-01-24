/* eslint-env node, es6 */
/* eslint-disable no-magic-numbers */

'use strict';

/*
This plugin requires node v4.4+ (if the version of node installed is v0.10, use the io.js plugin).

To use this module the user NAD runs as needs privileges to run DTrace.

By default NAD runs as the unprivileged user 'nobody'. The 'nobody' user, by default,
cannot run dtrace.

Adding a line such as the following to /etc/user_attr will add the two privileges
required (dtrace_kernel and file_dac_read) in a default OmniOS install. Different
OSes and/or local security modfications may require different privileges:

nobody::::type=normal;defaultpriv=basic,dtrace_kernel,file_dac_read

Note: if there is already a line for nobody, modify it by adding the additional privileges.


### Configuration ###

To track the syscalls for a specific process. Create a configuration file
/opt/circonus/etc/syscall2.json, for example:
{
  "execname": "node"
}

Will collect syscall metrics only for process(es) where the execname is 'node'.

### enabling the plugin ###

1. Disable NAD:

svcadm disable nad

2. Enable the plugin:

cd /opt/circonus/etc/node-agent.d
ln -s illumous/syscall2.js syscall.js

3. Add additional privileges for nobody if not already done. (see above)

4. Enable NAD:

svcadm enable nad


### disabling the plugin ###

1. Disable NAD:

svcadm disable nad

2. Remove the symlink for the plugin:

cd /opt/circonus/etc/node-agent.d
rm syscall.js

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

module.exports = class Syscall {
    constructor() {
        if (singleton !== null) {
            return singleton;
        }

        const cfgName = `${path.basename(__filename, '.js')}.json`; // e.g. syscall2.json
        const cfgFile = path.resolve(path.join(__dirname, '..', '..', cfgName));

        let execName = null;

        try {
            const cfg = require(cfgFile); // eslint-disable-line global-require

            if ({}.hasOwnProperty.call(cfg, 'execname')) {
                execName = cfg.execname;
            }
        } catch (err) {
            console.error(err);
        }

        let script = '';

        if (execName === null) {
            script = 'syscall:::entry{self->start=timestamp;}syscall:::return/self->start/{@l[strjoin(probefunc,"`latency_us")] = llquantize((timestamp-self->start)/1000, 10, 0, 6, 100); self->start = 0;}'; // eslint-disable-line max-len
        } else {
            script = `syscall:::entry/execname=="${execName}"/{self->start=timestamp;}syscall:::return/self->start/{@l[strjoin(strjoin(execname,"\`"),strjoin(probefunc,"\`latency_us"))] = llquantize((timestamp-self->start)/1000, 10, 0, 6, 100); self->start = 0;}`; // eslint-disable-line max-len
        }

        script += 'tick-1sec{printf(">START\\n");printa("=%s%@d\\n", @l);printf(">END\\n");trunc(@l);}';

        this.dtrace = new Dtrace(script);
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
