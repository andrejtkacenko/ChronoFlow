'use client';
import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import { Input } from '@/components/ui/input';

export default function TelegramIntegrationPage() {
    const { toast } = useToast();
    const [botToken, setBotToken] = useState('');
    const [publicUrl, setPublicUrl] = useState('');

    useEffect(() => {
        // This will run on the client side and get the correct window origin
        setPublicUrl(window.location.origin);
    }, []);

    const getCurlCommand = () => {
        const url = publicUrl || 'YOUR_PUBLIC_URL';
        const token = botToken || 'YOUR_BOT_TOKEN_HERE';
        const webhookUrl = `${url}/api/telegram-webhook`;
        return `curl -F "url=${webhookUrl}" https://api.telegram.org/bot${token}/setWebhook`;
    };

    const copyToClipboard = () => {
        const command = getCurlCommand();
        navigator.clipboard.writeText(command);
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
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>Enter Your Bot Token</h2>
                           <p className="text-muted-foreground mb-4">
                                In your project, create or open the <code>.env</code> file and add your bot token. Then, enter the same value below to generate the final setup command. Your public URL is detected automatically.
                           </p>
                           
                           <div className="space-y-4 mt-4">
                                <Input className="w-full" placeholder="Paste Bot Token" value={botToken} onChange={e => setBotToken(e.target.value)} />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Your App Public URL:</p>
                                    <p className="text-sm font-mono p-2 bg-muted rounded-md mt-1">{publicUrl ? publicUrl : 'Loading...'}</p>
                                </div>
                           </div>
                        </div>

                        {/* Step 3 */}
                        <div>
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>Set up the Webhook</h2>
                            <p className="text-muted-foreground mb-4">
                                Copy the command generated below and run it in your terminal. This tells Telegram where to send messages from your bot.
                            </p>
                             <div className="bg-muted p-3 rounded-lg text-sm font-mono relative break-words">
                                <code>{getCurlCommand()}</code>
                                <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-8 w-8" onClick={copyToClipboard}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                           </div>
                           <p className="text-sm text-muted-foreground mt-2">After running the command, Telegram should respond with <code>{"\\"ok\\":true,\\"result\\":true,\\"description\\":\\"Webhook was set\\""}</code>.</p>
                        </div>
                        
                         {/* Step 4 */}
                        <div>
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</span>Start adding tasks!</h2>
                           <p className="text-muted-foreground mb-4">
                                Once the webhook is set successfully, open a chat with your bot in Telegram and send it any message. It will automatically appear as a new task in your ChronoFlow inbox.
                           </p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}