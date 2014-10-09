#!/bin/sh
#
# ATTENTION LINUX USERS:
# Because nad normally runs as a non-root user, it can't run 'zpool'
# without root privileges, due to the permissions on /dev/zfs.
# See https://github.com/zfsonlinux/zfs/issues/362 for a potential workaround
# https://github.com/zfsonlinux/zfs/issues/434 should address privilege delegation
#
# Metric descriptions
# See also the zpool man page
#
# [poolname]`state
#    overall pool state
# [poolname]`resilver
#    minutes remaining for an ongoing resilver action
#    0 means no resilver active, null means progress is too slow (ETR > 30 days)
# [poolname]`scrub
#    minutes remaining for an ongoing scrub action
#    0 means no scrub active, null means progress is too slow (ETR > 30 days)
# [poolname]`errors_{read,write,cksum}
#    errors at the pool level
# [poolname]`[vdev]`state
#    individual vdev state
# [poolname]`[vdev]`errors_{read,write,cksum}
#    errors at the vdev level

PATH="/usr/xpg4/bin:$PATH"

pools=`/sbin/zpool list -H -o name`

for zp in $pools; do \
    /sbin/zpool status $zp | awk -v poolname=$zp '
        function convert (val)
        {
            len = length(val)
            if (val ~ /K$/) { val = substr(val, 1, len - 1); val = val * 1000 }
            if (val ~ /M$/) { val = substr(val, 1, len - 1); val = val * 1000000 }
            if (val ~ /G$/) { val = substr(val, 1, len - 1); val = val * 1000000000 }

            return val
        }
        {
            if ($1 ~ /(pool:|config:|errors:|NAME|^logs$|^cache$|^$)/)
            {
                next;
            }
            if ($1 == "state:")
            {
                printf("%s`state\ts\t%s\n", poolname, $2);
                next;
            }
            if ($1 == "scan:")
            {
                if ($0 ~ /in progress/)
                {
                    # If a scrub or resilver is active, the next line will matter
                    # scan type is either scrub or resilver, never both
                    if ($2 == "scrub")
                        scrub_active = "true"
                    if ($2 == "resilver")
                        resilver_active = "true"
        
                    next
                }
                else
                {
                    # no scrub or resilver active
                    printf("%s`resilver\tL\t%s\n", poolname, 0);
                    printf("%s`scrub\tL\t%s\n", poolname, 0);
        
                    next
                }
            }
            # If scrub or resilver active, find the remaining time, in minutes
            if ($2 == "scanned")
            {
                if ($8 ~ /[0-9]+h[0-9]+m/)
                {
                    split($8,t,/[hm]/)
                    hours = t[1]
                    mins = t[2]
                    remain = (hours * 60) + mins
                }
                # remaining time > 30 days is just reported as "slow"
                if ($0 ~ /no estimated time/)
                    remain = "[[null]]"
        
                # We are either in a scrub or a resilver, never both
                if (scrub_active)
                {
                    printf("%s`resilver\tL\t%s\n", poolname, 0);
                    printf("%s`scrub\tL\t%s\n", poolname, remain);
                }
                if (resilver_active)
                {
                    printf("%s`resilver\tL\t%s\n", poolname, remain);
                    printf("%s`scrub\tL\t%s\n", poolname, 0);
                }
        
                next
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
