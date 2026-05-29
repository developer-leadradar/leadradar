import type { PipelineStage } from '@/types'

const STAGE_CONFIG: Record<PipelineStage, { label: string; className: string }> = {
  new_lead:        { label: 'New Lead',        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  attempted:       { label: 'Attempted',       className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  connected:       { label: 'Connected',       className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  interested:      { label: 'Interested',      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  demo_sent:       { label: 'Demo Sent',       className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  proposal_made:   { label: 'Proposal Made',   className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  committed:       { label: 'Committed',       className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  building:        { label: 'Building',        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  closed_won:      { label: 'Closed Won',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  closed_lost:     { label: 'Closed Lost',     className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  not_interested:  { label: 'Not Interested',  className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  call_back_later: { label: 'Call Back Later', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
}

export const ALL_STAGES = Object.keys(STAGE_CONFIG) as PipelineStage[]

interface Props {
  stage: PipelineStage
  className?: string
  compact?: boolean
}

export function PipelineStageBadge({ stage, className = '', compact = false }: Props) {
  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.new_lead
  if (compact) {
    return (
      <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium ${config.className} ${className}`}>
        {config.label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  )
}

export default PipelineStageBadge

export function getStageName(stage: PipelineStage) {
  return STAGE_CONFIG[stage]?.label ?? stage
}
