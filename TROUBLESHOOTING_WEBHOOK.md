# Troubleshooting - Verificação de Webhook

## ❌ Problema: Token de verificação inválido

### Sintoma
```
❌ Token de verificação inválido
```

### Causa
O token de verificação recebido não corresponde ao token configurado no código.

### Solução

#### 1. Verificar variável de ambiente

O token deve estar configurado na variável de ambiente:
```env
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=Tokenclerky28111991
```

#### 2. Verificar configuração no Facebook Developers

No Facebook Developers, o token deve estar configurado em:
- **Seu App** → **Instagram** → **Webhooks** → **Callback URL** → **Verify Token**

O token configurado no Facebook Developers deve ser **exatamente igual** ao `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`.

#### 3. Verificar logs

Os logs agora mostram:
- Token recebido
- Token esperado
- Comparação (Match ou Não corresponde)

Exemplo de log:
```
🔐 Verificando token de webhook
📋 Mode recebido: subscribe
🔑 Token recebido: abc1234
🎯 Challenge recebido: 42541673
✅ Token esperado: Tokenclerky28111991
🔍 Comparação: ❌ Não corresponde
```

### Ações Corretivas

**Opção 1: Atualizar variável de ambiente (Recomendado)**
```bash
# No servidor, configurar:
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=Tokenclerky28111991
```

**Opção 2: Atualizar no Facebook Developers**
- Se o token no Facebook Developers for diferente, atualize para: `Tokenclerky28111991`

### ⚠️ Importante

- O token é case-sensitive (diferencia maiúsculas e minúsculas)
- Não deve ter espaços no início ou fim
- Deve ser exatamente igual em ambos os lugares

## 🔧 Correções Aplicadas

1. **Índices duplicados do Mongoose corrigidos**
   - Removido `index: true` dos campos `userId` e `instagramAccountId`
   - Mantidos apenas os índices explícitos no final do schema

2. **Logs melhorados**
   - Adicionados logs detalhados para debug
   - Mostra token recebido vs token esperado
   - Mostra se a variável está configurada

3. **Mensagens de erro mais claras**
   - Indica qual token foi recebido
   - Indica qual token é esperado
   - Fornece dicas de configuração

## ✅ Checklist

- [ ] Variável `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` está configurada
- [ ] Token no Facebook Developers corresponde ao token no código
- [ ] Token não tem espaços extras
- [ ] Token é case-sensitive (verificar maiúsculas/minúsculas)
- [ ] Servidor foi reiniciado após alterar variáveis de ambiente
