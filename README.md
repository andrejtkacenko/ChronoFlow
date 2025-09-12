
# ChronoFlow

ChronoFlow is a modern, intelligent scheduling application designed to help you organize your time, manage tasks, and master your productivity. With a clean interface and powerful features, it's the perfect tool to plan your days with precision and clarity.

## Key Features

- **Interactive Schedule View**: A dynamic multi-day calendar interface to visualize your schedule, with drag-and-drop capabilities and different view modes (1, 3, or 7 days).
- **Inbox for Tasks**: A dedicated space for your unscheduled tasks. Plan them later or let the scheduling assistant find the best time for them.
- **Smart Time Slot Suggestions**: The assistant can analyze your current schedule and suggest the most optimal, conflict-free time slots for your new tasks.
- **Full Schedule Generation**: Automatically generate a complete, multi-day schedule based on your tasks, daily routines (sleep, meals), and personal preferences.
- **Customizable Preferences**: Tailor the scheduling engine to your lifestyle by setting your work hours, sleep duration, daily habits, and productivity peaks.
- **Secure Authentication**: User accounts are managed through Firebase Authentication, ensuring your data is safe and private.
- **Component-Based UI**: Built with the best practices of modern web development, featuring a responsive and accessible user interface.
- **Telegram Bot Integration**: Manage your schedule on the go. Add tasks and events using natural language.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **AI/ML**: [Google AI Studio (Genkit)](https://ai.google.dev/genkit) for generating schedules and smart suggestions.
- **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)

## Getting Started

To get the project running locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/chronoflow.git
    cd chronoflow
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Настройте переменные окружения:**
    *   Создайте Firebase проект в [консоли Firebase](https://console.firebase.google.com/).
    *   Добавьте веб-приложение и скопируйте его конфигурацию.
    *   Переименуйте файл `.env.example` в `.env.local`.
    *   Вставьте вашу конфигурацию Firebase в `.env.local`:
        ```.env
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
        ```
    *   Включите Google AI (Gemini) в вашем проекте Google Cloud и добавьте API ключ в `.env.local`:
        ```.env
        GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
        ```
    *   **Для серверной аутентификации (например, для входа через Telegram) вам понадобится ключ сервисного аккаунта Firebase:**
        1.  В [консоли Firebase](https://console.firebase.google.com/) откройте ваш проект.
        2.  Перейдите в **Настройки проекта** (иконка ⚙️) -> **Сервисные аккаунты**.
        3.  Нажмите **"Создать новый закрытый ключ"**.
        4.  Скачается JSON-файл. Скопируйте **ВСЁ его содержимое** и вставьте в `.env.local` как одну строку:
            ```.env
            FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": ...}'
            ```
    *   **Для интеграции с Telegram-ботом, добавьте его данные:**
        - `TELEGRAM_BOT_TOKEN`: Секретный токен вашего бота (получается у @BotFather).
        - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`: Имя пользователя вашего бота (например, `MyChronoFlowBot`).
        - `NEXT_PUBLIC_TELEGRAM_BOT_ID`: ID вашего бота (можно узнать у `@userinfobot`, переслав ему сообщение от вашего бота).
        - `NEXT_PUBLIC_URL`: Полный URL вашего развернутого приложения (например, `https://your-app.vercel.app`). Это необходимо для кнопки входа в боте.
        ```.env
        TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
        NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="YOUR_BOT_USERNAME"
        NEXT_PUBLIC_TELEGRAM_BOT_ID="YOUR_BOT_ID"
        NEXT_PUBLIC_URL="https://your-app.vercel.app"
        ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Откройте [http://localhost:3000](http://localhost:3000) в вашем браузere.

## Telegram Bot Commands

The bot is designed to understand natural language, but it also has a few direct commands:
- `/start`: Greet the bot and check if your account is linked.
- `/help`: Shows a help message with examples of how to interact with the bot.

You can add tasks to your inbox (`buy milk`), schedule specific events (`meeting tomorrow at 10am`), or ask the bot to find time for you (`schedule a haircut next week`).

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. Подробности смотрите в файле `LICENSE`.
