# Roadmap do Invivio Velo Studio

> **Atualizado em:** 19 de novembro de 2026
> O Studio é o app de cada estabelecimento (PWA, agenda, catálogo, loja, promoções e ferramentas de IA).
> Cada cliente recebe as atualizações pela Central de Versões do Velo Admin (branch `client/<slug>`).

---

## ✅ Concluído

### Agenda e atendimento
- [x] Agendamento pelo app, por visitante e pelo totem, feito no servidor (`/api/booking`) numa transação, para que dois clientes não fiquem com o mesmo horário. Preço e uso do plano são calculados no servidor.
- [x] Remarcação pelo cliente (`/api/booking/reschedule`), respeitando a antecedência configurada pelo estabelecimento.
- [x] Horários ocupados por profissional (`/api/booking/availability`).
- [x] Clube de assinaturas com uso mensal por plano.
- [x] Totem com desbloqueio por PIN e check-in por telefone (`/api/totem`).
- [x] Portfólio de trabalhos na página inicial (`/api/public/portfolio`).
- [x] Pontos de fidelidade atualizados só quando mudam.
- [x] Limite de requisições nas rotas públicas.

### Ferramentas de IA (carteira de créditos)
- [x] Descrições de serviços, produtos e planos; ofertas e campanhas; textos institucionais; mensagem de aniversário; paleta de cores da logo.
- [x] Uso de IA debitado da carteira de créditos do Velo Admin, com aviso de saldo insuficiente.

### Publicação
- [x] Configuração do Next em JavaScript puro (`next.config.mjs`).
- [x] A esteira de publicação testa a página e as rotas do servidor depois de cada deploy.

### Manutenção
- [x] Scripts locais de teste e manutenção fora do controle de versão (`scratch/`).

---

## 🔄 Em distribuição
- Duração dos serviços exibida de forma padronizada ("30 min", "1h", "1h30").
- Página inicial sem as fotos de exemplo externas que deixaram de existir.
- Correção no atendimento rápido e na edição de agendamentos da agenda.

---

## 🚀 Próximos passos
1. Débito de IA por tokens reais (hoje é uma estimativa por ferramenta).
2. Melhorias de produto conforme o retorno dos estabelecimentos.
