import { readFile } from 'node:fs/promises';

import { getStack } from '@pulumi/pulumi';

import { Env } from './env';
import { useResourceNameFactory } from './helpers/resource-names';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BaseContext<T = any> {
  /**
   * The current environment.
   */
  env: Env;

  /**
   * Package configuration.
   */
  package: PackageConfig;

  /**
   * Project-specific configuration.
   */
  project: T;

  /**
   * Returns a resource name based on the provided environment and name.
   * @param name - The name to use in the resource name.
   * @returns A resource name based on the provided environment and name.
   * @example rn('my-resource'); // my-resource:prod
   * @example rn(['my', 'resource']); // my/resource:prod
   */
  rn: (name: string | Array<string>) => string;

  /**
   * Returns a safe resource name based on the provided environment and name.
   * @param name - The name to use in the resource name.
   * @returns A safe resource name based on the provided environment and name.
   */
  srn: (name: string | Array<string>) => string;
}

/**
 * Configuration options for Google Cloud Platform (GCP).
 */
export interface GcpConfig {
  /**
   * The GCP project ID.
   * @example my-project-123456
   * */
  project: string;

  /**
   * The GCP region.
   * @example us-central1
   * */
  region: string;

  /**
   * The billing account ID.
   * @example 012345-ABCDEF-012345
   * */
  billingAccount?: string;

  /**
   * The GCP organization ID. Optional.
   * @example 582184023416
   *  */
  org?: string;
}

export interface ContextWithGcp {
  gcp: GcpConfig;
}

interface PackageConfig {
  /*
  * The name of the package.
  * @example @deep/pulumi-kit
  */
  version: string;

  /*
  * The description of the package.
  * @example Pulumi Kit for Deep Vision
  */
  description?: string;
}

export interface ServiceConfig {
  name: string;
  prefix: string;
  db?: {
    password: string;
  };
}
export interface ContextWithServices {
  services: Array<ServiceConfig>;
}

export const useBaseContext = async (): Promise<BaseContext> => {
  let stack = getStack();
  if (stack === 'master') {
    stack = Env.PROD;
  }
  const env = stack as Env;

  return {
    env,
    package: await usePackageConfig(),
    project: null,

    rn: useResourceNameFactory(env),
    srn: useResourceNameFactory(env, {
      isSafe: true,
    }),
  };
};

const usePackageConfig = async (): Promise<PackageConfig> => {
  const packageJson = await readFile('package.json', 'utf-8');

  return JSON.parse(packageJson);
};

