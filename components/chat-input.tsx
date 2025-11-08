'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Globe, ArrowUp, AtSign } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t bg-background">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col gap-2 p-4">
          {/* Add context button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <AtSign className="h-3.5 w-3.5" />
              <span>Add context</span>
            </Button>
          </div>

          {/* Input area */}
          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask, search, or make anything..."
              disabled={disabled}
              className="min-h-[52px] pr-24 text-base"
            />
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <button
                type="button"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Paperclip className="h-4 w-4" />
                <span>Auto</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>All Sources</span>
              </button>
            </div>

            <Button
              type="submit"
              disabled={!input.trim() || disabled}
              size="icon"
              className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

