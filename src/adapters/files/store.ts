import { FileStore } from '../../core/files';
import { readFile } from './reader';
import { writeFile } from './writer';
import { createFile } from './creator';
import { validateFile } from './validate';

export const createFileStore = (): FileStore => ({
  read: readFile,
  write: writeFile,
  create: createFile,
  validate: validateFile,
});
