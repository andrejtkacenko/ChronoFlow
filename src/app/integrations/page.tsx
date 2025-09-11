
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Telegram } from '@/components/icons/Telegram';

async function setTelegramWebhook(token: string) {
    const webhookUrl = `${window.location.origin}/src/app/api/telegram-webhook`;
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    return response.json();
}

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [telegramToken, setTelegramToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
        const fetchToken = async () => {
            const docRef = doc(db, "userPreferences", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().telegramBotToken) {
                setTelegramToken(docSnap.data().telegramBotToken);
            }
            setIsLoading(false);
        }
        fetchToken();
    }
  }, [user, loading, router]);
  
  const handleSaveToken = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You are not logged in.' });
        return;
    }
    if (!telegramToken) {
        toast({ variant: 'destructive', title: 'Please enter a valid Telegram token.' });
        return;
    }
    setIsSaving(true);
    try {
        const webhookResult = await setTelegramWebhook(telegramToken);
        if (!webhookResult.ok) {
            throw new Error(`Telegram API error: ${webhookResult.description}`);
        }

        const userPrefRef = doc(db, 'userPreferences', user.uid);
        await setDoc(userPrefRef, { telegramBotToken: telegramToken }, { merge: true });

        toast({ title: 'Telegram Bot Connected!', description: 'Your bot is now ready to receive tasks.' });
    } catch (error: any) {
        console.error("Error setting up Telegram bot:", error);
        toast({ variant: 'destructive', title: 'Connection Failed', description: error.message || 'Could not connect to Telegram. Please check your token and try again.' });
    } finally {
        setIsSaving(false);
    }
  }


  if (loading || !user || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col bg-muted/20">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
         <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-6">Integrations</h1>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Telegram className="text-3xl" />
                        <div>
                            <CardTitle>Telegram Bot</CardTitle>
                            <CardDescription>Add tasks to your inbox directly from Telegram.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
                        <p>Follow these steps to connect your Telegram account:</p>
                        <ol>
                            <li>Open Telegram and search for the <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a>.</li>
                            <li>Start a chat and send <code>/newbot</code>.</li>
                            <li>Follow the instructions to choose a name and username for your bot.</li>
                            <li>Once created, @BotFather will give you a unique token. Copy this token.</li>
                            <li>Paste the token below and click &quot;Save & Connect&quot;.</li>
                        </ol>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="telegram-token">Your Telegram Bot Token</Label>
                        <div className="flex gap-4">
                            <Input 
                                id="telegram-token"
                                type="password"
                                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1uT_0"
                                value={telegramToken}
                                onChange={(e) => setTelegramToken(e.target.value)}
                            />
                            <Button onClick={handleSaveToken} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save & Connect
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
         </div>
      </main>
    </div>
  );
}
