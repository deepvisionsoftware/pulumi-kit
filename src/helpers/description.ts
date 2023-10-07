import { BaseContext } from '@/context';

export const useManagedByDescription = (ctx: BaseContext) => {
  return `Managed by DeepOps [${ctx.package.description}/${ctx.package.version}]`;
}

export const dashToCamelWithSpaces = (input: string) => {
  return input
    .toLowerCase()
    .split('-')
    .map(it => it.charAt(0).toUpperCase() + it.substring(1))
    .join(' ');
}
