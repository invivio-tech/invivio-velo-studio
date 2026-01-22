'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  generatePromotionalOffers,
  type PromotionalOfferOutput,
} from '@/ai/flows/generate-promotional-offers';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Gift, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  serviceCatalog: z
    .string()
    .min(50, { message: 'Please provide more detail on your services.' }),
  customerHistory: z
    .string()
    .min(50, { message: 'Please provide more detail on customer history.' }),
  currentPromotions: z.string().optional(),
});

export default function PromotionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PromotionalOfferOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceCatalog: 'Classic Haircut - R$50, Beard Trim - R$35, Hot Towel Shave - R$40. We also sell hair pomade and beard oil.',
      customerHistory: 'Most clients are regulars who come every 3-4 weeks for a haircut. Younger clients (20-30s) often get a beard trim as well. We see a drop in appointments mid-week (Tuesday, Wednesday).',
      currentPromotions: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const output = await generatePromotionalOffers(values);
      setResult(output);
    } catch (error) {
      console.error('Error generating promotion:', error);
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description:
          'Failed to generate promotional offer. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Sparkles className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-headline font-bold tracking-tight">
          AI Promotion Generator
        </h1>
      </div>
      <p className="text-muted-foreground">
        Let AI craft the perfect promotion to attract more customers. Fill in the details below.
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Barbershop Details</CardTitle>
            <CardDescription>
              Provide context for the AI to generate the best offer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="serviceCatalog"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Catalog</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Classic Haircut - R$50, Beard Trim - R$35..."
                          className="h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        List your services and prices.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Behavior</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Most clients are regulars... We are slow on Wednesdays..."
                          className="h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe your typical customer and busy/slow periods.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentPromotions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Promotions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 10% off for first-time customers."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Offer'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <h2 className="text-2xl font-headline font-bold">AI Suggestion</h2>
          {isLoading ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in-50 duration-500">
              <Card className="bg-primary/10 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Gift className="text-primary" />
                    Your New Promotional Offer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{result.offer}</p>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    Launch suggestion: <strong>{result.launchTimeSuggestion}</strong>
                  </p>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-lg">
                    <Lightbulb className="text-secondary" />
                    AI Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{result.reasoning}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center text-center p-8 h-full">
              <CardContent className="space-y-2">
                <div className="mx-auto bg-secondary/20 p-4 rounded-full w-fit">
                    <Sparkles className="h-8 w-8 text-secondary" />
                </div>
                <p className="text-lg font-semibold">Ready for a great idea?</p>
                <p className="text-muted-foreground">
                  Your generated promotion will appear here once you fill out the details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
