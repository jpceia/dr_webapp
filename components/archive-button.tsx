"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Archive, Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface ArchiveButtonProps {
  announcementId: number
}

export function ArchiveButton({ announcementId }: ArchiveButtonProps) {
  const [isArchived, setIsArchived] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const router = useRouter()

  // Fetch archive status on mount
  useEffect(() => {
    async function fetchArchiveStatus() {
      try {
        const response = await fetch(`/api/procurements/${announcementId}/archive`)
        if (response.ok) {
          const data = await response.json()
          setIsArchived(data.isArchived)
        }
      } catch (error) {
        console.error('Error fetching archive status:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchArchiveStatus()
  }, [announcementId])

  const handleToggleArchive = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/procurements/${announcementId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: !isArchived
        })
      })

      if (response.ok) {
        const data = await response.json()
        setIsArchived(data.isArchived)
        // Reload the page to reflect changes
        router.refresh()
      } else {
        console.error('Failed to update archive status')
        alert('Erro ao atualizar o estado de arquivo')
      }
    } catch (error) {
      console.error('Error updating archive status:', error)
      alert('Erro ao atualizar o estado de arquivo')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="mb-6">
        <Button 
          disabled
          className="bg-gray-100 text-gray-400 border border-gray-300"
          size="default"
        >
          <Archive className="h-4 w-4 mr-2" />
          Carregando...
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <Button 
        onClick={handleToggleArchive}
        disabled={loading}
        className={`transition-all duration-200 ${
          isArchived 
            ? 'bg-green-100 hover:bg-green-200 text-green-900 border border-green-300' 
            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
        } shadow-sm`}
        size="default"
        title="Alterar estado de arquivamento do anúncio"
      >
        {isArchived ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            {loading ? 'Atualizando...' : 'Anúncio Arquivado'}
          </>
        ) : (
          <>
            <Archive className="h-4 w-4 mr-2" />
            {loading ? 'Arquivando...' : 'Arquivar Anúncio'}
          </>
        )}
      </Button>
    </div>
  )
}
