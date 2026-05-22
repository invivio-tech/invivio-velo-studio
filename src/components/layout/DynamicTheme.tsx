'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { EstablishmentSettings } from '@/app/establishment/page';

export function DynamicTheme() {
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'establishmentSettings', 'main') : null),
    [firestore]
  );
  const { data: settings } = useDoc<EstablishmentSettings>(settingsRef);

  if (!settings) return null;

  const {
    primaryColor,
    primaryForegroundColor,
    secondaryColor,
    secondaryForegroundColor,
    backgroundColor,
    foregroundColor,
    cardColor,
    accentColor,
    borderColor,
  } = settings;

  // Build the CSS variables override block
  let cssRules = '';
  if (primaryColor) {
    cssRules += `  --primary: ${primaryColor};\n  --ring: ${primaryColor};\n`;
  }
  if (primaryForegroundColor) {
    cssRules += `  --primary-foreground: ${primaryForegroundColor};\n`;
  }
  if (secondaryColor) {
    cssRules += `  --secondary: ${secondaryColor};\n`;
  }
  if (secondaryForegroundColor) {
    cssRules += `  --secondary-foreground: ${secondaryForegroundColor};\n`;
  }
  if (backgroundColor) {
    cssRules += `  --background: ${backgroundColor};\n`;
  }
  if (foregroundColor) {
    cssRules += `  --foreground: ${foregroundColor};\n`;
    cssRules += `  --card-foreground: ${foregroundColor};\n`;
    cssRules += `  --popover-foreground: ${foregroundColor};\n`;
    cssRules += `  --accent-foreground: ${foregroundColor};\n`;
  }
  if (cardColor) {
    cssRules += `  --card: ${cardColor};\n  --popover: ${cardColor};\n`;
  }
  if (accentColor) {
    cssRules += `  --accent: ${accentColor};\n`;
  }
  if (borderColor) {
    cssRules += `  --border: ${borderColor};\n  --input: ${borderColor};\n`;
  }

  if (!cssRules) return null;

  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        :root {
        ${cssRules}
        }
        .dark {
        ${cssRules}
        }
      `
    }} />
  );
}
