/**
 * Controller para gerenciar instâncias do Instagram
 */

import { Request, Response, NextFunction } from 'express';
import {
  createInstance,
  findInstanceById,
  findInstancesByUserId,
  deleteInstance,
  sendDirectMessage,
  replyToComment,
  exchangeCodeForToken,
  exchangeShortLivedForLongLivedToken,
  getInstagramUserInfo,
  findInstanceByAccountId,
  subscribeToWebhook,
} from '../services/instagramService';
import { IInstagramInstance } from '../models/InstagramInstance';
import { INSTAGRAM_CONFIG, SERVER_CONFIG } from '../config/constants';
import { createValidationError, handleControllerError } from '../middleware/errorHandler';
import { verifyWebhookToken, validateWebhookSignature } from '../utils/webhookValidator';
import { RequestWithRawBody } from '../middleware/rawBody';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Valida configuração da URL de callback
 * GET /api/instagram/auth/validate-callback
 */
export const validateCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const redirectUri = INSTAGRAM_CONFIG.REDIRECT_URI;
    const expectedUrl = `${SERVER_CONFIG.API_URL}/api/instagram/auth/callback`;
    const currentUrl = `${req.protocol}://${req.headers.host}/api/instagram/auth/callback`;

    const isValid = redirectUri === expectedUrl || 
                    redirectUri === currentUrl ||
                    redirectUri === `${process.env.API_URL}/api/instagram/auth/callback`;

    res.json({
      status: 'ok',
      configured: {
        redirectUri,
        expectedUrl,
        currentUrl,
        isValid,
      },
      environment: {
        API_URL: SERVER_CONFIG.API_URL,
        INSTAGRAM_REDIRECT_URI: INSTAGRAM_CONFIG.REDIRECT_URI,
        CLIENT_ID: INSTAGRAM_CONFIG.CLIENT_ID ? '***configurado***' : '❌ não configurado',
        CLIENT_SECRET: INSTAGRAM_CONFIG.CLIENT_SECRET ? '***configurado***' : '❌ não configurado',
        WEBHOOK_VERIFY_TOKEN: INSTAGRAM_CONFIG.WEBHOOK_VERIFY_TOKEN ? '***configurado***' : '❌ não configurado',
      },
      message: isValid
        ? '✅ URL de callback configurada corretamente'
        : '⚠️ URL de callback pode estar incorreta',
      recommendations: !isValid ? [
        `Configure INSTAGRAM_REDIRECT_URI como: ${expectedUrl}`,
        `Ou como: ${currentUrl}`,
        'Certifique-se de que a URL está registrada no Facebook Developers',
      ] : [],
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao validar callback'));
  }
};

/**
 * Inicia fluxo OAuth do Instagram
 * GET /api/instagram/auth/authorize
 */
export const authorizeInstagram = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.query.userId as string;
    const instanceName = req.query.instanceName as string;

    if (!userId) {
      return next(createValidationError('userId é obrigatório'));
    }

    // Validar se REDIRECT_URI está configurado
    if (!INSTAGRAM_CONFIG.REDIRECT_URI) {
      console.error('❌ INSTAGRAM_REDIRECT_URI não está configurado');
      return next(createValidationError('URL de callback não configurada. Configure INSTAGRAM_REDIRECT_URI'));
    }

    // Validar se CLIENT_ID está configurado
    if (!INSTAGRAM_CONFIG.CLIENT_ID) {
      console.error('❌ INSTAGRAM_CLIENT_ID não está configurado');
      return next(createValidationError('Client ID não configurado. Configure INSTAGRAM_CLIENT_ID'));
    }

    // Construir URL de autorização (seguindo documentação oficial)
    // Scopes separados por vírgula (formato URL: %2C)
    const scopes = INSTAGRAM_CONFIG.SCOPES.join('%2C');
    const redirectUri = encodeURIComponent(INSTAGRAM_CONFIG.REDIRECT_URI);
    const state = encodeURIComponent(JSON.stringify({ userId, instanceName }));

    // URL conforme documentação: https://api.instagram.com/oauth/authorize
    const authUrl = `${INSTAGRAM_CONFIG.OAUTH_URL}?client_id=${INSTAGRAM_CONFIG.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}`;

    console.log('🔗 URL de autorização gerada');
    console.log('📋 Redirect URI usado:', INSTAGRAM_CONFIG.REDIRECT_URI);
    console.log('🔑 Client ID:', INSTAGRAM_CONFIG.CLIENT_ID);

    res.redirect(authUrl);
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao iniciar autorização'));
  }
};

