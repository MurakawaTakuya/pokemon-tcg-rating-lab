(() => {
  const SOURCE = 'kaggle-rating-lab'
  const CACHE_VERSION = 5
  const pending = new Map()
  let activeSlug = competitionSlug()
  let currentData = null
  let panelOpen = false
  let chartMode = 'focus'

  function competitionSlug() {
    return location.pathname.match(/^\/competitions\/([^/]+)/)?.[1] ?? null
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function number(value) {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(String(value).replaceAll(',', ''))
    return Number.isFinite(parsed) ? parsed : null
  }

  function formatScore(value) {
    return value === null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 1 })
  }

  function formatDelta(value) {
    if (value === null) return 'No rating data'
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
  }

  function submissionLabel(index) {
    return `Submission #${index + 1}`
  }

  function request(endpoint, body) {
    const requestId = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId)
        reject(new Error('Kaggle did not respond. Reload the page and try again.'))
      }, 25_000)
      pending.set(requestId, { resolve, reject, timeout })
      window.postMessage({ source: SOURCE, type: 'request', requestId, endpoint, body }, '*')
    })
  }

  window.addEventListener('message', (event) => {
    const message = event.data
    if (event.source !== window || message?.source !== SOURCE || message?.type !== 'response') return
    const job = pending.get(message.requestId)
    if (!job) return
    clearTimeout(job.timeout)
    pending.delete(message.requestId)
    if (message.ok) job.resolve(message.data)
    else job.reject(new Error(message.error || 'Kaggle request failed.'))
  })

  const host = document.createElement('div')
  host.id = 'kaggle-rating-lab-root'
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; }
      button { font: inherit; }
      .krl-launcher {
        position: fixed; right: 22px; bottom: 22px; z-index: 2147483646;
        display: flex; align-items: center; gap: 9px; border: 0; border-radius: 999px;
        padding: 11px 16px 11px 12px; color: #f8fafc; cursor: pointer;
        background: linear-gradient(135deg, #7c3aed, #4f46e5 55%, #2563eb);
        box-shadow: 0 14px 40px rgba(49,46,129,.35), inset 0 1px rgba(255,255,255,.24);
        font: 700 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: .01em; transition: transform .2s ease, box-shadow .2s ease;
      }
      .krl-launcher:hover { transform: translateY(-2px); box-shadow: 0 18px 45px rgba(49,46,129,.45); }
      .krl-launcher svg { width: 19px; height: 19px; }
      .krl-panel {
        position: fixed; z-index: 2147483647; top: 12px; right: 12px; bottom: 12px;
        width: min(760px, calc(100vw - 24px)); overflow: hidden; color: #e8edf8;
        border: 1px solid rgba(255,255,255,.12); border-radius: 22px;
        background: radial-gradient(circle at 95% 0%, rgba(124,58,237,.24), transparent 32%),
                    radial-gradient(circle at 0% 70%, rgba(20,184,166,.1), transparent 34%),
                    rgba(10,14,27,.96);
        box-shadow: 0 28px 90px rgba(2,6,23,.55), inset 0 1px rgba(255,255,255,.08);
        backdrop-filter: blur(24px); font: 400 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        transform: translateX(calc(100% + 28px)); opacity: 0; pointer-events: none;
        transition: transform .28s cubic-bezier(.22,1,.36,1), opacity .2s ease;
      }
      .krl-panel.open { transform: translateX(0); opacity: 1; pointer-events: auto; }
      .krl-shell { height: 100%; display: flex; flex-direction: column; }
      .krl-header { padding: 21px 22px 17px; border-bottom: 1px solid rgba(148,163,184,.13); }
      .krl-topline { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .krl-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
      .krl-logo { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px;
        background: linear-gradient(145deg, #8b5cf6, #4f46e5); box-shadow: 0 8px 24px rgba(124,58,237,.35); }
      .krl-logo svg { width: 21px; height: 21px; }
      .krl-kicker { color: #a5b4fc; font-size: 10px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
      .krl-title { margin: 1px 0 0; overflow: hidden; color: #f8fafc; font-size: 17px; font-weight: 760; white-space: nowrap; text-overflow: ellipsis; }
      .krl-actions { display: flex; gap: 6px; }
      .krl-icon-button { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; color: #aeb9ce;
        border: 1px solid rgba(148,163,184,.16); border-radius: 10px; background: rgba(255,255,255,.04); cursor: pointer; }
      .krl-icon-button:hover { color: #fff; background: rgba(255,255,255,.09); }
      .krl-icon-button:disabled { opacity: .45; cursor: wait; }
      .krl-icon-button svg { width: 17px; height: 17px; }
      .krl-context { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
      .krl-slug { min-width: 0; overflow: hidden; color: #8491aa; font: 500 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-overflow: ellipsis; white-space: nowrap; }
      .krl-live { flex: none; display: inline-flex; align-items: center; gap: 6px; color: #76e7d5; font-size: 10px; font-weight: 700; }
      .krl-live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #2dd4bf; box-shadow: 0 0 0 4px rgba(45,212,191,.12); }
      .krl-body { flex: 1; min-height: 0; overflow: auto; padding: 18px 20px 24px; scrollbar-width: thin; scrollbar-color: #38445d transparent; }
      .krl-state { min-height: 360px; display: grid; place-items: center; padding: 30px; text-align: center; }
      .krl-state-card { max-width: 310px; }
      .krl-spinner { width: 32px; height: 32px; margin: 0 auto 16px; border: 3px solid rgba(165,180,252,.16); border-top-color: #a78bfa; border-radius: 50%; animation: krl-spin .8s linear infinite; }
      @keyframes krl-spin { to { transform: rotate(360deg); } }
      .krl-state h3 { margin: 0 0 7px; color: #f8fafc; font-size: 15px; }
      .krl-state p { margin: 0; color: #8b98b2; font-size: 12px; }
      .krl-error-icon { display: grid; place-items: center; width: 38px; height: 38px; margin: 0 auto 14px; color: #fda4af; border-radius: 12px; background: rgba(244,63,94,.12); font-size: 20px; }
      .krl-retry { margin-top: 16px; padding: 9px 14px; color: #fff; border: 0; border-radius: 10px; background: #6d5ce7; cursor: pointer; font-weight: 700; }
      .krl-section-label { display: flex; align-items: center; justify-content: space-between; margin: 0 1px 10px; color: #8995ad; font-size: 10px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
      .krl-updated { font-weight: 500; letter-spacing: 0; text-transform: none; }
      .krl-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .krl-card { position: relative; min-width: 0; padding: 14px; overflow: hidden; border: 1px solid rgba(148,163,184,.13); border-radius: 15px; background: rgba(255,255,255,.035); }
      .krl-card::after { content: ''; position: absolute; width: 80px; height: 80px; top: -42px; right: -30px; border-radius: 50%; background: var(--series); filter: blur(28px); opacity: .24; }
      .krl-card-id { display: flex; align-items: center; gap: 7px; color: #aab5ca; font: 650 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .krl-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--series); box-shadow: 0 0 0 3px color-mix(in srgb, var(--series), transparent 80%); }
      .krl-score { position: relative; z-index: 1; margin-top: 10px; color: #fff; font-size: 27px; font-weight: 780; letter-spacing: -.04em; }
      .krl-positive { color: #5eead4; } .krl-negative { color: #fda4af; } .krl-neutral { color: #94a3b8; }
      .krl-card-title { margin-top: 5px; overflow: hidden; color: #c8d1e2; font-size: 11px; font-weight: 620; text-overflow: ellipsis; white-space: nowrap; }
      .krl-record { display: flex; align-items: center; gap: 6px; margin-top: 9px; }
      .krl-record span { padding: 4px 7px; border: 1px solid rgba(148,163,184,.12); border-radius: 7px; background: rgba(255,255,255,.035); color: #93a0b7; font-size: 9px; font-weight: 700; }
      .krl-record b { margin-right: 3px; font-size: 9px; }
      .krl-record .win b { color: #5eead4; }
      .krl-record .loss b { color: #fda4af; }
      .krl-record .draw b { color: #cbd5e1; }
      .krl-meta { margin-top: 7px; color: #71809a; font-size: 10px; }
      .krl-chart-card { margin-top: 12px; padding: 14px 12px 10px; border: 1px solid rgba(148,163,184,.13); border-radius: 16px; background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.018)); }
      .krl-chart-head { display: flex; align-items: end; justify-content: space-between; gap: 12px; padding: 0 4px 12px; }
      .krl-chart-head strong { display: block; color: #eef2ff; font-size: 13px; }
      .krl-chart-head span { color: #74829b; font-size: 10px; }
      .krl-legend { display: flex; gap: 10px; color: #9ba8bd; font-size: 9px; }
      .krl-legend span { display: flex; align-items: center; gap: 5px; }
      .krl-legend i { width: 13px; height: 2px; border-radius: 9px; background: var(--series); }
      .krl-chart-toolbar { display: flex; align-items: center; justify-content: flex-end; margin: -3px 3px 8px; }
      .krl-range-toggle { display: inline-flex; padding: 3px; border: 1px solid rgba(148,163,184,.14); border-radius: 9px; background: rgba(2,6,23,.28); }
      .krl-range-toggle button { padding: 5px 9px; color: #7e8ba3; border: 0; border-radius: 6px; background: transparent; cursor: pointer; font-size: 9px; font-weight: 750; }
      .krl-range-toggle button:hover { color: #d8e0ee; }
      .krl-range-toggle button.active { color: #eef2ff; background: rgba(129,110,246,.24); box-shadow: inset 0 0 0 1px rgba(167,139,250,.2); }
      .krl-chart { display: block; width: 100%; height: auto; overflow: visible; }
      .krl-chart-wrap { position: relative; }
      .krl-grid { stroke: rgba(148,163,184,.12); stroke-width: 1; stroke-dasharray: 4 6; }
      .krl-axis-text { fill: #697790; font: 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .krl-line { fill: none; stroke: var(--series); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 3px 5px color-mix(in srgb, var(--series), transparent 65%)); }
      .krl-area { opacity: .1; }
      .krl-point { fill: var(--series); stroke: #101629; stroke-width: 2; opacity: .28; transition: opacity .15s, r .15s; }
      .krl-point:hover { opacity: 1; r: 5; }
      .krl-last-point { fill: #0e1425; stroke: var(--series); stroke-width: 3; }
      .krl-medal-line { stroke-width: 1.5; stroke-dasharray: 7 5; opacity: .85; }
      .krl-medal-text { font: 750 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; paint-order: stroke; stroke: #0e1425; stroke-width: 4px; stroke-linejoin: round; }
      .krl-density-axis { stroke: rgba(148,163,184,.18); stroke-width: 1; }
      .krl-density-bar { fill: #64748b; opacity: .34; transition: opacity .15s ease; }
      .krl-density-bar:hover { opacity: .8; }
      .krl-density-label { fill: #7f8ca3; font: 750 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: .04em; }
      .krl-hover-guide { stroke: rgba(226,232,240,.4); stroke-width: 1; stroke-dasharray: 3 4; pointer-events: none; }
      .krl-tooltip { position: absolute; z-index: 5; width: 228px; padding: 11px 12px; color: #dce4f3; border: 1px solid rgba(148,163,184,.2); border-radius: 11px; background: rgba(7,11,23,.96); box-shadow: 0 14px 35px rgba(0,0,0,.38); pointer-events: none; backdrop-filter: blur(14px); }
      .krl-tooltip[hidden] { display: none; }
      .krl-tooltip-title { color: #f8fafc; font-size: 11px; font-weight: 780; }
      .krl-tooltip-subtitle { margin-top: 2px; color: #7f8ca3; font-size: 9px; }
      .krl-tooltip-row { display: grid; grid-template-columns: 9px 1fr auto; align-items: center; gap: 7px; margin-top: 9px; }
      .krl-tooltip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--series); }
      .krl-tooltip-copy { min-width: 0; }
      .krl-tooltip-copy strong { display: block; overflow: hidden; color: #cbd5e1; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
      .krl-tooltip-copy span { display: block; margin-top: 1px; color: #71809a; font-size: 8px; }
      .krl-tooltip-value { color: #f8fafc; text-align: right; font-size: 11px; font-weight: 760; }
      .krl-tooltip-value span { display: block; font-size: 8px; }
      .krl-insights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
      .krl-insight { padding: 10px 11px; border: 1px solid rgba(148,163,184,.11); border-radius: 12px; background: rgba(255,255,255,.025); }
      .krl-insight span { display: block; color: #71809a; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
      .krl-insight strong { display: block; margin-top: 4px; color: #dce4f3; font-size: 13px; }
      .krl-recent { margin-top: 14px; border: 1px solid rgba(148,163,184,.12); border-radius: 14px; overflow: hidden; }
      .krl-recent-head { padding: 10px 12px; color: #8995ad; border-bottom: 1px solid rgba(148,163,184,.1); background: rgba(255,255,255,.025); font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .krl-match { display: grid; grid-template-columns: 86px 1fr 72px 65px; align-items: center; gap: 7px; padding: 8px 12px; color: #8b98b0; border-bottom: 1px solid rgba(148,163,184,.07); font-size: 10px; }
      .krl-match:last-child { border-bottom: 0; }
      .krl-match strong { overflow: hidden; color: #cbd5e1; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
      .krl-match-score { color: #e8edf8; text-align: right; font-variant-numeric: tabular-nums; }
      .krl-match-delta { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
      @media (max-width: 560px) {
        .krl-panel { inset: 0; width: 100vw; border-radius: 0; }
        .krl-launcher { right: 14px; bottom: 14px; }
        .krl-body { padding-inline: 14px; }
      }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
    </style>
    <button class="krl-launcher" type="button" aria-label="Open Kaggle Rating Lab">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/><path d="m4 9 6-4 6 7 4-3"/></svg>
      Rating Lab
    </button>
    <aside class="krl-panel" aria-label="Kaggle rating history panel">
      <div class="krl-shell">
        <header class="krl-header">
          <div class="krl-topline">
            <div class="krl-brand">
              <div class="krl-logo"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/><path d="m4 9 6-4 6 7 4-3"/></svg></div>
              <div><div class="krl-kicker">Kaggle Rating Lab</div><h2 class="krl-title">Latest two trajectories</h2></div>
            </div>
            <div class="krl-actions">
              <button class="krl-icon-button krl-refresh" type="button" title="Refresh from Kaggle" aria-label="Refresh from Kaggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg></button>
              <button class="krl-icon-button krl-close" type="button" title="Close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
            </div>
          </div>
          <div class="krl-context"><span class="krl-slug"></span><span class="krl-live">Authenticated tab</span></div>
        </header>
        <main class="krl-body"></main>
      </div>
    </aside>
  `
  document.documentElement.append(host)

  const launcher = shadow.querySelector('.krl-launcher')
  const panel = shadow.querySelector('.krl-panel')
  const body = shadow.querySelector('.krl-body')
  const slugLabel = shadow.querySelector('.krl-slug')
  const refreshButton = shadow.querySelector('.krl-refresh')

  function setVisibility() {
    const visible = Boolean(activeSlug)
    launcher.style.display = visible && !panelOpen ? 'flex' : 'none'
    if (!visible) {
      panelOpen = false
      panel.classList.remove('open')
    }
    slugLabel.textContent = activeSlug ? `/competitions/${activeSlug}` : ''
  }

  function closePanel() {
    panelOpen = false
    panel.classList.remove('open')
    setVisibility()
  }

  launcher.addEventListener('click', () => {
    panelOpen = true
    panel.classList.add('open')
    setVisibility()
    if (!currentData) void load(false)
  })
  shadow.querySelector('.krl-close').addEventListener('click', closePanel)
  document.addEventListener('pointerdown', (event) => {
    if (!panelOpen || event.composedPath().includes(host)) return
    closePanel()
  }, true)
  refreshButton.addEventListener('click', () => void load(true))

  setInterval(() => {
    const nextSlug = competitionSlug()
    if (nextSlug === activeSlug) return
    activeSlug = nextSlug
    currentData = null
    setVisibility()
    if (panelOpen && activeSlug) void load(false)
  }, 750)
  setVisibility()

  function loadingView() {
    body.innerHTML = `<div class="krl-state"><div class="krl-state-card"><div class="krl-spinner"></div><h3>Building rating trajectories</h3><p>Reading your latest submissions and two paced episode histories…</p></div></div>`
  }

  function errorView(error) {
    body.innerHTML = `<div class="krl-state"><div class="krl-state-card"><div class="krl-error-icon">!</div><h3>Could not load ratings</h3><p>${escapeHtml(error.message)}</p><button class="krl-retry" type="button">Try again</button></div></div>`
    body.querySelector('.krl-retry').addEventListener('click', () => void load(true))
  }

  async function load(force) {
    if (!activeSlug) return
    refreshButton.disabled = true
    loadingView()
    const cacheKey = `krl:${CACHE_VERSION}:${activeSlug}`
    try {
      if (!force) {
        const cached = (await chrome.storage.local.get(cacheKey))[cacheKey]
        if (cached) {
          currentData = cached
          render(cached)
          return
        }
      }
      const data = await fetchRatingData(activeSlug)
      currentData = data
      await chrome.storage.local.set({ [cacheKey]: data })
      render(data)
    } catch (error) {
      errorView(error instanceof Error ? error : new Error('Unexpected extension error.'))
    } finally {
      refreshButton.disabled = false
    }
  }

  async function fetchRatingData(slug) {
    const competitions = await request('competitions', {
      selector: {
        competitionIds: [], listOption: 'LIST_OPTION_USER_ENTERED', sortOption: 'SORT_OPTION_NUM_TEAMS',
        hostSegmentIdFilter: 0, searchQuery: '', prestigeFilter: 'PRESTIGE_FILTER_UNSPECIFIED',
        visibilityFilter: 'VISIBILITY_FILTER_UNSPECIFIED', participationFilter: 'PARTICIPATION_FILTER_UNSPECIFIED',
        tagIds: [], excludeTagIds: [], requireSimulations: false, requireKernels: false, requireHackathons: false,
      },
      pageToken: '', pageSize: 50, readMask: 'competitions,userTeams',
    })
    const competition = (competitions.competitions ?? []).find((item) => item.competitionName === slug)
    if (!competition) throw new Error('This competition was not found among your entered competitions.')
    const team = (competitions.userTeams ?? []).find((item) => String(item.competitionId) === String(competition.id))
    if (!team) throw new Error('Your team for this competition was not found.')

    const submissionResponse = await request('submissions', {
      teamId: team.id,
      pageSize: 50,
      pageToken: '',
      selector: { listOption: 'LIST_OPTION_DEFAULT', sortOption: 'SORT_OPTION_DEFAULT', submissionIds: [] },
    })
    const latest = [...(submissionResponse.submissions ?? [])]
      .sort((a, b) => submissionOrder(b) - submissionOrder(a))
      .slice(0, 2)
    if (latest.length < 2) throw new Error('At least two submissions are required for comparison.')

    const series = []
    for (const submission of latest) {
      const episodeResponse = await request('episodes', { submissionId: submission.id })
      series.push(toSeries(submission, episodeResponse.episodes ?? []))
      if (series.length < latest.length) await new Promise((resolve) => setTimeout(resolve, 400))
    }
    let medals = []
    let leaderboardEntries = []
    try {
      const leaderboard = await request('leaderboard', {
        competitionId: Number(competition.id),
        leaderboardMode: 'LEADERBOARD_MODE_DEFAULT',
      })
      const leaderboardRows = leaderboard.publicLeaderboard ?? []
      medals = medalBoundaries(leaderboardRows)
      leaderboardEntries = leaderboardRows
        .map((row, index) => ({
          score: number(row.displayScore ?? row.score),
          rank: number(row.rank) ?? index + 1,
        }))
        .filter((entry) => entry.score !== null)
    } catch {
      // Medal data is optional; rating trajectories remain useful without it.
    }
    return {
      slug,
      competitionTitle: competition.title || slug,
      loadedAt: new Date().toISOString(),
      series,
      medals,
      leaderboardEntries,
    }
  }

  function medalBoundaries(rows) {
    const names = ['gold', 'silver', 'bronze']
    return names.flatMap((name) => {
      const matching = rows
        .map((row, index) => ({
          medal: normalizeMedal(row.medal),
          rank: number(row.rank) ?? index + 1,
          score: number(row.displayScore ?? row.score),
        }))
        .filter((row) => row.medal === name && row.score !== null)
        .sort((a, b) => b.rank - a.rank)
      return matching.length ? [{ name, rank: matching[0].rank, score: matching[0].score }] : []
    })
  }

  function normalizeMedal(value) {
    if (value === 1) return 'gold'
    if (value === 2) return 'silver'
    if (value === 3) return 'bronze'
    const normalized = String(value ?? '').trim().toLowerCase().replace(/^medal_/, '')
    return ['gold', 'silver', 'bronze'].includes(normalized) ? normalized : null
  }

  function submissionOrder(submission) {
    const timestamp = Date.parse(submission.dateSubmitted || submission.createTime || submission.submittedTime || '')
    return Number.isFinite(timestamp) ? timestamp : number(submission.id) ?? 0
  }

  function toSeries(submission, episodes) {
    const submissionId = String(submission.id)
    const outcomes = episodes.map((episode) => episodeOutcome(episode, submissionId))
    const points = episodes.map((episode, index) => {
      const agent = (episode.agents ?? []).find((item) => String(item.submissionId) === submissionId)
      const initialScore = number(agent?.initialScore)
      const updatedScore = number(agent?.updatedScore)
      const timeValue = Date.parse(episode.endTime || episode.createTime || '')
      return {
        episodeId: String(episode.id ?? index),
        time: Number.isFinite(timeValue) ? timeValue : number(episode.id) ?? index,
        initialScore,
        updatedScore,
        outcome: outcomes[index],
        delta: initialScore !== null && updatedScore !== null ? updatedScore - initialScore : null,
      }
    }).filter((point) => point.updatedScore !== null).sort((a, b) => a.time - b.time)

    const values = points.flatMap((point, index) => index === 0 && point.initialScore !== null
      ? [point.initialScore, point.updatedScore]
      : [point.updatedScore])
    const start = points[0]?.initialScore ?? points[0]?.updatedScore ?? null
    const current = points.at(-1)?.updatedScore ?? null
    const average = points.length
      ? points.reduce((sum, point) => sum + point.updatedScore, 0) / points.length
      : null
    return {
      id: submissionId,
      title: submission.title || submission.description || `Submission ${submissionId}`,
      points,
      matchCount: episodes.length,
      ratedMatchCount: points.length,
      wins: outcomes.filter((outcome) => outcome === 'win').length,
      losses: outcomes.filter((outcome) => outcome === 'loss').length,
      draws: outcomes.filter((outcome) => outcome === 'draw').length,
      unknowns: outcomes.filter((outcome) => outcome === 'unknown').length,
      start,
      current,
      average,
      change: start !== null && current !== null ? current - start : null,
      low: values.length ? Math.min(...values) : null,
      high: values.length ? Math.max(...values) : null,
    }
  }

  function episodeOutcome(episode, submissionId) {
    const explicit = String(episode.outcome ?? episode.result ?? '').trim().toLowerCase()
    if (['win', 'won'].includes(explicit)) return 'win'
    if (['lose', 'loss', 'lost'].includes(explicit)) return 'loss'
    if (['draw', 'tie', 'tied'].includes(explicit)) return 'draw'

    const agents = Array.isArray(episode.agents) ? episode.agents : []
    const mine = agents.find((agent) => String(agent.submissionId) === String(submissionId))
    const myReward = number(mine?.reward)
    const otherRewards = agents
      .filter((agent) => agent !== mine)
      .map((agent) => number(agent.reward))
      .filter((reward) => reward !== null)
    if (myReward === null || !otherRewards.length) return 'unknown'
    const bestOther = Math.max(...otherRewards)
    if (myReward > bestOther) return 'win'
    if (myReward < bestOther) return 'loss'
    return 'draw'
  }

  function chartSvg(series, medals = [], leaderboardEntries = [], mode = 'focus') {
    const width = 760
    const height = 330
    const left = 55
    const right = 116
    const top = 18
    const bottom = 36
    const plotWidth = width - left - right
    const plotHeight = height - top - bottom
    const leaderboardScores = leaderboardEntries.map((entry) => entry.score)
    const focusValues = [
      ...series.flatMap((item) => trajectory(item).map((point) => point.score)),
      ...medals.map((item) => item.score),
    ]
    const values = mode === 'all' ? [...focusValues, ...leaderboardScores] : focusValues
    if (!values.length && leaderboardScores.length) values.push(...leaderboardScores)
    if (!values.length) return `<div class="krl-state" style="min-height:220px"><div class="krl-state-card"><h3>No rated matches yet</h3><p>Refresh after Kaggle finishes evaluating these submissions.</p></div></div>`
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    const padding = Math.max(8, (rawMax - rawMin) * .12)
    const min = Math.floor((rawMin - padding) / 10) * 10
    const max = Math.ceil((rawMax + padding) / 10) * 10 || min + 20
    const span = Math.max(1, max - min)
    const maxMatches = Math.max(1, ...series.map((item) => item.points.length))
    const x = (match) => left + (match / maxMatches) * plotWidth
    const y = (score) => top + ((max - score) / span) * plotHeight
    const plotRight = width - right
    const colors = ['#9b7cff', '#2dd4bf']
    const medalColors = { gold: '#fbbf24', silver: '#cbd5e1', bronze: '#d97706' }

    const yGrid = Array.from({ length: 5 }, (_, index) => {
      const score = max - (span * index / 4)
      const py = y(score)
      return `<line class="krl-grid" x1="${left}" y1="${py}" x2="${plotRight}" y2="${py}"/><text class="krl-axis-text" x="${left - 10}" y="${py + 3}" text-anchor="end">${Math.round(score)}</text>`
    }).join('')
    const xTicks = [...new Set([0, Math.round(maxMatches / 2), maxMatches])].map((match) =>
      `<text class="krl-axis-text" x="${x(match)}" y="${height - 10}" text-anchor="middle">${match}</text>`).join('')

    const lines = series.map((item, seriesIndex) => {
      const points = trajectory(item)
      if (!points.length) return ''
      const coords = points.map((point) => [x(point.match), y(point.score)])
      const path = coords.map(([px, py], index) => `${index ? 'L' : 'M'} ${px.toFixed(2)} ${py.toFixed(2)}`).join(' ')
      const area = `${path} L ${coords.at(-1)[0].toFixed(2)} ${top + plotHeight} L ${coords[0][0].toFixed(2)} ${top + plotHeight} Z`
      const dotStride = Math.max(1, Math.ceil(points.length / 60))
      const dots = points.map((point, index) => {
        if (index % dotStride !== 0 && index !== points.length - 1) return ''
        const [px, py] = coords[index]
        return `<circle class="krl-point" style="--series:${colors[seriesIndex]}" cx="${px}" cy="${py}" r="4"/>`
      }).join('')
      const [lastX, lastY] = coords.at(-1)
      return `<path class="krl-area" fill="url(#krl-gradient-${seriesIndex})" d="${area}"/><path class="krl-line" style="--series:${colors[seriesIndex]}" d="${path}"/>${dots}<circle class="krl-last-point" style="--series:${colors[seriesIndex]}" cx="${lastX}" cy="${lastY}" r="5"/>`
    }).join('')
    const medalLines = medals.map((medal) => {
      const py = y(medal.score)
      const color = medalColors[medal.name]
      const label = `${medal.name[0].toUpperCase()}${medal.name.slice(1)} #${medal.rank} · ${formatScore(medal.score)}`
      return `<line class="krl-medal-line" x1="${left}" y1="${py}" x2="${plotRight}" y2="${py}" stroke="${color}"/><text class="krl-medal-text" x="${plotRight - 4}" y="${py - 5}" text-anchor="end" fill="${color}">${escapeHtml(label)}</text>`
    }).join('')
    const visibleLeaderboardEntries = leaderboardEntries.filter((entry) => entry.score >= min && entry.score <= max)
    const binCount = 18
    const bins = Array.from({ length: binCount }, () => 0)
    const binEntries = Array.from({ length: binCount }, () => [])
    visibleLeaderboardEntries.forEach((entry) => {
      const index = Math.min(binCount - 1, Math.max(0, Math.floor(((max - entry.score) / span) * binCount)))
      bins[index] += 1
      binEntries[index].push(entry)
    })
    const maxBin = Math.max(...bins, 1)
    const binHeight = plotHeight / binCount
    const densityWidth = right - 30
    const densityStart = plotRight + 12
    const density = leaderboardScores.length ? `
      <line class="krl-density-axis" x1="${plotRight + 6}" y1="${top}" x2="${plotRight + 6}" y2="${top + plotHeight}"/>
      <text class="krl-density-label" x="${densityStart}" y="${top - 7}">RANKING · ${mode === 'all' ? leaderboardScores.length : `${visibleLeaderboardEntries.length}/${leaderboardScores.length}`}</text>
      ${bins.map((count, index) => {
        const barWidth = (count / maxBin) * densityWidth
        const barY = top + index * binHeight + 1
        const upper = max - (span * index / binCount)
        const lower = max - (span * (index + 1) / binCount)
        const ranks = binEntries[index].map((entry) => entry.rank)
        const rankStart = ranks.length ? Math.min(...ranks) : 0
        const rankEnd = ranks.length ? Math.max(...ranks) : 0
        return `<rect class="krl-density-bar" data-score-lower="${lower}" data-score-upper="${upper}" data-count="${count}" data-rank-start="${rankStart}" data-rank-end="${rankEnd}" x="${densityStart}" y="${barY}" width="${barWidth}" height="${Math.max(1, binHeight - 2)}" rx="2"><title>${Math.round(lower)}–${Math.round(upper)} · ${count} teams · ranks #${rankStart}–#${rankEnd}</title></rect>`
      }).join('')}` : ''

    return `<svg class="krl-chart" data-plot-left="${left}" data-plot-right="${plotRight}" data-view-width="${width}" data-max-matches="${maxMatches}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Rating progression by match with leaderboard score distribution">
      <defs>
        <linearGradient id="krl-gradient-0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b7cff"/><stop offset="1" stop-color="#9b7cff" stop-opacity="0"/></linearGradient>
        <linearGradient id="krl-gradient-1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0"/></linearGradient>
      </defs>${yGrid}${xTicks}${density}${medalLines}${lines}<line class="krl-hover-guide" x1="${left}" y1="${top}" x2="${left}" y2="${top + plotHeight}" style="display:none"/></svg>`
  }

  function trajectory(series) {
    if (!series.points.length) return []
    const output = []
    const initial = series.points[0].initialScore
    if (initial !== null) output.push({ match: 0, score: initial })
    series.points.forEach((point, index) => output.push({ match: index + 1, score: point.updatedScore }))
    return output
  }

  function attachChartTooltip(data) {
    const wrap = body.querySelector('.krl-chart-wrap')
    const svg = wrap?.querySelector('.krl-chart')
    const tooltip = wrap?.querySelector('.krl-tooltip')
    const guide = svg?.querySelector('.krl-hover-guide')
    if (!wrap || !svg || !tooltip || !guide) return
    const colors = ['#9b7cff', '#2dd4bf']
    let lastTooltipKey = null
    let tooltipHeight = 120
    let animationFrame = null
    let latestEvent = null
    let wrapRect = wrap.getBoundingClientRect()
    let svgRect = svg.getBoundingClientRect()

    const hide = () => {
      tooltip.hidden = true
      guide.style.display = 'none'
      lastTooltipKey = null
    }
    const position = (event) => {
      const cursorX = event.clientX - wrapRect.left
      const cursorY = event.clientY - wrapRect.top
      let left = cursorX + 14
      if (left + 228 > wrapRect.width - 4) left = cursorX - 228 - 14
      const top = Math.max(4, Math.min(cursorY - 18, wrapRect.height - tooltipHeight - 4))
      tooltip.style.left = `${Math.max(4, left)}px`
      tooltip.style.top = `${top}px`
    }
    const showDistribution = (bar, event) => {
      const count = number(bar.dataset.count) ?? 0
      if (!count) return hide()
      const lower = number(bar.dataset.scoreLower)
      const upper = number(bar.dataset.scoreUpper)
      const rankStart = number(bar.dataset.rankStart)
      const rankEnd = number(bar.dataset.rankEnd)
      const rankLabel = rankStart === rankEnd ? `#${rankStart}` : `#${rankStart}–#${rankEnd}`
      guide.style.display = 'none'
      const tooltipKey = `distribution:${lower}:${upper}`
      if (lastTooltipKey !== tooltipKey) {
        tooltip.innerHTML = `<div class="krl-tooltip-title">Leaderboard distribution</div>
          <div class="krl-tooltip-subtitle">Rating ${formatScore(lower)}–${formatScore(upper)}</div>
          <div class="krl-tooltip-row"><i class="krl-tooltip-dot" style="--series:#64748b"></i><div class="krl-tooltip-copy"><strong>Teams in this range</strong><span>Current public leaderboard</span></div><div class="krl-tooltip-value">${count}</div></div>
          <div class="krl-tooltip-row"><i class="krl-tooltip-dot" style="--series:#94a3b8"></i><div class="krl-tooltip-copy"><strong>Rank range</strong><span>Best–lowest rank in band</span></div><div class="krl-tooltip-value">${rankLabel}</div></div>`
        tooltip.hidden = false
        tooltipHeight = tooltip.offsetHeight
        lastTooltipKey = tooltipKey
      }
      position(event)
    }

    const handleMove = (event) => {
      const distributionBar = event.composedPath().find((node) => node?.classList?.contains('krl-density-bar'))
      if (distributionBar) return showDistribution(distributionBar, event)

      const viewWidth = number(svg.dataset.viewWidth) ?? 760
      const plotLeft = number(svg.dataset.plotLeft) ?? 55
      const plotRight = number(svg.dataset.plotRight) ?? 644
      const maxMatches = number(svg.dataset.maxMatches) ?? 1
      const svgX = ((event.clientX - svgRect.left) / svgRect.width) * viewWidth
      if (svgX < plotLeft || svgX > plotRight) return hide()

      const targetMatch = Math.round(((svgX - plotLeft) / (plotRight - plotLeft)) * maxMatches)
      const guideX = plotLeft + (targetMatch / maxMatches) * (plotRight - plotLeft)
      const tooltipKey = `match:${targetMatch}`
      if (lastTooltipKey !== tooltipKey) {
        guide.setAttribute('x1', guideX)
        guide.setAttribute('x2', guideX)
        guide.style.display = ''
        const rows = data.series.map((item, seriesIndex) => {
          const points = trajectory(item)
          if (!points.length) return ''
          const matchOffset = points[0].match === 0 ? 0 : 1
          const pointIndex = Math.max(0, Math.min(points.length - 1, targetMatch - matchOffset))
          const point = points[pointIndex]
          const previous = pointIndex > 0 ? points[pointIndex - 1] : null
          const delta = previous ? point.score - previous.score : null
          const episode = point.match > 0 ? item.points[point.match - 1] : null
          const outcome = episode?.outcome && episode.outcome !== 'unknown'
            ? episode.outcome[0].toUpperCase() + episode.outcome.slice(1)
            : 'Start rating'
          const detail = episode ? `Episode ${escapeHtml(episode.episodeId)} · ${outcome}` : outcome
          return `<div class="krl-tooltip-row"><i class="krl-tooltip-dot" style="--series:${colors[seriesIndex]}"></i><div class="krl-tooltip-copy"><strong>${submissionLabel(seriesIndex)} · Match ${point.match}</strong><span>${detail}</span></div><div class="krl-tooltip-value">${formatScore(point.score)}<span class="${delta === null ? 'krl-neutral' : delta >= 0 ? 'krl-positive' : 'krl-negative'}">${delta === null ? 'start' : formatDelta(delta)}</span></div></div>`
        }).join('')
        tooltip.innerHTML = `<div class="krl-tooltip-title">Around match ${targetMatch}</div><div class="krl-tooltip-subtitle">Nearest rated point for each submission</div>${rows}`
        tooltip.hidden = false
        tooltipHeight = tooltip.offsetHeight
        lastTooltipKey = tooltipKey
      }
      position(event)
    }
    svg.addEventListener('mouseenter', () => {
      wrapRect = wrap.getBoundingClientRect()
      svgRect = svg.getBoundingClientRect()
    })
    svg.querySelectorAll('.krl-density-bar').forEach((bar) => {
      bar.addEventListener('mouseenter', (event) => showDistribution(bar, event))
      bar.addEventListener('mousemove', (event) => {
        event.stopPropagation()
        showDistribution(bar, event)
      })
    })
    svg.addEventListener('mousemove', (event) => {
      latestEvent = event
      if (animationFrame !== null) return
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null
        handleMove(latestEvent)
      })
    })
    svg.addEventListener('mouseleave', () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame)
      animationFrame = null
      hide()
    })
  }

  function render(data) {
    const colors = ['#9b7cff', '#2dd4bf']
    const updated = new Date(data.loadedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const cards = data.series.map((item, index) => {
      return `<article class="krl-card" style="--series:${colors[index]}">
        <div class="krl-card-id"><i class="krl-dot"></i>${submissionLabel(index)}</div>
        <div class="krl-score">${formatScore(item.current)}</div>
        <div class="krl-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="krl-record"><span class="win"><b>W</b>${item.wins}</span><span class="loss"><b>L</b>${item.losses}</span><span class="draw"><b>D</b>${item.draws}</span></div>
        <div class="krl-meta">${item.ratedMatchCount} rated matches · Avg ${formatScore(item.average)} · ${formatScore(item.low)}–${formatScore(item.high)}</div>
      </article>`
    }).join('')
    const maxMatches = Math.max(...data.series.map((item) => item.ratedMatchCount), 0)
    const combinedRange = data.series.flatMap((item) => [item.low, item.high]).filter((value) => value !== null)
    const strongest = [...data.series].filter((item) => item.change !== null).sort((a, b) => b.change - a.change)[0]
    const recent = data.series.flatMap((item, seriesIndex) => item.points.slice(-4).map((point, index, array) => ({
      ...point, submission: item, seriesIndex, relativeMatch: item.points.length - array.length + index + 1,
    }))).sort((a, b) => b.time - a.time).slice(0, 7)

    body.innerHTML = `
      <div class="krl-section-label"><span>Latest submissions</span><span class="krl-updated">Updated ${escapeHtml(updated)}</span></div>
      <div class="krl-cards">${cards}</div>
      <section class="krl-chart-card">
        <div class="krl-chart-head"><div><strong>Skill rating</strong><span>Match progression${data.leaderboardEntries?.length ? ` · ${data.leaderboardEntries.length} ranked teams` : ''}</span></div><div class="krl-legend">${data.series.map((_, index) => `<span><i style="--series:${colors[index]}"></i>${submissionLabel(index)}</span>`).join('')}${data.leaderboardEntries?.length ? '<span><i style="--series:#64748b"></i>Ranking</span>' : ''}</div></div>
        <div class="krl-chart-toolbar"><div class="krl-range-toggle" role="group" aria-label="Chart rating range"><button type="button" data-chart-mode="focus" class="${chartMode === 'focus' ? 'active' : ''}" aria-pressed="${chartMode === 'focus'}">Focus</button><button type="button" data-chart-mode="all" class="${chartMode === 'all' ? 'active' : ''}" aria-pressed="${chartMode === 'all'}">All</button></div></div>
        <div class="krl-chart-wrap">${chartSvg(data.series, data.medals ?? [], data.leaderboardEntries ?? [], chartMode)}<div class="krl-tooltip" hidden></div></div>
      </section>
      <div class="krl-insights">
          <div class="krl-insight"><span>Fetched matches</span><strong>${maxMatches}</strong></div>
        <div class="krl-insight"><span>Combined range</span><strong>${combinedRange.length ? `${formatScore(Math.min(...combinedRange))}–${formatScore(Math.max(...combinedRange))}` : '—'}</strong></div>
        <div class="krl-insight"><span>Best momentum</span><strong>${strongest ? `#${escapeHtml(strongest.id)} ${formatDelta(strongest.change)}` : '—'}</strong></div>
      </div>
      <section class="krl-recent">
        <div class="krl-recent-head">Recent rated matches</div>
        ${recent.length ? recent.map((point) => `<div class="krl-match"><span>${submissionLabel(point.seriesIndex)}</span><strong>Match ${point.relativeMatch}</strong><span class="krl-match-score">${formatScore(point.updatedScore)}</span><span class="krl-match-delta ${point.delta === null ? 'krl-neutral' : point.delta >= 0 ? 'krl-positive' : 'krl-negative'}">${formatDelta(point.delta)}</span></div>`).join('') : '<div class="krl-match"><strong>No rated matches yet</strong></div>'}
      </section>
    `
    shadow.querySelector('.krl-title').textContent = data.competitionTitle || 'Latest two trajectories'
    body.querySelectorAll('[data-chart-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        chartMode = button.dataset.chartMode
        render(data)
      })
    })
    attachChartTooltip(data)
  }
})()
