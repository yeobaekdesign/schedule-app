import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import html2canvas from 'html2canvas'

dayjs.locale('ko')

// ---- Supabase 설정 (npm 패키지 없이 fetch로 직접 호출) ----
const SUPABASE_URL = 'https://rrselzylrpcdpqglyyji.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyc2VsenlscnBjZHBxZ2x5eWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTYzMzEsImV4cCI6MjA5NzMzMjMzMX0.9pxV2rYGvF2iRZ9OXfLxwJpS83s0ssRrVq8A771_NmY'
const TABLE = 'project'
const REST = `${SUPABASE_URL}/rest/v1/${TABLE}`
// 캘린더(분류) 테이블
const CAL_TABLE = 'calendars'
const CAL_REST = `${SUPABASE_URL}/rest/v1/${CAL_TABLE}`
// 현장(라벨) 테이블
const SITE_TABLE = 'sites'
const SITE_REST = `${SUPABASE_URL}/rest/v1/${SITE_TABLE}`

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

// 공사 블록 색상 팔레트 (iOS 시스템 컬러 12 + 보조 톤 12 = 24색)
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
  '#d70015', // deep red
  '#c93400', // deep orange
  '#b25000', // amber
  '#248a3d', // deep green
  '#0a7e8c', // deep teal
  '#0071a4', // deep cyan
  '#0040dd', // royal blue
  '#3634a3', // deep indigo
  '#8944ab', // deep purple
  '#d30f45', // rose
  '#7f6545', // dark brown
  '#48484a', // dark gray
]

const DATE_FMT = 'YYYY-MM-DD'

const DEFAULT_COLOR = COLORS[6]

// 한국 공휴일 + 대체공휴일 (2026~2030년, 설날·추석은 음력 기준 양력 환산 하드코딩)
const HOLIDAYS = {
  // 2026
  '2026-01-01': '신정',
  '2026-02-16': '설날전날',
  '2026-02-17': '설날',
  '2026-02-18': '설날다음날',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일',
  '2026-05-01': '근로자의날',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-03': '지방선거일',
  '2026-06-06': '현충일',
  '2026-07-17': '제헌절',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석전날',
  '2026-09-25': '추석',
  '2026-09-26': '추석다음날',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '크리스마스',
  // 2027
  '2027-01-01': '신정',
  '2027-02-05': '설날전날',
  '2027-02-06': '설날',
  '2027-02-07': '설날다음날',
  '2027-02-08': '대체공휴일',
  '2027-03-01': '삼일절',
  '2027-05-01': '근로자의날',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-07-17': '제헌절',
  '2027-08-15': '광복절',
  '2027-08-16': '대체공휴일',
  '2027-09-14': '추석전날',
  '2027-09-15': '추석',
  '2027-09-16': '추석다음날',
  '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일',
  '2027-10-09': '한글날',
  '2027-10-11': '대체공휴일',
  '2027-12-25': '크리스마스',
  '2027-12-27': '대체공휴일',
  // 2028
  '2028-01-01': '신정',
  '2028-01-25': '설날전날',
  '2028-01-26': '설날',
  '2028-01-27': '설날다음날',
  '2028-03-01': '삼일절',
  '2028-05-01': '근로자의날',
  '2028-05-02': '부처님오신날',
  '2028-05-05': '어린이날',
  '2028-06-06': '현충일',
  '2028-07-17': '제헌절',
  '2028-08-15': '광복절',
  '2028-10-02': '추석전날',
  '2028-10-03': '추석',
  '2028-10-04': '추석다음날',
  '2028-10-05': '대체공휴일',
  '2028-10-09': '한글날',
  '2028-12-25': '크리스마스',
  // 2029
  '2029-01-01': '신정',
  '2029-02-12': '설날전날',
  '2029-02-13': '설날',
  '2029-02-14': '설날다음날',
  '2029-03-01': '삼일절',
  '2029-05-01': '근로자의날',
  '2029-05-05': '어린이날',
  '2029-05-07': '대체공휴일',
  '2029-05-20': '부처님오신날',
  '2029-05-21': '대체공휴일',
  '2029-06-06': '현충일',
  '2029-07-17': '제헌절',
  '2029-08-15': '광복절',
  '2029-09-21': '추석전날',
  '2029-09-22': '추석',
  '2029-09-23': '추석다음날',
  '2029-09-24': '대체공휴일',
  '2029-10-03': '개천절',
  '2029-10-09': '한글날',
  '2029-12-25': '크리스마스',
  // 2030
  '2030-01-01': '신정',
  '2030-02-02': '설날전날',
  '2030-02-03': '설날',
  '2030-02-04': '설날다음날',
  '2030-02-05': '대체공휴일',
  '2030-03-01': '삼일절',
  '2030-05-01': '근로자의날',
  '2030-05-05': '어린이날',
  '2030-05-06': '대체공휴일',
  '2030-05-09': '부처님오신날',
  '2030-06-06': '현충일',
  '2030-07-17': '제헌절',
  '2030-08-15': '광복절',
  '2030-09-11': '추석전날',
  '2030-09-12': '추석',
  '2030-09-13': '추석다음날',
  '2030-10-03': '개천절',
  '2030-10-09': '한글날',
  '2030-12-25': '크리스마스',
}

// 일정의 블록 색상 = 현장색상 (없으면 기존 color, 그것도 없으면 기본)
const blockColor = (p) => p.site_color || p.color || DEFAULT_COLOR
// 일정이 속한 캘린더(분류) 이름
const categoryOf = (p) => (p.category || '').trim()
// 정렬 순서: sort_order(숫자) 우선, 없으면 시작일 → id 순
const orderRank = (p) =>
  typeof p.sort_order === 'number' ? p.sort_order : Number.MAX_SAFE_INTEGER
const byOrder = (a, b) =>
  orderRank(a) - orderRank(b) ||
  (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0) ||
  (a.id ?? 0) - (b.id ?? 0)

