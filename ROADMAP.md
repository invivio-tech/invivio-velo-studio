# Roadmap do Invivio Velo Studio

> **Atualizado em:** 05 de novembro de 2026
> O Studio é o app de cada estabelecimento (PWA, agenda, catálogo, loja, promoções e ferramentas de IA).
> Cada cliente recebe as atualizações pela Central de Versões do Velo Admin (branch `client/<slug>`).

---

## ✅ Concluído

### Agenda e atendimento
- [x] Agendamento pelo app, por visitante e pelo totem.
- [x] Clube de assinaturas com uso mensal por plano.
- [x] Totem com check-in por telefone.
- [x] Portfólio de trabalhos na página inicial.

### Ferramentas de IA (carteira de créditos)
- [x] Descrições de serviços, produtos e planos; ofertas e campanhas; textos institucionais; mensagem de aniversário; paleta de cores da logo.
- [x] Uso de IA debitado da carteira de créditos do Velo Admin, com aviso de saldo insuficiente.
- [x] Sessão e créditos das ferramentas de IA tratados no servidor.

### Manutenção
- [x] Dependências de `functions/` fora do controle de versão; `.gitignore` atualizado.

---

## 🔄 Em distribuição

- **Agendamento pelo servidor** (`feat/agendamento-servidor`):
  - `/api/booking`: cria o agendamento numa transação, para que dois clientes não fiquem com o mesmo horário. Preço e uso do plano são calculados no servidor.
  - `/api/booking/reschedule`: o cliente remarca o próprio horário mantendo serviço e preço.
  - `/api/booking/availability`: horários ocupados do dia.
  - `/api/public/portfolio`: trabalhos em destaque.
  - `/api/totem`: desbloqueio e check-in do totem. O PIN é salvo pela tela do estabelecimento.
- Atualização por cliente na Central de Versões, começando por um piloto.

---

## 🚀 Próximos passos

1. Distribuir a versão atual para todos os clientes.
2. Débito de IA por tokens reais (hoje é uma estimativa por ferramenta).
3. Limite de tentativas nas rotas públicas de agendamento e totem.
4. Melhorias de produto conforme o retorno dos estabelecimentos.
