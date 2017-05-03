// Copyright 2016 Circonus, Inc. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

// provide single interface for obtaining broker CA certificate
//
// use:
//
// const broker = require('broker');
//
// broker.publicCA() - returns public broker CA certificate
// broker.fileCA() - returns CA certificate from --cafile provided on command line
// broker.apiCA(cb) - fetches CA certificate from API - call to callback is cb(err, cert)
// broker.loadCA(cb) - attempt all three in sequence (file, api, public) - call to callback is cb(err, cert)
//
// whichever call is made first will cache the cert and it will be returned from that point forward.
//

/* eslint-disable no-process-exit */

const tls = require('tls');
const path = require('path');
const fs = require('fs');

const nad = require('nad');
const settings = require(path.join(nad.lib_dir, 'settings'));
const client = require(path.join(nad.lib_dir, 'apiclient'));
const log = settings.logger.child({ module: 'broker' });

class Broker {

    /**
     * inintializes broker instance
     */
    constructor() {
        this.broker_ca_file = settings.broker_ca_file;
        this.ca = null;
    }

    /**
     * create a context using the broker CA certificate
     * for use with HTTPS requests.
     * @arg {String} cert broker CA certificate
     * @returns {Undefined} nothing
     */
    genContext(cert) {
        log.debug({ cert }, 'creating context');

        if (!cert) {
            console.error('cert is not defined', cert);
            process.exit(1);
        }

        try {
            this.ca = tls.createSecureContext({ ca: cert });
        } catch (err) {
            console.error('creating tls secure context', err);
            process.exit(1);
        }
    }

    /**
     * returns the default, public, broker CA certificate
     * @returns {Object} context for use with HTTPS requests
     */
    publicCA() {
        if (this.ca !== null) {
            return Object.assign({}, this.ca);
        }

        this.genContext([
            '-----BEGIN CERTIFICATE-----',
            'MIID4zCCA0ygAwIBAgIJAMelf8skwVWPMA0GCSqGSIb3DQEBBQUAMIGoMQswCQYD',
            'VQQGEwJVUzERMA8GA1UECBMITWFyeWxhbmQxETAPBgNVBAcTCENvbHVtYmlhMRcw',
            'FQYDVQQKEw5DaXJjb251cywgSW5jLjERMA8GA1UECxMIQ2lyY29udXMxJzAlBgNV',
            'BAMTHkNpcmNvbnVzIENlcnRpZmljYXRlIEF1dGhvcml0eTEeMBwGCSqGSIb3DQEJ',
            'ARYPY2FAY2lyY29udXMubmV0MB4XDTA5MTIyMzE5MTcwNloXDTE5MTIyMTE5MTcw',
            'NlowgagxCzAJBgNVBAYTAlVTMREwDwYDVQQIEwhNYXJ5bGFuZDERMA8GA1UEBxMI',
            'Q29sdW1iaWExFzAVBgNVBAoTDkNpcmNvbnVzLCBJbmMuMREwDwYDVQQLEwhDaXJj',
            'b251czEnMCUGA1UEAxMeQ2lyY29udXMgQ2VydGlmaWNhdGUgQXV0aG9yaXR5MR4w',
            'HAYJKoZIhvcNAQkBFg9jYUBjaXJjb251cy5uZXQwgZ8wDQYJKoZIhvcNAQEBBQAD',
            'gY0AMIGJAoGBAKz2X0/0vJJ4ad1roehFyxUXHdkjJA9msEKwT2ojummdUB3kK5z6',
            'PDzDL9/c65eFYWqrQWVWZSLQK1D+v9xJThCe93v6QkSJa7GZkCq9dxClXVtBmZH3',
            'hNIZZKVC6JMA9dpRjBmlFgNuIdN7q5aJsv8VZHH+QrAyr9aQmhDJAmk1AgMBAAGj',
            'ggERMIIBDTAdBgNVHQ4EFgQUyNTsgZHSkhhDJ5i+6IFlPzKYxsUwgd0GA1UdIwSB',
            '1TCB0oAUyNTsgZHSkhhDJ5i+6IFlPzKYxsWhga6kgaswgagxCzAJBgNVBAYTAlVT',
            'MREwDwYDVQQIEwhNYXJ5bGFuZDERMA8GA1UEBxMIQ29sdW1iaWExFzAVBgNVBAoT',
            'DkNpcmNvbnVzLCBJbmMuMREwDwYDVQQLEwhDaXJjb251czEnMCUGA1UEAxMeQ2ly',
            'Y29udXMgQ2VydGlmaWNhdGUgQXV0aG9yaXR5MR4wHAYJKoZIhvcNAQkBFg9jYUBj',
            'aXJjb251cy5uZXSCCQDHpX/LJMFVjzAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEB',
            'BQUAA4GBAAHBtl15BwbSyq0dMEBpEdQYhHianU/rvOMe57digBmox7ZkPEbB/baE',
            'sYJysziA2raOtRxVRtcxuZSMij2RiJDsLxzIp1H60Xhr8lmf7qF6Y+sZl7V36KZb',
            'n2ezaOoRtsQl9dhqEMe8zgL76p9YZ5E69Al0mgiifTteyNjjMuIW',
            '-----END CERTIFICATE-----'
        ].join('\n'));

        return Object.assign({}, this.ca);
    }

    /**
     * gets a broker CA certificate from a user-supplied file
     * @returns {Object|null} context for use with HTTPS requests
     */
    fileCA() {
        if (this.ca !== null) {
            return Object.assign({}, this.ca);
        }

        let cert = null;

        if (this.broker_ca_file !== null) {
            log.debug({ file: this.broker_ca_file }, 'trying to load broker ca file');
            try {
                cert = fs.readFileSync(this.broker_ca_file); // eslint-disable-line no-sync
                this.genContext(cert);

                return Object.assign({}, this.ca);
            } catch (err) {
                log.fatal({
                    err  : err.message,
                    file : this.broker_ca_file
                }, 'unable to load broker CA file');
                process.exit(1);
            }
        }

        return null;
    }

    /**
     * gets a broker CA certificate from Circonus API
     * @returns {Object} promise
     */
    apiCA() {
        const self = this;

        return new Promise((resolve) => {
            if (this.ca !== null) {
                resolve(self.ca);

                return;
            }

            client.get('/pki/ca.crt', null).
                then((parsed_body, code, raw_body) => { // eslint-disable-line handle-callback-err, no-unused-vars
                    self.genContext(parsed_body.contents);
                    resolve(self.ca);
                }).
                catch((err) => {
                    log.debug({
                        code : err.http_code,
                        err  : err.message,
                        msg  : err.parsed_body
                    }, 'fetching broker ca from api');
                    resolve(null);
                });
        });
    }

    /**
     * loads broker CA certificate, attempting multiple sources:
     * 1. file
     * 2. api
     * 3. public
     * @returns {Object} promise
     */
    loadCA() {
        const self = this;

        return new Promise((resolve, reject) => {
            if (this.ca !== null) {
                resolve(self.ca);

                return;
            }

            if (self.fileCA() !== null) {
                resolve(self.ca);

                return;
            }

            self.apiCA().
                then((crt) => {
                    if (crt !== null) {
                        resolve(crt);

                        return;
                    }

                    resolve(self.publicCA());
                }).
                catch((err) => {
                    log.error({ err: err.message }, 'unable to retrieve broker CA cert from API, falling back to public CA');
                    reject(err);
                });
        });
    }

}

module.exports = new Broker();
