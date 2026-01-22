import {
  compute,
  storage,
} from '@pulumi/gcp';

import { type BaseContext, type ContextWithGcp } from '@/context.js';
import { Env } from '@/env.js';
import { useManagedByDescription } from '@/helpers/description.js';

/**
 * Arguments for creating a GCP storage bucket.
 */
interface UseStorageBucketArgs {
  /**
   * The name of the storage bucket.
   * @example uploads
   */
  name: string;
  /**
   * A prefix to add to the name of the storage bucket.
   * @example hc
   */
  prefix: string;
  /**
   * The location of the storage bucket. Defaults to the GCP region from context.
   * @example US
   */
  location?: string;
  /**
   * Whether the storage bucket should be public. Defaults to false.
   * @example true
   */
  isPublic?: boolean;
  /**
   * Whether CORS should be enabled for the storage bucket. Defaults to false.
   * @example true
   */
  isCorsEnabled?: boolean;
  /**
   * Whether soft delete should be enabled for the storage bucket. Defaults to false.
   * @example true
   */
  isSoftDeleteEnabled?: boolean;
  /**
   * Whether to enable CDN for the storage bucket. Defaults to false.
   */
  isCdnEnabled?: boolean;
  /**
   * Whether to create a backend for the storage bucket. Defaults to false.
   * @example true
   */
  shouldCreateBackend?: boolean;
  /**
   * A custom name for the storage bucket. If provided, this will be used instead of the generated name.
   * @example sql-backups
   */
  customName?: string;
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a GCP storage bucket with optional public access and backend bucket.
 * @param args - The arguments for creating the storage bucket.
 * @param ctx - The Pulumi context object.
 * @returns An object containing the bucket and backend bucket if created.
 */
export const useStorageBucket = (args: UseStorageBucketArgs, ctx: Context) => {
  const {
    name,
    prefix,
    isPublic = false,
    isCdnEnabled = false,
    isCorsEnabled = false,
    isSoftDeleteEnabled = false,
    shouldCreateBackend = false,
    customName,
  } = args;
  const {
    rn,
    srn,
    env,
  } = ctx;

  const location = args.location ?? ctx.gcp.region;

  const corsSettings = isCorsEnabled
    ? [{
        origins: ['*'],
        methods: ['*'],
        responseHeaders: ['Content-Type'],
        maxAgeSeconds: 3600,
      }]
    : undefined;

  const bucket = new storage.Bucket(rn(['storage', 'gcp', 'bucket', prefix, name]), {
    name: customName ?? srn([prefix, name]),
    location: location.toUpperCase(),
    cors: corsSettings,
    uniformBucketLevelAccess: true,
    softDeletePolicy: isSoftDeleteEnabled
      ? { retentionDurationSeconds: 604800 } // 7 days
      : undefined,
  });

  if (isPublic) {
    new storage.BucketIAMMember(rn(['storage', 'gcp', 'bucket', prefix, name, 'public-access']), {
      bucket: bucket.name,
      role: 'roles/storage.objectViewer',
      member: 'allUsers',
    }, {
      dependsOn: [bucket],
    });
  }

  let backend: compute.BackendBucket | undefined;
  if (shouldCreateBackend) {
    backend = new compute.BackendBucket(rn(['storage', 'gcp', 'bucket', prefix, name, 'backend']), {
      name: srn(['bucket', name]),
      description: useManagedByDescription(ctx),
      bucketName: bucket.name,
      enableCdn: env === Env.PROD || isCdnEnabled,
      customResponseHeaders: [
        'Cache-Status: {cdn_cache_status}',
      ],
    }, {
      dependsOn: [bucket],
    });
  }

  return {
    bucket,
    backend,
  };
};
