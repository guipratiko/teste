/**
 * Validador de assinatura de webhook do Instagram
 */

import crypto from 'crypto';
import { INSTAGRAM_CONFIG } from '../config/constants';

/**
 * Valida a assinatura do webhook do Instagram
 * @param payload - Corpo da requisição (string ou Buffer)
 * @param signature - Assinatura do header x-hub-signature-256
 * @returns true se a assinatura for válida
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string
): boolean {
  if (!signature) {
    return false;
  }

  // O formato do signature é: sha256=<hash>
  const signatureHash = signature.replace('sha256=', '');

  // Calcular hash do payload usando o client secret
  const expectedHash = crypto
    .createHmac('sha256', INSTAGRAM_CONFIG.CLIENT_SECRET)
    .update(payload)
    .digest('hex');

  // Comparar hashes de forma segura (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(signatureHash),
    Buffer.from(expectedHash)
  );
}

/**
 * Verifica o token de verificação do webhook (GET request)
 * @param mode - Parâmetro 'hub.mode'
 * @param token - Parâmetro 'hub.verify_token'
 * @param challenge - Parâmetro 'hub.challenge'
 * @returns challenge se válido, null caso contrário
 */
export function verifyWebhookToken(
  mode: string,
  token: string,
  challenge: string
): string | null {
  console.log('🔐 Verificando token de webhook');
  console.log('📋 Mode recebido:', mode);
  console.log('🔑 Token recebido:', token);
  console.log('🎯 Challenge recebido:', challenge);
  console.log('✅ Token esperado:', INSTAGRAM_CONFIG.WEBHOOK_VERIFY_TOKEN);
  console.log('🔍 Comparação:', token === INSTAGRAM_CONFIG.WEBHOOK_VERIFY_TOKEN ? '✅ Match' : '❌ Não corresponde');

  if (mode === 'subscribe' && token === INSTAGRAM_CONFIG.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Token válido, retornando challenge');
    return challenge;
  }
  
  console.log('❌ Token inválido ou mode incorreto');
  return null;
}
