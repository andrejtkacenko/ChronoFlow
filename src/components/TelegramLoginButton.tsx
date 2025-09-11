
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button } from './ui/button';
import { Telegram } from './icons/Telegram';

declare global {
    interface Window {
        onTelegramAuth: (user: any) => void;
    }
}

interface TelegramLoginButtonProps {
  onAuth: (user: any) => void;
  mode?: 'button' | 'widget';
}

const TelegramLoginButton = ({ onAuth, mode = 'widget' }: TelegramLoginButtonProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
        window.onTelegramAuth = onAuth;
    }
  }, [onAuth]);

  if (!isClient) {
    // Render a placeholder or nothing on the server
    return null;
  }

  const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (!botId || !botUsername) {
    console.error("Telegram Bot ID or Username is not set in environment variables.");
    if (mode === 'button') {
        return <Button variant="outline" disabled>Telegram Bot not configured</Button>
    }
    return <p className="text-destructive text-sm">Telegram Bot not configured.</p>;
  }


  if (mode === 'button') {
    return (
        <Button variant="outline" className="w-full" asChild>
           <a href={`https://t.me/${botUsername}?start=login`}>
             <Telegram className="mr-2 size-5" />
             Login with Telegram
           </a>
        </Button>
    )
  }

  return (
    <>
      <Script
        id="telegram-widget-script"
        strategy="afterInteractive"
        src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login={botUsername}
        data-size="large"
        data-onauth="onTelegramAuth(user)"
        data-request-access="write"
      />
    </>
  );
};


export default TelegramLoginButton;
