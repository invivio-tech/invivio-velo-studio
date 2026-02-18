'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, orderBy, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { startOfDay } from 'date-fns';

import { useUserProfile, useFirestore, useDoc, useCollection, useMemoFirebase, type UserProfile } from '@/firebase';
import type { ServiceWithId } from '@/app/services/page';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Clock,
    Scissors,
    ArrowLeft,
    MoreHorizontal,
    Check,
    X,
    Trash2,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { runTransaction, updateDoc } from 'firebase/firestore';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Data types
interface Appointment {
    id: string;
    customerId: string;
    professionalId: string;
    serviceId: string;
    startTime: Timestamp;
    endTime: Timestamp;
    customerName: string;
    customerEmail: string;
    customerPhotoURL?: string;
    serviceName: string;
    serviceDuration: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

interface AppointmentWithDetails extends Appointment {
    client?: UserProfile;
    service?: ServiceWithId;
}

export default function ProfessionalAppointmentsPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const { userProfile: adminProfile, isLoading: isAdminLoading } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [queryStartDate] = useState(() => startOfDay(new Date()));
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    // Fetch Establishment Settings for points calculation
    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'establishmentSettings', 'main') : null, [firestore]);
    const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);

    // Redirect if not admin
    useEffect(() => {
        if (!isAdminLoading && (!adminProfile || adminProfile.role !== 'admin')) {
            router.push('/schedule');
        }
    }, [adminProfile, isAdminLoading, router]);

    // Fetch professional's profile
    const professionalRef = useMemoFirebase(() => (firestore && userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
    const { data: professional, isLoading: isProfessionalLoading } = useDoc<UserProfile>(professionalRef);

    // Fetch professional's upcoming appointments
    const appointmentsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(
            collection(firestore, 'appointments'),
            where('professionalId', '==', userId),
            where('startTime', '>=', queryStartDate),
            orderBy('startTime', 'asc')
        );
    }, [firestore, userId, queryStartDate]);
    const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<AppointmentWithDetails>(appointmentsQuery);

    // Memoize grouped appointments
    const groupedAppointments = useMemo(() => {
        if (!appointments) return [];

        const groups = appointments.reduce((acc, apt) => {
            const dateKey = format(apt.startTime.toDate(), 'yyyy-MM-dd');
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(apt);
            return acc;
        }, {} as Record<string, AppointmentWithDetails[]>);

        return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());

    }, [appointments]);



    const handleUpdateAppointmentStatus = async (
        appointment: AppointmentWithDetails,
        newStatus: 'completed' | 'no-show' | 'cancelled'
    ) => {
        if (!firestore || !settings) return;

        setIsUpdating(appointment.id);

        const appointmentRef = doc(firestore, 'appointments', appointment.id);
        const clientProfileRef = doc(firestore, 'users', appointment.customerId);

        try {
            if (newStatus === 'cancelled') {
                // Simple update for cancellation
                await updateDoc(appointmentRef, { status: 'cancelled' });
                toast({
                    title: 'Agendamento Cancelado',
                    description: 'O agendamento foi cancelado com sucesso.',
                });
            } else {
                // Transaction for completed/no-show to update points
                await runTransaction(firestore, async (transaction) => {
                    const clientDoc = await transaction.get(clientProfileRef);
                    if (!clientDoc.exists()) throw new Error("Perfil do cliente não encontrado.");

                    // Fetch service to get points configuration
                    const serviceRef = doc(firestore, 'services', appointment.serviceId);
                    const serviceDoc = await transaction.get(serviceRef);
                    const servicePrice = serviceDoc.exists() ? serviceDoc.data().price : 0;

                    const currentPoints = clientDoc.data().loyaltyPoints || 0;
                    let newPoints = currentPoints;

                    if (newStatus === 'completed') {
                        // Calculate points based on percentage of service price
                        const percentage = settings.loyaltyPercentage || 10; // Default to 10% if not set
                        const pointsToAward = Math.round((servicePrice * percentage) / 100);
                        newPoints += pointsToAward;
                    } else if (newStatus === 'no-show') {
                        newPoints = Math.max(0, currentPoints - (settings.pointsPenaltyForNoShow || 5));
                    }

                    transaction.update(appointmentRef, { status: newStatus });
                    transaction.update(clientProfileRef, { loyaltyPoints: newPoints });
                });

                toast({
                    title: 'Status Atualizado!',
                    description: `Marcado como ${newStatus === 'completed' ? 'concluído' : 'não comparecimento'}.`,
                });
            }

        } catch (e: any) {
            console.error(e);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `appointments/${appointment.id}`,
                operation: 'update',
            }));
            toast({
                title: 'Erro ao atualizar',
                description: 'Não foi possível atualizar o status. Verifique as permissões.',
                variant: 'destructive'
            });
        } finally {
            setIsUpdating(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500 hover:bg-green-600';
            case 'cancelled': return 'bg-red-500 hover:bg-red-600';
            case 'no-show': return 'bg-orange-500 hover:bg-orange-600';
            default: return 'bg-blue-500 hover:bg-blue-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Concluído';
            case 'cancelled': return 'Cancelado';
            case 'no-show': return 'Não Compareceu';
            default: return 'Agendado';
        }
    };

    const isLoading = isAdminLoading || isProfessionalLoading || areAppointmentsLoading || areSettingsLoading;

    if (isLoading) {
        return (
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-64" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!professional) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>Profissional não encontrado. <Link href="/team" className="underline">Voltar para a lista de equipe</Link>.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/team">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">
                        Agenda de {professional.name}
                    </h1>
                    <p className="text-muted-foreground">Próximos agendamentos para este profissional.</p>
                </div>
            </div>

            {groupedAppointments.length > 0 ? (
                <div className="space-y-8">
                    {groupedAppointments.map(([date, apts]) => (
                        <div key={date}>
                            <h2 className="text-xl font-headline font-semibold mb-4 capitalize">
                                {format(new Date(date.replace(/-/g, '/')), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </h2>
                            <div className="space-y-4">
                                {apts.map(apt => (
                                    <Card key={apt.id}>
                                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                                            <div className="grid sm:grid-cols-3 items-center gap-4 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-5 h-5 text-primary shrink-0" />
                                                    <span className="font-bold text-lg">{format(apt.startTime.toDate(), 'HH:mm')}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Scissors className="w-5 h-5 text-muted-foreground shrink-0" />
                                                    <div>
                                                        <p className="font-semibold">{apt.serviceName || 'Serviço não encontrado'}</p>
                                                        <p className="text-sm text-muted-foreground">{apt.serviceDuration}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-9 h-9">
                                                        <AvatarImage src={apt.customerPhotoURL || ''} alt={apt.customerName} />
                                                        <AvatarFallback>{apt.customerName?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold">{apt.customerName || 'Cliente não encontrado'}</p>
                                                        <p className="text-sm text-muted-foreground">{apt.customerEmail}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center mt-2 sm:mt-0">
                                                <Badge className={`${getStatusColor(apt.status)} text-white border-0`}>
                                                    {getStatusLabel(apt.status)}
                                                </Badge>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={isUpdating === apt.id}>
                                                            {isUpdating === apt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(apt, 'completed')}>
                                                            <Check className="mr-2 h-4 w-4 text-green-600" />
                                                            Concluir (Pontuar)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(apt, 'no-show')}>
                                                            <X className="mr-2 h-4 w-4 text-orange-600" />
                                                            Não Compareceu (Penalizar)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleUpdateAppointmentStatus(apt, 'cancelled')} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Cancelar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <CardHeader>
                        <CardTitle>Nenhum Agendamento Futuro</CardTitle>
                        <CardDescription>Este profissional não possui agendamentos marcados.</CardDescription>
                    </CardHeader>
                </Card>
            )}

        </div>
    );
}
