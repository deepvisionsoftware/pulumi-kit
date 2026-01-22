import {
  compute,
} from '@pulumi/gcp';

import { type CloudflareZone, useDnsRecord } from '@/cloudflare/zone.js';
import { type BaseContext, type ContextWithGcp } from '@/context.js';

interface UsePublicIpArgs {
  id?: string;
  technicalZone: CloudflareZone;
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a new global IP address and DNS record for it.
 * @param args - The arguments for creating the public IP.
 * @param ctx - The Pulumi context object.
 * @returns An object containing the IP address and its DNS alias.
 */
export const usePublicIp = (args: UsePublicIpArgs, ctx: Context) => {
  const { id = 'primary', technicalZone } = args;
  const {
    rn,
    srn,
    gcp: { project },
  } = ctx;

  const ip = new compute.GlobalAddress(rn(['net', 'gcp', 'ip', id]), {
    name: srn(['ip', id]),
  }, {
    deleteBeforeReplace: true,
    ignoreChanges: ['address', 'labelFingerprint'],
  });

  const alias = `${id}.${project}.gcloud`;

  useDnsRecord({
    zone: technicalZone,
    name: alias,
    type: 'A',
    value: ip.address,
  }, ctx);

  return {
    ip,
    alias: `${alias}.${technicalZone.name}`,
  };
};
