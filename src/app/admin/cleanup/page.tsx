
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useFirestore, useUserProfile } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CleanupPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { toast } = useToast();

    const [isCleaning, setIsCleaning] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (!isProfileLoading && userProfile?.role !== 'admin') {
            router.push('/');
        }
    }, [isProfileLoading, userProfile, router]);

    const clearCollection = async (collectionName: string) => {
        if (!firestore) return;

        setProgress(`Limpando coleção: ${collectionName}...`);
        const collectionRef = collection(firestore, collectionName);
        const snapshot = await getDocs(collectionRef);

        if (snapshot.empty) return;

        const batchSize = 500;
        let batch = writeBatch(firestore);
        let count = 0;

        for (const docSnapshot of snapshot.docs) {
            batch.delete(docSnapshot.ref);
            count++;

            if (count % batchSize === 0) {
                await batch.commit();
                batch = writeBatch(firestore);
            }
        }

        if (count % batchSize !== 0) {
            await batch.commit();
        }
    };

    const resetLoyaltyPoints = async () => {
        if (!firestore) return;

        setProgress('Resetando pontos de fidelidade...');
        const usersRef = collection(firestore, 'users');
        const snapshot = await getDocs(usersRef);

        const batchSize = 500;
        let batch = writeBatch(firestore);
        let count = 0;
        let updatedCount = 0;

        for (const docSnapshot of snapshot.docs) {
            const userData = docSnapshot.data();
            if (userData.loyaltyPoints && userData.loyaltyPoints > 0) {
                batch.update(docSnapshot.ref, { loyaltyPoints: 0 });
                count++;
                updatedCount++;
            } else {
                // Just to keep batch logic simple, we check count
                // but we only add to batch if update is needed
            }

            if (count > 0 && count % batchSize === 0) {
                await batch.commit();
                batch = writeBatch(firestore);
                count = 0; // Reset for next batch
            }
        }

        if (count > 0) {
            await batch.commit();
        }
        return updatedCount;
    };

    const handleCleanup = async () => {
        if (!firestore) return;

        if (!confirm('TEM CERTEZA? Isso apagará TODOS os agendamentos e resetará pontos. Essa ação não pode ser desfeita.')) {
            return;
        }

        setIsCleaning(true);
        setIsFinished(false);

        try {
            await clearCollection('appointments');
            await clearCollection('blockedTimes');
            await resetLoyaltyPoints(); // Use the existing function, just refined logic inside

            setIsFinished(true);
            setProgress('Limpeza concluída com sucesso!');
            toast({ title: 'Sucesso', description: 'Banco de dados limpo.' });
        } catch (error) {
            console.error(error);
            setProgress('Erro ao limpar banco de dados.');
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha na limpeza.' });
        } finally {
            setIsCleaning(false);
        }
    };

    if (isProfileLoading || userProfile?.role !== 'admin') {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                        Zona de Perigo
                    </CardTitle>
                    <CardDescription>
                        Limpeza do banco de dados para testes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Atenção</AlertTitle>
                        <AlertDescription>
                            Esta ação irá apagar permanentemente:
                            <ul className="list-disc list-inside mt-2">
                                <li>Todos os agendamentos</li>
                                <li>Todos os bloqueios de agenda</li>
                                <li>Todos os pontos de fidelidade</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    {progress && (
                        <div className="p-2 bg-muted rounded text-sm text-center font-mono">
                            {progress}
                        </div>
                    )}

                    {isFinished && (
                        <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                            <CheckCircle className="h-5 w-5" />
                            Concluído!
                        </div>
                    )}

                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleCleanup}
                        disabled={isCleaning}
                    >
                        {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isCleaning ? 'Limpando...' : 'Zerar Banco de Dados'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
