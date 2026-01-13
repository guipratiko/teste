/**
 * Rotas do Instagram
 */

import { Router } from 'express';
import {
  authorizeInstagram,
  oauthCallback,
  validateCallback,
  verifyWebhook,
  receiveWebhook,
  createInstagramInstance,
  listInstances,
  getInstance,
  getSubscribedApps,
  testSubscribedApps,
  deleteInstagramInstance,
  sendMessage,
  replyComment,
  handleDeauthorize,
  handleDataDeletion,
} from '../controllers/instagramController';

const router = Router();

// Rotas de autenticação OAuth
router.get('/auth/validate-callback', validateCallback);
router.get('/auth/authorize', authorizeInstagram);
router.get('/auth/callback', oauthCallback);

// Rotas de webhook (públicas - validação por assinatura)
router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

// Rotas de desautorização e exclusão de dados
router.post('/deauthorize', handleDeauthorize);
router.post('/data-deletion', handleDataDeletion);

// Rotas de instâncias
router.post('/instances', createInstagramInstance);
router.get('/instances', listInstances);
router.get('/instances/:id', getInstance);
router.get('/instances/:id/subscribed-apps', getSubscribedApps);
router.delete('/instances/:id', deleteInstagramInstance);

// Rotas de teste
router.get('/test/subscribed-apps', testSubscribedApps);

// Rotas de mensagens
router.post('/messages', sendMessage);
router.post('/comments/:id/replies', replyComment);

export default router;
