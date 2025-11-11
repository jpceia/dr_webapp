import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to safely parse date from string
function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

// Helper function to safely parse decimal from string
function parseDecimal(value: string | null): number | null {
  if (!value || value === '') return null
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

// Helper function to safely parse boolean from various types
function parseBoolean(value: any): boolean | null {
  if (value === null || value === undefined || value === '') return null
  
  // If it's already a boolean, return it
  if (typeof value === 'boolean') return value
  
  // If it's a number, treat 1 as true, 0 as false
  if (typeof value === 'number') return value === 1
  
  // If it's a string, convert to lowercase and check
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim()
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes'
  }
  
  // For any other type, return null
  return null
}

// Convert announcement record to response format
async function convertAnnouncementToResponse(announcement: any) {
  // Fetch CPV codes for this announcement
  const cpvs = await prisma.$queryRaw<Array<{ code: string, base_price: any }>>`
    SELECT code, base_price
    FROM diario_republica.cpvs 
    WHERE announcement_id = ${parseInt(announcement.id)}
    ORDER BY code
  `
  
  // Determine base_price with priority order: processo_preco_base_valor → base_price → cpvs.base_price
  let basePrice = null
  
  // First priority: processo_preco_base_valor
  if (announcement.processo_preco_base_valor != null) {
    basePrice = Number(announcement.processo_preco_base_valor)
  }
  // Second priority: base_price
  else if (announcement.base_price != null) {
    basePrice = Number(announcement.base_price)
  }
  // Third priority: cpvs.base_price
  else if (cpvs.length > 0) {
    const cpvWithPrice = cpvs.find(cpv => cpv.base_price != null)
    if (cpvWithPrice) {
      basePrice = Number(cpvWithPrice.base_price)
    }
  }
  
  return {
    ...announcement,
    id: announcement.id,
    publication_date: announcement.publication_date,
    application_deadline: announcement.application_deadline,
    base_price: basePrice,
    processo_preco_base_valor: announcement.processo_preco_base_valor ? Number(announcement.processo_preco_base_valor) : null,
    asset_valuation: announcement.asset_valuation ? Number(announcement.asset_valuation) : null,
    cpv_codes: cpvs.map(cpv => cpv.code),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid procurement ID' },
        { status: 400 }
      )
    }

    const announcementRecord = await prisma.announcements.findUnique({
      where: { id: id }
    })

    if (!announcementRecord) {
      return NextResponse.json(
        { error: 'Procurement not found' },
        { status: 404 }
      )
    }

    const convertedData = await convertAnnouncementToResponse(announcementRecord)
    return NextResponse.json(convertedData)
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}