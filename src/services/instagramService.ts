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
 * Troca código de autorização por token de acesso
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
  user_id?: string;
}> {
  try {
    const response = await axios.post(INSTAGRAM_CONFIG.TOKEN_URL, null, {
      params: {
        client_id: INSTAGRAM_CONFIG.CLIENT_ID,
        client_secret: INSTAGRAM_CONFIG.CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_CONFIG.REDIRECT_URI,
        code,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Erro ao trocar código por token:', error.response?.data || error.message);
    throw new Error('Erro ao obter token de acesso do Instagram');
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
  username?: string;
}): Promise<IInstagramInstance> {
  const webhookUrl = `${SERVER_CONFIG.API_URL}/api/instagram/webhook`;

  const instance = new InstagramInstance({
    name: data.name,
    userId: data.userId,
    instagramAccountId: data.instagramAccountId,
    accessToken: data.accessToken,
    tokenType: data.tokenType || 'bearer',
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
