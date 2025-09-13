
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatAssistantFlow } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule, addScheduleItem } from '@/lib/actions';


type ChatMessage = {
  role: 'user' | 'model';
  content: { text?: string; toolRequest?: any; toolResponse?: any }[];
};

export default function ChatAssistant({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: [{ text: input }] };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatAssistantFlow({ userId, history: [...messages, userMessage] });
      
      if (!response || !response.content) {
        throw new Error("Received an empty response from the assistant.");
      }

      const modelMessage: ChatMessage = { role: 'model', content: response.content };
      setMessages((prev) => [...prev, modelMessage]);

    } catch (error) {
      console.error("Chat assistant error:", error);
      toast({
        variant: 'destructive',
        title: 'Chat Error',
        description: 'Sorry, I encountered an issue. Please try again.',
      });
      // Remove the user's message if the API call fails
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAction = async (toolCallId: string, toolName: string, args: any) => {
      if (toolName === 'createTaskOrEvent') {
          const { title, date, startTime, duration } = args;
          await addScheduleItem({ userId, title, date, startTime, duration, type: date ? 'event': 'task' });
          toast({ title: 'Success', description: `Task/event "${title}" created.`});
      } else {
           toast({ title: 'Action triggered', description: `Running: ${toolName}`});
      }
       // You can add more client-side handlers for other tools if needed
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className="rounded-full w-14 h-14 shadow-lg"
          aria-label="Toggle Chat Assistant"
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </Button>
      </div>

      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-50 w-full max-w-sm h-[60vh] flex flex-col shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="text-primary" /> AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4" ref={scrollAreaRef as any}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'model' && <Bot className="flex-shrink-0 text-primary" />}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.content && message.content.map((part, partIndex) => {
                        if (part.text) {
                          return <p key={partIndex}>{part.text}</p>;
                        }
                        if (part.toolRequest) {
                            return (
                                <div key={partIndex} className="bg-background/50 p-2 rounded my-1 border">
                                    <p className="text-xs font-semibold">Running tool: {part.toolRequest.name}</p>
                                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(part.toolRequest.input, null, 2)}</pre>
                                     <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => handleAction(part.toolRequest.toolCallId, part.toolRequest.name, part.toolRequest.input)}>
                                        Confirm & Run
                                    </Button>
                                </div>
                            );
                        }
                        return null;
                      })}
                    </div>
                    {message.role === 'user' && <User className="flex-shrink-0" />}
                  </div>
                ))}
                {isLoading && (
                   <div className="flex items-start gap-3 justify-start">
                        <Bot className="flex-shrink-0 text-primary" />
                        <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                   </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to create a task..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
