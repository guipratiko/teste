/**
 * Middleware para capturar raw body do webhook
 * Necessário para validação de assinatura
 */

import { Request, Response, NextFunction } from 'express';

export interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

/**
 * Middleware para capturar raw body apenas para rota de webhook
 * Deve ser usado antes do express.json()
 */
export const rawBodyMiddleware = (
  req: RequestWithRawBody,
  res: Response,
  next: NextFunction
): void => {
  // Apenas para rota de webhook do Instagram
  if (req.method === 'POST' && req.path.includes('/webhook')) {
    const chunks: Buffer[] = [];
    let rawBody: Buffer;

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      rawBody = Buffer.concat(chunks);
      req.rawBody = rawBody;
      
      // Fazer parse do JSON manualmente
      try {
        req.body = JSON.parse(rawBody.toString('utf8'));
      } catch (error) {
        return next(new Error('Erro ao fazer parse do JSON'));
      }
      
      next();
    });

    req.on('error', (error) => {
      next(error);
    });
  } else {
    next();
  }
};
