-- Criar templates de email para todos os tipos de tarefa
INSERT INTO email_templates (template_key, name, description, subject, body, module, available_variables)
VALUES
-- 1. Autoriza Reavaliação
('task_demanda_autoriza_reavaliacao', 
 'Tarefa: Autoriza Reavaliação', 
 'Template para distribuição de tarefa de autorização de reavaliação',
 'Nova Tarefa: Autorização de Reavaliação - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Autorização de Reavaliação</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Matrícula: {{matricula}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "description": "Descrição da demanda"}'::jsonb),

-- 2. Desconsidera Avaliações
('task_demanda_desconsidera_avaliacoes',
 'Tarefa: Desconsidera Avaliações',
 'Template para distribuição de tarefa de desconsideração de avaliações',
 'Nova Tarefa: Desconsiderar Avaliações - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Desconsiderar Avaliações</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Matrícula: {{matricula}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "description": "Descrição da demanda"}'::jsonb),

-- 3. Vincula Imóvel
('task_demanda_vincula_imovel',
 'Tarefa: Vincula Imóvel',
 'Template para distribuição de tarefa de vinculação de imóvel',
 'Nova Tarefa: Vincular Imóvel - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Vincular Imóvel</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Matrícula: {{matricula}}</li>
    <li>Cartório: {{cartorio}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "cartorio": "Nome do cartório", "description": "Descrição da demanda"}'::jsonb),

-- 4. Cancela Avaliação SICAQ
('task_demanda_cancela_avaliacao_sicaq',
 'Tarefa: Cancela Avaliação SICAQ',
 'Template para distribuição de tarefa de cancelamento de avaliação SICAQ',
 'Nova Tarefa: Cancelar Avaliação SICAQ - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Cancelar Avaliação SICAQ</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Matrícula: {{matricula}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "description": "Descrição da demanda"}'::jsonb),

-- 5. Cancela Proposta SIOPI
('task_demanda_cancela_proposta_siopi',
 'Tarefa: Cancela Proposta SIOPI',
 'Template para distribuição de tarefa de cancelamento de proposta SIOPI',
 'Nova Tarefa: Cancelar Proposta SIOPI - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Cancelar Proposta SIOPI</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Matrícula: {{matricula}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "description": "Descrição da demanda"}'::jsonb),

-- 6. Solicitar Avaliação SIGDU
('task_demanda_solicitar_avaliacao_sigdu',
 'Tarefa: Solicitar Avaliação SIGDU',
 'Template para distribuição de tarefa de solicitação de avaliação SIGDU',
 'Nova Tarefa: Solicitar Avaliação SIGDU - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Solicitar Avaliação SIGDU</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Matrícula: {{matricula}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "description": "Descrição da demanda"}'::jsonb),

-- 7. Incluir PIS SIOPI
('task_demanda_incluir_pis_siopi',
 'Tarefa: Incluir PIS SIOPI',
 'Template para distribuição de tarefa de inclusão de PIS no SIOPI',
 'Nova Tarefa: Incluir PIS no SIOPI - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Incluir PIS no SIOPI</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Número PIS: {{numero_pis}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "numero_pis": "Número do PIS", "description": "Descrição da demanda"}'::jsonb),

-- 8. Autoriza Vendedor com Restrição
('task_demanda_autoriza_vendedor_restricao',
 'Tarefa: Autoriza Vendedor com Restrição',
 'Template para distribuição de tarefa de autorização de vendedor com restrição',
 'Nova Tarefa: Autorizar Vendedor com Restrição - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Autorizar Vendedor com Restrição</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Matrícula: {{matricula}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "description": "Descrição da demanda"}'::jsonb),

-- 9. Outras Demandas
('task_demanda_outras',
 'Tarefa: Outras Demandas',
 'Template para distribuição de outras tarefas não categorizadas',
 'Nova Tarefa: Outras Demandas - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Outras Demandas</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Descrição: {{description}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "description": "Descrição da demanda"}'::jsonb),

-- 10. Comitê de Crédito
('task_comite',
 'Tarefa: Comitê de Crédito',
 'Template para distribuição de tarefa de comitê de crédito',
 'Nova Tarefa: Comitê de Crédito - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Comitê de Crédito</strong>.</p>
  <p><strong>Detalhes do Cliente:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Valor do Financiamento: {{valor_financiamento}}</li>
    <li>Modalidade: {{modalidade}}</li>
    <li>Observações: {{observacoes}}</li>
  </ul>
  <p>Por favor, acesse o sistema para analisar esta solicitação.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "valor_financiamento": "Valor do financiamento", "modalidade": "Modalidade do financiamento", "observacoes": "Observações adicionais"}'::jsonb),

-- 11. Assinatura de Contrato
('task_assinatura',
 'Tarefa: Assinatura de Contrato',
 'Template para distribuição de tarefa de assinatura de contrato',
 'Nova Tarefa: Assinatura de Contrato - {{cpf}}',
 '<h2>Olá {{empregado_nome}},</h2>
  <p>Você recebeu uma nova tarefa de <strong>Assinatura de Contrato</strong>.</p>
  <p><strong>Detalhes:</strong></p>
  <ul>
    <li>CPF: {{cpf}}</li>
    <li>Data/Hora: {{data_hora}}</li>
    <li>Observações: {{observacoes}}</li>
  </ul>
  <p>Por favor, acesse o sistema para processar esta assinatura.</p>',
 'distribuicao_tarefas',
 '{"empregado_nome": "Nome do empregado", "cpf": "CPF do cliente", "data_hora": "Data e hora da assinatura", "observacoes": "Observações"}'::jsonb);