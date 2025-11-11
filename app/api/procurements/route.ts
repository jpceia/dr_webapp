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
  const cpvs = await prisma.$queryRaw<Array<{ code: string, base_price: any }>>`
    SELECT code, base_price
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
    const entity = searchParams.get('entity')
    const criteria = searchParams.get('criteria')
    const contractType = searchParams.get('contractType')
    const showArchived = searchParams.get('showArchived') === 'true'
    const offset = (page - 1) * limit

    let where: any = {}

    if (search) {
      where.AND = where.AND || []
      where.AND.push({ summary: { contains: search, mode: 'insensitive' } })
    }

    // Entity filtering - search in entity_designacao field
    if (entity && entity !== '') {
      where.AND = where.AND || []
      where.AND.push({ entity_designacao: { contains: entity, mode: 'insensitive' } })
    }

    // District filtering - exact match on entity_distrito field
    if (district && district !== 'all') {
      where.AND = where.AND || []
      where.AND.push({ entity_distrito: { equals: district, mode: 'insensitive' } })
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

    // Filter out old announcement versions based on alterations table
    // Exclude announcements whose internal_id appears in previous_internal_id
    const oldVersionIds = await prisma.$queryRaw<Array<{ previous_internal_id: number }>>`
      SELECT DISTINCT previous_internal_id 
      FROM diario_republica.alterations 
      WHERE previous_internal_id IS NOT NULL
    `
    
    if (oldVersionIds.length > 0) {
      const excludeInternalIds = oldVersionIds.map(item => item.previous_internal_id)
      where.AND = where.AND || []
      where.AND.push({
        OR: [
          { internal_id: null },
          { internal_id: { notIn: excludeInternalIds } }
        ]
      })
    }

    // Archive filtering - show only archived announcements if showArchived is true
    if (showArchived) {
      // Get announcement IDs that are archived with is_archived = true
      const archivedAnnouncements = await prisma.$queryRaw<Array<{ announcement_id: number }>>`
        SELECT announcement_id 
        FROM diario_republica.archive 
        WHERE is_archived = true
      `
      
      const archivedIds = archivedAnnouncements.map(item => item.announcement_id)
      
      if (archivedIds.length > 0) {
        where.AND = where.AND || []
        where.AND.push({
          id: {
            in: archivedIds
          }
        })
      } else {
        // If showArchived is true but no archived announcements exist, return empty result
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
    
    // For price sorting or filtering, we need to use raw SQL to properly handle COALESCE between processo_preco_base_valor, base_price, and cpvs.base_price
    if (priceSortOrder !== 'none' || minPrice || maxPrice) {
      // We'll use raw SQL for price operations to handle the three-level priority logic
      // Get all matching announcement IDs with their computed base_price
      const sortDirection = priceSortOrder === 'asc' ? 'ASC' : 'DESC'
      const dateSortDirection = dateSortOrder === 'asc' ? 'ASC' : 'DESC'
      
      // Build WHERE clause from the Prisma where object
      let whereClauses: string[] = []
      let params: any[] = []
      let paramIndex = 1
      
      // Handle search
      if (search) {
        whereClauses.push(`a.summary ILIKE $${paramIndex}`)
        params.push(`%${search}%`)
        paramIndex++
      }
      
      // Handle entity filter
      if (entity && entity !== '') {
        whereClauses.push(`a.entity_designacao ILIKE $${paramIndex}`)
        params.push(`%${entity}%`)
        paramIndex++
      }
      
      // Handle district filter
      if (district && district !== 'all') {
        whereClauses.push(`a.entity_distrito ILIKE $${paramIndex}`)
        params.push(`%${district}%`)
        paramIndex++
      }
      
      // Handle price range filtering with priority: processo_preco_base_valor → base_price → cpvs.base_price
      if (minPrice) {
        whereClauses.push(`(
          COALESCE(
            a.processo_preco_base_valor,
            a.base_price,
            (SELECT c.base_price FROM diario_republica.cpvs c WHERE c.announcement_id = a.id AND c.base_price IS NOT NULL LIMIT 1)
          ) >= $${paramIndex}
        )`)
        params.push(parseFloat(minPrice))
        paramIndex++
      }
      
      if (maxPrice) {
        whereClauses.push(`(
          COALESCE(
            a.processo_preco_base_valor,
            a.base_price,
            (SELECT c.base_price FROM diario_republica.cpvs c WHERE c.announcement_id = a.id AND c.base_price IS NOT NULL LIMIT 1)
          ) <= $${paramIndex}
        )`)
        params.push(parseFloat(maxPrice))
        paramIndex++
      }
      
      // Handle expired filtering
      if (!includeExpired) {
        if (includeNA) {
          whereClauses.push(`(a.expired = false OR a.expired IS NULL)`)
        } else {
          whereClauses.push(`a.expired = false`)
        }
      } else {
        whereClauses.push(`a.expired = true`)
      }
      
      // Handle date range filtering
      if (minDate) {
        whereClauses.push(`a.publication_date >= $${paramIndex}`)
        params.push(new Date(minDate))
        paramIndex++
      }
      
      if (maxDate) {
        const maxDateObj = new Date(maxDate)
        maxDateObj.setHours(23, 59, 59, 999)
        whereClauses.push(`a.publication_date <= $${paramIndex}`)
        params.push(maxDateObj)
        paramIndex++
      }
      
      // Handle contract type filtering
      if (contractType && contractType !== 'all') {
        whereClauses.push(`a.object_main_contract_type = $${paramIndex}`)
        params.push(contractType)
        paramIndex++
      }
      
      // Handle CPV filtering
      if (cpv && cpv !== 'all') {
        let searchPattern = cpv
        const match = cpv.match(/^(\d*?)(00+)$/)
        if (match && match[2].length >= 2) {
          searchPattern = match[1] + '%'
        }
        whereClauses.push(`EXISTS (SELECT 1 FROM diario_republica.cpvs c WHERE c.announcement_id = a.id AND c.code ILIKE $${paramIndex})`)
        params.push(searchPattern)
        paramIndex++
      }
      
      // Handle old versions filtering
      if (oldVersionIds.length > 0) {
        const excludeInternalIds = oldVersionIds.map(item => item.previous_internal_id)
        whereClauses.push(`(a.internal_id IS NULL OR a.internal_id NOT IN (${excludeInternalIds.join(', ')}))`)
      }
      
      const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''
      
      // Query with COALESCE to get base_price with priority: processo_preco_base_valor → base_price → cpvs.base_price
      const querySQL = `
        SELECT DISTINCT a.*,
          COALESCE(
            a.processo_preco_base_valor,
            a.base_price,
            (SELECT c.base_price FROM diario_republica.cpvs c WHERE c.announcement_id = a.id AND c.base_price IS NOT NULL LIMIT 1)
          ) as computed_base_price
        FROM diario_republica.announcements a
        ${whereSQL}
        ORDER BY computed_base_price ${sortDirection} NULLS LAST, a.publication_date ${dateSortDirection} NULLS LAST
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      
      const sortedAnnouncements = await prisma.$queryRawUnsafe<Array<any>>(querySQL, ...params, limit, offset)
      
      // Get total count
      const countSQL = `
        SELECT COUNT(DISTINCT a.id) as count
        FROM diario_republica.announcements a
        ${whereSQL}
      `
      
      const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(countSQL, ...params)
      
      const total = Number(totalResult[0].count)
      
      // Convert announcement records to response format
      let convertedData = await Promise.all(sortedAnnouncements.map(announcement => convertAnnouncementToResponse(announcement)))
      
      // Client-side filtering for criteria type
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
    }
    
    // For date-only sorting, use Prisma
    orderBy.push({ publication_date: { sort: dateSortOrder, nulls: 'last' } })

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