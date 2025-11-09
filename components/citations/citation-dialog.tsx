'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText } from 'lucide-react'
import type { CitationDetail } from './types'

interface CitationDialogProps {
  isOpen: boolean
  onClose: () => void
  citation: string
  details: CitationDetail | undefined
}

export function CitationDialog({ isOpen, onClose, citation, details }: CitationDialogProps) {
  if (!details) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">{citation}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Faculty Handbook</p>
            </div>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto py-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Content</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {details.content || details.content_preview}
              </p>
            </div>
          </div>
        </div>
        <div className="border-t pt-4" />
      </DialogContent>
    </Dialog>
  )
}

