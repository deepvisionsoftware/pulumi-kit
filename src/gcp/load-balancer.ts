import { Output } from '@pulumi/pulumi';
import {
  BackendBucket,
  BackendService,
  HttpRedirectActionRedirectResponseCode,
} from '@pulumi/google-native/compute/v1';
import { v1 as Compute } from '@pulumi/google-native/compute';
import { v1 as CertificateManager } from '@pulumi/google-native/certificatemanager';
import { GlobalForwardingRuleLoadBalancingScheme } from '@pulumi/google-native/types/enums/compute/v1';
import { useEnvSuffix } from '@/env';
import { useManagedByDescription } from '@/helpers/description';
import { CloudflareZone, useDnsRecord } from '@/cloudflare/zone';
import { BaseContext, ContextWithGcp } from '@/context';

export interface Service {
  subdomain: string;
  zone: CloudflareZone;
  backend: BackendService | BackendBucket;
}
export interface Redirect {
  subdomain: string;
  zone: CloudflareZone;
  target: string;
}

interface UseLoadBalancerArgs {
  services: Array<Service>;
  redirects?: Array<Redirect>;
  defaultDomain: string;
  ipAlias: string;
  ip: Compute.GlobalAddress;
  id?: string;
}
interface UrlMapArgs {
  name: string;
  defaultUrlRedirect: {
    hostRedirect: string;
    stripQuery: boolean;
    redirectResponseCode: HttpRedirectActionRedirectResponseCode;
  };
  hostRules: Array<UrlHostRule>,
  pathMatchers: Array<UrlPathMatcher>,
  description: string;
}
interface UrlHostRule {
  hosts: Array<string>;
  pathMatcher: string;
}
interface UrlPathMatcher {
  name: string;
  defaultService?: Output<string>;
  defaultUrlRedirect?: {
    hostRedirect: string;
    stripQuery: boolean;
    redirectResponseCode: HttpRedirectActionRedirectResponseCode;
  };
}

interface Context extends BaseContext, ContextWithGcp {}

