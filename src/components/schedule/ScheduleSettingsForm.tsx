'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const breakSchema = z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (ex: 12:00)").or(z.literal("")),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (ex: 13:00)").or(z.literal("")),
});

const daySchema = z.object({
  isOpen: z.boolean(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (ex: 09:00)").or(z.literal("")),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (ex: 18:00)").or(z.literal("")),
  breaks: z.array(breakSchema).optional(),
});

export const scheduleSettingsSchema = z.object({
  workingHours: z.object({
    sunday: daySchema,
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
  }),
}).refine(data => {
    for (const day of Object.values(data.workingHours)) {
        if (day.isOpen) {
            if (!day.startTime || !day.endTime) return false;
            if (day.startTime >= day.endTime) return false;
            if (day.breaks) {
                for (const breakTime of day.breaks) {
                    if (!breakTime.startTime || !breakTime.endTime) return false;
                    if (breakTime.startTime >= breakTime.endTime) return false;
                    // Breaks must be within working hours
                    if (breakTime.startTime < day.startTime || breakTime.endTime > day.endTime) return false;
                }
            }
        }
    }
    return true;
}, {
    message: 'Horários inválidos. Verifique se o início é antes do fim e se as pausas estão dentro do horário de funcionamento.',
    path: ['workingHours']
});

export type ScheduleSettings = z.infer<typeof scheduleSettingsSchema>;

const daysOfWeek = [
  { key: 'sunday', label: 'Domingo' },
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
] as const;

interface ScheduleSettingsFormProps {
    settingsPath: string;
}

export default function ScheduleSettingsForm({ settingsPath }: ScheduleSettingsFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore && settingsPath ? doc(firestore, settingsPath) : null),
    [firestore, settingsPath]
  );
  const { data: settings, isLoading } = useDoc<ScheduleSettings>(settingsRef);
  
  const defaultValues: ScheduleSettings = {
    workingHours: {
      sunday: { isOpen: false, startTime: '09:00', endTime: '13:00', breaks: [] },
      monday: { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      tuesday: { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      wednesday: { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      thursday: { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      friday: { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      saturday: { isOpen: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
    }
  };

  const form = useForm<ScheduleSettings>({
    resolver: zodResolver(scheduleSettingsSchema),
    defaultValues: settings || defaultValues,
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    } else {
      form.reset(defaultValues);
    }
  }, [settings, form]);
  
  async function onSubmit(values: ScheduleSettings) {
    if (!settingsRef) return;
    setIsSaving(true);
    
    setDoc(settingsRef, values, { merge: true })
      .then(() => {
        toast({
          title: 'Horários salvos!',
          description: 'O horário de funcionamento foi atualizado com sucesso.',
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'update',
          requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar',
            description: 'Você não tem permissão para alterar as configurações.',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  if (isLoading) {
      return <div className="space-y-8">
        {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        ))}
        <div className="flex justify-end">
            <Skeleton className="h-10 w-24" />
        </div>
      </div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {daysOfWeek.map((dayInfo, index) => (
          <DayRow key={dayInfo.key} dayInfo={dayInfo} control={form.control} index={index}/>
        ))}
        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
            </Button>
        </div>
      </form>
    </Form>
  );
}


function DayRow({ dayInfo, control, index }: { dayInfo: typeof daysOfWeek[number], control: any, index: number }) {
    const { fields: breaksFields, append: breaksAppend, remove: breaksRemove } = useFieldArray({
        control,
        name: `workingHours.${dayInfo.key}.breaks`
    });

    return (
        <FormField
            control={control}
            name={`workingHours.${dayInfo.key}`}
            render={({ field }) => (
            <FormItem>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <FormLabel className="text-base font-medium">{dayInfo.label}</FormLabel>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label htmlFor={`${dayInfo.key}-switch`} className="text-sm font-medium text-muted-foreground">Fechado</label>
                        <Switch
                            id={`${dayInfo.key}-switch`}
                            checked={field.value.isOpen}
                            onCheckedChange={(checked) => field.onChange({ ...field.value, isOpen: checked })}
                        />
                        <label htmlFor={`${dayInfo.key}-switch`} className="text-sm font-medium">Aberto</label>
                    </div>
                    <FormControl>
                        <div className="flex items-center gap-2">
                            <Input
                                type="time"
                                className="w-32"
                                disabled={!field.value.isOpen}
                                value={field.value.startTime || ''}
                                onChange={(e) => field.onChange({ ...field.value, startTime: e.target.value })}
                            />
                            <span>-</span>
                            <Input
                                type="time"
                                className="w-32"
                                disabled={!field.value.isOpen}
                                value={field.value.endTime || ''}
                                onChange={(e) => field.onChange({ ...field.value, endTime: e.target.value })}
                            />
                        </div>
                    </FormControl>
                </div>
                </div>
                <FormMessage />

                {field.value.isOpen && (
                    <div className="pl-6 sm:pl-12 pt-4 space-y-4 border-l-2 ml-2 mt-4">
                         <h4 className="text-sm font-medium text-muted-foreground -ml-2">Pausas Recorrentes (ex: Almoço)</h4>
                         {breaksFields.map((item, breakIndex) => (
                             <div key={item.id} className="flex items-end gap-2">
                                <FormField
                                    control={control}
                                    name={`workingHours.${dayInfo.key}.breaks.${breakIndex}.startTime`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Início</FormLabel>
                                            <FormControl>
                                                <Input type="time" className="w-32" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={control}
                                    name={`workingHours.${dayInfo.key}.breaks.${breakIndex}.endTime`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Fim</FormLabel>
                                            <FormControl>
                                                <Input type="time" className="w-32" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => breaksRemove(breakIndex)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                             </div>
                         ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => breaksAppend({ startTime: '12:00', endTime: '13:00' })}
                            >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Pausa
                        </Button>
                    </div>
                )}
                {index < daysOfWeek.length -1 && <Separator className="!mt-6"/>}
            </FormItem>
            )}
        />
    )
}
