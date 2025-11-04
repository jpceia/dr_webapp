import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Execute the update function directly using raw SQL
    await prisma.$executeRaw`SELECT diario_republica.update_announcements_expired()`
    
    // Get the count of updated records
    const [expired, active, na] = await Promise.all([
      prisma.announcements.count({ where: { expired: true } }),
      prisma.announcements.count({ where: { expired: false } }),
      prisma.announcements.count({ where: { expired: null } })
    ])
    
    return NextResponse.json({
      success: true,
      message: 'Expired status updated successfully',
      counts: {
        expired,
        active,
        na,
        total: expired + active + na
      }
    })
  } catch (error) {
    console.error('Error updating expired status:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update expired status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
