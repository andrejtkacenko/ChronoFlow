
'use client';

import { useEffect } from 'react';

// Этот компонент отвечает ТОЛЬКО за виджет входа на обычном веб-сайте.
// Логика для Mini App находится в src/app/page.tsx
const TelegramLoginButton = () => {

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      console.error("Telegram Bot Username is not set in environment variables.");
      return;
    }

    const container = document.getElementById('telegram-login-container');
    if (!container) return;

    // Очищаем контейнер перед добавлением нового скрипта, чтобы избежать дублирования
    container.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    // data-request-access убран для мгновенной авторизации
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    container.appendChild(script);

  }, []);


  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    return <p className="text-destructive text-sm text-center">Telegram login is not configured.</p>;
  }

  // Этот div будет контейнером для виджета, который сгенерирует скрипт
  return (
    <div id="telegram-login-container" className="flex justify-center w-full" />
  );
};

export default TelegramLoginButton;
