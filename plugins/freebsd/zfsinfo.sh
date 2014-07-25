#!/bin/sh

sysctl kstat.zfs vfs.zfs | awk -F':' '{
    printf("%s\tL\t%d\n",$1,$2);
}'
