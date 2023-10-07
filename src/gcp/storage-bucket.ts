import { storage as GcpStorage } from '@pulumi/gcp';
import { v1 as Compute } from '@pulumi/google-native/compute';
import { v1 as Storage } from '@pulumi/google-native/storage';

import { BaseContext, ContextWithGcp } from '@/context';
import { Env } from '@/env';
import { useManagedByDescription } from '@/helpers/description';

interface UseStorageBucketArgs {
  name: string;
  prefix: string;
  location?: string;
  isPublic?: boolean;
  isCorsEnabled?: boolean;
  shouldCreateBackend?: boolean;
  customName?: string;
}

interface Context extends BaseContext, ContextWithGcp {}
export const useStorageBucket = (args: UseStorageBucketArgs, ctx: Context) => {
  const {
    name,
    prefix,
    isPublic = false,
    isCorsEnabled = false,
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

  const bucket = new Storage.Bucket(rn(['storage', 'gcp', 'bucket', prefix, name]), {
    name: customName ? customName : srn([prefix, name]),
    location: location.toUpperCase(),
    cors: corsSettings,
    iamConfiguration: {
      uniformBucketLevelAccess: {
        enabled: true,
      },
    },
  }, {
    ignoreChanges: ['etag', 'metageneration', 'updated'],
  });

  if (isPublic) {
    new GcpStorage.BucketIAMMember(rn(['storage', 'gcp', 'bucket', prefix, name, 'public-access']), {
      bucket: bucket.name,
      role: 'roles/storage.objectViewer',
      member: 'allUsers',
    });
    // new Storage.BucketIamMember(rn(['storage', 'gcp', 'bucket', prefix, name, 'public-access']), {
    //   name: bucket.name,
    //   role: 'roles/storage.objectViewer',
    //   member: 'allUsers',
    // });
  }

  let backend = undefined;
  if (shouldCreateBackend) {
    backend = new Compute.BackendBucket(rn(['storage', 'gcp', 'bucket', prefix, name, 'backend']), {
      name: srn(['bucket', name]),
      description: useManagedByDescription(ctx),
      bucketName: bucket.name,
      enableCdn: env === Env.PROD,
    });
  }

  return {
    backend,
  };
};
