import { ContextWithServices, ServiceConfig } from '@/context';
import { Env } from '@/env';

/**
 * Returns the service configuration object with the given name, if it exists in the provided context.
 * @param name - The name of the service to retrieve.
 * @param ctx - The context object containing the list of services to search.
 * @returns The service configuration object with the given name, or undefined if it does not exist.
 * @example
 * getServiceByName('my-service', ctx); // { name: 'my-service', ... }
 */
export const getServiceByName = (name: string, ctx: ContextWithServices): ServiceConfig | undefined => {
  return ctx.services.find((service) => service.name === name);
};

/**
 * Arguments for building a service endpoint.
 */
interface BuildServiceEndpointArgs {
  /**
   * The name of the service endpoint.
   * @example auth
   */
  name: string;

  /**
   * The environment for the service endpoint.
   * @example dev
   */
  env: string;

  /**
   * The domain for the service endpoint.
   * @example deepvision.cloud
   */
  domain: string;
}

/**
 * Builds a service endpoint based on the provided arguments.
 * @param args - The arguments needed to build the service endpoint.
 * @returns The service endpoint as a string.
 *
 * @example
 * buildServiceEndpoint({
 *   name: 'my-service',
 *   env: Env.DEV,
 *   domain: 'example.com',
 * }); // my-service.dev.example.com
 */
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
};
