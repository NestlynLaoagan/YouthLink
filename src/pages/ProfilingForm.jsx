import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, X, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

const calcAge = (bday) => {
  if (!bday) return ''
  const d = new Date(bday), t = new Date()
  let a = t.getFullYear()-d.getFullYear()
  if (t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate())) a--
  return String(a)
}

const youthGroup = (age) => {
  const n = parseInt(age)
  if (n>=15&&n<=17) return '15-17 yrs old'
  if (n>=18&&n<=24) return '18-24 yrs old'
  if (n>=25&&n<=30) return '25-30 yrs old'
  return ''
}

const EMPTY = {
  last_name:'', given_name:'', middle_name:'',
  purok:'', street:'', barangay:'Bakakeng Central', city:'Baguio City',
  contact:'', birthday:'', age:'', gender:'',
  civil_status:'', work_status:'', youth_age_group:'',
  youth_classification:'', youth_spec:'', educational_background:'',
  registered_sk_voter:'', voted_last_election:'', national_voter:''
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const inp = { width:'100%', padding:'10px 13px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:13, fontFamily:'Inter,Georgia,sans-serif', outline:'none', color:'#2D3748', transition:'border .15s' }
const onFocus = e => { e.target.style.borderColor='#1A365D'; e.target.style.background='white' }
const onBlur  = e => { e.target.style.borderColor='#E2E8F0'; e.target.style.background='#F8FAFC' }

const SectionHeader = ({ num, title }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:8, borderBottom:'2px solid #D69E2E' }}>
    <div style={{ width:22, height:22, borderRadius:'50%', background:'#1A365D', color:'white', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>{num}</div>
    <p style={{ fontSize:11, fontWeight:700, color:'#1A365D', textTransform:'uppercase', letterSpacing:'0.6px' }}>{title}</p>
  </div>
)

const Label = ({ children, required }) => (
  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#4A5568', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5 }}>
    {children}{required && <span style={{ color:'#C53030', marginLeft:2 }}>*</span>}
  </label>
)

const Field = ({ label, required, children }) => (
  <div style={{ marginBottom:12 }}>
    <Label required={required}>{label}</Label>
    {children}
  </div>
)

export default function ProfilingForm({ isUpdate=false }) {
  const { user, profile, refreshProfile, logAudit, clearNewGoogleUser } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()

  const [loading,    setLoading]   = useState(false)
  const [showWelcome, setWelcome]  = useState(!isUpdate)
  const [showTnC,    setShowTnC]   = useState(false)
  const [tcAccepted, setTcAccepted]= useState(false)
  const [birthdayErr, setBirthdayErr] = useState('')
  const [bdDay,   setBdDay]   = useState('')
  const [bdMonth, setBdMonth] = useState('')
  const [bdYear,  setBdYear]  = useState('')
  const [form,       setForm]      = useState(() => {
    // Pre-fill from Google user metadata on first load
    if (!isUpdate) {
      const meta = user?.user_metadata || {}
      const fullName = meta.full_name || meta.name || ''
      const parts = fullName.trim().split(' ')
      const given = parts[0] || ''
      const last  = parts.length > 1 ? parts[parts.length - 1] : ''
      const middle= parts.length > 2 ? parts.slice(1, -1).join(' ') : ''
      return { ...EMPTY, given_name: given, last_name: last, middle_name: middle }
    }
    return EMPTY
  })

  useEffect(() => {
    if (profile && isUpdate) {
      const addr = (profile.address||'').split(',')
      setForm({
        last_name:   profile.last_name  || profile.name?.split(' ').slice(-1)[0]  || '',
        given_name:  profile.given_name || profile.name?.split(' ')[0]             || '',
        middle_name: profile.middle_name|| '',
        purok:    addr[0]?.replace('Purok','').trim()||'',
        street:   addr[1]?.replace('Street','').trim()||'',
        barangay: addr[2]?.trim()||'Bakakeng Central',
        city:     addr[3]?.trim()||'Baguio City',
        contact:  profile.contact_number?.replace('+639','')||'',
        birthday: profile.birthday||'', age: profile.age?String(profile.age):'',
        gender:   profile.gender||'',
        civil_status:           profile.civil_status||'',
        work_status:            profile.work_status||'',
        youth_age_group:        profile.youth_age_group||'',
        youth_classification:   profile.youth_classification?.split(':')[0]||'',
        youth_spec:             profile.youth_classification?.includes(':')?profile.youth_classification.split(':')[1].trim():'',
        educational_background: profile.educational_background||'',
        registered_sk_voter:   profile.registered_sk_voter?'yes':'no',
        voted_last_election:   profile.voted_last_election?'yes':'no',
        national_voter:        profile.national_voter?'yes':'no',
      })
      // Pre-fill birthday picker fields
      if (profile.birthday) {
        const parts = profile.birthday.split('-')
        if (parts.length === 3) {
          const y = parts[0], m = parseInt(parts[1]), d = parseInt(parts[2])
          setBdYear(y)
          setBdMonth(MONTHS[m - 1] || '')
          setBdDay(String(d))
        }
      }

    }
    const t = setTimeout(() => setWelcome(false), 6000)
    return () => clearTimeout(t)
  }, [profile, isUpdate])

  // Auto-submit once T&C is accepted
  React.useEffect(() => {
    if (tcAccepted && !isUpdate) {
      handleSubmit({ preventDefault: () => {} })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tcAccepted])

  const set = (k, v) => setForm(f => ({
    ...f, [k]: v,
    ...(k==='birthday' ? { age: calcAge(v), youth_age_group: youthGroup(calcAge(v)) } : {}),
    ...(k==='age'      ? { youth_age_group: youthGroup(v) } : {}),
  }))

  const validateBirthDate = (day, month, year) => {
    if (!day || !month || !year) { setBirthdayErr(''); return '' }
    const monthIdx = MONTHS.indexOf(month)
    if (monthIdx === -1) { setBirthdayErr('Please enter a valid date'); return '' }
    const d = parseInt(day), y = parseInt(year)
    if (isNaN(d) || d < 1 || d > 31 || isNaN(y) || y < 1900 || y > new Date().getFullYear()) {
      setBirthdayErr('Please enter a valid date'); return ''
    }
    const daysInMonth = new Date(y, monthIdx + 1, 0).getDate()
    if (d > daysInMonth) { setBirthdayErr('Please enter a valid date'); return '' }
    const dateStr = `${y}-${String(monthIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const age = calcAge(dateStr)
    const n = parseInt(age)
    if (isNaN(n) || n < 15 || n > 30) {
      setBirthdayErr('Invalid age. Only residents aged 15–30 are eligible to register.')
      return dateStr
    }
    setBirthdayErr('')
    return dateStr
  }

  const handleBdChange = (field, value) => {
    const newDay   = field === 'day'   ? value : bdDay
    const newMonth = field === 'month' ? value : bdMonth
    const newYear  = field === 'year'  ? value : bdYear
    if (field === 'day')   setBdDay(value)
    if (field === 'month') setBdMonth(value)
    if (field === 'year')  setBdYear(value)
    const dateStr = validateBirthDate(newDay, newMonth, newYear)
    setForm(f => ({
      ...f,
      birthday: dateStr,
      age: dateStr ? calcAge(dateStr) : '',
      youth_age_group: dateStr ? youthGroup(calcAge(dateStr)) : '',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.given_name.trim() || !form.last_name.trim()) { toast('Full name is required.','error'); return }
    if (!form.gender)     { toast('Please select your gender.','error'); return }
    if (!form.purok.trim())    { toast('Purok is required.','error'); return }
    if (!form.street.trim())   { toast('Street is required.','error'); return }
    if (!form.barangay.trim()) { toast('Barangay is required.','error'); return }
    if (!form.city.trim())     { toast('City is required.','error'); return }
    if (!form.contact.trim())  { toast('Contact number is required.','error'); return }
    if (form.contact.length < 9) { toast('Contact number must be 9 digits.','error'); return }
    if (!form.birthday)   { toast('Birthday is required.','error'); return }
    if (birthdayErr)      { toast('Invalid age. Only residents aged 15–30 are eligible to register.','error'); return }
    if (!form.civil_status)           { toast('Civil status is required.','error'); return }
    if (!form.work_status)            { toast('Work status is required.','error'); return }
    if (!form.educational_background) { toast('Educational background is required.','error'); return }
    if (!form.youth_classification)   { toast('Youth classification is required.','error'); return }
    if (form.youth_classification === 'Youth with special needs' && !form.youth_spec.trim()) { toast('Please specify the special needs condition.','error'); return }
    if (!form.registered_sk_voter) { toast('Please indicate if you are a registered SK voter.','error'); return }
    if (!form.voted_last_election) { toast('Please indicate if you voted in the last election.','error'); return }
    if (!form.national_voter)      { toast('Please indicate if you are a national voter.','error'); return }
    setLoading(true)
    try {

      const fullName = [form.given_name, form.middle_name, form.last_name].filter(Boolean).join(' ')

      const payload = {
        user_id: user.id,
        name: fullName,
        last_name:   form.last_name,
        given_name:  form.given_name,
        middle_name: form.middle_name,
        email:       user.email,
        address: [
          form.purok   ? `Purok ${form.purok}`   : '',
          form.street  ? `Street ${form.street}` : '',
          form.barangay, form.city
        ].filter(Boolean).join(', '),
        contact_number:         form.contact ? `+639${form.contact}` : null,
        birthday:               form.birthday  || null,
        age:                    parseInt(form.age) || null,
        gender:                 form.gender,
        civil_status:           form.civil_status,
        work_status:            form.work_status,
        youth_age_group:        form.youth_age_group,
        youth_classification:   form.youth_classification + (form.youth_spec ? `: ${form.youth_spec}` : ''),
        educational_background: form.educational_background,
        registered_sk_voter:    form.registered_sk_voter === 'yes',
        voted_last_election:    form.voted_last_election  === 'yes',
        national_voter:         form.national_voter       === 'yes',
        verification_status:    'Verified',
        profile_completed:      true,
        updated_at:             new Date().toISOString(),
      }

      const { error } = await supabase.from('profiles').upsert(payload)
      if (error) throw error

      // Update name in user_roles too
      await supabase.from('user_roles').upsert({ user_id: user.id, name: fullName, email: user.email, role: 'resident' })

      await refreshProfile()
      await logAudit('Submit','Profiling Form', isUpdate ? 'Updated profile' : 'Submitted profiling form')

      if (isUpdate) {
        toast('Profile updated successfully!', 'success')
      } else {
        toast('Profile submitted successfully!', 'success')
      }

      if (!isUpdate) {
        clearNewGoogleUser()   // reset flag so Protected no longer redirects back here
        navigate('/dashboard')
      }
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F7FAFC', fontFamily:'Inter,Georgia,sans-serif', paddingBottom:40 }}>

      {/* Welcome toast */}
      {showWelcome && !isUpdate && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background:'white', border:'1px solid #9AE6B4', borderLeft:'4px solid #48BB78', borderRadius:12, padding:'13px 18px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', maxWidth:320, animation:'slideIn .3s ease' }}>
          <CheckCircle size={18} style={{ color:'#48BB78', flexShrink:0 }}/>
          <div>
            <p style={{ fontWeight:700, color:'#1A365D', fontSize:13 }}>
              {user?.user_metadata?.full_name || user?.user_metadata?.name
                ? `Welcome, ${(user.user_metadata.full_name || user.user_metadata.name).split(' ')[0]}! 👋`
                : 'Account Created! 🎉'}
            </p>
            <p style={{ fontSize:12, color:'#718096', marginTop:1 }}>Please complete your profile to continue.</p>
          </div>
          <button onClick={() => setWelcome(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#A0AEC0', marginLeft:'auto' }}><X size={14}/></button>
        </div>
      )}

      <div style={{ maxWidth:680, margin:'0 auto', padding:'28px 16px' }}>

        {/* Header card */}
        {!isUpdate && (
          <div style={{ background:'white', borderRadius:12, padding:'14px 20px', marginBottom:16, border:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:12, borderLeft:'5px solid #D69E2E' }}>
            <div>
              <h1 style={{ fontSize:20, fontWeight:800, color:'#1A365D', fontFamily:'Inter,sans-serif' }}>PROFILING FORM</h1>
              <p style={{ fontSize:12, color:'#718096', marginTop:2 }}>
                {user?.user_metadata?.full_name || user?.user_metadata?.name
                  ? <>Logged in as <strong>{user.user_metadata.full_name || user.user_metadata.name}</strong> via Google. Complete your profile to continue.</>
                  : 'Complete your resident profile to access the dashboard.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Verification status banner removed — no verification required */}

        <form id="profiling-form" onSubmit={e => {
          e.preventDefault()
          if (!isUpdate && !tcAccepted) { setShowTnC(true); return }
          handleSubmit(e)
        }}>

          {/* SECTION 1 */}
          <div style={{ background:'white', borderRadius:12, padding:20, marginBottom:14, border:'1px solid #E2E8F0' }}>
            <SectionHeader num="1" title="Personal Information"/>

            {/* Full Name */}
            <Field label="Full Name" required>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:600 }}>Last Name</label>
                  <input style={inp} onFocus={onFocus} onBlur={onBlur} value={form.last_name} onChange={e=>set('last_name',e.target.value)} placeholder="Dela Cruz" required/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:600 }}>Given Name</label>
                  <input style={inp} onFocus={onFocus} onBlur={onBlur} value={form.given_name} onChange={e=>set('given_name',e.target.value)} placeholder="Juan" required/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:600 }}>Middle Name</label>
                  <input style={inp} onFocus={onFocus} onBlur={onBlur} value={form.middle_name} onChange={e=>set('middle_name',e.target.value)} placeholder="Santos"/>
                </div>
              </div>
            </Field>

            {/* Email (read-only, from auth) */}
            {user?.email && (
              <Field label="Email Address">
                <div style={{ ...inp, background:'#F0F4F8', color:'#718096', display:'flex', alignItems:'center', gap:8, cursor:'default', border:'1.5px solid #E2E8F0' }}>
                  <span style={{ fontSize:14 }}>✉️</span>
                  <span style={{ fontSize:13, fontFamily:'Inter,sans-serif' }}>{user.email}</span>
                  <span style={{ marginLeft:'auto', fontSize:10, color:'#A0AEC0', fontWeight:600, background:'#E2E8F0', padding:'2px 8px', borderRadius:20 }}>
                    {user?.app_metadata?.provider === 'google' ? '🔗 Google Account' : 'Verified'}
                  </span>
                </div>
                <p style={{ fontSize:10, color:'#A0AEC0', marginTop:3, fontStyle:'italic' }}>Email is linked to your account and cannot be changed here.</p>
              </Field>
            )}

            {/* Gender */}
            <Field label="Gender" required>
              <div style={{ display:'flex', gap:20 }}>
                {['Male','Female'].map(g => (
                  <label key={g} style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, cursor:'pointer' }}>
                    <input type="radio" name="gender" value={g.toLowerCase()} checked={form.gender===g.toLowerCase()}
                      onChange={e=>set('gender',e.target.value)} style={{ accentColor:'#1A365D', width:15, height:15 }}/> {g}
                  </label>
                ))}
              </div>
            </Field>

            {/* Address */}
            <Field label="Address" required>
              <div style={{ background:'#F7FAFC', borderRadius:10, padding:14, border:'1px solid #E2E8F0' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:700, textTransform:'uppercase' }}>Purok <span style={{ color:'#C53030' }}>*</span></label>
                    <input style={inp} onFocus={onFocus} onBlur={onBlur} value={form.purok} onChange={e=>set('purok',e.target.value)} required placeholder="e.g. 7-A"/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:700, textTransform:'uppercase' }}>Street <span style={{ color:'#C53030' }}>*</span></label>
                    <input style={inp} onFocus={onFocus} onBlur={onBlur} value={form.street} onChange={e=>set('street',e.target.value)} required placeholder="e.g. Abanao Street"/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:700, textTransform:'uppercase' }}>Barangay <span style={{ color:'#C53030' }}>*</span></label>
                    <input style={inp} onFocus={onFocus} onBlur={onBlur} value={form.barangay} onChange={e=>set('barangay',e.target.value)} required placeholder="Bakakeng Central"/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:700, textTransform:'uppercase' }}>City <span style={{ color:'#C53030' }}>*</span></label>
                    <input style={inp} onFocus={onFocus} onBlur={onBlur} value={form.city} onChange={e=>set('city',e.target.value)} required placeholder="Baguio City"/>
                  </div>
                </div>
                {/* Live preview */}
                {(form.purok||form.street) && (
                  <div style={{ background:'#EBF8FF', borderRadius:7, padding:'7px 12px', borderLeft:'3px solid #1A365D' }}>
                    <p style={{ fontSize:10, fontWeight:700, color:'#1A365D', textTransform:'uppercase', marginBottom:2 }}>Full Address Preview</p>
                    <p style={{ fontSize:12, color:'#2D3748' }}>
                      {[form.purok?`Purok ${form.purok}`:'',form.street?`Street ${form.street}`:'',form.barangay,form.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </Field>

            {/* Contact / Birthday / Age */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 80px', gap:10, marginBottom:4 }}>
              <div>
                <Label required>Contact No.</Label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'#718096', fontWeight:700 }}>+639</span>
                  <input style={{ ...inp, paddingLeft:44 }} onFocus={onFocus} onBlur={onBlur} value={form.contact} onChange={e=>set('contact',e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="xxxxxxxxx" maxLength={9} required/>
                </div>
              </div>
              <div>
                <Label required>Birthday</Label>
                <div style={{ display:'grid', gridTemplateColumns:'64px 1fr 84px', gap:6 }}>
                  {/* Day */}
                  <fieldset style={{ border:`1.5px solid ${birthdayErr?'#C53030':'#E2E8F0'}`, borderRadius:8, padding:'5px 8px 7px', margin:0, background:birthdayErr?'#FFF5F5':'#F8FAFC', transition:'border .15s, background .15s' }}>
                    <legend style={{ fontSize:9, color:birthdayErr?'#C53030':'#4A5568', fontWeight:700, padding:'0 3px', letterSpacing:'0.4px', textTransform:'uppercase', lineHeight:1 }}>Day</legend>
                    <input type="text" inputMode="numeric" maxLength={2} placeholder="DD" value={bdDay}
                      onChange={e=>handleBdChange('day',e.target.value.replace(/\D/,''))}
                      onFocus={e=>{e.target.closest('fieldset').style.borderColor=birthdayErr?'#C53030':'#1A365D';e.target.closest('fieldset').style.background='white'}}
                      onBlur={e=>{e.target.closest('fieldset').style.borderColor=birthdayErr?'#C53030':'#E2E8F0';e.target.closest('fieldset').style.background=birthdayErr?'#FFF5F5':'#F8FAFC'}}
                      style={{ border:'none', background:'transparent', outline:'none', width:'100%', fontSize:13, fontWeight:500, color:'#2D3748', fontFamily:'Inter,sans-serif', padding:0 }}/>
                  </fieldset>
                  {/* Month */}
                  <fieldset style={{ border:`1.5px solid ${birthdayErr?'#C53030':'#E2E8F0'}`, borderRadius:8, padding:'5px 8px 7px', margin:0, background:birthdayErr?'#FFF5F5':'#F8FAFC', transition:'border .15s, background .15s', position:'relative' }}>
                    <legend style={{ fontSize:9, color:birthdayErr?'#C53030':'#4A5568', fontWeight:700, padding:'0 3px', letterSpacing:'0.4px', textTransform:'uppercase', lineHeight:1 }}>Month</legend>
                    <select value={bdMonth} onChange={e=>handleBdChange('month',e.target.value)}
                      onFocus={e=>{e.target.closest('fieldset').style.borderColor=birthdayErr?'#C53030':'#1A365D';e.target.closest('fieldset').style.background='white'}}
                      onBlur={e=>{e.target.closest('fieldset').style.borderColor=birthdayErr?'#C53030':'#E2E8F0';e.target.closest('fieldset').style.background=birthdayErr?'#FFF5F5':'#F8FAFC'}}
                      style={{ border:'none', background:'transparent', outline:'none', width:'100%', fontSize:13, fontWeight:500, color:bdMonth?'#2D3748':'#A0AEC0', fontFamily:'Inter,sans-serif', padding:0, appearance:'none', cursor:'pointer' }}>
                      <option value="">Month</option>
                      {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-10%)', pointerEvents:'none', color:'#718096', fontSize:10 }}>▾</span>
                  </fieldset>
                  {/* Year */}
                  <fieldset style={{ border:`1.5px solid ${birthdayErr?'#C53030':'#E2E8F0'}`, borderRadius:8, padding:'5px 8px 7px', margin:0, background:birthdayErr?'#FFF5F5':'#F8FAFC', transition:'border .15s, background .15s' }}>
                    <legend style={{ fontSize:9, color:birthdayErr?'#C53030':'#4A5568', fontWeight:700, padding:'0 3px', letterSpacing:'0.4px', textTransform:'uppercase', lineHeight:1 }}>Year</legend>
                    <input type="text" inputMode="numeric" maxLength={4} placeholder="YYYY" value={bdYear}
                      onChange={e=>handleBdChange('year',e.target.value.replace(/\D/,''))}
                      onFocus={e=>{e.target.closest('fieldset').style.borderColor=birthdayErr?'#C53030':'#1A365D';e.target.closest('fieldset').style.background='white'}}
                      onBlur={e=>{e.target.closest('fieldset').style.borderColor=birthdayErr?'#C53030':'#E2E8F0';e.target.closest('fieldset').style.background=birthdayErr?'#FFF5F5':'#F8FAFC'}}
                      style={{ border:'none', background:'transparent', outline:'none', width:'100%', fontSize:13, fontWeight:500, color:'#2D3748', fontFamily:'Inter,sans-serif', padding:0 }}/>
                  </fieldset>
                </div>
              </div>
              <div>
                <Label>Age</Label>
                <input style={{ ...inp, background:'#EDF2F7', cursor:'not-allowed', textAlign:'center', padding:'10px 6px' }} value={form.age} readOnly placeholder="—"/>
              </div>
            </div>
            {birthdayErr && (
              <p style={{ fontSize:11, color:'#E53E3E', margin:'0 4px 10px', display:'flex', alignItems:'center', gap:4, fontFamily:"'Inter',sans-serif" }}>
                ⚠ {birthdayErr}
              </p>
            )}

          </div>

          {/* SECTION 2 */}
          <div style={{ background:'white', borderRadius:12, padding:20, marginBottom:14, border:'1px solid #E2E8F0' }}>
            <SectionHeader num="2" title="Demographic Background"/>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              {[
                ['civil_status','Civil Status',['Single','Married','Divorced','Widowed','Separated','Live-in']],
                ['work_status','Work Status',['Employed','Unemployed','Self-employed','Student','Looking for a job']],
                ['youth_age_group','Youth Age Group',['15-17 yrs old','18-24 yrs old','25-30 yrs old']],
                ['educational_background','Educational Background',['Elementary','Highschool','Senior Highschool','College','Vocational']],
              ].map(([key,label,opts]) => (
                <div key={key}>
                  <Label required>{label}</Label>
                  <select style={{ ...inp }} onFocus={onFocus} onBlur={onBlur} value={form[key]} onChange={e=>set(key,e.target.value)} required>
                    <option value="">Choose {label.toLowerCase()}</option>
                    {opts.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Youth Classification */}
            <Field label="Youth Classification" required>
              <select style={inp} onFocus={onFocus} onBlur={onBlur} value={form.youth_classification} onChange={e=>set('youth_classification',e.target.value)} required>
                <option value="">Choose classification</option>
                {['In school youth','Out of school youth','Working youth','Youth with special needs'].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
              {form.youth_classification==='Youth with special needs' && (
                <div style={{ marginTop:8, position:'relative' }}>
                  <input style={{ ...inp, paddingLeft:110 }} onFocus={onFocus} onBlur={onBlur} value={form.youth_spec} onChange={e=>set('youth_spec',e.target.value)} placeholder="describe condition…"/>
                  <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'#718096', fontWeight:700, pointerEvents:'none' }}>Please specify:</span>
                </div>
              )}
            </Field>

            {/* Voting Information */}
            <div style={{ background:'#FEF9E7', borderRadius:10, padding:14, border:'1px solid rgba(214,158,46,.3)', marginTop:4 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#1A365D', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:12 }}>Voting Information <span style={{ color:'#C53030' }}>*</span></p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {[
                  ['registered_sk_voter','Registered SK Voter?'],
                  ['voted_last_election','Voted Last Election?'],
                  ['national_voter','National Voter?'],
                ].map(([key,label]) => (
                  <div key={key}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#2D3748', marginBottom:7 }}>{label}</p>
                    <div style={{ display:'flex', gap:14 }}>
                      {['yes','no'].map(v => (
                        <label key={v} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', textTransform:'capitalize' }}>
                          <input type="radio" name={key} value={v} checked={form[key]===v} onChange={e=>set(key,e.target.value)} style={{ accentColor:'#1A365D', width:14, height:14 }}/> {v.charAt(0).toUpperCase()+v.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'14px', borderRadius:10, border:'none', background: loading?'#718096':'#1A365D', color:'white', fontSize:15, fontWeight:800, fontFamily:'Inter,sans-serif', cursor: loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9, letterSpacing:'0.5px', marginBottom:8, transition:'background .15s' }}
            onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background='#0F2444' }}
            onMouseLeave={e=>{ if(!loading) e.currentTarget.style.background='#1A365D' }}>
            {loading && <Loader2 size={18} className="spinner"/>}
            {isUpdate ? 'SAVE CHANGES' : 'CREATE PROFILE'}
          </button>
          {isUpdate && (
            <button type="button" onClick={() => navigate('/dashboard')}
              style={{ width:'100%', padding:'11px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'white', color:'#718096', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', marginBottom:8 }}>
              Cancel
            </button>
          )}
          {!isUpdate && (
            <p style={{ textAlign:'center', fontSize:11, color:'#A0AEC0', lineHeight:1.6 }}>
              By clicking <strong>Create Profile</strong>, you agree to our{' '}
              <span onClick={() => setShowTnC(true)} style={{ color:'#1A365D', fontWeight:700, cursor:'pointer', textDecoration:'underline' }}>Terms and Conditions</span>.
            </p>
          )}
          <p style={{ textAlign:'center', fontSize:11, color:'#A0AEC0', fontStyle:'italic', lineHeight:1.6, marginTop:4 }}>
            REST ASSURED THAT ALL INFORMATION GATHERED FROM THIS FORM WILL BE TREATED WITH UTMOST CONFIDENTIALITY.
          </p>
        </form>
      </div>

      {/* ── Terms & Conditions Modal ── */}
      {showTnC && (
        <div onClick={() => setShowTnC(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
          zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center',
          padding:20, backdropFilter:'blur(4px)'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'white', borderRadius:20, width:'100%', maxWidth:680,
            maxHeight:'88vh', display:'flex', flexDirection:'column',
            boxShadow:'0 24px 64px rgba(0,0,0,0.25)', overflow:'hidden'
          }}>
            {/* Header */}
            <div style={{ padding:'24px 28px 16px', borderBottom:'1px solid #E8ECF0', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div>
                  <h2 style={{ fontSize:20, fontWeight:800, color:'#1A365D', margin:'0 0 4px', fontFamily:"'Montserrat','Inter',sans-serif" }}>
                    Terms and Conditions
                  </h2>
                  <p style={{ fontSize:12, color:'#A0AEC0', margin:0, fontFamily:"'Inter',sans-serif" }}>
                    Official SK Bakakeng Central Youth Portal · Last Updated: March 24, 2026
                  </p>
                </div>
                <button onClick={() => setShowTnC(false)} style={{
                  background:'#F7F8FA', border:'1px solid #E8ECF0', borderRadius:8,
                  width:32, height:32, cursor:'pointer', fontSize:16, color:'#718096',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                }}>✕</button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY:'auto', padding:'20px 28px 28px', flex:1, fontFamily:"'Inter',sans-serif", lineHeight:1.75, color:'#4A5568' }}>
              {/* Intro */}
              <div style={{ padding:'12px 16px', borderRadius:10, background:'#EBF8FF', border:'1px solid #BEE3F8', marginBottom:20 }}>
                <p style={{ fontSize:13, margin:0, color:'#2B6CB0', fontWeight:600 }}>📌 Welcome to SK Bakakeng Central Youth Link Portal</p>
                <p style={{ fontSize:12, margin:'4px 0 0', color:'#2C5282' }}>Before continuing, please review and agree to the following terms, privacy policy, and user agreement.</p>
              </div>

              {[
                {
                  emoji:'📄', title:'1. Acceptance of Terms',
                  plain:'By accessing, registering, or using the SK Bakakeng Central Youth Link Portal, you acknowledge that you have read, understood, and agreed to be legally bound to the following terms, privacy policy, and user agreement. If you do not agree, please refrain from using the platform.'
                },
                {
                  emoji:'⚖️', title:'2. Eligibility and Legal Basis',
                  intro:'This portal is exclusively for individuals aged 15 to 30 years old, residing in Barangay Bakakeng Central, who are members of the Katipunan ng Kabataan (KK). This requirement is based on Republic Act No. 10742, which:',
                  bullets:[
                    'Legally defines the Katipunan ng Kabataan as all Filipino youth aged 15–30',
                    'Establishes the official youth sector recognized by the government',
                    'Limits participation in SK programs, profiling, and benefits strictly within this age group',
                  ],
                  note:'Why this restriction exists: The portal ensures only eligible youth beneficiaries can access SK services, maintain an accurate and lawful youth database, and prevent misuse of public resources intended specifically for the youth sector. Allowing users outside this age range would violate national law, compromise profiling data integrity, and affect funding and program allocation.\n\nYour responsibility: By registering, you certify that you meet these legal requirements. Misrepresentation of age may result in disqualification and account termination.'
                },
                {
                  emoji:'🔑', title:'3. Account Registration and Responsibility',
                  intro:'You agree to:',
                  bullets:[
                    'Provide complete, truthful, and updated personal information',
                    'Maintain the confidentiality of your login credentials',
                    'Accept responsibility for all activities conducted under your account',
                  ],
                  plain:'The SK Council reserves the right to verify submitted information through official records.'
                },
                {
                  emoji:'🔐', title:'4. Data Privacy and Use of Information',
                  plain:'All personal data is processed in accordance with the Data Privacy Act of 2012.',
                  sections:[
                    {
                      label:'🎯 Purpose of Data Collection',
                      items:[
                        ['Youth Profiling','To create and maintain an updated registry of KK members, helping the SK Council identify youth needs, plan targeted programs, and ensure fair participation.'],
                        ['Program Processing','To evaluate eligibility for programs, scholarships, trainings, and events; process applications and submissions; and monitor participation and outcomes.'],
                        ['Communication','To send announcements, event updates, and reminders; inform users about opportunities; and respond to inquiries.'],
                        ['Verification & Security','To confirm identity, prevent duplicate or fraudulent registrations, and protect the integrity of the system.'],
                        ['Government Reporting','To comply with reporting requirements to agencies such as the National Youth Commission and Department of the Interior and Local Government.'],
                      ]
                    },
                    {
                      label:'📌 Data Collection Scope',
                      bullets:[
                        'Personal identification details (name, birthdate, age, gender)',
                        'Contact and residency information',
                        'Educational and employment background',
                        'Uploaded documents and activity history',
                      ]
                    },
                    {
                      label:'🔒 Data Protection and User Rights',
                      bullets:[
                        'Data is stored securely and accessible only to authorized personnel',
                        'Data is retained only as necessary for official purposes',
                        'You have the right to access, correct, or request deletion of your data, subject to applicable laws',
                        'You may withdraw consent, subject to administrative and legal limitations',
                      ]
                    },
                  ]
                },
                {
                  emoji:'⚠️', title:'5. Acceptable Use and Code of Conduct',
                  intro:'You agree NOT to:',
                  bullets:[
                    'Provide false or misleading information',
                    'Engage in harassment, abuse, or harmful behavior',
                    'Attempt to disrupt or compromise system security',
                    'Use the platform for commercial or unauthorized purposes',
                  ]
                },
                {
                  emoji:'🛎️', title:'6. Use of Services',
                  intro:'This portal provides access to SK-related services and requests.',
                  bullets:[
                    'Submission does not guarantee approval',
                    'All requests are subject to validation and review',
                    'Additional documents may be required when necessary',
                  ]
                },
                {
                  emoji:'🤖', title:'7. AI Chatbot Disclaimer',
                  intro:'The portal may include an AI chatbot designed to assist users.',
                  bullets:[
                    'It provides general information only and does not replace official SK decisions or personnel',
                    'Responses are not official decisions or approvals',
                    'Users must verify critical information with authorized SK officials',
                  ]
                },
                {
                  emoji:'📚', title:'8. Intellectual Property',
                  plain:'All portal content — including logos, documents, and media — belongs to SK Bakakeng Central. Unauthorized use, reproduction, or distribution is strictly prohibited. Materials may be downloaded for personal, non-commercial use only.'
                },
                {
                  emoji:'⚡', title:'9. Limitation of Liability',
                  intro:'The SK Council does not guarantee uninterrupted or error-free service. It shall not be held liable for:',
                  bullets:[
                    'Technical issues, downtime, or system errors',
                    'Loss of data caused by user actions or external factors',
                    'Decisions made based on chatbot or informational content',
                  ]
                },
                {
                  emoji:'🔗', title:'10. External Links',
                  plain:'The portal may link to external government websites such as the National Youth Commission, TESDA, or DILG. The SK Council is not responsible for their content or data practices.'
                },
                {
                  emoji:'🚫', title:'11. Account Suspension or Termination',
                  intro:'Accounts may be suspended or terminated for:',
                  bullets:[
                    'Violations of these Terms and Conditions',
                    'Submission of false or misleading information',
                    'Misuse or harmful behavior on the platform',
                  ]
                },
                {
                  emoji:'🔄', title:'12. Changes to Terms',
                  plain:'These Terms may be updated at any time to reflect changes in laws, policies, or system features. Continued use of the portal constitutes acceptance of the updated Terms.'
                },
              ].map((s,i) => (
                <div key={i} style={{ marginBottom:22 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'#1A365D', margin:'0 0 8px',
                    fontFamily:"'Montserrat','Inter',sans-serif",
                    paddingBottom:5, borderBottom:'1px solid #EDF2F7', display:'flex', alignItems:'center', gap:6 }}>
                    <span>{s.emoji}</span> {s.title}
                  </h3>
                  {s.intro && <p style={{ fontSize:13, margin:'0 0 8px' }}>{s.intro}</p>}
                  {s.plain && <p style={{ fontSize:13, margin:'0 0 8px' }}>{s.plain}</p>}
                  {s.bullets && (
                    <ul style={{ margin:'0 0 8px 18px', padding:0 }}>
                      {s.bullets.map((b,j) => <li key={j} style={{ fontSize:13, marginBottom:4 }}>{b}</li>)}
                    </ul>
                  )}
                  {s.note && (
                    <div style={{ background:'#FFFBEB', border:'1px solid #FAD08A', borderRadius:8, padding:'10px 14px', marginTop:8 }}>
                      {s.note.split('\n\n').map((para, idx) => (
                        <p key={idx} style={{ fontSize:12, margin: idx === 0 ? 0 : '8px 0 0', color:'#744210', fontStyle:'italic' }}>{para}</p>
                      ))}
                    </div>
                  )}
                  {s.sections && s.sections.map((sec,j) => (
                    <div key={j} style={{ marginBottom:12 }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'#2D3748', margin:'0 0 6px' }}>{sec.label}</p>
                      {sec.bullets && (
                        <ul style={{ margin:'0 0 0 18px', padding:0 }}>
                          {sec.bullets.map((b,k) => <li key={k} style={{ fontSize:13, marginBottom:4 }}>{b}</li>)}
                        </ul>
                      )}
                      {sec.items && sec.items.map(([label,text],k) => (
                        <p key={k} style={{ fontSize:13, margin:'0 0 6px' }}>
                          <strong style={{ color:'#2D3748' }}>{label}:</strong> {text}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {/* ── User Agreement ── */}
              <div style={{ marginTop:24, padding:'16px 18px', borderRadius:12, background:'#F0FFF4', border:'1px solid #9AE6B4' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#276749', margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}>
                  ☑️ User Agreement
                </p>
                <ul style={{ margin:'0 0 10px 18px', padding:0 }}>
                  <li style={{ fontSize:13, marginBottom:6, color:'#2D3748' }}>I confirm that I meet the eligibility requirements and the information I provided is true and correct.</li>
                  <li style={{ fontSize:13, color:'#2D3748' }}>I have read and agree to the <strong>Terms of Service and Privacy Policy</strong>, including how my data will be collected and used for official SK purposes.</li>
                </ul>
                <p style={{ fontSize:12, margin:0, color:'#C05621', fontWeight:600 }}>⚠ You must agree to all items before proceeding.</p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 28px', borderTop:'1px solid #E8ECF0', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F7F8FA' }}>
              <p style={{ fontSize:11, color:'#A0AEC0', margin:0, fontFamily:"'Inter',sans-serif" }}>
                SK Bakakeng Central · Last Updated: March 24, 2026
              </p>
              <button onClick={() => { setTcAccepted(true); setShowTnC(false) }} style={{
                padding:'10px 28px', borderRadius:50, border:'none',
                background:'#1A365D', color:'white', cursor:'pointer',
                fontSize:13, fontWeight:700, letterSpacing:'1px',
                fontFamily:"'Montserrat','Inter',sans-serif",
                boxShadow:'0 4px 12px rgba(26,54,93,0.3)'
              }}>
                I Accept &amp; Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        .spinner{animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}


