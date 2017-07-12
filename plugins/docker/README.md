# Docker

## dev setup

```sh

cd ..
vagrant up
vagrant ssh -c "sudo yum install -y docker-engine && service docker start"
# WARNING - see note below
vagrant ssh -c "sudo usermod -G docker nobody"
```

> **Security Note**: There are security implications with regards to _who_ can
access the Docker API. User _nobody_ is added to the _docker_ group above for
the purposes of _demonstration_ **only**. It is not a good idea to give
the user _nobody_ access to the Docker API as **anything** running as that user
would have full access to **control** Docker. (start/stop containers, manipulate images, etc.)

get a sample container up and running to have something output for testing:

```sh
vagrant ssh
sudo docker run --name redis -d redis redis-server
```

## install

1. Change to installation directory `cd /opt/circonus/nad/etc/node-agent.d/docker`
1. Make `make` or just do `npm install --production` if npm is in path
1. Create a symlink (from `docker/stats.js` or `docker/events.js`) in `/opt/circonus/etc/node-agent.d`. The base name of the symlink will be used as the first part of the metric names. (e.g. if using only stats, `cd /opt/circonus/etc/node-agent.d && ln -s docker/stats.js dockerstats.js`, NAD would add the docker container stats all prefixed with **dockerstats**.)

## stats

metrics from running containers. cpu, memory, block io, and network.


## events

docker events. note, events are pulled since the last request, or 60 seconds if it's the first request.


## config

`/opt/circonus/etc/docker.json`

Default configuration is `null` resulting in default settings being pulled from the environment (e.g. DOCKER_HOST, DOCKER_TLS_VERIFY, DOCKER_CERT_PATH) or using the default Docker socket `/var/run/docker.sock`. See [docker-modem](https://github.com/apocas/docker-modem) for Docker API connection settings/implementation details.

```json
{
    "socketPath": "/var/run/docker.sock",
    "protocol": "",
    "host": "",
    "port": "",
    "version": "",
    "key": "",
    "cert": "",
    "ca": "",
    "timeout": 15,
    "checkSeverIdentity": true
}
```
