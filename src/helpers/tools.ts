import { stat } from 'node:fs/promises';

/**
 * Checks if a file exists at the given path.
 * @param path - The path to the file.
 * @returns A promise that resolves to a boolean indicating whether the file exists or not.
 * @example
 * await isFileExists('path/to/file'); // true
 */
export const isFileExists = async (path: string) => {
  try {
    await stat(path);

    return true;
  } catch (e) {
    return false;
  }
};
