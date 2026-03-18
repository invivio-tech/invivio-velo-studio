import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

export async function POST(request: NextRequest) {
    const { getAdminStorage } = await import('@/firebase/admin');
    const adminStorage = getAdminStorage();
    if (!adminStorage) {
        return NextResponse.json({ error: 'Storage do Firebase Admin não inicializado' }, { status: 500 });
    }
    try {
        console.log('API Route: Starting image upload...');
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo recebido' }, { status: 400 });
        }

        console.log(`API Route: Uploading file: ${file.name}, size: ${file.size}`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const bucket = adminStorage.bucket();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `uploads/services/${uniqueSuffix}.${ext}`;
        const blob = bucket.file(filename);

        await blob.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        try {
            await blob.makePublic();
        } catch (e) {
            console.warn('API Route: Could not make public:', e);
        }

        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;

        console.log(`API Route: Generated URL: ${publicUrl}`);

        return NextResponse.json({ url: publicUrl });
    } catch (error: any) {
        console.error('API Route ERROR:', error);
        return NextResponse.json({ error: error.message || 'Erro interno no upload' }, { status: 500 });
    }
}
