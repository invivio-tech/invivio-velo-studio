'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, ArrowRight, CheckCircle2, Building2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings, isLoading } = useDoc<EstablishmentSettings>(settingsRef);

  const [formData, setFormData] = useState({
    name: '',
    businessCategory: 'general_practice',
    businessTone: 'friendly',
  });

  // Init form
  useEffect(() => {
    if (settings && !formData.name) {
      if (settings.onboardingCompleted) {
        router.push('/dashboard');
        return;
      }
      setFormData({
        name: settings.name || '',
        businessCategory: settings.businessCategory || 'general_practice',
        businessTone: settings.businessTone || 'friendly',
      });
    }
  }, [settings, router, formData.name]);

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error('Preencha o nome', { description: 'O nome da clínica é obrigatório.' });
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleFinish = async () => {
    if (!settingsRef) return;
    setIsSubmitting(true);
    try {
      await updateDoc(settingsRef, {
        name: formData.name,
        businessCategory: formData.businessCategory,
        businessTone: formData.businessTone,
        onboardingCompleted: true,
      });
      toast.success('Configuração Concluída!', { description: 'Bem-vindo ao seu novo painel.' });
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      toast.error('Erro', { description: 'Não foi possível salvar as configurações.' });
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo ao seu sistema!</h1>
          <p className="text-slate-500 mt-2 text-lg">Vamos configurar o básico para começarmos.</p>
        </div>

        <Card className="border-none shadow-xl shadow-primary/5 rounded-3xl overflow-hidden relative">
          <div className="h-1.5 w-full bg-slate-100 absolute top-0 left-0">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>

          <CardHeader className="pt-10 pb-6 px-10 text-center">
            <CardTitle className="text-xl">{step === 1 ? 'Dados da Clínica' : 'Personalidade'}</CardTitle>
            <CardDescription>
              {step === 1 ? 'Confirme o nome e o segmento do seu negócio.' : 'Como você deseja que o sistema (e a IA) se comunique com seus clientes?'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-10 pb-10">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Nome da Clínica</Label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-12 rounded-xl text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Especialidade / Categoria</Label>
                    <Select 
                      value={formData.businessCategory} 
                      onValueChange={(val) => setFormData({ ...formData, businessCategory: val })}
                    >
                      <SelectTrigger className="h-12 rounded-xl text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general_practice">Clínica Geral</SelectItem>
                        <SelectItem value="dentistry">Odontologia</SelectItem>
                        <SelectItem value="dermatology">Dermatologia</SelectItem>
                        <SelectItem value="physiotherapy">Fisioterapia</SelectItem>
                        <SelectItem value="psychology">Psicologia</SelectItem>
                        <SelectItem value="nutrition">Nutrição</SelectItem>
                        <SelectItem value="pediatrics">Pediatria</SelectItem>
                        <SelectItem value="veterinary">Veterinária (Geral)</SelectItem>
                        <SelectItem value="other_health">Outro segmento de saúde</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      onClick={() => setFormData({ ...formData, businessTone: 'formal' })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.businessTone === 'formal' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <Building2 className={`w-8 h-8 mb-3 ${formData.businessTone === 'formal' ? 'text-primary' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">Formal</h3>
                      <p className="text-xs text-slate-500">Comunicação séria, focada na precisão médica.</p>
                    </div>
                    
                    <div 
                      onClick={() => setFormData({ ...formData, businessTone: 'friendly' })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.businessTone === 'friendly' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <Store className={`w-8 h-8 mb-3 ${formData.businessTone === 'friendly' ? 'text-primary' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">Amigável</h3>
                      <p className="text-xs text-slate-500">Comunicação leve, acolhedora e próxima.</p>
                    </div>

                    <div 
                      onClick={() => setFormData({ ...formData, businessTone: 'luxury' })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.businessTone === 'luxury' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <Sparkles className={`w-8 h-8 mb-3 ${formData.businessTone === 'luxury' ? 'text-primary' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">Premium</h3>
                      <p className="text-xs text-slate-500">Exclusivo e sofisticado, focado em estética.</p>
                    </div>
                    
                    <div 
                      onClick={() => setFormData({ ...formData, businessTone: 'casual' })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.businessTone === 'casual' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <CheckCircle2 className={`w-8 h-8 mb-3 ${formData.businessTone === 'casual' ? 'text-primary' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">Casual</h3>
                      <p className="text-xs text-slate-500">Descontraído, direto ao ponto, com emojis.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 flex gap-4">
              {step > 1 && (
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(step - 1)}>
                  Voltar
                </Button>
              )}
              {step < 2 ? (
                <Button className="flex-[2] h-12 rounded-xl bg-primary text-white hover:bg-primary/90" onClick={handleNext}>
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button className="flex-[2] h-12 rounded-xl bg-primary text-white hover:bg-primary/90" onClick={handleFinish} disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Finalizar e Acessar'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
