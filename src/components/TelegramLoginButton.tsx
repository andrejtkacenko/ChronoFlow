
'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Telegram } from './icons/Telegram';

// Этот компонент отвечает ТОЛЬКО за виджет входа на обычном веб-сайте.
// Логика для Mini App находится в src/app/page.tsx
const TelegramLoginButton = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      console.error("Telegram Bot Username is not set in environment variables.");
      return;
    }

    const container = document.getElementById('telegram-login-widget-container');
    if (window.Telegram && container) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', 'large');
      // data-request-access убран для мгновенной авторизации без сообщения
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      
      // Очищаем контейнер перед добавлением нового скрипта
      container.innerHTML = '';
      container.appendChild(script);
    }
  }, [isClient]);

  if (!isClient) {
    return <Button variant="outline" className="w-full" disabled><Telegram className="mr-2 size-5" />Loading Telegram...</Button>;
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return <p className="text-destructive text-sm text-center">Telegram login is not configured.</p>;
  }

  return (
    <div className="flex justify-center w-full" id="telegram-login-widget-container" />
  );
};

export default TelegramLoginButton;
