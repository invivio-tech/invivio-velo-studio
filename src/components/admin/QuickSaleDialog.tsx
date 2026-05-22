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
import { Search, UserPlus, UserCheck, Loader2, PackageOpen, Plus, Minus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/firebase';
import type { Product } from '@/types/store';
import { useToast } from '@/hooks/use-toast';

interface QuickSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clients: UserProfile[];
  products: Product[];
  onConfirm: (data: {
    customerId?: string;
    type: 'client' | 'guest';
    guestData?: { name: string; phone: string; email: string };
    items: { productId: string; quantity: number }[];
  }) => Promise<void>;
}

export function QuickSaleDialog({
  isOpen,
  onOpenChange,
  clients,
  products,
  onConfirm,
}: QuickSaleDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'client' | 'product'>('client');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [isNewGuest, setIsNewGuest] = useState(false);
  
  const [guestData, setGuestData] = useState({ name: '', phone: '', email: '' });
  
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableProducts = useMemo(() => {
    return products?.filter(p => p.active && (p.stock ?? 0) > 0) || [];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return availableProducts;
    const lowerTerm = productSearch.toLowerCase();
    return availableProducts.filter(p => p.name.toLowerCase().includes(lowerTerm));
  }, [availableProducts, productSearch]);

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
    setProductSearch('');
    setCart([]);
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= (product.stock ?? 0)) {
          toast({ description: 'Estoque máximo atingido para este produto.', variant: 'destructive' });
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleRemoveOne = (productId: string) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
    ));
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  , [cart]);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    if (!selectedClient && !isNewGuest) return;
    if (isNewGuest && !guestData.name) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        customerId: selectedClient?.id,
        type: isNewGuest ? 'guest' : 'client',
        guestData: isNewGuest ? guestData : undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
      });
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleReset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-emerald-600" />
            Venda Balcão
          </DialogTitle>
          <DialogDescription>
            Registre uma venda rápida de produtos.
          </DialogDescription>
        </DialogHeader>

        {step === 'client' && (
          <div className="space-y-4 py-4">
            {!selectedClient && !isNewGuest ? (
              <>
                <div className="space-y-2">
                  <Label>Buscar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome, e-mail ou telefone..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {searchTerm && (
                  <div className="border rounded-lg overflow-hidden flex flex-col">
                    {filteredClients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="flex items-center justify-between p-3 hover:bg-muted text-left border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.phoneNumber || client.email}</p>
                        </div>
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">ou</span></div>
                </div>

                <Button variant="outline" className="w-full gap-2" onClick={() => setIsNewGuest(true)}>
                  <UserPlus className="h-4 w-4" /> Cliente Avulso / Novo
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      {isNewGuest ? 'Cliente Avulso' : 'Cliente Cadastrado'}
                    </p>
                    <p className="font-medium">{isNewGuest ? (guestData.name || 'Preenchendo...') : selectedClient?.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setIsNewGuest(false); }}>
                    Trocar
                  </Button>
                </div>

                {isNewGuest && (
                  <div className="space-y-3 p-4 border rounded-lg bg-card">
                    <div className="space-y-1">
                      <Label>Nome *</Label>
                      <Input value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} placeholder="Nome do cliente" />
                    </div>
                    <div className="space-y-1">
                      <Label>WhatsApp</Label>
                      <Input value={guestData.phone} onChange={e => setGuestData({...guestData, phone: e.target.value})} placeholder="Opcional" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'product' && (
          <div className="space-y-4 py-4 flex flex-col max-h-[60vh]">
            <div className="space-y-2 flex-shrink-0">
              <Label>Buscar Produto</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do produto..."
                  className="pl-9"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto space-y-2 border rounded-lg p-2 min-h-[150px]">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum produto em estoque encontrado.
                </div>
              ) : (
                filteredProducts.slice(0, 10).map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-muted rounded-md border-b last:border-0 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(p.price)} • {p.stock} un.
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleAddToCart(p)}>
                      Adicionar
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Items */}
            {cart.length > 0 && (
              <div className="flex-shrink-0 border-t pt-4 space-y-3">
                <Label>Itens Adicionados ({cart.length})</Label>
                <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
                  {cart.map(({product, quantity}) => (
                    <div key={product.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-primary">{formatPrice(product.price * quantity)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveOne(product.id)} disabled={quantity <= 1}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs font-semibold w-4 text-center">{quantity}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleAddToCart(product)} disabled={quantity >= (product.stock ?? 0)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 ml-1 text-destructive" onClick={() => handleRemoveItem(product.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'product' && (
            <Button variant="ghost" onClick={() => setStep('client')} className="mr-auto" disabled={isSubmitting}>
              Voltar
            </Button>
          )}
          
          {step === 'client' ? (
            <Button 
              onClick={() => setStep('product')} 
              disabled={(!selectedClient && !isNewGuest) || (isNewGuest && !guestData.name)}
            >
              Avançar
            </Button>
          ) : (
            <Button 
              onClick={handleConfirm}
              disabled={cart.length === 0 || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirmar Venda
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
