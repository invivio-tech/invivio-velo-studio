'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Shield, Zap, Heart, Globe, Award } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex-1 space-y-10 p-8 pt-6 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground">Sobre o Invivio Velo</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A plataforma definitiva para gestão de estabelecimentos, focada em simplicidade, velocidade e experiência do cliente.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm">
          <CardHeader>
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Veloz e Eficiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Desenvolvido com tecnologia de ponta para garantir carregamento instantâneo e uma experiência fluida em qualquer dispositivo.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm">
          <CardHeader>
            <Shield className="h-8 w-8 text-emerald-500 mb-2" />
            <CardTitle className="text-lg">Segurança de Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seus dados e de seus clientes residem em infraestrutura de nuvem certificada, com backups automáticos e camadas de proteção multicamadas.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/10 bg-card/50 shadow-none backdrop-blur-sm">
          <CardHeader>
            <Heart className="h-8 w-8 text-rose-500 mb-2" />
            <CardTitle className="text-lg">Focado no Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Interface intuitiva desenhada para que seu cliente agende em segundos, sem fricção ou cadastros complexos.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Nossa Missão</h2>
        <div className="prose prose-invert max-w-none text-muted-foreground">
          <p>
            O Invivio Velo nasceu da necessidade de modernizar a gestão de serviços presenciais. Acreditamos que o tempo é o recurso mais valioso, tanto para o dono do negócio quanto para o cliente final.
          </p>
          <p>
            Nossa missão é fornecer ferramentas inteligentes que permitam aos estabelecimentos focar no que fazem de melhor: prestar um serviço de excelência, enquanto nós cuidamos da agenda, das finanças e da fidelização.
          </p>
        </div>
      </div>

      <div className="pt-10 border-t border-border/10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-xs font-medium text-slate-400">
          <Award className="h-3 w-3" />
          Versão v1.00055 • © 2026 Invivio Tecnologia
        </div>
      </div>
    </div>
  );
}
