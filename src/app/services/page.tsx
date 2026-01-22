import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';

const services = [
  {
    title: 'Classic Haircut',
    description: 'A timeless cut, tailored to your style. Includes a wash and style.',
    price: 'R$50,00',
    duration: '45 min',
    imageId: 'service-classic-cut',
  },
  {
    title: 'Beard Trim & Shape',
    description: 'Expert trimming and shaping to perfect your beard. Includes hot towel finish.',
    price: 'R$35,00',
    duration: '30 min',
    imageId: 'service-beard-trim',
  },
  {
    title: 'Hot Towel Shave',
    description: 'A traditional straight-razor shave with hot towels and rich lather.',
    price: 'R$40,00',
    duration: '40 min',
    imageId: 'service-hot-shave',
  },
  {
    title: 'Kids Haircut',
    description: 'A patient and fun haircut experience for children under 12.',
    price: 'R$30,00',
    duration: '30 min',
    imageId: 'service-kids-cut',
  },
];

export default function ServicesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Our Services
      </h1>
      <p className="text-muted-foreground">Explore our range of professional barbering services.</p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const image = PlaceHolderImages.find(p => p.id === service.imageId);
          return (
            <Card key={service.title} className="flex flex-col overflow-hidden">
              <CardHeader className="p-0">
                {image && (
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={image.imageUrl}
                      alt={image.description}
                      fill
                      className="object-cover"
                      data-ai-hint={image.imageHint}
                    />
                  </div>
                )}
              </CardHeader>
              <div className='flex flex-col flex-grow p-6'>
                <CardTitle className="font-headline text-2xl mb-2">{service.title}</CardTitle>
                <CardDescription className='flex-grow'>{service.description}</CardDescription>
              </div>
              <CardFooter className="flex justify-between items-center">
                <span className="text-xl font-bold font-headline text-primary">{service.price}</span>
                <Badge variant="secondary">{service.duration}</Badge>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
