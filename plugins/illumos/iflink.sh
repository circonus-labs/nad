#!/usr/bin/env bash

set -eu

KSTAT="/usr/bin/kstat"
SED="/usr/gnu/bin/sed"

[[ ! -x $KSTAT ]] && {
    echo "kstat '$KSTAT' not found.";
    exit 1;
}

[[ ! -x $SED ]] && {
    echo "sed '$SED' not found.";
    exit 1;
}

kstat_opts="-p link:"

$KSTAT $kstat_opts | $SED -e '/:\(class\|crtime\|snaptime\)/d; s/^link:[0-9]*://; s/:/`/g; s/\t/\tL\t/'
