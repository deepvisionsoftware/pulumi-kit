import { readFile } from 'node:fs/promises';

import { parse } from 'yaml';

import { isFileExists } from '@/helpers/tools';
import { Maybe } from '@/helpers/types';

export interface ContextWithIam {
  iam: {
    users: Array<IamUser>;
    getUserById: (id: string) => Maybe<IamUser>;
    teams: Array<IamTeam>;
    secrets: Array<IamSecret>;
    getSecretValue: (id: string) => Maybe<string>;
  };
}

interface IamUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  team: string;
  github: {
    login: string;
    org?: {
      role: string;
    };
  };
}

interface IamTeam {
  id: string;
  title: string;
  github?: {
    org: string;
    name: string;
  };
  members: Array<IamUser>;
}

interface IamSecret {
  title: string;
  id: string;
  name: string;
  value: string;
  isEncrypted?: boolean;
  github?: {
    org: string;
  };
}

const getUserByIdFactory = (users: Array<IamUser>) => (id: string): Maybe<IamUser> => {
  return users.find((user) => user.id === id);
};
const getSecretValueFactory = (secrets: Array<IamSecret>) => (id: string): Maybe<string> => {
  // local::cf/hccloud/access-token/pages230412
  // gcs::cf/hccloud/access-token/pages230412
  const secretExpr = /^(?<source>[a-z]+)::(?<id>.+)$/;
  const secretMatch = id.match(secretExpr);
  if (!secretMatch) {
    return undefined;
  }

  const { source, id: secretId } = secretMatch.groups as { source: string; id: string };
  if (source !== 'local') {
    throw new Error(`Secret source ${source} is not supported.`);
  }

  const secret = secrets.find((secret) => secret.id === secretId);

  return secret?.value;
};

export const useIamContext = async (): Promise<ContextWithIam> => {
  // Load Users
  const usersFilePath = 'src/iam/users.yml';
  const users = await isFileExists(usersFilePath)
    ? parse(await readFile(usersFilePath, 'utf-8')) as Array<IamUser>
    : [];

  // Load Secrets
  const secretsFilePath = 'src/iam/secrets.yml';
  const secrets = await isFileExists(secretsFilePath)
    ? parse(await readFile(secretsFilePath, 'utf-8')) as Array<IamSecret>
    : [];

  // Load Teams
  const teamsFilePath = 'src/iam/teams.yml';
  const teams = await isFileExists(teamsFilePath)
    ? parse(await readFile(teamsFilePath, 'utf-8')) as Array<IamTeam>
    : [];
  const resolvedTeams: Array<IamTeam> = [];

  for (const team of teams) {
    const members: Array<IamUser> = [];
    for (const member of team.members) {
      const resolvedMember = users.find((user) => user.id === member.id);
      if (!resolvedMember) {
        throw new Error(`Team ${team.title} has a member ${member.id} that does not exist.`);
      }
      members.push(resolvedMember);
    }

    resolvedTeams.push({
      ...team,
      members,
    });
  }

  return {
    iam: {
      users,
      getUserById: getUserByIdFactory(users),
      teams: resolvedTeams,
      secrets,
      getSecretValue: getSecretValueFactory(secrets),
    },
  };
};
