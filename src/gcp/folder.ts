import { organizations } from '@pulumi/gcp';
import { type Input } from '@pulumi/pulumi';

import { type BaseContext, type ContextWithGcp } from '@/context.js';
import { toDashCase } from '@/helpers/resource-names.js';

/**
 * Arguments for the `useFolder` function.
 */
interface UseFolderArgs {
  /**
   * The name of the folder.
   * @example Microservices
   */
  name: string;
  /**
   * The path of the folder (used for resource naming).
   */
  path?: string;
  /**
   * The ID of the parent organization.
   * @example 123456789012
   */
  parentOrg?: string;
  /**
   * The parent folder.
   */
  parentFolder?: organizations.Folder;
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a new GCP folder resource.
 * @param args - The arguments for creating the folder.
 * @param ctx - The Pulumi context.
 * @returns A new organizations.Folder resource.
 * @throws An error if neither parentOrg nor parentFolder is specified.
 */
export const useFolder = (args: UseFolderArgs, ctx: Context) => {
  const {
    name,
    path = '',
    parentOrg,
    parentFolder,
  } = args;
  const { rn } = ctx;

  let parent: Input<string>;
  if (parentFolder) {
    parent = parentFolder.name;
  } else if (parentOrg) {
    parent = `organizations/${parentOrg}`;
  } else {
    throw new Error('Either parentOrg or parentFolder must be specified');
  }

  const nameParts = [
    'root',
    'gcp',
    'folder',
  ];
  if (path) {
    nameParts.push(toDashCase(path));
  }
  nameParts.push(toDashCase(name));

  return new organizations.Folder(rn(nameParts), {
    displayName: name,
    parent,
  }, {
    dependsOn: parentFolder
      ? [parentFolder]
      : undefined,
  });
};