/**
 * Callback OAuth do Instagram
 * GET /api/instagram/auth/callback
 */
export const oauthCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('📥 Callback OAuth recebido');
    console.log('📋 Query params:', req.query);
    console.log('🌐 URL completa:', req.url);
    console.log('🔗 Host:', req.headers.host);
    console.log('📡 Protocol:', req.protocol);

    // Verificar se é uma verificação de webhook (Instagram pode verificar o callback também)
    const hubMode = req.query['hub.mode'] as string;
    const hubChallenge = req.query['hub.challenge'] as string;
    const hubVerifyToken = req.query['hub.verify_token'] as string;

    if (hubMode === 'subscribe' && hubChallenge && hubVerifyToken) {
      console.log('🔍 Verificação de webhook detectada no callback');
      console.log('📋 Configuração atual:');
      console.log('   - WEBHOOK_VERIFY_TOKEN configurado:', INSTAGRAM_CONFIG.WEBHOOK_VERIFY_TOKEN ? 'Sim' : 'Não');
      console.log('   - Valor esperado:', INSTAGRAM_CONFIG.WEBHOOK_VERIFY_TOKEN || '(não configurado)');
      
      const verifiedChallenge = verifyWebhookToken(hubMode, hubVerifyToken, hubChallenge);
      
      if (verifiedChallenge) {
        console.log('✅ Webhook verificado, retornando challenge:', verifiedChallenge);
        // Retornar o challenge como texto puro (não JSON)
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(verifiedChallenge);
        return;
      } else {
        console.error('❌ Token de verificação inválido');
        console.error('   - Token recebido:', hubVerifyToken);
        console.error('   - Token esperado:', INSTAGRAM_CONFIG.WEBHOOK_VERIFY_TOKEN || '(não configurado)');
        console.error('   - Dica: Configure INSTAGRAM_WEBHOOK_VERIFY_TOKEN no .env ou variáveis de ambiente');
        res.status(403).send('Forbidden');
        return;
      }
    }

    // Processar como callback OAuth normal
    const { code, state, error } = req.query;

    if (error) {
      console.error('Erro no OAuth:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?error=oauth_failed`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?error=invalid_callback`);
      return;
    }

    // Decodificar state
    let stateData;
    try {
      const decodedState = decodeURIComponent(state as string);
      console.log('📋 State decodificado:', decodedState);
      stateData = JSON.parse(decodedState);
    } catch (error: any) {
      console.error('❌ Erro ao decodificar state:', error);
      console.error('📋 State recebido:', state);
      res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?error=invalid_state`);
      return;
    }
    
    const { userId, instanceName } = stateData;

    // Limpar código: remover #_ se presente (conforme documentação)
    let cleanCode = code as string;
    if (cleanCode.endsWith('#_')) {
      cleanCode = cleanCode.replace(/#_$/, '');
      console.log('🧹 Código limpo (removido #_):', cleanCode.substring(0, 20) + '...');
    }

    // Trocar código por token de curta duração
    const shortLivedTokenData = await exchangeCodeForToken(cleanCode);

    // Trocar token de curta duração por token de longa duração
    const longLivedTokenData = await exchangeShortLivedForLongLivedToken(shortLivedTokenData.access_token);

    // Calcular data de expiração
    const expiresIn = longLivedTokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Obter informações do usuário (usar user_id da resposta se disponível)
    console.log('📋 User ID disponível:', shortLivedTokenData.user_id);
    const userInfo = await getInstagramUserInfo(longLivedTokenData.access_token, shortLivedTokenData.user_id);

    // Criar ou atualizar instância
    let instance = await findInstanceByAccountId(userInfo.id);

    if (instance) {
      // Atualizar instância existente
      instance.accessToken = longLivedTokenData.access_token;
      instance.tokenType = longLivedTokenData.token_type || 'bearer';
      instance.tokenExpiresAt = tokenExpiresAt;
      instance.isLongLived = expiresIn > 3600; // Tokens de longa duração expiram em mais de 1 hora
      instance.username = userInfo.username;
      instance.status = 'connected';
      await instance.save();
      console.log('✅ Instância atualizada');
    } else {
      // Criar nova instância
      instance = await createInstance({
        name: instanceName || userInfo.username || 'Instagram',
        userId,
        instagramAccountId: userInfo.id,
        accessToken: longLivedTokenData.access_token,
        tokenType: longLivedTokenData.token_type || 'bearer',
        tokenExpiresAt,
        isLongLived: expiresIn > 3600,
        username: userInfo.username,
      });
      console.log('✅ Nova instância criada');
      
      // Tentar registrar webhook (pode falhar, mas não é crítico)
      try {
        await subscribeToWebhook(longLivedTokenData.access_token, userInfo.id);
      } catch (error: any) {
        console.warn('⚠️ Não foi possível registrar webhook automaticamente');
        console.warn('📋 Configure manualmente no Facebook Developers');
      }
    }

    // Redirecionar para página de gerenciamento
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?success=instagram_connected&instanceId=${instance._id}`);
  } catch (error: unknown) {
    console.error('Erro no callback OAuth:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?error=connection_failed`);
    return;
  }
};

