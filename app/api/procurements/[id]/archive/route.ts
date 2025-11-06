import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const announcementId = parseInt(params.id)

    if (isNaN(announcementId)) {
      return NextResponse.json(
        { error: 'Invalid announcement ID' },
        { status: 400 }
      )
    }

    // Check if archive entry exists
    const archiveEntry = await prisma.archive.findUnique({
      where: {
        announcement_id: announcementId
      }
    })

    return NextResponse.json({
      isArchived: archiveEntry?.is_archived || false,
      exists: !!archiveEntry
    })
  } catch (error) {
    console.error('Error fetching archive status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch archive status' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const announcementId = parseInt(params.id)
    const body = await request.json()
    const { isArchived } = body

    if (isNaN(announcementId)) {
      return NextResponse.json(
        { error: 'Invalid announcement ID' },
        { status: 400 }
      )
    }

    if (typeof isArchived !== 'boolean') {
      return NextResponse.json(
        { error: 'isArchived must be a boolean' },
        { status: 400 }
      )
    }

    // Check if announcement exists
    const announcement = await prisma.announcements.findUnique({
      where: { id: announcementId }
    })

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // If unarchiving (isArchived = false), delete the entry
    if (!isArchived) {
      await prisma.archive.deleteMany({
        where: {
          announcement_id: announcementId
        }
      })
      
      return NextResponse.json({
        success: true,
        isArchived: false
      })
    }

    // If archiving (isArchived = true), upsert the entry
    const archiveEntry = await prisma.archive.upsert({
      where: {
        announcement_id: announcementId
      },
      update: {
        is_archived: isArchived
      },
      create: {
        announcement_id: announcementId,
        is_archived: isArchived
      }
    })

    return NextResponse.json({
      success: true,
      isArchived: archiveEntry.is_archived
    })
  } catch (error) {
    console.error('Error updating archive status:', error)
    return NextResponse.json(
      { error: 'Failed to update archive status' },
      { status: 500 }
    )
  }
}
