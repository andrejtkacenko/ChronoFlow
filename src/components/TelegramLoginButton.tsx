
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
    return <Button variant="outline" className="w-full" disabled><Telegram className="mr-2 size-5" />Loading Telegram...</Button>;
  }
  
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    console.error("Telegram Bot Username is not set in environment variables.");
    return <p className="text-destructive text-sm text-center">Telegram login is not configured.</p>;
  }

  if (mode === 'widget') {
      return (
        <div id={`telegram-login-${Math.random()}`} className="flex justify-center">
            <Script
            src="https://telegram.org/js/telegram-widget.js?22"
            strategy="lazyOnload"
            onLoad={() => {
                if (window.Telegram) {
                    window.Telegram.Login.auth(
                        { bot_username: botUsername, request_access: 'write' },
                        (data: any) => {
                            if (!data) return;
                            onAuth(data);
                        }
                    );
                }
            }}
            />
             <div id="telegram-login-widget-container" className="flex justify-center">
                <script
                    async
                    src="https://telegram.org/js/telegram-widget.js?22"
                    data-telegram-login={botUsername}
                    data-size="large"
                    data-onauth="onTelegramAuth(user)"
                    data-request-access="write"
                ></script>
            </div>
        </div>
      );
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
