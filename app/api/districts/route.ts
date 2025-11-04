import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cpv = searchParams.get('cpv')
    
    let announcementIds: number[] | undefined = undefined
    
    // If CPV filter is provided, get announcement IDs that have this CPV
    if (cpv && cpv !== 'all') {
      const announcementsWithCpv = await prisma.$queryRaw<Array<{ announcement_id: number }>>`
        SELECT DISTINCT announcement_id 
        FROM diario_republica.cpvs 
        WHERE code = ${cpv}
      `
      announcementIds = announcementsWithCpv.map(item => item.announcement_id)
      
      if (announcementIds.length === 0) {
        return NextResponse.json([])
      }
    }
    
    const whereClause: any = {
      AND: [
        { entity_distrito: { not: null } },
        { entity_distrito: { not: "" } }
      ]
    }
    
    if (announcementIds) {
      whereClause.id = { in: announcementIds }
    }
    
    const districts = await prisma.announcements.findMany({
      select: {
        entity_distrito: true
      },
      where: whereClause,
      distinct: ['entity_distrito'],
      orderBy: {
        entity_distrito: 'asc'
      }
    })

    const distinctDistricts = districts
      .map((d: { entity_distrito: string | null }) => d.entity_distrito)
      .filter(Boolean)
      .filter((distrito): distrito is string => distrito !== null && distrito.trim() !== '')
      .sort()

    return NextResponse.json(distinctDistricts)
  } catch (error) {
    console.error('Error fetching districts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch districts' },
      { status: 500 }
    )
  }
}