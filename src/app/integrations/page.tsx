
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Telegram } from '@/components/icons/Telegram';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function IntegrationsPage() {

  return (
    <div className="flex h-svh flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
            <p className="text-muted-foreground">
              Connect ChronoFlow with your favorite tools to streamline your workflow.
            </p>
          </div>
          <div className="grid gap-6 mt-8">
             <Link href="/integrations/telegram">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Telegram className="w-10 h-10" />
                    <div>
                      <CardTitle>Telegram Bot</CardTitle>
                      <CardDescription>
                        Add tasks to your ChronoFlow inbox by sending messages to a Telegram bot.
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
