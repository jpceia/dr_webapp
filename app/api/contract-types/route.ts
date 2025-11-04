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
        { object_main_contract_type: { not: null } },
        { object_main_contract_type: { not: "" } }
      ]
    }
    
    if (announcementIds) {
      whereClause.id = { in: announcementIds }
    }
    
    const contractTypes = await prisma.announcements.findMany({
      select: {
        object_main_contract_type: true
      },
      where: whereClause,
      distinct: ['object_main_contract_type'],
      orderBy: {
        object_main_contract_type: 'asc'
      }
    })

    const distinctContractTypes = contractTypes
      .map((c: { object_main_contract_type: string | null }) => c.object_main_contract_type)
      .filter(Boolean)
      .filter((type): type is string => type !== null && type.trim() !== '')
      .sort()

    return NextResponse.json(distinctContractTypes)
  } catch (error) {
    console.error('Error fetching contract types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract types' },
      { status: 500 }
    )
  }
}
