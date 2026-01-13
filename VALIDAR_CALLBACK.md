# Validação da URL de Callback do Instagram

## 🔍 Endpoint de Validação

Foi criado um endpoint para validar a configuração da URL de callback:

```
GET /api/instagram/auth/validate-callback
```

Este endpoint retorna informações sobre:
- URL de callback configurada
- URL esperada
- URL atual do servidor
- Status de validação
- Configurações de ambiente

## 📋 Como Validar

### 1. Acessar o endpoint de validação

```bash
curl https://teste.clerky.com.br/api/instagram/auth/validate-callback
```

### 2. Verificar a resposta

A resposta deve mostrar:
- ✅ `isValid: true` se a URL está correta
- ⚠️ `isValid: false` se há algum problema

### 3. Verificar configuração no Facebook Developers

A URL de callback deve estar registrada em:
- **Facebook Developers** → **Seu App** → **Instagram** → **Basic Display** → **Valid OAuth Redirect URIs**

URLs que devem estar configuradas:
```
https://teste.clerky.com.br/api/instagram/auth/callback
https://app.clerky.com.br/gerenciador-conexoes
```

## 🔧 Configuração Correta

### Variável de Ambiente

No arquivo `.env` ou nas variáveis de ambiente do servidor:

```env
INSTAGRAM_REDIRECT_URI=https://teste.clerky.com.br/api/instagram/auth/callback
API_URL=https://teste.clerky.com.br
```

### Verificação Manual

1. **Testar acesso direto ao callback:**
```bash
curl -I https://teste.clerky.com.br/api/instagram/auth/callback
```

2. **Verificar logs do servidor:**
   - Quando o callback é chamado, os logs devem mostrar:
   - `📥 Callback OAuth recebido`
   - `📋 Query params: {...}`
   - `🌐 URL completa: ...`

## 🐛 Troubleshooting

### Problema: URL não corresponde

**Solução:**
1. Verificar variável `INSTAGRAM_REDIRECT_URI` no `.env`
2. Verificar variável `API_URL` no `.env`
3. Garantir que a URL está registrada no Facebook Developers

### Problema: Callback não é chamado

**Solução:**
1. Verificar se a URL está correta no Facebook Developers
2. Verificar se o `CLIENT_ID` está correto
3. Verificar logs do servidor para ver se há erros

### Problema: Erro "redirect_uri_mismatch"

**Solução:**
1. A URL no código deve corresponder EXATAMENTE à URL no Facebook Developers
2. Verificar se há espaços ou caracteres especiais
3. Verificar se está usando `https://` e não `http://`

## 📝 Exemplo de Resposta do Endpoint

```json
{
  "status": "ok",
  "configured": {
    "redirectUri": "https://teste.clerky.com.br/api/instagram/auth/callback",
    "expectedUrl": "https://teste.clerky.com.br/api/instagram/auth/callback",
    "currentUrl": "https://teste.clerky.com.br/api/instagram/auth/callback",
    "isValid": true
  },
  "environment": {
    "API_URL": "https://teste.clerky.com.br",
    "INSTAGRAM_REDIRECT_URI": "https://teste.clerky.com.br/api/instagram/auth/callback",
    "CLIENT_ID": "***configurado***",
    "CLIENT_SECRET": "***configurado***",
    "WEBHOOK_VERIFY_TOKEN": "***configurado***"
  },
  "message": "✅ URL de callback configurada corretamente",
  "recommendations": []
}
```

## ✅ Checklist de Validação

- [ ] Endpoint `/api/instagram/auth/validate-callback` retorna `isValid: true`
- [ ] URL de callback está registrada no Facebook Developers
- [ ] Variável `INSTAGRAM_REDIRECT_URI` está configurada corretamente
- [ ] Variável `API_URL` está configurada corretamente
- [ ] `CLIENT_ID` e `CLIENT_SECRET` estão configurados
- [ ] Servidor está acessível em `https://teste.clerky.com.br`
- [ ] Rota `/api/instagram/auth/callback` está acessível
