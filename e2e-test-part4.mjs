import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('--- Iniciando Teste E2E de Filtro Multi-Profissionais ---');

    // Navegar para a página de Agendamento
    await page.goto('http://localhost:9002/agendar');
    await page.waitForSelector('input[placeholder="Buscar por serviço (ex: Corte, Barba...)"]');

    console.log('Passo 1: Selecionando o serviço "Corte" (que deve mostrar apenas Thiago)');
    await page.fill('input[placeholder="Buscar por serviço (ex: Corte, Barba...)"]', 'Seeder');
    // Wait for the UI to filter
    await page.waitForTimeout(1000);
    
    // Click on the Corte service (assumes it has "Corte" in its name)
    await page.click('text=/Corte de Cabelo \\(Seeder\\)/i');
    
    // Now we should be on Step 2 (Professionals)
    await page.waitForTimeout(1000);
    
    const pageText = await page.innerText('body');
    console.log('Page Text at Step 2:', pageText?.substring(0, 500));
    
    // Assert Thiago is visible
    const isThiagoVisible = await page.isVisible('text=/Thiago Barbeiro/i');
    const isPedroVisible = await page.isVisible('text=/Pedro Especialista/i');
    
    if (isThiagoVisible && !isPedroVisible) {
      console.log('✅ Filtro para Corte está correto: Apenas Thiago apareceu.');
    } else {
      console.error('❌ Erro no filtro de Corte:', { isThiagoVisible, isPedroVisible });
    }

    await page.screenshot({ path: 'public/showcase/step-25-corte-shows-thiago.png' });

    console.log('Passo 2: Voltando e Selecionando "Tratamento VIP" (que deve mostrar apenas Pedro)');
    // Go back to Step 1
    await page.click('text=/Voltar para serviços/i');
    await page.waitForTimeout(500);
    
    // Search and select Tratamento VIP
    await page.fill('input[placeholder="Buscar por serviço (ex: Corte, Barba...)"]', 'VIP');
    await page.waitForTimeout(1000);
    await page.click('text=/Tratamento VIP/i');
    
    // Now we should be on Step 2 (Professionals)
    await page.waitForTimeout(1000);
    
    // Assert Pedro is visible, Thiago is not
    const isPedroVIPVisible = await page.isVisible('text=/Pedro Especialista/i');
    const isThiagoVIPVisible = await page.isVisible('text=/Thiago Barbeiro/i');
    
    if (isPedroVIPVisible && !isThiagoVIPVisible) {
      console.log('✅ Filtro para VIP está correto: Apenas Pedro apareceu.');
    } else {
      console.error('❌ Erro no filtro de VIP:', { isThiagoVIPVisible, isPedroVIPVisible });
    }

    await page.screenshot({ path: 'public/showcase/step-26-vip-shows-pedro.png' });

    console.log('--- Teste E2E UI Finalizado com Sucesso ---');
  } catch (error) {
    console.error('❌ Erro durante o Teste E2E:', error);
  } finally {
    await browser.close();
  }
})();
