import { Env } from '@/env.js';

interface UseResourceNameFactoryArgs {
  isSafe: boolean;
}

/**
 * Returns a function that generates a resource name based on the provided environment and name.
 * @param env - The environment to use in the resource name.
 * @param args - Optional arguments to configure the resource name generation.
 * @returns A function that generates a resource name based on the provided environment and name.
 * @example
 * const rn = useResourceNameFactory(Env.PROD);
 * rn('my-resource'); // my-resource:prod
 * rn(['my', 'resource']); // my/resource:prod
 *
 * const rn = useResourceNameFactory(Env.PROD, { isSafe: true });
 * rn('my-resource'); // my-resource-prod
 */
export const useResourceNameFactory = (env: Env, args?: UseResourceNameFactoryArgs) => (name: string | string[]): string => {
  const { isSafe = false } = args || {
  };

  const nameSeparator = isSafe ? '-' : '/';
  const envSeparator = isSafe ? '-' : ':';

  let computedName = Array.isArray(name) ? name.join(nameSeparator) : name;
  if (env !== Env.PROD) {
    computedName += envSeparator + env;
  }

  return computedName;
};

/**
 * Converts a string to dash case.
 * @param str - The string to convert.
 * @returns The converted string in dash case.
 * @example
 * toDashCase('myString'); // my-string
 * toDashCase('my string'); // my-string
 */
export const toDashCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};
