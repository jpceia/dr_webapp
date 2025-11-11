import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Coins, Building2, Clock } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/format-utils"
import { Decimal } from '@prisma/client/runtime/library'

interface ProcurementItem {
  id: number
  issuer: string | null
  number: string | null
  pdf_url: string | null
  summary: string | null
  publication_date: Date | null
  application_deadline: Date | string | null
  diario_id: number | null
  entity_id: string | null
  created_at: Date | null
  updated_at: Date | null
  aviso_modelo: string | null
  aviso_data_envio: Date | null
  processo_tipo: string | null
  processo_preco_base_existe: boolean | null
  processo_preco_base_valor: number | null
  has_lots: boolean | null
  processo_max_lotes_autorizado: number | null
  processo_max_lotes_concorrente: number | null
  object_internal_ref: string | null
  object_designation: string | null
  object_description: string | null
  object_main_contract_type: string | null
  object_contract_type: string | null
  object_main_cpv: string | null
  base_price: Decimal | null
  object_options: string | null
  has_bid_base_price: boolean | null
  object_type_of_goods: string | null
  applicable_legislation: string | null
  asset_valuation: Decimal | null
  object_options_description: string | null
  cpv_codes?: string[]
}

interface ProcurementCardProps {
  item: ProcurementItem
  viewMode?: 'grid' | 'list'
}

function getStatusBadge(item: ProcurementItem): {
  text: string
  variant: "default" | "destructive" | "success" | "warning"
} {
  if (!item.application_deadline) {
    return { text: "N/A", variant: "default" }
  }

  const now = new Date()
  
  // Parse application deadline properly (handles DD-MM-YYYY HH:MM format)
  let applicationDeadline: Date
  
  if (typeof item.application_deadline === 'string') {
    // Check if it's in DD-MM-YYYY HH:MM format
    const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})$/
    const match = item.application_deadline.match(ddmmyyyyPattern)
    
    if (match) {
      const [, day, month, year, hour, minute] = match
      // Create date object (month is 0-indexed in JS)
      applicationDeadline = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
    } else {
      // Try regular date parsing
      applicationDeadline = new Date(item.application_deadline)
    }
  } else {
    applicationDeadline = new Date(item.application_deadline)
  }

  // Check if date is valid
  if (isNaN(applicationDeadline.getTime())) {
    return { text: "N/A", variant: "default" }
  }

  // Calculate days difference (positive means deadline is in future, negative means past)
  const timeDiff = applicationDeadline.getTime() - now.getTime()
  const daysToDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

  if (daysToDeadline < 0) {
    return { text: "Expirado", variant: "destructive" }
  } else if (daysToDeadline <= 5) {
    return { text: "Prestes a expirar", variant: "warning" }
  } else {
    return { text: "Aberto", variant: "success" }
  }
}

export function ProcurementCard({ item, viewMode = 'grid' }: ProcurementCardProps) {
  const status = getStatusBadge(item)

  // List view layout - single row
  if (viewMode === 'list') {
    return (
      <Link href={`/procurement/${item.id}`} className="block group w-full">
        <Card className="w-full transition-all duration-200 hover:shadow-lg border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Status Badge */}
              <Badge variant={status.variant} className="shrink-0 text-xs whitespace-nowrap h-fit">
                {status.text}
              </Badge>

              {/* Main Content */}
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Title & Entity - takes more space */}
                <div className="md:col-span-4 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors truncate">
                    {item.object_designation}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.issuer}</span>
                  </div>
                </div>

                {/* Reference & CPV */}
                <div className="md:col-span-3 min-w-0">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Ref:</span> {item.number}
                  </div>
                  {item.cpv_codes && item.cpv_codes.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">CPV:</span> {item.cpv_codes.join(', ')}
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm">{formatPrice(item.base_price)}</span>
                </div>

                {/* Dates */}
                <div className="md:col-span-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{formatDate(item.publication_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{formatDate(item.application_deadline)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Grid view layout - original card design
  return (
    <Link href={`/procurement/${item.id}`} className="block group w-full">
      <Card className="h-full w-full max-w-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-border/50 flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors flex-1 min-w-0">
              {item.object_designation}
            </h3>
            <Badge variant={status.variant} className="shrink-0 text-xs whitespace-nowrap">
              {status.text}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="break-words min-w-0 flex-1">{item.issuer}</span>
          </div>
          <div className="mt-1">
            <span className="text-muted-foreground text-xs">
              <span className="font-medium">Ref:</span> {item.number}
            </span>
          </div>
          {item.cpv_codes && item.cpv_codes.length > 0 && (
            <div className="mt-1">
              <span className="text-muted-foreground text-xs">
                <span className="font-medium">CPV:</span> {item.cpv_codes.join(', ')}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-3 flex-grow">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">{formatPrice(item.base_price)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{formatDate(item.publication_date)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{formatDate(item.application_deadline)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
