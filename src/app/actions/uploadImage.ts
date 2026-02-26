'use server';

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function uploadImage(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { error: 'Nenhum arquivo recebido' };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), 'public', 'uploads', 'services');
        await mkdir(uploadDir, { recursive: true });

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = file.name.split('.').pop();
        const filename = `${uniqueSuffix}.${ext}`;

        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);

        return { url: `/uploads/services/${filename}` };
    } catch (e) {
        console.error('Error uploading file', e);
        return { error: 'Erro ao fazer upload da imagem' };
    }
}
