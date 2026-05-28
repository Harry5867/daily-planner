'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────
type Priority = 'h' | 'm' | 'l'
type CapTag = 'idea' | 'task' | 'note' | 'later'
type EnergyLevel = 'eh' | 'em' | 'el'

interface Task { id: string; name: string; priority: Priority; done: boolean; day: string }
interface TlItem { id: string; time: string; name: string; done: boolean; day: string }
interface Capture { id: string; text: string; tag: CapTag; day: string; created_at: string }
interface Review { mood: string; note: string; focus_seconds: number; completed_pomos: number; energy: Record<string, EnergyLevel> }

type Tab = 'checklist' | 'timeline' | 'pomodoro' | 'capture' | 'review'

interface Pomo { id: string; name: string; total: number; remaining: number; running: boolean; elapsed: number }

// ── Constants ──────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0]
const HOURS = ['6h','7h','8h','9h','10h','11h','12h','13h','14h','15h','16h','17h','18h','19h']
const ENERGY_CYCLE: EnergyLevel[] = ['em','eh','el']
const ENERGY_ICON: Record<EnergyLevel,string> = { em:'😐', eh:'🔥', el:'😴' }
const ENERGY_CLS: Record<EnergyLevel,string> = {
  em:'bg-stone-100 border-stone-200 text-stone-500',
  eh:'bg-orange-50 border-orange-200 text-orange-700',
  el:'bg-gray-100 border-gray-200 text-gray-400'
}
const PRI_LABEL: Record<Priority,string> = { h:'Cao', m:'Trung', l:'Thấp' }
const PRI_CLS: Record<Priority,string> = {
  h:'bg-red-50 text-red-700 border border-red-100',
  m:'bg-amber-50 text-amber-700 border border-amber-100',
  l:'bg-green-50 text-green-700 border border-green-100'
}
const TAG_LABEL: Record<CapTag,string> = { idea:'💡 Ý tưởng', task:'📌 Việc làm', note:'📝 Ghi chú', later:'⏰ Để sau' }
const CIRC = 2 * Math.PI * 38

