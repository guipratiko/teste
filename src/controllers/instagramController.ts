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
  getInstagramUserInfo,
  findInstanceByAccountId,
} from '../services/instagramService';
import { IInstagramInstance } from '../models/InstagramInstance';
import { INSTAGRAM_CONFIG } from '../config/constants';
import { createValidationError, handleControllerError } from '../middleware/errorHandler';
import { verifyWebhookToken, validateWebhookSignature } from '../utils/webhookValidator';
import { RequestWithRawBody } from '../middleware/rawBody';

interface AuthRequest extends Request {
  userId?: string;
}

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

    // Construir URL de autorização
    const scopes = INSTAGRAM_CONFIG.SCOPES.join('%2C');
    const redirectUri = encodeURIComponent(INSTAGRAM_CONFIG.REDIRECT_URI);
    const state = encodeURIComponent(JSON.stringify({ userId, instanceName }));

    const authUrl = `${INSTAGRAM_CONFIG.OAUTH_URL}?force_reauth=true&client_id=${INSTAGRAM_CONFIG.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}`;

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
    const { code, state, error } = req.query;

    if (error) {
      console.error('Erro no OAuth:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?error=oauth_failed`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?error=invalid_callback`);
    }

    // Decodificar state
    const stateData = JSON.parse(decodeURIComponent(state as string));
    const { userId, instanceName } = stateData;

    // Trocar código por token
    const tokenData = await exchangeCodeForToken(code as string);

    // Obter informações do usuário
    const userInfo = await getInstagramUserInfo(tokenData.access_token);

    // Criar ou atualizar instância
    let instance = await findInstanceByAccountId(userInfo.id);

    if (instance) {
      // Atualizar instância existente
      instance.accessToken = tokenData.access_token;
      instance.tokenType = tokenData.token_type || 'bearer';
      instance.username = userInfo.username;
      instance.status = 'connected';
      await instance.save();
    } else {
      // Criar nova instância
      instance = await createInstance({
        name: instanceName || userInfo.username || 'Instagram',
        userId,
        instagramAccountId: userInfo.id,
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'bearer',
        username: userInfo.username,
      });
    }

    // Redirecionar para página de gerenciamento
    res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?success=instagram_connected&instanceId=${instance._id}`);
  } catch (error: unknown) {
    console.error('Erro no callback OAuth:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'https://app.clerky.com.br'}/gerenciador-conexoes?error=connection_failed`);
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

    const verifiedChallenge = verifyWebhookToken(mode, token, challenge);

    if (verifiedChallenge) {
      res.status(200).send(verifiedChallenge);
    } else {
      res.status(403).json({ error: 'Token de verificação inválido' });
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
    // Validar assinatura usando raw body
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    if (!validateWebhookSignature(rawBody, signature)) {
      console.error('❌ Assinatura de webhook inválida');
      return res.status(403).json({ error: 'Assinatura inválida' });
    }

    const { object, entry } = req.body;

    if (object !== 'instagram') {
      return res.status(200).json({ status: 'ok' });
    }

    // Processar cada entrada
    for (const entryItem of entry || []) {
      const accountId = entryItem.id;

      // Buscar instância pelo ID da conta
      const instance = await findInstanceByAccountId(accountId);

      if (!instance) {
        console.warn(`⚠️ Instância não encontrada para accountId: ${accountId}`);
        continue;
      }

      // Processar mensagens (DM)
      if (entryItem.messaging) {
        for (const message of entryItem.messaging) {
          await processDirectMessage(instance, message);
        }
      }

      // Processar comentários
      if (entryItem.changes) {
        for (const change of entryItem.changes) {
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
    const senderId = message.sender?.id;
    const messageText = message.message?.text;
    const timestamp = message.timestamp;

    if (!senderId || !messageText) {
      return;
    }

    console.log(`📨 DM recebida de ${senderId}: ${messageText}`);

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
    const commentId = commentData.id;
    const commentText = commentData.text;
    const fromUserId = commentData.from?.id;
    const fromUsername = commentData.from?.username;
    const mediaId = commentData.media?.id;

    if (!commentId || !commentText) {
      return;
    }

    console.log(`💬 Comentário recebido de ${fromUsername} (${fromUserId}): ${commentText}`);

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
      return res.status(400).json({ error: 'signed_request é obrigatório' });
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
      return res.status(400).json({ error: 'signed_request é obrigatório' });
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
