
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
    // Render a placeholder or nothing on the server to avoid build errors
    return <Button variant="outline" className="w-full" disabled><Telegram className="mr-2 size-5" />Loading Telegram...</Button>;
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    console.error("Telegram Bot Username is not set in environment variables.");
    if (mode === 'button') {
        return <Button variant="outline" disabled className="w-full"><Telegram className="mr-2 size-5" />Telegram Bot not configured</Button>
    }
    return <p className="text-destructive text-sm">Telegram Bot not configured.</p>;
  }


  if (mode === 'button') {
    return (
        <Button variant="outline" className="w-full" asChild>
           {/* This link should be constructed on client side to be safe */}
           <a href={`https://t.me/${botUsername}?start=login`}>
             <Telegram className="mr-2 size-5" />
             Login with Telegram
           </a>
        </Button>
    )
  }

  return (
    <>
      <div id="telegram-login-widget-container" className="flex justify-center">
        <Script
          src="https://telegram.org/js/telegram-widget.js?22"
          strategy="afterInteractive"
          onLoad={() => {
            const container = document.getElementById('telegram-login-widget-container');
            if (container && container.children.length === 0) {
                 const script = document.createElement('script');
                 script.src = "https://telegram.org/js/telegram-widget.js?22";
                 script.setAttribute('data-telegram-login', botUsername);
                 script.setAttribute('data-size', 'large');
                 script.setAttribute('data-onauth', 'onTelegramAuth(user)');
                 script.setAttribute('data-request-access', 'write');
                 script.async = true;
                 container.appendChild(script);
            }
          }}
        />
      </div>
    </>
  );
};


export default TelegramLoginButton;
