import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testIds = searchParams.get('testIds')
    
    if (!testIds) {
      // If no announcement IDs provided, return empty array
      return NextResponse.json({ cpvs: [] })
    }
    
    // Parse announcement IDs
    const ids = testIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
    
    if (ids.length === 0) {
      return NextResponse.json({ cpvs: [] })
    }
    
    // Get distinct CPV codes for the given announcement IDs
    const cpvs = await prisma.$queryRaw<Array<{ code: string }>>`
      SELECT DISTINCT code 
      FROM diario_republica.cpvs 
      WHERE announcement_id = ANY(${ids}::int[])
      ORDER BY code
    `
    
    return NextResponse.json({
      cpvs: cpvs.map(cpv => cpv.code)
    })
  } catch (error) {
    console.error('Error fetching CPV codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CPV codes' },
      { status: 500 }
    )
  }
}
