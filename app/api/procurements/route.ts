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

// Helper function to safely parse boolean from string
function parseBoolean(value: string | null): boolean | null {
  if (!value || value === '') return null
  return value.toLowerCase() === 'true' || value === '1'
}

// Helper function to convert DD-MM-YYYY HH:MM string to Date object
function convertStringToDate(dateString: string | null): Date | null {
  if (!dateString) return null
  
  // Check if it's in DD-MM-YYYY HH:MM format
  const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})$/
  const match = dateString.match(ddmmyyyyPattern)
  
  if (match) {
    const [, day, month, year, hour, minute] = match
    // Create date object (month is 0-indexed in JS)
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
  } else {
    // Try regular date parsing
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  }
}

// Convert announcement record to response format
async function convertAnnouncementToResponse(announcement: any) {
  // Fetch CPV codes for this announcement
  const cpvs = await prisma.$queryRaw<Array<{ code: string }>>`
    SELECT code 
    FROM diario_republica.cpvs 
    WHERE announcement_id = ${parseInt(announcement.id)}
    ORDER BY code
  `
  
  // Fetch adjudication factors for this announcement
  const adjudicationFactors = await prisma.adjudication_factors.findMany({
    where: {
      announcement_id: parseInt(announcement.id)
    }
  })
  
  // Determine criteria type based on adjudication factors
  let criteriaType = 'outros' // Default to 'outros'
  if (adjudicationFactors.length > 0) {
    // Check if all factors are price-related (case-insensitive)
    const allPriceRelated = adjudicationFactors.every(factor => {
      const factorName = (factor.other_factor_name || factor.factor_name || '').toLowerCase()
      return factorName.includes('preço') || factorName.includes('preco')
    })
    
    if (allPriceRelated) {
      criteriaType = 'precos'
    }
  }
  
  return {
    ...announcement,
    id: announcement.id,
    publication_date: announcement.publication_date,
    application_deadline: announcement.application_deadline,
    base_price: announcement.base_price ? Number(announcement.base_price) : null,
    processo_preco_base_valor: announcement.processo_preco_base_valor ? Number(announcement.processo_preco_base_valor) : null,
    asset_valuation: announcement.asset_valuation ? Number(announcement.asset_valuation) : null,
    cpv_codes: cpvs.map(cpv => cpv.code),
    criteria_type: criteriaType,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const district = searchParams.get('district')
    const dateSortOrder = searchParams.get('dateSortOrder') || 'desc'
    const priceSortOrder = searchParams.get('priceSortOrder') || 'none'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '21')
    const includeExpired = searchParams.get('includeExpired') === 'true'
    const includeNA = searchParams.get('includeNA') === 'true'
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minDate = searchParams.get('minDate')
    const maxDate = searchParams.get('maxDate')
    const cpv = searchParams.get('cpv')
    const criteria = searchParams.get('criteria')
    const contractType = searchParams.get('contractType')
    const offset = (page - 1) * limit

    let where: any = {}

    if (search) {
      where.summary = { contains: search, mode: 'insensitive' }
    }

    // District filtering - exact match on entity_distrito field
    if (district && district !== 'all') {
      if (Object.keys(where).length > 0) {
        // If there are already filters, add district to AND
        where.AND = where.AND || []
        where.AND.push({ entity_distrito: { equals: district, mode: 'insensitive' } })
      } else {
        where.entity_distrito = { equals: district, mode: 'insensitive' }
      }
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      where.AND = where.AND || []
      where.AND.push({
        base_price: {
          not: null
        }
      })
      
      // Add price range filtering
      if (minPrice) {
        where.AND.push({
          base_price: {
            gte: parseFloat(minPrice)
          }
        })
      }
      
      if (maxPrice) {
        where.AND.push({
          base_price: {
            lte: parseFloat(maxPrice)
          }
        })
      }
    }

    // Expired filtering using the expired column in the database
    if (!includeExpired) {
      // When includeExpired is false, we need to check includeNA
      where.AND = where.AND || []
      
      if (includeNA) {
        // Include both active (false) and N/A (null) items
        where.AND.push({
          OR: [
            { expired: false },        // Not expired
            { expired: null }          // No deadline (N/A)
          ]
        })
      } else {
        // Only include active (false) items, exclude both expired (true) and N/A (null)
        where.AND.push({
          expired: false
        })
      }
    } else {
      // When includeExpired is true, only show expired items
      where.AND = where.AND || []
      where.AND.push({
        expired: true
      })
    }

    // Date range filtering (publication_date)
    if (minDate || maxDate) {
      where.AND = where.AND || []
      
      if (minDate) {
        where.AND.push({
          publication_date: {
            gte: new Date(minDate)
          }
        })
      }
      
      if (maxDate) {
        // Set to end of day for maxDate
        const maxDateObj = new Date(maxDate)
        maxDateObj.setHours(23, 59, 59, 999)
        where.AND.push({
          publication_date: {
            lte: maxDateObj
          }
        })
      }
    }

    // Contract type filtering (object_main_contract_type)
    if (contractType && contractType !== 'all') {
      where.AND = where.AND || []
      where.AND.push({
        object_main_contract_type: contractType
      })
    }

    // CPV filtering - join with cpvs table to filter announcements by CPV codes
    if (cpv && cpv !== 'all') {
      // Determine the search pattern based on trailing zeros
      // If CPV has two or more consecutive zeros at the end, search for child codes
      let searchPattern = cpv
      
      // Find the position where trailing zeros start (at least 2 consecutive zeros)
      const match = cpv.match(/^(\d*?)(00+)$/)
      if (match && match[2].length >= 2) {
        // Use the non-zero prefix for pattern matching
        searchPattern = match[1] + '%'
      }
      
      // Get announcement IDs that have this CPV code or a child CPV code
      const announcementsWithCpv = await prisma.$queryRaw<Array<{ announcement_id: number }>>`
        SELECT DISTINCT announcement_id 
        FROM diario_republica.cpvs 
        WHERE code ILIKE ${searchPattern}
      `
      
      const announcementIds = announcementsWithCpv.map(item => item.announcement_id)
      
      // Filter announcements to only include those with the selected CPV
      if (announcementIds.length > 0) {
        where.AND = where.AND || []
        where.AND.push({
          id: {
            in: announcementIds
          }
        })
      } else {
        // No announcements with this CPV - return empty result
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        })
      }
    }

    // Build orderBy - sort in database for efficiency
    // Ensure nulls are always last regardless of sort direction
    let orderBy: any[] = []
    
    if (priceSortOrder !== 'none') {
      // Primary sort by price (nulls last)
      orderBy.push({ base_price: { sort: priceSortOrder, nulls: 'last' } })
      // Secondary sort by date (nulls last)
      orderBy.push({ publication_date: { sort: dateSortOrder, nulls: 'last' } })
    } else {
      // Sort by date only (nulls last)
      orderBy.push({ publication_date: { sort: dateSortOrder, nulls: 'last' } })
    }

    const [announcementRecords, total] = await Promise.all([
      prisma.announcements.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.announcements.count({ where })
    ])

    // Convert announcement records to response format (with CPV codes and criteria type)
    let convertedData = await Promise.all(announcementRecords.map(announcement => convertAnnouncementToResponse(announcement)))

    // Client-side filtering for criteria type (since it's computed based on adjudication_factors)
    if (criteria && criteria === 'precos') {
      convertedData = convertedData.filter(item => 
        item.criteria_type === 'precos'
      )
    }

    return NextResponse.json({
      data: convertedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch procurements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const announcementRecord = await prisma.announcements.create({
      data: body
    })

    return NextResponse.json(convertAnnouncementToResponse(announcementRecord), { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json(
      { error: 'Failed to create procurement' },
      { status: 500 }
    )
  }
}