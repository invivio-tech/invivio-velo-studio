'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore, initAdmin } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { format, addMinutes, parse, startOfDay, endOfDay } from 'date-fns';
import { parseDuration } from '@/lib/utils';

// --- Schemas ---

const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string(),
});

const BookingChatInputSchema = z.object({
  history: z.array(MessageSchema),
  message: z.string(),
});

// --- Tools ---

const getServices = ai.defineTool(
  {
    name: 'get_services',
    description: 'Consulta os serviços oferecidos pela barbearia, preços e durações.',
    inputSchema: z.void(),
  },
  async () => {
    initAdmin();
    const db = getAdminFirestore();
    const snapshot = await db.collection('services').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
);

const getProfessionals = ai.defineTool(
  {
    name: 'get_professionals',
    description: 'Consulta a lista de barbeiros/profissionais disponíveis.',
    inputSchema: z.void(),
  },
  async () => {
    initAdmin();
    const db = getAdminFirestore();
    const snapshot = await db.collection('users').where('role', '==', 'professional').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      serviceIds: doc.data().serviceIds || []
    }));
  }
);

const getMembershipPlans = ai.defineTool(
  {
    name: 'get_membership_plans',
    description: 'Consulta os planos de assinatura ativos do Clube da barbearia (preços, benefícios e regras).',
    inputSchema: z.void(),
  },
  async () => {
    initAdmin();
    const db = getAdminFirestore();
    const snapshot = await db.collection('membershipPlans').where('isActive', '==', true).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        price: data.price,
        description: data.description || '',
        maxUsesPerMonth: data.maxUsesPerMonth === 999 || !data.maxUsesPerMonth ? 'Ilimitado' : `${data.maxUsesPerMonth}x por mês`
      };
    });
  }
);

const checkCustomerStatus = ai.defineTool(
  {
    name: 'check_customer_status',
    description: 'Consulta o saldo de pontos fidelidade e o status de assinatura do Clube do cliente pelo telefone ou nome.',
    inputSchema: z.object({
      phoneOrName: z.string().describe('Telefone (DDD + número) ou nome do cliente'),
    }),
  },
  async ({ phoneOrName }) => {
    initAdmin();
    const db = getAdminFirestore();
    const cleanPhone = phoneOrName.replace(/\D/g, '');
    
    let userDoc: any = null;
    if (cleanPhone.length >= 8) {
      const snap = await db.collection('users')
        .where('phoneNumber', 'in', [cleanPhone, cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone])
        .limit(1)
        .get();
      if (!snap.empty) userDoc = snap.docs[0];
    }

    if (!userDoc) {
      const nameSnap = await db.collection('users')
        .where('name', '==', phoneOrName.trim())
        .limit(1)
        .get();
      if (!nameSnap.empty) userDoc = nameSnap.docs[0];
    }

    if (!userDoc) {
      return {
        found: false,
        message: 'Cliente não localizado na base cadastral com estes dados.'
      };
    }

    const userData = userDoc.data();
    const points = userData.loyaltyPoints || 0;
    
    // Checa assinatura no Clube
    let subscriptionStatus = 'Sem assinatura ativa';
    if (userData.subscription && userData.subscription.status === 'active') {
      subscriptionStatus = `Assinante do plano ${userData.subscription.planName || 'Clube'}`;
    } else {
      const memSnap = await db.collection('userMemberships')
        .where('userId', '==', userDoc.id)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!memSnap.empty) {
        subscriptionStatus = `Assinante do plano ${memSnap.docs[0].data().planName || 'Clube'}`;
      }
    }

    return {
      found: true,
      name: userData.name,
      loyaltyPoints: points,
      subscription: subscriptionStatus
    };
  }
);

const checkAvailability = ai.defineTool(
  {
    name: 'check_availability',
    description: 'Verifica a agenda de um profissional em uma data específica.',
    inputSchema: z.object({
      professionalId: z.string().describe('ID do profissional'),
      date: z.string().describe('Data no formato YYYY-MM-DD'),
    }),
  },
  async ({ professionalId, date }) => {
    initAdmin();
    const db = getAdminFirestore();
    const start = parse(date, 'yyyy-MM-dd', new Date());
    const end = endOfDay(start);

    const snapshot = await db.collection('appointments')
      .where('professionalId', '==', professionalId)
      .where('status', '==', 'scheduled')
      .where('startTime', '>=', Timestamp.fromDate(start))
      .where('startTime', '<=', Timestamp.fromDate(end))
      .get();

    const busySlots = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        start: format(data.startTime.toDate(), 'HH:mm'),
        end: format(data.endTime.toDate(), 'HH:mm'),
      };
    });

    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');
    
    let instructions = '';
    if (date === todayStr) {
      instructions = `ATENÇÃO CRÍTICA: Hoje é dia ${todayStr} e a hora atual exata é ${currentTimeStr}. VOCÊ É OBRIGADO a ocultar, remover e não sugerir NENHUM horário antes de ${currentTimeStr}. Só sugira horários futuros!`;
    }

    return {
      date,
      busySlots,
      message: busySlots.length > 0 
        ? `Temos ${busySlots.length} horários ocupados nesta data. ${instructions}` 
        : `Todos os horários da grade padrão do salão estão livres nesta data (excluindo os que já passaram). ${instructions}`
    };
  }
);

