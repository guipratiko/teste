# Configuração da Integração do Instagram

## 📋 Pré-requisitos

1. App criado no Facebook Developers: https://developers.facebook.com/apps/1247757920797332/dashboard/
2. App ID: `25593254430316490`
3. Client Secret: `9a2281202b22148cd7bec698e772dcf8`
4. Webhook Verify Token: `Tokenclerky28111991`

## 🔧 Configuração do App do Instagram

### URLs de Callback

1. **URL de callback do webhook:**
   ```
   https://teste.clerky.com.br/api/instagram/webhook
   ```

2. **URIs de redirecionamento do OAuth:**
   ```
   https://app.clerky.com.br/gerenciador-conexoes
   https://teste.clerky.com.br/api/instagram/auth/callback
   ```

3. **URL de retorno de chamada de desautorização:**
   ```
   https://teste.clerky.com.br/api/instagram/deauthorize
   ```

4. **URL de solicitação de exclusão de dados:**
   ```
   https://teste.clerky.com.br/api/instagram/data-deletion
   ```

### Permissões (Scopes)

O app precisa das seguintes permissões:
- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`
- `instagram_business_content_publish`
- `instagram_business_manage_insights`

## 🚀 Instalação e Execução

1. **Instalar dependências:**
```bash
cd teste
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Editar .env com as configurações corretas
```

3. **Executar em desenvolvimento:**
```bash
npm run dev
```

4. **Compilar para produção:**
```bash
npm run build
npm start
```

## 📡 Endpoints Disponíveis

### Autenticação OAuth
- `GET /api/instagram/auth/authorize?userId=xxx&instanceName=Nome` - Inicia fluxo OAuth
- `GET /api/instagram/auth/callback` - Callback OAuth (chamado pelo Instagram)

### Instâncias
- `POST /api/instagram/instances` - Criar nova instância (retorna URL de autorização)
- `GET /api/instagram/instances?userId=xxx` - Listar instâncias do usuário
- `GET /api/instagram/instances/:id` - Obter instância específica
- `DELETE /api/instagram/instances/:id` - Deletar instância

### Webhooks
- `GET /api/instagram/webhook` - Verificação do webhook (GET)
- `POST /api/instagram/webhook` - Receber eventos do Instagram
- `POST /api/instagram/deauthorize` - Desautorização
- `POST /api/instagram/data-deletion` - Solicitação de exclusão de dados

### Mensagens
- `POST /api/instagram/messages` - Enviar DM
  ```json
  {
    "instanceId": "xxx",
    "recipientId": "909062018212935",
    "message": "Hello World!"
  }
  ```

- `POST /api/instagram/comments/:id/replies` - Responder comentário
  ```json
  {
    "instanceId": "xxx",
    "message": "Thanks for your comment!"
  }
  ```

## 🔐 Validação de Webhook

O webhook do Instagram valida a assinatura usando o header `x-hub-signature-256`. A validação é feita automaticamente usando o `INSTAGRAM_CLIENT_SECRET`.

## 📝 Fluxo de Autenticação

1. Usuário clica em "Criar instância do Instagram"
2. Frontend chama `POST /api/instagram/instances` com `userId` e `name`
3. Backend retorna `authUrl`
4. Frontend redireciona usuário para `authUrl`
5. Usuário autoriza no Instagram
6. Instagram redireciona para `/api/instagram/auth/callback?code=xxx&state=xxx`
7. Backend troca código por token
8. Backend cria/atualiza instância
9. Backend redireciona para frontend com sucesso

## 🧪 Testando

### Testar criação de instância:
```bash
curl -X POST http://localhost:3002/api/instagram/instances \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "name": "Minha Conta Instagram"
  }'
```

### Testar envio de DM:
```bash
curl -X POST http://localhost:3002/api/instagram/messages \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "INSTANCE_ID",
    "recipientId": "909062018212935",
    "message": "Hello World!"
  }'
```

### Testar resposta de comentário:
```bash
curl -X POST http://localhost:3002/api/instagram/comments/17936399298077063/replies \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "INSTANCE_ID",
    "message": "Thanks for your comment!"
  }'
```

## ⚠️ Notas Importantes

1. O serviço está configurado para rodar em `teste.clerky.com.br`
2. Certifique-se de que o domínio está configurado corretamente no Facebook Developers
3. O webhook precisa ser configurado no Facebook Developers com a URL correta
4. O token de verificação do webhook deve ser `Tokenclerky28111991`

## 🔄 Próximos Passos

Após validar o serviço de teste:
1. Integrar com MindClerky para criar nós de gatilho e resposta
2. Migrar código para o Backend principal
3. Atualizar frontend para suportar instâncias do Instagram
