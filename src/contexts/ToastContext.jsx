import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const Ctx = createContext({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', top: 80, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, width: 320 }}>
        {toasts.map(t => {
          const map = {
            success: { icon: <CheckCircle size={17}/>, color: '#48BB78' },
            error:   { icon: <XCircle size={17}/>,    color: '#C53030' },
            info:    { icon: <AlertCircle size={17}/>, color: '#1A365D' },
          }
          const s = map[t.type] || map.info
          return (
            <div key={t.id} className="animate-slide-in"
              style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'flex-start', gap: 10, borderLeft: `4px solid ${s.color}` }}>
              <span style={{ color: s.color, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: '#2D3748', flex: 1, lineHeight: 1.5, fontFamily: 'Inter, Georgia, serif' }}>{t.msg}</span>
              <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0AEC0', padding: 0, flexShrink: 0 }}><X size={14}/></button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
