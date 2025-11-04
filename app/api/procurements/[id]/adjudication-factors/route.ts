import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const announcementId = parseInt(params.id)

    if (isNaN(announcementId)) {
      return NextResponse.json({ factors: [] })
    }

    // Fetch adjudication factors using Prisma
    const factors = await prisma.adjudication_factors.findMany({
      where: {
        announcement_id: announcementId
      }
    })

    return NextResponse.json({ factors })
  } catch (error) {
    console.error('ERROR fetching adjudication factors:')
    console.error('Error details:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to fetch adjudication factors', 
        details: error instanceof Error ? error.message : 'Unknown error',
        factors: []
      },
      { status: 500 }
    )
  }
}
