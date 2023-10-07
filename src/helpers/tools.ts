import { stat } from 'node:fs/promises';

export const isFileExists = async (path: string) => {
  try {
    await stat(path);

    return true;
  } catch (e) {
    return false;
  }
};
