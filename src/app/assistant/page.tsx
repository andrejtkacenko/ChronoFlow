
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatAssistantFlow } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';
import type { MessageData, ToolRequestPart, ToolResponsePart } from 'genkit';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

type ChatMessage = {
  role: 'user' | 'model';
  content: string; 
};

export default function AssistantPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history: MessageData[] = newMessages.map(
        (msg): MessageData => ({
          role: msg.role,
          content: [{ text: msg.content }],
        })
      );

      const response = await chatAssistantFlow({ userId: user.uid, history });

      const toolRequest = response.content.find(
        (part): part is ToolRequestPart => part.toolRequest !== undefined
      )?.toolRequest;

      const initialTextResponse = response.text;
      if (initialTextResponse) {
          const initialModelMessage: ChatMessage = { role: 'model', content: initialTextResponse };
          setMessages(prev => [...prev, initialModelMessage]);
      }

      if (toolRequest) {
        const toolResponse: MessageData = {
          role: 'tool',
          content: [{
              toolResponse: {
                name: toolRequest.name,
                output: { success: true, message: 'Tool executed on server.' },
              }
            } as ToolResponsePart
          ]
        };

        const finalHistory = [...history, response, toolResponse];
        const finalResponse = await chatAssistantFlow({userId: user.uid, history: finalHistory});

        const finalTextResponse = finalResponse.text;
        if(finalTextResponse) {
          const finalModelMessage: ChatMessage = { role: 'model', content: finalTextResponse };
          setMessages(prev => [...prev, finalModelMessage]);
        }
        
      } else if (!initialTextResponse) {
        toast({
          variant: 'destructive',
          title: 'Chat Error',
          description: 'Received an empty response from the assistant.',
        });
      }

    } catch (error: any) {
      console.error("Chat assistant error:", error);
      toast({
        variant: 'destructive',
        title: 'Chat Error',
        description: error.message || 'Sorry, I encountered an issue. Please try again.',
      });
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
           <ScrollArea className="flex-1 p-4" ref={scrollAreaRef as any}>
              <div className="space-y-6 max-w-4xl mx-auto w-full">
                {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-4',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'model' && <Bot className="flex-shrink-0 text-primary size-8" />}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-4 py-3 text-sm md:text-base',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                       <p>{message.content}</p>
                      </div>
                      {message.role === 'user' && <User className="flex-shrink-0 size-8" />}
                    </div>
                ))}
                {isLoading && (
                   <div className="flex items-start gap-4 justify-start">
                        <Bot className="flex-shrink-0 text-primary size-8" />
                        <div className="bg-muted rounded-lg px-4 py-3 text-sm flex items-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                   </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-4 bg-background">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex w-full items-center gap-4">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me to schedule a meeting for tomorrow at 2pm..."
                        className="flex-1 h-12 text-base"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="lg" disabled={isLoading || !input.trim()}>
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Send</span>
                    </Button>
                    </form>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
