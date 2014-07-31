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
    /sbin/zpool status $zp | awk -v poolname=$zp '
        function convert (val)
        {
            if (val ~ /K$/) { val = val*1000 }
            if (val ~ /M$/) { val = val*1000000 }
            if (val ~ /G$/) { val = val*1000000000 }
            return val
        }
        {
            if ($1 ~ /(pool:|scan:|config:|errors:|NAME|^logs$|^cache$|^$)/)
            {
                next;
            }
            if ($1 == "state:")
            {
                printf("%s`state\ts\t%s\n", poolname, $2);
                next;
            }
            # pool-wide stats
            if ($1 == poolname)
            {
                rerr = convert($3);
                werr = convert($4);
                cerr = convert($5);
                printf("%s`errors_read\tL\t%d\n", poolname, rerr);
                printf("%s`errors_write\tL\t%d\n", poolname, werr);
                printf("%s`errors_cksum\tL\t%d\n", poolname, cerr);
            }
            # vdev stats
            if ($1 != poolname && $3 ~ /[0-9]+[KMG]?/ && $4 ~ /[0-9]+[KMG]?/)
            {
                rerr = convert($3);
                werr = convert($4);
                cerr = convert($5);
                printf("%s`%s`state\ts\t%s\n", poolname, $1, $2);
                printf("%s`%s`errors_read\tL\t%d\n", poolname, $1, rerr);
                printf("%s`%s`errors_write\tL\t%d\n", poolname, $1, werr);
                printf("%s`%s`errors_cksum\tL\t%d\n", poolname, $1, cerr);
            }
        }'
done
