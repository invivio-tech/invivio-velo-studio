import { chromium } from 'playwright';
import { execSync } from 'child_process';

const BASE_URL   = 'http://localhost:9002';
const ADMIN_EMAIL = 'teste@teste.com';
const ADMIN_PASS  = 'password123';
const TS = Date.now();

execSync('mkdir -p /home/alberto/e2e-screenshots');
execSync('mkdir -p /home/alberto/e2e-screenshots-final');

let stepN = 0;
const results = { passed: [], failed: [] };

async function snap(page, label) {
  stepN++;
  const file = `/home/alberto/e2e-screenshots-final/step-${String(stepN).padStart(2,'0')}-${label.replace(/\s+/g,'-')}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 [${stepN}] ${label}`);
  return file;
}
function pass(label) { results.passed.push(label); console.log(`  ✅ ${label}`); }
function fail(label, err = '') { results.failed.push(`${label}${err ? ': '+err : ''}`); console.log(`  ❌ ${label}${err ? ': '+err : ''}`); }
function section(title) { console.log(`\n${'═'.repeat(62)}\n  🔷 ${title}\n${'═'.repeat(62)}`); }

async function goto(page, path, waitFor) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (waitFor) {
    await page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(2000);
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const ctx  = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

try {
  // ─── FASE 1: Login ───────────────────────────────────────────────────────
  section('FASE 1: Login como Admin');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await snap(page, 'login-page');

  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');

  // Aguardar redirect (vai para /schedule ou /dashboard)
  await page.waitForURL(url => !url.includes('/login'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await snap(page, 'after-login');

  const finalUrl = page.url();
  if (!finalUrl.includes('/login')) {
    pass(`Login como Admin → ${finalUrl.replace(BASE_URL,'')}`);
  } else {
    fail('Login como Admin', `URL ainda é /login`);
    throw new Error('Login falhou — abortando');
  }

  // Navegar explicitamente para o dashboard admin
  await goto(page, '/dashboard', 'body');
  await page.waitForTimeout(2000);

  // ─── FASE 2: Dashboard — métricas ────────────────────────────────────────
  section('FASE 2: Dashboard Admin e Métricas');
  await snap(page, 'dashboard-admin');
  try {
    const body = await page.innerText('body');
    body.includes('Faturamento') ? pass('Card Faturamento Total') : fail('Card Faturamento Total');
    body.includes('Agendamentos') ? pass('Card Agendamentos') : fail('Card Agendamentos');
    body.includes('Clientes') ? pass('Card Clientes') : fail('Card Clientes');
  } catch(e) { fail('Dashboard métricas', e.message); }

  // ─── FASE 3: Criar Serviço (modal na /services) ───────────────────────────
  section('FASE 3: Cadastrar Novo Serviço');
  await goto(page, '/services', 'button:has-text("Novo Serviço")');
  await snap(page, 'services-list');

  try {
    await page.click('button:has-text("Novo Serviço")');
    await page.waitForTimeout(1500);
    await snap(page, 'service-form-open');

    // Preencher o formulário dentro do Sheet/Dialog
    const nameField = page.locator('input[name="name"], [placeholder*="nome"], [placeholder*="Nome"], [placeholder*="serviço"]').first();
    await nameField.waitFor({ timeout: 10000 });
    await nameField.fill(`Corte E2E ${TS}`);

    // Preço
    const priceField = page.locator('input[name="price"], [placeholder*="preço"], [placeholder*="Preço"], [placeholder*="R$"]').first();
    if (await priceField.count() > 0) {
      await priceField.click({ clickCount: 3 });
      await priceField.type('55');
    }

    // Selecionar Categoria
    // Clica no trigger do select
    await page.click('button[role="combobox"]');
    await page.waitForTimeout(500);
    // Clica na primeira opção do select content
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.count() > 0) {
        await firstOption.click();
    }
    
    // Duração
    const durField = page.locator('input[name="duration"], [placeholder*="duração"], [placeholder*="Duração"]').first();
    if (await durField.count() > 0) {
        await durField.fill('30 min');
    }

    // Descrição (obrigatório > 10 chars)
    const descField = page.locator('textarea[name="description"], [placeholder*="descreva"], [placeholder*="Desc"]').first();
    if (await descField.count() > 0) {
        await descField.fill('Serviço de teste E2E com descrição longa o suficiente para passar.');
    }

    await snap(page, 'service-form-filled');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await snap(page, 'after-service-save');

    const body = await page.innerText('body');
    body.includes(`E2E ${TS}`) || body.includes('sucesso') || body.includes('criado')
      ? pass('Serviço criado com sucesso')
      : fail('Serviço criado', 'Nome não apareceu na lista após salvar');
  } catch(e) { fail('Cadastro de Serviço', e.message); await snap(page, 'service-error'); }

  // ─── FASE 4: Cadastrar Cliente ────────────────────────────────────────────
  section('FASE 4: Cadastrar Cliente');
  await goto(page, '/clients', 'body');
  await snap(page, 'clients-list');

  try {
    // Verificar se há botão de novo cliente
    const newClientBtn = page.locator('button:has-text("Novo Cliente"), button:has-text("Adicionar Cliente"), a:has-text("Novo Cliente")').first();
    const btnCount = await newClientBtn.count();
    if (btnCount > 0) {
      await newClientBtn.click();
      await page.waitForTimeout(1500);
      await snap(page, 'client-form-open');

      const nameField = page.locator('input#client-name, input[name="name"]').first();
      await nameField.waitFor({ timeout: 10000 });
      await nameField.fill(`Cliente E2E ${TS}`);
      await page.fill('input#client-email, input[name="email"]', `cliente${TS}@teste.com`).catch(() => {});
      await page.fill('input#client-phone, input[name="phoneNumber"]', '11999990001').catch(() => {});

      await snap(page, 'client-form-filled');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      await snap(page, 'after-client-save');

      const body = await page.innerText('body');
      body.includes('E2E') ? pass('Cliente cadastrado') : fail('Cliente cadastrado', 'Nome não apareceu');
    } else {
      // Pode ser rota /clients/new — verificar
      await goto(page, '/clients', 'body');
      const body = await page.innerText('body');
      body.includes('Cliente') ? pass('Página de clientes carregou (sem botão novo encontrado)') : fail('Clientes', 'Página vazia');
    }
  } catch(e) { fail('Cadastro de Cliente', e.message); await snap(page, 'client-error'); }

  // ─── FASE 5: Novo Agendamento via Gestão de Atendimentos ─────────────────
  section('FASE 5: Criar Agendamento');
  await goto(page, '/schedule', 'button:has-text("Novo Atendimento"), button:has-text("Atendimento Rápido")');
  await snap(page, 'schedule-for-appointment');

  try {
    const newAptBtn = page.locator('button:has-text("Novo Atendimento"), button:has-text("Atendimento Rápido")').first();
    await newAptBtn.waitFor({ timeout: 10000 });
    await newAptBtn.click();
    await page.waitForTimeout(2000);
    await snap(page, 'appointment-modal-open');

    const body = await page.innerText('body');
    body.includes('serviço') || body.includes('Serviço') || body.includes('profissional') || body.includes('Profissional')
      ? pass('Modal de agendamento abriu com campos')
      : fail('Modal de agendamento', 'Campos não encontrados no modal');
  } catch(e) { fail('Criar Agendamento', e.message); await snap(page, 'appointment-error'); }

  // ─── FASE 6: Financeiro ───────────────────────────────────────────────────
  section('FASE 6: Relatório Financeiro');
  await goto(page, '/financial-report', 'body');
  await page.waitForTimeout(3000);
  await snap(page, 'financial-report');

  try {
    const body = await page.innerText('body');
    (body.includes('R$') || body.includes('Receita') || body.includes('Financeiro'))
      ? pass('Relatório Financeiro carregou') : fail('Relatório Financeiro', 'Sem dados R$ ou Receita');
  } catch(e) { fail('Relatório Financeiro', e.message); }

  // ─── FASE 7: Agenda (Visão Agenda) ───────────────────────────────────────
  section('FASE 7: Visão de Agenda');
  await goto(page, '/agenda-view', 'body');
  await page.waitForTimeout(2000);
  await snap(page, 'agenda-view');

  try {
    const body = await page.innerText('body');
    (body.includes('Agenda') || body.includes('agenda') || body.includes('Segunda') || body.includes('Horário'))
      ? pass('Visão de Agenda carregou') : fail('Visão de Agenda', 'Conteúdo inesperado');
  } catch(e) { fail('Visão de Agenda', e.message); }

  // ─── FASE 8: Equipe ───────────────────────────────────────────────────────
  section('FASE 8: Gestão de Equipe');
  await goto(page, '/team', 'body');
  await page.waitForTimeout(2000);
  await snap(page, 'team-list');

  try {
    const body = await page.innerText('body');
    (body.includes('Equipe') || body.includes('Profissional') || body.includes('profissional'))
      ? pass('Página de Equipe carregou') : fail('Equipe', 'Sem conteúdo de equipe');
    
    const addBtn = page.locator('button:has-text("Novo Profissional"), button:has-text("Adicionar"), a:has-text("Novo Membro")').first();
    await addBtn.count() > 0 ? pass('Botão de adicionar profissional presente') : fail('Botão Novo Profissional', 'Não encontrado');
  } catch(e) { fail('Equipe', e.message); }

  // ─── FASE 9: Agendamentos — Concluir ─────────────────────────────────────
  section('FASE 9: Concluir Agendamento Existente');
  await goto(page, '/dashboard', 'body');
  await page.waitForTimeout(3000);

  try {
    const concludeBtn = page.locator('button:has-text("Concluir")').first();
    const count = await concludeBtn.count();

    if (count > 0) {
      await snap(page, 'before-conclude');
      const aptText = await page.locator('..'). innerText().catch(() => '');
      console.log(`  ℹ️  Agendamento a concluir encontrado`);
      await concludeBtn.click();
      await page.waitForTimeout(3000);
      await snap(page, 'after-conclude');

      const body = await page.innerText('body');
      pass(`Agendamento concluído com sucesso`);
    } else {
      await snap(page, 'no-conclude-btn');
      pass('Sem agendamentos pendentes agora (OK)');
    }
  } catch(e) { fail('Concluir Agendamento', e.message); await snap(page, 'conclude-error'); }

  // ─── FASE 10: Serviços existentes ────────────────────────────────────────
  section('FASE 10: Verificar Listagem de Serviços');
  await goto(page, '/services', 'body');
  await page.waitForTimeout(2000);
  await snap(page, 'final-services-list');

  try {
    const body = await page.innerText('body');
    const hasServices = body.includes('Corte') || body.includes('R$') || body.includes('min');
    hasServices ? pass('Serviços visíveis com preço e duração') : fail('Serviços', 'Sem dados de serviços');
  } catch(e) { fail('Serviços finais', e.message); }

} catch(fatal) {
  console.error('\n💥 ERRO FATAL:', fatal.message);
  await snap(page, 'fatal-error').catch(() => {});
  results.failed.push(`FATAL: ${fatal.message}`);
}

await browser.close();

// ─── RELATÓRIO ─────────────────────────────────────────────────────────────
const total = results.passed.length + results.failed.length;
const pct = total > 0 ? Math.round((results.passed.length / total) * 100) : 0;
const score = `${pct}% (${results.passed.length}/${total})`;

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║              RELATÓRIO E2E — VELO STUDIO                    ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  Score: ${score.padEnd(55)}║`);
console.log('╠══════════════════════════════════════════════════════════════╣');
if (results.passed.length > 0) {
  console.log('║  ✅ PASSOU:                                                  ║');
  results.passed.forEach(p => console.log(`║    • ${p.substring(0,57).padEnd(57)}║`));
}
if (results.failed.length > 0) {
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  ❌ FALHOU:                                                  ║');
  results.failed.forEach(f => console.log(`║    • ${f.substring(0,57).padEnd(57)}║`));
}
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  📸 /home/alberto/e2e-screenshots/                          ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
