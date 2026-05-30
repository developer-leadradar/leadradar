/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Link,
} from '@react-pdf/renderer'

const INDIGO = '#6366F1'
const INDIGO_LIGHT = '#EEF2FF'
const GREEN = '#22C55E'
const AMBER = '#F59E0B'
const RED = '#EF4444'
const GRAY = '#6B7280'
const GRAY_LIGHT = '#F9FAFB'
const BORDER = '#E5E7EB'
const TEXT = '#111827'
const TEXT_LIGHT = '#374151'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    lineHeight: 1.5,
  },
  // Header / footer
  pageHeader: {
    position: 'absolute',
    top: 16,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 6,
  },
  pageHeaderLogo: { fontSize: 9, color: INDIGO, fontFamily: 'Helvetica-Bold' },
  pageHeaderSection: { fontSize: 8, color: GRAY },
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
  pageFooterText: { fontSize: 8 as number, color: GRAY },
  pageNumber: { fontSize: 8 as number, color: GRAY },

  // Cover page
  cover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  coverBadge: {
    backgroundColor: INDIGO,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 24,
  },
  coverBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  coverTitle: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 16,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverDivider: { width: 60, height: 3, backgroundColor: INDIGO, marginBottom: 32 },
  coverTagline: {
    fontSize: 12,
    color: TEXT_LIGHT,
    textAlign: 'center',
    lineHeight: 1.7,
    maxWidth: 380,
    marginBottom: 48,
  },
  coverInfo: { fontSize: 9, color: GRAY, textAlign: 'center' },

  // Section headings
  sectionBanner: {
    backgroundColor: INDIGO,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
    marginTop: 8,
  },
  sectionNum: { fontSize: 9, color: '#C7D2FE', marginBottom: 2, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#fff' },
  sectionSubtitle: { fontSize: 10, color: '#C7D2FE', marginTop: 2 },

  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: INDIGO, marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: INDIGO_LIGHT, paddingBottom: 3 },
  h3: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: TEXT, marginTop: 12, marginBottom: 4 },
  body: { fontSize: 10, color: TEXT_LIGHT, lineHeight: 1.6, marginBottom: 6 },
  bold: { fontFamily: 'Helvetica-Bold' },

  // Cards / boxes
  infoBox: {
    backgroundColor: INDIGO_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: INDIGO,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  infoBoxTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INDIGO, marginBottom: 3 },
  infoBoxText: { fontSize: 9, color: TEXT_LIGHT, lineHeight: 1.6 },

  tipBox: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  tipBoxTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#15803D', marginBottom: 3 },
  tipBoxText: { fontSize: 9, color: '#166534', lineHeight: 1.6 },

  warningBox: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 3,
    borderLeftColor: AMBER,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  warningBoxTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#92400E', marginBottom: 3 },
  warningBoxText: { fontSize: 9, color: '#78350F', lineHeight: 1.6 },

  // Steps
  stepRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  stepCircle: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  stepNum: { color: '#fff', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 2 },
  stepBody: { fontSize: 9, color: TEXT_LIGHT, lineHeight: 1.6 },

  // Bullets
  bulletRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start' },
  bullet: { fontSize: 14, color: INDIGO, marginRight: 8, lineHeight: 1, marginTop: -1 },
  bulletText: { flex: 1, fontSize: 9.5, color: TEXT_LIGHT, lineHeight: 1.6 },

  // Table
  table: { marginBottom: 12, borderRadius: 4, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: GRAY_LIGHT, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowLast: { flexDirection: 'row' },
  tableCell: { paddingHorizontal: 8, paddingVertical: 6, fontSize: 9, color: TEXT_LIGHT, flex: 1 },
  tableCellHeader: { paddingHorizontal: 8, paddingVertical: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT, flex: 1 },
  tableCellWide: { flex: 2 },

  // Badge row
  badgeRow: { flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeAmber: { backgroundColor: '#FEF3C7' },
  badgeGray: { backgroundColor: '#F3F4F6' },
  badgeRed: { backgroundColor: '#FEE2E2' },
  badgeIndigo: { backgroundColor: INDIGO_LIGHT },
  badgeTextGreen: { fontSize: 9, color: '#15803D', fontFamily: 'Helvetica-Bold' },
  badgeTextAmber: { fontSize: 9, color: '#92400E', fontFamily: 'Helvetica-Bold' },
  badgeTextGray: { fontSize: 9, color: GRAY, fontFamily: 'Helvetica-Bold' },
  badgeTextRed: { fontSize: 9, color: '#991B1B', fontFamily: 'Helvetica-Bold' },
  badgeTextIndigo: { fontSize: 9, color: INDIGO, fontFamily: 'Helvetica-Bold' },

  // Score display
  scoreCard: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  scoreBox: { flex: 1, borderRadius: 6, padding: 10, alignItems: 'center' },
  scoreBoxHot: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  scoreBoxWarm: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  scoreBoxCold: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: BORDER },
  scoreBoxNum: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  scoreBoxLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  scoreBoxDesc: { fontSize: 8, color: GRAY, textAlign: 'center', marginTop: 3 },

  // Pipeline row
  pipelineRow: { flexDirection: 'row', gap: 4, marginBottom: 12, flexWrap: 'wrap' },
  pipelineStage: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 4 },
  pipelineText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Checklist
  checkRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  checkBox: { width: 14, height: 14, borderWidth: 1, borderColor: BORDER, borderRadius: 2, marginRight: 8, marginTop: 1, backgroundColor: '#fff' },
  checkText: { flex: 1, fontSize: 9.5, color: TEXT_LIGHT, lineHeight: 1.5 },

  // Calling window table
  callingRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  callingCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, color: TEXT_LIGHT },
  callingCellHeader: { flex: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT, backgroundColor: GRAY_LIGHT },

  // TOC
  tocRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 5 },
  tocDots: { flex: 1, borderBottomWidth: 1, borderBottomColor: BORDER, borderStyle: 'dashed', marginHorizontal: 8, marginBottom: 2 },
  tocLabel: { fontSize: 10, color: TEXT_LIGHT },
  tocPage: { fontSize: 9, color: GRAY },

  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 12 },
  spacer: { marginBottom: 12 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
})

// ——— Shared components ———

function PageHeader({ section }: { section: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderLogo}>LeadRadar</Text>
      <Text style={s.pageHeaderSection}>{section}</Text>
    </View>
  )
}

function PageFooter({ url }: { url?: string }) {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.pageFooterText}>{url ?? 'leadradar.cim-edge.com'}</Text>
      <Text style={s.pageNumber} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

function SectionBanner({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <View style={s.sectionBanner}>
      <Text style={s.sectionNum}>SECTION {num}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
  )
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.infoBox}>
      <Text style={s.infoBoxTitle}>{title}</Text>
      <Text style={s.infoBoxText}>{children}</Text>
    </View>
  )
}

function TipBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.tipBox}>
      <Text style={s.tipBoxTitle}>{title}</Text>
      <Text style={s.tipBoxText}>{children}</Text>
    </View>
  )
}

function WarningBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.warningBox}>
      <Text style={s.warningBoxTitle}>{title}</Text>
      <Text style={s.warningBoxText}>{children}</Text>
    </View>
  )
}

function Step({ num, title, body }: { num: number; title: string; body: string }) {
  return (
    <View style={s.stepRow}>
      <View style={s.stepCircle}><Text style={s.stepNum}>{num}</Text></View>
      <View style={s.stepContent}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepBody}>{body}</Text>
      </View>
    </View>
  )
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bullet}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  )
}

