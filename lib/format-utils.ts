import { Decimal } from '@prisma/client/runtime/library'

export function formatPrice(price: Decimal | number | null): string {
  if (!price) return "N/A"
  const numPrice = typeof price === 'number' ? price : Number(price.toString())
  if (isNaN(numPrice)) return "N/A"
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(numPrice)
}

export function formatDate(dateString: Date | string | null): string {
  if (!dateString) return "N/A"
  
  let date: Date
  
  // Handle different date formats
  if (typeof dateString === 'string') {
    // Check if it's in DD-MM-YYYY HH:MM format (application_deadline)
    const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})$/
    const match = dateString.match(ddmmyyyyPattern)
    
    if (match) {
      const [, day, month, year, hour, minute] = match
      // Create date object (month is 0-indexed in JS)
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
    } else {
      // Try regular date parsing
      date = new Date(dateString)
    }
  } else {
    date = new Date(dateString)
  }
  
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString("pt-PT")
  }

  return "N/A"
}

export interface AnnouncementItem {
  id: number
  publication_date: Date | null
  application_deadline: Date | string | null
  diario_id: number | null
  entity_id: string | null
  created_at: Date | null
  updated_at: Date | null
  issuer: string | null
  number: string | null
  pdf_url: string | null
  summary: string | null
  aviso_modelo: string | null
  aviso_data_envio: Date | null
  processo_tipo: string | null
  processo_preco_base_existe: boolean | null
  processo_preco_base_valor: Decimal | null
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
}

export function getStatusBadge(item: AnnouncementItem): {
  text: string
  variant: "default" | "destructive" | "success" | "warning"
} {
  // Since we don't have application_deadline in this table structure,
  // we'll use publication_date to determine status
  if (!item.publication_date) {
    return { text: "N/A", variant: "default" }
  }

  const now = new Date()
  const pubDate = new Date(item.publication_date)
  const daysSincePublication = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSincePublication < 7) {
    return { text: "Novo", variant: "success" }
  } else if (daysSincePublication < 30) {
    return { text: "Recente", variant: "warning" }
  } else {
    return { text: "Publicado", variant: "default" }
  }
}