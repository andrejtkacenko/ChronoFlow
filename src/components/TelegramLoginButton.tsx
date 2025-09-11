'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

declare global {
    interface Window {
        onTelegramAuth: (user: any) => void;
    }
}

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: any) => void;
}

const TelegramLoginButton = ({ onAuth }: {onAuth: (user:any) => void}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        window.onTelegramAuth = onAuth;
    }
  }, [onAuth]);

  return (
    <>
      <Script
        async
        src="https://telegram.org/js/telegram-widget.js?22"
        onLoad={() => {
            const widget = (window as any).Telegram.Login.auth;
            if (ref.current && widget) {
                widget(ref.current, {
                    bot_id: process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID, // You need to get this from @BotFather
                    request_access: true,
                    lang: 'en',
                    origin: window.location.origin,
                    onauth: (user: any) => window.onTelegramAuth(user),
                })
            }
        }}
      />
      <div ref={ref}></div>
    </>
  );
};


export default TelegramLoginButton;
