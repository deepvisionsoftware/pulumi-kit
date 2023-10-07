import { readFile } from 'node:fs/promises';

import {
  ActionsOrganizationVariable,
  ActionsRepositoryPermissions,
  ActionsSecret,
  BranchProtection,
  Repository,
  RepositoryCollaborator,
  Team,
  TeamMembership,
  TeamRepository,
} from '@pulumi/github';
import { parse } from 'yaml';

import { BaseContext } from '@/context';
import { ContextWithIam } from '@/iam';

interface Context extends BaseContext, ContextWithIam {}

interface GithubSecret {
  key: string;
  valueFrom: string;
}

enum GithubRepoFeature {
  ISSUES = 'issues',
  ACTIONS = 'actions',
}
interface GithubRepo {
  title: string;
  org: string;
  name: string;
  description?: string;
  homepage?: string;
  access?: {
    public?: boolean;
    users: Array<GithubRepoUser>;
    teams: Array<GithubRepoTeam>;
  };
  protection?: boolean;
  secrets?: Array<GithubSecret>;
  features?: Array<GithubRepoFeature>;
}
interface GithubRepoUser {
  id: string;
  role: GithubRepoRole;
}
interface GithubRepoTeam {
  id: string;
  role: GithubRepoRole;
}

enum GithubRepoRole {
  READ = 'pull',
  TRIAGE = 'triage',
  WRITE = 'push',
  MAINTAIN = 'maintain',
  ADMIN = 'admin',
}
enum GithubTeamRole {
  MEMBER = 'member',
  MAINTAINER = 'maintainer',
}
enum GithubTeamPrivacy {
  CLOSED = 'closed',
  SECRET = 'secret',
}

const mainBranches = ['dev', 'stage', 'master'];

interface UseGithubArgs {}
export const useGithub = async (args: UseGithubArgs, ctx: Context) => {
  const { rn, iam: { teams, secrets } } = ctx;

  // Teams
  const githubTeams = new Map<string, Team>();
  for (const team of teams) {
    if (!team.github) {
      continue;
    }
    const githubTeam = new Team(rn(['code', 'github', team.github.org, 'team', team.github.name]), {
      name: team.github.name,
      privacy: GithubTeamPrivacy.CLOSED,
    });
    githubTeams.set(team.id, githubTeam);

    for (const user of team.members) {
      new TeamMembership(rn(['code', 'github', team.github.org, 'team', team.github.name, 'user', user.id]), {
        teamId: githubTeam.id,
        username: user.github.login,
        role: user.github.org?.role ?? GithubTeamRole.MEMBER,
      });
    }
  }

  // Secrets
  for (const secret of secrets) {
    if (!secret.github) {
      continue;
    }
    if (!secret.isEncrypted) {
      new ActionsOrganizationVariable(rn(['code', 'github', secret.github.org, 'var', secret.name]), {
        variableName: secret.name,
        value: secret.value,
        visibility: 'all',
      });
    }
  }
};

interface UseGithubForProjectArgs {
  projectRoot: string;
}
export const useGithubForProject = async (args: UseGithubForProjectArgs, ctx: Context) => {
  const { projectRoot } = args;
  const {
    rn,
    iam: {
      teams: githubTeams,
      getSecretValue,
      getUserById,
    },
  } = ctx;

  const githubReposFile = `${projectRoot}/github.yml`;
  const githubRepos = parse(await readFile(githubReposFile, 'utf-8')) as Array<GithubRepo>;

  // Repositories
  for (const repo of githubRepos) {
    const ghRepo = new Repository(rn(['code', 'github', repo.org, 'repo', repo.name]), {
      name: repo.name,
      description: repo.description,
      homepageUrl: repo.homepage,
      visibility: repo.access?.public ? 'public' : 'private',
      hasIssues: repo.features?.includes(GithubRepoFeature.ISSUES) ?? false,
      allowMergeCommit: true,
      allowRebaseMerge: false,
      allowSquashMerge: false,
      vulnerabilityAlerts: false,
    }, {
      ignoreChanges: ['mergeCommitMessage', 'mergeCommitTitle', 'squashMergeCommitMessage', 'squashMergeCommitTitle'],
    });

    // Users
    if (repo.access?.users) {
      for (const userRef of repo.access.users) {
        const user = getUserById(userRef.id);
        if (!user) {
          throw new Error(`User ${userRef.id} not found`);
        }
        new RepositoryCollaborator(rn(['code', 'github', repo.org, 'repo', repo.name, 'user', user.github.login]), {
          repository: repo.name,
          username: user.github.login,
          permission: userRef.role,
        });
      }
    }

    // Teams
    if (repo.access?.teams) {
      for (const teamRef of repo.access.teams) {
        const team = githubTeams.find((team) => team.id === teamRef.id);
        if (!team || !team.github) {
          throw new Error(`Team ${teamRef.id} not found`);
        }

        new TeamRepository(rn(['code', 'github', repo.org, 'repo', repo.name, 'team', teamRef.id]), {
          repository: repo.name,
          teamId: team.github.name,
          permission: teamRef.role,
        });
      }
    }

    // Secrets
    if (repo.secrets) {
      for (const secretRef of repo.secrets) {
        const secretValue = await getSecretValue(secretRef.valueFrom);
        new ActionsSecret(rn(['code', 'github', repo.org, 'repo', repo.name, 'secret', secretRef.key]), {
          repository: repo.name,
          secretName: secretRef.key,
          plaintextValue: secretValue,
        });
      }
    }

    // Branch Protection
    if (repo.protection) {
      for (const branch of mainBranches) {
        new BranchProtection(rn(['code', 'github', repo.org, 'repo', repo.name, 'branch', branch, 'protection']), {
          repositoryId: repo.name,
          pattern: branch,
          requiredPullRequestReviews: [{
            dismissStaleReviews: true,
            requiredApprovingReviewCount: 1,
          }],
        });
      }
    }

    if (repo.features?.includes(GithubRepoFeature.ACTIONS)) {
      new ActionsRepositoryPermissions(rn(['code', 'github', repo.org, 'repo', repo.name, 'actions']), {
        repository: repo.name,
        allowedActions: 'all',
      }, {
        dependsOn: [ghRepo],
      });
    }
  }
};
