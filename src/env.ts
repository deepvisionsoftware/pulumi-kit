/**
 * Enum representing the different environments.
 */
export enum Env {
  DEV = 'dev',
  STAGE = 'stage',
  PROD = 'prod',
}

/**
 * Returns a string suffix based on the provided environment.
 * @param env - The environment to use for the suffix.
 * @param separator - The separator to use between the suffix and the rest of the string.
 * @param skipStage - Whether to skip adding the suffix for the STAGE environment.
 * @returns The suffix string.
 *
 * @example useEnvSuffix(Env.PROD) // ''
 * @example useEnvSuffix(Env.STAGE) // '-stage'
 * @example useEnvSuffix(Env.DEV, '_') // '_dev'
 */
export const useEnvSuffix = (env: Env, separator = '-', skipStage = false) => {
  if (env === Env.PROD) {
    return '';
  }

  if (env === Env.STAGE && skipStage) {
    return '';
  }

  return separator + env;
};
