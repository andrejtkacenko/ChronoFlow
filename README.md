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
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app/`: Contains all the pages of the application, following the Next.js App Router structure.
- `src/components/`: Shared React components used across the application.
- `src/components/ui/`: UI components from Shadcn/ui.
- `src/lib/`: Core logic, Firebase configuration, type definitions, and utility functions.
- `src/ai/`: Contains backend flows for scheduling logic.
- `src/hooks/`: Custom React hooks for authentication and other functionalities.
