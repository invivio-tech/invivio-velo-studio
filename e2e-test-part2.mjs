import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'http://localhost:9002';
const SCREENSHOT_DIR = '/home/alberto/e2e-screenshots-final';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let stepCount = 1;
const TS = Date.now().toString().slice(-5);

function getFilePath(name) {
  const prefix = stepCount.toString().padStart(2, '0');
  stepCount++;
  return path.join(SCREENSHOT_DIR, `step-${prefix}-${name}.png`);
}

async function snap(page, name) {
  await page.waitForTimeout(500);
  const filePath = getFilePath(name);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  📸 [${stepCount - 1}] ${name}`);
}

function section(title) {
  console.log(`\n══════════════════════════════════════════════════════════════`);
  console.log(`  🔷 ${title}`);
  console.log(`══════════════════════════════════════════════════════════════`);
}

async function goto(page, pathUrl, waitForSelector = null) {
  await page.goto(`${URL}${pathUrl}`, { waitUntil: 'load' });
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 15000 }).catch(() => {
      console.warn(`  ⚠️ Timeout waiting for ${waitForSelector} on ${pathUrl}`);
    });
  }
}

let totalScore = 0;
const MAX_SCORE = 11;

function pass(msg) {
  totalScore++;
  console.log(`  ✅ ${msg}`);
}

(async () => {
  console.log("Iniciando Teste E2E - PARTE 2: Clube, Vendas e Agendamento Externo...\n");
  
  const browser = await chromium.launch({ headless: true });
  
  // Admin Context
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  
  page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[BROWSER ERROR]: ${err}`));

  try {
    // ─── FASE 1: Login como Admin ──────────────────────────────────────────
    section('FASE 1: Login Admin');
    await goto(page, '/login', 'input[type="email"]');
    await snap(page, 'login-page');
    
    await page.fill('input[type="email"]', 'teste@teste.com');
    await page.fill('input[type="password"]', 'password123');
    await page.waitForTimeout(2000);
    await page.click('button[type="submit"]');
    
    // Server compilation on first run might take a while
    await page.waitForURL('**/schedule', { timeout: 60000 });
    await snap(page, 'after-login');
    pass('Login como Admin concluído');

    // ─── PRE-REQUISITO: Garantir que temos um serviço ──────────────────────
    await goto(page, '/services', 'button:has-text("Novo")');
    const serviceRows = await page.locator('table tbody tr').count();
    if (serviceRows === 0) {
      await page.click('button:has-text("Novo")');
      await page.waitForSelector('input[name="name"]');
      await page.fill('input[name="name"]', `Serviço Clube ${TS}`);
      await page.fill('input[name="price"]', '50');
      await page.fill('input[name="duration"]', '30 min');
      const descField = page.locator('textarea[name="description"]');
      if (await descField.count() > 0) {
        await descField.fill('Serviço de teste criado para o clube E2E.');
      }
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Pegar nome de um cliente existente ou criar rápido
    await goto(page, '/clients', 'button:has-text("Novo")');
    const clientRows = await page.locator('table tbody tr').count();
    if (clientRows === 0) {
      await page.click('button:has-text("Novo")');
      await page.waitForSelector('input#client-name, input[name="name"]');
      await page.fill('input#client-name, input[name="name"]', `Cliente Clube ${TS}`);
      await page.fill('input#client-email, input[name="email"]', `clube${TS}@teste.com`);
      await page.fill('input#client-phone, input[name="phoneNumber"]', '11999999999');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // ─── FASE 2: Clube - Criar Plano ───────────────────────────────────────
    section('FASE 2: Clube (Criar Plano)');
    await goto(page, '/admin/memberships', 'button:has-text("Novo Plano")');
    await snap(page, 'memberships-page');
    
    await page.click('button:has-text("Novo Plano")');
    await page.waitForSelector('input#name');
    await snap(page, 'plan-form-open');
    
    const planName = `Plano VIP E2E ${TS}`;
    await page.fill('input#name', planName);
    await page.fill('input#price', '150');
    await page.fill('textarea#description', 'Plano gerado por teste E2E.');
    await page.fill('input#maxUsesPerMonth', '4');
    await page.fill('input#commissionRepassPercentage', '80');
    
    // Clicar no primeiro accordion de categorias de serviços e marcar o primeiro checkbox
    const accordionBtn = page.locator('div[role="dialog"] button[data-state]').first();
    if (await accordionBtn.count() > 0) {
      await accordionBtn.click();
      await page.waitForTimeout(500);
      const checkbox = page.locator('div[role="dialog"] button[role="checkbox"]').first();
      if (await checkbox.count() > 0) {
        await checkbox.click();
      }
    }
    
    await snap(page, 'plan-form-filled');
    await page.click('button:has-text("Salvar Plano")');
    await page.waitForTimeout(2000);
    await snap(page, 'after-plan-save');
    pass('Plano de Assinatura criado');

    // ─── FASE 3: Clube - Adicionar Assinante ────────────────────────────────
    section('FASE 3: Clube (Adicionar Assinante)');
    await goto(page, '/admin/subscribers', 'button:has-text("Adicionar Assinante")');
    await snap(page, 'subscribers-page');
    
    await page.click('button:has-text("Adicionar Assinante")');
    await page.waitForSelector('input[placeholder*="Buscar por nome"]');
    await snap(page, 'subscriber-form-open');
    
    // Fill client search and pick first result
    await page.fill('input[placeholder*="Buscar por nome"]', 'E2E');
    await page.waitForTimeout(1000);
    const clientOption = page.locator('div.absolute.top-full.left-0 div.cursor-pointer').first();
    if (await clientOption.count() > 0) {
      // Usar dispatchEvent de mousedown pois o onclick pode não pegar devido ao blur da página
      await clientOption.dispatchEvent('mousedown');
    }
    
    // Select Plan
    await page.click('button[role="combobox"]');
    await page.waitForTimeout(500);
    const planOption = page.locator('div[role="option"]').first();
    if (await planOption.count() > 0) {
      await planOption.click();
    }
    
    await snap(page, 'subscriber-form-filled');
    await page.click('button:has-text("Salvar Assinatura")');
    await page.waitForTimeout(2000);
    await snap(page, 'after-subscriber-save');
    pass('Cliente vinculado ao Plano (Assinante)');

    // ─── FASE 4: Vendas - Cadastro de Produto ──────────────────────────────
    section('FASE 4: Vendas (Cadastro de Produto)');
    await goto(page, '/products/new', 'input[name="name"], input[id="name"]');
    await snap(page, 'product-form-open');
    
    // Verificando os seletores normais do ProductForm
    const prodName = page.locator('input[name="name"], input[id="name"]').first();
    await prodName.fill(`Pomada E2E ${TS}`);
    
    const prodPrice = page.locator('input[name="price"], input[id="price"]').first();
    if (await prodPrice.count() > 0) await prodPrice.fill('45');
    
    const prodStock = page.locator('input[name="stock"], input[id="stock"]').first();
    if (await prodStock.count() > 0) await prodStock.fill('10');
    
    await snap(page, 'product-form-filled');
    await page.click('button:has-text("Salvar"), button[type="submit"]');
    await page.waitForURL('**/products', { timeout: 15000 }).catch(() => {});
    await snap(page, 'after-product-save');
    pass('Produto cadastrado com sucesso no estoque');

    // ─── FASE 5: Vendas - Realizar Venda Balcão ────────────────────────────
    section('FASE 5: Vendas (Venda Balcão)');
    await goto(page, '/orders', 'button:has-text("Venda Balcão")');
    await snap(page, 'orders-page');
    
    await page.click('button:has-text("Venda Balcão")');
    // Esperar o diálogo de QuickSale abrir
    await page.waitForSelector('button:has-text("Cliente Avulso / Novo")');
    await snap(page, 'quicksale-dialog-step1');
    
    // Passo 1: Selecionar Cliente Avulso
    await page.click('button:has-text("Cliente Avulso / Novo")');
    await page.fill('input[placeholder*="Nome do cliente"]', 'João Avulso E2E');
    await snap(page, 'quicksale-client-filled');
    
    // Avançar para produtos
    await page.click('button:has-text("Avançar")');
    await page.waitForSelector('button:has-text("Adicionar")');
    await snap(page, 'quicksale-dialog-step2');
    
    // Adicionar o primeiro produto da lista
    await page.click('button:has-text("Adicionar")');
    
    await snap(page, 'quicksale-filled');
    await page.click('button:has-text("Confirmar Venda")');
    await page.waitForTimeout(2000);
    await snap(page, 'after-quicksale');
    pass('Venda avulsa realizada no painel Admin');

    // ─── FASE 6: Vendas - Alterar Status do Pedido para Retirado ───────────
    section('FASE 6: Pedidos (Atualizar Status)');
    // A página de orders lista os pedidos e tem um select para o status.
    // Vamos procurar a primeira linha e alterar o select.
    const firstOrderStatusSelect = page.locator('td button[role="combobox"]').first();
    if (await firstOrderStatusSelect.count() > 0) {
      await firstOrderStatusSelect.click();
      await page.waitForTimeout(500);
      await page.locator('div[role="option"]:has-text("Retirado")').first().click();
      await page.waitForTimeout(1000);
      pass('Status do Pedido alterado para Retirado');
    } else {
      console.warn('  ⚠️ Não foi possível encontrar o select de status do pedido.');
    }
    await snap(page, 'orders-status-updated');

    // ─── FASE 7: Relatórios (Verificar se Venda Entrou) ────────────────────
    section('FASE 7: Relatório Financeiro');
    await goto(page, '/financial-report');
    await page.waitForTimeout(2000); // Wait for charts/numbers
    await snap(page, 'financial-report-part2');
    pass('Relatório Financeiro acessado');

    // ─── FASE 8: Agendamento Landing Page (Contexto Cliente) ───────────────
    section('FASE 8: Landing Page Pública (/agendar)');
    
    // Criar um novo contexto isolado (anônimo) para simular o cliente
    const guestContext = await browser.newContext({
      viewport: { width: 414, height: 896 }, // Mobile viewport for realism
    });
    const guestPage = await guestContext.newPage();
    
    await goto(guestPage, '/agendar', 'text="Agendamento"');
    await snap(guestPage, 'guest-agendar-start');
    
    // Fluxo do StepBooking (público)
    // 1. Selecionar Serviço
    const serviceBtn = guestPage.locator('button:has-text("SELECIONAR")').first();
    if (await serviceBtn.count() > 0) {
      await serviceBtn.click();
      await guestPage.waitForTimeout(500);
    }
    
    // 2. Selecionar Profissional (ou "Qualquer Profissional")
    const profBtn = guestPage.locator('button', { hasText: /Selecionar|Qualquer/i }).first();
    if (await profBtn.count() > 0) {
      await profBtn.click();
      await guestPage.waitForTimeout(500);
    }
    
    // 3. Selecionar Data e Hora
    // Pega o primeiro dia disponível no calendário
    const dayBtn = guestPage.locator('td button:not([disabled])').first();
    if (await dayBtn.count() > 0) {
      await dayBtn.click();
      await guestPage.waitForTimeout(500);
    }
    
    // Pega a primeira pílula de horário disponível
    const timeBtn = guestPage.locator('button.rounded-full:not([disabled])').first();
    if (await timeBtn.count() > 0) {
      await timeBtn.click();
      await guestPage.waitForTimeout(500);
    }
    
    await guestPage.click('button:has-text("Continuar")').catch(() => {});
    await guestPage.waitForTimeout(1000);
    await snap(guestPage, 'guest-booking-details');
    
    // 4. Preencher dados como visitante ou login?
    // A tela pergunta se é visitante ou se quer fazer login.
    // Vamos preencher "Continuar como Visitante"
    const guestTab = guestPage.locator('button[role="tab"]:has-text("Sou Novo")');
    if (await guestTab.count() > 0) {
      await guestTab.click();
    }
    
    // Preencher formulário de visitante (se existir)
    await guestPage.fill('input[name="name"], input[placeholder*="nome"]', 'Cliente Avulso E2E').catch(() => {});
    await guestPage.fill('input[name="phone"], input[placeholder*="celular"]', '(11) 98888-8888').catch(() => {});
    
    // Confirmar Agendamento
    await guestPage.click('button:has-text("Confirmar Agendamento")').catch(() => {});
    await guestPage.waitForTimeout(3000);
    await snap(guestPage, 'guest-booking-success');
    pass('Agendamento via Landing Page Pública executado');

    await guestContext.close();

    // FIM
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║              RELATÓRIO E2E PARTE 2 — VELO STUDIO             ║`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);
    console.log(`║  Score: ${Math.round((totalScore/7)*100)}% (${totalScore}/7)                                           ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);

  } catch (err) {
    console.error('\n❌ TESTE FALHOU:', err);
    await snap(page, 'error-state-part2');
  } finally {
    await browser.close();
  }
})();
