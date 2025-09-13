
// Use dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Load environment variables from .env file
(async () => {
  const dotenv = await import('dotenv');
  dotenv.config();
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = `${process.env.NEXT_PUBLIC_URL}/api/telegram-webhook`;
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not defined in your environment variables.');
    process.exit(1);
  }
  
  if (!process.env.NEXT_PUBLIC_URL) {
    console.error('❌ NEXT_PUBLIC_URL is not defined in your environment variables.');
    process.exit(1);
  }
  
  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`;
  
  console.log('Setting Telegram webhook...');
  console.log(`> Bot Token: ...${botToken.slice(-6)}`);
  console.log(`> Webhook URL: ${webhookUrl}`);
  
  try {
    const response = await fetch(telegramApiUrl);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log(`   Description: ${data.description}`);
    } else {
      console.error('❌ Failed to set webhook:');
      console.error(`   Error Code: ${data.error_code}`);
      console.error(`   Description: ${data.description}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ An error occurred while trying to set the webhook:');
    console.error(error);
    process.exit(1);
  }
})();
