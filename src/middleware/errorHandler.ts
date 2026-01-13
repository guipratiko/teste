import { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/constants';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    status,
    message: err.message || 'Erro interno do servidor',
    ...(SERVER_CONFIG.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error: AppError = new Error(`Rota não encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  error.status = 'not_found';
  next(error);
};

export function createValidationError(message: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = 400;
  error.status = 'validation_error';
  return error;
}

export function handleControllerError(error: unknown, defaultMessage: string): AppError {
  if (error instanceof Error) {
    const appError: AppError = error;
    appError.statusCode = appError.statusCode || 500;
    appError.status = appError.status || 'error';
    return appError;
  }
  const appError: AppError = new Error(defaultMessage);
  appError.statusCode = 500;
  appError.status = 'error';
  return appError;
}
