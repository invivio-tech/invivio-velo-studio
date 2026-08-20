const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:9002/clients/HeAyfWwjlQavfEVhyKXf0LgwCAN2/edit');
  
  // Wait for either the error or the skeleton/page
  try {
    await page.waitForSelector('#error-message', { timeout: 5000 });
    const errorMsg = await page.textContent('#error-message');
    const errorStack = await page.textContent('#error-stack');
    console.log(`[CAUGHT ERROR]: ${errorMsg}`);
    console.log(`[STACK]: ${errorStack}`);
  } catch (e) {
    console.log("No custom error caught. Maybe it didn't crash, or it redirected.");
    const url = page.url();
    console.log(`Final URL: ${url}`);
  }
  
  await browser.close();
})();
