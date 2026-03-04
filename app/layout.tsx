npm install @supabase/auth-helpers-nextjs

'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.refresh(); // or router.push('/login')
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}  
