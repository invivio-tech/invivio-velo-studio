const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const fs = require('fs');

(async () => {
  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications']
  });
  const page = await browser.newPage();
  
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: false,
    fps: 30,
    videoFrame: { width: 1280, height: 720 },
    aspectRatio: '16:9'
  });
  
  await recorder.start('./evidencia_servico_ia_destaque.mp4');
  console.log('Gravando video...');

  try {
    console.log('Indo para login...');
    await page.goto('http://localhost:9002/login');
    await page.waitForSelector('input[name="email"]');
    
    await page.type('input[name="email"]', 'alberto@barbearia.com', { delay: 10 });
    await page.type('input[name="password"]', '123456', { delay: 10 });
    
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Indo para /services...');
    await page.goto('http://localhost:9002/services');
    
    await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent && b.textContent.includes('Novo Serviço'));
    }, { timeout: 10000 });
    
    const addBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent && b.textContent.includes('Novo Serviço'));
    });
    
    await addBtn.click();
    await page.waitForSelector('input[name="name"]', { visible: true });
    
    console.log('Preenchendo nome e dados basicos...');
    await page.type('input[name="name"]', 'Barba Terapia com IA', { delay: 10 });
    await page.evaluate(() => document.querySelector('input[name="price"]').value = '');
    await page.type('input[name="price"]', '75', { delay: 10 });
    await page.type('input[name="duration"]', '45 min', { delay: 10 });
    
    console.log('Clicando em Sugerir com IA...');
    const aiBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent && b.textContent.includes('Sugerir com IA'));
    });
    if (aiBtn) await aiBtn.click();
    
    console.log('Esperando texto da IA...');
    await page.waitForFunction(() => {
        const ta = document.querySelector('textarea[name="description"]');
        return ta && ta.value.length > 20;
    }, { timeout: 20000 });
    console.log('Texto gerado!');
    await page.waitForTimeout(2000); // mostrar o texto gerado na tela

    console.log('Marcando como Destaque...');
    await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const targetLabel = labels.find(l => l.textContent === 'Serviço em Destaque');
        if (targetLabel) {
            const cbContainer = targetLabel.closest('div').parentElement;
            const cb = cbContainer ? cbContainer.querySelector('button[role="checkbox"]') : null;
            if (cb) cb.click();
        } else {
            const cbFallback = document.querySelector('button[role="checkbox"]');
            if (cbFallback) cbFallback.click();
        }
    });
    
    const categoryBtn = await page.$('button[role="combobox"]');
    if (categoryBtn) {
        await categoryBtn.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
    }
    
    console.log('Salvando serviço...');
    const saveBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent === 'Salvar');
    });
    if (saveBtn) await saveBtn.click();
    
    await page.waitForTimeout(3000);
    
    console.log('Indo para a vitrine inicial (Landing Page)...');
    await page.goto('http://localhost:9002/');
    await page.waitForTimeout(3000);
    
    console.log('Fazendo scroll para mostrar o serviço...');
    await page.evaluate(() => {
        window.scrollBy({ top: 800, behavior: 'smooth' });
    });
    await page.waitForTimeout(4000);
    
  } catch (err) {
    console.error('Erro durante o teste:', err);
  } finally {
    console.log('Parando gravação...');
    await recorder.stop();
    await browser.close();
    console.log('Concluido!');
  }
})();
