import { type BaseContext } from '@/context.js';

/**
 * Returns a description string indicating that the resource is managed by DeepOps.
 * @param ctx - The Pulumi context object.
 * @returns A string with the format "Managed by DeepOps [package description/version]".
 * @example useManagedByDescription(ctx); // Managed by DeepOps [Pulumi Kit for Deep Vision/1.0.0]
 */
export const useManagedByDescription = (ctx: BaseContext) => {
  return `Managed by DeepOps [${ctx.package.description}/${ctx.package.version}]`;
};

/**
 * Converts a dash-separated string to camelCase with spaces.
 * @param input - The string to convert.
 * @returns The converted string.
 * @example dashToCamelWithSpaces('my-string'); // My String
 */
export const dashToCamelWithSpaces = (input: string) => {
  return input
    .toLowerCase()
    .split('-')
    .map((it) => it.charAt(0).toUpperCase() + it.substring(1))
    .join(' ');
};
