
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import ChronoFlowLogo from '@/components/ChronoFlowLogo';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import TelegramLoginButton from '@/components/TelegramLoginButton';
import { useAuth } from '@/hooks/use-auth';

// Этот тип нужен только для виджета на сайте
declare global {
    interface Window {
        onTelegramAuth?: (user: any) => void;
    }
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { signInWithToken } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: 'Signup Successful', description: "Your account has been created." });
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramAuth = useCallback(async (telegramUser: any) => {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUser }), // Send as JSON object for widget
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Telegram login failed.');
      }
      
      const { token } = await response.json();
      await signInWithToken(token);
      
      toast({ title: 'Signup Successful', description: 'Welcome!' });
      router.push('/');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Signup Failed', description: error.message });
    } finally {
        setLoading(false);
    }
  }, [router, signInWithToken, toast]);

  // Привязываем коллбэк к window
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.onTelegramAuth = handleTelegramAuth;
    
    return () => {
      if (window.onTelegramAuth === handleTelegramAuth) {
        delete window.onTelegramAuth;
      }
    }
  }, [handleTelegramAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
         <CardHeader className="text-center">
           <div className="flex justify-center items-center mb-4">
             <ChronoFlowLogo className="size-12 text-primary" />
           </div>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Enter your email and password to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-xs text-muted-foreground">OR CONTINUE WITH</span>
          </div>
          
          <TelegramLoginButton />

           <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
