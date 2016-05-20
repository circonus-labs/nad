#include    <stdio.h>
#include    <stdlib.h>
#include    <unistd.h>
#include    <errno.h>
#include    <sys/param.h>
#include    <dirent.h>
#include    <sys/swap.h>
#include    <sys/sysmacros.h>
#include    <sys/mkdev.h>
#include    <sys/stat.h>
#include    <sys/statvfs.h>
#include    <sys/uadmin.h>

void bail(const char *err) {
  fprintf(stderr, "fatal: %s\n", err);
  exit(-1);
}

int main() {
  int num, i;
  struct swaptable *st;
  struct swapent *swapent;
  struct stat64 statbuf;
  char *path;
  char fullpath[MAXPATHLEN];

  if((num = swapctl(SC_GETNSWP, NULL)) == -1) {
    bail("Failed to get swap devices");
  }
  if(num == 0) return 0;

  st = malloc(num * sizeof(swapent_t) + sizeof(int));
  if(st == NULL) bail("malloc failure");
  path = malloc(num * MAXPATHLEN);
  if(path == NULL) bail("malloc failure");
  swapent = st->swt_ent;
  for(i = 0; i < num; i++, swapent++) {
      swapent->ste_path = path;
      path += MAXPATHLEN;
  }

  st->swt_n = num;
  if((num = swapctl(SC_LIST, st)) == -1) {
    bail("failed to list swap devices");
  }

  int diskblks_per_page = (int)(sysconf(_SC_PAGESIZE) >> DEV_BSHIFT);
  unsigned long long total_bytes = 0, free_bytes = 0;
  for(swapent = st->swt_ent, i = 0; i < num; i++, swapent++) {
    if(*swapent->ste_path != '/')
      snprintf(fullpath, sizeof(fullpath), "/dev/%s", swapent->ste_path);
    else
      snprintf(fullpath, sizeof(fullpath), "%s", swapent->ste_path);
    if(stat64(fullpath, &statbuf) == 0) {
      total_bytes += swapent->ste_pages * diskblks_per_page * DEV_BSIZE;
      printf("swap`%s`total\tL\t%llu\n", swapent->ste_path,
             swapent->ste_pages * diskblks_per_page * DEV_BSIZE);
      free_bytes += swapent->ste_free * diskblks_per_page * DEV_BSIZE;
      printf("swap`%s`free\tL\t%llu\n", swapent->ste_path,
             swapent->ste_free * diskblks_per_page * DEV_BSIZE);
    }
  }
  printf("swap`total\tL\t%llu\n", total_bytes);
  printf("swap`free\tL\t%llu\n", free_bytes);
  return 0;
}
