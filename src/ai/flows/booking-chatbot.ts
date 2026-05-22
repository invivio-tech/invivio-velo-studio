'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore, initAdmin } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { format, addMinutes, parse, startOfDay, endOfDay } from 'date-fns';

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
      name: doc.data().name
    }));
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

    return {
      date,
      busySlots,
      message: busySlots.length > 0 
        ? `Temos ${busySlots.length} horários ocupados nesta data.` 
        : 'Todos os horários estão livres nesta data.'
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
    const db = getAdminFirestore();
    
    // Get service details for price and duration
    const serviceDoc = await db.collection('services').doc(input.serviceId).get();
    const serviceData = serviceDoc.data();
    if (!serviceData) throw new Error('Serviço não encontrado');

    // Get professional name
    const profDoc = await db.collection('users').doc(input.professionalId).get();
    const profData = profDoc.data();

    const startTime = parse(`${input.date} ${input.time}`, 'yyyy-MM-dd HH:mm', new Date());
    const duration = parseInt(serviceData.duration || '30', 10);
    const endTime = addMinutes(startTime, duration);

    const appointmentData = {
      customerId: 'guest',
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
      createdAt: Timestamp.now(),
      notes: 'Agendado via Chat IA'
    };

    const docRef = await db.collection('appointments').add(appointmentData);
    
    return {
      success: true,
      appointmentId: docRef.id,
      message: `Agendamento confirmado para ${input.customerName} em ${input.date} às ${input.time}.`
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
    initAdmin(); // Garantir que o Firebase está pronto
    console.log('bookingChatbotFlow: Starting with message:', input.message);
    try {
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        messages: input.history.map(m => ({
          role: m.role as any,
          content: [{ text: m.content }]
        })),
        prompt: input.message,
        tools: [getServices, getProfessionals, checkAvailability, confirmBooking],
        system: `Você é uma assistente virtual simpática e eficiente da barbearia. 
        Seu objetivo é ajudar o cliente a agendar um serviço de forma rápida e agradável.
        
        Regras de Comportamento:
        1. Pergunte o que o cliente deseja fazer se ele ainda não disse.
        2. Use as ferramentas para consultar serviços e barbeiros quando necessário.
        3. Quando o cliente escolher um serviço e data, verifique a disponibilidade do profissional.
        4. Para confirmar, você PRECISA do Nome e WhatsApp do cliente. Se ele não informou, peça gentilmente.
        5. Sempre confirme os detalhes (Serviço, Barbeiro, Data, Valor) antes de chamar a ferramenta 'confirm_booking'.
        6. Mantenha as respostas curtas, amigáveis e use emojis ocasionalmente ✂️.
        7. Se o cliente perguntar algo fora do contexto de barbearia, responda educadamente que você é focada em agendamentos.
        
        Diretriz de Disponibilidade:
        - O horário de funcionamento é das 09:00 às 19:00.
        - Se um horário estiver nos 'busySlots', sugira outros próximos.
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
