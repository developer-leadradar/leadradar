import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { LeadRadarGuide } from '@/lib/guide/LeadRadarGuide'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pdfBuffer = await renderToBuffer(React.createElement(LeadRadarGuide))

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="LeadRadar-User-Guide.pdf"',
      'Content-Length': pdfBuffer.length.toString(),
    },
  })
}
