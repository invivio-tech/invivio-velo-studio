import fs from 'fs';
let content = fs.readFileSync('src/app/clients/[id]/edit/page.tsx', 'utf-8');
content = content.replace("export default function EditClientPage() {", "import { use } from 'react';\n\nexport default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {\n  const resolvedParams = use(params);\n  const userId = resolvedParams.id;\n");
content = content.replace("const params = useParams();", "");
content = content.replace("const userId = params?.id as string;", "");
fs.writeFileSync('src/app/clients/[id]/edit/page.tsx', content);
