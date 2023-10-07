import { v1 as Compute } from '@pulumi/google-native/compute';
import {
  BackendServiceCompressionMode,
  BackendServiceLoadBalancingScheme,
  RegionNetworkEndpointGroupNetworkEndpointType
} from '@pulumi/google-native/types/enums/compute/v1';
import { useManagedByDescription } from '@/helpers/description';
import { BaseContext, ContextWithGcp } from '@/context';
import { projects as GcpProjects } from '@pulumi/gcp';
import { Env } from "@/env";

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

  const neg = new Compute.RegionNetworkEndpointGroup(rn(['service', serviceName, 'gcp', 'neg', type]), {
    name: srn([serviceName, type]),
    description: useManagedByDescription(ctx),
    region,
    networkEndpointType: RegionNetworkEndpointGroupNetworkEndpointType.Serverless,
    cloudRun: {
      service: type === BackendType.HTTP ? srn(serviceName) : srn([serviceName, type]),
    },
  });

  const backend = new Compute.BackendService(rn(['service', serviceName, 'gcp', 'backend', type]), {
    name: srn([serviceName, type]),
    description: useManagedByDescription(ctx),
    // Global external HTTP(S) load balancer
    loadBalancingScheme: BackendServiceLoadBalancingScheme.ExternalManaged,
    backends: [{
      group: neg.selfLink,
    }],
    customRequestHeaders: [
      'X-Client-Geo-Country:{client_region}',
      'X-Client-Origin:{origin_request_header}',
    ],
    enableCDN: env !== Env.DEV,
    compressionMode: env !== Env.DEV ? BackendServiceCompressionMode.Automatic : undefined,
  });

  return backend;
};

interface EnableCloudRunPublicAccessArgs {
  project: string;
}
export const enableCloudRunPublicAccess = (args: EnableCloudRunPublicAccessArgs, ctx: Context) => {
  const {
    project,
  } = args;
  const {
    rn,
  } = ctx;

  new GcpProjects.IAMMember(rn(['root', 'gcp', 'project', project, 'cloudrun', 'public-access']), {
    project,
    role: 'roles/run.invoker',
    member: 'allUsers',
  });
}
