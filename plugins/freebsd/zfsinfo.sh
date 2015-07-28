#!/bin/sh --

. @@CONF@@/freebsd/common.sh

${BIN_SYSCTL} kstat.zfs vfs.zfs | ${BIN_AWK} -F':' '{
    printf("%s\tL\t%d\n",$1,$2);
}'
