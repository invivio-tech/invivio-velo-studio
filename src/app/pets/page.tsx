'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useUserProfile, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Search, Plus, RefreshCw, AlertCircle, Heart, Trash2, Edit2, User } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  gender?: 'male' | 'female' | 'unknown';
  birthDate?: string;
  tutorId: string;
  tutorName: string;
  castrated?: boolean;
  allergies?: string;
  weight?: number;
  photoURL?: string;
}

export default function PetsPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [petForm, setPetForm] = useState({
    name: '',
    species: 'dog',
    breed: '',
    gender: 'unknown' as any,
    birthDate: '',
    tutorId: '',
    tutorName: '',
    castrated: false,
    allergies: '',
    weight: 0,
    photoURL: ''
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isAdminOrPro = userProfile?.role === 'admin' || userProfile?.role === 'professional';

  // Fetch Pets
  const petsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    
    if (isAdminOrPro) {
      // Admin/Pro view all pets
      return query(collection(firestore, 'pets'), orderBy('name', 'asc'));
    } else {
      // Tutor view their own pets
      return query(collection(firestore, 'pets'), where('tutorId', '==', userProfile.id), orderBy('name', 'asc'));
    }
  }, [firestore, userProfile, isAdminOrPro]);

  const { data: pets, isLoading: isPetsLoading, error, refetch } = useCollection<Pet>(petsQuery);

  // Fetch all clients to allow tutor selection (for admin/pro)
  const tutorsQuery = useMemoFirebase(() => {
    if (!firestore || !isAdminOrPro) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'client'), orderBy('name', 'asc'));
  }, [firestore, isAdminOrPro]);

  const { data: tutors } = useCollection<any>(tutorsQuery);

  useEffect(() => {
    if (userProfile && !isAdminOrPro) {
      setPetForm(prev => ({
        ...prev,
        tutorId: userProfile.id,
        tutorName: userProfile.name || ''
      }));
    }
  }, [userProfile, isAdminOrPro]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (refetch) await refetch();
    setIsRefreshing(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !petForm.name) return;
    
    setIsSubmitting(true);
    try {
      let selectedTutor = null;
      if (isAdminOrPro && petForm.tutorId) {
        selectedTutor = tutors?.find(t => t.id === petForm.tutorId);
      }

      const payload = {
        ...petForm,
        tutorId: isAdminOrPro ? (petForm.tutorId || 'manual') : (userProfile?.id || ''),
        tutorName: isAdminOrPro ? (selectedTutor?.name || petForm.tutorName || 'Sem Tutor') : (userProfile?.name || 'Sem Tutor'),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(firestore, 'pets'), payload);
      toast({ title: 'Sucesso', description: `${petForm.name} foi cadastrado.` });
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível cadastrar o pet.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (pet: Pet) => {
    setEditingPet(pet);
    setPetForm({
      name: pet.name || '',
      species: pet.species || 'dog',
      breed: pet.breed || '',
      gender: pet.gender || 'unknown',
      birthDate: pet.birthDate || '',
      tutorId: pet.tutorId || '',
      tutorName: pet.tutorName || '',
      castrated: pet.castrated || false,
      allergies: pet.allergies || '',
      weight: pet.weight || 0,
      photoURL: pet.photoURL || ''
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingPet) return;

    setIsSubmitting(true);
    try {
      let selectedTutor = null;
      if (isAdminOrPro && petForm.tutorId) {
        selectedTutor = tutors?.find(t => t.id === petForm.tutorId);
      }

      const payload = {
        ...petForm,
        tutorId: isAdminOrPro ? (petForm.tutorId || 'manual') : (userProfile?.id || ''),
        tutorName: isAdminOrPro ? (selectedTutor?.name || petForm.tutorName || 'Sem Tutor') : (userProfile?.name || 'Sem Tutor'),
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(firestore, 'pets', editingPet.id), payload);
      toast({ title: 'Sucesso', description: 'Dados do pet atualizados com sucesso.' });
      setIsEditOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar dados.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (pet: Pet) => {
    if (!firestore || !window.confirm(`Deseja realmente remover o pet ${pet.name}?`)) return;

    try {
      await deleteDoc(doc(firestore, 'pets', pet.id));
      toast({ title: 'Removido', description: `O pet ${pet.name} foi removido com sucesso.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível deletar o pet.' });
    }
  };

  const resetForm = () => {
    setPetForm({
      name: '',
      species: 'dog',
      breed: '',
      gender: 'unknown',
      birthDate: '',
      tutorId: isAdminOrPro ? '' : (userProfile?.id || ''),
      tutorName: isAdminOrPro ? '' : (userProfile?.name || ''),
      castrated: false,
      allergies: '',
      weight: 0,
      photoURL: ''
    });
    setEditingPet(null);
  };

  const filteredPets = useMemo(() => {
    if (!pets) return [];
    return pets.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [pets, searchTerm]);

  const isLoading = isUserLoading || isProfileLoading || isPetsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-background min-h-screen">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">
              {isAdminOrPro ? 'Pacientes (Pets)' : 'Meus Pets'}
            </h1>
            <p className="text-muted-foreground">
              {isAdminOrPro ? 'Gerencie todos os pets cadastrados na clínica veterinária.' : 'Cadastre e acompanhe a saúde dos seus pets.'}
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="gap-2 rounded-full">
          <Plus className="h-4 w-4" />
          Cadastrar Pet
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por pet, tutor ou raça..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? (
        <div className="p-6 border border-destructive/50 bg-destructive/10 rounded-2xl text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-semibold">Erro ao carregar pets</p>
            <p className="opacity-80">{(error as any).message || 'Ocorreu um erro inesperado.'}</p>
          </div>
        </div>
      ) : filteredPets.length > 0 ? (
        <Card className="border border-border/10 bg-card/50 shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet</TableHead>
                  <TableHead>Espécie / Raça</TableHead>
                  <TableHead>Sexo</TableHead>
                  {isAdminOrPro && <TableHead>Tutor (Responsável)</TableHead>}
                  <TableHead>Castrado?</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPets.map((pet) => (
                  <TableRow key={pet.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold flex items-center gap-2">
                      <Heart className="h-4 w-4 text-primary fill-primary/10" />
                      {pet.name}
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {pet.species === 'dog' ? 'Cão' : pet.species === 'cat' ? 'Gato' : pet.species}
                      <span className="text-muted-foreground block text-[10px]">{pet.breed || 'SRD'}</span>
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {pet.gender === 'male' ? 'Macho' : pet.gender === 'female' ? 'Fêmea' : 'Não informado'}
                    </TableCell>
                    {isAdminOrPro && (
                      <TableCell className="text-xs">
                        {pet.tutorName}
                        <span className="text-[10px] text-muted-foreground block">ID: {pet.tutorId}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={pet.castrated ? "border-emerald-200 text-emerald-800 bg-emerald-50" : "border-slate-200 text-slate-500 bg-slate-50"}>
                        {pet.castrated ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{pet.weight ? `${pet.weight} kg` : '--'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditClick(pet)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(pet)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-20 bg-card/20 rounded-3xl border border-dashed flex flex-col items-center gap-3">
          <Heart className="h-12 w-12 text-muted-foreground opacity-30 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-700">Nenhum pet cadastrado</h3>
          <p className="text-slate-400 text-sm max-w-sm">
            Comece cadastrando um pet para acompanhar o histórico clínico e atendimentos veterinários.
          </p>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => { if(!open) { setIsAddOpen(false); setIsEditOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{isAddOpen ? 'Cadastrar Novo Pet' : 'Editar Dados do Pet'}</DialogTitle>
            <DialogDescription>Preencha os campos abaixo para cadastrar o prontuário básico do pet.</DialogDescription>
          </DialogHeader>
          <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petName">Nome do Pet</Label>
                <Input 
                  id="petName" 
                  value={petForm.name} 
                  onChange={e => setPetForm({...petForm, name: e.target.value})} 
                  placeholder="Ex: Rex, Mel"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="species">Espécie</Label>
                <select 
                  id="species" 
                  value={petForm.species}
                  onChange={e => setPetForm({...petForm, species: e.target.value})} 
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="dog">Cão</option>
                  <option value="cat">Gato</option>
                  <option value="bird">Ave</option>
                  <option value="rabbit">Coelho</option>
                  <option value="reptile">Réptil</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Input 
                  id="breed" 
                  value={petForm.breed} 
                  onChange={e => setPetForm({...petForm, breed: e.target.value})} 
                  placeholder="Ex: Poodle, Golden"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Sexo</Label>
                <select 
                  id="gender" 
                  value={petForm.gender}
                  onChange={e => setPetForm({...petForm, gender: e.target.value as any})} 
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="unknown">Não Informado</option>
                  <option value="male">Macho</option>
                  <option value="female">Fêmea</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data Nasc. (Aproximada)</Label>
                <Input 
                  id="birthDate" 
                  type="date" 
                  value={petForm.birthDate} 
                  onChange={e => setPetForm({...petForm, birthDate: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input 
                  id="weight" 
                  type="number" 
                  step="0.1" 
                  value={petForm.weight || ''} 
                  onChange={e => setPetForm({...petForm, weight: parseFloat(e.target.value) || 0})} 
                  placeholder="Ex: 8.5"
                />
              </div>
            </div>

            {isAdminOrPro ? (
              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="tutor">Selecione o Tutor (Responsável)</Label>
                <select 
                  id="tutor" 
                  value={petForm.tutorId}
                  onChange={e => setPetForm({...petForm, tutorId: e.target.value})} 
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Selecione um tutor...</option>
                  {tutors?.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.phoneNumber || t.email})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2 border-t pt-3 text-xs text-muted-foreground flex items-center gap-1.5 bg-slate-50 p-3 rounded-lg">
                <User className="h-3.5 w-3.5" />
                <span>O pet será automaticamente vinculado ao seu perfil ({userProfile?.name}).</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="castrated" 
                  checked={petForm.castrated}
                  onChange={e => setPetForm({...petForm, castrated: e.target.checked})}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <Label htmlFor="castrated" className="text-sm font-bold text-slate-800 cursor-pointer">
                  Este animal é castrado / esterilizado
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias conhecidas / Notas médicas</Label>
              <Textarea 
                id="allergies" 
                value={petForm.allergies} 
                onChange={e => setPetForm({...petForm, allergies: e.target.value})} 
                placeholder="Ex: Alergia a picada de pulga, intolerância alimentar..."
                className="h-16 resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Pet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