export const useLoadBalancer = async (args: UseLoadBalancerArgs, ctx: Context) => {
  const {
    defaultDomain,
    services,
    redirects = [],
    ipAlias,
    ip,
    id = 'primary',
  } = args;
  const {
    env,
    gcp: {
      project,
    },
    rn,
    srn,
  } = ctx;
  const urlMapArgs: UrlMapArgs = {
    name: srn(['urlmap', id]),
    defaultUrlRedirect: {
      hostRedirect: defaultDomain,
      stripQuery: false,
      redirectResponseCode: HttpRedirectActionRedirectResponseCode.SeeOther,
    },
    hostRules: [],
    pathMatchers: [],
    description: useManagedByDescription(ctx),
  };

  const certMapName = id;
  const certMap = new CertificateManager.CertificateMap(rn(['net', 'gcp', 'certmap', certMapName]), {
    name: `projects/${project}/locations/global/certificateMaps/${certMapName}`,
    description: useManagedByDescription(ctx),
    location: 'global',
    certificateMapId: certMapName,
  });

  for (const service of services) {
    let subdomain = '';
    if (service.subdomain === '@') {
      subdomain = useEnvSuffix(env, '');
    } else {
      subdomain = `${service.subdomain}${useEnvSuffix(env, '.')}`;
    }
    const fqdn = subdomain === '' ? service.zone.name : `${subdomain}.${service.zone.name}`;
    useDnsRecord({
      zone: service.zone,
      name: subdomain === '' ? '@' : subdomain,
      type: 'CNAME',
      value: ipAlias,
    }, ctx);
    await useCertificateWithLoadBalancer({
      domainName: fqdn,
      certMapName,
    }, ctx);

    const pathName = service.subdomain === '@' ? 'root' : service.subdomain;
    urlMapArgs.hostRules.push({
      pathMatcher: pathName,
      hosts: [fqdn],
    });
    urlMapArgs.pathMatchers.push({
      name: pathName,
      defaultService: service.backend.id,
    });
  }

  for (const redirect of redirects) {
    const subdomain = `${redirect.subdomain}${useEnvSuffix(env, '.')}`;
    const fqdn = subdomain === '' ? redirect.zone.name : `${subdomain}.${redirect.zone.name}`;
    useDnsRecord({
      zone: redirect.zone,
      name: subdomain,
      type: 'CNAME',
      value: ipAlias,
    }, ctx);
    await useCertificateWithLoadBalancer({
      domainName: fqdn,
      certMapName,
    }, ctx);

    const pathName = redirect.subdomain;
    urlMapArgs.hostRules.push({
      pathMatcher: pathName,
      hosts: [fqdn],
    });
    urlMapArgs.pathMatchers.push({
      name: pathName,
      defaultUrlRedirect: {
        hostRedirect: redirect.target,
        stripQuery: false,
        redirectResponseCode: HttpRedirectActionRedirectResponseCode.SeeOther,
      },
    });
  }

  const urlMapIgnores = ['fingerprint'];
  if (services.length === 0) {
    urlMapIgnores.push('hostRules');
    urlMapIgnores.push('pathMatchers');
  }
  const urlMap = new Compute.UrlMap(
    rn(['net', 'gcp', 'urlmap', id]),
    urlMapArgs,
    { ignoreChanges: urlMapIgnores }
  );

  const httpsProxyName = id === 'primary' ? 'https' : `${id}-https`;
  const httpProxyName = id === 'primary' ? 'http' : `${id}-http`;

  const proxy = new Compute.TargetHttpsProxy(rn(['net', 'gcp', 'proxy', httpsProxyName]), {
    name: srn([httpsProxyName, 'proxy']),
    description: useManagedByDescription(ctx),
    urlMap: urlMap.id,
    certificateMap: certMap.name.apply((certMapName) => `//certificatemanager.googleapis.com/${certMapName}`),
  });
  new Compute.GlobalForwardingRule(rn(['net', 'gcp', 'fwd', httpsProxyName]), {
    name: srn([httpsProxyName, 'fwd']),
    description: useManagedByDescription(ctx),
    // Global external HTTP(S) load balancer
    loadBalancingScheme: GlobalForwardingRuleLoadBalancingScheme.ExternalManaged,
    target: proxy.id,
    ipAddress: ip.id,
    portRange: '443',
  });

  // HTTP redirect
  const urlMapHttp = new Compute.UrlMap(rn(['net', 'gcp', 'urlmap', `${id}-http`]), {
    name: srn(['urlmap', `${id}-http`]),
    description: useManagedByDescription(ctx),
    defaultUrlRedirect: {
      httpsRedirect: true,
      stripQuery: false,
    },
  });
  const proxyHttp = new Compute.TargetHttpProxy(rn(['net', 'gcp', 'proxy', httpProxyName]), {
    name: srn([httpProxyName, 'proxy']),
    description: useManagedByDescription(ctx),
    urlMap: urlMapHttp.id,
  });
  new Compute.GlobalForwardingRule(rn(['net', 'gcp', 'fwd', httpProxyName]), {
    name: srn([httpProxyName, 'fwd']),
    description: useManagedByDescription(ctx),
    // Global external HTTP load balancer
    loadBalancingScheme: GlobalForwardingRuleLoadBalancingScheme.ExternalManaged,
    target: proxyHttp.id,
    ipAddress: ip.id,
    portRange: '80',
  });
};

interface UseCertificateWithLoadBalancerArgs {
  domainName: string;
  certMapName: string;
}
export const useCertificateWithLoadBalancer = async (args: UseCertificateWithLoadBalancerArgs, ctx: Context) => {
  const {
    domainName,
    certMapName,
  } = args;
  const {
    rn,
    gcp: { project },
  } = ctx;

  const safeDomainName = domainName.replace(/\./g, '-');

  const sslCert = new CertificateManager.Certificate(rn(['net', 'gcp', 'cert', domainName]), {
    certificateId: safeDomainName,
    location: 'global',
    name: `projects/${project}/locations/global/certificates/${safeDomainName}`,
    description: useManagedByDescription(ctx),
    managed: {
      domains: [domainName],
    },
  }, {
    // issue with refreshing the Certificate
    // https://github.com/pulumi/pulumi-google-native/issues/479
    ignoreChanges: ['managed'],
  });

  new CertificateManager.CertificateMapEntry(rn(['net', 'gcp', 'certmap', certMapName,  domainName]), {
    certificateMapEntryId: safeDomainName,
    location: 'global',
    name: `${certMapName}/certificateMapEntries/${safeDomainName}`,
    certificateMapId: certMapName,
    certificates: [sslCert.name],
    hostname: domainName,
    description: useManagedByDescription(ctx),
  });
}
