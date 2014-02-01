#include <stdio.h>
#include <stdint.h>
#include <sys/types.h>
#include <sys/fs/zfs.h>
#include <libzfs.h>
#include <string.h>

/*
 * NOTE: libzfs is an unstable interface. 
 * This module may or may not work on your illumos distribution/version.
 * Compile with: gcc -lzfs -lnvpair zpoolio.c -o zpoolio
 */

int print_stats(zpool_handle_t *zhp, void *data) {
    uint_t c;
    boolean_t missing;

    nvlist_t *nv, *config;
    vdev_stat_t *vs;

    if (zpool_refresh_stats(zhp, &missing) != 0)
        return (1);

    config = zpool_get_config(zhp, NULL);

    if (nvlist_lookup_nvlist(config, 
        ZPOOL_CONFIG_VDEV_TREE, &nv) != 0) {
        return 2;
    }

    if (nvlist_lookup_uint64_array(nv, 
        ZPOOL_CONFIG_VDEV_STATS, (uint64_t **)&vs, &c) != 0) {
        return 3;
    }

    if (!data || strcmp(zpool_get_name(zhp),data) == 0) {
      printf("%s`%s\tL\t%llu\n", zpool_get_name(zhp), "read_ops", vs->vs_ops[ZIO_TYPE_READ]);
      printf("%s`%s\tL\t%llu\n", zpool_get_name(zhp), "write_ops", vs->vs_ops[ZIO_TYPE_WRITE]);
      printf("%s`%s\tL\t%llu\n", zpool_get_name(zhp), "read_bytes", vs->vs_bytes[ZIO_TYPE_READ]);
      printf("%s`%s\tL\t%llu\n", zpool_get_name(zhp), "write_bytes", vs->vs_bytes[ZIO_TYPE_WRITE]);
      printf("%s`%s\tL\t%llu\n", zpool_get_name(zhp), "used_space", vs->vs_alloc);
      printf("%s`%s\tL\t%llu\n", zpool_get_name(zhp), "free_space", vs->vs_space - vs->vs_alloc);
    }
    return 0;
}

int main(int argc, char *argv[]) {
    libzfs_handle_t *g_zfs;
    g_zfs = libzfs_init();
    if (argc > 1) {
        return(zpool_iter(g_zfs, print_stats, argv[1]));
    } else {
        return(zpool_iter(g_zfs, print_stats, NULL));
    }
}

