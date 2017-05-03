#!/bin/bash

if [ -f /lib/systemd/system/nad.service ]; then
    /bin/systemctl enable nad
    /bin/systemctl start nad >/dev/null 2>&1
elif [ -f /etc/init/nad.conf ]; then
    /sbin/initctl reload-configuration
    /sbin/initctl start nad
elif [ -f /etc/init.d/nad ]; then
    /usr/sbin/update-rc.d nad defaults 98 02
    /etc/init.d/nad start
fi
