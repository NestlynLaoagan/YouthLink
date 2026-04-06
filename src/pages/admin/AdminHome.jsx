/**
 * AdminHome.jsx — Rich Dashboard
 */

import React, { useState, useEffect } from 'react'
import {
  Users, Megaphone, FolderOpen, Calendar, Star, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import { supabase }      from '../../lib/supabase'
import { useAdminTheme } from '../../contexts/AdminThemeContext'
import { useNavigate }   from 'react-router-dom'

const MF = "'Montserrat','Plus Jakarta Sans',sans-serif"
const IF = "'Plus Jakarta Sans','Inter',sans-serif"

const C = {
  navy:'#1A365D', gold:'#D69E2E', teal:'#2C7A7B',
  rose:'#C53030', green:'#276749', sky:'#2B6CB0',
  purple:'#553C9A', orange:'#C05621',
}

const PROJ_CATEGORIES = [
  'Health & Environment',
  'Education',
  'Economic Empowerment',
  'Social Inclusion and Equity',
  'Peacebuilding and Security',
  'Active Citizenship and Governance',
]

// Short display labels for the X-axis (avoids overflow)
const CATEGORY_LABELS = {
  'Health & Environment':              'Health & Env.',
  'Education':                         'Education',
  'Economic Empowerment':              'Economic',
  'Social Inclusion and Equity':       'Social',
  'Peacebuilding and Security':        'Peacebuilding',
  'Active Citizenship and Governance': 'Citizenship',
}

const PARTICIPATION_DATA = [] // replaced by live memberActivityData state

const AGE_BUCKETS = [
  { name:'Ages 15–20', min:15, max:20, color:'#2C7A7B' },
  { name:'Ages 21–24', min:21, max:24, color:'#2B6CB0' },
  { name:'Ages 25–30', min:25, max:30, color:'#D69E2E' },
]


function StatCard({ icon: Icon, label, value, sub, accent, path, dark, T }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => path && navigate(path)}
      style={{
        background: dark
          ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 100%)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:`1px solid ${dark?'rgba(255,255,255,0.10)':'rgba(255,255,255,0.95)'}`,
        borderRadius:18, padding:'22px 24px',
        cursor: path ? 'pointer' : 'default',
        display:'flex', flexDirection:'column', gap:10,
        boxShadow: dark
          ? '0 8px 32px rgba(0,0,0,0.35)'
          : `0 4px 24px rgba(26,54,93,0.09), inset 0 1px 0 rgba(255,255,255,0.9)`,
        transition:'all .2s', position:'relative', overflow:'hidden',
      }}
      onMouseEnter={e => { if(path){ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 40px ${accent}35` }}}
      onMouseLeave={e => { if(path){ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=dark?'0 8px 32px rgba(0,0,0,0.35)':'0 4px 24px rgba(26,54,93,0.09)' }}}
    >
      <div style={{ position:'absolute', top:-20, right:-20, width:90, height:90, borderRadius:'50%', background:`${accent}15`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:44, height:44, borderRadius:13, background:`${accent}18`, border:`1.5px solid ${accent}28`, flexShrink:0 }}>
          <Icon size={20} style={{ color:accent }}/>
        </div>
        {path && <ChevronRight size={14} style={{ color:T.textMuted, marginTop:4 }}/>}
      </div>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'1.2px', fontFamily:IF, marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:32, fontWeight:900, color:dark?'white':C.navy, fontFamily:MF, lineHeight:1, letterSpacing:'-0.5px' }}>{value}</div>
      </div>
      <div style={{ fontSize:11, color:T.textMuted, fontFamily:IF }}>{sub}</div>
    </div>
  )
}

function ChartCard({ title, children, T, dark, style={} }) {
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      border:`1px solid ${dark?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.95)'}`,
      borderRadius:18, padding:'22px 24px',
      boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.28)' : '0 2px 16px rgba(26,54,93,0.07)',
      ...style,
    }}>
      <div style={{ fontSize:13, fontWeight:800, color:dark?'white':C.navy, fontFamily:MF, marginBottom:18, letterSpacing:'-0.2px' }}>{title}</div>
      {children}
    </div>
  )
}

