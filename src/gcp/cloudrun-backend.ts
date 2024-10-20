import {
  projects,
  compute,
} from '@pulumi/gcp';

import { BaseContext, ContextWithGcp } from '@/context';
import { Env } from '@/env';
import { useManagedByDescription } from '@/helpers/description';

enum BackendType {
  HTTP = 'http',
  WS = 'ws',
}

interface UseCloudRunBackendArgs {
  serviceName: string;
  type?: BackendType;
}

interface Context extends BaseContext, ContextWithGcp {}

export const useCloudRunBackend = (args: UseCloudRunBackendArgs, ctx: Context) => {
  const { serviceName, type = BackendType.HTTP } = args;
  const {
    gcp: { region },
    rn,
    srn,
    env,
  } = ctx;

  // Create Network Endpoint Group
  const neg = new compute.RegionNetworkEndpointGroup(rn(['service', serviceName, 'gcp', 'neg', type]), {
    name: srn([serviceName, type]),
    description: useManagedByDescription(ctx),
    region,
    networkEndpointType: 'SERVERLESS',
    cloudRun: {
      service: type === BackendType.HTTP ? srn(serviceName) : srn([serviceName, type]),
    },
  });

  // Create Backend Service and attach NEG
  const backend = new compute.BackendService(rn(['service', serviceName, 'gcp', 'backend', type]), {
    name: srn([serviceName, type]),
    description: useManagedByDescription(ctx),
    // Global external HTTP(S) load balancer
    loadBalancingScheme: 'EXTERNAL_MANAGED',
    backends: [{
      group: neg.selfLink,
    }],
    customRequestHeaders: [
      'X-Client-Geo-Country:{client_region}',
      'X-Client-Origin:{origin_request_header}',
    ],
    enableCdn: env !== Env.DEV,
    compressionMode: env !== Env.DEV ? 'AUTOMATIC' : undefined,
  }, {
    ignoreChanges: ['usedBy'],
  });

  return backend;
};

interface EnableCloudRunPublicAccessArgs {
  project: string;
}
export const enableCloudRunPublicAccess = (args: EnableCloudRunPublicAccessArgs, ctx: Context) => {
  const { project } = args;
  const { rn } = ctx;

  new projects.IAMMember(rn(['root', 'gcp', 'project', project, 'cloudrun', 'public-access']), {
    project,
    role: 'roles/run.invoker',
    member: 'allUsers',
  });
};
