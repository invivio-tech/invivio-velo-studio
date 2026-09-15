'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardDescription,
  CardTitle,
  CardHeader,
} from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { collection, doc, query, where, limit, orderBy } from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import type { Service } from '@/app/services/page';
import { Skeleton } from '@/components/ui/skeleton';
import type { EstablishmentSettings } from '@/app/establishment/page';
import { 
  Instagram, 
  Heart, 
  User as UserIcon, 
  ArrowRight, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  Shield, 
  Stethoscope 
} from 'lucide-react';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find((p) => p.id === 'landing-hero');
  const aboutImage = PlaceHolderImages.find((p) => p.id === 'landing-about');

  const firestore = useFirestore();

  // Fetch Featured Services
  const servicesCollectionRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'services'), where('featured', '==', true), orderBy('name', 'asc'), limit(6)) : null),
    [firestore]
  );
  const { data: services, isLoading: areServicesLoading } = useCollection<Service>(
    servicesCollectionRef
  );

  // Fetch Establishment Settings
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings, isLoading: areSettingsLoading } = useDoc<EstablishmentSettings>(settingsRef);

  // Fetch Clinical Staff (Professionals)
  const professionalsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users'), where('role', '==', 'professional'), limit(6)) : null),
    [firestore]
  );
  const { data: professionals, isLoading: areProfessionalsLoading } = useCollection<any>(professionalsQuery);

  const isLoading = areServicesLoading || areSettingsLoading || areProfessionalsLoading;

  const defaultSettings: EstablishmentSettings = {
    name: 'Invivio Care',
    about: 'Nossa clínica nasceu com o compromisso de oferecer um atendimento humanizado, seguro e de alta qualidade. Contamos com uma equipe multidisciplinar de especialistas dedicados a promover a sua saúde e bem-estar integral. Combinamos tecnologia de ponta com acolhimento e escuta ativa para diagnosticar e tratar nossos pacientes com a atenção que cada vida merece. Venha nos visitar e descubra um novo conceito de cuidado para você e sua família.',
    heroTitle: 'Sua Saúde e Bem-Estar em Boas Mãos.',
    heroSubtitle: 'Atendimento humanizado, equipe multidisciplinar e tecnologia médica ao seu alcance para um cuidado completo e preventivo.',
    servicesTitle: 'Nossas Especialidades e Serviços',
    servicesSubtitle: 'Oferecemos soluções completas em saúde preventiva, consultas e tratamentos.',
    storeSubtitle: '',
    address: 'Av. da Saúde, 456 - Centro Clínico, Bloco B',
    whatsapp: '5511999998888',
    instagram: 'invivio.care',
    businessCategory: 'general_practice',
    businessTone: 'professional',
  };

  const establishmentName = settings?.name || defaultSettings.name;
  const establishmentAbout = settings?.about || defaultSettings.about;
  const establishmentHeroTitle = settings?.heroTitle || defaultSettings.heroTitle;
  const establishmentHeroSubtitle = settings?.heroSubtitle || defaultSettings.heroSubtitle;
  const establishmentServicesTitle = settings?.servicesTitle || defaultSettings.servicesTitle;
  const establishmentServicesSubtitle = settings?.servicesSubtitle || defaultSettings.servicesSubtitle;
  const establishmentAddress = settings?.address || defaultSettings.address;
  const establishmentWhatsapp = settings?.whatsapp || defaultSettings.whatsapp;
  const establishmentInstagram = settings?.instagram || defaultSettings.instagram;
  const establishmentLogo = settings?.logoUrl;
  const establishmentAboutImageUrl = settings?.aboutImageUrl;
  const establishmentCategory = settings?.businessCategory || defaultSettings.businessCategory;

  const getClinicBadgeText = (category: string) => {
    switch (category) {
      case 'psychology': return 'Clínica de Psicologia';
      case 'dentistry': return 'Clínica Odontológica';
      case 'veterinary': return 'Clínica Veterinária';
      case 'physiotherapy': return 'Fisioterapia e Reabilitação';
      case 'nutrition': return 'Nutrição Integrada';
      default: return 'Centro de Saúde & Bem-Estar';
    }
  };

  // List of major health insurance plans
  const healthInsurances = [
    { name: 'Unimed', logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
    { name: 'Bradesco Saúde', logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
    { name: 'SulAmérica', logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
    { name: 'Amil', logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
    { name: 'Porto Seguro', logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 md:h-24 items-center justify-between">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {establishmentLogo ? (
              <img src={establishmentLogo} alt={establishmentName} className="h-14 md:h-20 max-w-[240px] object-contain" />
            ) : (
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Heart className="h-8 md:h-10 w-8 md:w-10 fill-primary/20" />
              </div>
            )}
            {isLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <div className="flex flex-col">
                <span className="font-bold text-lg md:text-xl font-headline tracking-tight leading-none text-slate-800">
                  {establishmentName}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
                  {getClinicBadgeText(establishmentCategory)}
                </span>
              </div>
            )}
          </Link>
          <nav className="items-center space-x-6 text-sm font-medium hidden md:flex">
            <a href="#services" className="text-foreground/60 transition-colors hover:text-foreground/80">Serviços</a>
            <a href="#staff" className="text-foreground/60 transition-colors hover:text-foreground/80">Corpo Clínico</a>
            <a href="#insurances" className="text-foreground/60 transition-colors hover:text-foreground/80">Convênios</a>
            <a href="#about" className="text-foreground/60 transition-colors hover:text-foreground/80">Sobre nós</a>
            <a
              href={establishmentWhatsapp ? `https://wa.me/${establishmentWhatsapp.replace(/\D/g, '')}` : '#contact'}
              target={establishmentWhatsapp ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Contato
            </a>
          </nav>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Área Restrita</Link>
            </Button>
            <Button asChild className="rounded-full shadow-md">
              <Link href="/book-appointment">Agendar Consulta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[75vh] w-full flex items-center overflow-hidden">
          {heroImage ? (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover opacity-35"
              data-ai-hint={heroImage.imageHint}
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-slate-100" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/25 to-transparent" />
          <div className="relative z-10 container text-left max-w-4xl px-4 md:px-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4 lg:h-16" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <>
                <Badge className="bg-primary/20 hover:bg-primary/30 text-primary border-none mb-4 text-xs tracking-wider uppercase font-semibold">
                  🩺 Atendimento Confiável & Humanizado
                </Badge>
                <h1 className="text-4xl font-extrabold tracking-tight font-headline lg:text-6xl text-slate-900 leading-tight max-w-3xl">
                  {establishmentHeroTitle}
                </h1>
                <p className="mt-4 max-w-xl text-lg text-slate-600 font-medium">
                  {establishmentHeroSubtitle}
                </p>
              </>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" className="rounded-full shadow-lg h-12 px-8 font-bold" asChild>
                <Link href="/book-appointment">Agendar Minha Consulta</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-12 px-8 font-bold" asChild>
                <a href={establishmentWhatsapp ? `https://wa.me/${establishmentWhatsapp.replace(/\D/g, '')}` : '#contact'} target="_blank" rel="noreferrer">
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="container py-20 border-t bg-slate-50/50">
          <div className="text-center mb-16 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-headline font-extrabold text-slate-800 tracking-tight">
              {establishmentServicesTitle}
            </h2>
            <p className="text-slate-500 font-medium">
              {establishmentServicesSubtitle}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {areServicesLoading &&
              [...Array(3)].map((_, i) => (
                <Card key={i} className="rounded-2xl border bg-card">
                  <CardHeader className="p-0">
                    <Skeleton className="aspect-[16/9] w-full" />
                  </CardHeader>
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </Card>
              ))}
            {services?.map((service) => (
              <Card
                key={service.id}
                className="flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 border bg-background hover:-translate-y-1 rounded-2xl"
              >
                <CardHeader className="p-0">
                  {service.imageUrl ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] w-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Stethoscope className="w-12 h-12" />
                    </div>
                  )}
                </CardHeader>
                <div className="flex flex-col flex-grow p-6 space-y-2">
                  <CardTitle className="font-headline text-xl text-slate-800 font-bold">
                    {service.name}
                  </CardTitle>
                  <CardDescription className="flex-grow text-slate-500 leading-relaxed text-sm">
                    {service.description}
                  </CardDescription>
                </div>
                <CardFooter className="flex justify-between items-center bg-slate-50/50 p-6 pt-4 border-t border-slate-100">
                  <span className="text-lg font-bold font-headline text-primary">
                    {`R$ ${(service.price ?? 0).toFixed(2).replace('.', ',')}`}
                  </span>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-full">{service.duration || 'Consultar'} min</Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* Corpo Clínico Section */}
        <section id="staff" className="container py-20 border-t">
          <div className="text-center mb-16 max-w-2xl mx-auto space-y-4">
            <Badge className="bg-primary/10 text-primary border-none rounded-full px-3 py-1 font-semibold text-xs">
              🩺 Especialistas Qualificados
            </Badge>
            <h2 className="text-3xl font-headline font-extrabold text-slate-800 tracking-tight">
              Nosso Corpo Clínico
            </h2>
            <p className="text-slate-500 font-medium">
              Conheça os profissionais altamente qualificados que cuidam de você todos os dias.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {areProfessionalsLoading &&
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center p-6 space-y-4 border rounded-2xl">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            {!areProfessionalsLoading && professionals?.map((pro: any) => (
              <Card key={pro.id} className="flex flex-col items-center text-center p-6 rounded-2xl hover:shadow-lg transition-all border bg-background group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 mb-4 group-hover:scale-105 transition-transform duration-300">
                  {pro.photoURL ? (
                    <img src={pro.photoURL} alt={pro.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <UserIcon className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <h3 className="font-headline font-bold text-lg text-slate-800">{pro.name}</h3>
                <span className="text-xs font-bold text-primary uppercase tracking-wide mt-1">
                  {pro.specialty || (establishmentCategory === 'veterinary' ? 'Médico Veterinário' : 'Especialista')}
                </span>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                  {pro.bio || 'Profissional dedicado ao acolhimento clínico e melhor tratamento dos pacientes.'}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
                  <span>REGISTRO: {pro.licenseNumber || 'Disponível na recepção'}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Convênios Section */}
        <section id="insurances" className="container py-20 border-t bg-slate-50/50">
          <div className="text-center mb-12 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-headline font-extrabold text-slate-800 tracking-tight">
              Convênios Aceitos
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              Facilitamos o seu acesso à saúde. Atendemos a diversos planos e convênios médicos.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 max-w-4xl mx-auto">
            {healthInsurances.map((ins, idx) => (
              <div key={idx} className="flex flex-col items-center bg-background border rounded-xl p-4 shadow-sm min-w-[140px] hover:shadow-md transition-all">
                <span className="font-bold text-sm text-slate-700">{ins.name}</span>
                <span className="text-[10px] text-emerald-600 font-bold mt-1">Atendimento Direto</span>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="bg-background border-t">
          <div className="container py-20 grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-full px-3 py-1 font-semibold text-xs">
                🏥 Conheça Nossa História
              </Badge>
              <h2 className="text-3xl font-headline font-extrabold text-slate-800 leading-tight">
                {`Sobre a ${establishmentName}`}
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">
                {establishmentAbout}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Privacidade Total</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Seus prontuários são encriptados localmente de acordo com a LGPD.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Acolhimento</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Empatia e cuidado em cada etapa do seu atendimento.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative aspect-square w-full max-w-md mx-auto">
              {establishmentAboutImageUrl ? (
                <img
                  src={establishmentAboutImageUrl}
                  alt="Sobre o estabelecimento"
                  className="object-cover w-full h-full rounded-3xl shadow-xl border"
                />
              ) : aboutImage ? (
                <Image
                  src={aboutImage.imageUrl}
                  alt={aboutImage.description}
                  fill
                  className="object-cover rounded-3xl shadow-xl border"
                  data-ai-hint={aboutImage.imageHint}
                />
              ) : (
                <div className="w-full h-full bg-slate-100 rounded-3xl border flex items-center justify-center text-slate-300">
                  <Heart className="w-20 h-20" />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-slate-900 text-slate-200 border-t">
        <div className="container py-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-white font-headline">{establishmentName}</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
              Promovendo saúde, qualidade de vida e acolhimento clínico integral para você e quem você ama.
            </p>
            {establishmentInstagram && (
              <div className="flex gap-4 pt-2">
                <a href={`https://instagram.com/${establishmentInstagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </a>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Como nos encontrar</h3>
            <div className="space-y-3 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>{establishmentAddress}</span>
              </p>
              {establishmentWhatsapp && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span>WhatsApp: {establishmentWhatsapp}</span>
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Horário de Funcionamento</h3>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>Segunda a Sexta: 08:00h às 18:00h</span>
              </p>
              <p className="flex items-center gap-2 pl-6">
                <span>Sábado: 08:00h às 12:00h</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          <div className="container flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
            <p>&copy; {new Date().getFullYear()} {establishmentName}. Todos os direitos reservados.</p>
            <div className="flex flex-col items-center md:items-end justify-center gap-1 opacity-60 hover:opacity-100 transition-all duration-300">
              <p className="text-[10px]">Invivio Care v1.0.0</p>
              <p className="text-[10px] font-medium leading-tight">
                Powered by <a href="http://www.invivio.com.br" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">Invivio Tecnologia</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
