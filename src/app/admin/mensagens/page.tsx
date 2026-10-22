'use client';

import { authFetch } from '@/lib/auth-fetch';
import { WhatsAppMedia } from '@/components/admin/WhatsAppMedia';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  User, 
  Send, 
  PauseCircle, 
  PlayCircle, 
  Clock, 
  Search, 
  X, 
  MessageSquare, 
  Zap, 
  CheckCheck,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { PlanGate } from '@/components/PlanGate';
import { Chat, Message } from '@/types/chat';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MensagensPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'human_needed'>('all');
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [newReplyText, setNewReplyText] = useState('');
  const [isSavingReplies, setIsSavingReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  // Buscar configurações do estabelecimento (para respostas rápidas personalizadas)
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

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

  const getInitials = (name?: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };


  const toggleAi = async () => {
    if (!firestore || !selectedChat) return;
    const chatRef = doc(firestore, 'chats', selectedChat.id);
    await updateDoc(chatRef, { aiEnabled: !selectedChat.aiEnabled });
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedChatId || isSending) return;

    setIsSending(true);
    const textToSend = messageText;
    setMessageText('');

    try {
      const res = await authFetch('/api/chat/send', {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filtragem de conversas
  const filteredChats = useMemo(() => {
    if (!chats) return [];
    return chats.filter((chat) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (chat.customerName || '').toLowerCase().includes(q) ||
        chat.id.toLowerCase().includes(q) ||
        (chat.lastMessage || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (chatFilter === 'human_needed') return !chat.aiEnabled;
      return true;
    });
  }, [chats, searchTerm, chatFilter]);

  const humanNeededCount = useMemo(() => {
    return chats?.filter((c) => !c.aiEnabled).length || 0;
  }, [chats]);

  const DEFAULT_QUICK_REPLIES = [
    'Olá! Como posso ajudar você hoje?',
    'Você pode agendar seu horário diretamente pelo nosso link online:',
    'Seu agendamento foi confirmado com sucesso! Te aguardamos.',
    'Qual o melhor dia e horário para você?',
    'Segue a nossa chave PIX para pagamento:'
  ];

  const activeQuickReplies = useMemo(() => {
    if (settings?.quickReplies && Array.isArray(settings.quickReplies) && settings.quickReplies.length > 0) {
      return settings.quickReplies;
    }
    return DEFAULT_QUICK_REPLIES;
  }, [settings?.quickReplies]);

  const handleAddReply = async () => {
    if (!newReplyText.trim() || !firestore) return;
    setIsSavingReplies(true);
    try {
      const currentList = [...activeQuickReplies, newReplyText.trim()];
      await updateDoc(doc(firestore, 'establishmentSettings', 'main'), { quickReplies: currentList });
      setNewReplyText('');
      toast({ title: 'Resposta rápida adicionada com sucesso!' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao salvar resposta rápida' });
    } finally {
      setIsSavingReplies(false);
    }
  };

  const handleRemoveReply = async (indexToRemove: number) => {
    if (!firestore) return;
    setIsSavingReplies(true);
    try {
      const currentList = [...activeQuickReplies];
      currentList.splice(indexToRemove, 1);
      await updateDoc(doc(firestore, 'establishmentSettings', 'main'), { quickReplies: currentList });
      toast({ title: 'Resposta rápida removida!' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao remover' });
    } finally {
      setIsSavingReplies(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!firestore) return;
    setIsSavingReplies(true);
    try {
      await updateDoc(doc(firestore, 'establishmentSettings', 'main'), { quickReplies: DEFAULT_QUICK_REPLIES });
      toast({ title: 'Respostas padrão restauradas!' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao restaurar' });
    } finally {
      setIsSavingReplies(false);
    }
  };

  return (
    <PlanGate module="whatsappBot">
      <div className="flex h-[calc(100vh-8rem)] gap-4 p-4">
        {/* Sidebar de Conversas */}
        <Card className="w-full md:w-80 lg:w-96 flex flex-col overflow-hidden border-border bg-card shadow-sm">
          {/* Header da Sidebar com Busca */}
          <div className="p-3 border-b border-border/50 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Conversas</h2>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {chats?.length || 0}
              </Badge>
            </div>

            {/* Input de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 h-8 text-xs border-border bg-background"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Pílulas de Filtro */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setChatFilter('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                  chatFilter === 'all'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setChatFilter('human_needed')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                  chatFilter === 'human_needed'
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>Aguardando Humano</span>
                {humanNeededCount > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                    chatFilter === 'human_needed' ? "bg-black/20 text-white" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {humanNeededCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {isChatsLoading ? (
              <div className="p-8 text-center text-muted-foreground text-xs">Carregando conversas...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                {searchTerm ? 'Nenhuma conversa encontrada na busca.' : 'Nenhuma conversa ativa no momento.'}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedChatId === chat.id;
                const displayName = chat.customerName || chat.id;
                const initials = getInitials(chat.customerName);

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={cn(
                      "p-3 cursor-pointer transition-all flex items-start gap-3",
                      isSelected
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "hover:bg-muted/30"
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-medium text-sm text-foreground truncate mr-2">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0 font-mono">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground/70" /> {formatTime(chat.lastMessageAt)}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground truncate mb-1.5">
                        {chat.lastMessage || 'Nenhuma mensagem recente'}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {chat.aiEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            <Bot className="w-2.5 h-2.5" /> IA Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <User className="w-2.5 h-2.5" /> Atendimento Humano
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Janela de Chat */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card shadow-sm">
          {selectedChat ? (
            <>
              {/* Header do Chat */}
              <div className="p-3.5 border-b border-border/50 flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {getInitials(selectedChat.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground leading-tight">
                      {selectedChat.customerName || selectedChat.id}
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-mono">{selectedChat.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant={selectedChat.aiEnabled ? "outline" : "default"} 
                    size="sm"
                    onClick={toggleAi}
                    className={cn(
                      "text-xs gap-1.5 h-8 font-medium",
                      selectedChat.aiEnabled 
                        ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" 
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                  >
                    {selectedChat.aiEnabled ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5" />
                        Pausar IA (Assumir)
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        Retomar IA
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                {isMessagesLoading ? (
                  <div className="text-center text-xs text-muted-foreground py-6">Carregando mensagens...</div>
                ) : messages?.map((msg) => (
                  <div key={msg.id} className={cn("flex", msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                    {msg.role === 'user' ? (
                      /* Mensagem do Cliente */
                      <div className="bg-card border border-border text-card-foreground rounded-2xl rounded-tl-sm p-3.5 max-w-[80%] shadow-sm">
                        <div className="flex items-center gap-1 mb-1 text-[11px] font-semibold text-muted-foreground">
                          <User className="w-3 h-3 text-muted-foreground/70" /> {selectedChat.customerName || 'Cliente'}
                        </div>
                        {msg.mediaId && <WhatsAppMedia mediaId={msg.mediaId} mimeType={msg.mimeType} />}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <span className="text-[10px] text-muted-foreground/70 mt-1.5 block text-right font-mono">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    ) : msg.role === 'ai' ? (
                      /* Mensagem da IA */
                      <div className="bg-primary/10 border border-primary/20 text-foreground rounded-2xl rounded-tr-sm p-3.5 max-w-[80%] shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1 text-primary text-xs font-semibold">
                          <Bot className="w-3.5 h-3.5" /> Assistente Virtual
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <span className="text-[10px] text-primary/70 mt-1.5 block text-right font-mono">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    ) : (
                      /* Mensagem do Atendente Humano */
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-2xl rounded-tr-sm p-3.5 max-w-[80%] shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1 text-emerald-400 text-xs font-semibold">
                          <User className="w-3.5 h-3.5" /> Atendimento Humano
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <span className="text-[10px] text-emerald-400/70 mt-1.5 block text-right font-mono">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Rodapé / Input de Envio */}
              <div className="p-3 border-t border-border/50 bg-card space-y-2">
                {/* Linha de Atalhos Rápidos */}
                <div className="flex items-center justify-between">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        Respostas Rápidas
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-80">
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <DropdownMenuLabel className="text-xs p-0 font-semibold text-foreground">Modelos de Mensagem</DropdownMenuLabel>
                        <span className="text-[10px] text-muted-foreground">{activeQuickReplies.length} disponíveis</span>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {activeQuickReplies.map((reply, i) => (
                          <DropdownMenuItem
                            key={i}
                            className="text-xs cursor-pointer py-1.5 px-2 leading-relaxed"
                            onClick={() => setMessageText((prev) => (prev ? `${prev} ${reply}` : reply))}
                          >
                            {reply}
                          </DropdownMenuItem>
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs cursor-pointer text-primary font-medium flex items-center gap-2 py-2 focus:text-primary"
                        onClick={() => setIsManageDialogOpen(true)}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Personalizar Respostas Rápidas...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {selectedChat.aiEnabled && (
                    <span className="text-[11px] text-muted-foreground">
                      Enviar pausará automaticamente a IA
                    </span>
                  )}
                </div>

                <form className="flex gap-2 items-end" onSubmit={sendMessage}>
                  <Textarea
                    placeholder="Digite sua mensagem para o cliente... (Enter envia, Shift+Enter quebra linha)"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="min-h-[44px] max-h-32 resize-none text-sm border-border bg-background py-2.5"
                    disabled={isSending}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="h-11 w-11 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                    disabled={!messageText.trim() || isSending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Nenhuma conversa selecionada</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Selecione uma conversa na lista ao lado para acompanhar o histórico ou interagir.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal de Gerenciamento de Respostas Rápidas */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-headline text-foreground">
              <Zap className="w-5 h-5 text-primary" /> Gerenciar Respostas Rápidas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre mensagens prontas para agilizar o atendimento manual da barbearia no WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {/* Adicionar nova resposta */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-foreground">Nova Resposta</label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Segue a nossa chave PIX: ..."
                value={newReplyText}
                onChange={(e) => setNewReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddReply();
                  }
                }}
                className="text-xs h-9 bg-background border-border"
                disabled={isSavingReplies}
              />
              <Button
                size="sm"
                onClick={handleAddReply}
                disabled={!newReplyText.trim() || isSavingReplies}
                className="gap-1.5 h-9 shrink-0 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSavingReplies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Adicionar
              </Button>
            </div>
          </div>

          {/* Lista de respostas cadastradas */}
          <div className="space-y-1.5 pt-2 flex-1 min-h-0 flex flex-col">
            <label className="text-xs font-semibold text-foreground">
              Respostas Ativas ({activeQuickReplies.length})
            </label>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56 divide-y divide-border/30 border border-border/50 rounded-lg p-2.5 bg-background/50">
              {activeQuickReplies.map((reply, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 pt-2 first:pt-0 text-xs">
                  <span className="flex-1 text-foreground leading-relaxed break-words">{reply}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveReply(idx)}
                    disabled={isSavingReplies || activeQuickReplies.length <= 1}
                    className="h-6 w-6 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 shrink-0"
                    title="Excluir resposta"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 flex flex-row items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              disabled={isSavingReplies}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar Padrões
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManageDialogOpen(false)}
              className="text-xs h-8"
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlanGate>
  );
}
