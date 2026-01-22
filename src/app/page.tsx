import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { BarberPoleIcon } from '@/components/icons/barber-pole-icon';

const services = [
  {
    title: 'Corte Clássico',
    description:
      'Um corte atemporal, adaptado ao seu estilo. Inclui lavagem e finalização.',
    price: 'R$50,00',
    duration: '45 min',
    imageId: 'service-classic-cut',
  },
  {
    title: 'Aparo e Modelagem de Barba',
    description:
      'Aparo e modelagem de especialista para aperfeiçoar sua barba. Inclui acabamento com toalha quente.',
    price: 'R$35,00',
    duration: '30 min',
    imageId: 'service-beard-trim',
  },
  {
    title: 'Barba com Toalha Quente',
    description:
      'Uma barba tradicional com navalha, toalhas quentes e espuma rica.',
    price: 'R$40,00',
    duration: '40 min',
    imageId: 'service-hot-shave',
  },
];

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find((p) => p.id === 'landing-hero');
  const aboutImage = PlaceHolderImages.find((p) => p.id === 'landing-about');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <BarberPoleIcon className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">
              Barbearia Inteligente
            </span>
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
              href="#contact"
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
            <h1 className="text-4xl font-extrabold tracking-tight font-headline lg:text-6xl max-w-2xl">
              Estilo e Precisão em Cada Corte.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Experimente a combinação perfeita de tradição e modernidade. Na
              Barbearia Inteligente, cuidamos do seu visual com a maestria que
              você merece.
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link href="/signup">Agendar Meu Horário</Link>
            </Button>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="container py-16 md:py-24">
          <h2 className="text-3xl font-headline font-bold text-center">
            Nossos Serviços Premium
          </h2>
          <p className="text-muted-foreground text-center mt-2 mb-12">
            Do clássico ao contemporâneo, temos o serviço perfeito para você.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const image = PlaceHolderImages.find(
                (p) => p.id === service.imageId
              );
              return (
                <Card
                  key={service.title}
                  className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {image && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <Image
                        src={image.imageUrl}
                        alt={image.description}
                        fill
                        className="object-cover"
                        data-ai-hint={image.imageHint}
                      />
                    </div>
                  )}
                  <div className="flex flex-col flex-grow p-6">
                    <CardTitle className="font-headline text-2xl mb-2">
                      {service.title}
                    </CardTitle>
                    <CardDescription className="flex-grow">
                      {service.description}
                    </CardDescription>
                  </div>
                  <CardFooter className="flex justify-between items-center bg-muted/50 p-6 pt-4">
                    <span className="text-xl font-bold font-headline text-primary">
                      {service.price}
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
              <h2 className="text-3xl font-headline font-bold">
                A Barbearia Inteligente
              </h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                Fundada em 2024, nossa barbearia nasceu com o propósito de
                resgatar a essência das barbearias clássicas, incorporando
                tecnologia para oferecer uma experiência única e conveniente.
                Nossos profissionais são artistas apaixonados, dedicados a
                entregar o melhor resultado para cada cliente.
              </p>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                Utilizamos produtos de alta qualidade e as técnicas mais
                apuradas para garantir que seu cabelo e barba estejam sempre
                impecáveis. Venha nos visitar e descubra por que somos a
                escolha inteligente para o homem moderno.
              </p>
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

      <footer id="contact" className="bg-background">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; 2024 Barbearia Inteligente. Todos os direitos reservados.
          </p>
          <p className="mt-2">Rua da Barbearia, 123 - Centro, Sua Cidade</p>
        </div>
      </footer>
    </div>
  );
}
