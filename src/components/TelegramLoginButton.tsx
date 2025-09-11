
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button } from './ui/button';
import { Telegram } from './icons/Telegram';

declare global {
    interface Window {
        onTelegramAuth: (user: any) => void;
        Telegram: any;
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
  
  // For the widget, we need to load Telegram's script
  if (mode === 'widget') {
      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
      if (!botUsername) {
        console.error("Telegram Bot Username is not set in environment variables.");
        return <p className="text-destructive text-sm text-center">Telegram login is not configured.</p>;
      }
      return (
        <div id="telegram-login-widget-container" className="flex justify-center">
            <Script
            src="https://telegram.org/js/telegram-widget.js?22"
            strategy="afterInteractive"
            onLoad={() => {
                const container = document.getElementById('telegram-login-widget-container');
                if (container && container.querySelector('script') === null) {
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
      );
  }

  // For the button link (used on profile page for linking)
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    console.error("Telegram Bot Username is not set in environment variables.");
    return <Button variant="outline" disabled className="w-full"><Telegram className="mr-2 size-5" />Telegram Bot not configured</Button>
  }
  return (
      <Button variant="outline" className="w-full" asChild>
          <a href={`https://t.me/${botUsername}?start=login`}>
            <Telegram className="mr-2 size-5" />
            Link Telegram Account
          </a>
      </Button>
  );
};


export default TelegramLoginButton;
