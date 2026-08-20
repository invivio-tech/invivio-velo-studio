import fs from 'fs';

function patch(file) {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes("export default function ")) {
    if (!content.includes("import { use } from 'react';")) {
       content = content.replace(/import \{.*\} from 'next\/navigation';/, match => "import { use } from 'react';\n" + match);
    }
    
    // team schedule
    if (file.includes('team/[id]/schedule/page.tsx')) {
       content = content.replace("export default function TeamSchedulePage() {", "export default function TeamSchedulePage({ params }: { params: Promise<{ id: string }> }) {");
       content = content.replace("const params = useParams();", "const paramsResolved = use(params);");
       content = content.replace(/params\?\.id/g, "paramsResolved.id");
       content = content.replace(/params\.id/g, "paramsResolved.id");
    }
    
    // team appointments
    if (file.includes('team/[id]/appointments/page.tsx')) {
       content = content.replace("export default function TeamAppointmentsPage() {", "export default function TeamAppointmentsPage({ params }: { params: Promise<{ id: string }> }) {");
       content = content.replace("const params = useParams();", "const paramsResolved = use(params);");
       content = content.replace(/params\?\.id/g, "paramsResolved.id");
       content = content.replace(/params\.id/g, "paramsResolved.id");
    }
    
    // team edit
    if (file.includes('team/[id]/edit/page.tsx')) {
       content = content.replace("export default function EditTeamMemberPage() {", "export default function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {");
       content = content.replace("const params = useParams();", "const paramsResolved = use(params);");
       content = content.replace(/params\?\.id/g, "paramsResolved.id");
       content = content.replace(/params\.id/g, "paramsResolved.id");
    }

    // products edit
    if (file.includes('products/[id]/edit/page.tsx')) {
       content = content.replace("export default function EditProductPage() {", "export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {");
       content = content.replace("const { id } = useParams() as { id: string };", "const { id } = use(params);");
    }

    fs.writeFileSync(file, content);
  }
}

patch('src/app/team/[id]/schedule/page.tsx');
patch('src/app/team/[id]/appointments/page.tsx');
patch('src/app/team/[id]/edit/page.tsx');
patch('src/app/products/[id]/edit/page.tsx');
