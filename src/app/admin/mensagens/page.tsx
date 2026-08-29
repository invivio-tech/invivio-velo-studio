'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, User, Send, PauseCircle, PlayCircle, Clock } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Chat, Message } from '@/types/chat';

export default function MensagensPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();

  // Queries
  const chatsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'chats'), orderBy('lastMessageAt', 'desc')) : null),
    [firestore]
  );
  const { data: chats, isLoading: isChatsLoading } = useCollection<Chat>(chatsQuery);

  const messagesQuery = useMemoFirebase(
    () => (firestore && selectedChatId ? query(collection(firestore, 'chats', selectedChatId, 'messages'), orderBy('timestamp', 'asc')) : null),
    [firestore, selectedChatId]
  );
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  const selectedChat = chats?.find((c) => c.id === selectedChatId);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Formatar Horário
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const toggleAi = async () => {
    if (!firestore || !selectedChat) return;
    const chatRef = doc(firestore, 'chats', selectedChat.id);
    await updateDoc(chatRef, { aiEnabled: !selectedChat.aiEnabled });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChatId || isSending) return;

    setIsSending(true);
    const textToSend = messageText;
    setMessageText('');

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedChatId, text: textToSend }),
      });

      if (!res.ok) {
        throw new Error('Falha ao enviar');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar a mensagem.');
      setMessageText(textToSend); // Restore on error
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-4">
      {/* Sidebar de Conversas */}
      <Card className="w-1/3 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">Conversas Ativas</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isChatsLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : chats?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Nenhuma conversa encontrada.</div>
          ) : (
            chats?.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`p-4 border-b cursor-pointer transition-colors ${selectedChatId === chat.id ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium truncate mr-2">{chat.customerName || chat.id}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> {formatTime(chat.lastMessageAt)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {chat.lastMessage}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${chat.aiEnabled ? 'text-primary bg-primary/10' : 'text-orange-600 bg-orange-100'}`}>
                    <Bot className="w-3 h-3" /> {chat.aiEnabled ? 'IA Ativa' : 'IA Pausada'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Janela de Chat */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b flex justify-between items-center bg-muted/30">
              <div>
                <h2 className="font-semibold">{selectedChat.customerName || selectedChat.id}</h2>
                <p className="text-xs text-muted-foreground">{selectedChat.id}</p>
              </div>
              <Button 
                variant={selectedChat.aiEnabled ? "outline" : "default"} 
                size="sm"
                onClick={toggleAi}
                className="gap-2"
              >
                {selectedChat.aiEnabled ? (
                  <>
                    <PauseCircle className="w-4 h-4" />
                    Pausar IA (Assumir)
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    Retomar IA
                  </>
                )}
              </Button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {isMessagesLoading ? (
                <div className="text-center text-sm text-muted-foreground py-4">Carregando mensagens...</div>
              ) : messages?.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-white dark:bg-slate-800 border rounded-2xl rounded-tl-sm p-3 max-w-[80%] shadow-sm">
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">{formatTime(msg.timestamp)}</span>
                    </div>
                  ) : msg.role === 'ai' ? (
                    <div className="bg-primary/10 border-primary/20 border rounded-2xl rounded-tr-sm p-3 max-w-[80%] shadow-sm">
                      <div className="flex items-center gap-1 mb-1 text-primary text-xs font-medium">
                        <Bot className="w-3 h-3" /> Assistente IA
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] text-primary/60 mt-1 block text-right">{formatTime(msg.timestamp)}</span>
                    </div>
                  ) : (
                    <div className="bg-blue-100 dark:bg-blue-900/30 border-blue-200 border rounded-2xl rounded-tr-sm p-3 max-w-[80%] shadow-sm">
                      <div className="flex items-center gap-1 mb-1 text-blue-700 dark:text-blue-400 text-xs font-medium">
                        <User className="w-3 h-3" /> Você
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] text-blue-700/60 mt-1 block text-right">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background">
              <form className="flex gap-2" onSubmit={sendMessage}>
                <Input 
                  placeholder="Digite sua mensagem para assumir o atendimento..." 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" disabled={!messageText.trim() || isSending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              {selectedChat.aiEnabled && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Atenção: Enviar uma mensagem manual pausará automaticamente a IA.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Selecione uma conversa para visualizar.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
