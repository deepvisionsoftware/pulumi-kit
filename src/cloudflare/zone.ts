import { Output } from '@pulumi/pulumi';
import { Record } from '@pulumi/cloudflare';
import { BaseContext } from '@/context';

interface CloudflareLink {
  zoneId: string;
  accountId: string;
}

enum DnsRecordType {
  A = 'A',
  CNAME = 'CNAME',
  TXT = 'TXT',
}
interface DnsRecord {
  name: string;
  type: DnsRecordType;
  value: string;
}

export interface CloudflareZone {
  name: string;
  hosting: 'cloudflare',
  cloudflare: CloudflareLink,
  records?: Array<DnsRecord>,
}

interface UseDnsRecordArgs {
  zone: CloudflareZone;
  type: string;
  name: string;
  value: string | Output<string>;
  proxied?: boolean;
}

export const useDnsRecord = (args: UseDnsRecordArgs, ctx: BaseContext) => {
  const {
    zone,
    type,
    name,
    value,
    proxied = false,
  } = args;
  const {
    rn,
  } = ctx;

  new Record(rn(['zone', zone.name, 'cf', type, name === '@' ? '_root' : name]), {
    zoneId: zone.cloudflare.zoneId,
    name: name === '@' ? zone.name : `${name}.${zone.name}`,
    value,
    type,
    proxied,
  });
}
