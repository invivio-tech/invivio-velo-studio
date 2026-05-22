import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'crypto';

export const dynamic = 'force-dynamic';

// Generate a Google OAuth2 access token from a service account using a JWT assertion.
// Uses only Node.js built-in crypto — no additional packages needed.
async function getGoogleAccessToken(serviceAccount: {
    client_email: string;
    private_key: string;
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/devstorage.read_write',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
    const signingInput = `${header}.${payload}`;

    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');
    const jwt = `${signingInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    let text = '';
    try {
        text = await res.text();
        const data = JSON.parse(text);
        if (!data.access_token) {
            throw new Error(`Falha ao obter access token: ${JSON.stringify(data)}`);
        }
        return data.access_token as string;
    } catch (err: any) {
        throw new Error(`getGoogleAccessToken falhou: ${err.message}. Response was (status ${res.status}): ${text.substring(0, 100)}...`);
    }
}

export async function POST(request: NextRequest) {
    try {
        // Read service account credentials from environment
        const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON;
        if (!serviceAccountJson) {
            console.error('Upload route: SERVICE_ACCOUNT_JSON not set');
            return NextResponse.json({ error: 'Service account não configurado no servidor' }, { status: 500 });
        }

        let serviceAccount: { client_email: string; private_key: string };
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (e) {
            console.error('Upload route: failed to parse SERVICE_ACCOUNT_JSON', e);
            return NextResponse.json({ error: 'Service account JSON inválido' }, { status: 500 });
        }

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            return NextResponse.json({ error: 'Storage bucket não configurado' }, { status: 500 });
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo recebido' }, { status: 400 });
        }

        console.log(`Upload route: arquivo=${file.name}, tamanho=${file.size}, tipo=${file.type}`);

        // Get OAuth2 access token
        const accessToken = await getGoogleAccessToken(serviceAccount);

        const folder = (formData.get('folder') as string) || 'uploads/misc';

        // Build destination path
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        // Clean folder name to prevent weird paths
        const safeFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, '').replace(/^\/+/, '').replace(/\/+$/, '');
        const filename = `${safeFolder}/${uniqueSuffix}.${ext}`;

        // Firebase Storage requires a downloadToken in metadata to generate
        // the same URL format as the client SDK: ?alt=media&token=...
        const downloadToken = crypto.randomUUID();

        const metadata = {
            name: filename,
            contentType: file.type,
            metadata: {
                firebaseStorageDownloadTokens: downloadToken,
            },
        };

        // Build multipart/related body for GCS JSON API
        const boundary = `upload-${Date.now()}`;
        const metadataStr = JSON.stringify(metadata);
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const enc = new TextEncoder();

        const part1 = enc.encode(
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n`
        );
        const part2 = enc.encode(`--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`);
        const closing = enc.encode(`\r\n--${boundary}--`);

        const body = new Uint8Array(part1.length + part2.length + fileBytes.length + closing.length);
        body.set(part1, 0);
        body.set(part2, part1.length);
        body.set(fileBytes, part1.length + part2.length);
        body.set(closing, part1.length + part2.length + fileBytes.length);

        // Upload to Google Cloud Storage JSON API
        const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(
            bucketName
        )}/o?uploadType=multipart&name=${encodeURIComponent(filename)}`;

        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
        });

        if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            console.error(`Upload para GCS falhou (${uploadRes.status}):`, errorText);
            throw new Error(`Falha no armazenamento: ${uploadRes.status} — ${errorText.slice(0, 200)}`);
        }

        // Return the same URL format as Firebase client SDK getDownloadURL()
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
