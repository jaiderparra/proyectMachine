'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';

export default function Home() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? '/espacios' : '/login');
  }, [loading, user, router]);

  return <p className="muted">Cargando…</p>;
}
