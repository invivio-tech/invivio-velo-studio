import { chatWithBookingBot } from '../src/ai/flows/booking-chatbot';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  // Already initialized or error
}

async function run() {
  console.log('Testing WhatsApp Bot Intelligence...');
  
  const history = [];
  const message = "Quero marcar um Tratamento VIP amanhã";
  
  console.log(`User: ${message}`);
  
  const response = await chatWithBookingBot(history, message);
  
  console.log(`\nBot: ${response}`);
  
  if (response.toLowerCase().includes('pedro') && !response.toLowerCase().includes('thiago')) {
    console.log('\n✅ TEST PASSED: Bot suggested Pedro and NOT Thiago for Tratamento VIP.');
  } else {
    console.log('\n❌ TEST FAILED: Bot did not properly filter the professional for the service.');
  }
}

run().then(() => process.exit(0)).catch(console.error);
