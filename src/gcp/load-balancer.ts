import { v1 as CertificateManager } from '@pulumi/google-native/certificatemanager';
import { v1 as Compute } from '@pulumi/google-native/compute';
import {
  BackendBucket,
  BackendService,
  HttpRedirectActionRedirectResponseCode,
} from '@pulumi/google-native/compute/v1';
import { GlobalForwardingRuleLoadBalancingScheme } from '@pulumi/google-native/types/enums/compute/v1';
import { Output } from '@pulumi/pulumi';

import { CloudflareZone, useDnsRecord } from '@/cloudflare/zone';
import { BaseContext, ContextWithGcp } from '@/context';
import { useEnvSuffix } from '@/env';
import { useManagedByDescription } from '@/helpers/description';

/**
 * Represents a service that can be load balanced.
 */
export interface Service {
  /**
   * The subdomain of the service.
   * @example api
   */
  subdomain: string;
  /**
   * The Cloudflare zone that the service belongs to.
   */
  zone: CloudflareZone;
  /**
   * The backend service or bucket that the load balancer should route traffic to.
   */
  backend: BackendService | BackendBucket;
}

export interface Redirect {
  /**
   * The subdomain of the redirect.
   * @example www
   */
  subdomain: string;

  /**
   * The Cloudflare zone that the redirect belongs to.
   */
  zone: CloudflareZone;

  /**
   * The target URL to redirect to.
   * @example https://example.com
   */
  target: string;
}

interface UseLoadBalancerArgs {
  /**
   * The services to load balance.
   */
  services: Array<Service>;

  /**
   * The redirects to add to the load balancer.
   */
  redirects?: Array<Redirect>;

  /**
   * The default domain to redirect to if no host is specified.
   * @example hopetv.org
   */
  defaultDomain: string;

  /**
   * The alias IP address to use for the load balancer.
   * @example ?
   */
  ipAlias: string;

  /**
   * The IP address to use for the load balancer.
   */
  ip: Compute.GlobalAddress;

  /**
   * The ID of the load balancer.
   */
  id?: string;
}

interface UrlMapArgs {
  /**
   * The name of the URL map.
   */
  name: string;

  defaultUrlRedirect: {
    hostRedirect: string;
    stripQuery: boolean;
    redirectResponseCode: HttpRedirectActionRedirectResponseCode;
  };

  /**
   * The host rules for the URL map.
   */
  hostRules: Array<UrlHostRule>;

  /**
   * The path matchers for the URL map.
   */
  pathMatchers: Array<UrlPathMatcher>;

  /**
   * The description of the URL map.
   */
  description: string;
}

interface UrlHostRule {
  /**
   * The hosts to match.
   */
  hosts: Array<string>;
  /**
   * The name of the path matcher to use.
   */
  pathMatcher: string;
}

interface UrlPathMatcher {
  /**
   * The name of the path matcher.
   */
  name: string;

  /**
   * The default service to use if no path is matched.
   */
  defaultService?: Output<string>;

  /**
   * The default URL redirect to use if no path is matched.
   */
  defaultUrlRedirect?: {
    /**
     * The host to redirect to.
     * @example hopetv.org
     */
    hostRedirect: string;

    /**
     * Whether to strip the query string from the request.
     * @example false
     */
    stripQuery: boolean;

    /**
     * The response code to use.
     * @example 303
     */
    redirectResponseCode: HttpRedirectActionRedirectResponseCode;
  };
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a load balancer for the specified services and redirects.
 * @param args - The arguments for creating the load balancer.
 * @param ctx - The Pulumi context.
 */
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
    gcp: { project },
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

  // Create certificate map
  const certMapName = id;
  const certMap = new CertificateManager.CertificateMap(rn(['net', 'gcp', 'certmap', certMapName]), {
    name: `projects/${project}/locations/global/certificateMaps/${certMapName}`,
    description: useManagedByDescription(ctx),
    location: 'global',
    certificateMapId: certMapName,
  });

  // Create DNS records and certificates
  for (const service of services) {
    let subdomain = '';
    if (service.subdomain === '@') {
      subdomain = useEnvSuffix(env, '');
    } else {
      subdomain = `${service.subdomain}${useEnvSuffix(env, '.')}`;
    }

    // Create DNS record
    const fqdn = subdomain === '' ? service.zone.name : `${subdomain}.${service.zone.name}`;
    useDnsRecord({
      zone: service.zone,
      name: subdomain === '' ? '@' : subdomain,
      type: 'CNAME',
      value: ipAlias,
    }, ctx);

    // Create certificate
    await useCertificateWithLoadBalancer({
      domainName: fqdn,
      certMapName,
    }, ctx);

    // Create URL map
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

  // Create DNS records and certificates for redirects
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
    {
      ignoreChanges: urlMapIgnores,
    },
  );

  const httpsProxyName = id === 'primary' ? 'https' : `${id}-https`;
  const httpProxyName = id === 'primary' ? 'http' : `${id}-http`;

  // Create HTTPS load balancer
  const proxy = new Compute.TargetHttpsProxy(rn(['net', 'gcp', 'proxy', httpsProxyName]), {
    name: srn([httpsProxyName, 'proxy']),
    description: useManagedByDescription(ctx),
    urlMap: urlMap.id,
    certificateMap: certMap.name.apply((certMapName) => `//certificatemanager.googleapis.com/${certMapName}`),
  });

  // Create HTTPS forwarding rule
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

/**
 * Attaches a SSL certificate to a GCP load balancer.
 * @param args - The arguments needed to attach the certificate.
 * @param ctx - The Pulumi context object.
 */
export const useCertificateWithLoadBalancer = async (args: UseCertificateWithLoadBalancerArgs, ctx: Context) => {
  const { domainName, certMapName } = args;
  const { rn, gcp: { project } } = ctx;

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

  new CertificateManager.CertificateMapEntry(rn(['net', 'gcp', 'certmap', certMapName, domainName]), {
    certificateMapEntryId: safeDomainName,
    location: 'global',
    name: `${certMapName}/certificateMapEntries/${safeDomainName}`,
    certificateMapId: certMapName,
    certificates: [sslCert.name],
    hostname: domainName,
    description: useManagedByDescription(ctx),
  });
};
