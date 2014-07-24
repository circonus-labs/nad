#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/statvfs.h>
#include <errno.h>
#include <stdlib.h>
#include <sys/param.h>
#include <sys/ucred.h>
#include <sys/mount.h>
#ifdef HAVE_ZFS
#include "zfs_hack.h"
#endif

static const char *suppress_fstype[] = {
 "devfs", "autofs", "ctfs", "dev", "fd", "lofs", "mntfs", "objfs", "proc", NULL
};

int main(int argc, char **argv) {
  int cnt, i, idx;
  struct statfs *stats;
  FILE *fp;

  cnt = getmntinfo(&stats, MNT_WAIT);
  if(cnt <= 0) {
    perror("getmntinfo");
    exit(-1);
  }

  for(idx = 0; idx<cnt; idx++) {
    struct statfs *mnt = &stats[idx];

    for(i=0;suppress_fstype[i] != NULL;i++)
     if(!strcmp(mnt->f_fstypename, suppress_fstype[i])) break;

    if (suppress_fstype[i] == NULL) {
      if(!strcmp(mnt->f_fstypename, "zfs")) {
#ifdef HAVE_ZFS
        uint64_t used, avail;
        uint64_t *space_used = NULL, *space_avail = NULL;
        libzfs_handle_t *zfsh = libzfs_init();
        zfs_handle_t *handle = zfs_path_to_zhandle(zfsh, (char *)mnt->f_mntonname, ZFS_TYPE_FILESYSTEM);
        if(handle) {
          char source[ZFS_MAXNAMELEN];
          zprop_source_t srctype;
          int rv;
#define ZFS_PULL_N_PRINT(prop, name, T, F, expr) do { \
  uint64_t datum; \
  if(zfs_prop_get_numeric(handle, prop, \
                          &datum, &srctype, source, sizeof(source)) == 0) { \
      printf("zfs`%s`" name "\t" T" \t" F "\n", mnt->f_mntonname, expr); \
  } \
} while(0)

          uint64_t used = -1, avail = -1;
          if(zfs_prop_get_numeric(handle, ZFS_PROP_USEDDS,
                                  &used, &srctype,
                                  source, sizeof(source)) == 0) {
            printf("zfs`%s`used\tL\t%llu\n", mnt->f_mntonname, (unsigned long long)used);
          }
          if(zfs_prop_get_numeric(handle, ZFS_PROP_AVAILABLE,
                                  &avail, &srctype,
                                  source, sizeof(source)) == 0) {
            printf("zfs`%s`avail\tL\t%llu\n", mnt->f_mntonname, (unsigned long long)avail);
          }
          if(used != -1 && avail != -1) {
            printf("zfs`%s`used_percent\tn\t%f\n", mnt->f_mntonname, 100.0 * (used / (double)(used + avail)));
          }

          ZFS_PULL_N_PRINT(ZFS_PROP_USEDCHILD, "used_children", "L", "%llu", (unsigned long long)datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_USEDSNAP, "used_snapshot", "L", "%llu", (unsigned long long)datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_REFERENCED, "referenced", "L", "%llu", (unsigned long long)datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_RECORDSIZE, "record_size", "L", "%llu", (unsigned long long)datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_QUOTA, "quota", "L", "%llu", (unsigned long long)datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_RESERVATION, "reservation", "L", "%llu", (unsigned long long)datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_REFRESERVATION, "ref_reservation", "L", "%llu", (unsigned long long)datum);
          ZFS_PULL_N_PRINT(ZFS_PROP_USEDREFRESERV, "ref_reservation_used", "L", "%llu", (unsigned long long)datum);
#ifdef HAVE_LOGICAL_USED
  ZFS_PULL_N_PRINT(ZFS_PROP_LOGICALUSED, "logical_used", "L", "%llu", (unsigned long long)datum);
  ZFS_PULL_N_PRINT(ZFS_PROP_LOGICALREFERENCED, "logical_referenced", "L", "%llu", (unsigned long long)datum);
#endif
          ZFS_PULL_N_PRINT(ZFS_PROP_COMPRESSRATIO, "compress_ratio", "n", "%f", (double)datum/100.0);
          zfs_close(handle);
        }
        libzfs_fini(zfsh);
#endif
      }
      else {
        long long unsigned int used, adj;
        printf("%s`f_bsize\tL\t%ld\n", mnt->f_mntonname, mnt->f_bsize);
        printf("%s`f_blocks\tL\t%lu\n", mnt->f_mntonname, mnt->f_blocks);
        printf("%s`f_bfree\tL\t%lu\n", mnt->f_mntonname, mnt->f_bfree);
        printf("%s`f_bavail\tL\t%ld\n", mnt->f_mntonname, mnt->f_bavail);
        printf("%s`f_files\tL\t%lu\n", mnt->f_mntonname, mnt->f_blocks);
        printf("%s`f_ffree\tL\t%ld\n", mnt->f_mntonname, mnt->f_ffree);
        used = mnt->f_blocks - mnt->f_bfree;
        adj = mnt->f_blocks - mnt->f_bfree + mnt->f_bavail;
        if (adj != 0) {
          double pct = (used * 100) / adj + ((used * 100) % adj != 0);
          printf("%s`df_used_percent\tL\t%0.2f\n", mnt->f_mntonname, pct);
          printf("%s`used_percent\tL\t%0.2f\n", mnt->f_mntonname, 100.0*(double)used/(double)adj);
          if (mnt->f_files > 0) {
            used = mnt->f_files - mnt->f_ffree;
            pct = (used * 100) / mnt->f_files + ((used * 100) % mnt->f_files != 0);
            printf("%s`df_used_inode_percent\tL\t%0.2f\n", mnt->f_mntonname, pct);
            printf("%s`used_inode_percent\tL\t%0.2f\n", mnt->f_mntonname, 100.0*(double)(mnt->f_files - mnt->f_ffree)/(double)mnt->f_files);
          }
        }
      }
    }
  }
  exit(0);
}
