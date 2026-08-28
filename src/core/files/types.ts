/** Maximum file size accepted by prism-code-editor before performance degrades.
 *  Based on the library's stated limit of ~1000 LOC on most hardware.
 *  512 KB gives comfortable headroom for files with long lines.
 */
export const MAX_FILE_SIZE_BYTES = 524_288; // 512 KB

export type FileContent = {
  path: string;
  content: string;
  sizeBytes: number;
};

export type FileValidationError =
  | { kind: 'NOT_FOUND'; path: string }
  | { kind: 'PATH_TRAVERSAL'; path: string }
  | { kind: 'NOT_TEXT'; path: string }
  | { kind: 'TOO_LARGE'; path: string; sizeBytes: number; maxBytes: number }
  | { kind: 'IS_DIRECTORY'; path: string }
  | { kind: 'READ_ERROR'; path: string; message: string };

export type FileResult =
  | { ok: true; file: FileContent }
  | { ok: false; error: FileValidationError };

/** Result of startup file validation — no content returned, just success/failure. */
export type FileValidationResult = { ok: true } | { ok: false; error: FileValidationError };

export type FileWriteError =
  | { kind: 'WRITE_ERROR'; path: string; message: string }
  | { kind: 'TOO_LARGE'; path: string; sizeBytes: number; maxBytes: number };

export type FileWriteResult = { ok: true } | { ok: false; error: FileWriteError };

export type FileCreateError = { kind: 'CREATE_ERROR'; path: string; message: string };

export type FileCreateResult = { ok: true } | { ok: false; error: FileCreateError };

export type FileStore = {
  read: (rootDir: string, relativePath: string) => FileResult;
  write: (absolutePath: string, content: string) => FileWriteResult;
  create: (filePath: string) => FileCreateResult;
  validate: (absolutePath: string) => FileValidationResult;
};
