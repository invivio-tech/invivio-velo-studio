'use client';

import { useState } from 'react';
import { collection, doc, updateDoc, addDoc, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUserProfile, useUser, type UserProfile } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Order, Product } from '@/types/store';
import { ShoppingBag, Zap, PlusCircle, ShoppingCart, Eye } from 'lucide-react';
import { QuickSaleDialog } from '@/components/admin/QuickSaleDialog';

type OrderStatus = Order['status'];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Aguardando' },
  { value: 'paid', label: 'Pago' },
  { value: 'completed', label: 'Retirado' },
  { value: 'cancelled', label: 'Cancelado' },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; className: string }> = {
    pending: { label: 'Aguardando', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20' },
    paid: { label: 'Pago', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20' },
    shipped: { label: 'Enviado', className: 'bg-purple-500/10 text-purple-700 border-purple-500/20 hover:bg-purple-500/20' },
    completed: { label: 'Retirado', className: 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20' },
    cancelled: { label: 'Cancelado', className: 'bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/20' },
  };
  const s = map[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={`${s.className} shadow-none font-medium`}>
      {s.label}
    </Badge>
  );
}

export default function OrdersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);

  const ordersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'orders') : null),
    [firestore]
  );

  const { data: orders, isLoading: areOrdersLoading, error } = useCollection<Order>(ordersCollection);

  const productsQuery = useMemoFirebase(() =>
    (firestore && user) ? query(collection(firestore, 'products'), orderBy('name', 'asc')) : null
  , [firestore, user]);
  const { data: products } = useCollection<Product>(productsQuery);

  const clientsQuery = useMemoFirebase(() =>
    (firestore && user) ? query(collection(firestore, 'users'), where('role', '==', 'client')) : null
  , [firestore, user]);
  const { data: clients } = useCollection<UserProfile>(clientsQuery);

  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const isAdmin = userProfile?.role === 'admin';
  const isLoading = isProfileLoading || areOrdersLoading;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!firestore) return;
    try {
      const orderRef = doc(firestore, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus, updatedAt: new Date().toISOString() });
      toast({
        title: 'Status atualizado!',
        description: `O pedido foi marcado como "${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}".`,
      });
      // Update viewOrder if it's the one we just changed
      if (viewOrder?.id === orderId) {
        setViewOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
    }
  };

  const handleQuickSaleConfirm = async (data: any) => {
    if (!firestore || !user) return;
    
    try {
      let totalValue = 0;
      const mappedItems = data.items.map((item: any) => {
        const product = products?.find(p => p.id === item.productId);
        const itemTotal = (product?.price || 0) * item.quantity;
        totalValue += itemTotal;
        
        return {
          productId: item.productId,
          productName: product?.name || 'Produto Removido',
          quantity: item.quantity,
          priceAtPurchase: product?.price || 0,
        };
      });
      
      const orderData: any = {
        clientId: data.customerId || '',
        clientName: data.type === 'client' ? (clients?.find(c => c.id === data.customerId)?.name || 'Cliente') : data.guestData?.name,
        clientPhone: data.type === 'client' ? (clients?.find(c => c.id === data.customerId)?.phoneNumber || '') : data.guestData?.phone,
        items: mappedItems,
        totalValue: totalValue,
        status: 'completed',
        paymentMethod: 'Pagamento no Balcão',
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      };

      await addDoc(collection(firestore, 'orders'), orderData);
      
      // Update stock for each item
      for (const item of data.items) {
        const product = products?.find(p => p.id === item.productId);
        if (product && product.stock !== undefined) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await updateDoc(doc(firestore, 'products', item.productId), { stock: newStock });
        }
      }

      toast({ title: 'Venda Realizada', description: 'Os produtos foram vendidos e o estoque atualizado.' });
    } catch (error) {
      console.error("Error in handleQuickSaleConfirm:", error);
      toast({ title: 'Erro', description: 'Não foi possível registrar a venda.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <ShoppingCart className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Pedidos da Loja</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button onClick={() => setIsQuickSaleOpen(true)} className="bg-primary hover:bg-primary/90 text-white gap-2">
              <ShoppingBag className="h-4 w-4" /> Venda Balcão
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Acompanhamento de Pedidos</CardTitle>
          <CardDescription>
            Visualize e atualize o status dos pedidos feitos pelo site. Pagamento e retirada são realizados no balcão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && error && (
            <p className="text-destructive text-center py-8">Erro ao carregar pedidos.</p>
          )}

          {!isLoading && !error && orders && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Alterar Status</TableHead>}
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{order.id.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.clientName}</div>
                        <div className="text-xs text-muted-foreground">{order.clientPhone}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="font-semibold">{formatPrice(order.totalValue)}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Select
                            defaultValue={order.status}
                            onValueChange={(val) => handleStatusChange(order.id, val as OrderStatus)}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewOrder(order)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhum pedido recebido ainda. Quando um cliente finalizar uma compra, ele aparecerá aqui.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline">
              Pedido #{viewOrder?.id.slice(-6).toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Recebido em {viewOrder ? formatDate(viewOrder.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-4">
              {/* Client Info */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                <p className="text-sm font-semibold">Cliente</p>
                <p className="text-sm">{viewOrder.clientName}</p>
                <p className="text-xs text-muted-foreground">{viewOrder.clientPhone}</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-semibold mb-2">Itens do Pedido</p>
                <div className="space-y-2">
                  {viewOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <div>
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                      </div>
                      <span>{formatPrice(item.priceAtPurchase * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between font-semibold">
                <span>Total do Pedido</span>
                <span className="text-lg">{formatPrice(viewOrder.totalValue)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status Atual</span>
                <StatusBadge status={viewOrder.status} />
              </div>

              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                💡 Pagamento e retirada realizados presencialmente no balcão.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Sale Dialog */}
      <QuickSaleDialog
        isOpen={isQuickSaleOpen}
        onOpenChange={setIsQuickSaleOpen}
        clients={clients || []}
        products={products || []}
        onConfirm={handleQuickSaleConfirm}
      />
    </div>
  );
}
