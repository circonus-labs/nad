#!/bin/sh
#
# ATTENTION LINUX USERS:
# Because nad normally runs as a non-root user, it can't run 'zpool'
# without root privileges, due to the permissions on /dev/zfs.
# See https://github.com/zfsonlinux/zfs/issues/362 for a potential workaround
# https://github.com/zfsonlinux/zfs/issues/434 should address privilege delegation

PATH="/usr/xpg4/bin:$PATH"

pools=`/sbin/zpool list -H -o name`

for zp in $pools; do \
    /sbin/zpool status $zp | awk -v poolname=$zp '{
        if ($1 ~ /(pool:|scan:|config:|errors:|NAME|^logs$|^cache$|^$)/) {
            next;
        }
        if ($1 == "state:") {
            printf("%s`state\ts\t%s\n", poolname, $2);
            next;
        }
        # top-level pool stats
        if ($1 == poolname) {
            printf("%s`errors_read\tL\t%d\n", poolname, $3);
            printf("%s`errors_write\tL\t%d\n", poolname, $4);
            printf("%s`errors_cksum\tL\t%d\n", poolname, $5);
        } else {
            # vdev stats
            printf("%s`%s`state\ts\t%s\n", poolname, $1, $2);
            printf("%s`%s`errors_read\tL\t%d\n", poolname, $1, $3);
            printf("%s`%s`errors_write\tL\t%d\n", poolname, $1, $4);
            printf("%s`%s`errors_cksum\tL\t%d\n", poolname, $1, $5);
        }
    }'
done
