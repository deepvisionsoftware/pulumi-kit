import { paramCase } from '@deep/text-kit';
import { DomainMapping } from '@pulumi/gcp/cloudrun';

import { BaseContext, ContextWithGcp } from '@/context';

interface UseCloudRunDomnainMappingArgs {
  domain: string;
  serviceName: string;
  projectId: string;
  location: string;
}

interface Context extends BaseContext, ContextWithGcp {}

export const useCloudRunDomainMapping = (args: UseCloudRunDomnainMappingArgs, ctx: Context) => {
  const {
    domain,
    serviceName,
    projectId,
    location,
  } = args;

  const { rn } = ctx;

  new DomainMapping(rn(['service', serviceName, 'gcp', 'domainmapping', paramCase(domain)]), {
    name: domain,
    location,
    metadata: {
      namespace: projectId,
    },
    spec: {
      routeName: serviceName,
    },
  });
};
