const fs = require('fs');

const filesToUpdate = [
  '/home/alberto/invivio-care/src/app/about/page.tsx',
  '/home/alberto/invivio-care/src/app/agenda-view/page.tsx',
  '/home/alberto/invivio-care/src/app/schedule/page.tsx',
  '/home/alberto/invivio-care/src/app/showcase/page.tsx',
  '/home/alberto/invivio-care/src/app/api/chat/send/route.ts'
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace terms related to barbershop that were missed
    content = content.replace(/barbeiro/g, 'profissional');
    content = content.replace(/Barbeiro/g, 'Profissional');
    content = content.replace(/barbeiros/g, 'profissionais');
    content = content.replace(/Barbeiros/g, 'Profissionais');
    content = content.replace(/corte/g, 'atendimento');
    content = content.replace(/cortes/g, 'atendimentos');
    content = content.replace(/Velo Studio/g, 'Invivio Care Admin');
    content = content.replace(/Invivio Velo/g, 'Invivio Care');
    content = content.replace(/ Velo/g, ' Invivio Care');
    content = content.replace(/Velo Admin/g, 'Invivio Care Admin');
    
    // Some specific contexts in about/page.tsx
    content = content.replace(/VELO/g, 'INVIVIO');
    content = content.replace(/cadeira vazia/g, 'sala vazia');

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
