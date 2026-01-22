import {
  iam,
  serviceaccount,
} from '@pulumi/gcp';

import { type BaseContext, type ContextWithGcp } from '@/context.js';
import { GcpRoles } from '@/gcp/enums.js';
import { useServiceAccount } from '@/gcp/service-account.js';

interface UseWorkloadIdentityPoolForGithubArgs {
  /**
   * The GCP project ID.
   * @example my-project-123456
   */
  projectId: string;
  /**
   * The GCP project number.
   * @example 123456789012
   */
  projectNumber: string;
  /**
   * List of GitHub organizations to allow.
   * @example ['my-org', 'another-org']
   */
  githubOrganizations?: string[];
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a Workload Identity Pool for GitHub Actions authentication.
 * This allows GitHub Actions to authenticate with GCP without using service account keys.
 * @param args - The arguments for creating the workload identity pool.
 * @param ctx - The Pulumi context object.
 */
export const useWorkloadIdentityPoolForGithub = (args: UseWorkloadIdentityPoolForGithubArgs, ctx: Context) => {
  const {
    projectId,
    projectNumber,
    githubOrganizations = [],
  } = args;

  const { rn } = ctx;

  const wip = new iam.WorkloadIdentityPool(rn(['iam', 'gcp', 'wip', 'github']), {
    workloadIdentityPoolId: 'github',
    displayName: 'GitHub Pool',
    project: projectId,
  });

  const sa = useServiceAccount({
    name: 'github-wip',
    displayName: 'GitHub Workload Identity',
    project: projectId,
    roles: [
      GcpRoles.ARTIFACT_REGISTRY_WRITER,
      GcpRoles.STORAGE_OBJECT_ADMIN,
    ],
  }, ctx);

  for (const org of githubOrganizations) {
    const orgLowercased = org.toLowerCase();

    new iam.WorkloadIdentityPoolProvider(rn(['iam', 'gcp', 'wip', 'github', orgLowercased]), {
      workloadIdentityPoolId: wip.workloadIdentityPoolId,
      workloadIdentityPoolProviderId: `github-${orgLowercased}`,
      displayName: `GitHub Org: ${org}`,
      project: projectId,
      oidc: {
        issuerUri: 'https://token.actions.githubusercontent.com',
      },
      attributeMapping: {
        'google.subject': 'assertion.sub',
        'attribute.repository_owner': 'assertion.repository_owner',
        'attribute.repository': 'assertion.repository',
      },
      attributeCondition: `assertion.repository_owner == '${org}'`,
    }, { dependsOn: [wip] });

    new serviceaccount.IAMMember(rn(['iam', 'gcp', 'wip', 'github', 'sa', orgLowercased]), {
      serviceAccountId: `projects/${projectId}/serviceAccounts/github-wip@${projectId}.iam.gserviceaccount.com`,
      role: `roles/${GcpRoles.IAM_WORKLOAD_IDENTITY_USER}`,
      member: `principalSet://iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/github/attribute.repository_owner/${org}`,
    }, { dependsOn: [wip, sa] });
  }
};
