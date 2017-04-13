'use strict';

/* eslint-disable no-invalid-this */

const net = require('net');
const fs = require('fs');

function RInfo(tcpstream, data) {
    this.address = tcpstream.remoteAddress;
    this.port = tcpstream.remotePort;
    this.family = tcpstream.address() ? tcpstream.address().family : 'IPv4';
    this.size = data.length;
}

exports.start = (config, callback) => {
    const server = net.createServer((stream) => {
        stream.setEncoding('ascii');

        let buffer = '';

        stream.on('data', (data) => {
            buffer += data;
            const offset = buffer.lastIndexOf('\n');

            if (offset > -1) {
                const packet = buffer.slice(0, offset + 1);

                buffer = buffer.slice(offset + 1);
                callback(packet, new RInfo(stream, packet));
                return;
            }
        });
    });

    server.on('listening', () => {
        if (config.socket && config.socket_mod) {
            fs.chmod(config.socket, config.socket_mod);
        }
    });

    process.on('exit', () => {
        if (config.socket) {
            fs.unlinkSync(config.socket);
        }
    });

    server.listen(config.socket || config.port || 8125, config.address || null);

    this.server = server;
    return true;
};
