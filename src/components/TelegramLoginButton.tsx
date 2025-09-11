'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
        window.onTelegramAuth = onAuth;
    }
  }, [onAuth]);

  const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;

  if (!botId) {
    console.error("NEXT_PUBLIC_TELEGRAM_BOT_ID is not set.");
    if (mode === 'button') {
        return <Button variant="outline" disabled>Telegram Bot ID not configured</Button>
    }
    return <p className="text-destructive text-sm">Telegram Bot ID not configured.</p>;
  }

  const telegramAuthUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(window.location.origin)}&request_access=write&return_to=${encodeURIComponent(window.location.origin + '/telegram-auth-callback')}`;


  if (mode === 'button') {
    return (
        <Button variant="outline" className="w-full" asChild>
           <a href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=login`}>
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
      />
      <iframe
        id="telegram-login-widget"
        src={`https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(
          window.location.origin
        )}&request_access=write`}
        width="100%"
        height="50"
        frameBorder="0"
        style={{ overflow: 'hidden', minWidth: '220px', borderRadius: '8px' }}
        scrolling="no"
      ></iframe>
    </>
  );
};


export default TelegramLoginButton;
