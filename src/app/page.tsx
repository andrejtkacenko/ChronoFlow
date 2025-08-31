
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import SidebarNav from "@/components/SidebarNav";
import Header from "@/components/Header";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <div className="flex h-svh flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="flex items-center justify-center h-full">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle>Welcome to ChronoFlow</CardTitle>
                        <CardDescription>Your personal productivity dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Get started by viewing your schedule or checking your calendar.</p>
                        <div className="flex justify-center gap-4">
                            <Button asChild>
                                <Link href="/schedule">View Schedule</Link>
                            </Button>
                             <Button variant="secondary" asChild>
                                <Link href="/calendar">Open Calendar</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
