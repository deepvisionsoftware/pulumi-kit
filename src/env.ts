export enum Env {
  DEV = 'dev',
  STAGE = 'stage',
  PROD = 'prod',
}

export const useEnvSuffix = (env: Env, separator = '-', skipStage = false) => {
  if (env === Env.PROD) {
    return '';
  }

  if (env === Env.STAGE && skipStage) {
    return '';
  }

  return separator + env;
};
