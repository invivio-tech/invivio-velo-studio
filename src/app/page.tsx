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
import { BarberPoleIcon } from '@/components/icons/barber-pole-icon';

import { collection, doc, query, where, limit, orderBy, Timestamp } from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import type { Service } from '@/app/services/page';
import { Skeleton } from '@/components/ui/skeleton';
import type { EstablishmentSettings } from '@/app/establishment/page';
import type { Product } from '@/types/store';
import { Instagram, Star, Scissors as ScissorsIcon, User as UserIcon, ShoppingBag, Package, ArrowRight } from 'lucide-react';

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

  // Fetch Featured Products (up to 4 active products)
  const featuredProductsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products'), where('active', '==', true), limit(4)) : null),
    [firestore]
  );
  const { data: featuredProducts, isLoading: areProductsLoading } = useCollection<Product>(featuredProductsQuery);

  // Fetch Portfolio (Completed Appointments with Photos)
  const portfolioQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'appointments'),
      where('status', '==', 'completed'),
      where('isPortfolioFeatured', '==', true),
      orderBy('startTime', 'desc'),
      limit(6)
    );
  }, [firestore]);
  
  const { data: allCompleted, isLoading: isPortfolioLoading } = useCollection<any>(portfolioQuery);

  const portfolioItems = useMemo(() => {
    if (!allCompleted) return [];
    // Filter items that have photos
    return allCompleted.filter(apt => apt.completionPhotos && apt.completionPhotos.length > 0);
  }, [allCompleted]);

  const isLoading = areServicesLoading || areSettingsLoading;

  const defaultSettings: EstablishmentSettings = {
    name: 'Barbearia Inteligente',
    about: 'Fundada em 2024, nossa barbearia nasceu com o propósito de resgatar a essência das barbearias clássicas, incorporando tecnologia para oferecer uma experiência única e conveniente. Nossos profissionais são artistas apaixonados, dedicados a entregar o melhor resultado para cada cliente. Utilizamos produtos de alta qualidade e as técnicas mais apuradas para garantir que seu cabelo e barba estejam sempre impecáveis. Venha nos visitar e descubra por que somos a escolha inteligente para o homem moderno.',
    heroTitle: 'Estilo e Precisão em Cada Corte.',
    heroSubtitle: 'Experimente a combination perfeita de tradição e modernidade. Na Barbearia Inteligente, cuidamos do seu visual com a maestria que você merece.',
    servicesTitle: 'Nossos Serviços Premium',
    servicesSubtitle: 'Do clássico ao contemporâneo, temos o serviço perfeito para você.',
    storeSubtitle: 'Produtos profissionais usados pelos nossos barbeiros, disponíveis para você.',
    address: 'Rua da Barbearia, 123 - Centro, Sua Cidade',
    whatsapp: '5511999998888',
    instagram: 'barbearia.inteligente',
    businessCategory: 'barbershop',
    businessTone: 'luxury',
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
  const establishmentAboutImageUrl = settings?.aboutImageUrl;
  const establishmentCategory = settings?.businessCategory || defaultSettings.businessCategory;

  const getStoreSubtitle = (category: string) => {
    switch (category) {
      case 'barbershop':
        return 'Produtos profissionais usados pelos nossos barbeiros, disponíveis para você.';
      case 'beauty_salon':
        return 'Produtos profissionais usados pelos nossos cabeleireiros e esteticistas, disponíveis para você.';
      case 'clinic':
        return 'Produtos profissionais recomendados pelos nossos especialistas, disponíveis para você.';
      case 'petshop':
        return 'Produtos de alta qualidade usados pelos nossos profissionais de pet care, disponíveis para você.';
      default:
        return 'Produtos profissionais usados pelos nossos profissionais, disponíveis para você.';
    }
  };

  const establishmentStoreSubtitle = settings?.storeSubtitle || getStoreSubtitle(establishmentCategory);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 md:h-24 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {establishmentLogo ? (
              <img src={establishmentLogo} alt={establishmentName} className="h-14 md:h-20 max-w-[240px] object-contain" />
            ) : (
              <BarberPoleIcon className="h-10 md:h-12 w-10 md:w-12 text-primary" />
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
            <Link
              href="/store"
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Loja
            </Link>
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
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="object-cover w-full h-full"
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
                      {`R$${(service.price ?? 0).toFixed(2).replace('.', ',')}`}
                    </span>
                    <Badge variant="secondary">{service.duration || 'Consultar'}</Badge>
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

        {/* Portfolio Section */}
        {portfolioItems.length > 0 && (
          <section className="bg-slate-950 text-white py-16 md:py-24 overflow-hidden">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-12">
                <div className="space-y-2">
                  <Badge variant="outline" className="text-primary border-primary/30 uppercase tracking-widest text-[10px] py-1 px-3">Galeria de Resultados</Badge>
                  <h2 className="text-3xl md:text-5xl font-headline font-bold text-slate-50">
                    Serviços Executados
                  </h2>
                  <p className="text-slate-400 max-w-xl text-lg">
                    Confira os resultados reais transformados por nossos especialistas.
                  </p>
                </div>
                <div className="hidden md:flex gap-2">
                   <div className="flex -space-x-3 overflow-hidden">
                     {[1,2,3].map(i => (
                       <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-slate-950 bg-slate-800 flex items-center justify-center">
                         <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                       </div>
                     ))}
                   </div>
                   <div className="ml-4 text-sm">
                      <p className="font-bold text-slate-200">Resultados Reais</p>
                      <p className="text-slate-500 text-xs">Transformações confirmadas</p>
                   </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory px-4 -mx-4">
                  {portfolioItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex-shrink-0 w-[280px] md:w-[350px] snap-start group"
                    >
                      <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-4 ring-1 ring-slate-800 transition-all duration-500 group-hover:ring-primary/50 group-hover:shadow-[0_0_30px_rgba(var(--primary),0.1)]">
                        <img 
                          src={item.completionPhotos[0]} 
                          alt={item.serviceName}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                        
                        <div className="absolute bottom-4 left-4 right-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                           <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-primary/20 text-primary border-none hover:bg-primary/30 text-[10px] h-5">
                                 {item.serviceName}
                              </Badge>
                           </div>
                           <p className="text-slate-300 text-xs font-medium flex items-center gap-1">
                             <UserIcon className="h-3 w-3" />
                             Corte por {item.professionalName}
                           </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Visual hint for scrolling */}
                <div className="absolute right-0 top-0 bottom-8 w-24 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
              </div>
            </div>
          </section>
        )}

        {/* Featured Products Section */}
        {(areProductsLoading || (featuredProducts && featuredProducts.length > 0)) && (
          <section id="store" className="container py-16 md:py-24">
            <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-12">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <ShoppingBag className="w-4 h-4" /> Nossa Loja
                </div>
                <h2 className="text-3xl md:text-4xl font-headline font-bold">Produtos em Destaque</h2>
                <p className="text-muted-foreground max-w-md">
                  {establishmentStoreSubtitle}
                </p>
              </div>
              <Button variant="outline" asChild className="shrink-0">
                <Link href="/store">
                  Ver Todos os Produtos <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {areProductsLoading &&
                [...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl border overflow-hidden">
                    <Skeleton className="h-44 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full mt-2" />
                    </div>
                  </div>
                ))
              }
              {!areProductsLoading && featuredProducts?.map((product) => (
                <div key={product.id} className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="relative h-44 bg-muted overflow-hidden">
                    {(product.imageURLs?.[0] || product.imageURL) ? (
                      <img
                        src={product.imageURLs?.[0] || product.imageURL}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 p-4 space-y-3">
                    <h3 className="font-headline font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <span className="text-base font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price ?? 0)}
                      </span>
                      <Button size="sm" className="rounded-xl text-xs h-8" asChild>
                        <Link href="/store">Comprar</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
              {establishmentAboutImageUrl ? (
                <img
                  src={establishmentAboutImageUrl}
                  alt="Sobre o estabelecimento"
                  className="object-cover w-full h-full rounded-lg shadow-lg"
                />
              ) : aboutImage ? (
                <Image
                  src={aboutImage.imageUrl}
                  alt={aboutImage.description}
                  fill
                  className="object-cover rounded-lg shadow-lg"
                  data-ai-hint={aboutImage.imageHint}
                />
              ) : null}
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
                &copy; {new Date().getFullYear()} {establishmentName}. Todos os direitos reservados.
              </p>
              <p className="mt-2">
                {establishmentAddress}
              </p>
              <div className="pb-4 pt-2 flex flex-col items-center justify-center gap-1 opacity-50 hover:opacity-100 transition-all duration-300">
                <p className="text-[10px]">Invivio Velo v1.00056</p>
                <p className="text-[10px] font-medium leading-tight">
                  Powered by <a href="http://www.invivio.com.br" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">Invivio Tecnologia</a>
                </p>
              </div>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

