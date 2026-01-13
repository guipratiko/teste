/**
 * Configuração e gerenciamento de conexão MongoDB
 */

import mongoose from 'mongoose';
import { DATABASE_CONFIG } from './constants';

export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(DATABASE_CONFIG.URI);
    console.log('✅ Conectado ao MongoDB com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

// Event listeners para MongoDB
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Erro na conexão MongoDB:', error);
});

// Função para fechar conexão
export const closeMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB desconectado');
  } catch (error) {
    console.error('❌ Erro ao fechar conexão MongoDB:', error);
  }
};
