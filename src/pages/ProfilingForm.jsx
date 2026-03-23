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
  if (n>=16&&n<=17) return '16-17 yrs old'
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
  const { user, profile, refreshProfile, logAudit } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()

  const [loading,  setLoading]  = useState(false)
  const [showWelcome, setWelcome] = useState(!isUpdate)
  const [form,     setForm]     = useState(EMPTY)

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

    }
    const t = setTimeout(() => setWelcome(false), 6000)
    return () => clearTimeout(t)
  }, [profile, isUpdate])

  const set = (k, v) => setForm(f => ({
    ...f, [k]: v,
    ...(k==='birthday' ? { age: calcAge(v), youth_age_group: youthGroup(calcAge(v)) } : {}),
    ...(k==='age'      ? { youth_age_group: youthGroup(v) } : {}),
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.given_name.trim() || !form.last_name.trim()) { toast('Full name is required.','error'); return }
    if (!form.gender)     { toast('Please select your gender.','error'); return }
    if (!form.birthday)   { toast('Birthday is required.','error'); return }
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

      if (!isUpdate) navigate('/dashboard')
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
            <p style={{ fontWeight:700, color:'#1A365D', fontSize:13 }}>Account Created!</p>
            <p style={{ fontSize:12, color:'#718096', marginTop:1 }}>Welcome! Please complete your profile.</p>
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
              <p style={{ fontSize:12, color:'#718096', marginTop:2 }}>Complete your resident profile to access the dashboard.</p>
            </div>
          </div>
        )}

        {/* Verification status banner removed — no verification required */}

        <form onSubmit={handleSubmit}>

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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <Label>Contact No.</Label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'#718096', fontWeight:700 }}>+639</span>
                  <input style={{ ...inp, paddingLeft:44 }} onFocus={onFocus} onBlur={onBlur} value={form.contact} onChange={e=>set('contact',e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="xxxxxxxxx" maxLength={9}/>
                </div>
              </div>
              <div>
                <Label required>Birthday</Label>
                <input type="date" style={inp} onFocus={onFocus} onBlur={onBlur} value={form.birthday} onChange={e=>set('birthday',e.target.value)} required/>
              </div>
              <div>
                <Label>Age</Label>
                <input style={{ ...inp, background:'#EDF2F7', cursor:'not-allowed' }} value={form.age} readOnly placeholder="Auto-calculated"/>
              </div>
            </div>

          </div>

          {/* SECTION 2 */}
          <div style={{ background:'white', borderRadius:12, padding:20, marginBottom:14, border:'1px solid #E2E8F0' }}>
            <SectionHeader num="2" title="Demographic Characteristics"/>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              {[
                ['civil_status','Civil Status',['Single','Married','Divorced','Widowed','Separated','Live-in']],
                ['work_status','Work Status',['Employed','Unemployed','Self-Employed','Looking for a job']],
                ['youth_age_group','Youth Age Group',['16-17 yrs old','18-24 yrs old','25-30 yrs old']],
                ['educational_background','Educational Background',['Elementary','Highschool','Senior High','College','Vocational']],
              ].map(([key,label,opts]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <select style={{ ...inp }} onFocus={onFocus} onBlur={onBlur} value={form[key]} onChange={e=>set(key,e.target.value)}>
                    <option value="">Choose {label.toLowerCase()}</option>
                    {opts.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Youth Classification */}
            <Field label="Youth Classification">
              <select style={inp} onFocus={onFocus} onBlur={onBlur} value={form.youth_classification} onChange={e=>set('youth_classification',e.target.value)}>
                <option value="">Choose classification</option>
                {['In school youth','Out of School youth','Working Youth','Youth with special needs'].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
              {form.youth_classification==='Youth with special needs' && (
                <input style={{ ...inp, marginTop:8 }} onFocus={onFocus} onBlur={onBlur} value={form.youth_spec} onChange={e=>set('youth_spec',e.target.value)} placeholder="Please specify…"/>
              )}
            </Field>

            {/* Voting Information */}
            <div style={{ background:'#FEF9E7', borderRadius:10, padding:14, border:'1px solid rgba(214,158,46,.3)', marginTop:4 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#1A365D', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:12 }}>Voting Information</p>
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
            {isUpdate ? 'SAVE CHANGES' : 'SUBMIT FORM'}
          </button>
          {isUpdate && (
            <button type="button" onClick={() => navigate('/dashboard')}
              style={{ width:'100%', padding:'11px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'white', color:'#718096', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', marginBottom:8 }}>
              Cancel
            </button>
          )}
          <p style={{ textAlign:'center', fontSize:11, color:'#A0AEC0', fontStyle:'italic', lineHeight:1.6 }}>
            REST ASSURED THAT ALL INFORMATION GATHERED FROM THIS FORM WILL BE TREATED WITH UTMOST CONFIDENTIALITY.
          </p>
        </form>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}} .spinner{animation:spin .8s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
