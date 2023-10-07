import { Env } from '@/env';

interface UseResourceNameFactoryArgs {
  isSafe: boolean;
}

export const useResourceNameFactory = (env: Env, args?: UseResourceNameFactoryArgs) => (name: string | Array<string>): string => {
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

export const toDashCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};
