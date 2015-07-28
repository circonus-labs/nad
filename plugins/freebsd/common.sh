#!/bin/sh --
#
# Common paths

exec 2>&1
set -e

BIN_AWK=/usr/bin/awk
BIN_BC=/usr/bin/bc
BIN_CUT=/usr/bin/cut
BIN_EXPR=/bin/expr
BIN_NETSTAT=/usr/bin/netstat
BIN_PSTAT=/usr/sbin/pstat
BIN_SED=/usr/bin/sed
BIN_SYSCTL=/sbin/sysctl

PATH_CONF=@@CONF@@
