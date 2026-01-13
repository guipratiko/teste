/**
 * Service para integração com Instagram Graph API
 */

import axios from 'axios';
import InstagramInstance, { IInstagramInstance } from '../models/InstagramInstance';
import { INSTAGRAM_CONFIG, SERVER_CONFIG } from '../config/constants';

export interface InstagramUserInfo {
  id: string;
  username?: string; // Opcional pois pode não estar disponível sem chamar API
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
 * Se user_id já estiver disponível, usamos diretamente sem fazer chamada à API
 * Caso contrário, tentamos obter via API (mas pode falhar para Basic Display)
 */
export async function getInstagramUserInfo(
  accessToken: string,
  userId?: string | number
): Promise<InstagramUserInfo> {
  console.log('🔍 getInstagramUserInfo chamado com userId:', userId, 'tipo:', typeof userId);
  
  // Se já temos user_id, retornar informações básicas sem chamar API
  if (userId !== undefined && userId !== null && userId !== '') {
    console.log('👤 Usando user_id fornecido diretamente:', userId);
    console.log('✅ Informações do usuário (sem chamada à API)');
    return {
      id: userId.toString(),
      username: undefined, // Não temos username sem chamar API, mas não é crítico
      account_type: 'BUSINESS', // Assumir business baseado nas permissões obtidas
    };
  }
  
  console.log('⚠️ user_id não disponível, tentando obter via API...');

  // Se não temos user_id, tentar obter via API (pode falhar para Basic Display)
  console.log('👤 Tentando obter informações do usuário via API...');
  console.log('⚠️ Nota: Isso pode falhar para Instagram Basic Display API');
  
  try {
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
    console.error('❌ Erro ao obter informações do usuário via API');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    
    // Se não tiver userId e falhar, lançar erro
    throw new Error('Erro ao obter informações do usuário do Instagram e user_id não disponível');
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
  permissions?: string[];
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
      permissions: response.data.permissions || [],
    };

    console.log('📋 Token type:', tokenData.token_type);
    console.log('⏰ Expires in:', tokenData.expires_in, 'segundos');
    console.log('👤 User ID:', tokenData.user_id);
    console.log('🔐 Permissions:', tokenData.permissions);

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
 * Nota: Para Instagram Basic Display, pode não ser necessário trocar por token de longa duração
 * ou pode usar um endpoint diferente. Vamos tentar e se falhar, usar o token de curta duração.
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

    // Tentar GET primeiro (conforme documentação)
    try {
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
    } catch (getError: any) {
      // Se GET falhar, pode ser que a API não suporte para este tipo de app
      // Retornar o token de curta duração como fallback
      console.warn('⚠️ GET não suportado, usando token de curta duração');
      throw getError;
    }
  } catch (error: any) {
    console.error('❌ Erro ao trocar por token de longa duração');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    
    // Retornar token de curta duração como fallback
    console.log('📋 Usando token de curta duração (1 hora) como fallback');
    return {
      access_token: shortLivedToken,
      token_type: 'bearer',
      expires_in: 3600, // 1 hora
    };
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
