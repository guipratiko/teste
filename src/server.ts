/**
 * Servidor de teste para integração do Instagram
 * URL: https://teste.clerky.com.br
 */

// Configurar timezone
process.env.TZ = 'America/Sao_Paulo';

import express, { Express } from 'express';
import cors from 'cors';
import { connectMongoDB } from './config/databases';
import { SERVER_CONFIG } from './config/constants';
import instagramRoutes from './routes/instagram.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rawBodyMiddleware } from './middleware/rawBody';

const app: Express = express();
const PORT = SERVER_CONFIG.PORT;

// Middlewares
app.use(cors({
  origin: SERVER_CONFIG.CORS_ORIGIN,
  credentials: true,
}));

// Middleware para capturar raw body do webhook (deve vir antes do express.json)
app.use('/api/instagram/webhook', rawBodyMiddleware);

// Aumentar limite de payload para suportar webhooks
app.use(express.json({ limit: '10mb', verify: (req: any, res, buf) => {
  // Salvar raw body se não foi capturado pelo middleware anterior
  if (req.path === '/api/instagram/webhook' && !req.rawBody) {
    req.rawBody = buf;
  }
}}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conectar ao MongoDB
connectMongoDB();

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Clerky Instagram Test Service está funcionando',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      instagram: '/api/instagram',
    },
  });
});

// Rota de health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Rotas do Instagram
app.use('/api/instagram', instagramRoutes);

// Middleware de erro 404
app.use(notFoundHandler);

// Middleware de tratamento de erros
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste do Instagram rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${SERVER_CONFIG.NODE_ENV}`);
  console.log(`🌐 API disponível em http://localhost:${PORT}/api`);
  console.log(`📥 Webhook disponível em http://localhost:${PORT}/api/instagram/webhook`);
  console.log(`🔗 URL de produção: https://teste.clerky.com.br`);
});

export default app;
