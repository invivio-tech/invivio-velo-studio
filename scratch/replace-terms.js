const fs = require('fs');

const filesToUpdate = [
  '/home/alberto/invivio-care/src/app/invoices/page.tsx',
  '/home/alberto/invivio-care/src/app/book-appointment/page.tsx',
  '/home/alberto/invivio-care/src/app/layout.tsx',
  '/home/alberto/invivio-care/src/app/about/page.tsx',
  '/home/alberto/invivio-care/src/app/establishment/page.tsx',
  '/home/alberto/invivio-care/src/app/manifest.ts',
  '/home/alberto/invivio-care/src/app/agendar/page.tsx',
  '/home/alberto/invivio-care/src/app/showcase/page.tsx',
  '/home/alberto/invivio-care/src/app/admin/memberships/page.tsx',
  '/home/alberto/invivio-care/src/app/services/page.tsx',
  '/home/alberto/invivio-care/src/ai/flows/generate-product-description.ts',
  '/home/alberto/invivio-care/src/ai/flows/generate-establishment-texts.ts',
  '/home/alberto/invivio-care/src/lib/placeholder-images.json',
  '/home/alberto/invivio-care/src/ai/flows/generate-membership-description.ts',
  '/home/alberto/invivio-care/src/ai/flows/generate-promotional-offers.ts',
  '/home/alberto/invivio-care-admin/src/app/privacy/page.tsx',
  '/home/alberto/invivio-care-admin/src/app/api/copilot/route.ts',
  '/home/alberto/invivio-care-admin/src/app/new-client/page.tsx',
  '/home/alberto/invivio-care-admin/src/app/api/webhooks/whatsapp/route.ts',
  '/home/alberto/invivio-care-admin/src/app/clients/[slug]/page.tsx'
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Abstract terms
    content = content.replace(/Barbearia Inteligente/g, 'Invivio Care');
    content = content.replace(/Barbearia/g, 'Clínica');
    content = content.replace(/barbearia/g, 'clínica');
    content = content.replace(/Barbearias/g, 'Clínicas');
    content = content.replace(/barbearias/g, 'clínicas');
    content = content.replace(/salões/g, 'consultórios');
    content = content.replace(/salão/g, 'consultório');
    content = content.replace(/Velo Studio/g, 'Invivio Care Admin');

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
