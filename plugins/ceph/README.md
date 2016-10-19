# Ceph metrics plugin


## Use

```
cd /opt/circonus/etc/node-agent.d
ln -s ceph/<metric collector plugin name>.js .
```

e.g.

```
cd /opt/circonus/etc/node-agent.d
ln -s ceph/ceph_status.js .
```

## Notes

`ceph osd pool stats` (`ceph_osd_pool.js`) produces metrics for the current point in time, it is **not** an aggregate. The result will be the read/write ops/bytes per second occurring at the point in time when the command runs. If there are no operations running, these metrics will be 0.
