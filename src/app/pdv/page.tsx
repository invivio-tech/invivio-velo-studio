'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Receipt, User } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Product } from '../products/page';
import type { UserProfile } from '@/firebase';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function PDVPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('avulso');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products, isLoading: isProductsLoading } = useCollection<Product>(productsRef);

  const clientsRef = useMemoFirebase(
    () => {
      if (!firestore || userProfile?.role !== 'admin') return null;
      return collection(firestore, 'users');
    },
    [firestore, userProfile?.role]
  );
  const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(clientsRef);

  const clients = useMemo(() => {
    return (users || []).filter(u => u.role === 'client');
  }, [users]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products.slice(0, 8); // show some default products if no search
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({ variant: 'destructive', title: 'Produto sem estoque' });
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ variant: 'destructive', title: 'Quantidade máxima em estoque atingida' });
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        if (newQ > item.product.stock) {
          toast({ variant: 'destructive', title: 'Estoque insuficiente' });
          return item;
        }
        if (newQ <= 0) return { ...item, quantity: 0 };
        return { ...item, quantity: newQ };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const totalValue = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!firestore || cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      let clientName = 'Cliente Avulso';
      if (selectedClientId !== 'avulso') {
        const c = clients.find(c => c.id === selectedClientId);
        if (c) clientName = c.displayName || c.email || 'Cliente';
      }

      // 1. Create order
      const orderData = {
        clientId: selectedClientId === 'avulso' ? null : selectedClientId,
        clientName,
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity
        })),
        totalValue,
        status: 'paid', // assumes payment received at counter
        paymentMethod,
        createdAt: new Date().toISOString()
      };

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData);

      // 2. Decrement stock
      const updatePromises = cart.map(item => {
        const pRef = doc(firestore, 'products', item.product.id);
        return updateDoc(pRef, {
          stock: increment(-item.quantity)
        });
      });
      await Promise.all(updatePromises);

      toast({ title: 'Venda finalizada com sucesso!' });
      
      // Print receipt
      handlePrintReceipt(orderRef.id, orderData);

      // Reset
      setCart([]);
      setSearchTerm('');
      setSelectedClientId('avulso');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar venda',
        description: 'Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = (orderId: string, orderData: any) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const estabName = 'Clínica'; // Ideally fetched from settings

    const itemsHtml = orderData.items.map((i: any) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed #ccc;">${i.quantity}x ${i.name}</td>
        <td style="padding: 8px 0; border-bottom: 1px dashed #ccc; text-align: right;">R$ ${(i.price).toFixed(2)}</td>
        <td style="padding: 8px 0; border-bottom: 1px dashed #ccc; text-align: right;">R$ ${(i.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = \`
      <html>
        <head>
          <title>Recibo - Pedido \${orderId}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 14px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 15px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="title">\${estabName}</div>
            <div class="subtitle">Recibo de Venda (PDV)</div>
            <div class="subtitle">\${new Date(orderData.createdAt).toLocaleString('pt-BR')}</div>
          </div>
          
          <div class="divider"></div>
          <div>Cliente: \${orderData.clientName}</div>
          <div>Pagamento: \${orderData.paymentMethod.toUpperCase()}</div>
          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: right;">Unid</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              \${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>
          <div class="total">
            TOTAL: R$ \${orderData.totalValue.toFixed(2)}
          </div>
          
          <div class="footer">
            Obrigado pela preferência!<br>
            ID do Pedido: \${orderId}
          </div>
        </body>
      </html>
    \`;

    receiptWindow.document.write(html);
    receiptWindow.document.close();
  };

  if (isProfileLoading || isProductsLoading || isUsersLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] lg:col-span-2" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
    return <div className="p-8">Acesso restrito à administração.</div>;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Frente de Caixa (PDV)</h2>
          <p className="text-muted-foreground mt-1">
            Venda rápida de produtos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Products List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Catálogo de Produtos</CardTitle>
              <div className="relative w-full max-w-sm pt-2">
                <Search className="absolute left-2.5 top-5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto pelo nome..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                  <div key={p.id} className="border rounded-lg p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
                    <div>
                      <h4 className="font-semibold line-clamp-1">{p.name}</h4>
                      <p className="text-sm text-muted-foreground">{p.category}</p>
                      <div className="mt-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.price)}
                      </div>
                      <div className="text-xs mt-1 text-muted-foreground">
                        Estoque: <span className={p.stock <= 0 ? "text-destructive font-bold" : ""}>{p.stock}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="secondary"
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(p)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-8 text-center text-muted-foreground">
                    Nenhum produto encontrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Cart */}
        <div>
          <Card className="h-full flex flex-col sticky top-4">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Resumo da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto py-4">
              
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label>Vincular a um Paciente/Tutor</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avulso">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Cliente Avulso
                        </div>
                      </SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.displayName || c.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                  <ShoppingCart className="h-12 w-12 opacity-20 mb-4" />
                  <p>O carrinho está vazio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between p-2 hover:bg-secondary/20 rounded-md">
                      <div className="flex-1 truncate pr-2">
                        <h5 className="font-medium text-sm truncate">{item.product.name}</h5>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} un</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border rounded-md">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </CardContent>
            
            <CardFooter className="flex flex-col border-t pt-4 bg-muted/20">
              <div className="w-full space-y-4 mb-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalValue)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {isSubmitting ? 'Processando...' : 'Finalizar e Emitir Recibo'}
              </Button>
            </CardFooter>
          </Card>
        </div>

      </div>
    </div>
  );
}
