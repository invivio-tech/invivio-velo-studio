'use client';

import { useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gift, Award, TrendingDown, TrendingUp } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

interface LoyaltyTransaction {
    id: string;
    clientId: string;
    type: 'earned' | 'deducted' | 'redeemed';
    points: number;
    description: string;
    date: Timestamp;
}

export default function RewardsPage() {
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const router = useRouter();

    useEffect(() => {
        if (!isProfileLoading && !userProfile) {
            router.push('/login');
        }
    }, [isProfileLoading, userProfile, router]);

    const transactionsQuery = useMemoFirebase(
        () => {
            if (!firestore || !userProfile?.id) return null;
            return query(
                collection(firestore, 'loyaltyTransactions'),
                where('clientId', '==', userProfile.id)
            );
        },
        [firestore, userProfile]
    );
    const { data: transactions, isLoading: areTransactionsLoading } = useCollection<LoyaltyTransaction>(transactionsQuery);

    const sortedTransactions = useMemo(() => {
        if (!transactions) return [];
        return [...transactions].sort((a, b) => b.date.seconds - a.date.seconds);
    }, [transactions]);

    if (isProfileLoading || areTransactionsLoading || !userProfile) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-96 w-full mt-4" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4 mb-6">
                <Gift className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-headline font-bold tracking-tight">Meus Pontos</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-primary text-primary-foreground border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                        <Award className="h-4 w-4 opacity-75" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black">{Math.floor(userProfile.loyaltyPoints || 0)}</div>
                        <p className="text-xs opacity-75 mt-1">Pontos de fidelidade acumulados</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Extrato de Fidelidade</CardTitle>
                    <CardDescription>Acompanhe todos os pontos que você ganhou ou resgatou.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Pontos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nenhuma movimentação de pontos ainda.</TableCell>
                                </TableRow>
                            ) : (
                                sortedTransactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="font-medium">{format(tx.date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className="text-right">
                                            {tx.type === 'earned' ? (
                                                <span className="text-emerald-500 font-semibold inline-flex items-center">
                                                    <TrendingUp className="w-4 h-4 mr-1" /> +{tx.points}
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-semibold inline-flex items-center">
                                                    <TrendingDown className="w-4 h-4 mr-1" /> -{tx.points}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
