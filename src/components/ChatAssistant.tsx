
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
import { addScheduleItem as addClientScheduleItem } from '@/lib/client-actions';

type ChatMessage = {
  role: 'user' | 'model' | 'tool';
  content: any; // Simplified for easier handling of text and tool parts
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

  const processToolCall = async (toolRequest: any) => {
    const { name, input } = toolRequest;
    let output;

    try {
        if (name === 'createTaskOrEvent') {
            const { title, date, startTime, duration } = input;
            const type = date ? 'event' : 'task';
            await addClientScheduleItem({ userId, title, date, startTime, duration, type });
            output = { success: true, message: `${type === 'event' ? 'Event' : 'Task'} "${title}" created successfully.` };
        } 
        // NOTE: findTimeForTask and generateFullSchedule are designed to be triggered
        // from within other components, so we just return a message here.
        // A more advanced implementation could open the relevant dialog.
        else if (name === 'findTimeForTask') {
            output = { success: true, message: "Use the 'Smart Scheduler' to find time for tasks." };
        } else if (name === 'generateFullSchedule') {
            output = { success: true, message: "Use the 'Schedule Generator' to create a full schedule." };
        } else {
            throw new Error(`Unknown tool: ${name}`);
        }
    } catch (e: any) {
        output = { success: false, error: e.message };
    }
    
    return {
        role: 'tool',
        content: [{
            toolResponse: {
                toolCallId: toolRequest.toolCallId,
                name: name,
                output: output,
            },
        }],
    };
};

  const handleSubmit = async (e: React.FormEvent, initialMessages?: ChatMessage[]) => {
    e.preventDefault();
    if ((!input.trim() && !initialMessages) || isLoading) return;

    setIsLoading(true);

    let currentMessages = initialMessages || [...messages];

    if (!initialMessages) {
      const userMessage: ChatMessage = { role: 'user', content: [{ text: input }] };
      currentMessages = [...currentMessages, userMessage];
      setMessages(currentMessages);
      setInput('');
    }

    try {
      let response = await chatAssistantFlow({ userId, history: currentMessages });

      while(response?.content?.some((part: any) => part.toolRequest)) {
        const modelMessage: ChatMessage = { role: 'model', content: response.content };
        currentMessages = [...currentMessages, modelMessage];
        setMessages(currentMessages);

        const toolRequestPart = response.content.find((part: any) => part.toolRequest);
        if (toolRequestPart) {
            const toolResponseMessage = await processToolCall(toolRequestPart.toolRequest);
            currentMessages = [...currentMessages, toolResponseMessage];
            setMessages(currentMessages);

            // Call the flow again with the tool's response
            response = await chatAssistantFlow({ userId, history: currentMessages });
        }
      }
      
      const hasTextResponse = response?.content?.some((part: any) => part.text);

      if (hasTextResponse) {
          const finalModelMessage: ChatMessage = { role: 'model', content: response.content };
          setMessages(prev => [...prev, finalModelMessage]);
      } else if (!response) {
          // This case handles a truly empty or invalid response, which is an error.
          // A response with only a tool call is handled above and will not trigger this.
          throw new Error("Received an empty or invalid response from the assistant.");
      }

    } catch (error: any) {
      console.error("Chat assistant error:", error);
      toast({
        variant: 'destructive',
        title: 'Chat Error',
        description: error.message || 'Sorry, I encountered an issue. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = (msg: ChatMessage) => {
    if (!msg.content) return null;
    // Check if the message is from the user OR if it's from the model AND contains a text part.
    if (msg.role === 'user' || (msg.role === 'model' && msg.content.some((p: any) => p.text))) {
        return msg.content.map((part: any, index: number) => {
            if (part.text) {
                return <p key={index}>{part.text}</p>;
            }
            return null; // Don't render tool calls/responses directly, only text parts.
        });
    }
    // Don't render tool responses or tool-only messages from the model
    return null;
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
                {messages.map((message, index) => {
                  const content = renderContent(message);
                  if (!content) return null; // Don't render empty messages

                  return (
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
                       {content}
                      </div>
                      {message.role === 'user' && <User className="flex-shrink-0" />}
                    </div>
                  );
                })}
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
