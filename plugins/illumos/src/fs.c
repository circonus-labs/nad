#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/statvfs.h>
#include <errno.h>
#include <stdlib.h>
#include <sys/mnttab.h>

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
  exit(0);
}
