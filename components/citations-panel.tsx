'use client';

import { Citation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface CitationsPanelProps {
  citations: Citation[];
}

export function CitationsPanel({ citations }: CitationsPanelProps) {
  if (citations.length === 0) {
    return (
      <div className="hidden lg:flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Citations will appear here</p>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex h-full flex-col border-l bg-muted/20">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold">Citations</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {citations.length} {citations.length === 1 ? 'source' : 'sources'}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {citations.map((citation) => (
            <Card key={citation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {citation.title}
                  </CardTitle>
                </div>
                {citation.sectionPath && (
                  <Badge variant="outline" className="w-fit text-xs mt-2">
                    {citation.sectionPath}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {citation.content}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {citation.source}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

