# Clerky Instagram Test Service

Serviço de teste para integração do Instagram com o Clerky.

## 🚀 Configuração

1. Instalar dependências:
```bash
npm install
```

2. Copiar arquivo de ambiente:
```bash
cp .env.example .env
```

3. Configurar variáveis de ambiente no arquivo `.env`

4. Executar em desenvolvimento:
```bash
npm run dev
```

5. Compilar para produção:
```bash
npm run build
npm start
```

## 📋 Endpoints

### Autenticação OAuth
- `GET /api/instagram/auth/authorize` - Inicia fluxo OAuth
- `GET /api/instagram/auth/callback` - Callback OAuth

### Instâncias
- `POST /api/instagram/instances` - Criar nova instância
- `GET /api/instagram/instances` - Listar instâncias
- `GET /api/instagram/instances/:id` - Obter instância
- `DELETE /api/instagram/instances/:id` - Deletar instância

### Webhooks
- `GET /api/instagram/webhook` - Verificação do webhook (GET)
- `POST /api/instagram/webhook` - Receber eventos do Instagram
- `POST /api/instagram/deauthorize` - Desautorização
- `POST /api/instagram/data-deletion` - Solicitação de exclusão de dados

### Mensagens
- `POST /api/instagram/messages` - Enviar DM
- `POST /api/instagram/comments/:id/replies` - Responder comentário

## 🔐 Variáveis de Ambiente

Ver arquivo `.env.example` para todas as variáveis necessárias.

## 📝 Notas

Este é um serviço de teste separado para não impactar o projeto principal. Após validação, a integração será migrada para o Backend principal.
