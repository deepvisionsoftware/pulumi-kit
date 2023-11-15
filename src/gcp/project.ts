import { readFile } from 'node:fs/promises';

import { projects as GcpProjects } from '@pulumi/gcp';
import { Project as GcpProject } from '@pulumi/gcp/organizations';
import { v3 as CloudResourceManager } from '@pulumi/google-native/cloudresourcemanager';
import pulumi from '@pulumi/pulumi';
import { parse } from 'yaml';

import { BaseContext, ContextWithGcp } from '@/context';
import { ContextWithIam } from '@/iam';

export interface GcpFolder extends CloudResourceManager.Folder {}
export interface PlainProject {
  projectId: string;
  number: string;
}

export interface GcpProjectSpec {
  id: string;
  access?: {
    users?: Array<GcpUserSpec>;
  };
}
interface GcpUserSpec {
  id: string;
  roles: Array<string>;
}

/**
 * Arguments for creating or updating a GCP project.
 */
interface UseProjectArgs {
  /**
   * The ID of the project.
   * @example hccloud
   */
  id: string;
  /**
   * The name of the project.
   * @example HC Cloud
   */
  name: string;
  /**
   * The billing account ID for the project.
   * @example 123456-123456-123456
   */
  billingAccountId: string;
  /**
   * An optional array of service names to enable for the project.
   */
  services?: Array<string>;
  /**
   * The ID of the parent organization for the project.
   * @example deepvision
   */
  parentOrg?: string;
  /**
   * The parent folder for the project.
   */
  parentFolder?: CloudResourceManager.Folder;
}

interface Context extends BaseContext, ContextWithGcp, ContextWithIam {}
export const useProject = (args: UseProjectArgs, ctx: Context): [GcpProject, Array<GcpProjects.Service>] => {
  const {
    id,
    name,
    parentOrg,
    parentFolder,
    billingAccountId,
    services = [],
  } = args;
  const { rn } = ctx;

  // let parent = undefined;
  // if (parentFolder) {
  //   parent = parentFolder.name;
  // } else if (parentOrg) {
  //   parent = `organizations/${parentOrg}`;
  // }

  // TODO wait for billing accounts will be added to google-native
  // https://github.com/pulumi/pulumi-google-native/issues/108
  // const project = new CloudResourceManager.Project(rn(['gcp', 'project', id]), {
  //   projectId: id,
  //   displayName: name,
  //   parent,
  // });
  const gcpProject = new GcpProject(rn(['root', 'gcp', 'project', id]), {
    projectId: id,
    name,
    billingAccount: billingAccountId,
    folderId: parentFolder?.name,
    orgId: parentOrg,
  }, {
    ignoreChanges: ['orgId'],
  });

  // TODO wait for serviceusage will be added to google-native
  // https://github.com/pulumi/pulumi-google-native/issues/59
  const gcpServices = [];
  for (const service of services) {
    const gcpService = new GcpProjects.Service(rn(['root', 'gcp', 'project', id, 'service', service]), {
      disableDependentServices: true,
      project: id,
      service: `${service}.googleapis.com`,
    }, {
      dependsOn: [gcpProject],
    });
    gcpServices.push(gcpService);
  }

  return [gcpProject, gcpServices];
};

/**
 * Arguments for granting roles to a user on a GCP project.
 */
interface GrantUserRolesArgs {
  /**
   * The roles to grant to the user.
   */
  roles: Array<string>;
  /**
   * The email address of the user to grant roles to.
   * @example john.doe@example.com
   */
  userEmail: string;
  /**
   * The ID of the GCP project to grant roles on.
   * @example hccloud
   */
  project: string;
}

// eslint-disable-next-line  @typescript-eslint/no-unused-vars
/**
 * Grants user roles to a specified user in a Google Cloud Platform project.
 * @param args - The arguments for granting user roles.
 * @param ctx - The Pulumi context object.
 * @param deps - An optional array of resources to add as dependencies.
 */
export const grantUserRoles = (args: GrantUserRolesArgs, ctx: Context, deps: pulumi.Resource[] = []) => {
  const {
    roles,
    userEmail,
    project,
  } = args;
  const { rn } = ctx;

  const [name] = userEmail.split('@');

  for (const role of roles) {
    // TODO: temporary use Legacy GCP provider, while CloudResourceManager not working properly
    // https://github.com/pulumi/pulumi-google-native/issues/714
    new GcpProjects.IAMMember(rn(['iam', 'gcp', 'sa', project, name, 'role', role]), {
      project,
      role: `roles/${role}`,
      member: `user:${userEmail}`,
    });
    // new CloudResourceManager.ProjectIamMember(rn(['sa', name, 'role', role]), {
    //   name: `projects/${ctx.gcp.project}/roles/${role}`,
    //   role: `roles/${role}`,
    //   member: serviceAccount.email.apply((email) => `serviceAccount:${email}`),
    // });
  }
};

interface UseProjectIamArgs {
  projectRoot: string;
}
/**
 * Applies IAM roles to users for a GCP project from a YAML file.
 * @param args - The arguments for the function.
 * @param args.projectRoot - The root directory of the project.
 * @param ctx - The Pulumi context object.
 * @throws Will throw an error if a user does not have an email.
 */
export const useProjectIam = async (args: UseProjectIamArgs, ctx: Context) => {
  const { projectRoot } = args;
  const { rn, iam: { getUserById } } = ctx;

  const projectsFile = `${projectRoot}/gcp.yml`;
  const projects = parse(await readFile(projectsFile, 'utf-8')) as Array<GcpProjectSpec>;

  for (const projectSpec of projects) {
    for (const userSpec of projectSpec.access?.users ?? []) {
      const user = getUserById(userSpec.id);
      if (!user?.email) {
        throw new Error(`User ${userSpec.id} does not have an email`);
      }

      for (const role of userSpec.roles) {
        new GcpProjects.IAMMember(rn(['iam', 'gcp', 'u', projectSpec.id, user.id, 'role', role]), {
          project: projectSpec.id,
          role: `roles/${role}`,
          member: `user:${user.email}`,
        });
      }
    }
  }
};
