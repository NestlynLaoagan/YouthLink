import React from 'react'
import { X, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const MF = "'Montserrat', 'Inter', sans-serif"   // heading font
const IF = "'Inter', sans-serif"                   // body/UI font

export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`spinner ${className}`} style={{ color: '#1A365D' }}/>
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null
  const maxW = { sm: 480, md: 560, lg: 720, xl: 900 }
  const w = maxW[size] || 560
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'center' }}>
      <div className="modal-box animate-fade-in"
        style={{ maxWidth: w, width: '100%', boxSizing: 'border-box' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A365D', fontFamily: MF }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0AEC0', padding: 4, display:'flex', alignItems:'center' }}>
            <X size={20}/>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function FormField({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#2D3748', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5, fontFamily: IF }}>
        {label}{required && <span style={{ color: '#C53030', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#718096', marginTop: 4, fontFamily: IF }}>{hint}</p>}
    </div>
  )
}

export function statusBadge(status) {
  const s = (status || '').toLowerCase()
  const base = { display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, fontFamily:IF }
  if (['upcoming','planning'].includes(s))    return <span style={{ ...base, background:'#EBF8FF', color:'#1A365D' }}>{status}</span>
  if (['ongoing','in progress'].includes(s))  return <span style={{ ...base, background:'#F0FFF4', color:'#276749', border:'1px solid #9AE6B4' }}>{status}</span>
  if (['cancelled','on hold','declined'].includes(s)) return <span style={{ ...base, background:'#FFF5F5', color:'#C53030', border:'1px solid #FC8181' }}>{status}</span>
  if (['finished','completed'].includes(s))   return <span style={{ ...base, background:'#F7FAFC', color:'#718096', border:'1px solid #E2E8F0' }}>{status}</span>
  if (s === 'pending')  return <span style={{ ...base, background:'#FEF9E7', color:'#7B4800', border:'1px solid #D69E2E' }}>{status}</span>
  if (s === 'verified') return <span style={{ ...base, background:'#F0FFF4', color:'#276749', border:'1px solid #9AE6B4' }}>{status}</span>
  return <span style={{ ...base, background:'#F7FAFC', color:'#718096', border:'1px solid #E2E8F0' }}>{status}</span>
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false, loading = false, confirmLabel, cancelLabel }) {
  if (!open) return null
  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="animate-fade-in" style={{ background: 'white', borderRadius: 18, padding: 36, maxWidth: 390, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: danger ? '#FFF5F5' : '#EBF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26 }}>
          {danger ? '⚠️' : '❓'}
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1A365D', marginBottom: 10, fontFamily: MF }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#718096', marginBottom: 28, lineHeight: 1.6, fontFamily: IF }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, fontFamily: IF }}>{cancelLabel || 'Cancel'}</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 1, padding:'10px', borderRadius:9, border:'none', cursor:loading?'not-allowed':'pointer', fontWeight:700, fontSize:14, fontFamily:IF,
              background: danger ? '#C53030' : '#1A365D', color:'white', opacity:loading?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {loading ? <Spinner size={16}/> : (confirmLabel || 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '52px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A365D', marginBottom: 8, fontFamily: MF }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#718096', maxWidth: 300, lineHeight: 1.7, marginBottom: 18, fontFamily: IF }}>{subtitle}</p>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A365D', fontFamily: MF, marginBottom: 4 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: '#718096', fontFamily: IF }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function ReadOnlyBanner() {
  return (
    <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(214,158,46,0.08)', border:'1px solid rgba(214,158,46,0.35)', marginBottom:20, fontSize:13, color:'#7B4800', display:'flex', alignItems:'center', gap:8, fontFamily:IF }}>
      👁 <strong>View Only</strong> — You have read-only access to this module. Contact a Super Admin for full control.
    </div>
  )
}
