'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, Package, Search } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string;
}

export default function ProductsPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Produto');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  
  const { data: products, isLoading } = useCollection<Product>(productsRef);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setStock('0');
    setCategory('Produto');
    setDescription('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(p.price.toString());
    setStock(p.stock.toString());
    setCategory(p.category);
    setDescription(p.description || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, productName: string) => {
    if (!firestore) return;
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) return;
    
    try {
      await deleteDoc(doc(firestore, 'products', id));
      toast({
        title: 'Produto removido',
        description: 'O produto foi excluído do sistema.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível excluir o produto.',
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
      const data = {
        name,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        category,
        description
      };

      if (editingId) {
        await updateDoc(doc(firestore, 'products', editingId), data);
        toast({ title: 'Produto atualizado' });
      } else {
        await addDoc(collection(firestore, 'products'), data);
        toast({ title: 'Produto criado' });
      }
      setIsDialogOpen(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Only Admin or Reception should fully manage products, but let's say all users can view it.
  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Produtos / Estoque</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os produtos vendidos na clínica e controle o estoque.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Produtos</CardTitle>
          <CardDescription>
            Itens disponíveis para venda na frente de caixa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4 relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {p.name}
                      </div>
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                    </TableCell>
                    <TableCell>
                      <span className={p.stock <= 5 ? "text-destructive font-semibold" : ""}>
                        {p.stock} un
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id, p.name)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>
              Preencha as informações do produto para venda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ração Premium 1kg" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque Atual</Label>
                <Input id="stock" type="number" step="1" required value={stock} onChange={e => setStock(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Produto">Produto Geral</SelectItem>
                  <SelectItem value="Medicamento">Medicamento</SelectItem>
                  <SelectItem value="Alimentação">Alimentação</SelectItem>
                  <SelectItem value="Acessório">Acessório</SelectItem>
                  <SelectItem value="Higiene">Higiene</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição (Opcional)</Label>
              <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do produto..." />
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
