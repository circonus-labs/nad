#!/bin/bash

if [ -f /lib/systemd/system/nad.service ]; then
    /bin/systemctl disable nad
    /bin/systemctl stop nad >/dev/null 2>&1
elif [ -f /etc/init/nad.conf ]; then
    /sbin/initctl stop nad
elif [ -f /etc/init.d/nad ]; then
    /usr/sbin/update-rc.d nad remove
fi

exit 0
