import { useState, useEffect, useMemo, useCallback } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'

dayjs.locale('ko')

// ---- Supabase 설정 (npm 패키지 없이 fetch로 직접 호출) ----
const SUPABASE_URL = 'https://rrselzylrpcdpqglyyji.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyc2VsenlscnBjZHBxZ2x5eWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTYzMzEsImV4cCI6MjA5NzMzMjMzMX0.9pxV2rYGvF2iRZ9OXfLxwJpS83s0ssRrVq8A771_NmY'
const TABLE = 'project'
const REST = `${SUPABASE_URL}/rest/v1/${TABLE}`

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

// 공사 블록 색상 팔레트 (iOS 시스템 컬러)
const COLORS = [
  '#ff3b30', // red
  '#ff9500', // orange
  '#ffcc00', // yellow
  '#34c759', // green
  '#30b0c7', // teal
  '#32ade6', // cyan
  '#007aff', // blue
  '#5856d6', // indigo
  '#af52de', // purple
  '#ff2d55', // pink
  '#a2845e', // brown
  '#8e8e93', // gray
]

const APP_PASSWORD = '030265'
const AUTH_KEY = 'yebaek_auth'
const DATE_FMT = 'YYYY-MM-DD'

const CATEGORIES = ['여백디자인', '개인']
const DEFAULT_COLOR = COLORS[6]

// 일정의 블록 색상 = 현장색상 (없으면 기존 color, 그것도 없으면 기본)
const blockColor = (p) => p.site_color || p.color || DEFAULT_COLOR
// 카테고리 (없으면 여백디자인으로 간주)
const categoryOf = (p) => p.category || CATEGORIES[0]

const emptyForm = (category = CATEGORIES[0]) => ({
  id: null,
  name: '',
  category,
  site_name: '',
  site_color: DEFAULT_COLOR,
  start_date: dayjs().format(DATE_FMT),
  end_date: dayjs().format(DATE_FMT),
  memo: '',
  all_day: true,
  start_time: '09:00',
  end_time: '18:00',
})

// 캘린더 블록에 보여줄 라벨 (시간 / 제목)
const chipText = (p) => {
  const parts = []
  if (!p.all_day && p.start_time) parts.push(String(p.start_time).slice(0, 5))
  parts.push(p.name)
  return parts.join(' ')
}

// [gridStart, gridEnd] 범위의 날짜별 일정 맵 생성
function buildEventsByDate(projects, gridStart, gridEnd) {
  const byDate = {}
  const addSpan = (p, s, e) => {
    let d = s.isBefore(gridStart, 'day') ? gridStart : s
    const last = e.isAfter(gridEnd, 'day') ? gridEnd : e
    for (; !d.isAfter(last, 'day'); d = d.add(1, 'day')) {
      const k = d.format(DATE_FMT)
      const arr = (byDate[k] ||= [])
      if (!arr.some((x) => x.id === p.id)) arr.push(p)
    }
  }
  for (const p of projects) {
    addSpan(p, dayjs(p.start_date), dayjs(p.end_date))
  }
  return byDate
}

export default function App() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === 'ok'
  )

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />
  return <Calendar onLogout={() => setAuthed(false)} />
}

// ---------------- 로그인 화면 ----------------
function Login({ onSuccess }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (pw === APP_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, 'ok')
      onSuccess()
    } else {
      setError('비밀번호가 올바르지 않습니다.')
      setPw('')
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">여백디자인</div>
        <h1 className="login-title">공정 관리 캘린더</h1>
        <input
          type="password"
          className="login-input"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value)
            setError('')
          }}
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" className="btn btn-primary login-btn">
          로그인
        </button>
      </form>
    </div>
  )
}

