#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <pwd.h>
#include <grp.h>
#include <time.h>
#include <fcntl.h>

#ifndef MAXPATHLEN
#define MAXPATHLEN 4096
#endif

#ifdef __APPLE__
#define STAT_TIMESPEC
#else
#define STAT_TIME_T
#endif

void print_user(uid_t uid) {
  struct passwd *pw;
  pw = getpwuid(uid);
  if(pw) printf("owner\ts\t%s\n", pw->pw_name);
  else printf("owner\ts\t%d\n", uid);
}
void print_group(gid_t gid) {
  struct group *gr;
  gr = getgrgid(gid);
  if(gr) printf("group\ts\t%s\n", gr->gr_name);
  else printf("group\ts\t%d\n", gid);
}
int main(int argc, char **argv) {
  struct stat sb;
  if(argc < 2) {
    fprintf(stderr, "Error: %s <PATH>\n", argv[0]);
    exit(-2);
  }
  if(lstat(argv[1], &sb) == 0) {
    if(sb.st_mode & S_IFLNK) {
      char tgt[MAXPATHLEN];
      if(readlink(argv[1], tgt, sizeof(tgt)) > 0) {
        printf("link\ts\t%s\n", tgt);
      }
    }
  }
  time_t now = time(NULL);
  if(stat(argv[1], &sb) == 0) {
    printf("exists\tL\t1\n");
#if defined(STAT_TIME_T)
#define PTIME(TYPE) do { \
    printf(#TYPE "time\tL\t%ld\n", sb.st_##TYPE##time); \
    printf(#TYPE "age\tL\t%ld\n", now - sb.st_##TYPE##time); \
} while(0)
#elif defined(STAT_TIMESPEC)
#define PTIME(TYPE) do { \
    printf(#TYPE "time\tL\t%ld\n", sb.st_##TYPE##timespec.tv_sec); \
    printf(#TYPE "age\tL\t%ld\n", now - sb.st_##TYPE##timespec.tv_sec); \
} while(0)
#else
#define PTIME(TYPE) do { \
    printf(#TYPE "time\tL\t%ld\n", sb.st_##TYPE##time.tv_sec); \
    printf(#TYPE "age\tL\t%ld\n", now - sb.st_##TYPE##time.tv_sec); \
} while(0)
#endif
    PTIME(m);
    PTIME(a);
    PTIME(c);
    printf("hardlinks\tL\t%lu\n", (unsigned long)sb.st_nlink);
    printf("size\tL\t%llu\n", (unsigned long long)sb.st_size);
    printf("permissions\ts\t%04o\n", 0xfff & sb.st_mode);
    printf("type\ts\t%c\n",
      S_ISREG(sb.st_mode) ? 'f' :
        S_ISDIR(sb.st_mode) ? 'd' :
          S_ISLNK(sb.st_mode) ? 'l' :
            S_ISBLK(sb.st_mode) ? 'b' :
              S_ISCHR(sb.st_mode) ? 'c' :
                S_ISFIFO(sb.st_mode) ? 'p' :
                  S_ISSOCK(sb.st_mode) ? 's' : '?');
    print_user(sb.st_uid);
    print_group(sb.st_gid);
  } else {
    printf("exists\tL\t1\n");
  }
}
