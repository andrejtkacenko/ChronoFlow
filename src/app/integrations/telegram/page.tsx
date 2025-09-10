
'use client';
import { useState } from 'react';
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Copy, Loader2 } from "lucide-react";

export default function TelegramIntegrationPage() {
    const { toast } = useToast();
    const [publicUrl, setPublicUrl] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSet, setIsSet] = useState(false);

    const handleSetWebhook = async () => {
        if (!publicUrl) {
            toast({ variant: 'destructive', title: "Public URL required", description: "Please enter your app's public URL." });
            return;
        }
        setIsLoading(true);
        setIsSet(false);
        try {
            const res = await fetch('/api/telegram-webhook', { method: 'GET' });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to set webhook');
            }
            setWebhookUrl(`${publicUrl}/api/telegram-webhook`);
            setIsSet(true);
            toast({ title: "Webhook Set Successfully!", description: "Your bot is now connected." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Setting Webhook", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied to clipboard!' });
    };

    return (
        <div className="flex h-svh flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <Button variant="ghost" asChild className="mb-4">
                        <Link href="/integrations"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Integrations</Link>
                    </Button>
                    
                    <h1 className="text-3xl font-bold mb-2">Telegram Bot Integration</h1>
                    <p className="text-muted-foreground mb-6">
                        Follow these steps to connect your Telegram bot and start adding tasks from anywhere.
                    </p>

                    <div className="space-y-8">
                        {/* Step 1 */}
                        <div>
                            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>Create a new bot with BotFather</h2>
                            <p className="text-muted-foreground mb-4">
                                Open Telegram and search for <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer" className="underline font-medium">@BotFather</a>. Start a chat and send the <code>/newbot</code> command. Follow the instructions to give your bot a name and username.
                            </p>
                             <p className="text-muted-foreground">
                                BotFather will give you a unique token. This is your bot's key, so keep it safe.
                            </p>
                        </div>
                        
                        {/* Step 2 */}
                        <div>
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>Set Environment Variable</h2>
                           <p className="text-muted-foreground mb-4">
                                In your project, open the <code>.env</code> file and add your bot token:
                           </p>
                           <div className="bg-muted p-3 rounded-lg text-sm font-mono relative">
                                TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
                                <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-8 w-8" onClick={() => copyToClipboard('TELEGRAM_BOT_TOKEN=')}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                           </div>
                        </div>

                        {/* Step 3 */}
                        <div>
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text/primary-foreground text-sm font-bold">3</span>Set up the Webhook</h2>
                            <p className="text-muted-foreground mb-4">
                                To receive messages, your bot needs a public URL (webhook). If you are developing locally, you can use a service like <a href="https://ngrok.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">ngrok</a> to expose your local server to the internet. Your project must be running.
                            </p>
                             <div className="flex items-center gap-2 mb-4">
                                <Input 
                                    placeholder="Enter your public URL (e.g., https://yourapp.com or https://...ngrok.io)" 
                                    value={publicUrl}
                                    onChange={(e) => setPublicUrl(e.target.value)}
                                />
                                <Button onClick={handleSetWebhook} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : "Set Webhook"}
                                </Button>
                            </div>
                            <p className="text-muted-foreground mb-4">
                               Also, add this URL to your <code>.env</code> file:
                           </p>
                            <div className="bg-muted p-3 rounded-lg text-sm font-mono relative">
                                NEXT_PUBLIC_APP_URL="{publicUrl}"
                                <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-8 w-8" onClick={() => copyToClipboard(`NEXT_PUBLIC_APP_URL=${publicUrl}`)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                           </div>

                        </div>
                        
                         {/* Step 4 */}
                        <div>
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</span>Start adding tasks!</h2>
                           <p className="text-muted-foreground mb-4">
                                Once the webhook is set, open a chat with your bot in Telegram and send it any message. It will automatically appear as a new task in your ChronoFlow inbox.
                           </p>
                           {isSet && (
                               <div className="p-4 border-l-4 border-green-500 bg-green-500/10 rounded-r-lg">
                                   <div className="flex items-center gap-3">
                                       <CheckCircle className="h-5 w-5 text-green-500" />
                                       <p className="font-semibold text-green-500">Webhook is active at: <code>{webhookUrl}</code></p>
                                   </div>
                               </div>
                           )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}
