import { readFile } from 'node:fs/promises';

import { parse } from 'yaml';

import { isFileExists } from '@/helpers/tools';
import { Maybe } from '@/helpers/types';

/**
 * Context object that contains IAM-related properties and methods.
 */
export interface ContextWithIam {
  iam: {
    /**
     * Array of IAM users.
     */
    users: Array<IamUser>;

    /**
     * Returns an IAM user by ID.
     * @param id The ID of the user to retrieve.
     * @returns The IAM user with the specified ID, or null if not found.
     */
    getUserById: (id: string) => Maybe<IamUser>;

    /**
     * Array of IAM teams.
     */
    teams: Array<IamTeam>;

    /**
     * Array of IAM secrets.
     */
    secrets: Array<IamSecret>;

    /**
     * Returns the value of an IAM secret by ID.
     * @param id The ID of the secret to retrieve.
     * @returns The value of the IAM secret with the specified ID, or null if not found.
     */
    getSecretValue: (id: string) => Maybe<string>;
  };
}

/**
 * Represents a user in the IAM system.
 */
interface IamUser {
  /**
   * The unique identifier of the user.
   * @example 1234567890
   */
  id: string;

  /**
   * The first name of the user.
   * @example John
   */
  firstName: string;

  /**
   * The last name of the user.
   * @example Doe
   */
  lastName: string;

  /**
   * The email address of the user.
   * @example example@service.com
   */
  email: string;

  /**
   * The team that the user belongs to.
   * @example tech-team
   */
  team: string;

  /**
   * The GitHub account information of the user.
   */
  github: {
    /**
     * The GitHub login of the user.
     * @example johndoe
     */
    login: string;

    /**
     * The organization role of the user, if applicable.
     */
    org?: {
      /**
       * The name of the organization.
       * @example deeepvision
       */
      role: string;
    };
  };
}

/**
 * Represents a team in the IAM system.
 */
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

/**
 * Returns an object containing IAM context with users, teams, and secrets.
 * @returns {Promise<ContextWithIam>} An object containing IAM context with users, teams, and secrets.
 */
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
