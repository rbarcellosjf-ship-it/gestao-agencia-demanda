

## Restringir Leitor de Documentos ao Admin

### Alterações

**1. `src/pages/Dashboard.tsx`**
- Envolver o card "Leitor de Documentos" em uma condicional `{role === "admin" && (...)}` para que apenas administradores vejam o card no dashboard.

**2. `src/pages/LeitorDocumentos.tsx`**
- Adicionar verificação de role usando `useUserRole()`.
- Caso o usuário não seja admin, redirecionar para `/dashboard` com toast informando "Acesso restrito".
- Enquanto `loading` do role for true, mostrar `LoadingState`.

**3. `src/components/MobileBottomNav.tsx`** (se contiver link para o leitor)
- Verificar e ocultar o item "Leitor de Documentos" quando `role !== "admin"`.

### Resultado
- Apenas admins veem o card no dashboard, no menu mobile e conseguem acessar a rota `/leitor-documentos`.
- CCAs e agências que tentarem acessar diretamente pela URL serão redirecionados.

