import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const exportFormat = searchParams.get('format') ?? 'csv'
  const scanId = searchParams.get('scan_id')
  const stage = searchParams.get('stage')

  let query = supabase
    .from('leads')
    .select(`
      business_name, category, address, city, state_province, country,
      phone, email, rating, review_count, lead_score, pipeline_stage,
      platforms_found_on, demo_url, proposal_package, proposal_price,
      deal_value, last_contacted_at, next_call_at, created_at, notes, dnc_status
    `)
    .eq('user_id', user.id)
    .order('lead_score', { ascending: false })

  if (scanId) query = query.eq('scan_id', scanId)
  if (stage) query = query.eq('pipeline_stage', stage)

  const { data: leads, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dateStr = format(new Date(), 'yyyy-MM-dd')

  if (exportFormat === 'xlsx') {
    try {
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(
        (leads ?? []).map((l) => ({
          'Business Name': l.business_name,
          'Category': l.category ?? '',
          'City': l.city ?? '',
          'State/Province': l.state_province ?? '',
          'Country': l.country ?? '',
          'Phone': l.phone ?? '',
          'Email': l.email ?? '',
          'Rating': l.rating ?? '',
          'Reviews': l.review_count ?? 0,
          'Lead Score': l.lead_score,
          'Pipeline Stage': l.pipeline_stage,
          'Platforms': (l.platforms_found_on ?? []).join('; '),
          'Demo URL': l.demo_url ?? '',
          'Package': l.proposal_package ?? '',
          'Quoted Price': l.proposal_price ?? '',
          'Deal Value': l.deal_value ?? '',
          'Last Contacted': l.last_contacted_at ? format(new Date(l.last_contacted_at), 'yyyy-MM-dd HH:mm') : '',
          'Next Call': l.next_call_at ? format(new Date(l.next_call_at), 'yyyy-MM-dd HH:mm') : '',
          'DNC Status': l.dnc_status ?? '',
          'Date Added': format(new Date(l.created_at), 'yyyy-MM-dd'),
          'Notes': l.notes ?? '',
        }))
      )

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Leads')

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="leadradar-leads-${dateStr}.xlsx"`,
        },
      })
    } catch {
      return NextResponse.json({ error: 'Excel export failed' }, { status: 500 })
    }
  }

  // CSV export
  const headers = [
    'business_name', 'category', 'city', 'state_province', 'country',
    'phone', 'email', 'rating', 'review_count', 'lead_score', 'pipeline_stage',
    'platforms_found_on', 'demo_url', 'proposal_package', 'proposal_price',
    'deal_value', 'last_contacted_at', 'next_call_at', 'dnc_status', 'created_at', 'notes',
  ]

  function escapeCSV(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = Array.isArray(value) ? value.join('; ') : String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = [
    headers.join(','),
    ...(leads ?? []).map((lead) =>
      headers.map((h) => escapeCSV(lead[h as keyof typeof lead])).join(',')
    ),
  ]

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leadradar-leads-${dateStr}.csv"`,
    },
  })
}
