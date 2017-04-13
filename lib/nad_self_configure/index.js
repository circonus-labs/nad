'use strict';

/* eslint-disable guard-for-in */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-process-exit */
/* eslint-disable no-param-reassign */
/* eslint-disable no-negated-condition */

/* eslint max-params: ["error", 5] */

const fs = require('fs');
const path = require('path');
const os = require('os');
const exec = require('child_process').exec;

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const client = require(path.join(nad.lib_dir, 'apiclient'));
const log = settings.logger.child({ module: 'nad_self_configure' });

let target = null;
let hostname = null;
let brokerid = null;
let configfile = null;
let config = null;

const required_graph_data_fields = [
    { name: 'stack', default: null },
    { name: 'hidden', default: false },
    { name: 'name', default: null },
    { name: 'axis', default: 'l' },
    { name: 'color', default: null },
    { name: 'alpha', default: 0 },
    { name: 'derive', default: 'gauge' },
    { name: 'legend_formula', default: null },
    { name: 'data_formula', default: null }
];

const required_composite_data_fields = [
    { name: 'stack', default: null },
    { name: 'hidden', default: false },
    { name: 'name', default: null },
    { name: 'axis', default: 'l' },
    { name: 'color', default: null },
    { name: 'legend_formula', default: null },
    { name: 'data_formula', default: null }
];

//
// is there a reason not to just use os.hostname()?
//
function lookup_hostname(cb) {
    const os_type = os.type();

    function process_hostname(err, stdout) {
        if (err !== null) {
            log.error({ err: err.message }, 'could not lookup hostname');
            process.exit(1);
        }
        cb(stdout.replace(/\n/g, ''));
    }

    if (os_type === 'SunOS') {
        exec('/usr/bin/zonename', process_hostname);
        return;
    }

    if (os_type === 'Linux' || os_type === 'FreeBSD') {
        exec('/bin/hostname', process_hostname);
        return;
    }

    log.fatal("don't know what I am supposed to look up");
    process.exit(1);
}

function post_graph(graph) {
    client.post(
        '/graph',
        graph,
        (err, data, code, raw) => {
            if (code !== 200) {
                console.error(`Could not create graph ${graph.title}`, err, data, code, raw);
            }
        }
    );
}

function configure_graphs(check_id) {
    for (const name in config.graphs) {
        const graph = config.graphs[name];

        graph.title = `${hostname} ${name}`;

        for (const idx in graph.datapoints) {
            if (!graph.datapoints[idx].check_id) {
                graph.datapoints[idx].check_id = check_id;
            }

            for (const iidx in required_graph_data_fields) {
                if (!graph.datapoints[idx].hasOwnProperty(required_graph_data_fields[iidx].name)) {
                    graph.datapoints[idx][required_graph_data_fields[iidx].name] = required_graph_data_fields[iidx].default;
                }
            }
        }

        if (graph.composites) {
            for (const idx in graph.composites) {
                for (const iidx in required_composite_data_fields) {
                    if (!graph.composites[idx].hasOwnProperty(required_composite_data_fields[iidx].name)) {
                        graph.composites[idx][required_composite_data_fields[iidx].name] = required_composite_data_fields[iidx].default;
                    }
                }
            }
        }

        post_graph(graph);
    }
}

function configure_check(chk_config) {
    const metrics = [];

    for (const idx in chk_config.metrics.numeric) {
        metrics.push({ name: chk_config.metrics.numeric[idx], type: 'numeric' });
    }
    for (const idx in chk_config.metrics.text) {
        metrics.push({ name: chk_config.metrics.text[idx], type: 'text' });
    }

    // We pulled the base config out of the configfile, now add anything
    // that we know we need to set.
    chk_config.target = target;
    chk_config.brokers = [ brokerid ];
    chk_config.metrics = metrics;
    chk_config.config.url = `http://${target}/`;

    if (!chk_config.display_name) {
        chk_config.display_name = `${hostname} nad`;
    }
    if (!chk_config.type) {
        chk_config.type = 'json';
    }
    if (!chk_config.period) {
        chk_config.period = 60;
    }
    if (!chk_config.timeout) {
        chk_config.timeout = 10;
    }

    // Create the check via the Circonus API
    client.post(
        '/check_bundle',
        chk_config,
        (err, body, code, raw) => {
            if (code === 401) {
                console.error('The node agent is not permitted to talk to the API with this auth token, please log in to Circonus and approve nad as an app');
                process.exit(1);
            } else if (code !== 200) {
                console.error(`Error from Circonus API:`, err, body, code, raw);
                process.exit(1);
            } else {
                const lookup = {};
                // We are going to compare the metrics we got back from the
                // API with what we wanted.  The API check_bundle endpoint
                // does some deduplication on check creation and we might
                // have been handed back an already created check which is
                // just missing some additional metrics we want.

                for (const idx in body.metrics) {
                    if (!lookup[body.metrics[idx].type]) {
                        lookup[body.metrics[idx].type] = {};
                    }
                    lookup[body.metrics[idx].type][body.metrics[idx].name] = 1;
                }

                let needs_update = 0;

                for (const idx in metrics) {
                    if (!lookup[metrics[idx].type] || !lookup[metrics[idx].type][metrics[idx].name]) {
                        body.metrics.push(metrics[idx]);
                        needs_update = 1;
                    }
                }

                // If we were missing any metrics in the return, we will need
                // to update our existing check.  The missing metrics were
                // added to the body, so PUT that back at the API using the
                // object's _cid as the endpoint
                if (needs_update) {
                    client.put(
                        body._cid,
                        body,
                        (_err, _body, _code, _raw) => {
                            if (code !== 200) {
                                console.error(`Error from Circonus API:`, _err, _body, _code, _raw);
                                process.exit(1);
                            }
                            configure_graphs(_body._checks[0].split('/')[2]);
                        }
                    );
                } else {
                    configure_graphs(body._checks[0].split('/')[2]);
                }
            }
        }
    );
}

function get_config_sync() {
    try {
        config = fs.readFileSync(configfile).toString();
        config = JSON.parse(config);
    } catch (err) {
        console.error(`Could not read config [${configfile}] ${err}`);
        process.exit(1);
    }
}

function configure_checks() {
    if (config.checks) {
        for (const check in config.checks) {
            configure_check(config.checks[check]);
        }
    }

    if (config.check) {
        // If someone specifies a single check, it should override the checks in
        // the array.
        configure_check(config.check);
    }
}

function main() {
    get_config_sync();
    configure_checks();
}

exports.configure = function configure(options, targ, host, brok, conf) {
    target = targ;
    hostname = host;
    brokerid = brok;
    configfile = conf;

    if (hostname === null) {
        lookup_hostname((hn) => {
            hostname = hn;
            main();
        });
    } else {
        main();
    }
};