// ---------------- 캘린더 화면 ----------------
function Calendar({ onLogout }) {
  const [cursor, setCursor] = useState(() => dayjs().startOf('month'))
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // form object or null
  const [daySheet, setDaySheet] = useState(null) // 바텀시트로 보여줄 날짜(dayjs) 또는 null
  const [tab, setTab] = useState(CATEGORIES[0]) // 활성 카테고리 탭

  // 프로젝트 → 수정 모달 폼 (바텀시트 / 블록 클릭 공용)
  const openEdit = useCallback((p) => {
    setDaySheet(null)
    setModal({
      id: p.id,
      name: p.name ?? '',
      category: categoryOf(p),
      site_name: p.site_name ?? '',
      site_color: blockColor(p),
      start_date: p.start_date,
      end_date: p.end_date,
      memo: p.memo ?? '',
      all_day: p.all_day ?? true,
      start_time: (p.start_time || '09:00').slice(0, 5),
      end_time: (p.end_time || '18:00').slice(0, 5),
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${REST}?select=*&order=start_date.asc`, {
        headers,
      })
      if (!res.ok) throw new Error(await res.text())
      setProjects(await res.json())
    } catch (e) {
      setError('데이터를 불러오지 못했습니다: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (form) => {
    const payload = {
      name: form.name.trim(),
      category: form.category,
      site_name: form.site_name.trim(),
      site_color: form.site_color,
      start_date: form.start_date,
      end_date: form.end_date,
      memo: form.memo.trim(),
      all_day: form.all_day,
      start_time: form.all_day ? null : form.start_time || null,
      end_time: form.all_day ? null : form.end_time || null,
    }
    try {
      let res
      if (form.id) {
        res = await fetch(`${REST}?id=eq.${form.id}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(REST, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) throw new Error(await res.text())
      setModal(null)
      await load()
    } catch (e) {
      alert('저장 실패: ' + e.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('이 공사를 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`${REST}?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error(await res.text())
      setModal(null)
      await load()
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  // 달력 그리드 (일요일 시작)
  const weeks = useMemo(() => buildWeeks(cursor), [cursor])
  // 활성 탭(카테고리)으로 필터링
  const visibleProjects = useMemo(
    () => projects.filter((p) => categoryOf(p) === tab),
    [projects, tab]
  )
  // 반복 규칙을 반영한 날짜별 일정 맵 (보이는 6주 범위)
  const eventsByDate = useMemo(() => {
    const gridStart = weeks[0][0]
    const gridEnd = weeks[weeks.length - 1][6]
    return buildEventsByDate(visibleProjects, gridStart, gridEnd)
  }, [visibleProjects, weeks])
  // 현장명 → 현장색상 매핑 (같은 현장명은 항상 같은 색)
  const siteMap = useMemo(() => {
    const m = {}
    for (const p of projects) {
      const name = (p.site_name || '').trim()
      if (name && p.site_color) m[name] = p.site_color
    }
    return m
  }, [projects])

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="month-title">
          {cursor.format('YYYY년 M월')}
          <span className="caret">⌄</span>
        </h1>
        <div className="topbar-icons">
          <button className="icon-btn" onClick={() => setCursor(cursor.subtract(1, 'month'))} aria-label="이전 달">
            ‹
          </button>
          <button className="icon-btn today-dot" onClick={() => setCursor(dayjs().startOf('month'))} aria-label="오늘">
            오늘
          </button>
          <button className="icon-btn" onClick={() => setCursor(cursor.add(1, 'month'))} aria-label="다음 달">
            ›
          </button>
          <button className="icon-btn" onClick={onLogout} aria-label="로그아웃">
            ⎋
          </button>
        </div>
      </header>

      <div className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`tab ${tab === c ? 'active' : ''}`}
            onClick={() => setTab(c)}
          >
            {tab === c && <span className="tab-check">✓</span>}
            {c}
          </button>
        ))}
      </div>

      {error && <div className="banner-error">{error}</div>}
      {loading && <div className="banner">불러오는 중…</div>}

      <div className="calendar">
        <div className="weekday-row">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div
              key={d}
              className={`weekday ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}
            >
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <WeekRow
            key={wi}
            week={week}
            eventsByDate={eventsByDate}
            month={cursor}
            onClickProject={openEdit}
            onClickDay={(day) => setDaySheet(day)}
          />
        ))}
      </div>

      <button
        className="fab"
        onClick={() => setModal(emptyForm(tab))}
        aria-label="공사 등록"
      >
        +
      </button>

      {daySheet && (
        <DayListSheet
          day={daySheet}
          projects={eventsByDate[daySheet.format(DATE_FMT)] || []}
          onClickProject={openEdit}
          onAddNew={() => {
            setDaySheet(null)
            setModal({
              ...emptyForm(tab),
              start_date: daySheet.format(DATE_FMT),
              end_date: daySheet.format(DATE_FMT),
            })
          }}
          onClose={() => setDaySheet(null)}
        />
      )}

      {modal && (
        <ProjectModal
          form={modal}
          siteMap={siteMap}
          onChange={setModal}
          onClose={() => setModal(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  )
}

// ---------------- 날짜별 일정 바텀시트 ----------------
function DayListSheet({ day, projects, onClickProject, onAddNew, onClose }) {
  return (
    <div className="bs-backdrop" onClick={onClose}>
      <div className="bs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bs-handle" />
        <div className="bs-head">
          <span className="bs-date">{day.format('M월 D일 (ddd)')}</span>
          <button type="button" className="bs-add" onClick={onAddNew}>
            + 새 일정
          </button>
        </div>
        <div className="bs-list">
          {projects.length === 0 ? (
            <div className="bs-empty">등록된 일정이 없습니다.</div>
          ) : (
            projects.map((p) => (
              <button
                type="button"
                key={p.id}
                className="bs-item"
                onClick={() => onClickProject(p)}
              >
                <span
                  className="bs-dot"
                  style={{ backgroundColor: blockColor(p) }}
                />
                <span className="bs-item-body">
                  <span className="bs-item-title">{p.name}</span>
                  <span className="bs-item-sub">
                    {p.site_name ? p.site_name + ' · ' : ''}
                    {p.all_day
                      ? '종일'
                      : `${(p.start_time || '').slice(0, 5)}${
                          p.end_time ? ' - ' + p.end_time.slice(0, 5) : ''
                        }`}
                  </span>
                </span>
                <span className="bs-chevron">›</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// 6주 x 7일 그리드 생성 (일요일 시작)
function buildWeeks(cursor) {
  const start = cursor.startOf('month').startOf('week') // dayjs week starts Sunday by default
  const weeks = []
  let day = start
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(day)
      day = day.add(1, 'day')
    }
    weeks.push(week)
  }
  return weeks
}

// ---------------- 주 단위 행 (날짜 셀마다 공사 블록 표시) ----------------
const MAX_VISIBLE = 4

function WeekRow({ week, eventsByDate, month, onClickProject, onClickDay }) {
  const today = dayjs()

  return (
    <div className="week-row">
      {week.map((day, di) => {
        const dayKey = day.format(DATE_FMT)
        const inMonth = day.month() === month.month()
        const isToday = day.isSame(today, 'day')
        // 이 날짜에 진행 중인 공사들 (날짜별 맵에서 조회)
        const dayProjects = eventsByDate[dayKey] || []
        // 최대 4개까지 블록 표시, 5개 이상이면 "+N개 더"
        const visible =
          dayProjects.length <= MAX_VISIBLE
            ? dayProjects
            : dayProjects.slice(0, MAX_VISIBLE)
        const hidden = dayProjects.length - visible.length

        return (
          <div
            key={di}
            className={`day-cell ${inMonth ? '' : 'out-month'} ${
              isToday ? 'today' : ''
            } ${di === 0 ? 'sun' : ''} ${di === 6 ? 'sat' : ''}`}
            onClick={() => onClickDay(day)}
          >
            <span className={`day-num ${isToday ? 'today' : ''}`}>
              {day.date()}
            </span>
            <div className="day-events">
              {visible.map((p) => (
                <div
                  key={p.id}
                  className="event-chip"
                  style={{ backgroundColor: blockColor(p) }}
                  title={`${p.name}${p.site_name ? ' · ' + p.site_name : ''} (${p.start_date} ~ ${p.end_date})`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClickProject(p)
                  }}
                >
                  {chipText(p)}
                </div>
              ))}
              {hidden > 0 && <div className="event-more">+{hidden}개 더</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- 라인 아이콘 세트 (참고 디자인) ----
function CalIcon() {
  return (
    <svg className="row-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function PaletteIcon() {
  return (
    <svg className="row-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-1.2-1-1.6-1-2.6 0-.8.7-1.4 1.5-1.4H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
      <circle cx="16.5" cy="11" r="1" fill="currentColor" />
    </svg>
  )
}
function MemoIcon() {
  return (
    <svg className="row-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg className="row-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function SiteIcon() {
  return (
    <svg className="row-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 21h18M5 21V7l7-4 7 4v14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 21v-5h4v5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
// iOS 스타일 토글 스위치
function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    >
      <span className="knob" />
    </button>
  )
}

// 클릭형 달력 날짜 선택기 (input type=date 대체)
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = dayjs(value)
  const [view, setView] = useState(() => selected.startOf('month'))

  const openPicker = () => {
    setView(selected.startOf('month'))
    setOpen(true)
  }
  const pick = (day) => {
    onChange(day.format(DATE_FMT))
    setOpen(false)
  }

  const days = buildWeeks(view).flat()

  return (
    <div className="dp">
      <button type="button" className="date-pill" onClick={openPicker}>
        {selected.format('YYYY년 M월 D일 (ddd)')}
      </button>
      {open && (
        <>
          <div className="dp-backdrop" onClick={() => setOpen(false)} />
          <div className="dp-pop" onClick={(e) => e.stopPropagation()}>
            <div className="dp-head">
              <button
                type="button"
                className="dp-nav"
                onClick={() => setView(view.subtract(1, 'month'))}
                aria-label="이전 달"
              >
                ‹
              </button>
              <span className="dp-title">{view.format('YYYY년 M월')}</span>
              <button
                type="button"
                className="dp-nav"
                onClick={() => setView(view.add(1, 'month'))}
                aria-label="다음 달"
              >
                ›
              </button>
            </div>
            <div className="dp-weekdays">
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <span key={d} className={`dp-wd ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}>
                  {d}
                </span>
              ))}
            </div>
            <div className="dp-grid">
              {days.map((day, idx) => {
                const inMonth = day.month() === view.month()
                const isSel = day.isSame(selected, 'day')
                const isToday = day.isSame(dayjs(), 'day')
                const dow = day.day()
                return (
                  <button
                    type="button"
                    key={idx}
                    className={`dp-day ${inMonth ? '' : 'dp-out'} ${
                      isSel ? 'dp-sel' : ''
                    } ${isToday && !isSel ? 'dp-today' : ''} ${
                      dow === 0 ? 'sun' : ''
                    } ${dow === 6 ? 'sat' : ''}`}
                    onClick={() => pick(day)}
                  >
                    {day.date()}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const catBadge = (c) => (c === '여백디자인' ? 'YEOBEAK' : c)

// ---------------- 등록/수정 모달 (참고 디자인 풀스크린) ----------------
function ProjectModal({ form, siteMap = {}, onChange, onClose, onSave, onDelete }) {
  const set = (k, v) => onChange({ ...form, [k]: v })

  // 현장명 입력 시: 기존 현장이면 그 색상으로 자동 설정
  const setSiteName = (v) => {
    const matched = siteMap[v.trim()]
    onChange({ ...form, site_name: v, ...(matched ? { site_color: matched } : {}) })
  }

  // 카테고리 토글 (여백디자인 ↔ 개인)
  const cycleCategory = () => {
    const idx = CATEGORIES.indexOf(form.category)
    set('category', CATEGORIES[(idx + 1) % CATEGORIES.length])
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('제목을 입력하세요.')
      return
    }
    if (dayjs(form.end_date).isBefore(dayjs(form.start_date), 'day')) {
      alert('종료일은 시작일보다 빠를 수 없습니다.')
      return
    }
    onSave(form)
  }

  return (
    <div className="sheet">
      <form className="sheet-form" onSubmit={submit}>
        {/* 상단바 */}
        <div className="sheet-bar">
          <button type="button" className="sheet-x" onClick={onClose} aria-label="닫기">
            ✕
          </button>
          <button type="submit" className="sheet-save">
            저장
          </button>
        </div>

        <div className="sheet-body">
          {/* 제목 입력 */}
          <input
            className="title-input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="제목"
            autoFocus
          />

          {/* 카테고리 */}
          <div className="list-group">
            <button type="button" className="list-row tappable" onClick={cycleCategory}>
              <span className="row-ic"><CalIcon /></span>
              <span className="row-value">{form.category}</span>
              <span className="cat-badge">{catBadge(form.category)}</span>
              <span className="row-chevron">›</span>
            </button>
          </div>

          {/* 종일 / 날짜·시간 / 반복 */}
          <div className="list-group">
            <div className="list-row">
              <span className="row-ic"><ClockIcon /></span>
              <span className="row-value">종일</span>
              <Toggle on={form.all_day} onChange={(v) => set('all_day', v)} />
            </div>

            <div className="list-row date-row">
              <span className="row-label indent">시작</span>
              <div className="date-controls">
                {!form.all_day && (
                  <input
                    type="time"
                    className="time-pill"
                    value={form.start_time}
                    onChange={(e) => set('start_time', e.target.value)}
                  />
                )}
                <DatePicker
                  value={form.start_date}
                  onChange={(v) => set('start_date', v)}
                />
              </div>
            </div>

            <div className="list-row date-row">
              <span className="row-label indent">종료</span>
              <div className="date-controls">
                {!form.all_day && (
                  <input
                    type="time"
                    className="time-pill"
                    value={form.end_time}
                    onChange={(e) => set('end_time', e.target.value)}
                  />
                )}
                <DatePicker
                  value={form.end_date}
                  onChange={(v) => set('end_date', v)}
                />
              </div>
            </div>
          </div>

          {/* 현장명 + 현장색상 */}
          <div className="list-group">
            <div className="list-row">
              <span className="row-ic"><SiteIcon /></span>
              <input
                className="row-input"
                value={form.site_name}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="현장명"
                list="site-names"
              />
              <datalist id="site-names">
                {Object.keys(siteMap).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="list-row list-row-color">
              <span className="row-ic"><PaletteIcon /></span>
              <span className="row-label">현장색상</span>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`color-swatch ${form.site_color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c, color: c }}
                    onClick={() => set('site_color', c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div className="list-group">
            <div className="list-row list-row-textarea">
              <span className="row-ic"><MemoIcon /></span>
              <textarea
                className="row-textarea"
                value={form.memo}
                onChange={(e) => set('memo', e.target.value)}
                placeholder="메모"
                rows={3}
              />
            </div>
          </div>

          {/* 삭제 */}
          {form.id && (
            <div className="list-group">
              <button
                type="button"
                className="list-row row-delete"
                onClick={() => onDelete(form.id)}
              >
                일정 삭제
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