const emptyForm = (cal) => ({
  id: null,
  name: '',
  category: cal?.name || '',
  site_name: '',
  site_color: cal?.color || DEFAULT_COLOR,
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
  return <Calendar />
}

// ---------------- 캘린더 화면 ----------------
function Calendar() {
  const [cursor, setCursor] = useState(() => dayjs().startOf('month'))
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // form object or null
  const [detail, setDetail] = useState(null) // 상세보기로 보여줄 프로젝트 또는 null
  const [daySheet, setDaySheet] = useState(null) // 바텀시트로 보여줄 날짜(dayjs) 또는 null
  const [calendars, setCalendars] = useState([]) // Supabase calendars 테이블
  const [calTableOk, setCalTableOk] = useState(true) // calendars 테이블 사용 가능 여부
  const [selected, setSelected] = useState(() => new Set()) // 활성 캘린더(이름) 집합
  const [menuOpen, setMenuOpen] = useState(false) // 캘린더 관리 시트
  const [sites, setSites] = useState([]) // Supabase sites(현장 라벨) 테이블
  const [siteTableOk, setSiteTableOk] = useState(true) // sites 테이블 사용 가능 여부
  const [selectedSites, setSelectedSites] = useState(() => new Set()) // 활성 현장 필터(비면 전체)

  // 프로젝트 → 상세보기 (바텀시트 / 블록 클릭 공용)
  const openDetail = useCallback((p) => {
    setDaySheet(null)
    setDetail(p)
  }, [])

  const prevMonth = useCallback(() => setCursor((c) => c.subtract(1, 'month')), [])
  const nextMonth = useCallback(() => setCursor((c) => c.add(1, 'month')), [])

  // 좌우 스와이프로 이전/다음 달 이동 (모바일)
  // 가로 스와이프로 판단되면 touchmove에서 preventDefault()로 세로 스크롤(흔들림)을 막는다.
  // passive:false 로 등록해야 preventDefault()가 동작하므로 native 리스너로 직접 부착한다.
  const calendarRef = useRef(null)
  useEffect(() => {
    const el = calendarRef.current
    if (!el) return
    const start = { x: 0, y: 0 }
    let horizontal = false
    const onStart = (e) => {
      start.x = e.touches[0].clientX
      start.y = e.touches[0].clientY
      horizontal = false
    }
    const onMove = (e) => {
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      // 가로 이동이 세로보다 우세하면 가로 스와이프로 확정
      if (!horizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        horizontal = true
      }
      // 가로 스와이프 중에는 세로 스크롤 차단
      if (horizontal) e.preventDefault()
    }
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) nextMonth()
        else prevMonth()
      }
    }
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [prevMonth, nextMonth])

  // 캘린더 이미지 저장 (PNG) — 범례 + 그리드 영역을 캡처
  const captureRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const saveImage = async () => {
    const el = captureRef.current
    if (!el || saving) return
    setSaving(true)
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `캘린더_${cursor.format('YYYY-MM')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('이미지 저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // 상세보기 → 수정 모달
  const openEdit = useCallback((p) => {
    setDetail(null)
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

  // 캘린더 목록만 다시 불러오기 (추가/삭제 후)
  const reloadCalendars = useCallback(async () => {
    try {
      const res = await fetch(
        `${CAL_REST}?select=*&order=sort_order.asc,id.asc`,
        { headers }
      )
      if (!res.ok) throw new Error(await res.text())
      setCalTableOk(true)
      setCalendars(await res.json())
    } catch {
      setCalTableOk(false)
    }
  }, [])

  // 현장 라벨 목록만 다시 불러오기 (추가/삭제/색상변경 후)
  const reloadSites = useCallback(async () => {
    try {
      const res = await fetch(
        `${SITE_REST}?select=*&order=sort_order.asc,id.asc`,
        { headers }
      )
      if (!res.ok) throw new Error(await res.text())
      setSiteTableOk(true)
      setSites(await res.json())
    } catch {
      setSiteTableOk(false)
    }
  }, [])

  // 일정만 다시 불러오기 (등록/수정/삭제 후)
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${REST}?select=*&order=start_date.asc`, {
        headers,
      })
      if (!res.ok) throw new Error(await res.text())
      setProjects(await res.json())
    } catch (e) {
      setError('데이터를 불러오지 못했습니다: ' + e.message)
    }
  }, [])

  // 최초 로딩: 일정 + 캘린더를 함께 불러온다
  const init = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch(`${REST}?select=*&order=start_date.asc`, { headers }),
        fetch(`${CAL_REST}?select=*&order=sort_order.asc,id.asc`, {
          headers,
        }).catch(() => null),
        fetch(`${SITE_REST}?select=*&order=sort_order.asc,id.asc`, {
          headers,
        }).catch(() => null),
      ])
      if (!pRes.ok) throw new Error(await pRes.text())
      const projs = await pRes.json()
      setProjects(projs)

      // 일정에 실제로 쓰인 분류 이름 (없는 캘린더 시드용)
      const usedNames = [
        ...new Set(projs.map((p) => categoryOf(p)).filter(Boolean)),
      ]

      let cals = []
      if (cRes && cRes.ok) {
        setCalTableOk(true)
        cals = await cRes.json()
        // 테이블이 비어 있으면 기존 일정의 분류로 캘린더를 시드
        if (cals.length === 0 && usedNames.length) {
          cals = await seedCalendars(usedNames)
        }
      } else {
        // calendars 테이블이 없으면 일정에서 추출한 임시 캘린더로 표시
        setCalTableOk(false)
        cals = usedNames.map((name, i) => ({
          id: `pseudo-${i}`,
          name,
          color: COLORS[i % COLORS.length],
        }))
      }
      setCalendars(cals)

      // 현장 라벨: 기존 일정의 (현장명, 현장색상)으로 시드
      const usedSites = []
      const seenSite = new Set()
      for (const p of projs) {
        const nm = (p.site_name || '').trim()
        if (nm && !seenSite.has(nm)) {
          seenSite.add(nm)
          usedSites.push({ name: nm, color: p.site_color || DEFAULT_COLOR })
        }
      }
      let siteRows = []
      if (sRes && sRes.ok) {
        setSiteTableOk(true)
        siteRows = await sRes.json()
        if (siteRows.length === 0 && usedSites.length) {
          siteRows = await seedSites(usedSites)
        }
      } else {
        setSiteTableOk(false)
        siteRows = usedSites.map((s, i) => ({ id: `pseudo-${i}`, ...s }))
      }
      setSites(siteRows)
    } catch (e) {
      setError('데이터를 불러오지 못했습니다: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 기본 캘린더 시드 (서버 저장; 실패 시 로컬 임시값)
  const seedCalendars = async (names) => {
    const rows = names.map((name, i) => ({
      name,
      color: COLORS[i % COLORS.length],
      sort_order: i,
    }))
    try {
      const res = await fetch(CAL_REST, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(rows),
      })
      if (!res.ok) throw new Error(await res.text())
      return await res.json()
    } catch {
      return rows.map((r, i) => ({ id: `seed-${i}`, ...r }))
    }
  }

  // 현장 라벨 시드 (서버 저장; 실패 시 로컬 임시값)
  const seedSites = async (list) => {
    const rows = list.map((s, i) => ({
      name: s.name,
      color: s.color,
      sort_order: i,
    }))
    try {
      const res = await fetch(SITE_REST, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(rows),
      })
      if (!res.ok) throw new Error(await res.text())
      return await res.json()
    } catch {
      return rows.map((r, i) => ({ id: `seed-${i}`, ...r }))
    }
  }

  // 현장 라벨 추가
  const addSite = async ({ name, color }) => {
    const nm = (name || '').trim()
    if (!nm) return
    if (sites.some((s) => s.name === nm)) {
      alert('같은 이름의 현장이 이미 있습니다.')
      return
    }
    if (!siteTableOk) {
      alert(
        'Supabase에 sites 테이블이 없어 추가할 수 없습니다.\n(columns: name text, color text, sort_order int8)'
      )
      return
    }
    try {
      const res = await fetch(SITE_REST, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ name: nm, color, sort_order: sites.length }),
      })
      if (!res.ok) throw new Error(await res.text())
      await reloadSites()
    } catch (e) {
      alert('현장 추가 실패: ' + e.message)
    }
  }

  // 현장 라벨 삭제 (해당 현장의 일정은 유지)
  const removeSite = async (site) => {
    if (
      !confirm(
        `'${site.name}' 현장을 삭제하시겠습니까?\n(이 현장의 일정 자체는 삭제되지 않습니다)`
      )
    )
      return
    if (!siteTableOk) {
      alert('Supabase에 sites 테이블이 없어 삭제할 수 없습니다.')
      return
    }
    try {
      const res = await fetch(`${SITE_REST}?id=eq.${site.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error(await res.text())
      await reloadSites()
    } catch (e) {
      alert('현장 삭제 실패: ' + e.message)
    }
  }

  // 현장 라벨 수정 (이름/색상) — patch = { name?, color? }
  // sites 테이블 수정 + 같은 site_name을 가진 모든 일정(project)을 일괄 업데이트
  const updateSite = async (site, patch) => {
    if (!siteTableOk) {
      alert('Supabase에 sites 테이블이 없어 수정할 수 없습니다.')
      return
    }
    const next = { ...patch }
    if (next.name != null) {
      next.name = next.name.trim()
      if (!next.name) {
        alert('현장 이름을 입력하세요.')
        return
      }
      if (sites.some((s) => s.id !== site.id && s.name === next.name)) {
        alert('같은 이름의 현장이 이미 있습니다.')
        return
      }
    }

    const oldName = site.name // 일정 필터에 쓸 "수정 전" 이름
    const resolvedName = next.name != null ? next.name : site.name
    const resolvedColor = next.color != null ? next.color : site.color
    // 일정에는 이름/색상 모두 최종값으로 반영 (변경 감지에 의존하지 않음)
    const projectPatch = { site_name: resolvedName, site_color: resolvedColor }

    // 낙관적 반영 (sites + 같은 site_name을 가진 일정)
    setSites((prev) =>
      prev.map((s) => (s.id === site.id ? { ...s, ...next } : s))
    )
    setProjects((prev) =>
      prev.map((p) =>
        (p.site_name || '').trim() === oldName ? { ...p, ...projectPatch } : p
      )
    )

    try {
      // 1) sites 테이블 라벨 수정
      const res = await fetch(`${SITE_REST}?id=eq.${site.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error(await res.text())

      // 2) 같은 site_name을 가진 모든 일정 일괄 PATCH
      //    PostgREST eq 값은 큰따옴표로 감싸면 따옴표까지 리터럴로 매칭되어 0건이 됨.
      //    공백/한글은 encodeURIComponent로 인코딩만 하면 정확히 매칭된다.
      if (oldName) {
        const filter = `site_name=eq.${encodeURIComponent(oldName)}`
        const pRes = await fetch(`${REST}?${filter}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify(projectPatch),
        })
        if (!pRes.ok) throw new Error(await pRes.text())
        // 실제 반영된 행 확인 (필터/권한 문제 조기 발견)
        const updated = await pRes.json()
        console.log(
          `[updateSite] '${oldName}' → 일정 ${updated.length}건 업데이트`
        )
      }

      // 서버 기준으로 재동기화 (DB 실제 반영 결과를 화면에 반영)
      await load()
    } catch (e) {
      alert('현장 수정 실패: ' + e.message)
      await reloadSites()
      await load()
    }
  }

  // 현장 라벨 순서 변경 → sort_order 0..N-1 재부여 후 저장
  // (상단 범례가 sites 순서를 따르므로 즉시 반영됨)
  const reorderSites = async (orderedSites) => {
    if (!orderedSites || orderedSites.length < 2) return
    if (!siteTableOk) {
      alert('Supabase에 sites 테이블이 없어 순서를 저장할 수 없습니다.')
      return
    }
    // 낙관적 반영
    setSites(orderedSites.map((s, i) => ({ ...s, sort_order: i })))
    // 값이 바뀐 항목만 저장
    const changed = orderedSites.filter((s, i) => s.sort_order !== i)
    try {
      const results = await Promise.all(
        changed.map((s) =>
          fetch(`${SITE_REST}?id=eq.${s.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              sort_order: orderedSites.findIndex((x) => x.id === s.id),
            }),
          })
        )
      )
      if (results.some((r) => !r.ok)) throw new Error('순서 저장 실패')
    } catch (e) {
      alert('현장 순서 저장 실패: ' + e.message)
      await reloadSites()
    }
  }

  useEffect(() => {
    init()
  }, [init])

  // 캘린더 목록이 바뀌면 선택 상태를 정리 (없어진 것 제거, 비면 전체 선택)
  useEffect(() => {
    setSelected((prev) => {
      const names = calendars.map((c) => c.name)
      const kept = new Set([...prev].filter((n) => names.includes(n)))
      return kept.size ? kept : new Set(names)
    })
  }, [calendars])

  // 캘린더 추가
  const addCalendar = async ({ name, color }) => {
    const nm = (name || '').trim()
    if (!nm) return
    if (calendars.some((c) => c.name === nm)) {
      alert('같은 이름의 캘린더가 이미 있습니다.')
      return
    }
    if (!calTableOk) {
      alert(
        'Supabase에 calendars 테이블이 없어 추가할 수 없습니다.\n(columns: name text, color text, sort_order int8)'
      )
      return
    }
    try {
      const res = await fetch(CAL_REST, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ name: nm, color, sort_order: calendars.length }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSelected((prev) => new Set([...prev, nm]))
      await reloadCalendars()
    } catch (e) {
      alert('캘린더 추가 실패: ' + e.message)
    }
  }

  // 캘린더 삭제 (해당 캘린더의 일정은 유지)
  const removeCalendar = async (cal) => {
    if (
      !confirm(
        `'${cal.name}' 캘린더를 삭제하시겠습니까?\n(이 캘린더의 일정 자체는 삭제되지 않습니다)`
      )
    )
      return
    if (!calTableOk) {
      alert('Supabase에 calendars 테이블이 없어 삭제할 수 없습니다.')
      return
    }
    try {
      const res = await fetch(`${CAL_REST}?id=eq.${cal.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error(await res.text())
      await reloadCalendars()
    } catch (e) {
      alert('캘린더 삭제 실패: ' + e.message)
    }
  }

  // 캘린더 수정 (이름/색상) — patch = { name?, color? }
  // calendars 테이블 수정 + 같은 category를 가진 모든 일정(project)을 일괄 업데이트
  const updateCalendar = async (cal, patch) => {
    if (!calTableOk) {
      alert('Supabase에 calendars 테이블이 없어 수정할 수 없습니다.')
      return
    }
    const next = { ...patch }
    if (next.name != null) {
      next.name = next.name.trim()
      if (!next.name) {
        alert('캘린더 이름을 입력하세요.')
        return
      }
      if (calendars.some((c) => c.id !== cal.id && c.name === next.name)) {
        alert('같은 이름의 캘린더가 이미 있습니다.')
        return
      }
    }

    const oldName = cal.name // 일정 필터(category)에 쓸 "수정 전" 이름
    const resolvedName = next.name != null ? next.name : cal.name
    const nameChanged = resolvedName !== oldName

    // 낙관적 반영 (calendars + 같은 category를 가진 일정)
    setCalendars((prev) =>
      prev.map((c) => (c.id === cal.id ? { ...c, ...next } : c))
    )
    if (nameChanged) {
      setProjects((prev) =>
        prev.map((p) =>
          (p.category || '').trim() === oldName
            ? { ...p, category: resolvedName }
            : p
        )
      )
      // 선택 집합에서 이전 이름을 새 이름으로 교체
      setSelected((prev) => {
        if (!prev.has(oldName)) return prev
        const n = new Set(prev)
        n.delete(oldName)
        n.add(resolvedName)
        return n
      })
    }

    try {
      // 1) calendars 테이블 수정
      const res = await fetch(`${CAL_REST}?id=eq.${cal.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error(await res.text())

      // 2) 이름이 바뀌었으면 같은 category를 가진 모든 일정 일괄 PATCH
      if (nameChanged && oldName) {
        const filter = `category=eq.${encodeURIComponent(oldName)}`
        const pRes = await fetch(`${REST}?${filter}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({ category: resolvedName }),
        })
        if (!pRes.ok) throw new Error(await pRes.text())
        const updated = await pRes.json()
        console.log(
          `[updateCalendar] '${oldName}' → 일정 ${updated.length}건 업데이트`
        )
      }

      await load()
    } catch (e) {
      alert('캘린더 수정 실패: ' + e.message)
      await reloadCalendars()
      await load()
    }
  }

  // 캘린더 토글 (탭 다중 선택)
  const toggleCalendar = (name) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

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
      setDetail(null)
      await load()
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  // 일정 순서(드래그) 변경 → 전체 sort_order를 0..N-1로 재정규화 후 저장
  // 캘린더 막대 / 바텀시트 모두 byOrder(sort_order) 정렬을 따르므로
  // 전체 projects 상태를 갱신하면 캘린더 순서도 즉시 반영된다.
  const reorder = async (orderedDayItems) => {
    if (!orderedDayItems || orderedDayItems.length < 2) return
    const daySet = new Set(orderedDayItems.map((p) => String(p.id)))
    // 현재 전체 표시 순서에서, 이 날짜 항목들 자리에 새 순서를 끼워넣는다
    let di = 0
    const newOrder = [...projects]
      .sort(byOrder)
      .map((p) => (daySet.has(String(p.id)) ? orderedDayItems[di++] : p))
    // 0..N-1 연속 sort_order 부여
    const rank = new Map(newOrder.map((p, i) => [String(p.id), i]))
    // 실제로 값이 바뀐 항목만 서버에 저장
    const changed = projects.filter(
      (p) => p.sort_order !== rank.get(String(p.id))
    )
    if (changed.length === 0) return
    // 낙관적 전체 상태 업데이트 (캘린더 즉시 반영)
    setProjects((prev) =>
      prev.map((p) => ({ ...p, sort_order: rank.get(String(p.id)) }))
    )
    // 서버 저장 (sort_order 컬럼이 없으면 실패 → 로컬 상태 유지)
    try {
      const results = await Promise.all(
        changed.map((p) =>
          fetch(`${REST}?id=eq.${p.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sort_order: rank.get(String(p.id)) }),
          })
        )
      )
      if (results.some((r) => !r.ok)) throw new Error('sort_order 저장 실패')
    } catch {
      /* sort_order 컬럼이 없거나 저장 실패: 로컬 순서만 유지 */
    }
  }

  // 달력 그리드 (일요일 시작)
  const weeks = useMemo(() => buildWeeks(cursor), [cursor])
  // 활성 캘린더 집합 (아무것도 선택 안 하면 전체 표시)
  const activeNames = useMemo(() => {
    if (selected.size) return selected
    return new Set(calendars.map((c) => c.name))
  }, [selected, calendars])
  // 새 일정 등록 시 기본 캘린더 (선택된 것 중 첫 번째, 없으면 첫 캘린더)
  const defaultCal = useMemo(
    () =>
      calendars.find((c) => activeNames.has(c.name)) || calendars[0] || null,
    [calendars, activeNames]
  )
  // 선택된 캘린더들로 필터링 + 정렬 순서 적용 (여러 캘린더 합쳐서 표시)
  const visibleProjects = useMemo(
    () =>
      projects
        .filter((p) => activeNames.has(categoryOf(p)))
        .filter(
          (p) =>
            selectedSites.size === 0 ||
            selectedSites.has((p.site_name || '').trim())
        )
        .sort(byOrder),
    [projects, activeNames, selectedSites]
  )
  // 반복 규칙을 반영한 날짜별 일정 맵 (보이는 6주 범위)
  const eventsByDate = useMemo(() => {
    const gridStart = weeks[0][0]
    const gridEnd = weeks[weeks.length - 1][6]
    return buildEventsByDate(visibleProjects, gridStart, gridEnd)
  }, [visibleProjects, weeks])
  // 범례: 관리 중인 현장 라벨(sites)을 순서 그대로 표시
  // → 라벨 추가/삭제/순서변경/색상변경이 캘린더 상단에 즉시 반영됨
  const legend = useMemo(
    () => sites.map((s) => ({ name: s.name, color: s.color || DEFAULT_COLOR })),
    [sites]
  )
  // 현장 필터 토글 (다중 선택; 비어 있으면 전체 표시)
  const toggleSite = (name) => {
    const turningOn = !selectedSites.has(name)
    setSelectedSites((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    // 라벨을 켤 때, 해당 현장의 가장 이른 일정이 있는 달로 이동
    if (turningOn) {
      const ps = projects.filter((p) => (p.site_name || '').trim() === name)
      if (ps.length) {
        const earliest = ps.reduce((a, b) =>
          a.start_date <= b.start_date ? a : b
        )
        setCursor(dayjs(earliest.start_date).startOf('month'))
      }
    }
  }
  // 삭제된 현장이 필터에 남지 않도록 정리
  useEffect(() => {
    setSelectedSites((prev) => {
      if (prev.size === 0) return prev
      const names = new Set(sites.map((s) => s.name))
      const kept = new Set([...prev].filter((n) => names.has(n)))
      return kept.size === prev.size ? prev : kept
    })
  }, [sites])

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="month-title">
          {cursor.format('YYYY년 M월')}
          <span className="caret">⌄</span>
        </h1>
        <div className="topbar-icons">
          <button
            className="icon-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="캘린더 관리"
          >
            ☰
          </button>
          <button
            className="icon-btn"
            onClick={saveImage}
            disabled={saving}
            aria-label="이미지 저장"
          >
            <DownloadIcon />
          </button>
          <button className="icon-btn" onClick={prevMonth} aria-label="이전 달">
            ‹
          </button>
          <button className="icon-btn today-dot" onClick={() => setCursor(dayjs().startOf('month'))} aria-label="오늘">
            오늘
          </button>
          <button className="icon-btn" onClick={nextMonth} aria-label="다음 달">
            ›
          </button>
        </div>
      </header>

      <div className="tabs">
        {calendars.length === 0 ? (
          <span className="tabs-empty">
            ☰ 버튼에서 캘린더를 추가하세요
          </span>
        ) : (
          calendars.map((c) => {
            const on = selected.has(c.name)
            return (
              <button
                key={c.id ?? c.name}
                className={`tab ${on ? 'active' : ''}`}
                onClick={() => toggleCalendar(c.name)}
              >
                <span
                  className="tab-dot"
                  style={{ backgroundColor: c.color || DEFAULT_COLOR }}
                />
                {on && <span className="tab-check">✓</span>}
                {c.name}
              </button>
            )
          })
        )}
      </div>

      {error && <div className="banner-error">{error}</div>}
      {loading && <div className="banner">불러오는 중…</div>}

      <div className="capture-area" ref={captureRef}>
        {legend.length > 0 && (
          <div className="legend">
            <button
              type="button"
              className={`legend-item ${selectedSites.size === 0 ? 'active' : ''}`}
              onClick={() => setSelectedSites(new Set())}
              data-html2canvas-ignore="true"
            >
              전체
            </button>
            {legend.map((s) => {
              const on = selectedSites.has(s.name)
              return (
                <button
                  type="button"
                  className={`legend-item ${on ? 'active' : ''}`}
                  key={s.name}
                  onClick={() => toggleSite(s.name)}
                >
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </button>
              )
            })}
          </div>
        )}

        <div className="calendar" ref={calendarRef}>
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
            projects={visibleProjects}
            month={cursor}
            onClickDay={(day) => setDaySheet(day)}
          />
        ))}

        {/* 달력 좌우 가장자리 중앙(약 9~15일 줄)의 흐린 화살표 — 이전/다음 달
            (data-html2canvas-ignore: 이미지 저장 시 제외) */}
        <button
          className="edge-arrow left"
          onClick={prevMonth}
          aria-label="이전 달"
          data-html2canvas-ignore="true"
        >
          ←
        </button>
        <button
          className="edge-arrow right"
          onClick={nextMonth}
          aria-label="다음 달"
          data-html2canvas-ignore="true"
        >
          →
        </button>
        </div>
      </div>

      <button
        className="fab"
        onClick={() => setModal(emptyForm(defaultCal))}
        aria-label="공사 등록"
      >
        +
      </button>

      {daySheet && (
        <DayListSheet
          day={daySheet}
          projects={eventsByDate[daySheet.format(DATE_FMT)] || []}
          onClickProject={openDetail}
          onReorder={reorder}
          onAddNew={() => {
            setDaySheet(null)
            setModal({
              ...emptyForm(defaultCal),
              start_date: daySheet.format(DATE_FMT),
              end_date: daySheet.format(DATE_FMT),
            })
          }}
          onClose={() => setDaySheet(null)}
        />
      )}

      {detail && (
        <DetailView
          project={detail}
          onEdit={() => openEdit(detail)}
          onDelete={() => remove(detail.id)}
          onClose={() => setDetail(null)}
        />
      )}

      {modal && (
        <ProjectModal
          form={modal}
          calendars={calendars}
          sites={sites}
          siteTableOk={siteTableOk}
          onAddSite={addSite}
          onRemoveSite={removeSite}
          onUpdateSite={updateSite}
          onReorderSite={reorderSites}
          onChange={setModal}
          onClose={() => setModal(null)}
          onSave={save}
          onDelete={remove}
        />
      )}

      {menuOpen && (
        <CalendarManager
          calendars={calendars}
          calTableOk={calTableOk}
          onAdd={addCalendar}
          onRemove={removeCalendar}
          onUpdate={updateCalendar}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}

// ---------------- 캘린더 관리 시트 (☰) ----------------
function CalendarManager({
  calendars,
  calTableOk,
  onAdd,
  onRemove,
  onUpdate,
  onClose,
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [editId, setEditId] = useState(null) // 수정 중인 캘린더 id
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(COLORS[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name, color })
    setName('')
  }

  const startEdit = (c) => {
    setEditId(c.id)
    setEditName(c.name)
    setEditColor(c.color || DEFAULT_COLOR)
  }
  const saveEdit = (c) => {
    if (!editName.trim()) {
      alert('캘린더 이름을 입력하세요.')
      return
    }
    onUpdate(c, { name: editName, color: editColor })
    setEditId(null)
  }

  return (
    <div className="bs-backdrop" onClick={onClose}>
      <div className="bs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bs-handle" />
        <div className="bs-head">
          <span className="bs-date">캘린더 관리</span>
          <button type="button" className="bs-add" onClick={onClose}>
            완료
          </button>
        </div>

        {!calTableOk && (
          <div className="banner-error" style={{ marginBottom: 10 }}>
            Supabase에 calendars 테이블이 없습니다. (name text, color text,
            sort_order int8)
          </div>
        )}

        <div className="bs-list">
          {calendars.length === 0 ? (
            <div className="bs-empty">캘린더가 없습니다.</div>
          ) : (
            calendars.map((c) => (
              <div key={c.id ?? c.name} className="site-manage-item">
                {editId === c.id ? (
                  <div className="site-edit">
                    <div className="site-edit-fields">
                      <input
                        className="row-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="캘린더 이름"
                        autoFocus
                      />
                      <div className="color-picker">
                        {COLORS.map((cc) => (
                          <button
                            type="button"
                            key={cc}
                            className={`color-swatch ${
                              editColor === cc ? 'selected' : ''
                            }`}
                            style={{ backgroundColor: cc, color: cc }}
                            onClick={() => setEditColor(cc)}
                            aria-label={cc}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="site-edit-actions">
                      <button
                        type="button"
                        className="site-edit-cancel"
                        onClick={() => setEditId(null)}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="site-edit-save"
                        onClick={() => saveEdit(c)}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="site-manage-row">
                    <span
                      className="site-color-btn"
                      style={{ backgroundColor: c.color || DEFAULT_COLOR }}
                    />
                    <span className="site-manage-name">{c.name}</span>
                    <button
                      type="button"
                      className="site-edit-btn"
                      onClick={() => startEdit(c)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="cal-del"
                      onClick={() => onRemove(c)}
                      aria-label="캘린더 삭제"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {editId === null && (
        <form className="cal-add" onSubmit={submit}>
          <input
            className="row-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="새 캘린더 이름"
          />
          <div className="color-picker">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ backgroundColor: c, color: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
          <button type="submit" className="bs-add cal-add-btn">
            + 캘린더 추가
          </button>
        </form>
        )}
      </div>
    </div>
  )
}

// ---------------- 일정 상세보기 ----------------
function DetailView({ project: p, onEdit, onDelete, onClose }) {
  const dateText =
    p.start_date === p.end_date
      ? dayjs(p.start_date).format('YYYY년 M월 D일 (ddd)')
      : `${dayjs(p.start_date).format('YYYY. M. D (ddd)')} ~ ${dayjs(
          p.end_date
        ).format('YYYY. M. D (ddd)')}`
  const timeText = p.all_day
    ? '종일'
    : `${(p.start_time || '').slice(0, 5)}${
        p.end_time ? ' - ' + p.end_time.slice(0, 5) : ''
      }`

  return (
    <div className="sheet">
      <div className="sheet-form">
        <div className="sheet-bar">
          <button type="button" className="sheet-x" onClick={onClose} aria-label="닫기">
            ✕
          </button>
          <button type="button" className="sheet-save" onClick={onEdit}>
            수정
          </button>
        </div>

        <div className="sheet-body">
          <div className="dv-title-row">
            <span
              className="dv-color"
              style={{ backgroundColor: blockColor(p) }}
            />
            <h2 className="dv-title">{p.name}</h2>
          </div>

          <div className="list-group">
            <div className="list-row">
              <span className="row-ic"><CalIcon /></span>
              <span className="row-value">{categoryOf(p) || '미분류'}</span>
            </div>
            <div className="list-row">
              <span className="row-ic"><ClockIcon /></span>
              <span className="dv-stack">
                <span className="dv-line">{dateText}</span>
                <span className="dv-sub">{timeText}</span>
              </span>
            </div>
          </div>

          {p.site_name && (
            <div className="list-group">
              <div className="list-row">
                <span className="row-ic"><SiteIcon /></span>
                <span className="row-value">{p.site_name}</span>
              </div>
            </div>
          )}

          {p.memo && (
            <div className="list-group">
              <div className="list-row list-row-textarea">
                <span className="row-ic"><MemoIcon /></span>
                <p className="dv-memo">{p.memo}</p>
              </div>
            </div>
          )}

          <div className="list-group">
            <button
              type="button"
              className="list-row row-delete"
              onClick={onDelete}
            >
              일정 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------- 날짜별 일정 바텀시트 (↑↓ 버튼으로 순서 변경) ----------------
function DayListSheet({ day, projects, onClickProject, onReorder, onAddNew, onClose }) {
  // 순서 변경이 즉시 반영되는 로컬 순서
  const [items, setItems] = useState(projects)
  useEffect(() => setItems(projects), [projects])

  // idx 항목을 위/아래로 한 칸 이동
  const move = (e, idx, dir) => {
    e.stopPropagation()
    const j = dir === 'up' ? idx - 1 : idx + 1
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setItems(next)
    onReorder(next) // 캘린더 즉시 반영 + sort_order 저장
  }

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
          {items.length === 0 ? (
            <div className="bs-empty">등록된 일정이 없습니다.</div>
          ) : (
            items.map((p, idx) => (
              <div key={p.id} className="bs-item">
                <span className="bs-arrows">
                  <button
                    type="button"
                    className="bs-arrow"
                    onClick={(e) => move(e, idx, 'up')}
                    disabled={idx === 0}
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="bs-arrow"
                    onClick={(e) => move(e, idx, 'down')}
                    disabled={idx === items.length - 1}
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                </span>
                <button
                  type="button"
                  className="bs-item-main"
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
              </div>
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

// ---------------- 주 단위 행 (여러 날 일정은 가로 막대로 이어서 표시) ----------------
const MAX_LANES = 3 // 한 주에 보여줄 최대 막대 줄 수 (초과분은 +N)
const BAR_TOP0 = 22 // 첫 막대의 위쪽 위치(px) — 날짜 숫자 영역 아래
const LANE_H = 16 // 막대 한 줄 높이(px, 간격 포함)
const barTop = (lane) => BAR_TOP0 + lane * LANE_H

// 한 주(week: 7일) 안에서 각 일정을 막대 세그먼트로 변환 + 겹치지 않게 lane 배치
function weekSegments(week, projects) {
  const weekStart = week[0]
  const weekEnd = week[6]
  const segs = []
  for (const p of projects) {
    const s = dayjs(p.start_date)
    const e = dayjs(p.end_date)
    if (e.isBefore(weekStart, 'day') || s.isAfter(weekEnd, 'day')) continue
    const realStart = !s.isBefore(weekStart, 'day') // 이번 주에 시작
    const realEnd = !e.isAfter(weekEnd, 'day') // 이번 주에 종료
    const startCol = realStart ? Math.round(s.diff(weekStart, 'day')) : 0
    const endCol = realEnd ? Math.round(e.diff(weekStart, 'day')) : 6
    segs.push({ p, startCol, endCol, realStart, realEnd })
  }
  // lane 배치 (정렬 순서대로 그리디) — 같은 lane 안에서 열 범위가 겹치지 않도록
  for (const seg of segs) {
    let lane = 0
    while (
      segs.some(
        (o) =>
          o !== seg &&
          o.lane === lane &&
          !(o.endCol < seg.startCol || o.startCol > seg.endCol)
      )
    )
      lane++
    seg.lane = lane
  }
  return segs
}

function WeekRow({ week, projects, month, onClickDay }) {
  const today = dayjs()
  const segs = weekSegments(week, projects)
  const visibleSegs = segs.filter((s) => s.lane < MAX_LANES)
  const hiddenSegs = segs.filter((s) => s.lane >= MAX_LANES)
  // 열별 숨김 개수 (+N)
  const hiddenByCol = Array(7).fill(0)
  for (const s of hiddenSegs)
    for (let c = s.startCol; c <= s.endCol; c++) hiddenByCol[c]++

  return (
    <div className="week-row">
      {week.map((day, di) => {
        const dayKey = day.format(DATE_FMT)
        const inMonth = day.month() === month.month()
        const isToday = day.isSame(today, 'day')
        const holiday = HOLIDAYS[dayKey]
        return (
          <div
            key={di}
            className={`day-cell ${inMonth ? '' : 'out-month'} ${
              isToday ? 'today' : ''
            } ${di === 0 ? 'sun' : ''} ${di === 6 ? 'sat' : ''} ${
              holiday ? 'holiday' : ''
            }`}
            onClick={() => onClickDay(day)}
          >
            <span className={`day-num ${isToday ? 'today' : ''}`}>
              {day.date()}
            </span>
            {holiday && <span className="holiday-name">{holiday}</span>}
            {hiddenByCol[di] > 0 && (
              <span
                className="event-more-tri"
                onClick={(e) => {
                  e.stopPropagation()
                  onClickDay(day)
                }}
                aria-label={`일정 ${hiddenByCol[di]}개 더 있음`}
                title={`+${hiddenByCol[di]}`}
              />
            )}
          </div>
        )
      })}

      {/* 가로 막대 오버레이 (날짜 셀 위) */}
      <div className="week-bars">
        {visibleSegs.map((seg) => {
          const span = seg.endCol - seg.startCol + 1
          // 첫날(이번 주 시작 칸)에만 텍스트 표시
          const showText = seg.realStart || seg.startCol === 0
          return (
            <button
              type="button"
              key={seg.p.id}
              className={`event-bar ${seg.realStart ? '' : 'cont-left'} ${
                seg.realEnd ? '' : 'cont-right'
              }`}
              style={{
                top: barTop(seg.lane),
                left: `${(seg.startCol / 7) * 100}%`,
                width: `${(span / 7) * 100}%`,
                backgroundColor: blockColor(seg.p),
              }}
              title={`${seg.p.name}${
                seg.p.site_name ? ' · ' + seg.p.site_name : ''
              } (${seg.p.start_date} ~ ${seg.p.end_date})`}
              onClick={(e) => {
                e.stopPropagation()
                onClickDay(week[seg.startCol])
              }}
            >
              {showText && (
                <span className="event-bar-text">{chipText(seg.p)}</span>
              )}
            </button>
          )
        })}
      </div>
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
// 이미지 저장(다운로드) 아이콘
function DownloadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v11m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
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

// ---------------- 등록/수정 모달 (참고 디자인 풀스크린) ----------------
function ProjectModal({
  form,
  calendars = [],
  sites = [],
  siteTableOk = true,
  onAddSite,
  onRemoveSite,
  onUpdateSite,
  onReorderSite,
  onChange,
  onClose,
  onSave,
  onDelete,
}) {
  const set = (k, v) => onChange({ ...form, [k]: v })
  const [sitePicker, setSitePicker] = useState(false) // 현장 선택 바텀시트
  const [siteManager, setSiteManager] = useState(false) // 현장 라벨 관리 바텀시트
  const [calPicker, setCalPicker] = useState(false) // 캘린더 선택 바텀시트

  // 현장 선택 (라디오) — 이름 + 색상을 일정에 복사
  const selectSite = (site) => {
    if (site) onChange({ ...form, site_name: site.name, site_color: site.color })
    else onChange({ ...form, site_name: '', site_color: DEFAULT_COLOR })
    setSitePicker(false)
  }

  // 캘린더(분류) 선택 — 현장이 아직 없으면 캘린더 색을 기본 색으로 사용
  const selectCalendar = (cal) => {
    const hasSite = !!form.site_name
    onChange({
      ...form,
      category: cal.name,
      ...(hasSite ? {} : { site_color: cal.color || form.site_color }),
    })
    setCalPicker(false)
  }

  // 현재 캘린더 색상 (행에 점으로 표시)
  const curCalColor =
    calendars.find((c) => c.name === form.category)?.color || null

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

          {/* 캘린더(분류) 선택 */}
          <div className="list-group">
            <button
              type="button"
              className="list-row tappable"
              onClick={() => setCalPicker(true)}
            >
              <span className="row-ic"><CalIcon /></span>
              {form.category ? (
                <span className="row-value site-value">
                  {curCalColor && (
                    <span
                      className="site-dot"
                      style={{ backgroundColor: curCalColor }}
                    />
                  )}
                  {form.category}
                </span>
              ) : (
                <span className="row-value row-placeholder">캘린더 선택</span>
              )}
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

          {/* 현장 선택 (등록된 현장 목록에서 선택) */}
          <div className="list-group">
            <button
              type="button"
              className="list-row tappable"
              onClick={() => setSitePicker(true)}
            >
              <span className="row-ic"><SiteIcon /></span>
              {form.site_name ? (
                <span className="row-value site-value">
                  <span
                    className="site-dot"
                    style={{ backgroundColor: form.site_color }}
                  />
                  {form.site_name}
                </span>
              ) : (
                <span className="row-value row-placeholder">현장 선택</span>
              )}
              <span className="row-chevron">›</span>
            </button>
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

      {calPicker && (
        <CalendarPicker
          calendars={calendars}
          value={form.category}
          onSelect={selectCalendar}
          onClose={() => setCalPicker(false)}
        />
      )}

      {sitePicker && (
        <SitePicker
          sites={sites}
          value={form.site_name}
          onSelect={selectSite}
          onManage={() => {
            setSitePicker(false)
            setSiteManager(true)
          }}
          onClose={() => setSitePicker(false)}
        />
      )}

      {siteManager && (
        <SiteManager
          sites={sites}
          siteTableOk={siteTableOk}
          onAdd={onAddSite}
          onRemove={onRemoveSite}
          onUpdate={onUpdateSite}
          onReorder={onReorderSite}
          onClose={() => setSiteManager(false)}
        />
      )}
    </div>
  )
}

// ---------------- 캘린더 선택 바텀시트 (라디오) ----------------
function CalendarPicker({ calendars, value, onSelect, onClose }) {
  return (
    <div className="bs-backdrop over-modal" onClick={onClose}>
      <div className="bs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bs-handle" />
        <div className="bs-head">
          <span className="bs-date">캘린더 선택</span>
          <button type="button" className="bs-add" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="bs-list">
          {calendars.length === 0 ? (
            <div className="bs-empty">
              등록된 캘린더가 없습니다.
              <br />
              상단 ☰ 에서 캘린더를 추가하세요.
            </div>
          ) : (
            calendars.map((c) => {
              const on = value === c.name
              return (
                <button
                  type="button"
                  key={c.id ?? c.name}
                  className="radio-row"
                  onClick={() => onSelect(c)}
                >
                  <span className="radio-mark">{on ? '◉' : '◯'}</span>
                  <span
                    className="site-dot"
                    style={{ backgroundColor: c.color || DEFAULT_COLOR }}
                  />
                  <span className="radio-label">{c.name}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------- 현장 선택 바텀시트 (라디오) ----------------
function SitePicker({ sites, value, onSelect, onManage, onClose }) {
  return (
    <div className="bs-backdrop over-modal" onClick={onClose}>
      <div className="bs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bs-handle" />
        <div className="bs-head">
          <span className="bs-date">현장 선택</span>
          <button type="button" className="bs-add" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="bs-list">
          {/* 없음 */}
          <button
            type="button"
            className="radio-row"
            onClick={() => onSelect(null)}
          >
            <span className="radio-mark">{!value ? '◉' : '◯'}</span>
            <span className="radio-label muted">현장 없음</span>
          </button>
          {sites.length === 0 ? (
            <div className="bs-empty">
              등록된 현장이 없습니다.
              <br />
              아래 ‘현장 라벨 관리’에서 추가하세요.
            </div>
          ) : (
            sites.map((s) => {
              const on = value === s.name
              return (
                <button
                  type="button"
                  key={s.id ?? s.name}
                  className="radio-row"
                  onClick={() => onSelect(s)}
                >
                  <span className="radio-mark">{on ? '◉' : '◯'}</span>
                  <span
                    className="site-dot"
                    style={{ backgroundColor: s.color || DEFAULT_COLOR }}
                  />
                  <span className="radio-label">{s.name}</span>
                </button>
              )
            })
          )}
        </div>
        <button type="button" className="manage-btn" onClick={onManage}>
          현장 라벨 관리
        </button>
      </div>
    </div>
  )
}

// ---------------- 현장 라벨 관리 바텀시트 (추가/삭제/색상변경) ----------------
function SiteManager({
  sites,
  siteTableOk,
  onAdd,
  onRemove,
  onUpdate,
  onReorder,
  onClose,
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [editId, setEditId] = useState(null) // 수정 중인 현장 id
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(COLORS[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name, color })
    setName('')
  }

  // idx 현장을 위/아래로 한 칸 이동 (순서는 상단 범례에도 반영)
  const move = (idx, dir) => {
    const j = dir === 'up' ? idx - 1 : idx + 1
    if (j < 0 || j >= sites.length) return
    const next = [...sites]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onReorder(next)
  }

  const startEdit = (s) => {
    setEditId(s.id)
    setEditName(s.name)
    setEditColor(s.color || DEFAULT_COLOR)
  }
  const saveEdit = (s) => {
    if (!editName.trim()) {
      alert('현장 이름을 입력하세요.')
      return
    }
    onUpdate(s, { name: editName, color: editColor })
    setEditId(null)
  }

  return (
    <div className="bs-backdrop over-manager" onClick={onClose}>
      <div className="bs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bs-handle" />
        <div className="bs-head">
          <span className="bs-date">현장 라벨 관리</span>
          <button type="button" className="bs-add" onClick={onClose}>
            완료
          </button>
        </div>

        {!siteTableOk && (
          <div className="banner-error" style={{ marginBottom: 10 }}>
            Supabase에 sites 테이블이 없습니다. (name text, color text, sort_order
            int8)
          </div>
        )}

        <div className="bs-list">
          {sites.length === 0 ? (
            <div className="bs-empty">등록된 현장이 없습니다.</div>
          ) : (
            sites.map((s, idx) => (
              <div key={s.id ?? s.name} className="site-manage-item">
                {editId === s.id ? (
                  <div className="site-edit">
                    <div className="site-edit-fields">
                      <input
                        className="row-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="현장 이름"
                        autoFocus
                      />
                      <div className="color-picker">
                        {COLORS.map((c) => (
                          <button
                            type="button"
                            key={c}
                            className={`color-swatch ${
                              editColor === c ? 'selected' : ''
                            }`}
                            style={{ backgroundColor: c, color: c }}
                            onClick={() => setEditColor(c)}
                            aria-label={c}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="site-edit-actions">
                      <button
                        type="button"
                        className="site-edit-cancel"
                        onClick={() => setEditId(null)}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="site-edit-save"
                        onClick={() => saveEdit(s)}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="site-manage-row">
                    <span className="site-arrows">
                      <button
                        type="button"
                        className="site-arrow"
                        onClick={() => move(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="위로"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="site-arrow"
                        onClick={() => move(idx, 'down')}
                        disabled={idx === sites.length - 1}
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                    </span>
                    <span
                      className="site-color-btn"
                      style={{ backgroundColor: s.color || DEFAULT_COLOR }}
                    />
                    <span className="site-manage-name">{s.name}</span>
                    <button
                      type="button"
                      className="site-edit-btn"
                      onClick={() => startEdit(s)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="cal-del"
                      onClick={() => onRemove(s)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 수정 모드일 때는 새 현장 추가 섹션 숨김 */}
        {editId === null && (
          <form className="cal-add" onSubmit={submit}>
            <input
              className="row-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="새 현장 이름"
            />
            <div className="color-picker">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c, color: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
            <button type="submit" className="bs-add cal-add-btn">
              + 현장 추가
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
