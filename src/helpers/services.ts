import { ContextWithServices } from '@/context';
import { Env } from '@/env';

export const getServiceByName = (name: string, ctx: ContextWithServices) => {
  return ctx.services.find((service) => service.name === name);
}

interface BuildServiceEndpointArgs {
  name: string;
  env: string;
  domain: string;
}
export const buildServiceEndpoint = (args: BuildServiceEndpointArgs) => {
  const {
    name,
    env,
    domain,
  } = args;

  const endpoint = [name];
  if (env !== Env.PROD) {
    endpoint.push(env);
  }
  endpoint.push(domain);

  return endpoint.join('.');
}
