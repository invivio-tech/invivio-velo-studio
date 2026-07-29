'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/firebase';
import type { MembershipPlanWithId } from './MembershipPlanForm';

export interface UserMembership {
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  usageThisMonth: number;
}

export type UserMembershipWithId = UserMembership & { id: string; user?: UserProfile; plan?: MembershipPlanWithId };

const formSchema = z.object({
  userId: z.string().min(1, { message: 'Selecione um cliente.' }),
  planId: z.string().min(1, { message: 'Selecione um plano.' }),
  status: z.enum(['active', 'canceled', 'expired']),
  validityMonths: z.coerce.number().min(1).max(120),
  usageThisMonth: z.coerce.number().min(0),
});

type SubscriberFormProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  membership?: UserMembershipWithId | null;
  onSave: (data: UserMembership | (UserMembership & { id: string })) => Promise<void>;
};

export default function SubscriberForm({ isOpen, setIsOpen, membership, onSave }: SubscriberFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  // Load active clients
  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollection);

  // Load active plans
  const plansCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'membershipPlans'), where('isActive', '==', true)) : null),
    [firestore]
  );
  const { data: plans, isLoading: arePlansLoading } = useCollection<MembershipPlanWithId>(plansCollection);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      planId: '',
      status: 'active',
      validityMonths: 1,
      usageThisMonth: 0,
    },
  });

  const selectedPlanId = form.watch('planId');
  const selectedPlan = React.useMemo(() => plans?.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);
  const maxUses = selectedPlan ? selectedPlan.maxUsesPerMonth : null;

  React.useEffect(() => {
    if (isOpen) {
      if (membership) {
        // Edit mode
        form.reset({
          userId: membership.userId,
          planId: membership.planId,
          status: membership.status,
          validityMonths: 1, // Only used to extend/set new validity, but maybe we shouldn't ask this on edit?
          usageThisMonth: membership.usageThisMonth || 0,
        });
      } else {
        // Create mode
        form.reset({
          userId: '',
          planId: '',
          status: 'active',
          validityMonths: 1,
          usageThisMonth: 0,
        });
      }
    }
  }, [membership, isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      const now = new Date();
      
      let dataToSave: any = {
        userId: values.userId,
        planId: values.planId,
        status: values.status,
        usageThisMonth: values.usageThisMonth,
      };

      if (!membership) {
        // New membership: set start and end dates
        dataToSave.currentPeriodStart = now;
        dataToSave.currentPeriodEnd = addMonths(now, values.validityMonths);
      } else {
        // Updating existing
        dataToSave.id = membership.id;
        // Keep existing dates, unless we want to extend them. For simplicity in manual mode, let's just keep them or update if needed.
        // If status changed to active from expired, we might want to reset the date. We'll leave dates alone for now when editing.
        dataToSave.currentPeriodStart = membership.currentPeriodStart;
        dataToSave.currentPeriodEnd = membership.currentPeriodEnd;
      }

      await onSave(dataToSave);
      setIsOpen(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: e.message || 'Ocorreu um erro.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{membership ? 'Editar Assinatura' : 'Nova Assinatura Manual'}</DialogTitle>
          <DialogDescription>
            {membership 
              ? 'Edite o status ou os usos mensais deste cliente.' 
              : 'Vincule manualmente um plano de assinatura a um cliente existente.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => {
                const selectedUser = users?.find(u => u.id === field.value);
                
                return (
                <FormItem className="flex flex-col">
                  <FormLabel>Cliente</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : "Buscar por nome ou email..."}
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setClientDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setClientDropdownOpen(true);
                        // Optional: we don't clear the field.value, just let them search
                      }}
                      onBlur={() => {
                        // Delay hide to allow clicks on items
                        setTimeout(() => {
                           setClientDropdownOpen(false);
                           setClientSearch(''); // Reset search input on blur so it falls back to showing the selected user
                        }, 200);
                      }}
                      disabled={!!membership || areUsersLoading}
                      className={cn(
                        "pr-8", 
                        selectedUser && !clientSearch ? "placeholder:text-foreground placeholder:font-medium" : ""
                      )}
                    />
                    {field.value && !clientSearch && (
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <Check className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                    
                    {clientDropdownOpen && !membership && (
                      <div className="absolute top-full left-0 z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                        {users
                          ?.filter(u => u.role !== 'admin' && u.role !== 'professional')
                          .filter(u => !clientSearch || 
                                       u.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                       u.email.toLowerCase().includes(clientSearch.toLowerCase()))
                          .map((user) => (
                          <div 
                            key={user.id} 
                            className="px-4 py-3 hover:bg-muted cursor-pointer text-sm flex items-center justify-between border-b last:border-b-0"
                            onMouseDown={(e) => { 
                               e.preventDefault(); 
                               form.setValue("userId", user.id, { shouldValidate: true }); 
                               setClientSearch(''); // clear search after selection to show the absolute text
                               setClientDropdownOpen(false); 
                            }}
                          >
                            <span>{user.name} <span className="text-muted-foreground ml-1">({user.email})</span></span>
                            {field.value === user.id && <Check className="h-4 w-4 text-emerald-500" />}
                          </div>
                        ))}
                        
                        {users?.filter(u => u.role !== 'admin' && u.role !== 'professional')
                          .filter(u => !clientSearch || 
                                       u.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                       u.email.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Nenhum cliente encontrado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}}
            />

            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano de Assinatura</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={arePlansLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - R${plan.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                        <SelectItem value="expired">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usageThisMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usos este Mês</FormLabel>
                    <FormControl>
                      <div className="flex relative">
                        <input
                          type="number"
                          className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={true}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    {maxUses !== null && (
                      <p className="text-[0.8rem] text-muted-foreground mt-1">
                        Limite do plano: <strong className="font-medium text-foreground">{maxUses === 999 ? 'Ilimitado' : maxUses}</strong>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!membership && (
              <FormField
                control={form.control}
                name="validityMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade Inicial (Meses)</FormLabel>
                    <FormControl>
                       <input
                          type="number"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Assinatura
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
