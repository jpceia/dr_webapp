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
function convertAnnouncementToResponse(announcement: any) {
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

    return NextResponse.json(convertAnnouncementToResponse(announcementRecord))
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}