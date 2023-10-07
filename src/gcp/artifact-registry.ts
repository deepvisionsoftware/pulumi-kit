import {
  artifactregistry as GcpArtifactRegistry,
  projects as GcpProjects,
} from '@pulumi/gcp';
import { v1 as ArtifactRegistry } from '@pulumi/google-native/artifactregistry';
import { RepositoryFormat } from '@pulumi/google-native/types/enums/artifactregistry/v1';
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
  const repo = new ArtifactRegistry.Repository(rn(['root', 'gcp', 'docker', 'repo', name]), {
    name: `projects/${project}/locations/${repoLocation}/repositories/${name}`,
    repositoryId: name,
    format: RepositoryFormat.Docker,
    location: repoLocation,
  });

  if (isPublic) {
    const role = GcpRoles.ARTIFACT_REGISTRY_READER;
    // new ArtifactRegistry.RepositoryIamBinding(rn(['iam', 'gcp', 'public', 'role', role]), {
    //   name: repo.name,
    //   role: `roles/${role}`,
    //   members: ['allUsers'],
    // }, { dependsOn: [repo] });

    new GcpArtifactRegistry.RepositoryIamMember(rn(['iam', 'gcp', 'public', 'role', role]), {
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
export const grantDockerRepositoryAccess = (args: GrantDockerRepositoryAccessArgs, ctx: Context) => {
  const {
    opsProject,
    runProjectNumber,
    runProjectId,
  } = args;
  const { rn } = ctx;

  // TODO: temporary use Legacy GCP provider, while CloudResourceManager not working properly
  // https://github.com/pulumi/pulumi-google-native/issues/714
  const role = GcpRoles.ARTIFACT_REGISTRY_READER;
  new GcpProjects.IAMMember(rn(['iam', 'gcp', 'sa', runProjectId, 'role', role]), {
    project: opsProject,
    role: `roles/${role}`,
    member: typeof runProjectNumber === 'string'
      ? `serviceAccount:service-${runProjectNumber}@serverless-robot-prod.iam.gserviceaccount.com`
      : runProjectNumber.apply((n) => `serviceAccount:service-${n}@serverless-robot-prod.iam.gserviceaccount.com`),
  });
};
