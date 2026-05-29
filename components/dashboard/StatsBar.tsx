import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Flame, Phone, DollarSign, Bell } from 'lucide-react'

interface Props { userId: string }

export default async function StatsBar({ userId }: Props) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalLeads },
    { count: hotLeads },
    { count: callsToday },
    { data: pipelineData },
    { count: scheduledToday },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('lead_score', 80),
    supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('called_at', `${today}T00:00:00`),
    supabase.from('leads').select('deal_value').eq('user_id', userId).in('pipeline_stage', ['committed', 'building', 'closed_won']),
    supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('sent_email', false).gte('scheduled_for', `${today}T00:00:00`).lt('scheduled_for', `${today}T23:59:59`),
  ])

  const pipelineValue = (pipelineData ?? []).reduce((sum, l) => sum + (l.deal_value ?? 0), 0)

  const stats = [
    { label: 'Total leads', value: totalLeads ?? 0, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Hot leads', value: hotLeads ?? 0, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Calls today', value: callsToday ?? 0, icon: Phone, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Pipeline value', value: `$${pipelineValue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Scheduled today', value: scheduledToday ?? 0, icon: Bell, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
