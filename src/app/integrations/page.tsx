
import Header from "@/components/Header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, Bot } from "lucide-react";
import Link from "next/link";
import { Telegram } from "@/components/icons/Telegram";

const integrations: any[] = [
    {
        name: "Telegram Bot",
        description: "Add tasks to your inbox directly from Telegram.",
        icon: Telegram,
        href: "/integrations/telegram"
    }
]

export default function IntegrationsPage() {
    return (
        <div className="flex h-svh flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Integrations</h1>
                    <p className="text-muted-foreground mb-6">
                        Connect ChronoFlow with your favorite tools to streamline your workflow.
                    </p>

                    {integrations.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {integrations.map((integration) => (
                               <Link href={integration.href} key={integration.name}>
                                 <Card className="hover:border-primary/80 transition-colors h-full">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <integration.icon className="size-8 text-primary" />
                                            <div>
                                                <CardTitle>{integration.name}</CardTitle>
                                                <CardDescription className="mt-1">{integration.description}</CardDescription>
                                            </div>
                                        </div>
                                        <ArrowRight className="size-5 text-muted-foreground" />
                                    </CardHeader>
                                 </Card>
                               </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                            <p className="font-semibold">No integrations available.</p>
                            <p className="text-sm mt-1">Check back later for more ways to connect your tools.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
