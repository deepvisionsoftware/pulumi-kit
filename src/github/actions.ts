import { ActionsOrganizationVariable } from '@pulumi/github';

import { type BaseContext } from '@/context.js';

type Context = BaseContext;

interface UseOrgVariableArgs {
  name: string;
  value: string;
}

/**
 * Creates a new organization variable with the given name and value.
 *
 * @param args - The arguments for creating the organization variable.
 * @param ctx - The Pulumi context object.
 *
 * @example
 * useOrgVariable({ name: 'MY_VAR', value: 'my-value' }, pulumi.getContext()); //
 */
export const useOrgVariable = (args: UseOrgVariableArgs, ctx: Context) => {
  const { rn } = ctx;

  const { name, value } = args;

  new ActionsOrganizationVariable(rn(['github', 'org', 'var', name]), {
    variableName: name,
    value,
    visibility: 'private',
  });
};
