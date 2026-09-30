# Roadmap de execução

Este documento separa o que já está disponível no produto, o que foi preparado tecnicamente e o que ainda depende de decisão comercial, provedor externo ou mudança de arquitetura.

## Fase 1 — Verdade, segurança e venda

Concluído nesta entrega:

- landing page alinhada ao produto atual, sem prometer reserva ou pagamento online;
- CTA de demonstração exibido somente quando `NEXT_PUBLIC_DEMO_URL` estiver configurada;
- cadastro público controlável por `SIGNUP_MODE`, fechado por convite como padrão de produção;
- proxy de sessão aplicado às rotas autenticadas, de autenticação e de API;
- senha mínima de oito caracteres com letras e números;
- headers de segurança, health check, logs de erros inesperados e CI;
- metadados, sitemap, robots e documentação das variáveis de ambiente.

Ainda depende dos sócios:

- domínio oficial, identidade jurídica, contato comercial e textos legais;
- política de backup, alertas e responsável operacional;
- destino real da demonstração e política definitiva de entrada de novas arenas.

## Fase 2 — Consistência do produto

Concluído nesta entrega:

- marca real aplicada na landing, autenticação, onboarding e área administrativa;
- login, cadastro e recuperação de senha com experiência visual consistente;
- opção acessível de mostrar senha e orientação de segurança;
- perfis traduzidos no cabeçalho;
- navegação mobile com atalhos prioritários e menu de páginas secundárias;
- páginas globais de carregamento, erro e endereço inexistente.

Próximos incrementos internos:

- decompor as telas maiores em componentes menores;
- padronizar tabelas, filtros, vazios, confirmações e feedback de salvamento;
- adicionar busca global e atalhos operacionais no dashboard;
- fazer testes de usabilidade com proprietário, recepção e professor.

## Fase 3 — Reserva e relacionamento com o jogador

Não deve ser ativada parcialmente sem proteção contra abuso, consistência de agenda e confirmação transacional. Ordem recomendada:

1. definir política de cancelamento, antecedência, sinal e reembolso;
2. escolher gateway e canal de comunicação;
3. criar página pública por arena e API pública com rate limit;
4. reservar horário de forma atômica no banco e iniciar cobrança;
5. confirmar a reserva somente após webhook validado;
6. enviar confirmação e lembretes com idempotência;
7. liberar histórico, cancelamento e reagendamento ao jogador.

Decisões externas necessárias: gateway, WhatsApp/email, taxas, prazo de expiração, política de reembolso, consentimento e suporte.

## Fase 4 — Escala e diferenciação

Fundação concluída nesta entrega:

- manifest para instalação como aplicativo;
- CI reproduzível, build validado, endpoint de saúde e logs estruturados;
- SEO técnico básico e configuração de URL por ambiente.

Próximas frentes, depois de validar a operação de uma arena:

- multiunidade com troca explícita de contexto e relatórios consolidados;
- conciliação financeira e integrações fiscais;
- automações de CRM e recuperação de clientes;
- integrações com calendário, controle de acesso e contabilidade;
- observabilidade centralizada, métricas de produto e testes de recuperação de backup.
