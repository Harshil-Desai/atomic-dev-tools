import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atomic Dev Tools',
  description: 'Lightweight developer utilities that just work',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='bg-background text-foreground'>
      <body className='min-h-screen'>
        {children}
      </body>
    </html>
  );
}