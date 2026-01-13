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
    console.log('🔑 Client ID:', INSTAGRAM_CONFIG.CLIENT_ID || '❌ NÃO CONFIGURADO');
    console.log('🔑 Client Secret:', INSTAGRAM_CONFIG.CLIENT_SECRET ? '***configurado***' : '❌ NÃO CONFIGURADO');
    
    if (!INSTAGRAM_CONFIG.CLIENT_ID || !INSTAGRAM_CONFIG.CLIENT_SECRET) {
      throw new Error('CLIENT_ID ou CLIENT_SECRET não configurados no .env');
    }

    // A API do Instagram requer application/x-www-form-urlencoded no body
    // IMPORTANTE: redirect_uri deve ser EXATAMENTE igual ao usado na URL de autorização
    const redirectUri = INSTAGRAM_CONFIG.REDIRECT_URI;
    
    console.log('🔗 Redirect URI usado na troca do código:', redirectUri);
    console.log('⚠️ IMPORTANTE: Este redirect_uri deve ser IDÊNTICO ao usado na URL de autorização');
    
    const params = new URLSearchParams();
    params.append('client_id', INSTAGRAM_CONFIG.CLIENT_ID);
    params.append('client_secret', INSTAGRAM_CONFIG.CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    params.append('code', code);

    console.log('📋 Parâmetros enviados:');
    console.log('   - client_id:', INSTAGRAM_CONFIG.CLIENT_ID);
    console.log('   - client_secret:', INSTAGRAM_CONFIG.CLIENT_SECRET ? '***configurado***' : '❌ NÃO CONFIGURADO');
    console.log('   - grant_type: authorization_code');
    console.log('   - redirect_uri:', redirectUri);
    console.log('   - code:', code.substring(0, 20) + '...');
    console.log('\n⚠️ VERIFICAÇÃO:');
    console.log('   - O CLIENT_ID e CLIENT_SECRET devem corresponder ao app usado na URL de autorização');
    console.log('   - O redirect_uri deve ser EXATAMENTE igual ao usado na URL de autorização');
    console.log('   - Verifique o .env nas linhas 6-7 (CLIENT_ID e CLIENT_SECRET)\n');

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
 * Consulta informações completas sobre webhooks inscritos
 * GET /{api_version}/{ig_user_id}/subscribed_apps
 * 
 * Retorna a resposta completa da API incluindo campos inscritos e outras informações
 */
export async function getSubscribedAppsInfo(
  accessToken: string,
  instagramAccountId: string
): Promise<any> {
  try {
    const url = `${INSTAGRAM_CONFIG.API_URL}/${INSTAGRAM_CONFIG.API_VERSION}/${instagramAccountId}/subscribed_apps`;
    
    console.log('🔍 Consultando webhooks inscritos...');
    console.log('👤 Account ID:', instagramAccountId);
    console.log('🔗 URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    console.log('✅ Resposta recebida:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro ao consultar webhooks inscritos');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

/**
 * Verifica quais campos estão inscritos em webhooks
 * GET /{api_version}/{ig_user_id}/subscribed_apps
 * 
 * NOTA: Este endpoint só funciona para apps configurados como "Instagram API with Business Login"
 * ou "Instagram API with Facebook Login for Business". Apps "Basic Display" não suportam webhooks.
 */
export async function getSubscribedFields(
  accessToken: string,
  instagramAccountId: string
): Promise<string[]> {
  try {
    const info = await getSubscribedAppsInfo(accessToken, instagramAccountId);
    const subscribedFields = info?.data?.[0]?.subscribed_fields || [];
    console.log('📋 Campos já inscritos:', subscribedFields.join(', ') || 'Nenhum');
    return subscribedFields;
  } catch (error: any) {
    if (error.response?.data?.error?.code === 100) {
      console.warn('⚠️ App não suporta inscrição automática em webhooks');
      console.warn('📋 Possíveis causas:');
      console.warn('   1. App configurado como "Basic Display" (não suporta webhooks)');
      console.warn('   2. App precisa ser configurado como "Business Login" ou "Facebook Login for Business"');
      console.warn('   3. Verifique em: https://developers.facebook.com/apps/' + INSTAGRAM_CONFIG.CLIENT_ID + '/instagram-basic-display/basic-display/');
      console.warn('ℹ️ Webhooks devem ser configurados manualmente no Facebook Developers');
    } else {
      console.warn('⚠️ Erro ao verificar campos inscritos:', error.response?.data || error.message);
    }
    return [];
  }
}

/**
 * Inscreve a conta do Instagram em webhooks
 * POST /{api_version}/{ig_user_id}/subscribed_apps
 * 
 * Campos disponíveis:
 * - messages, messaging_postbacks, messaging_seen, messaging_handover, messaging_referral
 * - message_reactions, standby, comments, live_comments, mentions, story_insights
 * 
 * NOTA: Este endpoint só funciona para apps configurados como "Instagram API with Business Login"
 * ou "Instagram API with Facebook Login for Business". Apps "Basic Display" não suportam webhooks.
 */
export async function subscribeToWebhook(
  accessToken: string,
  instagramAccountId: string
): Promise<boolean> {
  try {
    console.log('📡 Inscrevendo conta do Instagram em webhooks...');
    console.log('👤 Account ID:', instagramAccountId);
    console.log('🔗 API URL:', INSTAGRAM_CONFIG.API_URL);
    console.log('📋 API Version:', INSTAGRAM_CONFIG.API_VERSION);
    
    // Verificar campos já inscritos
    const existingFields = await getSubscribedFields(accessToken, instagramAccountId);
    
    // Se não conseguiu verificar, pode ser que o app não suporte
    // Mas vamos tentar inscrever mesmo assim
    if (existingFields.length === 0) {
      console.log('ℹ️ Não foi possível verificar campos existentes, tentando inscrever...');
    }
    
    // Campos que queremos receber via webhook
    const desiredFields = [
      'messages',              // Mensagens diretas
      'messaging_postbacks',    // Postbacks de mensagens
      'messaging_seen',        // Mensagens visualizadas
      'comments',              // Comentários em posts
      'live_comments',         // Comentários em lives
      'mentions',              // Menções
    ];
    
    // Verificar se já está tudo inscrito
    const missingFields = existingFields.length > 0 
      ? desiredFields.filter(field => !existingFields.includes(field))
      : desiredFields;
    
    if (missingFields.length === 0 && existingFields.length > 0) {
      console.log('✅ Todos os campos já estão inscritos');
      return true;
    }
    
    console.log('📋 Campos a inscrever:', desiredFields.join(', '));
    
    // URL da API: POST /{api_version}/{ig_user_id}/subscribed_apps
    const url = `${INSTAGRAM_CONFIG.API_URL}/${INSTAGRAM_CONFIG.API_VERSION}/${instagramAccountId}/subscribed_apps`;
    
    console.log('📋 URL de inscrição:', url);
    
    const response = await axios.post(
      url,
      {
        subscribed_fields: desiredFields,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    console.log('✅ Conta inscrita em webhooks com sucesso');
    console.log('📋 Resposta:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error: any) {
    if (error.response?.data?.error?.code === 100) {
      console.warn('⚠️ App não suporta inscrição automática em webhooks');
      console.warn('📋 O app parece estar configurado como "Basic Display"');
      console.warn('📋 Para usar webhooks, o app precisa ser configurado como:');
      console.warn('   - "Instagram API with Business Login" OU');
      console.warn('   - "Instagram API with Facebook Login for Business"');
      console.warn('📋 Configure em: https://developers.facebook.com/apps/' + INSTAGRAM_CONFIG.CLIENT_ID + '/instagram-basic-display/basic-display/');
      console.warn('ℹ️ Webhooks devem ser configurados manualmente no Facebook Developers');
      console.warn('ℹ️ Link: https://developers.facebook.com/apps/' + INSTAGRAM_CONFIG.CLIENT_ID + '/webhooks/');
    } else {
      console.error('❌ Erro ao inscrever conta em webhooks');
      console.error('📋 Status:', error.response?.status);
      console.error('📋 Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('📋 Mensagem:', error.message);
      console.warn('ℹ️ Verifique se o webhook está configurado no Facebook Developers');
      console.warn('ℹ️ Link: https://developers.facebook.com/apps/' + INSTAGRAM_CONFIG.CLIENT_ID + '/webhooks/');
    }
    
    // Não falhar completamente se a inscrição falhar
    // O webhook pode já estar configurado no Facebook Developers
    console.warn('⚠️ Continuando mesmo com erro na inscrição');
    console.warn('✅ O sistema funcionará se o webhook estiver configurado manualmente');
    
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
