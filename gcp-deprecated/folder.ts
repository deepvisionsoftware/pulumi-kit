import { v3 as CloudResourceManager } from '@pulumi/google-native/cloudresourcemanager';

import { BaseContext, ContextWithGcp } from '@/context';
import { toDashCase } from '@/helpers/resource-names';

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
   * The path of the folder.
   */
  path?: string;
  /**
   * The ID of the parent organization.
   * @example deepvision
   */
  parentOrg?: string;
  /**
   * The parent folder.
   * @example { name: 'Products' }
   */
  parentFolder?: CloudResourceManager.Folder;
}

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Creates a new GCP folder resource.
 * @param args - The arguments for creating the folder.
 * @param ctx - The Pulumi context.
 * @returns A new CloudResourceManager.Folder resource.
 * @throws An error if either parentOrg or parentFolder is not specified.
 */
export const useFolder = (args: UseFolderArgs, ctx: Context) => {
  const {
    name,
    path = '',
    parentOrg,
    parentFolder,
  } = args;
  const { rn } = ctx;

  let parent = undefined;
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

  return new CloudResourceManager.Folder(rn(nameParts), {
    displayName: name,
    parent,
  }, {
    dependsOn: parentFolder,
  });
};
