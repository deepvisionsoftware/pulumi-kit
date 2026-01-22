import {
  projects,
  serviceaccount,
} from '@pulumi/gcp';
import { type Resource } from '@pulumi/pulumi';
import { type BaseContext, type ContextWithGcp } from '@/context.js';
import { dashToCamelWithSpaces, useManagedByDescription } from '@/helpers/description.js';

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
  roles: string[];
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a new GCP service account and assigns it the specified roles.
 * @param args - The arguments for creating the service account.
 * @param ctx - The Pulumi context object.
 * @param deps - The optional list of resources that the service account depends on.
 * @returns The newly created service account.
 */
export const useServiceAccount = (args: UseServiceAccountArgs, ctx: Context, deps: Resource[] = []) => {
  const {
    name,
    displayName = `${dashToCamelWithSpaces(name)} Service`,
    project,
    roles,
  } = args;
  const { rn } = ctx;

  const serviceAccount = new serviceaccount.Account(rn(['iam', 'gcp', 'sa', project, name]), {
    accountId: name,
    description: useManagedByDescription(ctx),
    displayName,
    project,
  }, {
    dependsOn: deps,
  });

  for (const role of roles) {
    new projects.IAMMember(rn(['iam', 'gcp', 'sa', project, name, 'role', role]), {
      project,
      role: `roles/${role}`,
      member: serviceAccount.email.apply((email) => `serviceAccount:${email}`),
    });
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
  roles: string[];
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
export const grantServiceAccountRoles = (args: GrantServiceAccountRolesArgs, ctx: Context, deps: Resource[] = []) => {
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
    new projects.IAMMember(rn(['iam', 'gcp', 'sa', project, name, 'role', role]), {
      project,
      role: `roles/${role}`,
      member: `serviceAccount:${serviceAccountEmail}`,
    });
  }
};
