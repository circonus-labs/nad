#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/statvfs.h>
#include <errno.h>
#include <stdlib.h>
#include <mntent.h>

// 2016-09-29T13:57:29Z add pstore - https://www.kernel.org/doc/Documentation/ABI/testing/pstore
static const char *suppress_fstype[] = {
  "rootfs", "proc", "sysfs", "selinuxfs", "usbfs", "devpts", "devtmpfs",
  "binfmt_misc", "rpc_pipefs", "autofs", "debugfs", "securityfs", "fusectl",
  "cgroup", "configfs", "mqueue", "hugetlbfs", "fuse.gvfs-fuse-daemon", "xenfs",
  "pstore",
  NULL
};

int main(int argc, char **argv) {
  struct mntent mnt;
  char why_buf[1024];
  FILE *fp;

  fp = fopen("/proc/mounts", "r");
  if(!fp) {
    perror("fopen");
    exit(-1);
  }

  while(getmntent_r(fp, &mnt, why_buf, sizeof(why_buf)) != NULL) {
    struct statvfs buf;
    int i;

    for(i=0;suppress_fstype[i] != NULL;i++)
      if(!strcmp(mnt.mnt_type, suppress_fstype[i])) break;

    if (suppress_fstype[i] == NULL && statvfs(mnt.mnt_dir, &buf) == 0) {
        long long unsigned int used = 0, adj = 0;
        double pct = 0, df_pct = 0;

        printf("%s`f_bsize\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_bsize);
        printf("%s`f_frsize\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_frsize);
        printf("%s`f_blocks\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_blocks);
        printf("%s`f_bfree\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_bfree);
        printf("%s`f_bavail\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_bavail);
        printf("%s`f_files\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_files);
        printf("%s`f_ffree\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_ffree);
        printf("%s`f_favail\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_favail);

        pct = 0;
        df_pct = 0;
        if (buf.f_blocks > 0) {
            used = buf.f_blocks - buf.f_bfree;
            adj = buf.f_blocks - buf.f_bfree + buf.f_bavail;
            df_pct = (used * 100) / adj + ((used * 100) % adj != 0);
           	pct = 100.0*(double)used/(double)adj;
        }
        printf("%s`df_used_percent\tL\t%0.2f\n", mnt.mnt_dir, df_pct);
        printf("%s`used_percent\tL\t%0.2f\n", mnt.mnt_dir, pct);

        pct = 0;
        df_pct = 0;
        if(buf.f_files > 0) {
            used = buf.f_files - buf.f_ffree;
            df_pct = (used * 100) / buf.f_files + ((used * 100) % buf.f_files != 0);
            pct = 100.0*(double)(buf.f_files - buf.f_ffree)/(double)buf.f_files;
        }
        printf("%s`df_used_inode_percent\tL\t%0.2f\n", mnt.mnt_dir, df_pct);
        printf("%s`used_inode_percent\tL\t%0.2f\n", mnt.mnt_dir, pct);    }
  }
  exit(0);
}
