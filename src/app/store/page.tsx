'use client';

// ─── Imports ───────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useEffect } from 'react';
import { collection, addDoc, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUserProfile, useDoc } from '@/firebase';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { ShoppingCart, ShoppingBag, Plus, Minus, Trash2, X, Store, Package, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductCategory, OrderItem } from '@/types/store';

// ─── Types ───────────────────────────────────────────────────────────────────

type CartItem = {
  product: Product;
  quantity: number;
};

// ─── Checkout form schema ─────────────────────────────────────────────────────

const checkoutSchema = z.object({
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
});
type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
}) {
  const formatPrice = (p: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);

  return (
    <div className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Product Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {(product.imageURLs?.[0] || product.imageURL) ? (
          <img
            src={product.imageURLs?.[0] || product.imageURL}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-14 h-14 text-muted-foreground opacity-30" />
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Esgotado</span>
          </div>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <Badge className="absolute top-2 right-2 bg-orange-500 text-white border-none text-xs shadow">
            Últimas {product.stock} un.
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-col flex-1 p-4 space-y-3">
        <div className="flex-1">
          <h3 className="font-headline font-semibold text-base leading-tight line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-xl font-bold text-primary">{formatPrice(product.price ?? 0)}</span>
          <Button
            size="sm"
            disabled={(product.stock ?? 0) === 0}
            onClick={() => onAddToCart(product)}
            className="rounded-xl"
            id={`add-to-cart-${product.id}`}
          >
            <ShoppingCart className="w-4 h-4 mr-1.5" />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StorePage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);
  const establishmentCategory = settings?.businessCategory || 'barbershop';

  const getStoreSubtitle = (category: string) => {
    switch (category) {
      case 'barbershop':
        return 'Produtos profissionais usados pelos nossos barbeiros, disponíveis para você. Reserve online e retire no balcão.';
      case 'beauty_salon':
        return 'Produtos profissionais usados pelos nossos cabeleireiros e esteticistas, disponíveis para você. Reserve online e retire no balcão.';
      case 'clinic':
        return 'Produtos profissionais recomendados pelos nossos especialistas, disponíveis para você. Reserve online e retire no balcão.';
      case 'petshop':
        return 'Produtos de alta qualidade usados pelos nossos profissionais de pet care, disponíveis para você. Reserve online e retire no balcão.';
      default:
        return 'Produtos profissionais usados pelos nossos profissionais, disponíveis para você. Reserve online e retire no balcão.';
    }
  };

  const establishmentStoreSubtitle = settings?.storeSubtitle || getStoreSubtitle(establishmentCategory);

  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const categoriesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'productCategories') : null),
    [firestore]
  );

  const { data: allProducts, isLoading: areProductsLoading } = useCollection<Product>(productsCollection);
  const { data: allCategories, isLoading: areCategoriesLoading } = useCollection<ProductCategory>(categoriesCollection);

  // Filter to only active products
  const products = useMemo(() => allProducts?.filter((p) => p && p.active && (p.stock ?? 0) > 0) ?? [], [allProducts]);
  const categories = useMemo(() => allCategories?.filter((c) => c && c.active) ?? [], [allCategories]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { clientName: '', clientPhone: '' },
  });

  useEffect(() => {
    if (userProfile) {
      form.setValue('clientName', userProfile.name);
      if (userProfile.phoneNumber) {
        form.setValue('clientPhone', userProfile.phoneNumber);
      }
    }
  }, [userProfile, form]);

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === 'all') return products;
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const cartTotal = useMemo(() =>
    cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(() =>
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);

  const handleAddToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({ title: `${product.name} adicionado!`, description: 'Item no seu carrinho.' });
  }, [toast]);

  const handleRemoveOne = (productId: string) => {
    setCart((prev) =>
      prev.flatMap((item) =>
        item.product.id === productId
          ? item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []
          : [item]
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckoutSubmit = async (values: CheckoutFormValues) => {
    if (!firestore) return;
    const items: OrderItem[] = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      priceAtPurchase: item.product.price,
    }));

    try {
      const finalClientName = userProfile ? userProfile.name : (values.clientName || 'Cliente Anônimo');
      const finalClientPhone = userProfile ? (userProfile.phoneNumber || '') : (values.clientPhone || '');
      const finalClientId = userProfile ? userProfile.id : '';

      if (!userProfile && (!values.clientName || values.clientName.trim() === '')) {
        toast({ variant: 'destructive', description: 'Preencha o seu nome completo.' });
        return;
      }

      await addDoc(collection(firestore, 'orders'), {
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        clientId: finalClientId,
        items,
        totalValue: cartTotal,
        status: 'pending',
        paymentMethod: 'Pagamento no Balcão',
        createdAt: new Date().toISOString(),
      });
      setCart([]);
      setIsCheckoutOpen(false);
      setIsOrderPlaced(true);
      form.reset();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar pedido',
        description: 'Por favor, tente novamente ou entre em contato conosco.',
      });
    }
  };

  const isLoading = areProductsLoading || areCategoriesLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-headline font-bold">Nossa Loja</h1>
          </div>
          <Button
            variant="outline"
            className="relative gap-2"
            onClick={() => setIsCartOpen(true)}
            id="open-cart-button"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <ShoppingBag className="w-4 h-4" /> Produtos Premium
          </div>
          <h2 className="text-4xl sm:text-5xl font-headline font-bold tracking-tight mb-3">
            Leve o melhor para casa
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {establishmentStoreSubtitle}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        {!isLoading && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              variant={selectedCategoryId === 'all' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setSelectedCategoryId('all')}
              id="filter-all"
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setSelectedCategoryId(cat.id)}
                id={`filter-${cat.id}`}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="rounded-2xl border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-xl font-headline font-semibold">Sem produtos aqui</h3>
            <p className="text-muted-foreground mt-2">
              {selectedCategoryId !== 'all'
                ? 'Nenhum produto disponível nesta categoria no momento.'
                : 'Nossas prateleiras estão sendo abastecidas. Volte em breve!'}
            </p>
            {selectedCategoryId !== 'all' && (
              <Button variant="ghost" className="mt-4" onClick={() => setSelectedCategoryId('all')}>
                Ver Todos os Produtos
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Cart Sheet ─────────────────────────────────────────── */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-md" id="cart-sheet">
          <SheetHeader>
            <SheetTitle className="font-headline flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Seu Carrinho
              {cartCount > 0 && (
                <Badge className="ml-1">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 opacity-60">
              <ShoppingBag className="w-12 h-12" />
              <p className="font-semibold">Seu carrinho está vazio</p>
              <p className="text-sm text-muted-foreground">Adicione produtos da loja para começar</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg border bg-muted overflow-hidden">
                    {(product.imageURLs?.[0] || product.imageURL) ? (
                      <img src={product.imageURLs?.[0] || product.imageURL} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-primary font-semibold">
                      {formatPrice(product.price * quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveOne(product.id)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleAddToCart(product)}
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 ml-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(product.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <SheetFooter className="border-t pt-4 flex-col gap-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold">{formatPrice(cartTotal)}</span>
              </div>
              <div className="text-xs text-center text-muted-foreground">
                💡 Pagamento e retirada realizados presencialmente no balcão
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                id="proceed-to-checkout-button"
              >
                Finalizar Pedido
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Checkout Dialog ─────────────────────────────────────── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md" id="checkout-dialog">
          <DialogHeader>
            <DialogTitle className="font-headline">Confirmar Pedido</DialogTitle>
            <DialogDescription>
              Preencha seus dados para reservar os produtos. O pagamento será feito na loja.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCheckoutSubmit)} className="space-y-4">
              {userProfile ? (
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg text-primary">
                  <User className="w-5 h-5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Logado como: {userProfile.name}</span>
                    {userProfile.phoneNumber && <span className="text-xs opacity-80">{userProfile.phoneNumber}</span>}
                  </div>
                </div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seu Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Como se chama?" {...field} id="checkout-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp (com DDD) - Opcional</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: 11999998888" {...field} id="checkout-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator />
                </>
              )}

              {/* Order Summary */}
              <div className="space-y-1">
                <p className="text-sm font-semibold mb-2">Resumo</p>
                {cart.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{product.name} × {quantity}</span>
                    <span>{formatPrice(product.price * quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCheckoutOpen(false)}>
                  Voltar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} id="place-order-button">
                  {form.formState.isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Success Dialog ───────────────────────────────────────── */}
      <Dialog open={isOrderPlaced} onOpenChange={setIsOrderPlaced}>
        <DialogContent className="sm:max-w-sm text-center" id="order-success-dialog">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-green-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Pedido Confirmado! 🎉</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Seus produtos estão reservados. Passe na barbearia para pagar e retirar. 
              Qualquer dúvida, entre em contato conosco!
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full mt-4" onClick={() => setIsOrderPlaced(false)} id="order-success-close">
            Continuar Comprando
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
