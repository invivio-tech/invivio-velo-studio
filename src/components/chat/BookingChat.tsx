'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Scissors, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { chatWithBookingBot } from '@/ai/flows/booking-chatbot';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function BookingChat() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      content: 'Olá! Sou a sua assistente virtual ✂️. Como posso te ajudar hoje? Se quiser agendar um horário, basta me dizer o que precisa!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const messageToSend = presetText || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for Genkit (model is modeled as 'model' in Gemini, but Genkit history uses 'model' or 'output')
      // Note: We send simplified history to the server action
      const response = await chatWithBookingBot(
        messages.map(m => ({ role: m.role, content: m.content })),
        messageToSend
      );

      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'Ops, tive um errinho. Pode repetir?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[85vh] md:h-[80vh] w-full max-w-2xl mx-auto border-none bg-card/30 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-background/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/20 text-primary">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></div>
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight">Assistente Virtual</p>
            <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-widest">Online Agora</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Info className="h-4 w-4 opacity-50" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4 md:p-6 bg-gradient-to-b from-transparent to-primary/5">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex w-full items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "p-4 rounded-3xl max-w-[85%] text-sm md:text-base leading-relaxed",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/20" 
                    : "bg-white/10 backdrop-blur-md border border-white/10 rounded-tl-none text-foreground"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 animate-pulse">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl rounded-tl-none text-xs font-medium text-muted-foreground italic">
                Digitando...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length < 4 && !isLoading && (
        <div className="p-3 flex gap-2 overflow-x-auto no-scrollbar bg-background/20 backdrop-blur-sm border-t border-white/5">
           <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full bg-white/5 border-white/10 text-[11px] gap-2 whitespace-nowrap"
            onClick={() => handleSendMessage(undefined, 'Quais são os serviços e preços?')}
           >
             <Scissors className="h-3 w-3" /> Ver Preços
           </Button>
           <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full bg-white/5 border-white/10 text-[11px] gap-2 whitespace-nowrap"
            onClick={() => handleSendMessage(undefined, 'Quem são os barbeiros?')}
           >
             <User className="h-3 w-3" /> Ver Barbeiros
           </Button>
           <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full bg-white/5 border-white/10 text-[11px] gap-2 whitespace-nowrap"
            onClick={() => handleSendMessage(undefined, 'Quero marcar um horário hoje')}
           >
             <Calendar className="h-3 w-3" /> Horários de Hoje
           </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-6 bg-background/80 border-t border-white/5">
        <form
          onSubmit={handleSendMessage}
          className="relative"
        >
          <Input
            placeholder="Digite sua mensagem..."
            className="pr-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:ring-primary/50 text-base"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10 w-10 transition-all active:scale-90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
        <p className="text-center text-[10px] text-muted-foreground mt-4 opacity-50">
           Conversa via <span className="text-primary font-bold">Gemini AI</span> • Invivio Tecnologia
        </p>
      </div>
    </Card>
  );
}
