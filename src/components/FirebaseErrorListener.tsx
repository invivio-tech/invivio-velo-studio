'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';

// This component is only active in development and will be tree-shaken in production.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const handleError = (error: any) => {
      console.error('Firebase Permission Error:', error);

      // We still throw the error in development to leverage the Next.js error overlay
      // This gives us a better debugging experience.
      // NOTE: This will cause a flash of the error toast before the overlay appears.
      // This is acceptable in a development environment.
      throw error;

      // The toast provides a quick, less intrusive feedback mechanism.
      /*
      toast({
        variant: 'destructive',
        title: 'Firebase Security Rule Error',
        description: (
          <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
            <code className="text-white">{error.toString()}</code>
          </pre>
        ),
      });
      */
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
