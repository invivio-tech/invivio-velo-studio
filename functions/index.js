const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
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
    const promises = [];

    if (newData.status === 'cancelled' && oldData.status !== 'cancelled') {
        title = 'Agendamento Cancelado';
        body = `Seu agendamento para ${newData.serviceName} foi cancelado.`;
        promises.push(sendNotificationToUser(newData.customerId, title, body));

        const profTitle = '❌ Agendamento Cancelado';
        const profBody = `O cliente ${newData.customerName} cancelou o serviço: ${newData.serviceName} para ${format(newData.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}.`;
        promises.push(sendNotificationToUser(newData.professionalId, profTitle, profBody));
    } else if (newData.status === 'scheduled' && oldData.status === 'scheduled') {
        const newTime = newData.startTime.toMillis();
        const oldTime = oldData.startTime.toMillis();
        
        if (newTime !== oldTime || newData.serviceName !== oldData.serviceName) {
            const dateStr = format(newData.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR });
            title = 'Agendamento Atualizado';
            body = `Seu agendamento foi alterado para: ${newData.serviceName} em ${dateStr}.`;
            promises.push(sendNotificationToUser(newData.customerId, title, body));
        }
    }

    if (promises.length > 0) {
        return Promise.all(promises);
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
 * HTTPS: Redefinir senha de um usuário (admins ou o próprio usuário)
 */
exports.updateuserpassword = onCall(async (request) => {
    // Verifica se o solicitante está autenticado
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'O usuário deve estar logado.');
    }

    const { userId, newPassword } = request.data;
    const callerId = request.auth.uid;

    // Se não for o próprio usuário, verifica se é admin
    if (callerId !== userId) {
        const adminDoc = await admin.firestore().collection('users').doc(callerId).get();
        if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
            throw new HttpsError('permission-denied', 'Apenas administradores podem redefinir senhas de outros usuários.');
        }
    }

    if (!userId || !newPassword || newPassword.length < 6) {
        throw new HttpsError('invalid-argument', 'Dados inválidos. A senha deve ter no mínimo 6 caracteres.');
    }

    try {
        await admin.auth().updateUser(userId, {
            password: newPassword
        });
        return { success: true, message: 'Senha atualizada com sucesso.' };
    } catch (error) {
        // Se o usuário não existe no Auth, tentamos criar baseado no Firestore
        if (error.code === 'auth/user-not-found') {
            try {
                const userDoc = await admin.firestore().collection('users').doc(userId).get();
                if (!userDoc.exists) {
                    throw new HttpsError('not-found', 'Perfil do usuário não encontrado no banco de dados.');
                }
                
                const userData = userDoc.data();
                if (!userData.email) {
                    throw new HttpsError('failed-precondition', 'Usuário não possui e-mail cadastrado.');
                }

                await admin.auth().createUser({
                    uid: userId,
                    email: userData.email,
                    displayName: userData.name,
                    password: newPassword
                });

                return { success: true, message: 'Conta de acesso criada e senha configurada.' };
            } catch (createError) {
                console.error('Erro ao criar usuário no Auth:', createError);
                if (createError.code === 'auth/email-already-exists') {
                    throw new HttpsError('already-exists', 'Este e-mail já está em uso por outra conta de acesso.');
                }
                throw new HttpsError('internal', 'Não foi possível criar a conta de acesso para este usuário.');
            }
        }
        
        console.error('Erro ao atualizar senha:', error);
        throw new HttpsError('internal', 'Erro ao processar a redefinição de senha.');
    }
});

/**
 * HTTPS: Solicitar ajuda para redefinir senha (notifica admins)
 */
exports.requestpasswordresetsupport = onCall(async (request) => {
    const { email } = request.data;
    if (!email) {
        throw new HttpsError('invalid-argument', 'O e-mail é obrigatório.');
    }

    // Busca o usuário pelo e-mail para confirmar que existe e pegar o nome
    const usersSnapshot = await admin.firestore().collection('users').where('email', '==', email).limit(1).get();
    let userName = 'Cliente';
    if (!usersSnapshot.empty) {
        userName = usersSnapshot.docs[0].data().name || userName;
    }

    // Busca todos os administradores
    const adminsSnapshot = await admin.firestore().collection('users').where('role', '==', 'admin').get();
    
    const title = '⚠️ Ajuda com Senha';
    const body = `${userName} (${email}) solicitou ajuda para redefinir a senha.`;

    const promises = [];
    adminsSnapshot.forEach(adminDoc => {
        promises.push(sendNotificationToUser(adminDoc.id, title, body));
    });

    await Promise.all(promises);
    return { success: true, message: 'Os administradores foram notificados. Por favor, aguarde o suporte.' };
});

