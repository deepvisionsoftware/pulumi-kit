import { v1 as Iam } from '@pulumi/google-native/iam';
// import { v3 as CloudResourceManager } from '@pulumi/google-native/cloudresourcemanager';
import { projects as GcpProjects } from '@pulumi/gcp';
import { dashToCamelWithSpaces, useManagedByDescription } from '@/helpers/description';
import { BaseContext, ContextWithGcp } from '@/context';
import pulumi from '@pulumi/pulumi';

interface UseServiceAccountArgs {
  name: string;
  displayName?: string;
  project: string;
  roles: Array<string>;
}

interface Context extends BaseContext, ContextWithGcp {}

export const useServiceAccount = (args: UseServiceAccountArgs, ctx: Context, deps: pulumi.Resource[] = []) => {
  const {
    name,
    displayName = `${dashToCamelWithSpaces(name)} Service`,
    project,
    roles,
  } = args;
  const { rn } = ctx;

  const serviceAccount = new Iam.ServiceAccount(rn(['iam', 'gcp', 'sa', project, name]), {
    accountId: name,
    description: useManagedByDescription(ctx),
    displayName,
    project,
  }, {
    dependsOn: deps,
  });

  for (const role of roles) {
    // TODO: temporary use Legacy GCP provider, while CloudResourceManager not working properly
    // https://github.com/pulumi/pulumi-google-native/issues/714
    new GcpProjects.IAMMember(rn(['iam', 'gcp', 'sa', project, name, 'role', role]), {
      project,
      role: `roles/${role}`,
      member: serviceAccount.email.apply((email) => `serviceAccount:${email}`),
    });
    // new CloudResourceManager.ProjectIamMember(rn(['sa', name, 'role', role]), {
    //   name: `projects/${ctx.gcp.project}/roles/${role}`,
    //   role: `roles/${role}`,
    //   member: serviceAccount.email.apply((email) => `serviceAccount:${email}`),
    // });
  }

  return serviceAccount;
};

interface GrantServiceAccountRolesArgs {
  roles: Array<string>;
  serviceAccountEmail: string;
  project: string;
  customResourceName?: string;
}
export const grantServiceAccountRoles = (args: GrantServiceAccountRolesArgs, ctx: Context, deps: pulumi.Resource[] = []) => {
  const {
    roles,
    serviceAccountEmail,
    project,
    customResourceName = null,
  } = args;
  const { rn } = ctx;

  let name = customResourceName;
  if (!name) {
    [name] = serviceAccountEmail.split('@');
  }

  for (const role of roles) {
    // TODO: temporary use Legacy GCP provider, while CloudResourceManager not working properly
    // https://github.com/pulumi/pulumi-google-native/issues/714
    new GcpProjects.IAMMember(rn(['iam', 'gcp', 'sa', project, name, 'role', role]), {
      project,
      role: `roles/${role}`,
      member: `serviceAccount:${serviceAccountEmail}`,
    });
    // new CloudResourceManager.ProjectIamMember(rn(['sa', name, 'role', role]), {
    //   name: `projects/${ctx.gcp.project}/roles/${role}`,
    //   role: `roles/${role}`,
    //   member: serviceAccount.email.apply((email) => `serviceAccount:${email}`),
    // });
  }
}
