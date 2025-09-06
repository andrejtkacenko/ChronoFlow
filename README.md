<<<<<<< HEAD

# ChronoFlow: AI-Powered Productivity Planner

**ChronoFlow** — это не просто календарь. Это умный ассистент по планированию, созданный для того, чтобы помочь вам взять под контроль свое время, сфокусироваться на главном и достигать долгосрочных целей без стресса и выгорания.

![ChronoFlow Dashboard](https://placehold.co/800x400?text=ChronoFlow+App+Screenshot)
*Представьте здесь скриншот вашего дашборда*

## 🚀 Ключевые возможности

- **Интерактивный дашборд:** Получайте сводку о предстоящем дне, быстрый доступ к основным функциям и полезные советы по продуктивности.
- **Визуальное планирование (Schedule View):** Управляйте своим днем в детальном почасовом представлении. Легко создавайте, редактируйте и перемещайте события и задачи.
- **Умный планировщик (Smart Scheduler):** Просто напишите список дел и их примерную продолжительность, а ChronoFlow проанализирует ваше текущее расписание и предложит оптимальные временные слоты.
- **Генератор расписания (AI Schedule Generator):** Самая мощная функция! Выберите задачи, укажите ваши предпочтения (сон, еда, спорт, работа, пики энергии), и AI создаст для вас сбалансированное расписание на несколько дней вперед.
- **Привычки и цели:** Интегрируйте свои привычки (спорт, чтение, медитация) и долгосрочные цели прямо в ваше расписание.
- **Календарь и Задачи (Inbox):** Классический вид календаря на месяц и отдельный список для задач, которые еще предстоит запланировать.
- **Адаптивный дизайн:** Приложение отлично выглядит и работает на любых устройствах.

## 🌱 Планы на будущее (Roadmap)

ChronoFlow постоянно развивается. Вот некоторые из функций, которые планируются к добавлению:

- **Система проектов:** Возможность группировать задачи в более крупные проекты с отслеживанием общего прогресса.
- **Аналитика и отчеты:** Визуальные отчеты о том, как вы тратите свое время, ваша продуктивность по дням и неделям.
- **Интеграция с внешними календарями:** Синхронизация с Google Calendar, Apple Calendar и другими.
- **Теги и расширенные фильтры:** Более гибкая организация задач с помощью тегов и возможность фильтровать вид по ним.
- **Напоминания и уведомления:** Настройка push-уведомлений о предстоящих событиях и задачах.


## 🛠 Технологический стек

- **Фреймворк:** [Next.js](https://nextjs.org/) (App Router)
- **Язык:** [TypeScript](https://www.typescriptlang.org/)
- **Библиотека UI:** [React](https://react.dev/)
- **База данных и аутентификация:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)
- **AI/ML:** [Google AI Studio (Genkit)](https://ai.google.dev/genkit) для генерации расписаний и умных предложений.
- **Стилизация:** [Tailwind CSS](https://tailwindcss.com/)
- **Компоненты:** [ShadCN/UI](https://ui.shadcn.com/)
- **Работа с формами:** [React Hook Form](https://react-hook-form.com/)
- **Работа с датами:** [date-fns](https://date-fns.org/)

## ⚙️ Установка и запуск

Чтобы запустить проект локально, выполните следующие шаги:

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/your-username/chronoflow.git
    cd chronoflow
    ```

2.  **Установите зависимости:**
    ```bash
    npm install
    # или
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

4.  **Запустите приложение в режиме разработки:**
=======
<<<<<<< HEAD

# ChronoFlow

ChronoFlow — это умное приложение для повышения продуктивности, разработанное, чтобы помочь вам управлять своим временем с помощью интуитивно понятного интерфейса и интеллектуальных функций планирования.

![Снимок экрана главной панели ChronoFlow](https://placehold.co/800x400/22252a/94a3b8/png?text=ChronoFlow+Dashboard)

## 🚀 Основные возможности

*   **Интерактивный календарь и расписание:** Визуализируйте свое расписание по дням, неделям или месяцам. Легко перетаскивайте и изменяйте события.
*   **Умный инбокс:** Собирайте все свои задачи и идеи в одном месте, прежде чем они попадут в ваш календарь.
*   **Помощник по планированию:** Автоматически находите оптимальные временные слоты для ваших новых задач, основываясь на вашем текущем расписании и предпочтениях.
*   **Генератор расписания:** Позвольте приложению создать для вас полное, сбалансированное расписание на несколько дней вперед, учитывая ваши рабочие часы, привычки и цели.
*   **Персональные настройки:** Настройте свои рабочие часы, продолжительность сна, привычки и энергетические пики для более точного планирования.
*   **Безопасная аутентификация:** Управление пользователями и аутентификация реализованы с помощью Firebase.

## 🛠️ Стек технологий

*   **Фреймворк:** [Next.js](https://nextjs.org/) (App Router)
*   **Язык:** [TypeScript](https://www.typescriptlang.org/)
*   **Стилизация:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI-компоненты:** [ShadCN UI](https://ui.shadcn.com/)
*   **Бэкенд и база данных:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)
*   **Интеграция с ИИ:** [Genkit](https://firebase.google.com/docs/genkit)

## ⚙️ Начало работы

Чтобы запустить проект локально, следуйте этим шагам.

### Предварительные требования

*   [Node.js](https://nodejs.org/en/) (версия 18.x или выше)
*   `npm` или `yarn`

### 1. Клонирование репозитория

```bash
git clone <URL-вашего-репозитория>
cd <название-папки-проекта>
```

### 2. Установка зависимостей

```bash
npm install
# или
yarn install
```

### 3. Настройка переменных окружения

Вам необходимо настроить Firebase для проекта.

1.  Создайте проект в [консоли Firebase](https://console.firebase.google.com/).
2.  Добавьте веб-приложение в ваш проект и скопируйте объект конфигурации Firebase.
3.  Переименуйте файл `.env.example` в `.env.local`.
4.  Заполните `.env.local` вашими ключами из конфигурации Firebase. Файл должен выглядеть так:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...

# Genkit/Google AI
GEMINI_API_KEY=AIza...
```

**Важно:** Переменная `GEMINI_API_KEY` необходима для работы функций Genkit. Вы можете получить ключ в [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Запуск сервера для разработки

Откройте два терминала:

1.  В первом терминале запустите основное Next.js приложение:
=======
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

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **Backend Logic**: Genkit for orchestrating complex scheduling logic.
- **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)

## Getting Started

To get the project running locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add your Firebase project configuration keys.

4.  **Run the development server:**
>>>>>>> a5286bc0135e383f0e80f38efd837c27c2d20328
>>>>>>> 68c08379a6de392596bc0260ff651321d1da85ae
    ```bash
    npm run dev
    ```

<<<<<<< HEAD
5.  Откройте [http://localhost:3000](http://localhost:3000) в вашем браузere.

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. Подробности смотрите в файле `LICENSE`.
=======
<<<<<<< HEAD
2.  Во втором терминале запустите локальный сервер Genkit, который обрабатывает все AI-запросы:
    ```bash
    npm run genkit:watch
    ```

Откройте [http://localhost:9002](http://localhost:9002) в вашем браузере, чтобы увидеть результат.

## 📁 Структура проекта

```
.
├── src/
│   ├── app/                # Основные страницы приложения (App Router)
│   ├── components/         # Переиспользуемые React-компоненты
│   │   ├── ui/             # UI-компоненты от ShadCN
│   │   └── ...
│   ├── ai/                 # Все, что связано с Genkit и AI
│   │   ├── flows/          # AI-воркфлоу (генерация расписания и т.д.)
│   │   └── genkit.ts       # Конфигурация Genkit
│   ├── hooks/              # Пользовательские React-хуки (например, useAuth)
│   ├── lib/                # Вспомогательные функции, типы и настройка Firebase
│   └── ...
├── public/                 # Статические ассеты
├── .env.local              # Локальные переменные окружения
├── next.config.ts          # Конфигурация Next.js
└── ...
```
=======
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app/`: Contains all the pages of the application, following the Next.js App Router structure.
- `src/components/`: Shared React components used across the application.
- `src/components/ui/`: UI components from Shadcn/ui.
- `src/lib/`: Core logic, Firebase configuration, type definitions, and utility functions.
- `src/ai/`: Contains backend flows for scheduling logic.
- `src/hooks/`: Custom React hooks for authentication and other functionalities.
>>>>>>> a5286bc0135e383f0e80f38efd837c27c2d20328
>>>>>>> 68c08379a6de392596bc0260ff651321d1da85ae
