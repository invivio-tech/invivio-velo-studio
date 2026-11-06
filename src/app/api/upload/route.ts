import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorage } from '@/firebase/admin';
import { requireStaff } from '@/lib/server-auth';

// Pastas usadas pelas telas (equipe, serviços, produtos, planos, estabelecimento, atendimentos, faturas)
const ALLOWED_PREFIXES = ['uploads/', 'invoices'];

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const guard = await requireStaff(request);
    if (!guard.ok) return guard.response;

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo recebido' }, { status: 400 });
        }

        const folder = (formData.get('folder') as string) || 'uploads/misc';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const safeFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, '').replace(/^\/+/, '').replace(/\/+$/, '');
        if (!ALLOWED_PREFIXES.some((prefix) => safeFolder.startsWith(prefix))) {
            return NextResponse.json({ error: 'Pasta não permitida' }, { status: 400 });
        }
        const filename = `${safeFolder}/${uniqueSuffix}.${ext}`;

        console.log(`Upload route: file=${file.name}, size=${file.size}, type=${file.type}, destination=${filename}`);

        const storage = getAdminStorage();
        const bucket = storage.bucket();
        const buffer = Buffer.from(await file.arrayBuffer());
        const bucketFile = bucket.file(filename);
        const downloadToken = crypto.randomUUID();

        await bucketFile.save(buffer, {
            contentType: file.type,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: downloadToken,
                }
            }
        });

        const bucketName = bucket.name;
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

        console.log(`Upload route: sucesso → ${publicUrl}`);
        return NextResponse.json({ url: publicUrl });
    } catch (error: any) {
        console.error('Upload route ERRO:', error);
        return NextResponse.json(
            { error: 'Erro interno no servidor durante o upload' },
            { status: 500 }
        );
    }
}
