'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Radar, Save, Trash2, Clock } from 'lucide-react'
import type { FilterPreset, ScanFilters } from '@/types'

// ── Platform definitions ─────────────────────────────────────────────────────
const PLATFORMS_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  'United States': [
    { value: 'google', label: 'Google Business Profile' },
    { value: 'yelp', label: 'Yelp' },
    { value: 'yellowpages_us', label: 'Yellow Pages (yp.com)' },
    { value: 'bbb', label: 'Better Business Bureau (bbb.org)' },
    { value: 'angi', label: 'Angi (angi.com)' },
    { value: 'thumbtack', label: 'Thumbtack' },
    { value: 'houzz', label: 'Houzz' },
    { value: 'nextdoor', label: 'Nextdoor Business' },
  ],
  'United Kingdom': [
    { value: 'google', label: 'Google Business Profile' },
    { value: 'yell', label: 'Yell.com' },
    { value: 'thomsonlocal', label: 'Thomson Local' },
    { value: 'checkatrade', label: 'Checkatrade' },
    { value: 'bark_uk', label: 'Bark.com' },
  ],
  'Canada': [
    { value: 'google', label: 'Google Business Profile' },
    { value: 'yellowpages_ca', label: 'Yellow Pages CA' },
    { value: 'homestars', label: 'HomeStars' },
    { value: 'yelp', label: 'Yelp Canada' },
    { value: '411ca', label: '411.ca' },
  ],
  'Australia': [
    { value: 'google', label: 'Google Business Profile' },
    { value: 'yellowpages_au', label: 'Yellow Pages AU' },
    { value: 'truelocal', label: 'True Local' },
    { value: 'hipages', label: 'HiPages' },
    { value: 'oneflare', label: 'Oneflare' },
  ],
  'New Zealand': [
    { value: 'google', label: 'Google Business Profile' },
    { value: 'yellow_nz', label: 'Yellow NZ' },
    { value: 'nocowboys', label: 'NoCowboys' },
    { value: 'finda', label: 'Finda.co.nz' },
  ],
  'Ireland': [
    { value: 'google', label: 'Google Business Profile' },
    { value: 'goldenpages', label: 'Golden Pages' },
    { value: 'bark_ie', label: 'Bark.com Ireland' },
  ],
}

const GLOBAL_PLATFORMS = [
  { value: 'tripadvisor', label: 'TripAdvisor' },
  { value: 'facebook', label: 'Facebook Business Pages' },
  { value: 'foursquare', label: 'Foursquare' },
  { value: 'bing', label: 'Bing Places for Business' },
]

const CATEGORY_SUGGESTIONS = [
  'restaurant','plumber','salon','hair salon','nail salon','dentist','electrician',
  'landscaper','mechanic','auto repair','bakery','gym','fitness studio','lawyer',
  'accountant','real estate agent','photographer','caterer','cleaning service',
  'pest control','roofing','painting','flooring','HVAC','veterinarian','chiropractor',
  'massage therapist','tutoring','daycare','wedding planner','event venue','hotel',
  'bed and breakfast','coffee shop','bar','nightclub','grocery store','pharmacy',
  'optician','physiotherapist','tattoo studio','car dealership','mortgage broker',
  'insurance agent','travel agent','interior designer','architect','contractor',
  'locksmith','towing','pool service',
]

const COUNTRIES = Object.keys(PLATFORMS_BY_COUNTRY)

const DEFAULT_FILTERS: ScanFilters = {
  countries: [],
  states: '',
  cities: '',
  platforms: [],
  category: '',
  min_rating: 3.5,
  min_reviews: 10,
  must_have_phone: true,
  no_website: true,
  has_social_no_website: false,
  claimed_only: false,
  result_count: 100,
  min_lead_score: 40,
  exclude_existing: true,
}

interface Props { userId: string; presets: FilterPreset[] }