function fmt(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

// ── Reusable UI ────────────────────────────────────────────
function Btn({ onClick, children, variant='default', size='md', disabled=false, className='' }:
  { onClick?: ()=>void; children: React.ReactNode; variant?: 'default'|'primary'|'ghost'|'danger'
    size?: 'sm'|'md'; disabled?: boolean; className?: string }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm:'px-2.5 py-1 text-xs', md:'px-3.5 py-2 text-sm' }
  const variants = {
    default:'bg-white border-stone-200 text-stone-700 hover:bg-stone-50',
    primary:'bg-[#5C4FD6] border-[#5C4FD6] text-white hover:bg-[#4840C0]',
    ghost:'bg-transparent border-transparent text-stone-400 hover:bg-stone-100 hover:text-stone-600',
    danger:'bg-transparent border-transparent text-stone-300 hover:bg-red-50 hover:text-red-600',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

function Input({ value, onChange, onKeyDown, placeholder, maxLength, className='' }:
  { value: string; onChange: (v:string)=>void; onKeyDown?: (e:React.KeyboardEvent)=>void
    placeholder?: string; maxLength?: number; className?: string }) {
  return (
    <input type="text" value={value} onChange={e=>onChange(e.target.value)}
      onKeyDown={onKeyDown} placeholder={placeholder} maxLength={maxLength}
      className={`w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg
        focus:outline-none focus:border-purple-400 focus:bg-white transition-colors ${className}`}/>
  )
}

function Card({ children, className='' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-stone-200 rounded-xl p-5 shadow-sm ${className}`}>{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">{children}</div>
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-500 rounded-full spin"/>
}

function Notif({ msg }: { msg: string }) {
  if(!msg) return null
  return (
    <div className="fixed bottom-6 right-6 bg-stone-800 text-white text-sm font-medium
      px-4 py-3 rounded-xl shadow-lg z-50 slide-up max-w-xs">
      {msg}
    </div>
  )
}

// ── Login Screen ───────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: ()=>void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  async function handleEmail() {
    if(!email || !password) return
    setLoading(true); setMsg('')
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    setLoading(false)
    if(error) setMsg(error.message)
    else if(mode === 'signup') setMsg('Kiểm tra email để xác nhận tài khoản!')
    else onLogin()
  }

async function handleGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { 
      redirectTo: `${location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
  if(error) setMsg(error.message)
}

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      <div className="w-full max-w-sm slide-up">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📋</div>
          <h1 className="text-3xl text-stone-800 mb-1" style={{fontFamily:"'DM Serif Display',serif"}}>Daily Planner</h1>
          <p className="text-sm text-stone-500">Lập kế hoạch ngày hiệu quả</p>
        </div>
        <Card>
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-stone-200
              rounded-lg text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 transition-colors mb-4">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.9-2.2 5.4-4.7 7v5.8h7.6c4.5-4.1 7-10.2 7-16.8z"/>
              <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.8c-2.2 1.5-5 2.3-8.3 2.3-6.3 0-11.7-4.3-13.6-10H2.6v6c4 7.9 12.1 13.3 21.4 13.3z"/>
              <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7v-6H2.6C1 16.8 0 20.3 0 24s1 7.2 2.6 10.7l7.8-6z"/>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.5 0 24 0 14.7 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.8 17.7 9.5 24 9.5z"/>
            </svg>
            Đăng nhập bằng Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-stone-100"/>
            <span className="text-xs text-stone-400">hoặc</span>
            <div className="flex-1 h-px bg-stone-100"/>
          </div>

          <div className="space-y-3 mb-4">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-purple-400 focus:bg-white transition-colors"/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu"
              onKeyDown={e=>e.key==='Enter'&&handleEmail()}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-purple-400 focus:bg-white transition-colors"/>
          </div>

          {msg && <p className="text-xs text-center mb-3 text-stone-500">{msg}</p>}

          <Btn onClick={handleEmail} variant="primary" disabled={loading} className="w-full justify-center">
            {loading ? <Spinner/> : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Btn>

          <p className="text-xs text-center text-stone-400 mt-4">
            {mode==='login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button onClick={()=>{setMode(m=>m==='login'?'signup':'login');setMsg('')}}
              className="text-purple-500 hover:text-purple-700 font-medium">
              {mode==='login' ? 'Tạo mới' : 'Đăng nhập'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const supabase = createClient()
  const [user, setUser] = useState<User|null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [tab, setTab] = useState<Tab>('checklist')
  const [notifMsg, setNotifMsg] = useState('')
  const notifTimer = useRef<ReturnType<typeof setTimeout>>()

  // Data state
  const [tasks, setTasks] = useState<Task[]>([])
  const [tlItems, setTlItems] = useState<TlItem[]>([])
  const [captures, setCaptures] = useState<Capture[]>([])
  const [review, setReview] = useState<Review>({ mood:'', note:'', focus_seconds:0, completed_pomos:0, energy:{} })
  const [pomos, setPomos] = useState<Pomo[]>([])
  const pomoRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  // Input state
  const [taskInput, setTaskInput] = useState('')
  const [taskPri, setTaskPri] = useState<Priority>('m')
  const [tlInput, setTlInput] = useState('')
  const [tlTime, setTlTime] = useState('')
  const [capInput, setCapInput] = useState('')
  const [capTag, setCapTag] = useState<CapTag>('idea')
  const [pomoName, setPomoName] = useState('')
  const [pomoMins, setPomoMins] = useState(25)
  const [focusTask, setFocusTask] = useState('')
  const [loading, setLoading] = useState(true)

  function notify(msg: string) {
    setNotifMsg(msg)
    clearTimeout(notifTimer.current)
    notifTimer.current = setTimeout(() => setNotifMsg(''), 2800)
  }

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Set default time input
  useEffect(() => {
    const n = new Date()
    setTlTime(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`)
  }, [])

  // ── Load data ──
  const loadData = useCallback(async () => {
    if(!user) return
    setLoading(true)
    const [t, tl, c, r] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).eq('day', TODAY).order('created_at'),
      supabase.from('timeline_items').select('*').eq('user_id', user.id).eq('day', TODAY).order('time'),
      supabase.from('captures').select('*').eq('user_id', user.id).eq('day', TODAY).order('created_at', {ascending:false}),
      supabase.from('daily_reviews').select('*').eq('user_id', user.id).eq('day', TODAY).single(),
    ])
    if(t.data) setTasks(t.data)
    if(tl.data) setTlItems(tl.data)
    if(c.data) setCaptures(c.data)
    if(r.data) setReview({ mood: r.data.mood||'', note: r.data.note||'', focus_seconds: r.data.focus_seconds||0, completed_pomos: r.data.completed_pomos||0, energy: r.data.energy||{} })
    setLoading(false)
  }, [user])

  useEffect(() => { if(user) loadData() }, [user, loadData])

  async function upsertReview(patch: Partial<Review>) {
    if(!user) return
    const updated = { ...review, ...patch }
    setReview(updated)
    await supabase.from('daily_reviews').upsert({
      user_id: user.id, day: TODAY,
      mood: updated.mood, note: updated.note,
      focus_seconds: updated.focus_seconds,
      completed_pomos: updated.completed_pomos,
      energy: updated.energy,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,day' })
  }

  // ── Tasks ──
  async function addTask() {
    if(!taskInput.trim() || !user) return
    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id, name: taskInput.trim(), priority: taskPri, done: false, day: TODAY
    }).select().single()
    if(!error && data) { setTasks(p => [...p, data]); notify('Đã thêm: ' + data.name) }
    setTaskInput('')
  }

  async function toggleTask(id: string, done: boolean) {
    await supabase.from('tasks').update({ done: !done }).eq('id', id)
    setTasks(p => p.map(t => t.id===id ? {...t, done:!done} : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(p => p.filter(t => t.id !== id))
    notify('Đã xoá task')
  }

  // ── Timeline ──
  async function addTl() {
    if(!tlInput.trim() || !tlTime || !user) return
    const { data, error } = await supabase.from('timeline_items').insert({
      user_id: user.id, time: tlTime, name: tlInput.trim(), done: false, day: TODAY
    }).select().single()
    if(!error && data) { setTlItems(p => [...p, data].sort((a,b)=>a.time.localeCompare(b.time))); notify('Đã thêm: '+data.time+' '+data.name) }
    setTlInput('')
  }

  async function toggleTl(id: string, done: boolean) {
    await supabase.from('timeline_items').update({ done: !done }).eq('id', id)
    setTlItems(p => p.map(t => t.id===id ? {...t, done:!done} : t))
  }

  async function deleteTl(id: string) {
    await supabase.from('timeline_items').delete().eq('id', id)
    setTlItems(p => p.filter(t => t.id !== id))
  }

  // ── Capture ──
  async function addCap() {
    if(!capInput.trim() || !user) return
    const { data, error } = await supabase.from('captures').insert({
      user_id: user.id, text: capInput.trim(), tag: capTag, day: TODAY
    }).select().single()
    if(!error && data) { setCaptures(p => [data, ...p]); notify('Đã lưu nhanh!') }
    setCapInput('')
  }

  async function deleteCap(id: string) {
    await supabase.from('captures').delete().eq('id', id)
    setCaptures(p => p.filter(c => c.id !== id))
  }

  async function capToTask(cap: Capture) {
    if(!user) return
    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id, name: cap.text, priority: 'm', done: false, day: TODAY
    }).select().single()
    if(!error && data) {
      setTasks(p => [...p, data])
      await supabase.from('captures').delete().eq('id', cap.id)
      setCaptures(p => p.filter(c => c.id !== cap.id))
      notify('Đã chuyển thành task!')
    }
  }

  // ── Pomodoro ──
  function addPomo(nameArg?: string, minsArg?: number) {
    const name = nameArg || pomoName.trim() || 'Focus session'
    const mins = minsArg || pomoMins || 25
    const id = 'p' + Date.now()
    setPomos(p => [...p, { id, name, total: mins*60, remaining: mins*60, running: false, elapsed: 0 }])
    if(!nameArg) { setPomoName(''); setPomoMins(25) }
    notify('Đã thêm: ' + name + ' (' + mins + ' phút)')
  }

  function togglePomo(id: string) {
    setPomos(prev => {
      const p = prev.find(x => x.id === id)
      if(!p || p.remaining <= 0) return prev
      if(p.running) {
        clearInterval(pomoRefs.current[id])
        return prev.map(x => x.id===id ? {...x, running:false} : x)
      } else {
        pomoRefs.current[id] = setInterval(() => {
          setPomos(pp => {
            const cur = pp.find(x => x.id===id)
            if(!cur || cur.remaining <= 0) { clearInterval(pomoRefs.current[id]); return pp }
            const next = { ...cur, remaining: cur.remaining-1, elapsed: cur.elapsed+1 }
            if(next.remaining <= 0) {
              clearInterval(pomoRefs.current[id])
              next.running = false
              setReview(r => { const u = {...r, focus_seconds: r.focus_seconds+next.elapsed, completed_pomos: r.completed_pomos+1}; upsertReview(u); return u })
              notify('🎉 Xong! ' + next.name)
            }
            return pp.map(x => x.id===id ? next : x)
          })
        }, 1000)
        return prev.map(x => x.id===id ? {...x, running:true} : x)
      }
    })
  }

  function resetPomo(id: string) {
    clearInterval(pomoRefs.current[id])
    setPomos(p => p.map(x => x.id===id ? {...x, remaining:x.total, running:false, elapsed:0} : x))
  }

  function deletePomo(id: string) {
    clearInterval(pomoRefs.current[id])
    setPomos(p => p.filter(x => x.id !== id))
  }

  // ── Energy ──
  function cycleEnergy(h: string) {
    const cur = (review.energy[h] || 'em') as EnergyLevel
    const next = ENERGY_CYCLE[(ENERGY_CYCLE.indexOf(cur)+1) % ENERGY_CYCLE.length]
    upsertReview({ energy: { ...review.energy, [h]: next } })
  }

  // ── Sign out ──
  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if(authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--bg)'}}>
      <Spinner/>
    </div>
  )

  if(!user) return <LoginScreen onLogin={() => {}}/>

  const done = tasks.filter(t=>t.done).length
  const focusMins = Math.floor(review.focus_seconds/60)
  const score = tasks.length ? Math.round((done/tasks.length)*100) : 0

  const TABS: {id:Tab; label:string}[] = [
    {id:'checklist',label:'✅ Checklist'},
    {id:'timeline',label:'📅 Timeline'},
    {id:'pomodoro',label:'🍅 Pomodoro'},
    {id:'capture',label:'⚡ Capture'},
    {id:'review',label:'📊 Review'},
  ]

  return (
    <div className="min-h-screen" style={{background:'var(--bg)'}}>
      <div className="max-w-3xl mx-auto px-4 py-8 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-stone-800" style={{fontFamily:"'DM Serif Display',serif"}}>Daily Planner</h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:block">{user.email}</span>
            <Btn onClick={signOut} variant="ghost" size="sm">Đăng xuất</Btn>
          </div>
        </div>

        {/* Focus bar */}
        {focusTask && (
          <div className="bg-[#5C4FD6] text-white rounded-xl px-4 py-3 mb-4 flex items-center gap-3 slide-up">
            <span className="flex-1 text-sm font-medium">🎯 Đang focus: {focusTask}</span>
            <button onClick={()=>setFocusTask('')}
              className="text-xs bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 py-1 rounded-lg transition-colors">
              Xong ✓
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label:'Tổng việc', val: tasks.length, cls:'text-stone-700' },
            { label:'Hoàn thành', val: done, cls:'text-green-600' },
            { label:'Còn lại', val: tasks.length-done, cls:'text-red-500' },
            { label:'Focus', val: focusMins+'m', cls:'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.cls}`} style={{fontFamily:"'DM Serif Display',serif"}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex-1 min-w-fit px-2 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap
                ${tab===t.id ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner/></div>
        ) : (
          <>
            {/* ── CHECKLIST ── */}
            {tab==='checklist' && (
              <div className="fade-in space-y-4">
                <Card>
                  <SectionTitle>Việc cần làm hôm nay</SectionTitle>
                  <div className="flex gap-2 mb-4">
                    <Input value={taskInput} onChange={setTaskInput} placeholder="Thêm việc mới..." maxLength={60}
                      onKeyDown={e=>e.key==='Enter'&&addTask()} className="flex-1"/>
                    <select value={taskPri} onChange={e=>setTaskPri(e.target.value as Priority)}
                      className="px-2 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer">
                      <option value="h">🔴 Cao</option>
                      <option value="m">🟡 Trung</option>
                      <option value="l">🟢 Thấp</option>
                    </select>
                    <Btn onClick={addTask} variant="primary">+ Thêm</Btn>
                  </div>
                  <div className="space-y-2">
                    {!tasks.length && <p className="text-sm text-stone-400 text-center py-6">Chưa có việc nào — thêm ngay!</p>}
                    {tasks.map(t => (
                      <div key={t.id} className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-lg transition-all
                        ${t.done ? 'bg-stone-50 border-stone-100 opacity-60' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
                        <input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id,t.done)}
                          className="w-4 h-4 accent-purple-500 cursor-pointer flex-shrink-0"/>
                        <span className={`flex-1 text-sm ${t.done?'line-through text-stone-400':''}`}>{t.name}</span>
                        <button onClick={()=>{ setFocusTask(t.name); notify('Bắt đầu focus: '+t.name) }}
                          disabled={t.done}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all
                            ${focusTask===t.name ? 'bg-purple-500 border-purple-500 text-white' : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-500 hover:text-white hover:border-purple-500'}
                            disabled:opacity-40 disabled:cursor-not-allowed`}>
                          🎯 Focus
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRI_CLS[t.priority]}`}>{PRI_LABEL[t.priority]}</span>
                        <Btn onClick={()=>deleteTask(t.id)} variant="danger" size="sm">✕</Btn>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionTitle>⚡ Mức năng lượng theo giờ <span className="normal-case font-normal tracking-normal text-stone-300">(nhấn để chuyển 🔥😐😴)</span></SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {HOURS.map(h => {
                      const lv = (review.energy[h] || 'em') as EnergyLevel
                      return (
                        <button key={h} onClick={()=>cycleEnergy(h)}
                          className={`flex-1 min-w-[46px] px-1 py-2 border rounded-lg text-center transition-all text-xs select-none ${ENERGY_CLS[lv]}`}>
                          {ENERGY_ICON[lv]}
                          <div className="text-[10px] opacity-60 mt-0.5">{h}</div>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* ── TIMELINE ── */}
            {tab==='timeline' && (
              <div className="fade-in">
                <Card>
                  <SectionTitle>Lịch trình theo giờ</SectionTitle>
                  <div className="flex flex-col mb-2">
                    {!tlItems.length && <p className="text-sm text-stone-400 text-center py-6">Chưa có hoạt động nào.</p>}
                    {tlItems.map((t,i) => (
                      <div key={t.id} className="flex gap-3 py-2">
                        <div className="flex flex-col items-center w-12 flex-shrink-0">
                          <span className="text-xs text-stone-400 font-medium mb-1">{t.time}</span>
                          <button onClick={()=>toggleTl(t.id,t.done)}
                            className={`w-3 h-3 rounded-full border-2 transition-all flex-shrink-0
                              ${t.done ? 'bg-purple-500 border-purple-500' : 'bg-purple-100 border-purple-300 hover:border-purple-500'}`}/>
                          {i < tlItems.length-1 && <div className="w-0.5 flex-1 bg-stone-200 mt-1"/>}
                        </div>
                        <div className="flex-1 pb-3">
                          <span className={`text-sm ${t.done?'line-through text-stone-400':''}`}>{t.name}</span>
                        </div>
                        <Btn onClick={()=>deleteTl(t.id)} variant="danger" size="sm">✕</Btn>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-stone-100">
                    <input type="time" value={tlTime} onChange={e=>setTlTime(e.target.value)}
                      className="px-2.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-purple-400 w-28 flex-shrink-0"/>
                    <Input value={tlInput} onChange={setTlInput} placeholder="Hoạt động..." className="flex-1"
                      onKeyDown={e=>e.key==='Enter'&&addTl()}/>
                    <Btn onClick={addTl} variant="primary">+ Thêm</Btn>
                  </div>
                </Card>
              </div>
            )}

            {/* ── POMODORO ── */}
            {tab==='pomodoro' && (
              <div className="fade-in space-y-4">
                <Card>
                  <SectionTitle>Thêm bộ đếm ngược</SectionTitle>
                  <div className="flex gap-2 mb-3">
                    <Input value={pomoName} onChange={setPomoName} placeholder="Tên việc cần focus..." className="flex-1"/>
                    <input type="number" value={pomoMins} min={1} max={180}
                      onChange={e=>setPomoMins(parseInt(e.target.value)||25)}
                      className="w-20 px-2.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-purple-400"/>
                    <Btn onClick={()=>addPomo()} variant="primary">+ Thêm</Btn>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[{n:'Pomodoro',m:25},{n:'Deep work',m:50},{n:'Nghỉ ngắn',m:5},{n:'Nghỉ dài',m:15}].map(q=>(
                      <Btn key={q.m} onClick={()=>addPomo(q.n+' '+q.m+'m',q.m)} size="sm">{q.n} {q.m}p</Btn>
                    ))}
                  </div>
                </Card>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {!pomos.length && (
                    <div className="col-span-full">
                      <Card><p className="text-sm text-stone-400 text-center py-4">Thêm bộ đếm để bắt đầu tập trung!</p></Card>
                    </div>
                  )}
                  {pomos.map(p => {
                    const pct = 1-(p.remaining/p.total)
                    const offset = CIRC*(1-pct)
                    const urgent = p.remaining<=60 && p.running
                    return (
                      <div key={p.id} className={`bg-white border rounded-xl p-4 text-center shadow-sm transition-all ${p.running?'border-purple-300':'border-stone-200'}`}>
                        <p className="text-xs text-stone-400 mb-2 truncate" title={p.name}>{p.name}</p>
                        <div className="relative w-20 h-20 mx-auto mb-3">
                          <svg width="80" height="80" viewBox="0 0 80 80" className="absolute inset-0" style={{transform:'rotate(-90deg)'}}>
                            <circle cx="40" cy="40" r="38" fill="none" stroke="#E4E0D8" strokeWidth="4"/>
                            <circle cx="40" cy="40" r="38" fill="none"
                              stroke={urgent?'#C0392B':'#5C4FD6'} strokeWidth="4"
                              strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
                              style={{transition:'stroke-dashoffset 0.8s linear'}}/>
                          </svg>
                          <div className={`absolute inset-0 flex items-center justify-center text-lg font-semibold
                            ${urgent?'text-red-500':'text-stone-700'}`} style={{fontFamily:"'DM Serif Display',serif",fontVariantNumeric:'tabular-nums'}}>
                            {fmt(p.remaining)}
                          </div>
                        </div>
                        <div className="flex gap-1.5 justify-center">
                          <Btn onClick={()=>togglePomo(p.id)} size="sm" variant={p.remaining<=0?'default':'primary'}>
                            {p.remaining<=0 ? '✅' : p.running ? '⏸' : '▶'}
                          </Btn>
                          <Btn onClick={()=>resetPomo(p.id)} size="sm">↺</Btn>
                          <Btn onClick={()=>deletePomo(p.id)} variant="danger" size="sm">🗑</Btn>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── QUICK CAPTURE ── */}
            {tab==='capture' && (
              <div className="fade-in">
                <Card>
                  <SectionTitle>Ghi nhanh ý tưởng / việc phát sinh</SectionTitle>
                  <div className="flex gap-2 mb-2">
                    <Input value={capInput} onChange={setCapInput} placeholder="Ý tưởng, việc phát sinh... (Enter để lưu)"
                      onKeyDown={e=>e.key==='Enter'&&addCap()} className="flex-1"/>
                    <select value={capTag} onChange={e=>setCapTag(e.target.value as CapTag)}
                      className="px-2 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer">
                      <option value="idea">💡 Ý tưởng</option>
                      <option value="task">📌 Việc làm</option>
                      <option value="note">📝 Ghi chú</option>
                      <option value="later">⏰ Để sau</option>
                    </select>
                    <Btn onClick={addCap} variant="primary">Lưu</Btn>
                  </div>
                  <p className="text-xs text-stone-400 mb-4">Ghi nhanh rồi quay lại làm — đừng để gián đoạn luồng tập trung.</p>
                  <div className="space-y-2">
                    {!captures.length && <p className="text-sm text-stone-400 text-center py-4">Chưa có ghi chú nào!</p>}
                    {captures.map(c => (
                      <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-stone-50 border border-stone-100 rounded-lg">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 font-medium flex-shrink-0">{TAG_LABEL[c.tag]}</span>
                        <span className="flex-1 text-sm">{c.text}</span>
                        <span className="text-xs text-stone-400 flex-shrink-0">
                          {new Date(c.created_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}
                        </span>
                        <Btn onClick={()=>capToTask(c)} size="sm">→ Task</Btn>
                        <Btn onClick={()=>deleteCap(c.id)} variant="danger" size="sm">✕</Btn>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── DAILY REVIEW ── */}
            {tab==='review' && (
              <div className="fade-in">
                <Card>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="text-xl text-stone-800" style={{fontFamily:"'DM Serif Display',serif"}}>Tổng kết hôm nay</h2>
                      <p className="text-sm text-stone-400 mt-0.5">{new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl text-purple-500" style={{fontFamily:"'DM Serif Display',serif"}}>{score}%</div>
                      <div className="text-xs text-stone-400">Điểm năng suất</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {[
                      {label:'Việc xong', val:done, cls:'text-green-600'},
                      {label:'Chưa xong', val:tasks.length-done, cls:'text-red-500'},
                      {label:'Focus', val:focusMins+'m', cls:'text-purple-500'},
                      {label:'Pomodoro', val:review.completed_pomos, cls:'text-stone-600'},
                    ].map(s=>(
                      <div key={s.label} className="bg-stone-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">{s.label}</div>
                        <div className={`text-xl font-semibold ${s.cls}`} style={{fontFamily:"'DM Serif Display',serif"}}>{s.val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">✅ Đã hoàn thành</h3>
                      {!tasks.filter(t=>t.done).length && <p className="text-xs text-stone-400">Chưa có việc nào.</p>}
                      {tasks.filter(t=>t.done).map(t=>(
                        <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-stone-100 last:border-0">
                          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"/>
                          <span className="text-sm text-stone-600">{t.name}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">⏭ Chuyển sang ngày mai</h3>
                      {!tasks.filter(t=>!t.done).length && <p className="text-xs text-stone-400">Tất cả đều xong! 🎉</p>}
                      {tasks.filter(t=>!t.done).map(t=>(
                        <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-stone-100 last:border-0">
                          <span className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0"/>
                          <span className="text-sm text-stone-500">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="text-xs text-stone-400 uppercase tracking-wider mb-2">Thời gian focus (mục tiêu 4h)</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full transition-all duration-700"
                          style={{width:`${Math.min(100,Math.round(focusMins/240*100))}%`}}/>
                      </div>
                      <span className="text-xs text-stone-400">{Math.min(100,Math.round(focusMins/240*100))}%</span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="text-xs text-stone-400 uppercase tracking-wider mb-2">Cảm xúc cuối ngày</div>
                    <div className="flex gap-2">
                      {['😫','😐','🙂','😊','🚀'].map(e=>(
                        <button key={e} onClick={()=>upsertReview({mood:e})}
                          className={`flex-1 py-2 text-xl border rounded-lg transition-all
                            ${review.mood===e ? 'bg-purple-50 border-purple-300' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-stone-400 uppercase tracking-wider mb-2">Ghi chú / Bài học hôm nay</div>
                    <textarea value={review.note} onChange={e=>upsertReview({note:e.target.value})} rows={3}
                      placeholder="Hôm nay học được gì? Ngày mai cải thiện gì?..."
                      className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none"/>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
      <Notif msg={notifMsg}/>
    </div>
  )
}
