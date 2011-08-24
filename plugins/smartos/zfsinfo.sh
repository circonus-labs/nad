#!/bin/sh
. ./lib/kstat.lib

_kstat -m zfs
_kstat -m unix -n vopstats_zfs
