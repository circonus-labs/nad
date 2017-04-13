// Circonus StatsD backend trap
'use strict';

/* eslint-disable global-require */
/* eslint-disable no-process-exit */

const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');

const ProxyAgent = require('https-proxy-agent');

const nad = require('nad');
const client = require(path.join(nad.lib_dir, 'apiclient'));
const settings = require(path.join(nad.lib_dir, 'settings'));
const broker = require(path.join(nad.lib_dir, 'broker'));

const validBundleCID = /^\/check_bundle\/[0-9]+$/;


// fetchCheckBundle calls Circonus API to retrieve check bundle identified by cid parameter.
function fetchCheckBundle(cid) {
    if (typeof cid !== 'string' || !validBundleCID.test(cid)) {
        throw new Error(`Invalid check bundle cid ${cid}`);
    }

    return new Promise((resolve, reject) => {
        const errPrefix = `Error fetching check bundle (${cid}):`;

        client.get(cid).
            then((parsed_body, code, raw_body) => {
                if (code === null) {
                    reject(new Error(`${errPrefix} unknown, no details`));
                    return;
                }

                if (code < 200 || code >= 300) {
                    reject(new Error(`${errPrefix} API returned code ${code}, ${raw_body}`));
                    return;
                }

                resolve(parsed_body);
            }).
            catch((err, parsed_body, code, raw_body) => { // eslint-disable-line no-unused-vars
                reject(err);
            });
    });
}


// fetchBroker calls Circonus API to retrieve a broker object identified by cid
function fetchBroker(cid) {
    if (typeof cid !== 'string' || !(/^\/broker\/[0-9]+$/).test(cid)) {
        throw new Error(`Invalid broker cid ${cid}`);
    }

    return new Promise((resolve, reject) => {
        const errPrefix = `Error fetching broker (${cid}):`;

        client.get(cid, null, (err, body, code) => {
            if (err !== null) {
                reject(new Error(`${errPrefix} ${err}`));
                return;
            }

            if (code === null) {
                reject(new Error(`${errPrefix} unknown, no details`));
                return;
            }

            if (code < 200 || code >= 300) {
                reject(new Error(`${errPrefix} API returned code ${code}, ${body}`));
                return;
            }

            resolve(body);
        });
    });
}

// updateCheckBundle updates the check bundle associated with this trap instance
function updateCheckBundle(bundle) {
    const cid = bundle._cid;

    if (typeof cid !== 'string' || !validBundleCID.test(cid)) {
        throw new Error(`Invalid check bundle cid ${cid}`);
    }

    return new Promise((resolve, reject) => {
        const errPrefix = `Error updating check bundle (${cid}):`;

        client.put(cid, bundle, (err, body, code) => {
            if (err !== null) {
                reject(new Error(`${errPrefix} ${err}`));
                return;
            }

            if (code === null) {
                reject(new Error(`${errPrefix} unknown, no details`));
                return;
            }

            if (code < 200 || code >= 300) {
                reject(new Error(`${errPrefix} API returned code ${code}, ${body}`));
                return;
            }

            resolve(body);
        });
    });
}