const confirmBooking = ai.defineTool(
  {
    name: 'confirm_booking',
    description: 'Finaliza e confirma o agendamento do cliente.',
    inputSchema: z.object({
      customerName: z.string(),
      customerPhone: z.string(),
      professionalId: z.string(),
      serviceId: z.string(),
      date: z.string().describe('YYYY-MM-DD'),
      time: z.string().describe('HH:mm'),
    }),
  },
  async (input) => {
    initAdmin();
    const db = getAdminFirestore();
    
    // Get service details for price and duration
    const serviceDoc = await db.collection('services').doc(input.serviceId).get();
    const serviceData = serviceDoc.data();
    if (!serviceData) throw new Error('Serviço não encontrado');

    // Get professional name
    const profDoc = await db.collection('users').doc(input.professionalId).get();
    const profData = profDoc.data();

    const startTime = parse(`${input.date} ${input.time}`, 'yyyy-MM-dd HH:mm', new Date());
    const duration = parseDuration(serviceData.duration || '30');
    const endTime = addMinutes(startTime, duration);

    // Verifica se cliente é membro do Clube
    let isSubscriptionUsage = false;
    let customerId = 'guest';
    const cleanPhone = input.customerPhone.replace(/\D/g, '');
    if (cleanPhone) {
      const userSnap = await db.collection('users')
        .where('phoneNumber', 'in', [cleanPhone, cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone])
        .limit(1)
        .get();
      if (!userSnap.empty) {
        customerId = userSnap.docs[0].id;
        const uData = userSnap.docs[0].data();
        if (uData.subscription && uData.subscription.status === 'active') {
          isSubscriptionUsage = true;
        }
      }
    }

    const appointmentData = {
      customerId,
      customerName: input.customerName,
      customerPhoneNumber: input.customerPhone,
      professionalId: input.professionalId,
      professionalName: profData?.name || 'Profissional',
      serviceId: input.serviceId,
      serviceName: serviceData.name,
      servicePrice: serviceData.price,
      serviceDuration: serviceData.duration,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      status: 'scheduled',
      isSubscriptionUsage,
      createdAt: Timestamp.now(),
      notes: isSubscriptionUsage ? 'Agendado via Chat IA (Assinante do Clube)' : 'Agendado via Chat IA'
    };

    const docRef = await db.collection('appointments').add(appointmentData);
    
    return {
      success: true,
      appointmentId: docRef.id,
      isSubscriptionUsage,
      message: `Agendamento confirmado para ${input.customerName} em ${input.date} às ${input.time}.${isSubscriptionUsage ? ' (Incluso no seu Clube de Assinatura)' : ''}`
    };
  }
);

