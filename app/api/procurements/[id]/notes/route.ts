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

    const note = await prisma.notes.findUnique({
      where: {
        announcement_id: announcementId
      }
    })

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error fetching note:', error)
    return NextResponse.json(
      { error: 'Failed to fetch note' },
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

    if (isNaN(announcementId)) {
      return NextResponse.json(
        { error: 'Invalid announcement ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { noteText } = body

    if (typeof noteText !== 'string') {
      return NextResponse.json(
        { error: 'Invalid note text' },
        { status: 400 }
      )
    }

    // Upsert the note (create if doesn't exist, update if it does)
    const note = await prisma.notes.upsert({
      where: {
        announcement_id: announcementId
      },
      update: {
        note_text: noteText
      },
      create: {
        announcement_id: announcementId,
        note_text: noteText
      }
    })

    return NextResponse.json({ success: true, note })
  } catch (error) {
    console.error('Error saving note:', error)
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete the note if it exists
    await prisma.notes.deleteMany({
      where: {
        announcement_id: announcementId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
