import { storage as GcpStorage } from '@pulumi/gcp';
import { v1 as Compute } from '@pulumi/google-native/compute';
import { v1 as Storage } from '@pulumi/google-native/storage';

import { BaseContext, ContextWithGcp } from '@/context';
import { Env } from '@/env';
import { useManagedByDescription } from '@/helpers/description';

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
   * The location of the storage bucket. Defaults to "US".
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
   * Whether to create a backend for the storage bucket. Defaults to true.
   * @example false
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
 * @returns An object containing the backend bucket if created.
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

  const corsSettings = isCorsEnabled ? [{
    origin: ['*'],
    method: ['*'],
    responseHeader: ['Content-Type'],
    maxAgeSeconds: 3600,
  }] : undefined;

  // Create google storage bucket
  const bucket = new Storage.Bucket(rn(['storage', 'gcp', 'bucket', prefix, name]), {
    name: customName ? customName : srn([prefix, name]),
    location: location.toUpperCase(),
    cors: corsSettings,
    iamConfiguration: {
      uniformBucketLevelAccess: {
        enabled: true,
      },
    },
    softDeletePolicy: isSoftDeleteEnabled ? {
      retentionDurationSeconds: '604800', // 7 days
    } : undefined,
  }, {
    ignoreChanges: ['etag', 'metageneration', 'updated'],
  });

  // Make bucket public
  if (isPublic) {
    new GcpStorage.BucketIAMMember(rn(['storage', 'gcp', 'bucket', prefix, name, 'public-access']), {
      bucket: bucket.name,
      role: 'roles/storage.objectViewer',
      member: 'allUsers',
    }, {
      dependsOn: [bucket],
    });
    // new Storage.BucketIamMember(rn(['storage', 'gcp', 'bucket', prefix, name, 'public-access']), {
    //   name: bucket.name,
    //   role: 'roles/storage.objectViewer',
    //   member: 'allUsers',
    // });
  }

  // Create backend for Load Balancer
  let backend = undefined;
  if (shouldCreateBackend) {
    backend = new Compute.BackendBucket(rn(['storage', 'gcp', 'bucket', prefix, name, 'backend']), {
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
    backend,
  };
};
