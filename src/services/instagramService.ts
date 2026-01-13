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
 * GET https://graph.instagram.com/me?fields=id,username,account_type&access_token=...
 * Nota: Para Basic Display API, pode ser necessário usar o endpoint sem versão
 */
export async function getInstagramUserInfo(
  accessToken: string
): Promise<InstagramUserInfo> {
  try {
    console.log('👤 Obtendo informações do usuário...');
    
    // Tentar primeiro sem versão (Basic Display API)
    let url = `${INSTAGRAM_CONFIG.API_URL}/me`;
    console.log('🔗 URL:', url);

    try {
      const response = await axios.get(url, {
        params: {
          fields: 'id,username,account_type',
          access_token: accessToken,
        },
      });

      console.log('✅ Informações do usuário obtidas:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      // Se falhar, tentar com versão
      console.log('⚠️ Tentando com versão da API...');
      url = `${INSTAGRAM_CONFIG.API_URL}/${INSTAGRAM_CONFIG.API_VERSION}/me`;
      console.log('🔗 URL:', url);

      const response = await axios.get(url, {
        params: {
          fields: 'id,username,account_type',
          access_token: accessToken,
        },
      });

      console.log('✅ Informações do usuário obtidas:', JSON.stringify(response.data, null, 2));
      return response.data;
    }
  } catch (error: any) {
    console.error('❌ Erro ao obter informações do usuário');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('📋 Message:', error.message);
    
    if (error.response?.data?.error) {
      throw new Error(`Erro ao obter informações do usuário: ${error.response.data.error.message || error.response.data.error}`);
    }
    
    throw new Error('Erro ao obter informações do usuário do Instagram');
  }
}

/**
 * Troca código de autorização por token de acesso de curta duração
 * Conforme documentação: https://developers.facebook.com/docs/instagram-platform/reference/access_token
 * A API do Instagram requer application/x-www-form-urlencoded no body
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
    console.log('🔑 Client ID:', INSTAGRAM_CONFIG.CLIENT_ID ? 'Configurado' : '❌ Não configurado');

    // A API do Instagram requer application/x-www-form-urlencoded no body
    const params = new URLSearchParams();
    params.append('client_id', INSTAGRAM_CONFIG.CLIENT_ID);
    params.append('client_secret', INSTAGRAM_CONFIG.CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', INSTAGRAM_CONFIG.REDIRECT_URI);
    params.append('code', code);

    const response = await axios.post(INSTAGRAM_CONFIG.TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('✅ Token de acesso obtido com sucesso');
    console.log('📋 Resposta completa:', JSON.stringify(response.data, null, 2));
    
    // A resposta pode ter diferentes formatos
    const tokenData = {
      access_token: response.data.access_token,
      token_type: response.data.token_type || 'bearer',
      expires_in: response.data.expires_in || 3600, // Default 1 hora se não especificado
      user_id: response.data.user_id,
    };

    console.log('📋 Token type:', tokenData.token_type);
    console.log('⏰ Expires in:', tokenData.expires_in, 'segundos');
    console.log('👤 User ID:', tokenData.user_id);

    return tokenData;
  } catch (error: any) {
    console.error('❌ Erro ao trocar código por token');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('📋 Message:', error.message);
    
    if (error.response?.data?.error_message) {
      throw new Error(`Erro ao obter token: ${error.response.data.error_message}`);
    }
    
    if (error.response?.data?.error) {
      throw new Error(`Erro ao obter token: ${error.response.data.error.message || error.response.data.error}`);
    }
    
    throw new Error('Erro ao obter token de acesso do Instagram');
  }
}

/**
 * Troca token de curta duração por token de longa duração
 * Conforme documentação: https://developers.facebook.com/docs/instagram-platform/reference/access_token
 * GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=...&access_token=...
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
    console.log('🔗 URL:', `${INSTAGRAM_CONFIG.API_URL}/access_token`);

    // Usar GET conforme documentação oficial
    const response = await axios.get(
      `${INSTAGRAM_CONFIG.API_URL}/access_token`,
      {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: INSTAGRAM_CONFIG.CLIENT_SECRET,
          access_token: shortLivedToken,
        },
      }
    );

    console.log('✅ Token de longa duração obtido com sucesso');
    console.log('📋 Resposta:', JSON.stringify(response.data, null, 2));
    console.log('⏰ Expires in:', response.data.expires_in, 'segundos');

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type || 'bearer',
      expires_in: response.data.expires_in,
    };
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
