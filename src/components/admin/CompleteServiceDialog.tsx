import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface CompleteServiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string, photos: string[], createProfile?: boolean, guestData?: { name: string, phone: string, email: string }) => Promise<void>;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName: string;
  isGuest?: boolean;
}

export function CompleteServiceDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  customerName,
  customerPhone = '',
  customerEmail = '',
  serviceName,
  isGuest
}: CompleteServiceDialogProps) {
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [createProfile, setCreateProfile] = useState(true);
  const [guestData, setGuestData] = useState({ 
    name: customerName, 
    phone: customerPhone, 
    email: customerEmail 
  });

  // Update guest data when props change (dialog opens)
  useEffect(() => {
    if (isOpen) {
      setGuestData({
        name: customerName,
        phone: customerPhone,
        email: customerEmail
      });
    }
  }, [isOpen, customerName, customerPhone, customerEmail]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'uploads/appointments');
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falha no upload');
      }
      const { url } = await response.json();
      
      setPhotos((prev) => [...prev, url as string]);
      toast({ title: 'Foto enviada!', description: 'Foto carregada com sucesso.' });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({ variant: 'destructive', title: 'Erro de Upload', description: error?.message || 'Não foi possível enviar as fotos.' });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // If isGuest and createProfile, we pass the (possibly edited) guestData
      await onConfirm(notes, photos, isGuest ? createProfile : false, isGuest ? guestData : undefined);
      onOpenChange(false);
      setNotes('');
      setPhotos([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Concluir Atendimento</DialogTitle>
          <DialogDescription>
            Confirme a conclusão do serviço para <strong>{customerName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isGuest && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
                <input 
                  type="checkbox" 
                  id="createProfile" 
                  checked={createProfile}
                  onChange={(e) => setCreateProfile(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <Label htmlFor="createProfile" className="text-sm font-bold text-slate-900 cursor-pointer">
                  Criar Cadastro de Cliente
                </Label>
              </div>
              
              {createProfile && (
                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    <Label htmlFor="guestName" className="text-xs font-semibold text-slate-700">Nome Completo</Label>
                    <Input 
                      id="guestName"
                      value={guestData.name}
                      onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                      className="bg-white text-slate-900 border-slate-300 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="guestPhone" className="text-xs font-semibold text-slate-700">Telefone/WhatsApp</Label>
                    <Input 
                      id="guestPhone"
                      placeholder="(00) 00000-0000"
                      value={guestData.phone}
                      onChange={(e) => setGuestData({...guestData, phone: e.target.value})}
                      className="bg-white text-slate-900 border-slate-300 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="guestEmail" className="text-xs font-semibold text-slate-700">E-mail (Opcional)</Label>
                    <Input 
                      id="guestEmail"
                      type="email"
                      placeholder="cliente@email.com"
                      value={guestData.email}
                      onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                      className="bg-white text-slate-900 border-slate-300 focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações do Serviço</Label>
            <Textarea 
              id="notes"
              placeholder="Ex: Utilizado shampoo X e finalizado com pomada matte."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos do Resultado</Label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img src={url} alt={`Serviço ${i+1}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className={
                  `flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-md cursor-pointer hover:border-primary hover:bg-muted transition-all
                  ${isUploading ? 'opacity-50 pointer-events-none' : ''}`
                }>
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                  <span className="text-[10px] text-muted-foreground mt-1 text-center">Adicionar Fotos</span>
                  <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploading}
              />  </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || isUploading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Conclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
