import { Record } from '@pulumi/cloudflare';
import { Output } from '@pulumi/pulumi';

import { BaseContext } from '@/context';

/**
 * Represents a link between a Cloudflare zone and its account.
 */
interface CloudflareLink {
  /**
   * The ID of the Cloudflare zone.
   * @example 1234567890abcdef1234567890abcdef
   */
  zoneId: string;

  /**
   * The ID of the Cloudflare account.
   * @example 1234567890abcdef1234567890abcdef
   */
  accountId: string;
}

/**
 * Enum representing the type of DNS record.
 */
enum DnsRecordType {
  /**
   * A DNS record that maps a domain name to an IPv4 address.
   */
  A = 'A',
  /**
   * A DNS record that maps a domain name to another domain name.
   */
  CNAME = 'CNAME',
  /**
   * A DNS record that contains arbitrary text.
   */
  TXT = 'TXT',
}

/**
 * Represents a DNS record in a Cloudflare zone.
 */
interface DnsRecord {
  /**
   * The name of the DNS record.
   * @example api
   */
  name: string;
  /**
   * The type of the DNS record.
   * @example A
   */
  type: DnsRecordType;
  /**
   * The value of the DNS record.
   * @example 93.234.22.44
   */
  value: string;
}

/**
 * Represents a Cloudflare zone.
 */
export interface CloudflareZone {
  /**
   * The name of the zone.
   * @example hopetv.org
   */
  name: string;
  /**
   * The hosting provider for the zone, which should always be 'cloudflare'.
   */
  hosting: 'cloudflare';
  /**
   * The Cloudflare link for the zone.
   */
  cloudflare: CloudflareLink;
  /**
   * An optional array of DNS records associated with the zone.
   */
  records?: Array<DnsRecord>;
}

/**
 * Arguments for creating a DNS record in a Cloudflare zone.
 */
interface UseDnsRecordArgs {
  /**
   * The Cloudflare zone that the DNS record belongs to.
   */
  zone: CloudflareZone;

  /**
   * The type of DNS record to create.
   * @example A
   */
  type: string;

  /**
   * The name of the DNS record.
   * @example api
   */
  name: string;

  /**
   * The value of the DNS record.
   * @example 93.234.22.44
   */
  value: string | Output<string>;

  /**
   * Whether or not the DNS record should be proxied through Cloudflare.
   */
  proxied?: boolean;
  /**
   * Comment to associate with the DNS record.
   */
  comment?: string;
}

/**
 * Creates a new DNS record for a Cloudflare zone.
 * @param args - The arguments for creating the DNS record.
 * @param ctx - The context for creating the DNS record.
 */
export const useDnsRecord = (args: UseDnsRecordArgs, ctx: BaseContext) => {
  const {
    zone,
    type,
    name,
    value,
    proxied = false,
    comment,
  } = args;
  const { rn } = ctx;

  new Record(rn(['zone', zone.name, 'cf', type, name === '@' ? '_root' : name]), {
    zoneId: zone.cloudflare.zoneId,
    name: name === '@' ? zone.name : `${name}.${zone.name}`,
    content: value,
    type,
    proxied,
    comment,
  });
};