function CheckItem({ children }: { children: string }) {
  return (
    <View style={s.checkRow}>
      <View style={s.checkBox} />
      <Text style={s.checkText}>{children}</Text>
    </View>
  )
}

// ——— Main Document ———

export function LeadRadarGuide() {
  return (
    <Document
      title="LeadRadar User Guide"
      author="LeadRadar"
      subject="Complete guide to using LeadRadar CRM"
      creator="LeadRadar"
    >

      {/* ========== COVER PAGE ========== */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View style={s.coverBadge}>
            <Text style={s.coverBadgeText}>USER GUIDE</Text>
          </View>
          <Text style={s.coverTitle}>LeadRadar</Text>
          <Text style={s.coverSubtitle}>Complete Step-by-Step Guide</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverTagline}>
            Everything you need to find businesses that need websites, call them
            confidently, manage your pipeline, and close deals — from your first scan
            to your first paid client.
          </Text>
          <Text style={s.coverInfo}>
            Version 1.0  •  leadradar.cim-edge.com{'\n'}
            For support: check the app settings or run a new scan to get started.
          </Text>
        </View>
        <PageFooter />
      </Page>

      {/* ========== TABLE OF CONTENTS ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Contents" />
        <View style={{ marginTop: 20 }}>
          <Text style={[s.h2, { fontSize: 16, marginBottom: 20 }]}>Table of Contents</Text>

          {[
            ['1', 'Getting Started', '3'],
            ['2', 'Setting Up API Keys', '4'],
            ['3', 'Running Your First Scan', '5'],
            ['4', 'Understanding Lead Scores', '7'],
            ['5', 'The Main Dashboard', '8'],
            ['6', 'Lead Detail Panel', '10'],
            ['7', 'Making Calls', '12'],
            ['8', 'Email Outreach', '14'],
            ['9', 'DNC Compliance', '15'],
            ['10', 'Priority Queue', '16'],
            ['11', 'Analytics', '17'],
            ['12', 'TutorLeads', '18'],
            ['13', 'Notifications & Reminders', '20'],
            ['14', 'Settings Reference', '21'],
            ['15', 'Daily Workflow Routine', '22'],
            ['16', 'Quick-Start Checklist', '23'],
          ].map(([num, label, page]) => (
            <View key={num} style={s.tocRow}>
              <Text style={s.tocLabel}>{num}.  {label}</Text>
              <View style={s.tocDots} />
              <Text style={s.tocPage}>{page}</Text>
            </View>
          ))}
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 1: GETTING STARTED ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 1 — Getting Started" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="1" title="Getting Started" subtitle="What LeadRadar is and how the workflow works" />

          <Text style={s.body}>
            LeadRadar is your all-in-one tool for finding local businesses that do not have a website,
            cold calling them, and managing the full sales process from first contact to a closed deal.
            You use a virtual US/UK phone number to call businesses and pitch building them a professional website.
          </Text>

          <Text style={s.h2}>The Core Workflow</Text>

          <Step num={1} title="Scan directories" body="LeadRadar searches Google Maps, Yelp, and dozens of other business directories to find businesses in your target country that have no website listed. You set the filters — country, city, business category — and LeadRadar does the searching." />
          <Step num={2} title="Score and rank leads" body="Every business found is automatically scored 0–100 based on how likely they are to want a website. A restaurant with 200 reviews but no website is a 'Hot' lead. A business with no reviews and no phone is 'Cold'." />
          <Step num={3} title="Call using the Priority Queue" body="The Priority Queue shows you exactly who to call right now — businesses in the right timezone during business hours. One click copies the phone number. The First Call Wizard guides you through the conversation step by step." />
          <Step num={4} title="Send a demo website" body="When a business owner shows interest, build them a quick demo website and send the link by email or WhatsApp. The demo closes the deal." />
          <Step num={5} title="Collect commitment fee" body="When they agree to proceed, collect a 10% commitment fee. LeadRadar automatically moves them to 'Committed' in your pipeline." />
          <Step num={6} title="Build and close" body="Build the website, deliver it, collect the remainder. Update the deal to 'Closed Won' and the revenue appears in your Analytics dashboard." />

          <TipBox title="Pro Tip — The Golden Hour">
            UK businesses (9am–5pm GMT) overlap perfectly with your timezone in Nigeria (WAT/UTC+1). Start
            your calling day with UK leads — you can reach them from 9am your time without staying up late.
            US Eastern (EST) leads are best called from 3pm–11pm WAT.
          </TipBox>

          <Text style={s.h2}>What You Need to Begin</Text>
          <Bullet>A LeadRadar account (you already have one if you are reading this)</Bullet>
          <Bullet>A Google Places API key (free — $200/month credit from Google)</Bullet>
          <Bullet>A Resend API key (free — 3,000 emails/month)</Bullet>
          <Bullet>A virtual US or UK phone number (e.g. from OpenPhone or Google Voice) for making calls</Bullet>
          <Bullet>Any modern browser on your phone or computer — LeadRadar is a web app</Bullet>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 2: API KEYS ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 2 — API Keys" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="2" title="Setting Up API Keys" subtitle="One-time setup — takes about 20 minutes" />

          <Text style={s.body}>
            API keys are secret codes that allow LeadRadar to talk to other services on your behalf.
            You only set these up once. They are stored securely and never visible after you save them.
            Go to Settings → API Keys to enter them.
          </Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableCellHeader, { flex: 1.2 }]}>Key</Text>
              <Text style={[s.tableCellHeader, { flex: 2 }]}>What it does</Text>
              <Text style={[s.tableCellHeader, { flex: 1.5 }]}>Where to get it</Text>
              <Text style={s.tableCellHeader}>Free tier</Text>
            </View>
            {[
              ['Google Places', 'Searches Google Maps for businesses', 'console.cloud.google.com', '$200/mo credit'],
              ['Yelp API', 'Searches Yelp for businesses', 'fusion.yelp.com', '500 calls/day'],
              ['Apify Token', 'Scrapes all other directories', 'console.apify.com', '$5/mo credit'],
              ['Resend API', 'Sends outreach emails', 'resend.com/api-keys', '3,000/mo'],
              ['Twilio SID', 'Optional SMS reminders', 'twilio.com/console', '$15 trial credit'],
              ['Hunter.io', 'Finds contact info for leads', 'hunter.io/api-keys', '25 searches/mo'],
            ].map(([key, desc, where, limit], i, arr) => (
              <View key={key} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 1.2, fontFamily: 'Helvetica-Bold' }]}>{key}</Text>
                <Text style={[s.tableCell, { flex: 2 }]}>{desc}</Text>
                <Text style={[s.tableCell, { flex: 1.5 }]}>{where}</Text>
                <Text style={s.tableCell}>{limit}</Text>
              </View>
            ))}
          </View>

          <InfoBox title="Most important key: Google Places">
            Google Places is the most powerful source and gives you $200 of free credit every month — that
            covers thousands of searches. Set this one up first. Without it, LeadRadar can still use
            Yelp and Apify, but Google gives the best coverage.
          </InfoBox>

          <Text style={s.h2}>How to Get Your Google Places API Key</Text>
          <Step num={1} title="Go to console.cloud.google.com" body="Sign in with any Google account. Create a new project called 'LeadRadar' if prompted." />
          <Step num={2} title="Enable the Places API (New)" body="In the left menu go to APIs & Services → Library. Search for 'Places API (New)' and click Enable." />
          <Step num={3} title="Create a credential" body="Go to APIs & Services → Credentials → Create Credentials → API Key. Copy the key shown." />
          <Step num={4} title="Paste it in LeadRadar" body="Go to Settings → API Keys → Google Places API Key. Paste and click Save. You are done." />

          <WarningBox title="Keep your API keys private">
            Never share your API keys with anyone or post them publicly. LeadRadar stores them encrypted
            on the server. If a key is ever compromised, go back to the provider's website and regenerate it.
          </WarningBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 3: FIRST SCAN ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 3 — Running a Scan" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="3" title="Running Your First Scan" subtitle="Finding businesses that need a website" />

          <Text style={s.body}>
            A scan searches business directories and adds matching businesses to your leads database.
            Click "New Scan" in the sidebar to open the filter builder.
          </Text>

          <Text style={s.h2}>Setting Your Filters</Text>

          <Text style={s.h3}>1. Location</Text>
          <Text style={s.body}>
            Choose one or more countries: United States, United Kingdom, Canada, Australia, New Zealand,
            Ireland, or Nigeria. Then enter specific states/regions and cities (comma-separated).
            Example: Cities = "London, Manchester, Birmingham" for a UK scan.
          </Text>

          <Text style={s.h3}>2. Platforms to Scan</Text>
          <Text style={s.body}>
            Select the directories you want to search. Each country has its own set of platforms.
            For beginners, start with Google Business Profile + Yelp — these two cover most businesses.
            Use the "Select all for [country]" checkbox to enable all platforms for that country at once.
          </Text>

          <InfoBox title="Recommended starting platforms">
            For US/UK/CA/AU: Google Business Profile + Yelp. These are free API calls and the fastest.{'\n'}
            For deeper coverage: add Yellow Pages and TripAdvisor once your Google credit is confirmed working.{'\n'}
            For Nigeria: Google Business Profile + Nairaland Business Directory.
          </InfoBox>

          <Text style={s.h3}>3. Business Category</Text>
          <Text style={s.body}>
            Type the type of business you want to target. Suggestions appear as you type.
            Good starting categories: restaurant, plumber, salon, dentist, mechanic, bakery, gym.
            Restaurants are ideal — they usually have many reviews but are slow to build websites.
          </Text>

          <Text style={s.h3}>4. Business Filters</Text>
          <Bullet>Minimum star rating: Set to 3.5 by default. Higher ratings mean the business is established and cares about reputation.</Bullet>
          <Bullet>Minimum review count: Set to 10. Businesses with fewer reviews are harder to judge and may not be active.</Bullet>
          <Bullet>Must have phone: Keep this ON. You cannot call a business without a phone number.</Bullet>
          <Bullet>No website confirmed: Keep this ON. This is the whole point — you only want businesses without a website.</Bullet>

          <Text style={s.h3}>5. Result Controls</Text>
          <Text style={s.body}>
            Start with 50 results for your first scan. Once you see how many genuine leads come back,
            increase to 100 or 250 for future scans. The "Exclude leads already in my database" toggle
            prevents duplicates from appearing if you run the same scan again.
          </Text>

          <Text style={s.h2}>Saving a Preset</Text>
          <Text style={s.body}>
            Once you have set up a scan you like, type a name in the "Save as preset" box and click Save.
            Next time, load the preset from the dropdown instead of setting everything manually.
            Example preset names: "UK Restaurants", "US Plumbers", "CA Salons".
          </Text>

          <Text style={s.h2}>Watching the Scan Progress</Text>
          <Text style={s.body}>
            After clicking "Start Scan", you are taken to the progress page. Results stream in live —
            you will see businesses appearing in real time as each platform is searched.
            A scan of 50 results across 2 platforms takes about 30–60 seconds.
          </Text>

          <TipBox title="Best scan strategy for beginners">
            Start with one city, one category, two platforms (Google + Yelp), 50 results.
            Review the leads that come back. If they look good, broaden to more cities and more results.
            Running several focused scans is better than one huge unfocused scan.
          </TipBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 4: LEAD SCORES ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 4 — Lead Scores" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="4" title="Understanding Lead Scores" subtitle="Know instantly which businesses to call first" />

          <Text style={s.body}>
            Every business discovered gets a score from 0 to 100. This score tells you how likely
            that business is to want a website and how easy they will be to reach. Call your Hot leads first.
          </Text>

          <View style={s.scoreCard}>
            <View style={[s.scoreBox, s.scoreBoxHot]}>
              <Text style={[s.scoreBoxNum, { color: '#15803D' }]}>80–100</Text>
              <Text style={[s.scoreBoxLabel, { color: '#15803D' }]}>HOT</Text>
              <Text style={s.scoreBoxDesc}>Call these today. High reviews, phone listed, found on multiple platforms.</Text>
            </View>
            <View style={[s.scoreBox, s.scoreBoxWarm]}>
              <Text style={[s.scoreBoxNum, { color: '#92400E' }]}>50–79</Text>
              <Text style={[s.scoreBoxLabel, { color: '#92400E' }]}>WARM</Text>
              <Text style={s.scoreBoxDesc}>Good prospects. Call after your Hot leads are done.</Text>
            </View>
            <View style={[s.scoreBox, s.scoreBoxCold]}>
              <Text style={[s.scoreBoxNum, { color: GRAY }]}>0–49</Text>
              <Text style={[s.scoreBoxLabel, { color: GRAY }]}>COLD</Text>
              <Text style={s.scoreBoxDesc}>Lower priority. Few reviews or missing contact info.</Text>
            </View>
          </View>

          <Text style={s.h2}>How Points Are Calculated</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableCellHeader, { flex: 2 }]}>Factor</Text>
              <Text style={s.tableCellHeader}>Points</Text>
            </View>
            {[
              ['More than 100 reviews', '+30'],
              ['51–100 reviews', '+25'],
              ['21–50 reviews', '+15'],
              ['10–20 reviews', '+10'],
              ['Rating 4.5 or higher', '+20'],
              ['Rating 4.0–4.4', '+15'],
              ['Rating 3.5–3.9', '+10'],
              ['Found on 4+ platforms', '+20'],
              ['Found on 3 platforms', '+15'],
              ['Found on 2 platforms', '+8'],
              ['Has phone number', '+15'],
              ['Has email address', '+5'],
              ['Verified/claimed listing', '+10'],
              ['Has Facebook/social page', '+8'],
              ['High-demand category (restaurant, salon, dentist, etc.)', '+5'],
            ].map(([factor, pts], i, arr) => (
              <View key={factor} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 2 }]}>{factor}</Text>
                <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold', color: INDIGO }]}>{pts}</Text>
              </View>
            ))}
          </View>

          <Text style={s.h2}>Score Breakdown in the App</Text>
          <Text style={s.body}>
            Open any lead and scroll down to "Score Breakdown" at the bottom of the panel.
            It lists every factor and how many points that lead earned — for example:
            "43 reviews → +15 pts", "Rating 4.2 → +15 pts", "Phone number present → +15 pts".
            This helps you understand why a lead ranked where it did.
          </Text>

          <InfoBox title="Focus on Hot leads, but don't ignore Warm">
            Hot leads are the easiest calls — the business is clearly established and cares about its
            reputation. But Warm leads (50–79) often convert too, especially if you catch them at the
            right time. Work through your Hot list first, then move to Warm. Cold leads are worth a
            quick call if you have spare time.
          </InfoBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 5: DASHBOARD ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 5 — The Dashboard" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="5" title="The Main Dashboard" subtitle="Your command centre for all leads" />

          <Text style={s.body}>
            The Dashboard is where all your leads live. Every business found in every scan appears here.
            You can filter, sort, search, and take action on leads directly from this table.
          </Text>

          <Text style={s.h2}>Stats Bar (Top Row)</Text>
          <Text style={s.body}>
            Six metric cards summarise your current situation at a glance:
          </Text>
          <Bullet>Total Leads — every business in your database</Bullet>
          <Bullet>Hot Leads — businesses with a score of 80 or higher</Bullet>
          <Bullet>Calls Today — calls you have logged since midnight your time</Bullet>
          <Bullet>Pipeline Value — total deal value of leads in Committed, Building, or Closed Won</Bullet>
          <Bullet>Scheduled Today — reminders set for today that have not fired yet</Bullet>

          <Text style={s.h2}>The Stale Leads Banner</Text>
          <Text style={s.body}>
            If any leads are in the "Interested" stage but have not been contacted in 5 or more days,
            an orange banner appears at the top: "X interested leads haven't been contacted in 5+ days".
            Click "View them" to filter the table to just those leads and follow up.
          </Text>

          <Text style={s.h2}>Filtering and Searching</Text>
          <Bullet>Search box — finds leads by business name, city, category, or phone. Results update as you type.</Bullet>
          <Bullet>Pipeline stage — filter to one or more stages (e.g. show only "Interested" leads).</Bullet>
          <Bullet>Country — show only leads from one country.</Bullet>
          <Bullet>Score filter — buttons: All / Hot / Warm / Cold.</Bullet>
          <Bullet>Sort — click any column header or use the Sort By dropdown.</Bullet>

          <Text style={s.h2}>Table Column Guide</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableCellHeader, { flex: 1.2 }]}>Column</Text>
              <Text style={[s.tableCellHeader, { flex: 3 }]}>What it shows</Text>
            </View>
            {[
              ['Score', 'Colored badge: green Hot / amber Warm / gray Cold + number'],
              ['Business Name', 'Click to open the full Lead Detail panel on the right'],
              ['Category', 'Business type, e.g. "Restaurant", "Plumber"'],
              ['Location', 'Country flag + city + state abbreviation'],
              ['Rating', 'Star rating, e.g. ⭐ 4.2'],
              ['Phone', 'Click to copy to clipboard. Red ⚠ means DNC flagged.'],
              ['Local Time', 'The business\'s current time. Green dot = good to call now.'],
              ['Stage', 'Current pipeline stage. Click to change it inline.'],
              ['Sources', 'Which platforms found this business (Google, Yelp, etc.)'],
              ['Last Contact', 'How long since you last called or emailed'],
              ['Next Call', 'Your scheduled follow-up date — red if overdue'],
              ['Actions', 'Phone (log call), Mail (email), Bell (reminder), Eye (full details)'],
            ].map(([col, desc], i, arr) => (
              <View key={col} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 1.2, fontFamily: 'Helvetica-Bold' }]}>{col}</Text>
                <Text style={[s.tableCell, { flex: 3 }]}>{desc}</Text>
              </View>
            ))}
          </View>

          <Text style={s.h2}>The Local Time Dot</Text>
          <View style={s.bulletRow}>
            <Text style={[s.bullet, { color: GREEN }]}>●</Text>
            <Text style={s.bulletText}><Text style={s.bold}>Green dot</Text> — It is 9am–5pm at this business right now. Good time to call.</Text>
          </View>
          <View style={s.bulletRow}>
            <Text style={[s.bullet, { color: AMBER }]}>●</Text>
            <Text style={s.bulletText}><Text style={s.bold}>Amber dot</Text> — Early morning or late afternoon (8–9am or 5–6pm). Acceptable if needed.</Text>
          </View>
          <View style={s.bulletRow}>
            <Text style={[s.bullet, { color: RED }]}>●</Text>
            <Text style={s.bulletText}><Text style={s.bold}>Red dot</Text> — Outside business hours. Do not call. Wait for the green dot.</Text>
          </View>

          <TipBox title="Bulk actions">
            Tick the checkbox on multiple rows and a toolbar appears above the table with options to
            change stage, export, or delete all selected leads at once.
          </TipBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 6: LEAD DETAIL ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 6 — Lead Detail Panel" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="6" title="Lead Detail Panel" subtitle="Everything about one lead in one place" />

          <Text style={s.body}>
            Click any business name (or the Eye icon) to open the Lead Detail Panel on the right side of the screen.
            This panel shows everything about that lead and lets you take all actions in one place.
          </Text>

          <Text style={s.h2}>Panel Sections (Top to Bottom)</Text>

          <Text style={s.h3}>Header</Text>
          <Text style={s.body}>Business name, category, location, lead score badge, and DNC status. The DNC badge tells you if it is safe to call this number.</Text>

          <Text style={s.h3}>Contact Information</Text>
          <Text style={s.body}>Phone number (click the copy button), email, full address, and the business's live local time with business hours status. If it shows "Outside business hours", wait until the green dot appears before calling.</Text>

          <Text style={s.h3}>Platform Profiles</Text>
          <Text style={s.body}>Shows every directory where this business was found, with a clickable link to each profile (Google Maps, Yelp, TripAdvisor, etc.). Use these to research the business before calling.</Text>

          <Text style={s.h3}>Pipeline Stage</Text>
          <Text style={s.body}>The current stage is shown as a large colored badge. Click it to open a dropdown and move the lead to a new stage. Every stage change is automatically timestamped.</Text>

          <Text style={s.h2}>Pipeline Stages Explained</Text>
          <View style={s.pipelineRow}>
            {[
              { label: 'New Lead', color: '#F3F4F6', text: GRAY },
              { label: 'Attempted', color: '#EFF6FF', text: '#1D4ED8' },
              { label: 'Connected', color: '#EFF6FF', text: '#1D4ED8' },
              { label: 'Interested', color: '#ECFDF5', text: '#15803D' },
              { label: 'Demo Sent', color: '#F5F3FF', text: '#7C3AED' },
              { label: 'Proposal Made', color: '#FFF7ED', text: '#C2410C' },
              { label: 'Committed', color: '#FFF7ED', text: '#C2410C' },
              { label: 'Building', color: '#FFF7ED', text: '#C2410C' },
              { label: 'Closed Won', color: '#DCFCE7', text: '#15803D' },
              { label: 'Closed Lost', color: '#FEE2E2', text: '#991B1B' },
            ].map(st => (
              <View key={st.label} style={[s.pipelineStage, { backgroundColor: st.color }]}>
                <Text style={[s.pipelineText, { color: st.text }]}>{st.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.h3}>Call History</Text>
          <Text style={s.body}>Every call you log appears here in order. You can see the outcome, duration, and notes for each call. This is your record — keep it updated after every call.</Text>

          <Text style={s.h3}>Log New Call Form</Text>
          <Text style={s.body}>Click "Log new call" to record a call. Choose an outcome from the dropdown: No Answer, Voicemail, Interested, Not Interested, Call Back, Wrong Number, Disconnected, or Closed. Add notes about what was said. If they asked you to call back, toggle "Schedule follow-up" and pick the date — a reminder is created automatically.</Text>

          <Text style={s.h3}>Notes</Text>
          <Text style={s.body}>A free-text area for anything you want to remember about this lead. Notes auto-save when you click elsewhere — no need to press a save button.</Text>

          <Text style={s.h3}>Demo and Proposal</Text>
          <Text style={s.body}>Paste the demo website URL, track whether it was sent and reviewed, enter your quoted price, and record when the commitment fee was received. When you toggle "10% commitment fee received", the lead automatically moves to the "Committed" stage.</Text>

          <TipBox title="Keep notes after every call">
            Even a short note — "spoke to Maria, she liked the idea, sending demo Monday" — is far better
            than nothing. Future-you will thank present-you when you call back in a few days.
          </TipBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 7: MAKING CALLS ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 7 — Making Calls" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="7" title="Making Calls" subtitle="The First Call Wizard and quick call flow" />

          <Text style={s.body}>
            LeadRadar does not place calls for you — you use your own virtual phone number (e.g. from
            OpenPhone, Google Voice, or a SIM card). LeadRadar copies the number for you and guides you
            through the conversation.
          </Text>

          <Text style={s.h2}>Quick Call (Instant)</Text>
          <Step num={1} title="Click 'Quick Call'" body="In the Lead Detail Panel, click the Quick Call button. The business's phone number is automatically copied to your clipboard." />
          <Step num={2} title="Check DNC status" body="If the number is on the Do Not Call Registry, a warning appears. Read it carefully. You can still proceed if you choose, but it is noted in your audit log." />
          <Step num={3} title="Dial from your phone app" body="Open your phone app (OpenPhone, your mobile phone, etc.) and dial the number. The panel shows you the business's local time so you know if it's a good time." />
          <Step num={4} title="Log the result" body="After the call, click 'Log new call' and record the outcome. Never skip this step." />

          <Text style={s.h2}>First Call Wizard (Step-by-Step Script)</Text>
          <Text style={s.body}>
            The First Call Wizard is a guided 6-step overlay that walks you through exactly what to say.
            Click "Call Wizard" to open it. Each step shows a prompt and a countdown timer so you
            know where you are in the conversation.
          </Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.tableCellHeader}>Step</Text>
              <Text style={[s.tableCellHeader, { flex: 3 }]}>What to say / do</Text>
            </View>
            {[
              ['1 — Open', 'Introduce yourself by name and say you are calling about their online presence. Ask if this is a good time.'],
              ['2 — Hook', 'Mention you noticed they do not have a website and that you build professional sites for local businesses like theirs.'],
              ['3 — Value', 'Explain one key benefit: "A website lets customers find you on Google 24/7 and book or call without you having to advertise."'],
              ['4 — Offer', 'Offer to show them a free demo — no commitment, no cost to look. Ask if they would like to see it.'],
              ['5 — Close', 'If yes: confirm their email for the demo. If no: thank them, ask if they know anyone who might be interested, and close warmly.'],
              ['6 — Log', 'End the call, return to LeadRadar, log the outcome and notes. Schedule a follow-up if they asked you to call back.'],
            ].map(([step, script], i, arr) => (
              <View key={step} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{step}</Text>
                <Text style={[s.tableCell, { flex: 3 }]}>{script}</Text>
              </View>
            ))}
          </View>

          <Text style={s.h2}>Call Outcomes</Text>
          <Bullet>No Answer — tried but no one picked up. LeadRadar records the attempt. Try again later.</Bullet>
          <Bullet>Voicemail — left a message. Follow up in 2 days if no callback.</Bullet>
          <Bullet>Interested — great! Move stage to "Interested", schedule a demo, build it and send within 24 hours.</Bullet>
          <Bullet>Not Interested — move to "Not Interested" and stop calling. Respect their decision.</Bullet>
          <Bullet>Call Back — they asked you to call at a specific time. Use "Schedule follow-up" to set a reminder.</Bullet>
          <Bullet>Wrong Number — the directory had the wrong number. Note it and look for a phone enrichment option.</Bullet>

          <TipBox title="The magic of calling UK leads in the morning">
            UK businesses (9am–5pm BST/GMT) overlap almost perfectly with WAT (Nigeria time). This means
            you can call UK leads during normal working hours without staying up late. Use the Priority Queue
            every morning to find UK leads that are open right now.
          </TipBox>

          <InfoBox title="Using your virtual number">
            Always call from your virtual US or UK number — businesses are more likely to answer a local
            number than an international one starting with +234. Services like OpenPhone ($13/month for
            US numbers) or Google Voice (free for US) give you a local-looking number.
          </InfoBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 8: EMAIL OUTREACH ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 8 — Email Outreach" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="8" title="Email Outreach" subtitle="Three professional templates ready to send" />

          <Text style={s.body}>
            If you have an email address for a lead, you can send one of three pre-written email templates
            directly from LeadRadar. The emails are sent via your Resend account (3,000 free/month).
          </Text>

          <Text style={s.h2}>The Three Templates</Text>
          <Bullet>Introduction — Your very first contact: "I noticed you don't have a website, I'd love to show you what I can build."</Bullet>
          <Bullet>Follow-up — Sent 3–5 days after no reply: "Following up in case my last message got buried."</Bullet>
          <Bullet>Demo Invitation — Sent after building the demo: "I built a demo website for your business — here's the link."</Bullet>

          <Text style={s.h2}>Sending an Email</Text>
          <Step num={1} title="Open the lead detail panel" body="Click the business name or the Eye icon in the table." />
          <Step num={2} title="Click 'Compose email'" body="The Email Outreach card is in the panel. Click the compose button to open the form." />
          <Step num={3} title="Enter the email address" body="Type the recipient's email, or it is auto-filled if the lead already has an email stored." />
          <Step num={4} title="Choose a template" body="Select Introduction, Follow-up, or Demo Invitation from the dropdown." />
          <Step num={5} title="Preview and optionally edit" body="The email preview shows the template with the business name, city, and other details filled in. Toggle Edit to make any changes." />
          <Step num={6} title="Click Send" body="LeadRadar sends the email and records it in the email history for that lead." />

          <Text style={s.h2}>Email History</Text>
          <Text style={s.body}>
            All sent emails appear in the Email Outreach card when it is not in compose mode.
            You can see the date, template used, and delivery status for every email sent.
          </Text>

          <Text style={s.h2}>Customising Templates</Text>
          <Text style={s.body}>
            To permanently change the default templates, go to Settings → Email Templates.
            Each template has an editable subject line and body. Click "Reset to default" to restore
            the original text. Changes apply to all future emails but do not affect emails already sent.
          </Text>

          <WarningBox title="Email addresses are rare — find them with enrichment">
            Most business directory listings do not include an email address. If a lead has no email,
            try Google-searching "business name + city + email" or visiting their Facebook page.
            Hunter.io (Settings → API Keys) can sometimes find emails from domain names.
          </WarningBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 9: DNC ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 9 — DNC Compliance" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="9" title="DNC Compliance" subtitle="Protect yourself when calling US numbers" />

          <Text style={s.body}>
            The Do Not Call (DNC) Registry is a US government list of phone numbers whose owners have
            asked not to receive unsolicited sales calls. Calling registered numbers can result in fines
            of thousands of dollars per call. LeadRadar checks numbers automatically.
          </Text>

          <Text style={s.h2}>DNC Status Badges</Text>
          <View style={s.badgeRow}>
            <View style={[s.badge, s.badgeGreen]}><Text style={s.badgeTextGreen}>✓ DNC Clear</Text></View>
            <View style={[s.badge, s.badgeRed]}><Text style={s.badgeTextRed}>⚠ DNC Flagged</Text></View>
            <View style={[s.badge, s.badgeGray]}><Text style={s.badgeTextGray}>Unchecked</Text></View>
            <View style={[s.badge, s.badgeAmber]}><Text style={s.badgeTextAmber}>Manual Check Needed</Text></View>
          </View>

          <Bullet>DNC Clear — safe to call. The number is not on the US registry.</Bullet>
          <Bullet>DNC Flagged — number IS on the registry. Do not call unless you have a specific business relationship.</Bullet>
          <Bullet>Unchecked — click "Check now" to run the check. Happens automatically when a phone number is added.</Bullet>
          <Bullet>Manual Check Needed — for UK numbers (TPS) and other countries. LeadRadar provides a direct link to the manual checker.</Bullet>

          <Text style={s.h2}>What Happens If You Try to Call a Flagged Number?</Text>
          <Text style={s.body}>
            LeadRadar shows a warning modal with the text of the FTC regulation and two buttons:
            "Cancel — do not call" (recommended) and "I understand the risk — proceed anyway".
            If you choose to proceed, this is recorded in your audit log.
          </Text>

          <WarningBox title="UK businesses use TPS — check manually">
            UK businesses may be registered on the Telephone Preference Service (TPS). LeadRadar
            flags UK numbers as "Manual Check Needed" and provides a link to tpsonline.org.uk.
            For B2B calls (business to business), TPS rules are slightly different — consult the
            TPS website or a legal advisor if unsure.
          </WarningBox>

          <InfoBox title="Nigeria and other countries">
            Nigerian numbers are flagged as "Manual Check Needed" with guidance from the Nigerian
            IT Development Agency (NITDA). Always confirm you have a legitimate reason to contact
            the business before calling international numbers.
          </InfoBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 10: PRIORITY QUEUE ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 10 — Priority Queue" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="10" title="Priority Queue" subtitle="Who to call right now, ranked and ready" />

          <Text style={s.body}>
            The Priority Queue is your daily calling list. Open it at the start of your calling session
            and work through it top to bottom. You will never waste time wondering who to call next.
          </Text>

          <Text style={s.h2}>The "Call This Now" Hero Card</Text>
          <Text style={s.body}>
            At the top of the page is the single best lead for you to call right now. It is calculated
            automatically based on: high lead score, currently in business hours, not contacted today,
            and not DNC flagged. The card shows:
          </Text>
          <Bullet>Business name, category, and city</Bullet>
          <Bullet>Phone number with copy button</Bullet>
          <Bullet>"It is 2:30pm in London — good time to call"</Bullet>
          <Bullet>Days since last contact</Bullet>
          <Bullet>A large "Prepare to Call" button that opens the full Call panel</Bullet>

          <Text style={s.h2}>Today's Queue</Text>
          <Text style={s.body}>
            Below the hero card is a ranked list of all leads worth calling today. Each row shows
            the business name, score, local time, and business hours status dot.
            Leads not currently in business hours show: "Best time to call: 3pm–11pm your time (WAT)".
          </Text>

          <Text style={s.h2}>Best Calling Windows</Text>
          <Text style={s.body}>
            A table on this page shows you exactly when to call each market, converted to your WAT timezone:
          </Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.callingCellHeader}>Target market</Text>
              <Text style={s.callingCellHeader}>Their hours</Text>
              <Text style={s.callingCellHeader}>Your call time (WAT)</Text>
            </View>
            {[
              ['United Kingdom (GMT)', '9am–5pm', '9am–5pm WAT'],
              ['United Kingdom (BST summer)', '9am–5pm', '8am–4pm WAT'],
              ['Ireland (GMT)', '9am–5pm', '9am–5pm WAT'],
              ['US Eastern (EST)', '9am–5pm', '3pm–11pm WAT'],
              ['US Central (CST)', '9am–5pm', '4pm–midnight WAT'],
              ['US Eastern (EDT summer)', '9am–5pm', '2pm–10pm WAT'],
              ['Canada Eastern', '9am–5pm', '3pm–11pm WAT'],
              ['Australia Sydney (AEST)', '9am–5pm', 'midnight–8am WAT'],
              ['New Zealand (NZST)', '9am–5pm', '10pm–6am WAT'],
            ].map(([market, their, your_], i, arr) => (
              <View key={market} style={i < arr.length - 1 ? s.callingRow : [s.callingRow, { borderBottomWidth: 0 }]}>
                <Text style={s.callingCell}>{market}</Text>
                <Text style={s.callingCell}>{their}</Text>
                <Text style={[s.callingCell, { fontFamily: 'Helvetica-Bold', color: INDIGO }]}>{your_}</Text>
              </View>
            ))}
          </View>

          <TipBox title="UK first, US later">
            Start your day with UK leads at 9am WAT. Switch to US Eastern leads at 3pm WAT.
            This lets you do two full calling sessions in one workday without unusual hours.
          </TipBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 11: ANALYTICS ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 11 — Analytics" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="11" title="Analytics" subtitle="Understand what is working and improve" />

          <Text style={s.body}>
            The Analytics page turns your call and lead data into visual charts. Use it weekly to
            spot trends: which categories convert best, which hours your calls succeed, which platforms
            bring the best leads.
          </Text>

          <Text style={s.h2}>Charts Available</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableCellHeader, { flex: 1.5 }]}>Chart</Text>
              <Text style={[s.tableCellHeader, { flex: 2.5 }]}>What to look for</Text>
            </View>
            {[
              ['Pipeline Funnel', 'Shows how many leads are at each stage. A big drop between Connected and Interested means your pitch needs work.'],
              ['Calls Per Day', 'Are you calling consistently? Gaps in the chart mean days you skipped.'],
              ['Lead Score Distribution', 'What quality are your leads? If most are Cold, refine your scan filters.'],
              ['Win Rate by Country', 'Which country converts best for you? Focus more scans there.'],
              ['Win Rate by Category', 'Which business type is easiest to close? Do more scans in that niche.'],
              ['Platform Performance', 'Which directory finds leads that actually convert? Drop low performers.'],
              ['Calling Hours Heatmap', 'Which day and hour generates the most Interested outcomes? Block that time for calling.'],
              ['Revenue Forecast', 'Solid line = closed revenue. Dashed line = projected if committed deals close.'],
            ].map(([chart, insight], i, arr) => (
              <View key={chart} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 1.5, fontFamily: 'Helvetica-Bold' }]}>{chart}</Text>
                <Text style={[s.tableCell, { flex: 2.5 }]}>{insight}</Text>
              </View>
            ))}
          </View>

          <Text style={s.h2}>Date Filters</Text>
          <Text style={s.body}>
            All charts respond to the date range selector at the top: Last 7 days, Last 30 days,
            Last 90 days, or a custom range. Start with Last 30 days for a meaningful picture.
            You need at least 20–30 calls logged before the charts become useful.
          </Text>

          <InfoBox title="Export from Analytics">
            The Export button on the Analytics page downloads a CSV or Excel file of all leads
            matching your current filters. Use this to share progress reports or do deeper analysis
            in a spreadsheet.
          </InfoBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 12: TUTOR LEADS ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 12 — TutorLeads" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="12" title="TutorLeads" subtitle="Finding students who need academic help" />

          <Text style={s.body}>
            TutorLeads is a separate section for your academic tutoring business. It helps you find
            international students on Reddit and other platforms who are actively looking for tutoring,
            proofreading, coaching, or exam preparation help. Click "TutorLeads" in the sidebar.
          </Text>

          <Text style={s.h2}>The Four Tabs</Text>

          <Text style={s.h3}>My Leads</Text>
          <Text style={s.body}>
            Your full list of student leads with a stats bar at the top (total students, active pipeline,
            sessions completed, total earned). Filter by status using the pipeline buttons.
            Click any lead to open the detail panel with contact info, Reddit post, session tracking, and notes.
          </Text>

          <Text style={s.h3}>Find Students (Auto-Scan)</Text>
          <Text style={s.body}>
            This is the automated scanner. It searches Reddit's public posts for students asking for help.
            No API key needed — Reddit's public search is completely free.
          </Text>

          <Step num={1} title="Choose subjects" body="Select the academic subjects you teach: Mathematics, Physics, Chemistry, English, Essay Writing, IELTS/TOEFL Prep, Statistics, and more. You can select multiple." />
          <Step num={2} title="Choose service types" body="Select what services you offer: Tutoring, Proofreading/Editing, Exam Prep, Coaching, Research Guidance." />
          <Step num={3} title="Choose subreddits" body="Select which Reddit communities to search. Pre-loaded with the best ones: r/HomeworkHelp, r/learnmath, r/IELTS, r/AskAcademia, r/GradSchool, and 8 more." />
          <Step num={4} title="Set max results" body="Start with 20–50. The scanner deduplicates automatically — you will never see the same Reddit user twice." />
          <Step num={5} title="Click Find Students Now" body="The scan runs (takes 15–30 seconds) and adds matching students directly to your My Leads tab." />

          <Text style={s.h3}>Add Manually</Text>
          <Text style={s.body}>
            Add a student lead manually with a form: name, contact method (WhatsApp, email, Reddit, etc.),
            university, country, subject, service type, hourly rate, and notes.
            Use this for leads you find yourself outside the scanner.
          </Text>

          <Text style={s.h3}>Where to Look</Text>
          <Text style={s.body}>
            Tips for finding students manually on Reddit, Facebook Groups, LinkedIn, Instagram, and TikTok.
            Useful when the scanner does not surface enough leads for a niche subject.
          </Text>

          <Text style={s.h2}>Student Pipeline Stages</Text>
          <View style={s.pipelineRow}>
            {[
              { label: 'Inquiry', color: '#F3F4F6', text: GRAY },
              { label: 'Contacted', color: '#EFF6FF', text: '#1D4ED8' },
              { label: 'Trial', color: '#FFF7ED', text: '#C2410C' },
              { label: 'Ongoing', color: '#ECFDF5', text: '#15803D' },
              { label: 'Completed', color: '#F5F3FF', text: '#7C3AED' },
              { label: 'Lost', color: '#FEE2E2', text: '#991B1B' },
            ].map(st => (
              <View key={st.label} style={[s.pipelineStage, { backgroundColor: st.color }]}>
                <Text style={[s.pipelineText, { color: st.text }]}>{st.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.h2}>WhatsApp Direct Links</Text>
          <Text style={s.body}>
            If a student's contact is their WhatsApp number, the lead detail panel shows a green WhatsApp button
            that opens a pre-filled message in your WhatsApp app — no copying and pasting needed.
          </Text>

          <Text style={s.h2}>Setting Up the TutorLeads Database</Text>
          <WarningBox title="One-time setup required">
            TutorLeads uses a separate database table that needs to be created manually in Supabase.
            If you see a banner on the TutorLeads page saying "Database table not set up yet", click
            the "Copy SQL" button, go to your Supabase project → SQL Editor, paste and run the SQL.
            This only needs to be done once.
          </WarningBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 13: NOTIFICATIONS ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 13 — Notifications" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="13" title="Notifications & Reminders" subtitle="Never miss a follow-up call again" />

          <Text style={s.body}>
            LeadRadar sends you three types of notifications: call reminders (30 minutes before a scheduled call),
            a morning briefing (daily summary of your to-do list), and a weekly digest (your performance summary).
          </Text>

          <Text style={s.h2}>Call Reminders</Text>
          <Text style={s.body}>
            When you schedule a follow-up in the call log form, LeadRadar creates a reminder. 30 minutes
            before the scheduled time, you receive an email with:
          </Text>
          <Bullet>The business name, category, and phone number (large and prominent)</Bullet>
          <Bullet>Their current local time and whether it is business hours</Bullet>
          <Bullet>Your personal call script</Bullet>
          <Bullet>A direct link to open that lead in LeadRadar</Bullet>

          <Text style={s.h2}>Morning Briefing Email</Text>
          <Text style={s.body}>
            Set a morning briefing time in Settings (default 8:00am your time). Every morning at that hour
            you receive an email showing:
          </Text>
          <Bullet>Today's scheduled calls with their times</Bullet>
          <Bullet>Overdue follow-ups (calls you were meant to make but haven't yet)</Bullet>
          <Bullet>Stale "Interested" leads not contacted in 5+ days</Bullet>
          <Bullet>Top 5 new leads added in the last 48 hours</Bullet>

          <Text style={s.h2}>Weekly Digest Email</Text>
          <Text style={s.body}>
            Every Sunday (or your chosen day) you receive a performance report for the past 7 days:
          </Text>
          <Bullet>Total calls logged this week</Bullet>
          <Bullet>How many leads moved to each stage</Bullet>
          <Bullet>Current pipeline value</Bullet>
          <Bullet>Deals closed and total revenue earned</Bullet>
          <Bullet>Best performing niche and platform</Bullet>

          <Text style={s.h2}>Enabling Notifications</Text>
          <Step num={1} title="Go to Settings → Notifications" body="Toggle 'Morning briefing enabled' and set your preferred time." />
          <Step num={2} title="Set your timezone" body="Settings → My Timezone → select Africa/Lagos (WAT, UTC+1). This ensures emails arrive at the right time." />
          <Step num={3} title="Add your Resend API key" body="Settings → API Keys → Resend API Key. Without this, no emails are sent." />
          <Step num={4} title="Optional: SMS reminders" body="If you have a Twilio account, toggle SMS Notifications, enter your mobile number, and add your Twilio credentials in API Keys." />
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 14: SETTINGS ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 14 — Settings" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="14" title="Settings Reference" subtitle="Every settings section explained" />

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableCellHeader, { flex: 1.5 }]}>Section</Text>
              <Text style={[s.tableCellHeader, { flex: 2.5 }]}>What you can do there</Text>
            </View>
            {[
              ['Profile', 'Update your display name. Your email cannot be changed here.'],
              ['Change Password', 'Enter your current password and choose a new one.'],
              ['Two-Factor Authentication', 'Enable 2FA with any authenticator app (Google Authenticator, Authy, etc.). Scan the QR code, enter the 6-digit code to confirm. Highly recommended.'],
              ['Notifications', 'Toggle morning briefing, weekly digest, and SMS reminders. Set preferred times and your mobile number.'],
              ['My Timezone', 'Set your timezone (Africa/Lagos for Nigeria). Used for calling windows and email delivery times.'],
              ['Call Script Editor', 'Write your personal call script. Shown in the First Call Wizard and in call reminder emails.'],
              ['Email Templates', 'Customise the three outreach email templates. Edit subject and body. Reset to defaults any time.'],
              ['API Keys', 'Enter your keys for Google Places, Yelp, Apify, Resend, Twilio, Hunter.io. All stored encrypted.'],
              ['Filter Presets', 'Rename or delete your saved scan presets. Load them in the New Scan page.'],
              ['Data Management', 'Export ALL your data as a CSV file. Delete your account (requires typing your email to confirm).'],
            ].map(([section, desc], i, arr) => (
              <View key={section} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { flex: 1.5, fontFamily: 'Helvetica-Bold' }]}>{section}</Text>
                <Text style={[s.tableCell, { flex: 2.5 }]}>{desc}</Text>
              </View>
            ))}
          </View>

          <InfoBox title="API keys are never shown after saving">
            Once you save an API key, the field shows masked dots (•••••••). To replace a key,
            simply paste the new value and save again. LeadRadar never sends your keys to the browser
            after they are stored.
          </InfoBox>

          <TipBox title="Enable 2FA right now">
            Two-factor authentication protects your leads database even if your password is compromised.
            Go to Settings → Two-Factor Authentication, open Google Authenticator or Authy on your phone,
            scan the QR code, enter the 6-digit code shown, and click Confirm. Takes 2 minutes.
          </TipBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 15: DAILY WORKFLOW ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 15 — Daily Workflow" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="15" title="Daily Workflow Routine" subtitle="What a productive day with LeadRadar looks like" />

          <Text style={s.body}>
            The most successful users of LeadRadar follow a consistent daily routine. Here is the
            recommended schedule for someone based in Nigeria (WAT, UTC+1).
          </Text>

          <Text style={s.h2}>Morning (9:00am – 10:00am WAT)</Text>
          <Step num={1} title="Read your morning briefing email" body="LeadRadar sends this to your inbox at 8am (if enabled). It lists today's scheduled calls, overdue follow-ups, and stale leads. This is your to-do list for the day." />
          <Step num={2} title="Open Priority Queue in LeadRadar" body="The queue shows you UK leads that are currently open (9am–5pm GMT = 9am–5pm WAT). Start calling UK leads right now while the window is open." />
          <Step num={3} title="Run a quick scan if needed" body="If your lead count is low, run a 5-minute scan for UK restaurants, plumbers, or salons while you prepare for calls." />

          <Text style={s.h2}>Mid-Morning (10:00am – 1:00pm WAT)</Text>
          <Step num={4} title="Call UK and Ireland leads" body="Work through the Priority Queue. UK businesses are open. Log every call result — even 'No Answer' counts." />
          <Step num={5} title="Send demos from yesterday's interested leads" body="If anyone showed interest yesterday, build and send their demo website today. Speed matters — send within 24 hours." />

          <Text style={s.h2}>Afternoon (3:00pm – 6:00pm WAT)</Text>
          <Step num={6} title="Switch to US Eastern leads" body="From 3pm WAT, US Eastern time reaches 9am (business hours). Work through US East Coast leads in the Priority Queue." />
          <Step num={7} title="Follow up on demos sent" body="If you sent a demo 2–3 days ago with no reply, send the Follow-up email template or call again." />

          <Text style={s.h2}>Evening (Any time after calls)</Text>
          <Step num={8} title="Update notes and stages" body="Review every call you logged today. Make sure stages are up to date, notes are complete, and follow-up dates are set." />
          <Step num={9} title="Plan tomorrow's calls" body="Check the Priority Queue for tomorrow. If you have follow-up calls scheduled, confirm the times are in business hours." />
          <Step num={10} title="TutorLeads check" body="If you run the tutoring business too, check TutorLeads for any new student inquiries and send responses." />

          <TipBox title="Consistency beats intensity">
            50 calls spread across 5 days beats 50 calls in one day. Businesses need multiple touches
            before they agree. A regular daily routine keeps your pipeline moving and your follow-ups
            on time. Even 10 calls a day adds up to 200–300 calls a month.
          </TipBox>
        </View>
        <PageFooter />
      </Page>

      {/* ========== SECTION 16: CHECKLIST ========== */}
      <Page size="A4" style={s.page}>
        <PageHeader section="Section 16 — Quick-Start Checklist" />
        <View style={{ marginTop: 20 }}>
          <SectionBanner num="16" title="Quick-Start Checklist" subtitle="Everything to do in your first week" />

          <Text style={s.h2}>Day 1 — Set Up</Text>
          <CheckItem>Log in to LeadRadar at leadradar.cim-edge.com</CheckItem>
          <CheckItem>Go to Settings → API Keys and enter your Google Places API key</CheckItem>
          <CheckItem>Go to Settings → API Keys and enter your Resend API key</CheckItem>
          <CheckItem>Go to Settings → My Timezone and confirm Africa/Lagos (WAT) is selected</CheckItem>
          <CheckItem>Enable morning briefing in Settings → Notifications and set the time to 8:00am</CheckItem>
          <CheckItem>Enable 2FA in Settings → Two-Factor Authentication</CheckItem>

          <Text style={[s.h2, { marginTop: 12 }]}>Day 1 — First Scan</Text>
          <CheckItem>Click "New Scan" in the sidebar</CheckItem>
          <CheckItem>Select United Kingdom as the country</CheckItem>
          <CheckItem>Enter "London" as the city</CheckItem>
          <CheckItem>Select Google Business Profile as the platform</CheckItem>
          <CheckItem>Enter "restaurant" as the business category</CheckItem>
          <CheckItem>Set results to 50 and click Start Scan</CheckItem>
          <CheckItem>Wait for the scan to complete and check the Dashboard for new leads</CheckItem>

          <Text style={[s.h2, { marginTop: 12 }]}>Day 2 — First Calls</Text>
          <CheckItem>Open Priority Queue and find UK leads with a green dot (currently open)</CheckItem>
          <CheckItem>Click "Prepare to Call" on the top lead</CheckItem>
          <CheckItem>Use the First Call Wizard to guide your first conversation</CheckItem>
          <CheckItem>Log the outcome of every call — even if no one answered</CheckItem>
          <CheckItem>Make at least 10 calls on day 2</CheckItem>

          <Text style={[s.h2, { marginTop: 12 }]}>Week 1 — Build the Habit</Text>
          <CheckItem>Call at least 10 leads per day, every day</CheckItem>
          <CheckItem>Run a new scan every 2 days to keep your lead count above 100</CheckItem>
          <CheckItem>Send a demo within 24 hours of any "Interested" outcome</CheckItem>
          <CheckItem>Check Analytics at end of week: which category converts best?</CheckItem>
          <CheckItem>Save your best scan settings as a preset for next week</CheckItem>

          <Text style={[s.h2, { marginTop: 12 }]}>TutorLeads Setup (if applicable)</Text>
          <CheckItem>Open TutorLeads in the sidebar</CheckItem>
          <CheckItem>If prompted, copy the SQL and run it in your Supabase SQL Editor</CheckItem>
          <CheckItem>Go to Find Students tab and select your subjects and service types</CheckItem>
          <CheckItem>Run the auto-scan to find your first student leads from Reddit</CheckItem>
          <CheckItem>Contact promising students via WhatsApp or email within 24 hours</CheckItem>

          <View style={[s.infoBox, { marginTop: 20 }]}>
            <Text style={[s.infoBoxTitle, { fontSize: 11 }]}>You are ready. Start calling.</Text>
            <Text style={s.infoBoxText}>
              The businesses are out there. They have no website. They are losing customers to competitors
              who do. You can solve that problem for them — and get paid well to do it. Open your Priority
              Queue, pick up your virtual phone, and start. The first call is always the hardest. After
              that, it gets easier every day.{'\n\n'}
              Good luck, Isaac.
            </Text>
          </View>

          <View style={[s.divider, { marginTop: 24 }]} />
          <Text style={[s.coverInfo, { textAlign: 'center', marginTop: 12, fontSize: 9, color: GRAY }]}>
            LeadRadar User Guide v1.0  •  leadradar.cim-edge.com{'\n'}
            Built for Isaac Morah and the LeadRadar team
          </Text>
        </View>
        <PageFooter />
      </Page>

    </Document>
  )
}
