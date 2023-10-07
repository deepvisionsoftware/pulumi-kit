import { readFile } from 'node:fs/promises';
import { getStack } from '@pulumi/pulumi';
import { Env } from './env';
import { useResourceNameFactory } from './helpers/resource-names';

export interface BaseContext<T = any> {
  // Current environment
  env: Env;
  // package.json
  package: PackageConfig;
  // Project Config
  project: T;

  // Create Resource name func
  rn: (name: string | Array<string>) => string;
  // Create Resource name func (safe)
  srn: (name: string | Array<string>) => string;
}

export interface GcpConfig {
  project: string;
  region: string;
  billingAccount?: string;
  org?: string;
}
export interface ContextWithGcp {
  gcp: GcpConfig;
}

interface PackageConfig {
  version: string;
  description?: string;
}

export interface ServiceConfig {
  name: string;
  prefix: string;
  db?: {
    password: string;
  }
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
}

