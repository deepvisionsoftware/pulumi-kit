import { ActionsOrganizationVariable } from '@pulumi/github';

import { BaseContext } from '@/context';

interface Context extends BaseContext {}

interface UseOrgVariableArgs {
  name: string;
  value: string;
}
export const useOrgVariable = (args: UseOrgVariableArgs, ctx: Context) => {
  const { rn } = ctx;

  const { name, value } = args;

  new ActionsOrganizationVariable(rn(['github', 'org', 'var', name]), {
    variableName: name,
    value,
    visibility: 'private',
  });
};
