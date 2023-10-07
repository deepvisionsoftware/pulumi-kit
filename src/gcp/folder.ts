import { BaseContext, ContextWithGcp } from '@/context';
import { v3 as CloudResourceManager } from '@pulumi/google-native/cloudresourcemanager';
import { toDashCase } from '@/helpers/resource-names';

interface UseFolderArgs {
  name: string;
  path?: string;
  parentOrg?: string;
  parentFolder?: CloudResourceManager.Folder;
}

interface Context extends BaseContext, ContextWithGcp {}
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
