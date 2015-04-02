#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/statvfs.h>
#include <errno.h>
#include <stdlib.h>
#include <sys/param.h>
#include <sys/ucred.h>
#include <sys/mount.h>

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
  exit(0);
}
