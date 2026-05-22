'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/firebase';
import type { ServiceWithId } from '@/app/services/page';

interface QuickServiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clients: UserProfile[];
  services: ServiceWithId[];
  professionals?: UserProfile[]; // Only for admin
  currentProfessionalId?: string; // For professionals
  onConfirm: (data: {
    customerId?: string;
    type: 'client' | 'guest';
    guestData?: { name: string; phone: string; email: string };
    serviceId: string;
    professionalId: string;
    notes: string;
  }) => Promise<void>;
}

export function QuickServiceDialog({
  isOpen,
  onOpenChange,
  clients,
  services,
  professionals,
  currentProfessionalId,
  onConfirm,
}: QuickServiceDialogProps) {
  const [step, setStep] = useState<'client' | 'service'>('client');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [isNewGuest, setIsNewGuest] = useState(false);
  
  const [guestData, setGuestData] = useState({ name: '', phone: '', email: '' });
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(currentProfessionalId || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredClients = useMemo(() => {
    if (!searchTerm || !clients) return [];
    const lowerTerm = searchTerm.toLowerCase();
    const cleanPhoneTerm = searchTerm.replace(/\D/g, '');
    
    return clients.filter(c => {
      const nameMatch = c.name?.toLowerCase().includes(lowerTerm);
      const emailMatch = c.email?.toLowerCase().includes(lowerTerm);
      const phoneMatch = cleanPhoneTerm && c.phoneNumber ? c.phoneNumber.replace(/\D/g, '').includes(cleanPhoneTerm) : false;
      return nameMatch || emailMatch || phoneMatch;
    }).slice(0, 5);
  }, [clients, searchTerm]);

  const handleReset = () => {
    setStep('client');
    setSearchTerm('');
    setSelectedClient(null);
    setIsNewGuest(false);
    setGuestData({ name: '', phone: '', email: '' });
    setSelectedServiceId('');
    setSelectedProfessionalId(currentProfessionalId || '');
    setNotes('');
  };

  const handleConfirm = async () => {
    if (!selectedServiceId || !selectedProfessionalId) return;
    if (!selectedClient && !isNewGuest) return;
    if (isNewGuest && !guestData.name) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        customerId: selectedClient?.id,
        type: isNewGuest ? 'guest' : 'client',
        guestData: isNewGuest ? guestData : undefined,
        serviceId: selectedServiceId,
        professionalId: selectedProfessionalId,
        notes,
      });
      onOpenChange(false);
      handleReset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Novo Atendimento Direto</DialogTitle>
          <DialogDescription>
            Registre um serviço realizado agora mesmo (cliente balcão).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {step === 'client' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Identificar Cliente</Label>
                {!selectedClient && !isNewGuest ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, e-mail ou celular..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    {filteredClients.length > 0 && (
                      <div className="border rounded-md divide-y overflow-hidden">
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between group"
                            onClick={() => setSelectedClient(client)}
                          >
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.email || client.phoneNumber}</p>
                            </div>
                            <UserCheck className="h-4 w-4 opacity-0 group-hover:opacity-100 text-emerald-600" />
                          </button>
                        ))}
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      className="w-full gap-2 h-12 border-dashed" 
                      onClick={() => setIsNewGuest(true)}
                    >
                      <UserPlus className="h-4 w-4" /> Novo Cliente (Não cadastrado)
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{isNewGuest ? "Novo Cliente" : selectedClient?.name}</p>
                        <p className="text-xs text-muted-foreground">{isNewGuest ? "Cadastro Manual" : selectedClient?.email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setIsNewGuest(false); }}>Alterar</Button>
                  </div>
                )}
              </div>

              {isNewGuest && (
                <div className="space-y-3 border p-3 rounded-lg bg-muted/10">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome completo *</Label>
                    <Input 
                      value={guestData.name} 
                      onChange={e => setGuestData({...guestData, name: e.target.value})}
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Celular</Label>
                      <Input 
                        value={guestData.phone} 
                        onChange={e => setGuestData({...guestData, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input 
                        value={guestData.email} 
                        onChange={e => setGuestData({...guestData, email: e.target.value})}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full" 
                disabled={(!selectedClient && !isNewGuest) || (isNewGuest && !guestData.name)}
                onClick={() => setStep('service')}
              >
                Continuar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Serviço Realizado</Label>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(svc => (
                      <SelectItem key={svc.id} value={svc.id}>{svc.name} - R$ {svc.price}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {professionals && professionals.length > 0 && (
                <div className="space-y-2">
                  <Label>Profissional</Label>
                  <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map(pro => (
                        <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações (Opcional)</Label>
                <Input 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Ex: Cliente preferiu corte social..." 
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('client')}>Voltar</Button>
                <Button 
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700" 
                  disabled={!selectedServiceId || !selectedProfessionalId || isSubmitting}
                  onClick={handleConfirm}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Finalizar Atendimento
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
