const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

admin.initializeApp();

// Configura a região global para todas as funções v2
setGlobalOptions({ region: 'southamerica-east1' });

/**
 * Trigger: Notificar quando o agendamento for alterado ou cancelado
 */
exports.onappointmentupdate = onDocumentUpdated('appointments/{appointmentId}', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    if (!newData || !oldData) return null;

    let title = '';
    let body = '';

    if (newData.status === 'cancelled' && oldData.status !== 'cancelled') {
        title = 'Agendamento Cancelado';
        body = `Seu agendamento para ${newData.serviceName} foi cancelado.`;
    } else if (newData.status === 'scheduled' && oldData.status === 'scheduled') {
        const newTime = newData.startTime.toMillis();
        const oldTime = oldData.startTime.toMillis();
        
        if (newTime !== oldTime || newData.serviceName !== oldData.serviceName) {
            const dateStr = format(newData.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR });
            title = 'Agendamento Atualizado';
            body = `Seu agendamento foi alterado para: ${newData.serviceName} em ${dateStr}.`;
        }
    }

    if (title && body) {
        return sendNotificationToUser(newData.customerId, title, body);
    }
    return null;
});

/**
 * Trigger: Notificar quando um novo agendamento é criado
 */
exports.onappointmentcreate = onDocumentCreated('appointments/{appointmentId}', async (event) => {
    const data = event.data.data();
    if (!data) return null;

    const dateStr = format(data.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR });
    
    const title = 'Novo Agendamento Confirmado';
    const body = `Seu agendamento para ${data.serviceName} foi confirmado para ${dateStr}.`;
    
    return sendNotificationToUser(data.customerId, title, body);
});

/**
 * Scheduled: Lembrete 1 hora antes do serviço
 */
exports.scheduledreminder = onSchedule('every 5 minutes', async (event) => {
    const now = Date.now();
    const oneHourFromNow = now + (60 * 60 * 1000);
    
    // Janela de 10 minutos
    const windowStart = admin.firestore.Timestamp.fromMillis(oneHourFromNow - (5 * 60 * 1000));
    const windowEnd = admin.firestore.Timestamp.fromMillis(oneHourFromNow + (5 * 60 * 1000));

    const appointmentsSnapshot = await admin.firestore().collection('appointments')
        .where('status', '==', 'scheduled')
        .where('startTime', '>=', windowStart)
        .where('startTime', '<=', windowEnd)
        .get();

    const promises = [];
    appointmentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.reminderSent === true) return; // Filtro manual em memória
        const timeStr = format(data.startTime.toDate(), 'HH:mm');
        const title = 'Lembrete de Agendamento';
        const body = `Falta 1 hora para o seu serviço: ${data.serviceName} às ${timeStr}.`;

        promises.push(sendNotificationToUser(data.customerId, title, body));
        promises.push(doc.ref.update({ reminderSent: true }));
    });

    return Promise.all(promises);
});

/**
 * Scheduled: Notificar aniversariantes do dia
 * Executa todos os dias às 08:00 (Horário de Brasília)
 */
exports.dailybirthdaycheck = onSchedule('0 8 * * *', async (event) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();

    // Formata o sufixo "-MM-DD" para comparação
    const monthStr = currentMonth.toString().padStart(2, '0');
    const dayStr = currentDay.toString().padStart(2, '0');
    const birthdaySuffix = `-${monthStr}-${dayStr}`;

    console.log(`Verificando aniversariantes para o sufixo: ${birthdaySuffix}`);

    // Busca configurações personalizadas do estabelecimento
    const settingsDoc = await admin.firestore().collection('establishmentSettings').doc('main').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    
    const customTitle = settings.birthdayTitle || 'Feliz Aniversário! 🎂';
    const customMessage = settings.birthdayMessage || 'A equipe da Barbearia East Side te deseja um dia incrível e muito sucesso!';

    const usersSnapshot = await admin.firestore().collection('users')
        .where('role', '==', 'client')
        .get();

    const promises = [];
    const currentYear = today.getFullYear();

    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const birthDate = userData.birthDate; // Esperado: YYYY-MM-DD

        if (birthDate && birthDate.endsWith(birthdaySuffix)) {
            // Verifica se já não demos parabéns este ano
            if (userData.lastBirthdayWishYear === currentYear) {
                return;
            }

            const title = customTitle;
            // Substitui {name} se estiver presente na mensagem customizada
            const body = customMessage.replace('{name}', userData.name || 'cliente');

            console.log(`Enviando parabéns para: ${userData.name} (${doc.id})`);
            
            promises.push(sendNotificationToUser(doc.id, title, body));
            promises.push(doc.ref.update({ lastBirthdayWishYear: currentYear }));
        }
    });

    return Promise.all(promises);
});

/**
 * Helper: Enviar notificação para um usuário específico
 */
async function sendNotificationToUser(userId, title, body) {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) return null;

    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];

    if (tokens.length === 0) {
        console.log(`Usuário ${userId} não tem tokens FCM registrados.`);
        return null;
    }

    const message = {
        notification: { title, body },
        webpush: {
            fcmOptions: {
                link: 'https://barbeariaeastside.web.app/schedule'
            }
        },
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Notificações enviadas para ${userId}:`, response.successCount);
        
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });
            if (failedTokens.length > 0) {
                await userDoc.ref.update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                });
            }
        }
    } catch (error) {
        console.error('Erro ao enviar mensagens FCM:', error);
    }
}
