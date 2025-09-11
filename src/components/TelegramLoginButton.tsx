
'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { Button } from './ui/button';
import { Telegram } from './icons/Telegram';

declare global {
    interface Window {
        onTelegramAuth?: (user: any) => void;
        Telegram?: any;
    }
}

interface TelegramLoginButtonProps {
  onAuth: (user: any) => void;
  mode?: 'button' | 'widget';
}

const TelegramLoginButton = ({ onAuth, mode = 'widget' }: TelegramLoginButtonProps) => {
  const [isClient, setIsClient] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        window.onTelegramAuth = (user) => {
          if (user) {
            onAuth(user);
          }
        };
    }
    
    // Cleanup to avoid memory leaks
    return () => {
      if (typeof window !== 'undefined' && window.onTelegramAuth) {
        delete window.onTelegramAuth;
      }
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
        <div ref={widgetContainerRef} className="flex justify-center w-full">
            <Script
                id="telegram-widget-script"
                src="https://telegram.org/js/telegram-widget.js?22"
                strategy="lazyOnload"
                onLoad={() => {
                  if (window.Telegram && widgetContainerRef.current) {
                    // Make sure the container is empty before appending
                    widgetContainerRef.current.innerHTML = '';
                    const script = document.createElement('script');
                    script.async = true;
                    script.src = 'https://telegram.org/js/telegram-widget.js?22';
                    script.setAttribute('data-telegram-login', botUsername);
                    script.setAttribute('data-size', 'large');
                    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
                    script.setAttribute('data-request-access', 'write');
                    widgetContainerRef.current.appendChild(script);
                  }
                }}
            />
        </div>
      );
  }

  // This mode is for linking from the profile page, less common now
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
