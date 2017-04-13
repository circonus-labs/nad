//
// NOTE: this is a customized version of circonusapi2 for SPECIFIC use by NAD
//

'use strict';

/* eslint-disable no-process-env */
/* eslint-disable global-require */
/* eslint-disable no-sync */
/* eslint-disable no-param-reassign */

const qs = require('querystring');
const url = require('url');
const zlib = require('zlib');
const path = require('path');

const ProxyAgent = require('https-proxy-agent');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const log = settings.logger.child({ module: 'apiclient' });

let instance = null;

// getProtocolProxyURL extracts proxy setting from environment for a specific protocol
function getProtocolProxyURL(protocol) {
    let proxyServer = null;

    if (protocol === 'http:') {
        if ({}.hasOwnProperty.call(process.env, 'http_proxy')) {
            proxyServer = process.env.http_proxy;
        } else if ({}.hasOwnProperty.call(process.env, 'HTTP_PROXY')) {
            proxyServer = process.env.HTTP_PROXY;
        }
    } else if (protocol === 'https:') {
        if ({}.hasOwnProperty.call(process.env, 'https_proxy')) {
            proxyServer = process.env.https_proxy;
        } else if ({}.hasOwnProperty.call(process.env, 'HTTPS_PROXY')) {
            proxyServer = process.env.HTTPS_PROXY;
        }
    }
    if (proxyServer !== null && proxyServer !== '') {
        if (!(/^http[s]?:\/\//).test(proxyServer)) {
            proxyServer = `http://${proxyServer}`;
        }
        log.debug({ server: proxyServer }, 'using PROXY from environment for Circonus API requests');
    }

    return proxyServer;
}

class APIClient {
    constructor() {
        if (instance !== null) {
            return instance;
        }

        this.api_key = settings.api.key;
        this.api_app = settings.api.app;
        this.api_url = settings.api.url || 'https://api.circonus.com/v2/';

        const url_options = url.parse(this.api_url);

        if (url_options.protocol === 'https:') {
            this.client = require('https');
        } else {
            this.client = require('http');
        }

        this.proxyServer = getProtocolProxyURL(this.client.globalAgent.protocol);

        instance = this; // eslint-disable-line consistent-this
    }

    /*
     * GET:
     *
     *  endpoint: (/check_bundle, /check/1, etc.)
     *  data:     object which will be converted to a query string
     */
    get(endpoint, data) {
        return this.promise_request(this.get_request_options('GET', endpoint, data));
    }

    /*
     * POST:
     *
     *  endpoint: specify an object collection (/check_bundle, /graph, etc.)
     *  data:     object which will be stringified to JSON and written to the server
     */
    post(endpoint, data) {
        return this.promise_request(this.get_request_options('POST', endpoint, data));
    }

    /*
     * PUT:
     *
     *  endpoint: specify an exact object (/check_bundle/1, /template/2, etc.)
     *  data:     object which will be stringified to JSON and written to the server
     */
    put(endpoint, data) {
        return this.promise_request(this.get_request_options('PUT', endpoint, data));
    }

    /*
     * DELETE:
     *
     *  endpoint: specify an exact object (/check_bundle/1, /rule_set/1_foo, etc.)
     */
    delete(endpoint) {
        return this.promise_request(this.get_request_options('DELETE', endpoint));
    }

    // promise_request transforms a verb function (get,put,post,delete) into a promise
    promise_request(options) {
        const self = this;

        return new Promise((resolve, reject) => {
            self.do_request(options, (err, parsed_body, code, raw_body) => {
                if (err !== null) {
                    log.trace({ err, parsed_body, code, raw_body, options }, 'api request error');
                    reject(err, parsed_body, code, raw_body);
                    return;
                }
                log.trace({ err, parsed_body, code, raw_body, options }, 'api request no error');
                resolve(parsed_body, code, raw_body);
            });
        });
    }


    /*
     * This is called from the various exported functions to actually perform
     * the request.  Will retry up to 5 times in the event we get a connection
     * reset error.
     *
     * cb will be called with the following parameters:
     *      error:       any error that occurred or null if no error
     *      parsed body: http response body parsed (decoded json object)
     *      status code: http response status code
     *      raw body:    http response body (raw Buffer)
     */
    do_request(options, cb) {
        const self = this;

        log.debug({ method: options.method }, 'request');

        const req = this.client.request(options, (res) => {
            const data = [];

            res.on('data', (chunk) => {
                data.push(chunk);
            });

            res.on('end', () => {
                // try again... on rate limit or internal (server-side, hopefully recoverable) error
                if (res.statusCode === 429 || res.statusCode === 500) {
                    if (options.circapi.retry < options.circapi.retry_backoff.length) {
                        setTimeout(() => {
                            self.do_request(options, cb);
                        }, options.circapi.retry_backoff[options.circapi.retry]);
                        options.circapi.retry += 1;
                    } else {
                        cb(
                            new Error(`Giving up after ${options.circapi.retry} attempts`),
                            null,
                            res.statusCode,
                            null);
                        return;
                    }
                }

                // success, no content
                if (res.statusCode === 204) {
                    cb(
                        null,
                        null,
                        res.statusCode,
                        null);
                    return;
                }

                const buffer = Buffer.concat(data);
                const encoding = res.headers['content-encoding'];
                let err_msg = null;
                let parsed = null;
                let body = null;

                if (data.length === 0) {
                    err_msg = new Error('No data returned, 0 length body.');
                } else if (encoding === 'gzip') {
                    try {
                        body = zlib.gunzipSync(buffer).toString();
                    } catch (gzipErr) {
                        err_msg = gzipErr;
                    }
                } else if (encoding === 'deflate') {
                    try {
                        body = zlib.deflateSync(buffer).toString();
                    } catch (deflateErr) {
                        err_msg = deflateErr;
                    }
                } else {
                    body = buffer.toString();
                }

                log.debug({ status_code: res.statusCode, body }, 'response');

                if (err_msg !== null) {
                    cb(
                        err_msg,
                        null,
                        res.statusCode,
                        body);
                    return;
                }

                // If this isn't a 200 level, extract the message from the body
                if (res.statusCode < 200 || res.statusCode > 299) {
                    try {
                        err_msg = new Error('API response error');
                        parsed = JSON.parse(body).message;
                    } catch (err) {
                        err_msg = new Error('An error occurred - response body could not be parsed');
                        err_msg.detail = err.message;
                        err_msg.body = body;
                    }
                    cb(
                        err_msg,
                        parsed,
                        res.statusCode,
                        body);
                    return;
                }

                err_msg = null;
                parsed = null;
                try {
                    if (body) {
                        parsed = JSON.parse(body);
                    }
                } catch (parseErr) {
                    err_msg = new Error('Error parsing body');
                    err_msg.detail = parseErr.message;
                    err_msg.body = body;
                }

                cb(
                    err_msg,
                    parsed,
                    res.statusCode,
                    body);
            });
        });

        req.on('error', (err) => {
            if (err.code === 'ECONNRESET' && options.circapi.retry < options.circapi.retry_backoff.length) {
                // sleep and try again, hopefully a recoverable error
                setTimeout(() => {
                    self.do_request(options, cb);
                }, options.circapi.retry_backoff[options.circapi.retry]);
                options.circapi.retry += 1;
                return;
            }
            cb(
                err,
                null,
                null,
                null);
            return;
        });

        if (options.method.toUpperCase() === 'POST' || options.method.toUpperCase() === 'PUT') {
            const stringified = JSON.stringify(options.circapi.data);

            req.write(stringified);
            log.debug({ data: stringified }, 'sending data');

        }
        req.end();
    }

    /*
     * Hands back an options object suitable to use with the HTTPS class
     */
    get_request_options(method, endpoint, data) {
        const options = url.parse(this.api_url);

        options.method = method.toUpperCase();

        options.agent = false;

        options.headers = {
            'X-Circonus-Auth-Token': this.api_key,
            'X-Circonus-App-Name': this.api_app,
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip,deflate'
        };

        options.circapi = {
            retry: 0,
            retry_backoff: [
                null,       // 0 first attempt
                1 * 1000,   // 1, wait 1 second and try again
                2 * 1000,   // 2, wait 2 seconds and try again
                4 * 1000,   // 3, wait 4 seconds and try again
                8 * 1000,   // 4, wait 8 seconds and try again
                16 * 1000,  // 5, wait 16 seconds and try again
                32 * 1000   // 6, wait 32 seconds and retry again then give up if it fails
            ],
            data: null
        };

        if (this.proxyServer !== null) {
            options.agent = new ProxyAgent(this.proxyServer);
        }

        if ((/^v[46]/).test(process.version)) {

            // currently 2016-10-27T16:01:42Z, these settings seem to be
            // necessary to prevent http/https requests from intermittently
            // emitting an end event prior to all content being received
            // when communicating with the Circonus API.

            if (!{}.hasOwnProperty.call(options, 'agent') || options.agent === false) {
                options.agent = new this.client.Agent();
            }

            options.agent.keepAlive = false;
            options.agent.keepAliveMsecs = 0;
            options.agent.maxSockets = 1;
            options.agent.maxFreeSockets = 1;
            options.agent.maxCachedSessions = 0;
        }

        options.circapi.data = data || null;

        if (options.circapi.data !== null) {
            if (options.method === 'GET') {
                if (Object.keys(options.circapi.data).length !== 0) {
                    options.path += `?${qs.stringify(options.circapi.data)}`;
                }
            } else if (options.method === 'POST' || options.method === 'PUT') {
                options.headers['Content-Length'] = JSON.stringify(options.circapi.data).length;
            }
        }

        if (endpoint.match(/^\//)) {
            endpoint = endpoint.substring(1);
        }

        options.path += endpoint;

        return options;
    }
}

module.exports = new APIClient();
