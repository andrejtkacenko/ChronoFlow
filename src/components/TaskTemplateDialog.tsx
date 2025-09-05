
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, PersonStanding as Run, BookOpen, BrainCircuit, Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addScheduleItem } from '@/lib/client-actions';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { cn } from '@/lib/utils';

interface TaskTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
}

type Template = 'running' | 'reading' | 'meditation' | 'gym';

const templates: { id: Template; name: string; icon: React.ElementType }[] = [
  { id: 'running', name: 'Пробежка', icon: Run },
  { id: 'reading', name: 'Чтение', icon: BookOpen },
  { id: 'meditation', name: 'Медитация', icon: BrainCircuit },
  { id: 'gym', name: 'Тренировка', icon: Dumbbell },
];

export default function TaskTemplateDialog({ isOpen, onOpenChange, userId }: TaskTemplateDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration state
  const [runType, setRunType] = useState<'distance' | 'duration'>('distance');
  const [runValue, setRunValue] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [readType, setReadType] = useState<'pages' | 'chapters'>('pages');
  const [readValue, setReadValue] = useState('');
  const [meditationDuration, setMeditationDuration] = useState('');
  const [gymType, setGymType] = useState('');

  const resetState = () => {
    setStep('select');
    setSelectedTemplate(null);
    setIsLoading(false);
    setRunType('distance');
    setRunValue('');
    setBookTitle('');
    setReadType('pages');
    setReadValue('');
    setMeditationDuration('');
    setGymType('');
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setStep('configure');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let title = '';
    let icon = 'Default';

    switch (selectedTemplate) {
      case 'running':
        title = `Пробежка: ${runValue} ${runType === 'distance' ? 'км' : 'минут'}`;
        icon = 'PersonStanding';
        break;
      case 'reading':
        const readUnit = readType === 'pages' ? 'страниц' : 'глав';
        title = `Чтение: ${bookTitle} (${readValue} ${readUnit})`;
        icon = 'BookOpen';
        break;
      case 'meditation':
        title = `Медитация: ${meditationDuration} минут`;
        icon = 'BrainCircuit';
        break;
      case 'gym':
        title = `Тренировка в зале: ${gymType}`;
        icon = 'Dumbbell';
        break;
      default:
        toast({ variant: 'destructive', title: 'Неизвестный шаблон' });
        setIsLoading(false);
        return;
    }

    try {
      await addScheduleItem({
        userId,
        title,
        type: 'task',
        icon,
      });
      toast({ title: 'Задача добавлена в инбокс' });
      handleOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось добавить задачу' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfiguration = () => {
    switch (selectedTemplate) {
      case 'running':
        return (
          <div className="space-y-4">
            <RadioGroup defaultValue="distance" value={runType} onValueChange={(v) => setRunType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="distance" id="r1" />
                <Label htmlFor="r1">Дистанция (км)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="duration" id="r2" />
                <Label htmlFor="r2">Длительность (минут)</Label>
              </div>
            </RadioGroup>
            <Input
              type="number"
              placeholder={runType === 'distance' ? 'например, 5' : 'например, 30'}
              value={runValue}
              onChange={(e) => setRunValue(e.target.value)}
              required
            />
          </div>
        );
      case 'reading':
        return (
          <div className="space-y-4">
            <Label htmlFor="book-title">Название книги</Label>
            <Input id="book-title" placeholder="Мастер и Маргарита" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} required />
            <RadioGroup defaultValue="pages" value={readType} onValueChange={(v) => setReadType(v as any)}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="pages" id="p1" /><Label htmlFor="p1">Количество страниц</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="chapters" id="p2" /><Label htmlFor="p2">Количество глав</Label></div>
            </RadioGroup>
            <Input type="number" placeholder={readType === 'pages' ? 'например, 50' : 'например, 3'} value={readValue} onChange={(e) => setReadValue(e.target.value)} required />
          </div>
        );
      case 'meditation':
        return (
          <div className="space-y-2">
            <Label htmlFor="meditation-duration">Длительность (минут)</Label>
            <Input id="meditation-duration" type="number" placeholder="например, 20" value={meditationDuration} onChange={(e) => setMeditationDuration(e.target.value)} required />
          </div>
        );
      case 'gym':
        return (
          <div className="space-y-2">
            <Label htmlFor="gym-type">Тип тренировки</Label>
            <Input id="gym-type" placeholder="например, Ноги" value={gymType} onChange={(e) => setGymType(e.target.value)} required />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'configure' && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('select')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'select' ? 'Выберите шаблон задачи' : 'Настройте задачу'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select'
              ? 'Выберите один из готовых шаблонов, чтобы быстро добавить задачу.'
              : 'Укажите детали и добавьте задачу в свой инбокс.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleSelectTemplate(template.id)}
              >
                <template.icon className="h-6 w-6 text-primary" />
                <span>{template.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="py-4">{renderConfiguration()}</div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Добавить в инбокс
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
