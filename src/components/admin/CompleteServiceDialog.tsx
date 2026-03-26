import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface CompleteServiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string, photos: string[]) => Promise<void>;
  customerName: string;
  serviceName: string;
}

export function CompleteServiceDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  customerName,
  serviceName
}: CompleteServiceDialogProps) {
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const storage = useStorage();
  const { toast } = useToast();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !storage) return;

    setIsUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        Array.from(files).map(async (file) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
          const ext = file.name.split('.').pop() || 'jpg';
          const filename = `appointments/completion/${uniqueSuffix}.${ext}`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, file, { contentType: file.type });
          return getDownloadURL(storageRef);
        })
      );
      setPhotos((prev) => [...prev, ...uploadedUrls]);
      toast({ title: 'Fotos enviadas!', description: `${uploadedUrls.length} fotos carregadas com sucesso.` });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Não foi possível enviar as fotos.' });
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
      await onConfirm(notes, photos);
      onOpenChange(false);
      setNotes('');
      setPhotos([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Concluir Atendimento</DialogTitle>
          <DialogDescription>
            Confirme a conclusão do serviço para <strong>{customerName}</strong>.
            Você pode adicionar observações e fotos do serviço realizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações do Serviço</Label>
            <Textarea 
              id="notes"
              placeholder="Ex: Utilizado shampoo X e finalizado com pomada matte."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-24"
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
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                </label>
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
