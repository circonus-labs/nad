/*
 * CDDL HEADER START
 *
 * The contents of this file are subject to the terms of the
 * Common Development and Distribution License (the "License").
 * You may not use this file except in compliance with the License.
 *
 * You can obtain a copy of the license at usr/src/OPENSOLARIS.LICENSE
 * or http://www.opensolaris.org/os/licensing.
 * See the License for the specific language governing permissions
 * and limitations under the License.
 *
 * When distributing Covered Code, include this CDDL HEADER in each
 * file and include the License file at usr/src/OPENSOLARIS.LICENSE.
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
 *
 * CDDL HEADER END
 */

/*
 * Copyright (c) 2005, 2010, Oracle and/or its affiliates. All rights reserved.
 * Copyright (c) 2013 by Delphix. All rights reserved.
 * Copyright 2011 Nexenta Systems, Inc.  All rights reserved.
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 * Copyright (c) 2012, Martin Matuska <mm@FreeBSD.org>. All rights reserved.
 */

#ifndef ZFS_HACK_H
#define ZFS_HACK_H

/* Just Enough libzfs... Ugh. */

#define HAVE_LOGICAL_USED
#define	MAXNAMELEN	256     /* from zfsimpl.h */
#define ZFS_MAXNAMELEN          MAXNAMELEN

typedef enum {
        ZFS_TYPE_FILESYSTEM     = 0x1,
        ZFS_TYPE_SNAPSHOT       = 0x2,
        ZFS_TYPE_VOLUME         = 0x4,
        ZFS_TYPE_POOL           = 0x8
} zfs_type_t;

typedef enum {
        ZFS_PROP_TYPE,
        ZFS_PROP_CREATION,
        ZFS_PROP_USED,
        ZFS_PROP_AVAILABLE,
        ZFS_PROP_REFERENCED,
        ZFS_PROP_COMPRESSRATIO,
        ZFS_PROP_MOUNTED,
        ZFS_PROP_ORIGIN,
        ZFS_PROP_QUOTA,
        ZFS_PROP_RESERVATION,
        ZFS_PROP_VOLSIZE,
        ZFS_PROP_VOLBLOCKSIZE,
        ZFS_PROP_RECORDSIZE,
        ZFS_PROP_MOUNTPOINT,
        ZFS_PROP_SHARENFS,
        ZFS_PROP_CHECKSUM,
        ZFS_PROP_COMPRESSION,
        ZFS_PROP_ATIME,
        ZFS_PROP_DEVICES,
        ZFS_PROP_EXEC,
        ZFS_PROP_SETUID,
        ZFS_PROP_READONLY,
        ZFS_PROP_ZONED,
        ZFS_PROP_SNAPDIR,
        ZFS_PROP_ACLMODE,
        ZFS_PROP_ACLINHERIT,
        ZFS_PROP_CREATETXG,             /* not exposed to the user */
        ZFS_PROP_NAME,                  /* not exposed to the user */
        ZFS_PROP_CANMOUNT,
        ZFS_PROP_ISCSIOPTIONS,          /* not exposed to the user */
        ZFS_PROP_XATTR,
        ZFS_PROP_NUMCLONES,             /* not exposed to the user */
        ZFS_PROP_COPIES,
        ZFS_PROP_VERSION,
        ZFS_PROP_UTF8ONLY,
        ZFS_PROP_NORMALIZE,
        ZFS_PROP_CASE,
        ZFS_PROP_VSCAN,
        ZFS_PROP_NBMAND,
        ZFS_PROP_SHARESMB,
        ZFS_PROP_REFQUOTA,
        ZFS_PROP_REFRESERVATION,
        ZFS_PROP_GUID,
        ZFS_PROP_PRIMARYCACHE,
        ZFS_PROP_SECONDARYCACHE,
        ZFS_PROP_USEDSNAP,
        ZFS_PROP_USEDDS,
        ZFS_PROP_USEDCHILD,
        ZFS_PROP_USEDREFRESERV,
        ZFS_PROP_USERACCOUNTING,        /* not exposed to the user */
        ZFS_PROP_STMF_SHAREINFO,        /* not exposed to the user */
        ZFS_PROP_DEFER_DESTROY,
        ZFS_PROP_USERREFS,
        ZFS_PROP_LOGBIAS,
        ZFS_PROP_UNIQUE,                /* not exposed to the user */
        ZFS_PROP_OBJSETID,              /* not exposed to the user */
        ZFS_PROP_DEDUP,
        ZFS_PROP_MLSLABEL,
        ZFS_PROP_SYNC,
        ZFS_PROP_REFRATIO,
        ZFS_PROP_WRITTEN,
        ZFS_PROP_CLONES,
        ZFS_PROP_LOGICALUSED,
        ZFS_PROP_LOGICALREFERENCED,
        ZFS_PROP_INCONSISTENT,          /* not exposed to the user */
        ZFS_NUM_PROPS
} zfs_prop_t;

typedef enum {
        ZPROP_SRC_NONE = 0x1,
        ZPROP_SRC_DEFAULT = 0x2,
        ZPROP_SRC_TEMPORARY = 0x4,
        ZPROP_SRC_LOCAL = 0x8,
        ZPROP_SRC_INHERITED = 0x10,
        ZPROP_SRC_RECEIVED = 0x20
} zprop_source_t;

/*
 * Basic handle types
 */
typedef struct zfs_handle zfs_handle_t;
typedef struct zpool_handle zpool_handle_t;
typedef struct libzfs_handle libzfs_handle_t;

/*
 * Library initialization
 */
extern libzfs_handle_t *libzfs_init(void);
extern void libzfs_fini(libzfs_handle_t *);
extern void zfs_close(zfs_handle_t *);

extern int zfs_prop_get_numeric(zfs_handle_t *, zfs_prop_t, uint64_t *,
    zprop_source_t *, char *, size_t);
extern zfs_handle_t *zfs_path_to_zhandle(libzfs_handle_t *, char *, zfs_type_t);

#endif
