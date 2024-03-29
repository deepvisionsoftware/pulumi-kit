import { paramCase } from '@deep/text-kit';
import { DomainMapping } from '@pulumi/gcp/cloudrun';
import { CloudflareZone, useDnsRecord } from '@/cloudflare/zone';

import { BaseContext, ContextWithGcp } from '@/context';

interface UseCloudRunDomainMappingArgs {
  domain: string;
  serviceName: string;
  projectId?: string;
  location?: string;
}

interface Context extends BaseContext, ContextWithGcp {}

export const useCloudRunDomainMapping = (args: UseCloudRunDomainMappingArgs, ctx: Context) => {
  const {
    domain,
    serviceName,
    projectId = ctx.gcp.project,
    location = ctx.gcp.region,
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

interface UseCloudRunDomainMappingWithCloudflareArgs {
  name: string;
  zone: CloudflareZone;
  serviceName: string;
}

export const useCloudRunDomainMappingWithCloudflare = (args: UseCloudRunDomainMappingWithCloudflareArgs, ctx: Context) => {
  const {
    name,
    zone,
    serviceName,
  } = args;
  const {
    gcp: { project, region },
    rn,
  } = ctx;

  const fqdn = `${name}.${zone.name}`;

  useDnsRecord({
    zone: zone,
    name,
    type: 'CNAME',
    value: 'ghs.googlehosted.com.',
  }, ctx);

  new DomainMapping(rn(['service', serviceName, 'gcp', 'domainmapping', paramCase(fqdn)]), {
    name: fqdn,
    location: region,
    metadata: {
      namespace: project,
    },
    spec: {
      routeName: serviceName,
    },
  });
};


