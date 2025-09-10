
'use client';
import { useState } from 'react';
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";

export default function TelegramIntegrationPage() {
    const { toast } = useToast();
    const [botToken, setBotToken] = useState('');
    const [publicUrl, setPublicUrl] = useState('');

    const webhookUrl = publicUrl ? `${publicUrl}/api/telegram-webhook` : 'YOUR_PUBLIC_URL/api/telegram-webhook';
    const curlCommand = `curl -F "url=${webhookUrl}" https://api.telegram.org/bot${botToken || 'YOUR_BOT_TOKEN_HERE'}/setWebhook`;

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
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>Set Environment Variables</h2>
                           <p className="text-muted-foreground mb-4">
                                In your project, create or open the <code>.env</code> file and add your bot token and public app URL. Replace the placeholder values with your actual data.
                           </p>
                           <div className="bg-muted p-3 rounded-lg text-sm font-mono relative space-y-2">
                                <div>
                                    TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
                                    <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-8 w-8" onClick={() => copyToClipboard('TELEGRAM_BOT_TOKEN=')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div>
                                    NEXT_PUBLIC_APP_URL="YOUR_PUBLIC_APP_URL"
                                    <Button size="icon" variant="ghost" className="absolute bottom-1 right-1 h-8 w-8" onClick={() => copyToClipboard('NEXT_PUBLIC_APP_URL=')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                           </div>
                           <p className="text-sm text-muted-foreground mt-2">
                              The public URL is the address where your app is deployed (e.g., your Vercel URL or ngrok tunnel for local development).
                           </p>
                           <p className="text-sm text-muted-foreground mt-2">
                              You can enter your values below to generate the final `curl` command.
                           </p>
                           <div className="flex gap-4 mt-4">
                                <input className="w-full bg-input rounded-md px-3 py-2 text-sm" placeholder="Paste Bot Token" value={botToken} onChange={e => setBotToken(e.target.value)} />
                                <input className="w-full bg-input rounded-md px-3 py-2 text-sm" placeholder="Paste Public URL" value={publicUrl} onChange={e => setPublicUrl(e.target.value)} />
                           </div>
                        </div>

                        {/* Step 3 */}
                        <div>
                           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>Set up the Webhook</h2>
                            <p className="text-muted-foreground mb-4">
                                Copy the command below and run it in your terminal. This will tell Telegram where to send messages from your bot.
                            </p>
                             <div className="bg-muted p-3 rounded-lg text-sm font-mono relative">
                                <code>{curlCommand}</code>
                                <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-8 w-8" onClick={() => copyToClipboard(curlCommand)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                           </div>
                           <p className="text-sm text-muted-foreground mt-2">After running the command, Telegram should respond with <code>{"{\\"ok\\":true,\\"result\\":true,\\"description\\":\\"Webhook was set\\"}"}</code>.</p>
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