const rescheduleAppointment = ai.defineTool(
  {
    name: 'reschedule_appointment',
    description: 'Localiza um agendamento futuro do cliente pelo telefone e altera para uma nova data e hora.',
    inputSchema: z.object({
      customerPhone: z.string().describe('Telefone do cliente'),
      newDate: z.string().describe('YYYY-MM-DD'),
      newTime: z.string().describe('HH:mm'),
    }),
  },
  async (input) => {
    initAdmin();
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const cleanPhone = input.customerPhone.replace(/\D/g, '');

    const snapshot = await db.collection('appointments')
      .where('customerPhoneNumber', 'in', [cleanPhone, cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone])
      .where('status', '==', 'scheduled')
      .where('startTime', '>=', now)
      .orderBy('startTime', 'asc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        success: false,
        message: 'Não encontramos nenhum agendamento futuro para este número de telefone para ser remarcado.'
      };
    }

    const docRef = snapshot.docs[0].ref;
    const oldData = snapshot.docs[0].data();

    const newStart = parse(`${input.newDate} ${input.newTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const durationMins = parseDuration(oldData.serviceDuration || '30');
    const newEnd = addMinutes(newStart, durationMins);

    await docRef.update({
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      notes: (oldData.notes || '') + ' (Reagendado via Chat IA)'
    });

    return {
      success: true,
      message: `O agendamento de ${oldData.serviceName} foi alterado com sucesso para ${input.newDate} às ${input.newTime}!`
    };
  }
);

// --- The Flow ---

export const bookingChatbotFlow = ai.defineFlow(
  {
    name: 'bookingChatbotFlow',
    inputSchema: BookingChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    initAdmin();
    console.log('bookingChatbotFlow: Starting with message:', input.message);
    try {
      const db = getAdminFirestore();
      
      // Carrega configurações customizadas do estabelecimento
      let botName = 'Assistente Virtual';
      let businessTone = 'friendly';
      let establishmentName = 'Barbearia';
      let establishmentContext = '';
      let loyaltyPercentage = 10;

      try {
        const settingsSnap = await db.collection('establishmentSettings').doc('main').get();
        if (settingsSnap.exists) {
          const s = settingsSnap.data() || {};
          if (s.botName) botName = s.botName.trim();
          if (s.businessTone) businessTone = s.businessTone;
          if (s.name) establishmentName = s.name.trim();
          if (s.context) establishmentContext = s.context.trim();
          if (typeof s.loyaltyPercentage === 'number') loyaltyPercentage = s.loyaltyPercentage;
        }
      } catch (err) {
        console.warn('bookingChatbotFlow: Falha ao carregar establishmentSettings:', err);
      }

      let toneGuideline = "Mantenha uma comunicação calorosa, amigável e próxima, usando emojis com moderação.";
      if (businessTone === 'formal') {
        toneGuideline = "Mantenha uma comunicação formal, polida, profissional e objetiva, sem gírias.";
      } else if (businessTone === 'casual') {
        toneGuideline = "Mantenha uma comunicação casual, descontraída e moderna, jovem e direta ao ponto.";
      } else if (businessTone === 'luxury') {
        toneGuideline = "Mantenha uma comunicação sofisticada, exclusiva e atenciosa (estilo concierge).";
      }

      const now = new Date();
      const hojeStr = format(now, 'dd/MM/yyyy (EEEE)');
      const hojeIso = format(now, 'yyyy-MM-dd');

      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        messages: input.history.map(m => ({
          role: m.role as any,
          content: [{ text: m.content }]
        })),
        prompt: input.message,
        tools: [
          getServices, 
          getProfessionals, 
          getMembershipPlans, 
          checkCustomerStatus, 
          checkAvailability, 
          confirmBooking, 
          rescheduleAppointment
        ],
        system: `Você é ${botName}, assistente virtual oficial da barbearia "${establishmentName}".
Hoje é ${hojeStr} (Data de hoje em YYYY-MM-DD: ${hojeIso}).

DIRETRIZ DE TOM DE VOZ:
${toneGuideline}

${establishmentContext ? `REGRAS E INSTRUÇÕES ESPECÍFICAS DA BARBEARIA:\n${establishmentContext}\n` : ''}

REGRAS DE COMPORTAMENTO:
1. Apresente-se pelo seu nome (${botName}) e ajude o cliente a agendar, consultar planos do Clube ou verificar pontos de fidelidade.
2. Use as ferramentas para consultar serviços, profissionais, disponibilidade de horários e planos.
3. Quando o cliente escolher um serviço, use 'get_professionals' e cruze o 'id' do serviço com os 'serviceIds' dos profissionais, recomendando apenas quem realiza o serviço escolhido.
4. Para fidelidade e cashback: Cada serviço concluído gera ${loyaltyPercentage}% do valor em pontos de fidelidade. Você pode consultar o saldo do cliente usando 'check_customer_status'.
5. Para Clube de Assinaturas: Se o cliente tiver dúvidas sobre planos mensais, consulte 'get_membership_plans' e apresente as opções de assinaturas. Se o cliente for assinante ativo, serviços inclusos não cobram valor avulso.
6. Para confirmar o agendamento, você PRECISA do Nome, Telefone WhatsApp, Serviço, Profissional, Data e Horário.
7. Se o serviço for 'Sob Consulta' (priceOnRequest), informe que o valor é alinhado no local.
8. Mantenha as respostas objetivas, naturais e amigáveis ✂️.
`,
      });

      console.log('bookingChatbotFlow: AI response generated successfully');
      return response.text;
    } catch (err) {
      console.error('bookingChatbotFlow ERROR:', err);
      throw err;
    }
  }
);

/**
 * Wrapper for Server Action call
 */
export async function chatWithBookingBot(history: any[], message: string) {
  try {
    return await bookingChatbotFlow({ history, message });
  } catch (error: any) {
    console.error('Error in chatbot flow:', error);
    return "Desculpe, tive um breve probleminha técnico na conexão. Poderia tentar enviar sua mensagem novamente?";
  }
}
