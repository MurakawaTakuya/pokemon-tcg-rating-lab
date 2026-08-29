import { useEffect, useMemo, useState, type JSX } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getEpisodes } from '@/api/endpoints'
import { ChartIcon } from '@/components/shared/icons'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import type { Episode, Submission } from '@/types'

interface RatingComparisonProps {
  submissions: Submission[]
  loading: boolean
  refreshKey: number
}

interface Series {
  submission: Submission
  episodes: Episode[]
}

interface ChartPoint {
  timestamp: number
  label: string
  [seriesKey: string]: number | string
}

const COLORS = ['#CC785C', '#4F7A55']

function submissionOrder(submission: Submission): number {
  const value = Number(submission.kaggle_id)
  return Number.isFinite(value) ? value : submission.id
}

function formatScore(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

function shortTitle(submission: Submission): string {
  return submission.title || `Submission ${submission.kaggle_id}`
}

function pointTime(episode: Episode): number {
  const iso = episode.ended_at ?? episode.created_at
  const parsed = iso ? Date.parse(iso) : Number.NaN
  const fallback = Number(episode.id)
  return Number.isFinite(parsed) ? parsed : fallback
}

function pointLabel(episode: Episode): string {
  const iso = episode.ended_at ?? episode.created_at
  if (!iso) return `#${episode.id}`
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ratingEpisodes(episodes: Episode[]): Episode[] {
  return episodes
    .filter((episode) => episode.updated_score !== null)
    .sort((a, b) => pointTime(a) - pointTime(b))
}

function buildChartData(series: Series[]): ChartPoint[] {
  const rows = new Map<number, ChartPoint>()
  series.forEach((entry, index) => {
    ratingEpisodes(entry.episodes).forEach((episode) => {
      const timestamp = pointTime(episode)
      const row = rows.get(timestamp) ?? { timestamp, label: pointLabel(episode) }
      row[`series${index}`] = episode.updated_score as number
      rows.set(timestamp, row)
    })
  })
  return [...rows.values()].sort((a, b) => a.timestamp - b.timestamp)
}

export function RatingComparison({
  submissions,
  loading,
  refreshKey,
}: RatingComparisonProps): JSX.Element {
  const latest = useMemo(
    () => [...submissions].sort((a, b) => submissionOrder(b) - submissionOrder(a)).slice(0, 2),
    [submissions],
  )
  const [series, setSeries] = useState<Series[]>([])
  const [loadingRatings, setLoadingRatings] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (latest.length === 0) {
      setSeries([])
      return
    }
    let active = true
    setLoadingRatings(true)
    setError(null)
    void Promise.all(
      latest.map(async (submission) => ({
        submission,
        episodes: (await getEpisodes(submission.id, 'all')).episodes,
      })),
    )
      .then((result) => {
        if (active) setSeries(result)
      })
      .catch(() => {
        if (active) {
          setSeries([])
          setError('Rating history is unavailable. Sync this competition and try again.')
        }
      })
      .finally(() => {
        if (active) setLoadingRatings(false)
      })
    return () => {
      active = false
    }
  }, [latest, refreshKey])

  const chartData = useMemo(() => buildChartData(series), [series])

  return (
    <section className="glass-card rating-comparison animate-in" aria-labelledby="rating-comparison-title">
      <div className="rating-comparison-header">
        <div>
          <div className="rating-eyebrow"><ChartIcon size={15} /> Live skill rating</div>
          <h2 id="rating-comparison-title">Latest two trajectories</h2>
          <p>Kaggle episode ratings, cached locally and ordered by match completion.</p>
        </div>
        <span className="pill pill-info">Latest 2 submissions</span>
      </div>

      {loading || loadingRatings ? (
        <div className="rating-loading"><LoadingSkeleton shape="row" /></div>
      ) : latest.length < 2 ? (
        <div className="rating-empty">Two submissions are required for comparison.</div>
      ) : error ? (
        <div className="rating-empty">{error}</div>
      ) : (
        <>
          <div className="rating-summary-grid">
            {latest.map((submission, index) => {
              const points = ratingEpisodes(series[index]?.episodes ?? [])
              const values = points.map((episode) => episode.updated_score as number)
              const low = values.length ? Math.min(...values) : null
              const high = values.length ? Math.max(...values) : null
              const first = values.length ? values[0] : null
              const latestRating = values.length ? values[values.length - 1] : null
              const current = submission.score ?? latestRating
              const change = first !== null && current !== null ? current - first : null
              return (
                <article key={submission.id} className="rating-summary-card">
                  <div className="rating-series-label">
                    <span style={{ background: COLORS[index] }} />
                    <span className="mono">#{submission.kaggle_id}</span>
                  </div>
                  <strong>{formatScore(current)}</strong>
                  <span className={change !== null && change >= 0 ? 'rating-up' : 'rating-down'}>
                    {change === null ? 'No trajectory yet' : `${change >= 0 ? '+' : ''}${change.toFixed(1)} overall`}
                  </span>
                  <h3 title={shortTitle(submission)}>{shortTitle(submission)}</h3>
                  <small>
                    {low === null ? 'Range unavailable' : `${low.toFixed(0)}–${high?.toFixed(0)} · ${values.length} matches`}
                  </small>
                </article>
              )
            })}
          </div>

          <div className="rating-chart" role="img" aria-label="Skill rating trajectories for the latest two submissions">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    minTickGap={48}
                    tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-default)' }}
                  />
                  <YAxis
                    domain={['dataMin - 10', 'dataMax + 10']}
                    width={48}
                    tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-md)',
                    }}
                    labelStyle={{ color: 'var(--text-muted)', marginBottom: 6 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                  {latest.map((submission, index) => (
                    <Line
                      key={submission.id}
                      type="monotone"
                      dataKey={`series${index}`}
                      name={`#${submission.kaggle_id} ${shortTitle(submission)}`}
                      stroke={COLORS[index]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="rating-empty">Press “Sync now” once to cache per-match ratings.</div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
