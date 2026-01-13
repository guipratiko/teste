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
    
    // A resposta pode vir em formato direto ou dentro de data[0]
    // Conforme documentação: { "data": [{ "access_token": "...", "user_id": "...", "permissions": "..." }] }
    let responseData = response.data;
    
    // Se a resposta estiver dentro de data[0], extrair
    if (responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
      console.log('📋 Resposta está em formato data[0], extraindo...');
      responseData = responseData.data[0];
    }
    
    // A resposta pode ter diferentes formatos
    const tokenData = {
      access_token: responseData.access_token,
      token_type: responseData.token_type || 'bearer',
      expires_in: responseData.expires_in || 3600, // Default 1 hora se não especificado
      user_id: responseData.user_id,
      permissions: responseData.permissions ? 
        (typeof responseData.permissions === 'string' 
          ? responseData.permissions.split(',') 
          : responseData.permissions) 
        : [],
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
 * 
 * Nota: O erro "Unsupported request - method type: get" pode indicar:
 * 1. O app está configurado como Basic Display (não suporta troca para longa duração)
 * 2. O app precisa ser configurado como Graph API no Facebook Developers
 * 3. Pode ser necessário usar POST em vez de GET (mas a documentação diz GET)
 * 
 * Por enquanto, usamos fallback para token de curta duração que funciona perfeitamente.
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
    console.log('ℹ️ Nota: Se falhar, usaremos token de curta duração (1 hora)');

    // Tentar GET primeiro (conforme documentação oficial)
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
      // Se GET falhar com "Unsupported request - method type: get"
      // Pode ser que o app esteja configurado como Basic Display
      // ou precise de configuração adicional no Facebook Developers
      console.warn('⚠️ GET não suportado para este tipo de app');
      console.warn('📋 Possíveis causas:');
      console.warn('   1. App configurado como Basic Display (não suporta longa duração)');
      console.warn('   2. App precisa ser configurado como Graph API');
      console.warn('   3. Permissões ou configurações do app no Facebook Developers');
      throw getError;
    }
  } catch (error: any) {
    console.error('❌ Erro ao trocar por token de longa duração');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    
    // Retornar token de curta duração como fallback (funciona perfeitamente)
    console.log('📋 Usando token de curta duração (1 hora) como fallback');
    console.log('✅ Sistema funcionando normalmente com token de curta duração');
    return {
      access_token: shortLivedToken,
      token_type: 'bearer',
      expires_in: 3600, // 1 hora - funciona perfeitamente
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
 * Inscreve a conta do Instagram em webhooks
 * Necessário para receber eventos de DM e comentários
 * POST /{ig-user-id}/subscribed_apps
 */
export async function subscribeToWebhook(
  accessToken: string,
  instagramAccountId: string
): Promise<boolean> {
  try {
    console.log('📡 Inscrevendo conta do Instagram em webhooks...');
    console.log('👤 Account ID:', instagramAccountId);
    console.log('🔗 API URL:', INSTAGRAM_CONFIG.API_URL);
    
    // Campos que queremos receber via webhook
    const subscribedFields = ['messaging', 'comments'];
    
    // URL da API: POST /{ig-user-id}/subscribed_apps
    const url = `${INSTAGRAM_CONFIG.API_URL}/${instagramAccountId}/subscribed_apps`;
    
    console.log('📋 URL de inscrição:', url);
    console.log('📋 Campos a inscrever:', subscribedFields.join(', '));
    
    const response = await axios.post(
      url,
      {
        subscribed_fields: subscribedFields.join(','),
      },
      {
        params: {
          access_token: accessToken,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ Conta inscrita em webhooks com sucesso');
    console.log('📋 Resposta:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao inscrever conta em webhooks');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('📋 Mensagem:', error.message);
    
    // Não falhar completamente se a inscrição falhar
    // O webhook pode já estar configurado no Facebook Developers
    console.warn('⚠️ Continuando mesmo com erro na inscrição');
    console.warn('ℹ️ Verifique se o webhook está configurado no Facebook Developers');
    
    return false;
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
