import {
  artifactregistry,
  projects,
} from '@pulumi/gcp';
import { Output } from '@pulumi/pulumi';

import { BaseContext, ContextWithGcp } from '@/context';
import { GcpRoles } from '@/gcp/enums';

interface UseDockerRepositoryArgs {
  name: string;
  location?: string;
  isPublic?: boolean;
}

interface Context extends BaseContext, ContextWithGcp {}
export const useDockerRepository = (args: UseDockerRepositoryArgs, ctx: Context) => {
  const {
    name,
    location,
    isPublic = false,
  } = args;
  const { gcp: { region, project }, rn } = ctx;

  const repoLocation = location ?? region.split('-').shift();
  const repo = new artifactregistry.Repository(rn(['root', 'gcp', 'docker', 'repo', name]), {
    repositoryId: name,
    format: 'DOCKER',
    location: repoLocation,
    cleanupPolicies: [
      {
        id: 'delete-gt30-untagged',
        action: 'DELETE',
        condition: {
          olderThan: '2592000s',
          tagState: 'UNTAGGED',
        },
      },
      {
        id: 'keep-recent',
        action: 'KEEP',
        mostRecentVersions: {
          keepCount: 5,
        },
      },
    ],
  });

  if (isPublic) {
    const role = GcpRoles.ARTIFACT_REGISTRY_READER;

    new artifactregistry.RepositoryIamMember(rn(['iam', 'gcp', 'public', 'role', role]), {
      location: repoLocation,
      member: 'allUsers',
      repository: repo.name,
      role: `roles/${role}`,
    }, {
      dependsOn: [repo],
    });
  }
};

interface GrantDockerRepositoryAccessArgs {
  opsProject: string;
  runProjectNumber: Output<string> | string;
  runProjectId: string;
}

/**
 * Grants Docker repository access to a service account in a Google Cloud Platform project.
 * @param args - The arguments needed to grant access.
 * @param ctx - The Pulumi context object.
 */
export const grantDockerRepositoryAccess = (args: GrantDockerRepositoryAccessArgs, ctx: Context) => {
  const {
    opsProject,
    runProjectNumber,
    runProjectId,
  } = args;
  const { rn } = ctx;

  const role = GcpRoles.ARTIFACT_REGISTRY_READER;
  new projects.IAMMember(rn(['iam', 'gcp', 'sa', runProjectId, 'role', role]), {
    project: opsProject,
    role: `roles/${role}`,
    member: typeof runProjectNumber === 'string'
      ? `serviceAccount:service-${runProjectNumber}@serverless-robot-prod.iam.gserviceaccount.com`
      : runProjectNumber.apply((n) => `serviceAccount:service-${n}@serverless-robot-prod.iam.gserviceaccount.com`),
  });
};
