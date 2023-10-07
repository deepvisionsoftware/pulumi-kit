import { BaseContext } from '@/context';
import { ActionsOrganizationVariable } from '@pulumi/github';

interface Context extends BaseContext {}

interface UseOrgVariableArgs {
  name: string;
  value: string;
}
export const useOrgVariable = (args: UseOrgVariableArgs, ctx: Context) => {
  const {
    rn,
  } = ctx;

  const {
    name,
    value
  } = args;

  const variable = new ActionsOrganizationVariable(rn(['github', 'org', 'var', name]), {
    variableName: name,
    value,
    visibility: 'private',
  });



}
