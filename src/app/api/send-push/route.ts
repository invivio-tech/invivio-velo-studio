import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, initAdmin } from '@/firebase/admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const bodyData = await request.json();
        const { title, body, scheduledFor } = bodyData;

        if (!title || !body) {
            return NextResponse.json({ error: 'Título e corpo são obrigatórios' }, { status: 400 });
        }

        // Garante a inicialização do admin e obtém o Firestore
        initAdmin();
        const db = getAdminFirestore();

        // Se for um envio agendado
        if (scheduledFor) {
            const scheduledDate = new Date(scheduledFor);
            if (isNaN(scheduledDate.getTime())) {
                return NextResponse.json({ error: 'Data de agendamento inválida' }, { status: 400 });
            }

            await db.collection('pushLogs').add({
                title,
                body,
                createdAt: admin.firestore.Timestamp.now(),
                scheduledFor: admin.firestore.Timestamp.fromDate(scheduledDate),
                status: 'pending',
                sentCount: 0,
                failureCount: 0
            });

            return NextResponse.json({
                success: true,
                scheduled: true,
                message: `Notificação agendada para ${scheduledDate.toLocaleString('pt-BR')}`
            });
        }

        // Busca todos os usuários com tokens registrados no Firestore (envio imediato)
        const usersSnapshot = await db.collection('users').get();
        const allTokens: string[] = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const tokens = userData.fcmTokens || [];
            if (Array.isArray(tokens)) {
                allTokens.push(...tokens);
            }
        });

        if (allTokens.length === 0) {
            // Salva log de tentativa sem dispositivos
            await db.collection('pushLogs').add({
                title,
                body,
                createdAt: admin.firestore.Timestamp.now(),
                scheduledFor: null,
                status: 'sent',
                sentCount: 0,
                failureCount: 0,
                note: 'Nenhum dispositivo registrado'
            });

            return NextResponse.json({ 
                success: true, 
                sentCount: 0, 
                message: 'Nenhum dispositivo registrado para receber notificações.' 
            });
        }

        // Prepara e envia a mensagem multicast via FCM de verdade
        const message = {
            notification: { title, body },
            webpush: {
                fcmOptions: {
                    link: '/'
                }
            },
            tokens: allTokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Push Manual: Enviado com sucesso para ${response.successCount} dispositivos.`);

        // Salva log de disparo imediato
        await db.collection('pushLogs').add({
            title,
            body,
            createdAt: admin.firestore.Timestamp.now(),
            scheduledFor: null,
            status: 'sent',
            sentCount: response.successCount,
            failureCount: response.failureCount
        });

        // Se houverem falhas (como tokens expirados/desinstalados), fazemos a limpeza do Firestore
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token') {
                        failedTokens.push(allTokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                const batch = db.batch();
                usersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    const userTokens = userData.fcmTokens || [];
                    const hasFailed = userTokens.some((t: string) => failedTokens.includes(t));
                    if (hasFailed) {
                        const updatedTokens = userTokens.filter((t: string) => !failedTokens.includes(t));
                        batch.update(doc.ref, { fcmTokens: updatedTokens });
                    }
                });
                await batch.commit();
                console.log(`Push Manual: ${failedTokens.length} tokens inválidos foram removidos do banco.`);
            }
        }

        return NextResponse.json({
            success: true,
            sentCount: response.successCount,
            failureCount: response.failureCount
        });
    } catch (error: any) {
        console.error('Erro crítico ao enviar push manual:', error);
        return NextResponse.json({ 
            error: error.message || 'Erro interno ao realizar o disparo' 
        }, { status: 500 });
    }
}
