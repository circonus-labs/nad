#include <stdio.h>
#include <stdlib.h>
#include <devstat.h>

#define MAXSHOWDEVS 1024

void dump(struct devstat *d) {
  if(d->device_type != DEVSTAT_TYPE_DIRECT &&
     d->device_type != DEVSTAT_TYPE_IF_SCSI &&
     d->device_type != DEVSTAT_TYPE_IF_IDE)
    return;
#define FMT(name, type, fmt, cast, el) printf("%s%d`%s\t" #type "\t" #fmt "\n", d->device_name, d->device_number, #name, (cast)d->el)
        FMT(reads, L, %llu, unsigned long long, operations[DEVSTAT_READ]);
        FMT(nread, L, %llu, unsigned long long, bytes[DEVSTAT_READ]);
        FMT(writes, L, %llu, unsigned long long, operations[DEVSTAT_WRITE]);
        FMT(nwritten, L, %llu, unsigned long long, bytes[DEVSTAT_WRITE]);
        printf("%s%d`qlen\tl\t%d\n", d->device_name, d->device_number, d->start_count - d->end_count);
}

int main() {
  int i, nstats, rv;
  struct statinfo *stats;
  struct device_selection *dev_select;
  long generation;
  int num_devices, num_selected;
  int num_selections;
  long select_generation;

  if(devstat_checkversion(NULL) != 0) {
    printf("error\ts\t%s\n", devstat_errbuf);
    return -1;
  }
  nstats = devstat_getnumdevs(NULL);
  stats = calloc(sizeof(*stats), nstats);
  for(i=0;i<nstats-1;i++)
    stats[i].dinfo = calloc(sizeof(*(stats[i].dinfo)), 1);
  rv = devstat_getdevs(NULL, stats);
  if(rv < 0) {
    printf("error\ts\t%s\n", devstat_errbuf);
    return -1;
  }

  generation = 0;
  num_devices = 0;
  num_selected = 0;
  num_selections = 0;
  select_generation = 0;

  num_devices = stats->dinfo->numdevs;
  generation = stats->dinfo->generation;

  dev_select = NULL;

  /*
   * At this point, selectdevs will almost surely indicate that the
   * device list has changed, so we don't look for return values of 0
   * or 1.  If we get back -1, though, there is an error.
   */
  if (devstat_selectdevs(&dev_select, &num_selected, &num_selections,
      &select_generation, generation, stats->dinfo->devices, num_devices,
      NULL, 0, NULL, 0, DS_SELECT_ADD, MAXSHOWDEVS, 0) == -1) {
    printf("error\ts\t%s\n", "devlist changed");
    return -1;
  }

  rv = devstat_getdevs(NULL, stats);
  if(rv != 0) {
    printf("error\ts\t%s\n", devstat_errbuf);
    return -1;
  }

  for(i=0;i<num_selected-1;i++) {
    int ndev;

    for(ndev=0;ndev<stats[i].dinfo->numdevs;ndev++) {
      struct devstat *c = &stats[i].dinfo->devices[ndev];
      dump(c);
    }
  }
  return 0;
}
