#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/statvfs.h>
#include <errno.h>
#include <stdlib.h>
#include <mntent.h>

static const char *suppress_fstype[] = {
  "rootfs", "proc", "sysfs", "selinuxfs", "usbfs", "devpts", "devtmpfs", 
  "binfmt_misc", "rpc_pipefs", "autofs", "debugfs", "securityfs", "fusectl",
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
      long long unsigned int used = buf.f_blocks - buf.f_bfree,
                             adj = buf.f_blocks - buf.f_bfree + buf.f_bavail;
      double pct = (used * 100) / adj + ((used * 100) % adj != 0);
      printf("%s`f_bsize\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_bsize);
      printf("%s`f_frsize\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_frsize);
      printf("%s`f_blocks\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_blocks);
      printf("%s`f_bfree\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_bfree);
      printf("%s`f_bavail\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_bavail);
      printf("%s`df_used_percent\tL\t%0.2f\n", mnt.mnt_dir, pct);
      printf("%s`used_percent\tL\t%0.2f\n", mnt.mnt_dir, 100.0*(double)used/(double)adj);
      printf("%s`f_files\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_files);
      printf("%s`f_ffree\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_ffree);
      printf("%s`f_favail\tL\t%llu\n", mnt.mnt_dir, (long long unsigned int) buf.f_favail);
    }
  }
  exit(0);
}
