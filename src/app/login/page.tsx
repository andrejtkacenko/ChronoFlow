'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import ChronoFlowLogo from '@/components/ChronoFlowLogo';
import { useToast } from '@/hooks/use-toast';
import TelegramLoginButton from '@/components/TelegramLoginButton';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';

declare global {
    interface Window {
        onTelegramAuth?: (user: any) => void;
    }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, signInWithToken } = useAuth();

  useEffect(() => {
      if (!authLoading && user) {
          router.push('/');
      }
  }, [user, authLoading, router]);

  const handleTelegramAuth = useCallback(async (initData: string) => {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Telegram login failed.');
      }
      
      const { token } = await response.json();
      await signInWithToken(token);
      
      toast({ title: 'Login Successful', description: 'Welcome!' });
      router.push('/');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } finally {
        setLoading(false);
    }
  }, [router, signInWithToken, toast]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // Этот коллбэк используется ТОЛЬКО для виджета на сайте
    window.onTelegramAuth = (user) => {
      if (user) {
        // Преобразуем объект user в строку initData для унификации
        const params = new URLSearchParams();
        for (const key in user) {
            params.append(key, user[key]);
        }
        handleTelegramAuth(params.toString());
      }
    };
    
    // Cleanup
    return () => {
      if (window.onTelegramAuth) {
        delete window.onTelegramAuth;
      }
    }
  }, [handleTelegramAuth]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Login Successful', description: "Welcome back!" });
      router.push('/');
    } catch (err: any) {
      setError(err.message);
       toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
           <div className="flex justify-center items-center mb-4">
             <ChronoFlowLogo className="size-12 text-primary" />
           </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-xs text-muted-foreground">OR CONTINUE WITH</span>
          </div>
          
          <TelegramLoginButton />

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}