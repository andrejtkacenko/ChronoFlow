
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Telegram } from '@/components/icons/Telegram';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CodeBlock = ({ text }: { text: string }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard!',
      description: 'You can now paste the command into your terminal.',
    });
  };

  return (
    <div className="relative mt-2">
      <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
        <code className="text-foreground">{text}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
        <span className="sr-only">Copy</span>
      </Button>
    </div>
  );
};


export default function TelegramIntegrationPage() {
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPublicUrl(window.location.origin);
    }
  }, []);

  const curlCommand = publicUrl
    ? `curl -F "url=${publicUrl}/api/telegram-webhook" https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook`
    : 'Loading command...';

  return (
    <div className="flex h-svh flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
           <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Telegram className="w-10 h-10" />
                <div>
                  <CardTitle>Telegram Bot Setup</CardTitle>
                  <CardDescription>
                    Follow these steps to add tasks to your inbox via Telegram.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                    <h4 className="font-semibold">Setup Instructions</h4>
                    <ol className="list-decimal list-inside space-y-2 mt-2 text-sm text-muted-foreground">
                        <li>Open Telegram and search for the <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline text-primary">@BotFather</a>.</li>
                        <li>Start a chat and send <code>/newbot</code> to create a new bot.</li>
                        <li>Follow the prompts to choose a name and username.</li>
                        <li>Once created, BotFather will give you a unique token. Copy this token.</li>
                        <li>Copy the command below and **replace `[YOUR_BOT_TOKEN]`** with the token you just received.</li>
                        <li>Paste and run the command in your computer's terminal. This tells Telegram where to send messages.</li>
                    </ol>
                </div>
                 <div>
                    <h4 className="font-semibold">Set Webhook Command</h4>
                    {publicUrl ? <CodeBlock text={curlCommand} /> : <p className="text-sm text-muted-foreground mt-2">Determining your public URL...</p>}
                 </div>
              </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
