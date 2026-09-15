'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Syringe, FileText, FlaskConical, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useParams } from 'next/navigation';

export default function ClientSummaryPage() {
  const params = useParams();
  const userId = params?.id as string;
  const { planLimits, isLoading } = usePlanLimits();

  if (isLoading) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-headline font-bold">Resumo do Paciente</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {planLimits?.clinical?.healthRecords && (
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-blue-500" />
                Prontuário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Acesse evoluções clínicas e histórico de consultas.
              </p>
              <Button variant="secondary" className="w-full" asChild>
                <Link href={`/clients/${userId}/records`}>Acessar Prontuário</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {planLimits?.clinical?.vaccination && (
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Syringe className="h-5 w-5 text-emerald-500" />
                Vacinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Gerencie o esquema vacinal e imunizações.
              </p>
              <Button variant="secondary" className="w-full" asChild>
                <Link href={`/clients/${userId}/vaccines`}>Ver Caderneta</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {planLimits?.clinical?.prescriptions && (
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-amber-500" />
                Prescrições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Receitas médicas, encaminhamentos e protocolos.
              </p>
              <Button variant="secondary" className="w-full" asChild>
                <Link href={`/clients/${userId}/prescriptions`}>Nova Receita</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {planLimits?.clinical?.labResults && (
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConical className="h-5 w-5 text-purple-500" />
                Exames
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Pedidos de exames laboratoriais e laudos.
              </p>
              <Button variant="secondary" className="w-full" asChild>
                <Link href={`/clients/${userId}/exams`}>Ver Exames</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-slate-500" />
            Próximos Agendamentos
          </CardTitle>
          <CardDescription>Consulte os próximos eventos na agenda deste paciente.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Funcionalidade de próximos agendamentos em construção.
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
