'use client';

import { useSession } from '@/lib/useSession';
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({ children }) {
  const session = useSession();
  const router = useRouter();

  if (!session) {
    router.push('/login');
    return null;
  }

  return <>{children}</>;
}
