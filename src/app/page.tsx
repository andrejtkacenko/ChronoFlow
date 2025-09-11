
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from "@/components/Header";
import { Skeleton } from '@/components/ui/skeleton';
import Dashboard from '@/components/Dashboard';
import { useToast } from '@/hooks/use-toast';
import ChronoFlowLogo from '@/components/ChronoFlowLogo';

// Расширяем window для TypeScript
declare global {
    interface Window {
        Telegram?: any;
    }
}

export default function Home() {
  const { user, loading: authLoading, signInWithToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Telegram Mini App-специфичная логика ---

  const handleTelegramAuth = useCallback(async (initData: string) => {
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Telegram login failed.');
      }
      
      await signInWithToken(result.token);
      
      // Скрываем кнопку после успешного входа
      window.Telegram?.WebApp.MainButton.hide();

    } catch (error: any) {
        setAuthError(error.message);
        toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
        window.Telegram?.WebApp.MainButton.hide();
    }
  }, [signInWithToken, toast]);

  useEffect(() => {
    setIsClient(true);
    
    // Этот код выполнится только на клиенте
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
        setIsTelegramMiniApp(true);
        tg.expand();

        // Если пользователь еще не вошел в систему, настраиваем кнопку входа
        if (!user && !authLoading) {
            const onMainButtonClick = () => {
                handleTelegramAuth(tg.initData);
            };

            tg.MainButton.setText('Login to ChronoFlow');
            tg.MainButton.onClick(onMainButtonClick);
            tg.MainButton.show();
            
            // Очистка при размонтировании компонента
            return () => {
                tg.MainButton.offClick(onMainButtonClick);
                tg.MainButton.hide();
            };
        } else {
            // Если пользователь уже вошел, просто скрываем кнопку
            tg.MainButton.hide();
        }
    }
  }, [isClient, user, authLoading, handleTelegramAuth]);
  
  // --- Стандартная логика переадресации ---
  useEffect(() => {
    // Не перенаправляем, если это Mini App или если идет загрузка
    if (isTelegramMiniApp || authLoading || !isClient) {
      return;
    }
    // Если это обычный браузер и пользователь не вошел, перенаправляем на /login
    if (!user) {
      router.push('/login');
    }
  }, [user, authLoading, router, isClient, isTelegramMiniApp]);

  // --- Рендеринг ---

  // Экран загрузки
  if (!isClient || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  // Интерфейс для входа в Mini App
  if (isTelegramMiniApp && !user) {
    return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
            <ChronoFlowLogo className="size-20 text-primary" />
            <h1 className="mt-6 text-2xl font-bold">Welcome to ChronoFlow</h1>
            <p className="mt-2 text-muted-foreground">Click the button below to log in seamlessly with your Telegram account.</p>
            {authError && <p className="mt-4 text-destructive">{authError}</p>}
        </div>
    );
  }
  
  // Основной дашборд для вошедшего пользователя
  if (user) {
      return (
        <div className="flex h-svh flex-col bg-muted/20">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Dashboard />
          </main>
        </div>
      );
  }

  // Заглушка на случай, если ни одно условие не выполнилось (например, не Mini App и еще не перенаправлен)
  return null;
}
