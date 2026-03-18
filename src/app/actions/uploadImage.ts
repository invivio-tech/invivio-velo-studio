'use server';

import { getAdminStorage } from '@/firebase/admin';

export async function uploadImage(formData: FormData) {
    try {
        const adminStorage = getAdminStorage();
        if (!adminStorage) throw new Error('Firebase Admin Storage failed to initialize');

        console.log('Starting image upload action...');
        const file = formData.get('file') as File;
        if (!file) {
            console.error('No file found in formData');
            return { error: 'Nenhum arquivo recebido' };
        }

        console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const bucket = adminStorage.bucket();
        console.log(`Using bucket: ${bucket.name}`);

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `uploads/services/${uniqueSuffix}.${ext}`;
        const blob = bucket.file(filename);

        console.log(`Saving to path: ${filename}`);

        await blob.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        console.log('File saved successfully to storage');

        try {
            // Attempt to make public, but don't fail if it's already public via bucket policy
            await blob.makePublic();
            console.log('File made public');
        } catch (makePublicErr) {
            console.warn('Could not explicitly make file public (might be bucket policy):', makePublicErr);
        }

        // Use the standard Firebase Storage URL format which is better for web clients
        // and respects Firebase Storage security rules
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;

        console.log(`Generated URL: ${publicUrl}`);

        return { url: publicUrl };
    } catch (e: any) {
        console.error('CRITICAL ERROR in uploadImage action:', e);
        return { error: `Erro técnico no upload: ${e.message || 'Erro desconhecido'}` };
    }
}