// getProxySettings checks environment for http[s] proxy settings
// returns proxy url if found, otherwise null.
function getProxySettings(urlProtocol) {
    let proxyServer = null;

    /* eslint-disable no-process-env */
    if (urlProtocol === 'http:') {
        if (process.env.http_proxy) {
            proxyServer = process.env.http_proxy;
        } else if (process.env.HTTP_PROXY) {
            proxyServer = process.env.HTTP_PROXY;
        }
    } else if (urlProtocol === 'https:') {
        if (process.env.https_proxy) {
            proxyServer = process.env.https_proxy;
        } else if (process.env.HTTPS_PROXY) {
            proxyServer = process.env.HTTPS_PROXY;
        }
    }
    /* eslint-enable no-process-env */

    if (proxyServer !== null && proxyServer !== '') {
        if (!(/^http[s]?:\/\//).test(proxyServer)) {
            proxyServer = `http://${proxyServer}`;
        }
    }

    return proxyServer;
}


// inventoryMetrics returns an object with metric names as keys and values of true|false
// indicating if the metric is currently active or disabled.
function inventoryMetrics(metrics) {
    const inventory = {};

    for (const metric of metrics) {
        inventory[metric.name] = (/^active$/i).test(metric.status);
    }

    return inventory;
}


module.exports = class Trap {

    constructor(check_type) {
        this.enabled = false;
        this.check = null;
        this.check_type = check_type;
        this.check_id = null;
        this.check_cid = null;
        this.submission_url = null;
        this.manage_check_metrics = settings.statsd.manageCheckMetrics;
        this.force_metric_activation = settings.statsd.forceMetricActivation;
        this.log = settings.statsd.logger.child({ submodule: 'circonus' }).child({ submodule: 'trap', type: this.check_type });
        this.brokerCACert = null;
        this.brokerCID = null;
        this.brokerCN = null;
        this.check = null;
        this.checkSecret = null;
        this.metrics = {};

        if (this.check_type === 'group') {
            this.check_id = settings.statsd.group_check_id;
        } else if (this.check_type === 'host') {
            this.check_id = settings.statsd.host_check_id;
            this.submission_url = settings.statsd.push_receiver_url;
        } else {
            throw new Error(`invalid check type id '${check_type}' passed to Trap constructor`);
        }

        if (this.check_id) {
            this.check_cid = `/check_bundle/${this.check_id}`;
        }

        return this;
    }

    // initialize returns promise which will setup the object to be used for submissions
    initialize() {
        const self = this;

        this.log.debug('initializing trap');

        return new Promise((resolve) => {
            if (self.check_type !== 'host' && self.check_id === null) {
                self.log.info({ enabled: self.enabled }, 'initialized, no check id supplied');
                resolve(self.enabled);
                return;
            }

            if (!self.manage_check_metrics && self.submission_url !== null) {
                self.enabled = true;
                self.log.info({ enabled: self.enabled }, 'initialized');
                resolve(self.enabled);
                return;
            }

            broker.loadCA().
                then((cert) => {
                    self.brokerCACert = cert;
                    return self._loadCheck();
                }).
                then(() => {
                    return self._loadBrokerCN();
                }).
                then(() => {
                    self.enabled = true;
                    self.log.info({ enabled: self.enabled }, 'initialized');
                    resolve(self.enabled);
                }).
                catch((err) => {
                    self.log.error({ err: err.message }, 'trap.initialize');
                    resolve(false);
                });
        });
    }

    // submit sends (PUTs) metrics to the Circonus broker
    submit(metrics) {
        const self = this;
        const timer = process.hrtime();

        return new Promise((resolve, reject) => {
            if (!this.enabled) {
                reject(new Error(`'${this.check_type}' trap is not enabled`));
                return;
            }

            self._enableMetrics(metrics).
                then(() => {
                    return self._sendMetrics(metrics);
                }).
                then((numMetrics) => {
                    if (numMetrics >= 0) {
                        const diff = process.hrtime(timer);

                        self.log.debug({ num_metrics: numMetrics, latency: `${diff[0]}s ${(diff[1] / 1e6).toFixed(2)}ms` }, `sent metrics`);
                    }
                    resolve();
                }).
                catch((err) => {
                    reject(err);
                });
        });
    }

    // _activateMetric determines if a metric should be activated for a specific check.
    _activateMetric(metric) {
        // metric does not exist, activate
        // note: boolean value so, explicitly check *existence* of metric key/property
        if (!{}.hasOwnProperty.call(this.metrics, metric)) {
            return true;
        }

        // metric exists and is not active, return force_metric_activation setting
        if (!this.metrics[metric]) {
            return this.force_metric_activation;
        }

        // metric exists and is active, leave it alone
        return false;
    }


    // _enableMetrics update check with any new metrics and submit to circonus
    // before sending the metrics...
    _enableMetrics(metrics) {
        if (!this.manage_check_metrics) {
            return Promise.resolve();
        }

        const self = this;

        return new Promise((resolve, reject) => {
            let haveNewMetrics = false;

            self.log.trace('checking for new metrics');

            for (const metric in metrics) { // eslint-disable-line guard-for-in
                if (self._activateMetric(metric)) {
                    haveNewMetrics = true;
                    break;
                }
            }

            if (!haveNewMetrics) {
                resolve();
                return;
            }

            self.log.trace('found new metrics');
            self._loadCheck().
                then((bundle) => {
                    const check = JSON.parse(JSON.stringify(bundle));
                    const newMetrics = [];

                    for (const metric in metrics) { // eslint-disable-line guard-for-in
                        if (self._activateMetric(metric)) {
                            const isHistogram = metrics[metric]._type === 'i' && Array.isArray(metrics[metric]._value);

                            newMetrics.push({
                                name: metric,
                                status: 'active',
                                type: isHistogram ? 'histogram' : 'numeric', // eslint-disable-line multiline-ternary
                                units: null,
                                tags: []
                            });
                        }
                    }

                    check.metrics = check.metrics.concat(newMetrics);
                    self.log.trace('activating metrics with API');
                    return updateCheckBundle(check);
                }).
                then((bundle) => {
                    self.log.trace('update metric inventory');
                    self.metrics = inventoryMetrics(bundle.metrics);
                    resolve();
                }).
                catch((err) => {
                    reject(err);
                });
        });
    }


    // _sendMetrics sends metrics to Circonus
    _sendMetrics(metrics) {
        const self = this;
        const errPrefix = 'submitting metrics:';

        return new Promise((resolve, reject) => {

            if (Object.keys(metrics).length === 0) {
                self.log.debug('0 metrics to send, skipping');
                resolve(-1);
                return;
            }

            let metricsToSend = {};

            self.log.trace({ metrics }, 'incoming metrics');

            if (self.manage_check_metrics) {
                // filter any disabled metrics (don't waste bandwidth)
                for (const metric in metrics) { // eslint-disable-line guard-for-in
                    if (self.metrics[metric]) {
                        metricsToSend[metric] = metrics[metric];
                    }
                }
            } else {
                metricsToSend = metrics;
            }

            self.log.trace({ metricsToSend }, 'metrics send');

            let metricJson = null;

            try {
                metricJson = JSON.stringify(metricsToSend);
            } catch (err) {
                reject(new Error(`${errPrefix} ${err}`));
                return;
            }

            const submitOptions = self._getSubmitOptions();

            submitOptions.headers['Content-Length'] = metricJson.length;

            const trap_client = submitOptions.protocol === 'https:' ?
                https :
                http;

            self.log.debug(`sending metrics to ${submitOptions.href}`);

            const req = trap_client.request(submitOptions);
            const timeout_ms = 15 * 1000; // abort requests taking longer
            const timeout = setTimeout(() => {
                self.log.warn('request timeout, calling req abort');
                req.abort();
            }, timeout_ms);

            req.setTimeout(timeout_ms);

            req.on('response', (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    clearTimeout(timeout);
                    if (res.statusCode < 200 || res.statusCode > 299) {
                        reject(new Error(`${errPrefix} ${res.statusCode} (${data}) ${submitOptions.href}`));
                        return;
                    }

                    if (res.headers['content-type'] !== 'application/json') {
                        resolve(Object.keys(metricsToSend).length);
                        return;
                    }

                    let resData = null;

                    try {
                        resData = JSON.parse(data);
                    } catch (err) {
                        reject(new Error(`${errPrefix} ${err}`));
                        return;
                    }

                    resolve(resData.stats);
                });
            });

            req.once('timeout', () => {
                clearTimeout(timeout);
                self.log.warn('request timeout, abort');
                req.abort();
            });

            req.once('error', (err) => {
                clearTimeout(timeout);
                self.log.warn({ err: err.message }, 'sending metrics');
                reject(err);
            });

            self.log.trace({ metrics: metricJson }, 'submitting');
            req.write(metricJson);
            req.end();
        });
    }


    // _getSubmitOptions creates a URL URL object suitable for use with http/https request methods
    // returns url object or null on error, and error or null if no error
    _getSubmitOptions() {
        const options = url.parse(this.submission_url);

        options.method = 'PUT';
        options.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'identity'
        };

        if (this.check_type === 'host') {
            return options;
        }

        const proxyServer = getProxySettings(options.protocol);

        options.agent = false;

        if (proxyServer !== null) {
            options.agent = new ProxyAgent(proxyServer);
            options.timeout = 15 * 1000;
        }

        if (this.brokerCACert !== null) {
            this.log.debug({ sc: this.brokerCACert }, 'using secure context');
            options.secureContext = this.brokerCACert;
        }
        if (this.brokerCN !== null && this.brokerCN !== '') {
            options.servername = this.brokerCN;
        }

        return options;
    }

    // _loadCheck fetches a fresh copy from the Circonus API
    _loadCheck() {
        const self = this;

        return new Promise((resolve, reject) => {
            if (self.check_cid === null) {
                reject(new Error(`no ${self.check_type} check found (no id, no cosi reg)`));
                return;
            }

            self.log.debug({ cid: self.check_cid }, 'fetching up-to-date check definition');
            fetchCheckBundle(self.check_cid).
                then((bundle) => {
                    self.log.debug({ bundle }, 'loaded check definition');
                    self.brokerCID = bundle.brokers[0];
                    self.metrics = inventoryMetrics(bundle.metrics);
                    if (bundle.type === 'httptrap') {
                        self.submission_url = bundle.config.submission_url;
                    } else {
                        const noitURL = bundle._reverse_connection_urls[0].
                                replace('mtev_reverse', 'https').
                                replace('check', 'module/httptrap');

                        self.submission_url = `${noitURL}/${bundle.config['reverse:secret_key']}`;
                    }
                    resolve(bundle);
                }).
                catch((err) => {
                    self.log.error(err);
                    reject(err);
                });

        });
    }


    // _loadBrokerCN determines the broker common name to use when authenicating the broker
    // against the CA cert. (for submission urls with an ip address)
    _loadBrokerCN() { // eslint-disable-line consistent-return
        const self = this;

        return new Promise((resolve, reject) => {
            if (self.brokerCID !== null && self.brokerCN === null) {
                resolve();
                return;
            }

            self.log.trace('setting broker cn');

            // set broker cn to "" if the submission url does not contain an IP
            // e.g. trap.noit.circonus.net - will not throw an IPSANS error
            if (!(/^https?:\/\/\d+(\.\d+){3}:\d+/).test(self.submission_url)) {
                self.brokerCN = '';
                resolve();
                return;
            }

            self.log.trace('fetching broker definition with API');
            self.brokerCN = null;
            fetchBroker(self.brokerCID).
                then((_broker) => {
                    for (const detail of _broker._details) {
                        if (self.submission_url.indexOf(detail.ipaddress) !== -1) {
                            self.log.trace(`setting broker cn to '${detail.cn}'`);
                            self.brokerCN = detail.cn;
                            break;
                        }
                    }

                    if (self.brokerCN === null) {
                        self.log.warn(`submissions *may* not work - no broker IP matched ${self.submission_url}`);
                        self.brokerCN = '';
                    }

                    resolve();
                }).
                catch((err) => {
                    reject(err);
                });
        });
    }
};
