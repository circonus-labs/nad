print_int() { printf "%s\tl\t%s\n" $1 $2; }
print_uint() { printf "%s\tL\t%s\n" $1 $2; }
print_dbl() { printf "%s\tn\t%s\n" $1 $2; }
print_str() { printf "%s\ts\t%s\n" $1 $2; }

pgconf="/opt/circonus/etc/pg-conf.sh"
[[ -f $pgconf ]] && source $pgconf

PSQL=${PSQL_CMD:-}
if [[ -z ${PSQL:-} ]]; then
    PSQL=$(command -v psql)
    [[ $? -eq 0 ]] || { echo "Unable to find 'psql' command"; exit 1; }
fi

[[ -n $PSQL && -x $PSQL ]] || { echo "'${PSQL}' not executable"; exit 1; }

: ${PGUSER:=postgres}
: ${PGDATABASE:=postgres}
: ${PGPASS:=}
: ${PGPORT:=5432}
[[ -n ${PGPASS:-} ]] && export PGPASSWORD="$PGPASS"

pg_functions=1

# END