/**
 * Verificação do webhook (GET)
 * GET /api/instagram/webhook
 */
export const verifyWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    console.log('🔍 Verificação de webhook recebida');
    console.log('📋 Mode:', mode);
    console.log('🔑 Token:', token ? '***fornecido***' : 'não fornecido');
    console.log('🎯 Challenge:', challenge);

    const verifiedChallenge = verifyWebhookToken(mode, token, challenge);

    if (verifiedChallenge) {
      console.log('✅ Webhook verificado, retornando challenge:', verifiedChallenge);
      // Retornar o challenge como texto puro (não JSON)
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(verifiedChallenge);
    } else {
      console.error('❌ Token de verificação inválido');
      res.status(403).send('Forbidden');
    }
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao verificar webhook'));
  }
};

/**
 * Receber webhook do Instagram (POST)
 * POST /api/instagram/webhook
 */
export const receiveWebhook = async (
  req: RequestWithRawBody,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('📥 Webhook recebido do Instagram');
    console.log('📋 Headers:', {
      'x-hub-signature-256': req.headers['x-hub-signature-256'] ? 'presente' : 'ausente',
      'content-type': req.headers['content-type'],
    });
    console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));

    // Validar assinatura usando raw body
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    if (!signature) {
      console.warn('⚠️ Assinatura não presente, mas continuando...');
      // Para desenvolvimento, podemos permitir sem assinatura
      // Em produção, isso deve ser obrigatório
    } else if (!validateWebhookSignature(rawBody, signature)) {
      console.error('❌ Assinatura de webhook inválida');
      res.status(403).json({ error: 'Assinatura inválida' });
      return;
    } else {
      console.log('✅ Assinatura válida');
    }

    const { object, entry } = req.body;

    if (object !== 'instagram') {
      console.log('ℹ️ Objeto não é instagram, ignorando:', object);
      res.status(200).json({ status: 'ok' });
      return;
    }

    console.log('📋 Processando entrada do Instagram');
    console.log('📊 Número de entradas:', entry?.length || 0);

    // Processar cada entrada
    for (const entryItem of entry || []) {
      const accountId = entryItem.id;
      console.log('🔍 Processando entrada para accountId:', accountId);

      // Buscar instância pelo ID da conta
      const instance = await findInstanceByAccountId(accountId);

      if (!instance) {
        console.warn(`⚠️ Instância não encontrada para accountId: ${accountId}`);
        console.warn('📋 Verifique se a instância foi criada corretamente');
        continue;
      }

      console.log('✅ Instância encontrada:', instance.name);

      // Processar mensagens (DM)
      if (entryItem.messaging) {
        console.log('💬 Processando mensagens (DM):', entryItem.messaging.length);
        for (const message of entryItem.messaging) {
          await processDirectMessage(instance, message);
        }
      }

      // Processar comentários
      if (entryItem.changes) {
        console.log('💬 Processando mudanças:', entryItem.changes.length);
        for (const change of entryItem.changes) {
          console.log('📋 Campo:', change.field);
          if (change.field === 'comments') {
            await processComment(instance, change.value);
          }
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: unknown) {
    console.error('Erro ao processar webhook:', error);
    // Sempre retornar 200 para evitar retentativas
    res.status(200).json({ status: 'ok' });
  }
};

/**
 * Processa mensagem direta recebida
 */
async function processDirectMessage(instance: IInstagramInstance, message: any): Promise<void> {
  try {
    console.log('📨 Processando DM:', JSON.stringify(message, null, 2));
    
    const senderId = message.sender?.id;
    const messageText = message.message?.text;
    const timestamp = message.timestamp;

    if (!senderId || !messageText) {
      console.warn('⚠️ DM sem senderId ou messageText, ignorando');
      return;
    }

    console.log(`✅ DM recebida de ${senderId}: ${messageText}`);
    console.log(`📅 Timestamp: ${timestamp}`);
    console.log(`👤 Instância: ${instance.name} (${instance.instagramAccountId})`);
    
    // TODO: Acionar workflows do MindClerky aqui
    // await triggerWorkflow(instance, 'dm', senderId, messageText);

    // TODO: Acionar workflows do MindClerky aqui
    // await triggerWorkflow(instance, 'dm', senderId, messageText);
  } catch (error) {
    console.error('Erro ao processar DM:', error);
  }
}

/**
 * Processa comentário recebido
 */
async function processComment(instance: IInstagramInstance, commentData: any): Promise<void> {
  try {
    console.log('💬 Processando comentário:', JSON.stringify(commentData, null, 2));
    
    const commentId = commentData.id;
    const commentText = commentData.text;
    const fromUserId = commentData.from?.id;
    const fromUsername = commentData.from?.username;
    const mediaId = commentData.media?.id;

    if (!commentId || !commentText) {
      console.warn('⚠️ Comentário sem commentId ou commentText, ignorando');
      return;
    }

    console.log(`✅ Comentário recebido de ${fromUsername || 'desconhecido'} (${fromUserId}): ${commentText}`);
    console.log(`📋 Comment ID: ${commentId}`);
    console.log(`📷 Media ID: ${mediaId}`);
    console.log(`👤 Instância: ${instance.name} (${instance.instagramAccountId})`);
    
    // TODO: Acionar workflows do MindClerky aqui
    // await triggerWorkflow(instance, 'comment', fromUserId, commentText, { commentId, mediaId });

    // TODO: Acionar workflows do MindClerky aqui
    // await triggerWorkflow(instance, 'comment', fromUserId, commentText, { commentId, mediaId });
  } catch (error) {
    console.error('Erro ao processar comentário:', error);
  }
}

/**
 * Criar nova instância
 * POST /api/instagram/instances
 */
export const createInstagramInstance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId || req.body.userId;
    const { name } = req.body;

    if (!userId) {
      return next(createValidationError('userId é obrigatório'));
    }

    if (!name || name.trim().length < 3) {
      return next(createValidationError('Nome deve ter no mínimo 3 caracteres'));
    }

    // Redirecionar para OAuth
    const authUrl = `${process.env.API_URL || 'http://localhost:3002'}/api/instagram/auth/authorize?userId=${userId}&instanceName=${encodeURIComponent(name)}`;
    
    res.json({
      status: 'success',
      message: 'Redirecione para a URL de autorização',
      authUrl,
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao criar instância'));
  }
};

/**
 * Listar instâncias do usuário
 * GET /api/instagram/instances
 */
export const listInstances = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId || req.query.userId as string;

    if (!userId) {
      return next(createValidationError('userId é obrigatório'));
    }

    const instances = await findInstancesByUserId(userId);

    res.json({
      status: 'success',
      instances: instances.map((inst) => ({
        id: inst._id,
        name: inst.name,
        instanceName: inst.instanceName,
        username: inst.username,
        status: inst.status,
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
      })),
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao listar instâncias'));
  }
};

/**
 * Obter instância específica
 * GET /api/instagram/instances/:id
 */
export const getInstance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const instance = await findInstanceById(id);

    if (!instance) {
      return next(createValidationError('Instância não encontrada'));
    }

    res.json({
      status: 'success',
      instance: {
        id: instance._id,
        name: instance.name,
        instanceName: instance.instanceName,
        username: instance.username,
        status: instance.status,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
      },
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao obter instância'));
  }
};

/**
 * Deletar instância
 * DELETE /api/instagram/instances/:id
 */
export const deleteInstagramInstance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await deleteInstance(id);

    if (!deleted) {
      return next(createValidationError('Instância não encontrada'));
    }

    res.json({
      status: 'success',
      message: 'Instância deletada com sucesso',
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao deletar instância'));
  }
};

/**
 * Enviar mensagem direta
 * POST /api/instagram/messages
 */
export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { instanceId, recipientId, message } = req.body;

    if (!instanceId || !recipientId || !message) {
      return next(createValidationError('instanceId, recipientId e message são obrigatórios'));
    }

    const instance = await findInstanceById(instanceId);

    if (!instance) {
      return next(createValidationError('Instância não encontrada'));
    }

    const result = await sendDirectMessage(instance, { recipientId, message });

    res.json({
      status: 'success',
      message: 'Mensagem enviada com sucesso',
      data: result,
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao enviar mensagem'));
  }
};

/**
 * Responder comentário
 * POST /api/instagram/comments/:id/replies
 */
export const replyComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: commentId } = req.params;
    const { instanceId, message } = req.body;

    if (!instanceId || !message) {
      return next(createValidationError('instanceId e message são obrigatórios'));
    }

    const instance = await findInstanceById(instanceId);

    if (!instance) {
      return next(createValidationError('Instância não encontrada'));
    }

    const result = await replyToComment(instance, { commentId, message });

    res.json({
      status: 'success',
      message: 'Comentário respondido com sucesso',
      data: result,
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao responder comentário'));
  }
};

/**
 * Desautorização de app
 * POST /api/instagram/deauthorize
 */
export const handleDeauthorize = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { signed_request } = req.body;

    if (!signed_request) {
      res.status(400).json({ error: 'signed_request é obrigatório' });
      return;
    }

    // TODO: Validar signed_request e processar desautorização
    console.log('Desautorização recebida:', signed_request);

    res.json({ status: 'ok' });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao processar desautorização'));
  }
};

/**
 * Solicitação de exclusão de dados
 * POST /api/instagram/data-deletion
 */
export const handleDataDeletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { signed_request } = req.body;

    if (!signed_request) {
      res.status(400).json({ error: 'signed_request é obrigatório' });
      return;
    }

    // TODO: Validar signed_request e processar exclusão de dados
    console.log('Solicitação de exclusão de dados recebida:', signed_request);

    res.json({
      url: `${process.env.API_URL || 'http://localhost:3002'}/api/instagram/data-deletion/status`,
      confirmation_code: 'CONFIRMATION_CODE',
    });
  } catch (error: unknown) {
    return next(handleControllerError(error, 'Erro ao processar exclusão de dados'));
  }
};
