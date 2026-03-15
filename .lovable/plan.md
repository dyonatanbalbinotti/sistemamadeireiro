

## Plano: Menu de Exportação de Dados CSV no Sidebar

### Resumo
Criar uma nova página "Exportar Dados" acessível apenas para administradores no sidebar, que permite exportar em CSV os dados de todas as tabelas principais do sistema.

### Tabelas disponíveis para exportação
- **Empresas** - dados cadastrais das empresas
- **Profiles (Usuários)** - perfis de usuários
- **User Roles** - funções dos usuários
- **Produtos** - catálogo de produtos
- **Produção** - registros de produção
- **Vendas** - vendas de produtos
- **Vendas Cavaco / Serragem / Casqueiro** - vendas de resíduos
- **Toras / Toras Serradas** - registros de toras
- **Pedidos / Itens Pedido** - pedidos e seus itens
- **Despesas** - fluxo financeiro
- **Almoxarifado** (itens, movimentos, NFs, ordens, fornecedores, categorias)
- **Alertas Estoque** - configurações de alertas
- **Audit Logs** - logs de auditoria

### Implementação

1. **Nova página `src/pages/ExportarDados.tsx`**
   - Interface com cards/lista de cada categoria de dados
   - Botão "Exportar CSV" por tabela
   - Ao clicar, consulta a tabela via Supabase client e converte para CSV no front-end
   - Download automático do arquivo `.csv`
   - Botão "Exportar Tudo" que gera um ZIP ou exporta todos individualmente

2. **Atualizar `src/components/AppSidebar.tsx`**
   - Adicionar item "Exportar Dados" com ícone `Download` apenas para admins (junto com Admin e Auditoria)

3. **Atualizar `src/App.tsx`**
   - Adicionar rota `/exportar-dados` com `requireAdmin` no ProtectedRoute

### Detalhes técnicos
- Função utilitária `convertToCSV(data, columns)` que recebe array de objetos e gera string CSV com headers
- Função `downloadCSV(csvString, filename)` que cria blob e dispara download
- Cada tabela é consultada com `.select('*')` limitado a dados da empresa (RLS já filtra) ou todos para admin
- Nenhuma mudança no banco de dados necessária - apenas leitura das tabelas existentes

