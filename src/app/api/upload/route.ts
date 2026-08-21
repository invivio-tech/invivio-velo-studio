import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorage } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
            filename
        )}?alt=media&token=${downloadToken}`;

        console.log(`Upload route: sucesso → ${publicUrl}`);
        return NextResponse.json({ url: publicUrl });
    } catch (error: any) {
        console.error('Upload route ERRO:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno no servidor durante o upload', stack: error.stack },
            { status: 500 }
        );
    }
}
