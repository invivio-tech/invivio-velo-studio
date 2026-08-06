import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface NewClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewClientDialog({ isOpen, onOpenChange }: NewClientDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    
    if (!name || !phone) {
      toast({ title: 'Campos Obrigatórios', description: 'Nome e telefone são obrigatórios.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Remove caracteres não numéricos do telefone (opcional, mas recomendado)
      const cleanPhone = phone.replace(/\D/g, '');

      await addDoc(collection(firestore, 'users'), {
        name,
        email,
        phoneNumber: cleanPhone,
        role: 'client',
        createdAt: Timestamp.now(),
        disabled: false,
        loyaltyPoints: 0,
        source: 'manual-registration-studio'
      });

      toast({ title: 'Cliente Registrado', description: 'O novo cliente foi adicionado com sucesso.' });
      setName('');
      setEmail('');
      setPhone('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating client:', error);
      toast({ title: 'Erro', description: 'Não foi possível registrar o cliente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente manualmente para que ele possa agendar e acumular pontos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome Completo</Label>
              <Input
                id="client-name"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Telefone (WhatsApp)</Label>
              <Input
                id="client-phone"
                placeholder="Ex: 11999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">O telefone será usado pelo Bot do WhatsApp para identificar o cliente.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">E-mail (Opcional)</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="Ex: joao@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