function ChartTooltip({ active, payload, label, dark, T }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:dark?'#1A2744':'white', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
      <p style={{ fontSize:12, fontWeight:700, color:dark?'white':C.navy, margin:'0 0 6px', fontFamily:MF }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ fontSize:11, color:p.color, margin:'2px 0', fontFamily:IF }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

function StarRow({ stars, count, pct, dark, T }) {
  const META = {
    5: { emoji:'🤩', label:'Excellent', color:'#B5006B' },
    4: { emoji:'😊', label:'Good',      color:'#276749' },
    3: { emoji:'😐', label:'Average',   color:'#D69E2E' },
    2: { emoji:'😕', label:'Poor',      color:'#C05621' },
    1: { emoji:'😠', label:'Bad',       color:'#C53030' },
  }
  const m = META[stars] || META[3]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0, width:80 }}>
        <span style={{ fontSize:14 }}>{m.emoji}</span>
        <span style={{ fontSize:11, fontWeight:700, color:m.color, fontFamily:IF, whiteSpace:'nowrap' }}>{m.label}</span>
      </div>
      <div style={{ flex:1, height:8, borderRadius:99, background:dark?'rgba(255,255,255,0.07)':'#EEF2F7', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${m.color},${m.color}bb)`, borderRadius:99, transition:'width .6s' }}/>
      </div>
      <span style={{ fontSize:11, color:T.textMuted, fontFamily:IF, minWidth:32, textAlign:'right' }}>{pct}%</span>
      <span style={{ fontSize:11, fontWeight:700, color:dark?'white':C.navy, fontFamily:IF, minWidth:24, textAlign:'right' }}>{count}</span>
    </div>
  )
}

export default function AdminHome() {
  const { T, dark } = useAdminTheme()

  // ── Live stat counts ──────────────────────────────────────────────
  const [counts, setCounts] = useState({ members:0, announcements:0, activeProjects:0, events:0 })

  // ── Project category breakdown ────────────────────────────────────
  const [projectData, setProjectData] = useState(
    PROJ_CATEGORIES.map(cat => ({ category: CATEGORY_LABELS[cat], full: cat, Planning:0, Upcoming:0, Ongoing:0, Completed:0 }))
  )

  // ── Member activity data (Active vs Inactive by month) ───────────
  const [memberActivityData, setMemberActivityData] = useState([])
  const [activitySummary,    setActivitySummary]    = useState({ active:0, inactive:0, total:0 })

  // ── Age group data (from event participants) ──────────────────────
  const [ageData, setAgeData] = useState(AGE_BUCKETS.map(b => ({ ...b, value: 0, count: 0 })))
  const [totalParticipants, setTotalParticipants] = useState(0)

  // ── Live feedback data ────────────────────────────────────────────
  const [feedbackData, setFeedbackData] = useState({
    totalResponses: 0,
    avgScore:       0,
    ratingRows:     [
      { stars:5, count:0, pct:0 },
      { stars:4, count:0, pct:0 },
      { stars:3, count:0, pct:0 },
      { stars:2, count:0, pct:0 },
      { stars:1, count:0, pct:0 },
    ],
  })

  // ── Helper: compute Active vs Inactive members per month ─────────
  const computeMemberActivity = async () => {
    try {
      // 1. All registered members
      const { data: members } = await supabase
        .from('user_roles')
        .select('user_id, created_at')
      const allMembers = (members || [])

      // 2. All login events (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      sixMonthsAgo.setHours(0, 0, 0, 0)

      const { data: logins } = await supabase
        .from('login_history')
        .select('user_id, logged_in_at')
        .eq('status', 'success')
        .gte('logged_in_at', sixMonthsAgo.toISOString())

      const loginRows = logins || []

      // 3. Build last-6-months array
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        months.push({
          year:  d.getFullYear(),
          month: d.getMonth(), // 0-indexed
          label: d.toLocaleString('en-PH', { month: 'short' }) + ' ' + d.getFullYear().toString().slice(2),
        })
      }

      // 4. For each month, count members registered by that month
      //    then split into Active (logged in that month) vs Inactive
      const data = months.map(({ year, month, label }) => {
        const monthStart = new Date(year, month, 1)
        const monthEnd   = new Date(year, month + 1, 1)

        // Members who had registered by end of this month
        const registeredByMonth = allMembers.filter(m => {
          const reg = m.created_at ? new Date(m.created_at) : null
          return reg && reg < monthEnd
        })

        // Unique user_ids who logged in this month
        const activeIds = new Set(
          loginRows
            .filter(l => {
              const d = new Date(l.logged_in_at)
              return d >= monthStart && d < monthEnd
            })
            .map(l => l.user_id)
            .filter(Boolean)
        )

        const total    = registeredByMonth.length
        const active   = registeredByMonth.filter(m => activeIds.has(m.user_id)).length
        const inactive = total - active

        return { month: label, Active: active, Inactive: inactive, Total: total }
      })

      setMemberActivityData(data)

      // 5. Current month summary (last entry)
      const latest = data[data.length - 1] || { Active:0, Inactive:0, Total:0 }
      setActivitySummary({ active: latest.Active, inactive: latest.Inactive, total: latest.Total })

    } catch (err) {
      console.error('Member activity data error:', err)
    }
  }

  // ── Helper: compute project category breakdown from DB ────────────
  const computeProjectData = async () => {
    try {
      const { data } = await supabase.from('projects').select('status, category')
      const rows = data ?? []
      const map = {}
      PROJ_CATEGORIES.forEach(cat => {
        map[cat] = { category: CATEGORY_LABELS[cat], full: cat, Planning:0, Upcoming:0, Ongoing:0, Completed:0 }
      })
      rows.forEach(p => {
        const cat = p.category
        if (!cat || !map[cat]) return
        const s = (p.status || '').toLowerCase().trim()
        if (s === 'planning')                                               map[cat].Planning++
        else if (s === 'upcoming')                                          map[cat].Upcoming++
        else if (s === 'ongoing')                                           map[cat].Ongoing++
        else if (s === 'completed' || s === 'accomplished' || s === 'done') map[cat].Completed++
      })
      setProjectData(PROJ_CATEGORIES.map(cat => map[cat]))
    } catch (err) {
      console.error('Project category data error:', err)
    }
  }

  // ── Helper: compute age group breakdown from event_registrations ──
  const computeAgeData = async () => {
    try {
      // Get all distinct user_ids from event_registrations
      const { data: regs } = await supabase
        .from('event_registrations')
        .select('user_id')
      const userIds = [...new Set((regs || []).map(r => r.user_id).filter(Boolean))]
      if (userIds.length === 0) {
        setAgeData(AGE_BUCKETS.map(b => ({ ...b, value: 0, count: 0 })))
        setTotalParticipants(0)
        return
      }
      // Fetch ages from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, age, birthday')
        .in('user_id', userIds)
      const profileMap = {}
      ;(profiles || []).forEach(p => { profileMap[p.user_id] = p })

      // Resolve age for each unique participant
      let total = 0
      const bucketCounts = AGE_BUCKETS.map(() => 0)
      userIds.forEach(uid => {
        const p = profileMap[uid]
        if (!p) return
        let age = p.age
        if (!age && p.birthday) {
          const dob = new Date(p.birthday)
          const now = new Date()
          age = now.getFullYear() - dob.getFullYear()
          const m = now.getMonth() - dob.getMonth()
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
        }
        age = parseInt(age)
        if (isNaN(age)) return
        total++
        AGE_BUCKETS.forEach((b, i) => {
          if (age >= b.min && age <= b.max) bucketCounts[i]++
        })
      })
      setTotalParticipants(total)
      setAgeData(AGE_BUCKETS.map((b, i) => ({
        ...b,
        count: bucketCounts[i],
        value: total > 0 ? Math.round((bucketCounts[i] / total) * 100) : 0,
      })))
    } catch (err) {
      console.error('Age data load error:', err)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  const isDone = p => {
    const s = (p.status || '').toLowerCase().trim()
    return s === 'completed'
  }

  // Map 5-level rating labels → numeric score (5=excellent … 1=bad)
  const ratingToStars = (r) => {
    if (typeof r === 'number') return Math.min(5, Math.max(1, Math.round(r)))
    const s = (r || '').toLowerCase()
    if (s === 'excellent') return 5
    if (s === 'good')      return 4
    if (s === 'average')   return 3
    if (s === 'poor')      return 2
    if (s === 'bad')       return 1
    return 3
  }

  // ── Initial data load ─────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        // 1. Parallel count queries
        const [annRes, evtsRes, memRes, projRes, fbRes] = await Promise.all([
          supabase.from('announcements').select('id',     { count:'exact', head:true }),
          supabase.from('events').select('id',            { count:'exact', head:true }),
          supabase.from('user_roles').select('user_id',   { count:'exact', head:true }),
          supabase.from('projects').select('id, status'), // need rows to filter active
          supabase.from('feedback').select('rating'),     // need rows to compute stats
        ])

        // 2. Active projects = non-completed rows
        const projRows    = projRes.data ?? []
        const activeCount = projRows.filter(p => !isDone(p)).length

        // 3. Feedback statistics
        const fbRows = fbRes.data ?? []
        const total  = fbRows.length
        const buckets = { 5:0, 4:0, 3:0, 2:0, 1:0 }
        let   scoreSum = 0
        fbRows.forEach(fb => {
          const s = ratingToStars(fb.rating)
          buckets[s] = (buckets[s] || 0) + 1
          scoreSum  += s
        })
        const avg = total > 0 ? (scoreSum / total) : 0
        const ratingRows = [5,4,3,2,1].map(stars => ({
          stars,
          count: buckets[stars],
          pct:   total > 0 ? Math.round((buckets[stars] / total) * 100) : 0,
        }))

        setCounts({
          members:        memRes.count  ?? 0,
          announcements:  annRes.count  ?? 0,
          events:         evtsRes.count ?? 0,
          activeProjects: activeCount,
        })
        setFeedbackData({ totalResponses: total, avgScore: avg, ratingRows })
        await computeAgeData()
        await computeProjectData()
        await computeMemberActivity()

      } catch (err) {
        console.error('AdminHome load error:', err)
      }
    })()
  }, [])

  // ── Real-time subscriptions (keep cards in sync on changes) ───────
  useEffect(() => {
    const tables = ['announcements', 'events', 'projects', 'feedback', 'user_roles', 'event_registrations', 'profiles', 'login_history']
    const channels = tables.map(table =>
      supabase
        .channel(`adminhome-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, async () => {
          // Re-fetch only the relevant data for the changed table
          try {
            if (table === 'announcements') {
              const { count } = await supabase.from('announcements').select('id', { count:'exact', head:true })
              setCounts(prev => ({ ...prev, announcements: count ?? prev.announcements }))
            }
            if (table === 'events') {
              const { count } = await supabase.from('events').select('id', { count:'exact', head:true })
              setCounts(prev => ({ ...prev, events: count ?? prev.events }))
            }
            if (table === 'user_roles') {
              const { count } = await supabase.from('user_roles').select('user_id', { count:'exact', head:true })
              setCounts(prev => ({ ...prev, members: count ?? prev.members }))
            }
            if (table === 'projects') {
              const { data } = await supabase.from('projects').select('id, status')
              const active = (data ?? []).filter(p => !isDone(p)).length
              setCounts(prev => ({ ...prev, activeProjects: active }))
              await computeProjectData()
            }
            if (table === 'feedback') {
              const { data } = await supabase.from('feedback').select('rating')
              const fbRows = data ?? []
              const total  = fbRows.length
              const buckets = { 5:0, 4:0, 3:0, 2:0, 1:0 }
              let scoreSum = 0
              fbRows.forEach(fb => {
                const s = ratingToStars(fb.rating)
                buckets[s] = (buckets[s] || 0) + 1
                scoreSum  += s
              })
              const avg = total > 0 ? (scoreSum / total) : 0
              const ratingRows = [5,4,3,2,1].map(stars => ({
                stars,
                count: buckets[stars],
                pct:   total > 0 ? Math.round((buckets[stars] / total) * 100) : 0,
              }))
              setFeedbackData({ totalResponses: total, avgScore: avg, ratingRows })
            }
            if (table === 'event_registrations' || table === 'profiles') {
              await computeAgeData()
            }
            if (table === 'login_history' || table === 'user_roles') {
              await computeMemberActivity()
            }
          } catch {}
        })
        .subscribe()
    )
    return () => channels.forEach(ch => supabase.removeChannel(ch))
  }, [])

  const pageBg = dark
    ? 'linear-gradient(135deg,#09152a 0%,#0d1f3c 60%,#091526 100%)'
    : 'linear-gradient(135deg,#EBF4FF 0%,#F0F7FF 50%,#EAF3FF 100%)'

  const tickColor = dark ? 'rgba(255,255,255,0.45)' : '#8899AA'
  const gridColor = dark ? 'rgba(255,255,255,0.06)' : '#E2EAF4'

  return (
    <div style={{ minHeight:'100%', background:pageBg, margin:'-28px -32px', padding:'28px 32px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:26 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:dark?'rgba(212,175,55,0.75)':C.gold, textTransform:'uppercase', letterSpacing:'2.5px', fontFamily:IF, marginBottom:5 }}>
            SK Barangay Bakakeng Central
          </div>
          <h1 style={{ fontSize:26, fontWeight:900, color:dark?'white':C.navy, margin:0, fontFamily:MF, letterSpacing:'-0.5px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize:12, color:dark?'rgba(255,255,255,0.4)':T.textMuted, margin:'3px 0 0', fontFamily:IF }}>
            Real-time overview of youth engagement and community programs
          </p>
        </div>
        <div style={{ fontSize:11, color:dark?'rgba(255,255,255,0.3)':T.textMuted, fontFamily:IF, textAlign:'right' }}>
          <div style={{ fontWeight:600 }}>
            {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:13, marginBottom:20 }}>
        <StatCard icon={Users}     label="Total Youth"     value={counts.members.toLocaleString()}                                                       sub="Registered Members"    accent={C.navy}   path="/admin/settings"      dark={dark} T={T}/>
        <StatCard icon={Megaphone} label="Announcements"   value={counts.announcements}                                                                   sub="Published Updates"    accent={C.teal}   path="/admin/announcements" dark={dark} T={T}/>
        <StatCard icon={Calendar}  label="Events"          value={counts.events}                                                                          sub="Community Activities" accent={C.purple} path="/admin/events"        dark={dark} T={T}/>
        <StatCard icon={FolderOpen}label="Active Projects" value={counts.activeProjects}                                                                  sub="Active Initiatives"   accent={C.orange} path="/admin/projects"      dark={dark} T={T}/>
        <StatCard icon={Star}      label="Avg. Feedback"   value={feedbackData.totalResponses > 0 ? (['','😠 Bad','😕 Poor','😐 Avg','😊 Good','🤩 Best'][ Math.round(feedbackData.avgScore)] || `${feedbackData.avgScore.toFixed(1)}`) : '— ★'}    sub="Avg. Star Rating"     accent={C.gold}   path={null}                 dark={dark} T={T}/>
      </div>

      {/* Row 1: Bar + Donut */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:14, marginBottom:14 }}>

        <ChartCard title="Project Status Breakdown by Category" T={T} dark={dark}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={projectData} margin={{ top:4, right:4, left:-22, bottom:0 }} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
              <XAxis dataKey="category" tick={{ fontSize:9.5, fill:tickColor, fontFamily:IF }} axisLine={false} tickLine={false} interval={0}/>
              <YAxis tick={{ fontSize:10, fill:tickColor, fontFamily:IF }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip
                content={props => {
                  if (!props.active || !props.payload?.length) return null
                  const fullName = props.payload[0]?.payload?.full || props.label
                  return (
                    <div style={{ background:dark?'#1A2744':'white', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', maxWidth:200 }}>
                      <p style={{ fontSize:11, fontWeight:700, color:dark?'white':C.navy, margin:'0 0 6px', fontFamily:MF, wordBreak:'break-word' }}>{fullName}</p>
                      {props.payload.map((p,i) => (
                        <p key={i} style={{ fontSize:11, color:p.color, margin:'2px 0', fontFamily:IF }}>{p.name}: <strong>{p.value}</strong></p>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize:11, fontFamily:IF, paddingTop:6 }}/>
              <Bar dataKey="Planning"  name="Planning"  fill={C.navy}    radius={[4,4,0,0]}/>
              <Bar dataKey="Upcoming"  name="Upcoming"  fill={C.sky}     radius={[4,4,0,0]}/>
              <Bar dataKey="Ongoing"   name="Ongoing"   fill={C.gold}    radius={[4,4,0,0]}/>
              <Bar dataKey="Completed" name="Completed" fill="#38A169"   radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Participation by Age Group" T={T} dark={dark}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie data={ageData} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                  {ageData.map((entry,i) => <Cell key={i} fill={entry.color} stroke="none"/>)}
                </Pie>
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="900" fill={dark?'white':C.navy} fontFamily={MF}>{totalParticipants.toLocaleString()}</text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fontSize="10" fill={T.textMuted} fontFamily={IF}>participants</text>
                <Tooltip content={({active,payload}) => active&&payload?.length ? (
                  <div style={{ background:dark?'#1A2744':'white', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 12px', fontSize:11, fontFamily:IF }}>
                    <span style={{ color:payload[0].payload.color, fontWeight:700 }}>{payload[0].name}</span>: {payload[0].value}%
                    {payload[0].payload.count > 0 && <span style={{ color:T.textMuted }}> ({payload[0].payload.count})</span>}
                  </div>
                ) : null}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', gap:7, width:'100%', marginTop:4 }}>
              {ageData.map((d,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:dark?'rgba(255,255,255,0.55)':T.textMuted, fontFamily:IF, flex:1 }}>{d.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:dark?'white':C.navy, fontFamily:IF }}>{d.value}%</span>
                </div>
              ))}
              {totalParticipants === 0 && (
                <div style={{ textAlign:'center', fontSize:11, color:T.textMuted, fontFamily:IF, paddingTop:4 }}>
                  No participant data yet
                </div>
              )}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Area + Feedback */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:14 }}>

        <ChartCard title="Member Engagement: Active vs. Inactive" T={T} dark={dark}>
          {/* Summary pills */}
          <div style={{ display:'flex', gap:10, marginBottom:14 }}>
            {[
              { label:'Active',   count: activitySummary.active,   color:'#276749', bg: dark?'rgba(39,103,73,0.18)':'#F0FFF4', border:'#9AE6B4' },
              { label:'Inactive', count: activitySummary.inactive, color:'#C05621', bg: dark?'rgba(192,86,33,0.18)':'#FFF8F0', border:'#FBD38D' },
              { label:'Total',    count: activitySummary.total,    color: dark?'rgba(255,255,255,0.7)':C.navy, bg: dark?'rgba(255,255,255,0.06)':'rgba(26,54,93,0.05)', border: dark?'rgba(255,255,255,0.12)':'rgba(26,54,93,0.15)' },
            ].map(({ label, count, color, bg, border }) => (
              <div key={label} style={{ flex:1, textAlign:'center', padding:'8px 6px', borderRadius:10, background:bg, border:`1px solid ${border}` }}>
                <div style={{ fontSize:18, fontWeight:900, color, fontFamily:MF, lineHeight:1 }}>{count}</div>
                <div style={{ fontSize:10, color, fontFamily:IF, marginTop:3, fontWeight:600 }}>{label} this month</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={memberActivityData} margin={{ top:4, right:4, left:-22, bottom:0 }}>
              <defs>
                <linearGradient id="gactive"   x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38A169" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#38A169" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="ginactive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ED8936" stopOpacity={0.30}/>
                  <stop offset="95%" stopColor="#ED8936" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:10, fill:tickColor, fontFamily:IF }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:tickColor, fontFamily:IF }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip content={props => {
                if (!props.active || !props.payload?.length) return null
                return (
                  <div style={{ background:dark?'#1A2744':'white', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:dark?'white':C.navy, margin:'0 0 6px', fontFamily:MF }}>{props.label}</p>
                    {props.payload.map((p,i) => (
                      <p key={i} style={{ fontSize:11, color:p.color, margin:'2px 0', fontFamily:IF }}>{p.name}: <strong>{p.value}</strong></p>
                    ))}
                    {props.payload[0] && (
                      <p style={{ fontSize:10, color:T.textMuted, margin:'4px 0 0', fontFamily:IF }}>
                        Total: {(props.payload.reduce((s,p)=>s+p.value,0))}
                      </p>
                    )}
                  </div>
                )
              }}/>
              <Legend wrapperStyle={{ fontSize:11, fontFamily:IF, paddingTop:4 }}/>
              <Area type="monotone" dataKey="Active"   name="Active"   stroke="#38A169" strokeWidth={2.5} fill="url(#gactive)"   dot={{ r:3, fill:'#38A169', strokeWidth:0 }} activeDot={{ r:5 }}/>
              <Area type="monotone" dataKey="Inactive" name="Inactive" stroke="#ED8936" strokeWidth={2.5} fill="url(#ginactive)" dot={{ r:3, fill:'#ED8936', strokeWidth:0 }} activeDot={{ r:5 }}/>
            </AreaChart>
          </ResponsiveContainer>
          {memberActivityData.length === 0 && (
            <div style={{ textAlign:'center', padding:'12px 0', fontSize:12, color:T.textMuted, fontFamily:IF }}>
              No activity data yet
            </div>
          )}
        </ChartCard>

        <ChartCard title="Feedback Rating Summary" T={T} dark={dark}>
          {/* Overall score */}
          {(() => {
            const rounded = Math.round(feedbackData.avgScore)
            const META = { 5:{emoji:'🤩',label:'Excellent',color:'#B5006B'}, 4:{emoji:'😊',label:'Good',color:'#276749'}, 3:{emoji:'😐',label:'Average',color:'#D69E2E'}, 2:{emoji:'😕',label:'Poor',color:'#C05621'}, 1:{emoji:'😠',label:'Bad',color:'#C53030'} }
            const m = META[rounded]
            return (
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18, padding:'14px 16px', borderRadius:12, background:dark?'rgba(255,255,255,0.04)':'rgba(26,54,93,0.04)', border:`1px solid ${dark?'rgba(255,255,255,0.07)':'rgba(26,54,93,0.07)'}` }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:36, lineHeight:1 }}>{feedbackData.totalResponses > 0 && m ? m.emoji : '⭐'}</div>
                  <div style={{ fontSize:14, fontWeight:800, color: feedbackData.totalResponses > 0 && m ? m.color : T.textMuted, fontFamily:MF, marginTop:4 }}>
                    {feedbackData.totalResponses > 0 && m ? m.label : '—'}
                  </div>
                  <div style={{ fontSize:10, color:T.textMuted, fontFamily:IF }}>overall</div>
                </div>
                <div style={{ width:'1px', height:52, background:dark?'rgba(255,255,255,0.08)':'rgba(26,54,93,0.10)' }}/>
                <div>
                  <div style={{ fontSize:22, fontWeight:800, color:dark?'white':C.navy, fontFamily:MF, lineHeight:1 }}>{feedbackData.totalResponses}</div>
                  <div style={{ fontSize:11, color:T.textMuted, fontFamily:IF, marginTop:3 }}>total responses</div>
                </div>
              </div>
            )
          })()}
          {/* Rating bars */}
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {feedbackData.ratingRows.map(r => (
              <StarRow key={r.stars} stars={r.stars} count={r.count} pct={r.pct} dark={dark} T={T}/>
            ))}
          </div>
          {feedbackData.totalResponses === 0 && (
            <div style={{ textAlign:'center', padding:'12px 0', fontSize:12, color:T.textMuted, fontFamily:IF }}>
              No feedback submitted yet
            </div>
          )}
        </ChartCard>
      </div>

    </div>
  )
}
