import { Request, Response } from 'express';
import { HttpRuntime, RouteHandler } from './types';

type SaveBody = { content?: unknown };

export const makeFileSaveHandler = ({ config, logger, files }: HttpRuntime): RouteHandler => {
  return (req: Request, res: Response): void => {
    const body: SaveBody | undefined =
      typeof req.body === 'object' && req.body !== null ? (req.body as SaveBody) : undefined;
    const content = body?.content;

    if (typeof content !== 'string') {
      res.status(400).json({ error: 'Request body must contain a "content" string field' });
      return;
    }

    const result = files.write(config.file, content);

    if (!result.ok) {
      const { error } = result;
      switch (error.kind) {
        case 'TOO_LARGE':
          logger.warn('Save rejected: content exceeds size limit', {
            file: config.file,
            sizeBytes: error.sizeBytes,
            maxBytes: error.maxBytes,
          });
          res.status(413).json({
            error: `Content too large (${error.sizeBytes} bytes, max ${error.maxBytes} bytes)`,
          });
          return;
        case 'WRITE_ERROR':
          logger.error('Failed to write file', { file: config.file, error: error.message });
          res.status(500).json({ error: `Could not write file: ${error.message}` });
          return;
      }
    }

    logger.info('File saved successfully', {
      file: config.file,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
    });
    res.status(204).send();
  };
};