export default function FilterBuilder({ userId, presets }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [filters, setFilters] = useState<ScanFilters>(DEFAULT_FILTERS)
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([])
  const [presetName, setPresetName] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)

  const set = <K extends keyof ScanFilters>(key: K, value: ScanFilters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  // All platforms relevant to selected countries
  const availablePlatforms = useMemo(() => {
    const byCountry: { country: string; platforms: { value: string; label: string }[] }[] = []
    filters.countries.forEach(c => {
      if (PLATFORMS_BY_COUNTRY[c]) byCountry.push({ country: c, platforms: PLATFORMS_BY_COUNTRY[c] })
    })
    return byCountry
  }, [filters.countries])

  function toggleCountry(country: string) {
    const next = filters.countries.includes(country)
      ? filters.countries.filter(c => c !== country)
      : [...filters.countries, country]
    // Remove platforms that belong to deselected country
    const countryPlatforms = new Set(
      next.flatMap(c => (PLATFORMS_BY_COUNTRY[c] ?? []).map(p => p.value))
    )
    const globalPlatforms = new Set(GLOBAL_PLATFORMS.map(p => p.value))
    const keptPlatforms = filters.platforms.filter(p => countryPlatforms.has(p) || globalPlatforms.has(p))
    setFilters(prev => ({ ...prev, countries: next, platforms: keptPlatforms }))
  }

  function togglePlatform(platform: string) {
    set('platforms', filters.platforms.includes(platform)
      ? filters.platforms.filter(p => p !== platform)
      : [...filters.platforms, platform]
    )
  }

  function selectAllForCountry(country: string) {
    const cPlatforms = (PLATFORMS_BY_COUNTRY[country] ?? []).map(p => p.value)
    const existing = new Set(filters.platforms)
    cPlatforms.forEach(p => existing.add(p))
    set('platforms', Array.from(existing))
  }

  function handleCategoryInput(value: string) {
    set('category', value)
    if (value.length >= 2) {
      setCategorySuggestions(CATEGORY_SUGGESTIONS.filter(c => c.toLowerCase().includes(value.toLowerCase())).slice(0, 8))
    } else {
      setCategorySuggestions([])
    }
  }

  function estimatedTime(): string {
    const platforms = filters.platforms.length
    const results = filters.result_count
    if (platforms === 0) return ''
    const secs = Math.ceil(platforms * (results / 10) * 1.5)
    if (secs < 60) return `~${secs}s`
    return `~${Math.ceil(secs / 60)} min`
  }

  async function savePreset() {
    if (!presetName.trim()) { toast.error('Enter a preset name'); return }
    setSaving(true)
    const { error } = await supabase.from('filter_presets').insert({
      user_id: userId,
      name: presetName.trim(),
      filters,
    })
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Preset saved'); setPresetName(''); router.refresh() }
  }

  async function deletePreset(id: string) {
    const { error } = await supabase.from('filter_presets').delete().eq('id', id).eq('user_id', userId)
    if (error) toast.error(error.message)
    else { toast.success('Preset deleted'); router.refresh() }
  }

  function loadPreset(id: string) {
    const preset = presets.find(p => p.id === id)
    if (preset) { setFilters(preset.filters); setSelectedPreset(id) }
  }

  async function startScan() {
    if (!filters.countries.length) { toast.error('Select at least one country'); return }
    if (!filters.category.trim()) { toast.error('Enter a business category'); return }
    if (!filters.platforms.length) { toast.error('Select at least one platform'); return }

    setStarting(true)
    const { data: scan, error } = await supabase.from('scans').insert({
      user_id: userId,
      filters,
      status: 'running',
      platforms_searched: filters.platforms,
    }).select().single()

    if (error || !scan) {
      toast.error(error?.message ?? 'Failed to create scan')
      setStarting(false)
      return
    }

    // Kick off background scan
    fetch(`/api/scans/${scan.id}/run`, { method: 'POST' }).catch(() => {})

    router.push(`/scan/${scan.id}/progress`)
  }

  const isValid = filters.countries.length > 0 && filters.category.trim() && filters.platforms.length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Presets bar */}
      {presets.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Load preset:</span>
          <select value={selectedPreset} onChange={e => loadPreset(e.target.value)}
            className="flex-1 min-w-40 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">— Select preset —</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {selectedPreset && (
            <button onClick={() => deletePreset(selectedPreset)}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}

      {/* Location */}
      <ScanSection title="Location" required>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Countries <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c => (
                <button key={c} onClick={() => toggleCountry(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.countries.includes(c)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                State / Province / Region
              </label>
              <input value={filters.states ?? ''} onChange={e => set('states', e.target.value)}
                className={inputCls} placeholder="Texas, Florida, Georgia" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                City
              </label>
              <input value={filters.cities ?? ''} onChange={e => set('cities', e.target.value)}
                className={inputCls} placeholder="Austin, Dallas, Houston" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
            </div>
          </div>
        </div>
      </ScanSection>

      {/* Platforms */}
      {filters.countries.length > 0 && (
        <ScanSection title="Platforms to Scan" required>
          <div className="space-y-5">
            {availablePlatforms.map(({ country, platforms }) => (
              <div key={country}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{country}</span>
                  <button onClick={() => selectAllForCountry(country)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Select all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <button key={p.value} onClick={() => togglePlatform(p.value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        filters.platforms.includes(p.value)
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Multi-region / Global</span>
              <div className="flex flex-wrap gap-2">
                {GLOBAL_PLATFORMS.map(p => (
                  <button key={p.value} onClick={() => togglePlatform(p.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      filters.platforms.includes(p.value)
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScanSection>
      )}

      {/* Business filters */}
      <ScanSection title="Business Filters" required>
        <div className="space-y-4">
          <div className="relative">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Business category / niche <span className="text-red-500">*</span>
            </label>
            <input value={filters.category} onChange={e => handleCategoryInput(e.target.value)}
              className={inputCls} placeholder="restaurant, plumber, salon..." />
            {categorySuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                {categorySuggestions.map(s => (
                  <button key={s} onClick={() => { set('category', s); setCategorySuggestions([]) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Minimum star rating: <span className="font-semibold text-indigo-600">{filters.min_rating.toFixed(1)}</span>
              </label>
              <input type="range" min={0} max={5} step={0.5} value={filters.min_rating}
                onChange={e => set('min_rating', parseFloat(e.target.value))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0.0</span><span>5.0</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Minimum review count
              </label>
              <input type="number" min={0} value={filters.min_reviews}
                onChange={e => set('min_reviews', parseInt(e.target.value) || 0)}
                className={inputCls} />
            </div>
          </div>
        </div>
      </ScanSection>

      {/* Contact & website filters */}
      <ScanSection title="Contact & Website Filters">
        <div className="space-y-3">
          <ToggleRow label="Must have phone number listed" checked={filters.must_have_phone}
            onChange={v => set('must_have_phone', v)} />
          <ToggleRow label="No website confirmed" description="Only return businesses with no website field"
            checked={filters.no_website} onChange={v => set('no_website', v)} />
          <ToggleRow label="Has social media but no website" description="Businesses with Facebook/Instagram but no site"
            checked={filters.has_social_no_website} onChange={v => set('has_social_no_website', v)} />
          <ToggleRow label="Claimed / verified listing only" checked={filters.claimed_only}
            onChange={v => set('claimed_only', v)} />
        </div>
      </ScanSection>

      {/* Result controls */}
      <ScanSection title="Result Controls">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Number of results to find
              </label>
              <select value={filters.result_count} onChange={e => set('result_count', parseInt(e.target.value))}
                className={inputCls}>
                {[25,50,100,250,500].map(n => <option key={n} value={n}>{n} results</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Minimum lead score: <span className="font-semibold text-indigo-600">{filters.min_lead_score}</span>
              </label>
              <input type="range" min={0} max={100} step={5} value={filters.min_lead_score}
                onChange={e => set('min_lead_score', parseInt(e.target.value))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span><span>100</span>
              </div>
            </div>
          </div>
          <ToggleRow label="Exclude leads already in my database" checked={filters.exclude_existing}
            onChange={v => set('exclude_existing', v)} />
        </div>
      </ScanSection>

      {/* Save preset */}
      <ScanSection title="Presets">
        <div className="flex items-center gap-3">
          <input value={presetName} onChange={e => setPresetName(e.target.value)}
            className={`${inputCls} flex-1`} placeholder="Preset name (e.g. US Restaurants)" />
          <button onClick={savePreset} disabled={saving || !presetName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {saving ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> : <Save size={14} />}
            Save preset
          </button>
        </div>
      </ScanSection>

      {/* Start scan */}
      <div className="sticky bottom-4">
        <button onClick={startScan} disabled={!isValid || starting}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/20">
          {starting
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Radar size={20} />}
          {starting ? 'Starting scan…' : 'Start Scan'}
          {!starting && isValid && filters.platforms.length > 0 && (
            <span className="flex items-center gap-1 text-sm font-normal text-indigo-200">
              <Clock size={14} /> {estimatedTime()}
            </span>
          )}
        </button>
        {!isValid && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            Select country, enter category, and choose at least one platform to start
          </p>
        )}
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

function ScanSection({ title, children, required }: { title: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        {title}{required && <span className="text-red-500 ml-1">*</span>}
      </h2>
      {children}
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
        <span className={`block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
