source ./omnipitr.conf
print_norm_int() {
    printf "%s\tL\t%s\n" $1 $2
    }
print_norm_dbl() {
	printf "%s\tn\t%s\n" $1 $2
    }

print_norm_dbl last_archive_age `$omnipitr_monitor --state-dir=$omnipitr_state -c last-archive-age --log $omnipitr_log`
print_norm_dbl last_restore_age `$omnipitr_monitor --state-dir=$omnipitr_state -c last-restore-age --log $omnipitr_log`
print_norm_int current_archive_time `$omnipitr_monitor --state-dir=$omnipitr_state -c current-archive-time --log $omnipitr_log`
print_norm_int archive_queue `$omnipitr_monitor --state-dir=$omnipitr_state -c archive-queue --log $omnipitr_log -d postgres`