/**
 * Trigger: Sincronizar dados de serviço nos agendamentos futuros quando o serviço for editado
 */
exports.onserviceupdate = onDocumentUpdated('services/{serviceId}', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    if (!newData || !oldData) return null;

    // Só atualiza se houver mudança relevante
    if (newData.name === oldData.name && newData.price === oldData.price && newData.duration === oldData.duration) {
        return null;
    }

    const serviceId = event.params.serviceId;
    const now = admin.firestore.Timestamp.now();

    // Busca agendamentos futuros deste serviço que ainda não foram concluídos/cancelados
    const appointmentsSnapshot = await admin.firestore().collection('appointments')
        .where('serviceId', '==', serviceId)
        .where('startTime', '>=', now)
        .where('status', '==', 'scheduled')
        .get();

    if (appointmentsSnapshot.empty) return null;

    const batch = admin.firestore().batch();
    appointmentsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
            serviceName: newData.name,
            servicePrice: newData.price,
            serviceDuration: newData.duration
        });
    });

    console.log(`Sincronizando ${appointmentsSnapshot.size} agendamentos para o serviço: ${newData.name}`);
    return batch.commit();
});

/**
 * Trigger: Sincronizar nome do profissional nos agendamentos futuros quando o perfil mudar
 */
exports.onuserupdate = onDocumentUpdated('users/{userId}', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    if (!newData || !oldData) return null;

    // Só importa se o nome mudou e se é profissional/admin
    if (newData.name === oldData.name) return null;
    if (newData.role !== 'professional' && newData.role !== 'admin') return null;

    const userId = event.params.userId;
    const now = admin.firestore.Timestamp.now();

    const appointmentsSnapshot = await admin.firestore().collection('appointments')
        .where('professionalId', '==', userId)
        .where('startTime', '>=', now)
        .where('status', '==', 'scheduled')
        .get();

    if (appointmentsSnapshot.empty) return null;

    const batch = admin.firestore().batch();
    appointmentsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
            professionalName: newData.name
        });
    });

    console.log(`Sincronizando ${appointmentsSnapshot.size} agendamentos para o profissional: ${newData.name}`);
    return batch.commit();
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

/**
 * Scheduled: Verificar clientes sumidos (Oi Sumido)
 * Executa todos os dias às 09:00 (Horário de Brasília)
 */
