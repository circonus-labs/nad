#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/statvfs.h>
#include <errno.h>
#include <stdlib.h>
#include <sys/mnttab.h>
#include <sys/fs/zfs.h>
#include <libzfs.h>

static const char *suppress_fstype[] = {
 "autofs", "ctfs", "dev", "fd", "lofs", "mntfs", "objfs", "proc", NULL
};

int main(int argc, char **argv) {
  struct extmnttab mnt;
  FILE *fp;

  fp = fopen("/etc/mnttab", "r");
  if(!fp) {
    perror("fopen");
    exit(-1);
  }

  while(getextmntent(fp, &mnt, sizeof (struct extmnttab)) == 0) {
    struct statvfs buf;
    int i;

    for(i=0;suppress_fstype[i] != NULL;i++)
      if(!strcmp(mnt.mnt_fstype, suppress_fstype[i])) break;

    if (suppress_fstype[i] == NULL && statvfs(mnt.mnt_mountp, &buf) == 0) {
      if(!strcmp(mnt.mnt_fstype, "zfs")) {
        uint64_t used, avail;
        uint64_t *space_used = NULL, *space_avail = NULL;
        libzfs_handle_t *zfsh = libzfs_init();
        zfs_handle_t *handle = zfs_path_to_zhandle(zfsh, (char *)mnt.mnt_mountp, ZFS_TYPE_FILESYSTEM);
        if(handle) {
          char source[ZFS_MAXNAMELEN];
          zprop_source_t srctype;
          int rv;
#define ZFS_PULL_N_PRINT(prop, name, T, F, expr) do { \
  uint64_t datum; \
  if(zfs_prop_get_numeric(handle, prop, \
                          &datum, &srctype, source, sizeof(source)) == 0) { \
      printf("zfs`%s`" name "\t" T" \t" F "\n", mnt.mnt_mountp, expr); \
  } \
} while(0)

          uint64_t used = -1, avail = -1;
          if(zfs_prop_get_numeric(handle, ZFS_PROP_USEDDS,
                                  &used, &srctype,
                                  source, sizeof(source)) == 0) {
            printf("zfs`%s`used\tL\t%llu\n", mnt.mnt_mountp, used);
          }
          if(zfs_prop_get_numeric(handle, ZFS_PROP_AVAILABLE,
                                  &avail, &srctype,
                                  source, sizeof(source)) == 0) {
            printf("zfs`%s`avail\tL\t%llu\n", mnt.mnt_mountp, avail);
          }
          if(used != -1 && avail != -1) {
            printf("zfs`%s`used_percent\tn\t%f\n", mnt.mnt_mountp, 100.0 * (used / (double)(used + avail)));
          }

          ZFS_PULL_N_PRINT(ZFS_PROP_USEDCHILD, "used_children", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_USEDSNAP, "used_snapshot", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_REFERENCED, "referenced", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_RECORDSIZE, "record_size", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_QUOTA, "quota", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_RESERVATION, "reservation", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_REFRESERVATION, "ref_reservation", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_USEDREFRESERV, "ref_reservation_used", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_LOGICALUSED, "logical_used", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_LOGICALREFERENCED, "logical_referenced", "L", "%llu", datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_COMPRESSRATIO, "compress_ratio", "n", "%f", (double)datum/100.0);
          zfs_close(handle);
        }
        libzfs_fini(zfsh);
      }
      else {
        printf("fs`%s`f_bsize\tL\t%llu\n", mnt.mnt_mountp, buf.f_bsize);
        printf("fs`%s`f_frsize\tL\t%llu\n", mnt.mnt_mountp, buf.f_frsize);
        printf("fs`%s`f_blocks\tL\t%llu\n", mnt.mnt_mountp, buf.f_blocks);
        printf("fs`%s`f_bfree\tL\t%llu\n", mnt.mnt_mountp, buf.f_bfree);
        printf("fs`%s`f_bavail\tL\t%llu\n", mnt.mnt_mountp, buf.f_bavail);
        printf("fs`%s`f_files\tL\t%llu\n", mnt.mnt_mountp, buf.f_blocks);
        printf("fs`%s`f_ffree\tL\t%llu\n", mnt.mnt_mountp, buf.f_ffree);
        printf("fs`%s`f_favail\tL\t%llu\n", mnt.mnt_mountp, buf.f_favail);
      }
    }
  }
  exit(0);
}
