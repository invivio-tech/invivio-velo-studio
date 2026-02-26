'use client';

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
import { BarberPoleIcon } from '@/components/icons/barber-pole-icon';

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
import { Instagram } from 'lucide-react';

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

  const isLoading = areServicesLoading || areSettingsLoading;

  const defaultSettings: EstablishmentSettings = {
    name: 'Barbearia Inteligente',
    about: 'Fundada em 2024, nossa barbearia nasceu com o propósito de resgatar a essência das barbearias clássicas, incorporando tecnologia para oferecer uma experiência única e conveniente. Nossos profissionais são artistas apaixonados, dedicados a entregar o melhor resultado para cada cliente. Utilizamos produtos de alta qualidade e as técnicas mais apuradas para garantir que seu cabelo e barba estejam sempre impecáveis. Venha nos visitar e descubra por que somos a escolha inteligente para o homem moderno.',
    heroTitle: 'Estilo e Precisão em Cada Corte.',
    heroSubtitle: 'Experimente a combinação perfeita de tradição e modernidade. Na Barbearia Inteligente, cuidamos do seu visual com a maestria que você merece.',
    servicesTitle: 'Nossos Serviços Premium',
    servicesSubtitle: 'Do clássico ao contemporâneo, temos o serviço perfeito para você.',
    address: 'Rua da Barbearia, 123 - Centro, Sua Cidade',
    whatsapp: '5511999998888',
    instagram: 'barbearia.inteligente',
  };

  const establishmentName = settings?.name || defaultSettings.name;
  const establishmentAbout = settings?.about || defaultSettings.about;
  const establishmentHeroTitle = settings?.heroTitle || defaultSettings.heroTitle;
  const establishmentHeroSubtitle = settings?.heroSubtitle || defaultSettings.heroSubtitle;
  const establishmentServicesTitle = settings?.servicesTitle || defaultSettings.servicesTitle;
  const establishmentServicesSubtitle = settings?.servicesSubtitle || defaultSettings.servicesSubtitle;
  const establishmentAddress = settings?.address || defaultSettings.address;
  const establishmentWhatsapp = settings?.whatsapp || defaultSettings.whatsapp;
  const establishmentInstagram = settings?.instagram;
  const establishmentLogo = settings?.logoUrl;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {establishmentLogo ? (
              <img src={establishmentLogo} alt={establishmentName} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <BarberPoleIcon className="h-6 w-6 text-primary" />
            )}
            {isLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <span className="font-bold font-headline">
                {establishmentName}
              </span>
            )}
          </Link>
          <nav className="flex-1 items-center space-x-6 text-sm font-medium hidden md:flex">
            <a
              href="#services"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Serviços
            </a>
            <a
              href="#about"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Sobre
            </a>
            <a
              href={establishmentWhatsapp ? `https://wa.me/${establishmentWhatsapp.replace(/\D/g, '')}` : '#contact'}
              target={establishmentWhatsapp ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Contato
            </a>
          </nav>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Agendar Agora</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[70vh] w-full flex items-center">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              data-ai-hint={heroImage.imageHint}
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent" />
          <div className="relative z-10 container text-left">
            {isLoading ? (
              <div className='space-y-4'>
                <Skeleton className="h-12 w-3/4 lg:h-16" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <>
                <h1 className="text-4xl font-extrabold tracking-tight font-headline lg:text-6xl max-w-2xl">
                  {establishmentHeroTitle}
                </h1>
                <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                  {establishmentHeroSubtitle}
                </p>
              </>
            )}
            <Button size="lg" className="mt-6" asChild>
              <Link href="/signup">Agendar Meu Horário</Link>
            </Button>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="container py-16 md:py-24">
          <div className="text-center mb-12">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-headline font-bold">
                  {establishmentServicesTitle}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {establishmentServicesSubtitle}
                </p>
              </>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {areServicesLoading &&
              [...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0">
                    <Skeleton className="aspect-[16/9] w-full" />
                  </CardHeader>
                  <div className="p-6">
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <CardFooter>
                    <Skeleton className="h-6 w-1/4" />
                  </CardFooter>
                </Card>
              ))}
            {services?.map((service) => {
              return (
                <Card
                  key={service.id}
                  className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader className="p-0">
                    {service.imageUrl ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden">
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] w-full bg-muted" />
                    )}
                  </CardHeader>
                  <div className="flex flex-col flex-grow p-6">
                    <CardTitle className="font-headline text-2xl mb-2">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="flex-grow">
                      {service.description}
                    </CardDescription>
                  </div>
                  <CardFooter className="flex justify-between items-center bg-muted/50 p-6 pt-4">
                    <span className="text-xl font-bold font-headline text-primary">
                      {`R$${service.price.toFixed(2).replace('.', ',')}`}
                    </span>
                    <Badge variant="secondary">{service.duration}</Badge>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <Button variant="outline" asChild>
              <Link href="/services">Ver Todos os Serviços</Link>
            </Button>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="bg-card border-y">
          <div className="container py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
            <div>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-headline font-bold">
                    {`Sobre ${establishmentName}`}
                  </h2>
                  <p className="text-muted-foreground mt-4 leading-relaxed whitespace-pre-wrap">
                    {establishmentAbout}
                  </p>
                </>
              )}
            </div>
            <div className="relative aspect-square w-full max-w-md mx-auto">
              {aboutImage && (
                <Image
                  src={aboutImage.imageUrl}
                  alt={aboutImage.description}
                  fill
                  className="object-cover rounded-lg shadow-lg"
                  data-ai-hint={aboutImage.imageHint}
                />
              )}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-card border-t">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          {establishmentInstagram && (
            <div className="flex justify-center gap-6 mb-4">
              <a href={`https://instagram.com/${establishmentInstagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="h-6 w-6" />
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          ) : (
            <>
              <p>
                &copy; 2024 {establishmentName}. Todos os direitos reservados.
              </p>
              <p className="mt-2">
                {establishmentAddress}
              </p>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

