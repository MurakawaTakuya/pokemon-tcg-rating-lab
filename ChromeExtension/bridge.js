(() => {
  const SOURCE = 'pokemon-tcg-rating-lab'
  const endpoints = {
    competitions: '/api/i/competitions.CompetitionService/ListCompetitions',
    submissions: '/api/i/competitions.SubmissionService/ListSubmissions',
    episodes: '/api/i/competitions.EpisodeService/ListEpisodes',
    leaderboard: '/api/i/competitions.LeaderboardService/GetLeaderboard',
  }

  function cookie(name) {
    const prefix = `${name}=`
    const item = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))
    return item ? item.slice(prefix.length) : null
  }

  window.addEventListener('message', async (event) => {
    const message = event.data
    if (event.source !== window || message?.source !== SOURCE || message?.type !== 'request') return

    const endpoint = endpoints[message.endpoint]
    if (!endpoint || typeof message.requestId !== 'string') return

    try {
      const xsrf = cookie('XSRF-TOKEN')
      const buildHash = cookie('build-hash')
      if (!xsrf || !buildHash) {
        throw new Error('Kaggle session tokens were not found. Reload the page after signing in.')
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-xsrf-token': xsrf,
          'x-kaggle-build-version': buildHash,
        },
        body: JSON.stringify(message.body ?? {}),
      })
      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = { message: text.slice(0, 300) }
      }
      if (!response.ok) {
        const error = new Error(response.status === 429
          ? 'Kaggle is rate-limiting requests. Wait a few minutes before refreshing.'
          : `Kaggle request failed (${response.status}).`)
        error.status = response.status
        error.details = data
        throw error
      }
      window.postMessage({ source: SOURCE, type: 'response', requestId: message.requestId, ok: true, data }, '*')
    } catch (error) {
      window.postMessage({
        source: SOURCE,
        type: 'response',
        requestId: message.requestId,
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected Kaggle request error.',
        status: error?.status ?? null,
      }, '*')
    }
  })
})()
