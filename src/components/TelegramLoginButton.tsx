'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button } from './ui/button';
import { Telegram } from './icons/Telegram';

declare global {
    interface Window {
        Telegram?: any;
    }
}

// Этот компонент теперь отвечает только за виджет на сайте.
// Вся логика Mini App переехала на /src/app/page.tsx
const TelegramLoginButton = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <Button variant="outline" className="w-full" disabled><Telegram className="mr-2 size-5" />Loading Telegram...</Button>;
  }
  
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    console.error("Telegram Bot Username is not set in environment variables.");
    return <p className="text-destructive text-sm text-center">Telegram login is not configured.</p>;
  }
  
  return (
    <div className="flex justify-center w-full" id="telegram-login-widget-container">
        <Script
            id="telegram-widget-script"
            src="https://telegram.org/js/telegram-widget.js?22"
            strategy="lazyOnload"
            onLoad={() => {
                const container = document.getElementById('telegram-login-widget-container');
                if (window.Telegram && container) {
                    const script = document.createElement('script');
                    script.async = true;
                    script.src = 'https://telegram.org/js/telegram-widget.js?22';
                    script.setAttribute('data-telegram-login', botUsername);
                    script.setAttribute('data-size', 'large');
                    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
                    script.setAttribute('data-request-access', 'write');
                    // Очищаем контейнер перед добавлением нового скрипта
                    container.innerHTML = '';
                    container.appendChild(script);
                }
            }}
        />
    </div>
  );
};


export default TelegramLoginButton;