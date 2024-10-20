import { BaseContext, ContextWithGcp } from '@/context';
import { v1 as Iam } from '@pulumi/google-native/iam';
import {
  iam as GcpIam,
  serviceaccount as GcpServiceAccount,
} from '@pulumi/gcp';
import { useServiceAccount } from './service-account';
import { GcpRoles } from './enums';

interface UseWorkloadIdentityPoolForGithubArgs {
  projectId: string;
  projectNumber: string;
  githubOrganizations?: Array<string>;
}

interface Context extends BaseContext, ContextWithGcp {}
export const useWorkloadIdentityPoolForGithub = (args: UseWorkloadIdentityPoolForGithubArgs, ctx: Context) => {
  const {
    projectId,
    projectNumber,
    githubOrganizations = [],
  } = args;

  const {
    rn
  } = ctx;

  const wip = new Iam.WorkloadIdentityPool(rn(['iam', 'gcp', 'wip', 'github']), {
    workloadIdentityPoolId: 'github',
    displayName: 'GitHub Pool',
    project: projectId,
    location: 'global',
  });

  const sa = useServiceAccount({
    name: 'github-wip',
    displayName: 'GitHub Workload Identity',
    project: projectId,
    roles: [
      GcpRoles.ARTIFACT_REGISTRY_WRITER,
      GcpRoles.STORAGE_OBJECT_ADMIN,
    ]
  }, ctx);

  for (const org of githubOrganizations) {
    new GcpIam.WorkloadIdentityPoolProvider(rn(['iam', 'gcp', 'wip', 'github', org]), {
      workloadIdentityPoolId: 'github',
      workloadIdentityPoolProviderId: `github-${org}`,
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

    new GcpServiceAccount.IAMMember(rn(['iam', 'gcp', 'wip', 'github', 'sa', org]), {
      serviceAccountId: `projects/${projectId}/serviceAccounts/github-wip@${projectId}.iam.gserviceaccount.com`,
      role: `roles/${GcpRoles.IAM_WORKLOAD_IDENTITY_USER}`,
      member: `principalSet://iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/github/attribute.repository_owner/${org}`,
    }, { dependsOn: [wip, sa] });
  }
}