exports.dailyretargetingcheck = onSchedule('0 9 * * *', async (event) => {
    // 1. Busca configurações personalizadas do estabelecimento
    const settingsDoc = await admin.firestore().collection('establishmentSettings').doc('main').get();
    if (!settingsDoc.exists) {
        console.log('FCM Retargeting: Configurações do estabelecimento não encontradas.');
        return null;
    }
    
    const settings = settingsDoc.data();
    const active = settings.retargetingActive || false;
    const days = parseInt(settings.retargetingDays || 30, 10);
    const customTitle = settings.retargetingTitle || 'Saudades de você! 👋';
    const customBody = settings.retargetingBody || 'Já faz [DIAS] dias desde a sua última visita. Acreditamos que já está na hora de dar aquele trato no visual!';

    if (!active) {
        console.log('FCM Retargeting: Automação "Oi Sumido" desativada.');
        return null;
    }

    console.log(`FCM Retargeting: Iniciando verificação de clientes inativos há ${days} dias...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Busca todos os clientes cadastrados
    const usersSnapshot = await admin.firestore().collection('users')
        .where('role', '==', 'client')
        .get();

    const promises = [];

    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const tokens = userData.fcmTokens || [];

        if (tokens.length === 0) continue;

        // Busca todos os agendamentos deste cliente 
        // Filtramos e ordenamos na memória para garantir que não dê erro de falta de índice composto no Firestore
        const appointmentsSnapshot = await admin.firestore().collection('appointments')
            .where('customerId', '==', userId)
            .get();

        if (appointmentsSnapshot.empty) continue;

        const completedAppointments = appointmentsSnapshot.docs
            .map(d => d.data())
            .filter(app => app.status === 'completed' && app.startTime)
            .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());

        if (completedAppointments.length === 0) continue;

        const lastAppointment = completedAppointments[0];
        const lastAppointmentTime = lastAppointment.startTime;

        if (lastAppointmentTime) {
            const lastAppDate = lastAppointmentTime.toDate();
            lastAppDate.setHours(0, 0, 0, 0);

            // Calcula a diferença exata em dias
            const timeDiff = today.getTime() - lastAppDate.getTime();
            const diffInDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

            if (diffInDays === days) {
                // Personaliza o título e o corpo substituindo as tags
                const title = customTitle.replace('[NOME]', userData.name || 'cliente');
                const body = customBody
                    .replace('[NOME]', userData.name || 'cliente')
                    .replace('[DIAS]', days.toString());

                console.log(`FCM Retargeting: Disparando notificação "Oi Sumido" para ${userData.name} (${userId}) - inativo há exatamente ${days} dias.`);
                promises.push(sendNotificationToUser(userId, title, body));
            }
        }
    }

    if (promises.length > 0) {
        return Promise.all(promises);
    }
    
    console.log('FCM Retargeting: Nenhum cliente atende aos critérios de inatividade hoje.');
    return null;
});

/**
 * Scheduled: Processar notificações push agendadas
 * Executa a cada 5 minutos
 */
exports.processscheduledpush = onSchedule('every 5 minutes', async (event) => {
    const now = admin.firestore.Timestamp.now();
    
    console.log('FCM Scheduler: Verificando notificações agendadas pendentes...');
    
    // Busca pushes pendentes que deveriam ter sido enviados até agora
    const pendingSnapshot = await admin.firestore().collection('pushLogs')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now)
        .get();

    if (pendingSnapshot.empty) {
        console.log('FCM Scheduler: Nenhuma notificação agendada pendente.');
        return null;
    }

    console.log(`FCM Scheduler: Encontradas ${pendingSnapshot.size} notificações para enviar.`);

    // Busca todos os tokens de usuários
    const usersSnapshot = await admin.firestore().collection('users').get();
    const allTokens = [];
    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const tokens = userData.fcmTokens || [];
        if (Array.isArray(tokens)) {
            allTokens.push(...tokens);
        }
    });

    if (allTokens.length === 0) {
        console.log('FCM Scheduler: Nenhum dispositivo registrado no sistema.');
        // Marca todas como concluídas com 0 envios
        const batch = admin.firestore().batch();
        pendingSnapshot.forEach(doc => {
            batch.update(doc.ref, {
                status: 'sent',
                sentCount: 0,
                failureCount: 0,
                sentAt: now,
                note: 'Nenhum dispositivo registrado'
            });
        });
        return batch.commit();
    }

    const promises = [];

    for (const doc of pendingSnapshot.docs) {
        const pushData = doc.data();
        const message = {
            notification: { 
                title: pushData.title, 
                body: pushData.body 
            },
            webpush: {
                fcmOptions: {
                    link: '/'
                }
            },
            tokens: allTokens
        };

        const sendPromise = admin.messaging().sendEachForMulticast(message)
            .then(async (response) => {
                console.log(`FCM Scheduler: Envio agendado concluído para ${response.successCount} dispositivos. Falhas: ${response.failureCount}`);
                
                await doc.ref.update({
                    status: 'sent',
                    sentCount: response.successCount,
                    failureCount: response.failureCount,
                    sentAt: now
                });

                // Limpeza de tokens inválidos
                if (response.failureCount > 0) {
                    const failedTokens = [];
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
                        const batchUpdate = admin.firestore().batch();
                        usersSnapshot.forEach(userDoc => {
                            const userData = userDoc.data();
                            const userTokens = userData.fcmTokens || [];
                            const hasFailed = userTokens.some(t => failedTokens.includes(t));
                            if (hasFailed) {
                                const updatedTokens = userTokens.filter(t => !failedTokens.includes(t));
                                batchUpdate.update(userDoc.ref, { fcmTokens: updatedTokens });
                            }
                        });
                        await batchUpdate.commit();
                        console.log(`FCM Scheduler: Limpeza de ${failedTokens.length} tokens inválidos.`);
                    }
                }
            })
            .catch(async (error) => {
                console.error('FCM Scheduler: Erro ao enviar notificação agendada:', error);
                await doc.ref.update({
                    status: 'failed',
                    error: error.message,
                    sentAt: now
                });
            });
            
        promises.push(sendPromise);
    }

    return Promise.all(promises);
});


