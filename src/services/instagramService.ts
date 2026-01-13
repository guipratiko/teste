/**
 * Service para integração com Instagram Graph API
 */

import axios from 'axios';
import InstagramInstance, { IInstagramInstance } from '../models/InstagramInstance';
import { INSTAGRAM_CONFIG, SERVER_CONFIG } from '../config/constants';

export interface InstagramUserInfo {
  id: string;
  username: string;
  account_type: string;
}

export interface SendMessageParams {
  recipientId: string;
  message: string;
}

export interface ReplyCommentParams {
  commentId: string;
  message: string;
}

/**
 * Obtém informações do usuário do Instagram
 */
export async function getInstagramUserInfo(
  accessToken: string
): Promise<InstagramUserInfo> {
  try {
    const response = await axios.get(
      `${INSTAGRAM_CONFIG.API_URL}/${INSTAGRAM_CONFIG.API_VERSION}/me`,
      {
        params: {
          fields: 'id,username,account_type',
          access_token: accessToken,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erro ao obter informações do usuário:', error.response?.data || error.message);
    throw new Error('Erro ao obter informações do usuário do Instagram');
  }
}

/**
 * Troca código de autorização por token de acesso de curta duração
 * Conforme documentação: https://developers.facebook.com/docs/instagram-platform/reference/access_token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
  user_id?: string;
}> {
  try {
    console.log('🔄 Trocando código por token de acesso...');
    console.log('📋 Código recebido:', code.substring(0, 20) + '...');
    console.log('🔗 Token URL:', INSTAGRAM_CONFIG.TOKEN_URL);

    const response = await axios.post(INSTAGRAM_CONFIG.TOKEN_URL, null, {
      params: {
        client_id: INSTAGRAM_CONFIG.CLIENT_ID,
        client_secret: INSTAGRAM_CONFIG.CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_CONFIG.REDIRECT_URI,
        code,
      },
    });

    console.log('✅ Token de acesso obtido com sucesso');
    console.log('📋 Token type:', response.data.token_type);
    console.log('⏰ Expires in:', response.data.expires_in, 'segundos');
    console.log('👤 User ID:', response.data.user_id);

    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao trocar código por token');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('📋 Message:', error.message);
    
    if (error.response?.data?.error) {
      throw new Error(`Erro ao obter token: ${error.response.data.error.message || error.response.data.error}`);
    }
    
    throw new Error('Erro ao obter token de acesso do Instagram');
  }
}

/**
 * Troca token de curta duração por token de longa duração
 * Conforme documentação: https://developers.facebook.com/docs/instagram-platform/reference/access_token
 */
export async function exchangeShortLivedForLongLivedToken(
  shortLivedToken: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  try {
    console.log('🔄 Trocando token de curta duração por token de longa duração...');

    const response = await axios.get(
      `${INSTAGRAM_CONFIG.API_URL}/${INSTAGRAM_CONFIG.API_VERSION}/access_token`,
      {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: INSTAGRAM_CONFIG.CLIENT_SECRET,
          access_token: shortLivedToken,
        },
      }
    );

    console.log('✅ Token de longa duração obtido com sucesso');
    console.log('⏰ Expires in:', response.data.expires_in, 'segundos');

    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao trocar por token de longa duração');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.error) {
      throw new Error(`Erro ao obter token de longa duração: ${error.response.data.error.message || error.response.data.error}`);
    }
    
    throw new Error('Erro ao obter token de longa duração do Instagram');
  }
}

/**
 * Envia mensagem direta (DM)
 */
export async function sendDirectMessage(
  instance: IInstagramInstance,
  params: SendMessageParams
): Promise<any> {
  try {
    const response = await axios.post(
      `${INSTAGRAM_CONFIG.API_URL}/${INSTAGRAM_CONFIG.API_VERSION}/${instance.instagramAccountId}/messages`,
      {
        recipient: {
          id: params.recipientId,
        },
        message: {
          text: params.message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${instance.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erro ao enviar DM:', error.response?.data || error.message);
    throw new Error('Erro ao enviar mensagem direta');
  }
}

/**
 * Responde a um comentário
 */
export async function replyToComment(
  instance: IInstagramInstance,
  params: ReplyCommentParams
): Promise<any> {
  try {
    const response = await axios.post(
      `${INSTAGRAM_CONFIG.API_URL}/${INSTAGRAM_CONFIG.API_VERSION}/${params.commentId}/replies`,
      {
        message: params.message,
      },
      {
        headers: {
          Authorization: `Bearer ${instance.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erro ao responder comentário:', error.response?.data || error.message);
    throw new Error('Erro ao responder comentário');
  }
}

/**
 * Busca instância pelo ID da conta do Instagram
 */
export async function findInstanceByAccountId(
  accountId: string
): Promise<IInstagramInstance | null> {
  return await InstagramInstance.findOne({ instagramAccountId: accountId });
}

/**
 * Busca instância pelo ID
 */
export async function findInstanceById(
  id: string
): Promise<IInstagramInstance | null> {
  return await InstagramInstance.findById(id);
}

/**
 * Busca instâncias por usuário
 */
export async function findInstancesByUserId(
  userId: string
): Promise<IInstagramInstance[]> {
  return await InstagramInstance.find({ userId }).sort({ createdAt: -1 });
}

/**
 * Cria nova instância
 */
export async function createInstance(data: {
  name: string;
  userId: string;
  instagramAccountId: string;
  accessToken: string;
  tokenType?: string;
  tokenExpiresAt?: Date;
  isLongLived?: boolean;
  username?: string;
}): Promise<IInstagramInstance> {
  const webhookUrl = `${SERVER_CONFIG.API_URL}/api/instagram/webhook`;

  const instance = new InstagramInstance({
    name: data.name,
    userId: data.userId,
    instagramAccountId: data.instagramAccountId,
    accessToken: data.accessToken,
    tokenType: data.tokenType || 'bearer',
    tokenExpiresAt: data.tokenExpiresAt,
    isLongLived: data.isLongLived || false,
    username: data.username,
    status: 'connected',
    webhookUrl,
  });

  return await instance.save();
}

/**
 * Deleta instância
 */
export async function deleteInstance(id: string): Promise<boolean> {
  const result = await InstagramInstance.findByIdAndDelete(id);
  return !!result;
}
