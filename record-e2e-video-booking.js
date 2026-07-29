const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

(async () => {
  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: false,
    fps: 30,
    videoFrame: { width: 1280, height: 720 },
    aspectRatio: '16:9'
  });
  
  await recorder.start('./evidencia_e2e_booking_assinatura.mp4');
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

    console.log('Indo para /book-appointment...');
    await page.goto('http://localhost:9002/book-appointment');
    
    await page.waitForTimeout(3000);
    
    console.log('Escolhendo Serviço (Corte e Barba Premium)...');
    await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('h3, h2, h4, div'));
        const serviceCard = titles.find(t => t.textContent && t.textContent.includes('Corte e Barba Premium'))?.closest('div.border, .rounded-xl, .bg-card');
        if (serviceCard) { serviceCard.click(); }
        else {
           // Fallback to clicking the first card-like element
           const cards = document.querySelectorAll('.bg-card');
           if (cards.length > 0) cards[0].click();
        }
    });
    
    await page.waitForTimeout(1500);

    console.log('Escolhendo Profissional...');
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.bg-card'));
        const profCard = cards.find(c => c.textContent && c.textContent.includes('Qualquer um'));
        if (profCard) profCard.click();
        else if (cards.length > 0) cards[0].click();
    });

    await page.waitForTimeout(1500);

    console.log('Escolhendo Data (Hoje/Amanhã)...');
    await page.evaluate(() => {
        const dayButtons = Array.from(document.querySelectorAll('button[name="day"]:not([disabled])'));
        if(dayButtons.length > 0) {
            dayButtons[0].click();
        }
    });

    await page.waitForTimeout(3000);

    console.log('Escolhendo Horário...');
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const timeBtn = buttons.find(b => /^\d{2}:\d{2}$/.test(b.textContent?.trim()));
        if (timeBtn) timeBtn.click();
    });

    await page.waitForTimeout(1500);

    console.log('Confirmando Agendamento...');
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmBtn = buttons.find(b => b.textContent && b.textContent.includes('Confirmar Agendamento'));
        if (confirmBtn) confirmBtn.click();
    });

    console.log('Esperando Confirmação...');
    await page.waitForTimeout(4000);
    
    console.log('Indo para Faturamento para ver a Comissão Base...');
    await page.goto('http://localhost:9002/invoices');
    await page.waitForTimeout(5000);
    
    // Scroll down to see items
    await page.evaluate(() => { window.scrollBy({ top: 300, behavior: 'smooth' }); });
    await page.waitForTimeout(2000);
    
  } catch (err) {
    console.error('Erro durante o teste:', err);
  } finally {
    console.log('Parando gravação...');
    await recorder.stop();
    await browser.close();
    console.log('Concluido!');
  }
})();
