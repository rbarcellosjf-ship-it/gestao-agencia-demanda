

## Corrigir Erro de RLS na Tabela `configuracoes`

### Causa Raiz
As políticas RLS da tabela `configuracoes` permitem INSERT e UPDATE apenas para o role `agencia`. Como você está logado como `admin`, a operação é bloqueada.

Políticas atuais:
- `Agencia pode inserir configurações` → INSERT WITH CHECK `role = 'agencia'`
- `Agencia pode atualizar configurações` → UPDATE USING `role = 'agencia'`
- (sem políticas para admin)

Isso viola o padrão **Admin extends Agencia permissions** já consolidado no resto do sistema.

### Solução

**Migração SQL** — adicionar políticas equivalentes para o role `admin`:

```sql
CREATE POLICY "Admin pode inserir configurações"
ON public.configuracoes
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Admin pode atualizar configurações"
ON public.configuracoes
FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Admin pode deletar configurações"
ON public.configuracoes
FOR DELETE
USING (get_user_role(auth.uid()) = 'admin'::app_role);
```

### Resultado
- Admin poderá salvar normalmente os telefones de notificação WhatsApp em **Configurações > Notificações**.
- Após salvar `32999610741`, novas demandas dispararão notificação para o seu número (ignorando o fallback que estava enviando para a Renata).
- Padrão de RLS fica consistente com o resto do sistema (admin = agencia + extras).

### Próximo Passo Após Aplicar
1. Acessar **Configurações > Notificações**
2. Adicionar `32999610741`
3. Salvar
4. Testar criando uma nova demanda

