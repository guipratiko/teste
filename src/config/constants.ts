/**
 * Configurações centralizadas do serviço de teste do Instagram
 */

import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Server Configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3002,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:3002',
};

// Database Configuration
export const DATABASE_CONFIG = {
  URI: process.env.MONGODB_URI || 'mongodb://clerky:qGfdSCz1bDTuHD5o@easy.clerky.com.br:27017/?tls=false',
};

// Instagram Configuration
export const INSTAGRAM_CONFIG = {
  CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID || '',
  CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET || '',
  WEBHOOK_VERIFY_TOKEN: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || '',
  REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || '',
  DEAUTHORIZE_URL: process.env.INSTAGRAM_DEAUTHORIZE_URL || '',
  DATA_DELETION_URL: process.env.INSTAGRAM_DATA_DELETION_URL || '',
  API_URL: process.env.INSTAGRAM_API_URL || 'https://graph.instagram.com',
  API_VERSION: process.env.INSTAGRAM_API_VERSION || 'v24.0',
  OAUTH_URL: 'https://api.instagram.com/oauth/authorize',
  TOKEN_URL: 'https://api.instagram.com/oauth/access_token',
  SCOPES: [
    'instagram_business_basic', // Obrigatório
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights',
  ],
};
