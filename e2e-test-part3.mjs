import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log('Iniciando Teste E2E Parte 3: Fluxos Públicos (Loja e Clube)...');
  
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true, // headless: true para não travar
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  const baseUrl = 'http://localhost:9002';

  // Criar diretório para prints da parte 3
  const screenshotsDir = '/home/alberto/e2e-screenshots-final';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // ---------------------------------------------------------
    // FASE 1: Loja Virtual (E-Commerce)
    // ---------------------------------------------------------
    console.log('--- FASE 1: Loja Virtual ---');
    console.log('1. Acessando a Loja Pública...');
    await page.goto(`${baseUrl}/store`, { waitUntil: 'load' });
    await page.waitForTimeout(3000); // Aguarda carregamento de produtos
    await page.screenshot({ path: `${screenshotsDir}/step-01-store-home.png` });

    console.log('2. Adicionando produto ao carrinho...');
    // Clica no primeiro botão de "Adicionar" (carrinho) que aparecer
    const addBtn = page.locator('button:has-text("Adicionar")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshotsDir}/step-02-store-added-cart.png` });

      console.log('3. Abrindo o Carrinho...');
      await page.click('id=open-cart-button');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshotsDir}/step-03-store-cart-open.png` });

      console.log('4. Indo para o Checkout...');
      await page.click('id=proceed-to-checkout-button');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshotsDir}/step-04-store-checkout-open.png` });

      console.log('5. Preenchendo dados do cliente...');
      await page.fill('id=checkout-name', 'Cliente Convidado (E2E)');
      await page.fill('id=checkout-phone', '11999999999');
      await page.screenshot({ path: `${screenshotsDir}/step-05-store-checkout-filled.png` });

      console.log('6. Finalizando o Pedido...');
      await page.click('id=place-order-button');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${screenshotsDir}/step-06-store-order-success.png` });

      console.log('7. Fechando modal de sucesso...');
      // Pode tentar fechar se houver o botão
      const closeBtn = page.locator('id=order-success-close');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
      }
    } else {
      console.log('⚠️ Nenhum produto disponível para adicionar no teste da loja.');
    }

    // ---------------------------------------------------------
    // FASE 2: Clube de Assinaturas & Área do Cliente
    // ---------------------------------------------------------
    console.log('\n--- FASE 2: Clube de Assinaturas ---');
    console.log('8. Acessando página pública do Clube...');
    await page.goto(`${baseUrl}/club`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${screenshotsDir}/step-07-club-home.png` });

    console.log('9. Clicando em Assinar no primeiro plano...');
    const assinarBtn = page.locator('button:has-text("Assinar Agora")').first();
    if (await assinarBtn.count() > 0) {
      await assinarBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${screenshotsDir}/step-08-club-auth-required.png` });
      
      // O sistema deve ter mostrado o Toast de Login Necessário ou redirecionado
      // Vamos navegar explicitamente para Account para validar a área do cliente
    } else {
      console.log('⚠️ Nenhum plano ativo para assinar.');
    }

    console.log('10. Acessando Área do Cliente (Conta)...');
    await page.goto(`${baseUrl}/account`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotsDir}/step-09-account-home.png` });

    console.log('✅ TESTE E2E PARTE 3 CONCLUÍDO COM SUCESSO!');

  } catch (error) {
    console.error('❌ ERRO DURANTE O TESTE:', error);
    await page.screenshot({ path: `${screenshotsDir}/step-XX-error-state-part3.png` });
  } finally {
    await browser.close();
  }
})();
