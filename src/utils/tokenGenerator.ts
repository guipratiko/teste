/**
 * Gera tokens únicos para instâncias
 */

import { randomBytes } from 'crypto';

export function generateInstanceToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateInstanceName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
