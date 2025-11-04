import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { AnnouncementItem } from './format-utils'

// Helper function to safely parse date from string
function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

// Helper function to safely parse decimal from string
function parseDecimal(value: string | null): Decimal | null {
  if (!value || value === '') return null
  const num = parseFloat(value)
  return isNaN(num) ? null : new Decimal(num)
}

// Helper function to safely parse boolean from string
function parseBoolean(value: string | null): boolean | null {
  if (!value || value === '') return null
  return value.toLowerCase() === 'true' || value === '1'
}

// Helper function to safely parse integer from string
function parseInt(value: string | null): number | null {
  if (!value || value === '') return null
  const num = Number(value)
  return isNaN(num) ? null : Math.floor(num)
}

// Convert announcement record to AnnouncementItem interface for compatibility
function convertAnnouncementToItem(announcement: any): AnnouncementItem {
  return {
    ...announcement,
    id: announcement.id,
    publication_date: announcement.publication_date,
    application_deadline: announcement.application_deadline,
    base_price: announcement.base_price ? Number(announcement.base_price) : null,
    processo_preco_base_valor: announcement.processo_preco_base_valor ? Number(announcement.processo_preco_base_valor) : null,
    asset_valuation: announcement.asset_valuation ? Number(announcement.asset_valuation) : null,
  }
}

export async function fetchAnnouncementData(
  search?: string,
  district?: string,
  limit: number = 100
): Promise<AnnouncementItem[]> {
  try {
    let where: any = {}

    if (search) {
      where.OR = [
        { object_designation: { contains: search, mode: 'insensitive' } },
        { issuer: { contains: search, mode: 'insensitive' } },
        { entity_designacao: { contains: search, mode: 'insensitive' } },
        { object_description: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ]
    }

    // District filtering - search in issuer, entity_designacao and entity_distrito fields
    if (district && district !== 'all') {
      const districtFilter = {
        OR: [
          { issuer: { contains: district, mode: 'insensitive' } },
          { entity_designacao: { contains: district, mode: 'insensitive' } },
          { entity_distrito: { contains: district, mode: 'insensitive' } }
        ]
      }
      
      if (where.OR) {
        where.AND = [{ OR: where.OR }, districtFilter]
        delete where.OR
      } else {
        where = districtFilter
      }
    }

    const announcementRecords = await prisma.announcements.findMany({
      where,
      orderBy: {
        publication_date: 'desc'
      },
      take: limit
    })

    // Convert announcement records to AnnouncementItem format
    return announcementRecords.map(convertAnnouncementToItem)
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return []
  }
}

// Get distinct issuers (entities) from announcements table
export async function getIssuers(): Promise<string[]> {
  try {
    const issuers = await prisma.announcements.findMany({
      select: {
        issuer: true,
        entity_designacao: true
      },
      where: {
        OR: [
          { 
            AND: [
              { issuer: { not: null } },
              { issuer: { not: "" } }
            ]
          },
          { 
            AND: [
              { entity_designacao: { not: null } },
              { entity_designacao: { not: "" } }
            ]
          }
        ]
      },
      take: 100 // Limit to first 100 unique issuers
    })

    // Collect unique non-null values from both issuer and entity_designacao fields
    const issuerSet = new Set<string>()
    
    issuers.forEach((item: { issuer: string | null; entity_designacao: string | null }) => {
      if (item.issuer && item.issuer.trim() !== '') {
        issuerSet.add(item.issuer.trim())
      }
      if (item.entity_designacao && item.entity_designacao.trim() !== '') {
        issuerSet.add(item.entity_designacao.trim())
      }
    })

    return Array.from(issuerSet).sort()
  } catch (error) {
    console.error("Error fetching issuers:", error)
    return []
  }
}
