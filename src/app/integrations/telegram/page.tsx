
'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { Label } from '@/components/ui/label';

export default function TelegramIntegrationPage() {
    const [botToken, setBotToken] = useState('');
    const [publicUrl, setPublicUrl] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [curlCommand, setCurlCommand] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // This runs on the client, so window is available.
        setPublicUrl(window.location.origin);
    }, []);

    useEffect(() => {
        const url = publicUrl ? `${publicUrl}/api/telegram-webhook` : '';
        setWebhookUrl(url);
    }, [publicUrl]);

    useEffect(() => {
        const command = botToken && webhookUrl
            ? `curl -F "url=${webhookUrl}" https://api.telegram.org/bot${botToken}/setWebhook`
            : '';
        setCurlCommand(command);
    }, [botToken, webhookUrl]);

    const handleCopy = () => {
        if (curlCommand) {
            navigator.clipboard.writeText(curlCommand);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex h-svh flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Telegram Bot Integration</h1>
                    <p className="text-muted-foreground mb-8">
                        Follow these steps to connect your Telegram account and start adding tasks from anywhere.
                    </p>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Шаг 1: Создайте бота в Telegram</CardTitle>
                                <CardDescription>
                                    Откройте Telegram, найдите бота с именем <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary underline">@BotFather</a> и отправьте ему команду <code>/newbot</code>. Следуйте инструкциям, чтобы создать нового бота. В конце вы получите уникальный токен доступа.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Label htmlFor="bot-token">Вставьте сюда ваш токен</Label>
                                <Input
                                    id="bot-token"
                                    type="text"
                                    placeholder="123456:ABC-DEF1234..."
                                    value={botToken}
                                    onChange={(e) => setBotToken(e.target.value)}
                                    className="mt-2"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Шаг 2: Настройте Webhook</CardTitle>
                                <CardDescription>
                                    Это позволит вашему боту отправлять сообщения в ChronoFlow. Мы сгенерировали для вас команду. Скопируйте ее и выполните в вашем терминале.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {publicUrl && (
                                    <div className="space-y-2">
                                        <Label>Ваш URL для Webhook</Label>
                                        <Input type="text" readOnly value={webhookUrl} className="bg-muted" />
                                        <p className="text-xs text-muted-foreground">Этот URL был определен автоматически.</p>
                                    </div>
                                )}
                                <div className="mt-4 space-y-2">
                                     <Label>Выполните эту команду</Label>
                                    <div className="relative">
                                        <code className="block w-full text-sm p-3 pr-12 bg-muted rounded-md overflow-x-auto whitespace-pre-wrap">
                                            {curlCommand || 'Введите токен, чтобы сгенерировать команду.'}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8"
                                            onClick={handleCopy}
                                            disabled={!curlCommand}
                                        >
                                            {copied ? <Check className="text-green-500" /> : <Copy />}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Шаг 3: Начните использовать!</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <p className="text-sm text-muted-foreground">
                                    Отлично! Теперь вы можете отправлять любые текстовые сообщения вашему боту в Telegram, и они автоматически появятся в вашем Inbox в ChronoFlow как новые задачи.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
