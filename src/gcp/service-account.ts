// import { v3 as CloudResourceManager } from '@pulumi/google-native/cloudresourcemanager';
import { projects as GcpProjects } from '@pulumi/gcp';
import { v1 as Iam } from '@pulumi/google-native/iam';
import pulumi from '@pulumi/pulumi';

import { BaseContext, ContextWithGcp } from '@/context';
import { dashToCamelWithSpaces, useManagedByDescription } from '@/helpers/description';

/**
 * Arguments for creating a new service account.
 */
interface UseServiceAccountArgs {
  /**
   * The name of the service account.
   * @example web-app
   */
  name: string;

  /**
   * The display name of the service account.
   * @example Web App Service Account
   */
  displayName?: string;

  /**
   * The ID of the project that the service account belongs to.
   * @example hccloud
   */
  project: string;

  /**
   * An array of roles to grant to the service account.
   * @example ['storage.admin']
   */
  roles: Array<string>;
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a new GCP service account and assigns it the specified roles.
 * @param args - The arguments for creating the service account.
 * @param ctx - The Pulumi context object.
 * @param deps - The optional list of resources that the service account depends on.
 * @returns The newly created service account.
 */
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

/**
 * Arguments for granting roles to a service account.
 */
interface GrantServiceAccountRolesArgs {
  /**
   * The roles to grant to the service account.
   * */
  roles: Array<string>;
  /**
   * The email address of the service account.
   * */
  serviceAccountEmail: string;
  /**
   * The ID of the project that the service account belongs to.
   * */
  project: string;
  /**
   * (Optional) A custom name for the Pulumi resource.
   * */
  customResourceName?: string;
}

/**
 * Grants roles to a service account.
 * @param args - The arguments for the function.
 * @param ctx - The Pulumi context.
 * @param deps - The dependencies for the function.
 */
// eslint-disable-next-line  @typescript-eslint/no-unused-vars
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
};
