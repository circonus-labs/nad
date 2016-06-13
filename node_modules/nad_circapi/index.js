var api             = require('circonusapi2'),
    fs              = require('fs'),
    lookup_hostname = require('nad_os_util').lookup_hostname,
    target          = null,
    hostname        = null,
    brokerid        = null,
    configfile      = null,
    config          = null;

var required_graph_data_fields = [
    { "name": "stack",          "default": null },
    { "name": "hidden",         "default": false },
    { "name": "name",           "default": null },
    { "name": "axis",           "default": "l" },
    { "name": "color",          "default": null },
    { "name": "alpha",          "default": 0 },
    { "name": "derive",         "default": "gauge" },
    { "name": "legend_formula", "default": null },
    { "name": "data_formula",   "default": null }
];

var required_composite_data_fields = [
    { "name": "stack",          "default": null },
    { "name": "hidden",         "default": false },
    { "name": "name",           "default": null },
    { "name": "axis",           "default": "l" },
    { "name": "color",          "default": null },
    { "name": "legend_formula", "default": null },
    { "name": "data_formula",   "default": null }
]

exports.configure = function (tok, targ, host, brok, conf, options) {
    target      = targ;
    hostname    = host;
    brokerid    = brok;
    configfile  = conf;

    api.setup(tok, 'nad', options);

    if ( hostname === null ) {
        lookup_hostname( function (h) {
            hostname = h;
            main();
        });
    }
    else {
        main();
    }
};

function main() {
    get_config_sync();
    configure_checks();
}

function get_config_sync() {
    try {
        config = fs.readFileSync(configfile).toString();
        config = JSON.parse(config);
    }
    catch (err) {
        console.error("Could not read config ["+configfile+"] " + err);
        process.exit(1);
    }
}

function configure_checks() {
    if (config.checks) {
        for (var check in config.checks) {
            configure_check(config.checks[check]);
        }
    }

    if (config.check) {
        // If someone specifies a single check, it should override the checks in
        // the array.
        configure_check(config.check);
    }
}

function configure_check(chk_config) {
    var metrics     = [];

    for ( var idx in chk_config.metrics.numeric ) {
        metrics.push({"name": chk_config.metrics.numeric[idx], "type": "numeric"});
    }
    for ( var idx in chk_config.metrics.text ) {
        metrics.push({"name": chk_config.metrics.text[idx], "type": "text"});
    }

    // We pulled the base config out of the configfile, now add anything
    // that we know we need to set.
    chk_config.target       = target;
    chk_config.brokers      = [ brokerid ];
    chk_config.metrics      = metrics;
    chk_config.config.url   = "http://"+target+"/";

    if ( ! chk_config.display_name ) chk_config.display_name = hostname + " nad";
    if ( ! chk_config.type )    chk_config.type = "json";
    if ( ! chk_config.period )  chk_config.period = 60;
    if ( ! chk_config.timeout ) chk_config.timeout = 10;

    // Create the check via the Circonus API
    api.post(
        "/check_bundle",
        chk_config,
        function(code, error, body) {
            if ( code === 401 ) {
                console.error("The node agent is not permitted to talk to the API with this auth token, please log in to Circonus and approve nad as an app");
                process.exit(1);
            }
            else if ( code !== 200 ) {
                console.error("Error from Circonus API: " + error);
                process.exit(1);
            }
            else {
                var lookup = {};
                // We are going to compare the metrics we got back from the
                // API with what we wanted.  The API check_bundle endpoint
                // does some deduplication on check creation and we might
                // have been handed back an already created check which is
                // just missing some additional metrics we want.
                for ( var idx in body.metrics ) {
                    if ( ! lookup[body.metrics[idx].type] ) {
                        lookup[body.metrics[idx].type] = {};
                    }
                    lookup[body.metrics[idx].type][body.metrics[idx].name] = 1;
                }

                var needs_update = 0;
                for ( var idx in metrics ) {
                    if ( ! lookup[metrics[idx].type] || ! lookup[metrics[idx].type][metrics[idx].name] ) {
                        body.metrics.push(metrics[idx]);
                        needs_update = 1;
                    }
                }

                // If we were missing any metrics in the return, we will need
                // to update our existing check.  The missing metrics were
                // added to the body, so PUT that back at the API using the
                // object's _cid as the endpoint
                if ( needs_update ) {
                    api.put(
                        body._cid,
                        body,
                        function(code, error, body) {
                            if ( code !== 200 ) {
                                console.error("Error from Circonus API: " + error);
                                process.exit(1);
                            }
                            configure_graphs(body._checks[0].split("/")[2]);
                        }
                    );
                }
                else {
                    configure_graphs(body._checks[0].split("/")[2]);
                }
            }
        }
    );
}

function configure_graphs(check_id) {
    for ( var name in config.graphs ) {
        var graph = config.graphs[name];
        graph.title = hostname + " " + name;

        for ( var idx in graph.datapoints ) {
            if ( ! graph.datapoints[idx].check_id ) {
                graph.datapoints[idx].check_id = check_id;
            }

            for ( var iidx in required_graph_data_fields ) {
                if ( ! graph.datapoints[idx].hasOwnProperty(required_graph_data_fields[iidx].name) ) {
                    graph.datapoints[idx][required_graph_data_fields[iidx].name] = required_graph_data_fields[iidx].default;
                }
            }
        }

        if ( graph.composites ) {
            for ( var idx in graph.composites ) {
                for ( var iidx in required_composite_data_fields ) {
                    if ( ! graph.composites[idx].hasOwnProperty(required_composite_data_fields[iidx].name) ) {
                        graph.composites[idx][required_composite_data_fields[iidx].name] = required_composite_data_fields[iidx].default;
                    }
                }
            }
        }

        post_graph(graph);
    }
}

function post_graph(graph) {
    api.post(
        "/graph",
        graph,
        function(code, error, body) {
            if ( code !== 200 ) {
                console.error("Could not create graph " + graph.title, error);
            }
        }
    );
}

