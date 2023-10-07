import { v1 as Compute } from '@pulumi/google-native/compute';

import { CloudflareZone, useDnsRecord } from '@/cloudflare/zone';
import { BaseContext, ContextWithGcp } from '@/context';

interface UsePublicIpArgs {
  id?: string;
  technicalZone: CloudflareZone;
}

interface Context extends BaseContext, ContextWithGcp {}

export const usePublicIp = (args: UsePublicIpArgs, ctx: Context) => {
  const { id = 'primary', technicalZone } = args;
  const {
    rn,
    srn,
    gcp: { project },
  } = ctx;

  const ip = new Compute.GlobalAddress(rn(['net', 'gcp', 'ip', id]), {
    name: srn(['ip', id]),
  }, {
    deleteBeforeReplace: true,
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
