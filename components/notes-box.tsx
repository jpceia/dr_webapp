"use client"

import { useState, useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ChevronDown, ChevronUp, Save, Eye, Edit, PenLine, Trash2 } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface NotesBoxProps {
  announcementId: number
}

export function NotesBox({ announcementId }: NotesBoxProps) {
  const [noteText, setNoteText] = useState<string>("")
  const [savedNoteText, setSavedNoteText] = useState<string>("")
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [isPreview, setIsPreview] = useState<boolean>(false) // Default to edit mode
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [noteExists, setNoteExists] = useState<boolean>(false) // Track if note exists in DB
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch existing note on mount
  useEffect(() => {
    async function fetchNote() {
      try {
        const response = await fetch(`/api/procurements/${announcementId}/notes`)
        if (response.ok) {
          const data = await response.json()
          if (data.note) {
            const text = data.note.note_text || ""
            setNoteText(text)
            setSavedNoteText(text)
            setNoteExists(true) // Note exists in database
            // Only set preview mode if there's actual text
            if (text.trim()) {
              setIsPreview(true)
            } else {
              setIsPreview(false)
            }
          } else {
            // No note exists, start in edit mode
            setNoteExists(false)
            setIsPreview(false)
          }
        }
      } catch (error) {
        console.error("Error fetching note:", error)
        setNoteExists(false)
        setIsPreview(false) // Default to edit mode on error
      }
    }
    
    fetchNote()
  }, [announcementId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/procurements/${announcementId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ noteText }),
      })

      if (response.ok) {
        setSavedNoteText(noteText)
        setNoteExists(true) // Note now exists in database
        // Only switch to preview if there's actual text
        if (noteText.trim()) {
          setIsPreview(true)
        }
      } else {
        console.error("Failed to save note")
      }
    } catch (error) {
      console.error("Error saving note:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Tem a certeza que deseja apagar esta nota da base de dados?")) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/procurements/${announcementId}/notes`, {
        method: "DELETE",
      })

      if (response.ok) {
        setNoteText("")
        setSavedNoteText("")
        setNoteExists(false) // Note no longer exists in database
        setIsPreview(false) // Switch to edit mode after deleting
      } else {
        console.error("Failed to delete note")
      }
    } catch (error) {
      console.error("Error deleting note:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const hasChanges = noteText !== savedNoteText

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PenLine className="h-5 w-5" />
            <span>Escrever Notas</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isPreview ? (
            <div 
              className={`prose prose-sm max-w-none p-3 border rounded-md bg-slate-50 transition-all duration-200 ${
                isExpanded ? "min-h-[200px] max-h-[400px]" : "min-h-[60px] max-h-[60px]"
              } overflow-auto`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {noteText}
              </ReactMarkdown>
            </div>
          ) : (
            <Textarea
              value={noteText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
              placeholder="Escreva as suas notas aqui... (suporta Markdown: **negrito**, *itálico*, # títulos, etc.)"
              className={`resize-none transition-all duration-200 overflow-auto ${
                isExpanded ? "h-[400px]" : "h-[60px]"
              }`}
            />
          )}
          <div className="flex justify-between items-center">
            <div>
              {noteExists && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "A apagar..." : "Apagar"}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {noteText && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreview(!isPreview)}
                  className="gap-2"
                >
                  {isPreview ? (
                    <>
                      <Edit className="h-4 w-4" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Pré-visualizar
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
