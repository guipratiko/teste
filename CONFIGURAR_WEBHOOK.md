# Como Configurar Webhook do Instagram

## ⚠️ Importante

O webhook do Instagram **NÃO** é ativado automaticamente. É necessário configurar manualmente no Facebook Developers.

## 📋 Passo a Passo

### 1. Acessar Facebook Developers

1. Acesse: https://developers.facebook.com/apps/1247757920797332/dashboard/
2. Vá em **Produtos** → **Instagram** → **Webhooks**

### 2. Configurar Webhook

1. Clique em **Configurar** ou **Adicionar Webhook**
2. Preencha:
   - **URL de Callback**: `https://teste.clerky.com.br/api/instagram/webhook`
   - **Token de Verificação**: `Tokenclerky28111991`
3. Clique em **Verificar e Salvar**

### 3. Inscrever-se em Eventos

Após configurar o webhook, você precisa se inscrever nos eventos:

1. Na seção **Webhooks**, encontre os eventos disponíveis
2. Marque os eventos desejados:
   - ✅ **messaging** (para DMs)
   - ✅ **comments** (para comentários)
3. Clique em **Inscrever-se**

### 4. Verificar Configuração

Após configurar, o Instagram enviará uma requisição GET para verificar:
```
GET https://teste.clerky.com.br/api/instagram/webhook?hub.mode=subscribe&hub.challenge=XXX&hub.verify_token=Tokenclerky28111991
```

Se tudo estiver correto, você verá nos logs:
```
✅ Webhook verificado, retornando challenge: XXX
```

## 🔍 Verificar se Webhook Está Funcionando

### Logs Esperados

Quando receber uma DM ou comentário, você deve ver:

**Para DM:**
```
📥 Webhook recebido do Instagram
📋 Processando entrada do Instagram
💬 Processando mensagens (DM): 1
✅ DM recebida de 909062018212935: oi
```

**Para Comentário:**
```
📥 Webhook recebido do Instagram
📋 Processando entrada do Instagram
💬 Processando mudanças: 1
✅ Comentário recebido de guipratiko (909062018212935): ola
```

## 🐛 Troubleshooting

### Problema: Webhook não recebe eventos

**Soluções:**
1. Verificar se o webhook está configurado no Facebook Developers
2. Verificar se está inscrito nos eventos (messaging, comments)
3. Verificar se a URL está acessível publicamente
4. Verificar se o token de verificação está correto
5. Verificar logs do servidor para ver se há erros

### Problema: Assinatura inválida

**Solução:**
- Verificar se `INSTAGRAM_CLIENT_SECRET` está configurado corretamente
- A assinatura é calculada usando o Client Secret

### Problema: Instância não encontrada

**Solução:**
- Verificar se a instância foi criada corretamente
- Verificar se o `instagramAccountId` corresponde ao `id` no webhook
- O `id` no webhook é o ID da conta do Instagram (ex: `17841475047401790`)

## 📝 Notas

- O webhook é **global** para o app, não por instância
- Todos os eventos de todas as contas conectadas vão para a mesma URL
- O sistema identifica a instância pelo `id` no payload do webhook
- A validação de assinatura é obrigatória em produção
