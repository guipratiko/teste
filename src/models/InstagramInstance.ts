/**
 * Modelo de Instância do Instagram
 */

import mongoose, { Document, Schema } from 'mongoose';
import { generateInstanceToken, generateInstanceName } from '../utils/tokenGenerator';

export interface IInstagramInstance extends Document {
  instanceName: string; // Nome interno gerado automaticamente
  name: string; // Nome escolhido pelo usuário
  userId: string; // ID do usuário (pode ser string ou ObjectId)
  token: string; // Token único da instância
  instagramAccountId: string; // ID da conta do Instagram (ex: 17841475047401790)
  accessToken: string; // Token de acesso do Instagram
  tokenType: string; // Tipo do token (geralmente "bearer")
  tokenExpiresAt?: Date; // Data de expiração do token
  isLongLived?: boolean; // Se é token de longa duração
  username?: string; // Nome de usuário do Instagram
  status: 'connected' | 'disconnected' | 'error';
  webhookUrl: string; // URL do webhook configurada
  createdAt: Date;
  updatedAt: Date;
}

const InstagramInstanceSchema: Schema = new Schema(
  {
    instanceName: {
      type: String,
      required: [true, 'Nome da instância é obrigatório'],
      unique: true,
      trim: true,
      default: () => generateInstanceName(),
    },
    name: {
      type: String,
      required: [true, 'Nome da instância é obrigatório'],
      trim: true,
      minlength: [3, 'Nome deve ter no mínimo 3 caracteres'],
      maxlength: [50, 'Nome deve ter no máximo 50 caracteres'],
    },
    userId: {
      type: String,
      required: [true, 'Usuário é obrigatório'],
    },
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => generateInstanceToken(),
    },
    instagramAccountId: {
      type: String,
      required: [true, 'ID da conta do Instagram é obrigatório'],
    },
    accessToken: {
      type: String,
      required: [true, 'Token de acesso é obrigatório'],
    },
    tokenType: {
      type: String,
      default: 'bearer',
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    isLongLived: {
      type: Boolean,
      default: false,
    },
    username: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error'],
      default: 'connected',
    },
    webhookUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hook pre-save para garantir que o token seja sempre gerado
InstagramInstanceSchema.pre('save', async function (next) {
  if (!this.token || this.token === '') {
    let newToken = generateInstanceToken();
    const InstagramInstanceModel = this.constructor as typeof InstagramInstance;
    let existingInstance = await InstagramInstanceModel.findOne({ token: newToken });
    while (existingInstance) {
      newToken = generateInstanceToken();
      existingInstance = await InstagramInstanceModel.findOne({ token: newToken });
    }
    this.token = newToken;
  }
  next();
});

// Índices para melhor performance
InstagramInstanceSchema.index({ userId: 1 });
InstagramInstanceSchema.index({ instagramAccountId: 1 });

const InstagramInstance = mongoose.model<IInstagramInstance>(
  'InstagramInstance',
  InstagramInstanceSchema
);

export default InstagramInstance;
