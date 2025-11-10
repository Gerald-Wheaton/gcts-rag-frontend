'use client'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileText } from 'lucide-react'
import type { CitationDetail } from './types'
import { Separator } from '@/components/ui/separator'

interface CitationDialogProps {
  isOpen: boolean
  onClose: () => void
  citation: string
  details: CitationDetail | undefined
}

export function CitationDialog({
  isOpen,
  onClose,
  citation,
  details,
}: CitationDialogProps) {
  if (!details) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-black/10 rounded-md p-2">
              <FileText size={24} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {citation}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Faculty Handbook</p>
            </div>
          </div>
        </DialogHeader>
        <Separator className="mb-4" />

        <div className="overflow-y-auto px-6">
          <h4 className="text-sm font-medium mb-2">Content</h4>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {details.content || details.content_preview}
          </div>
        </div>
        <DialogFooter>
          <Separator className="my-4" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
