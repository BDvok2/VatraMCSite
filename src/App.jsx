import React, { useEffect, useState } from 'react'
import ThreeBackground from './ThreeBackground'
import './App.css'

function ServerStatusCard({ host = '134.249.64.192', port = 25565, name = 'VATRA', sub = 'Vatra' }) {
  const [status, setStatus] = useState({ online: false, onlinePlayers: 0, maxPlayers: 0, latency: null })

  useEffect(() => {
    let cancelled = false

    async function fetchStatus() {
      try {
        // Primary: mcsrvstat.us
        const res = await fetch(`https://api.mcsrvstat.us/3/${host}:${port}`)
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) {
            const online = !!json?.online
            const onlinePlayers = json?.players?.online ?? 0
            const maxPlayers = json?.players?.max ?? 100
            const latency = json?.debug?.ping ?? null
            setStatus({ online, onlinePlayers, maxPlayers, latency })
            return
          }
        }
      } catch (e) {
        // ignore, will try fallback
      }
      try {
        // Fallback: mcstatus.io
        const res2 = await fetch(`https://api.mcstatus.io/v2/status/java/${host}:${port}`)
        if (res2.ok) {
          const j = await res2.json()
          if (!cancelled) {
            const online = !!j?.online
            const onlinePlayers = j?.players?.online ?? 0
            const maxPlayers = j?.players?.max ?? 100
            const latency = j?.latency ?? j?.roundTripLatency ?? null
            setStatus({ online, onlinePlayers, maxPlayers, latency })
            return
          }
        }
      } catch (e) {
        // ignore
      }
      if (!cancelled) setStatus((prev) => ({ ...prev, online: false }))
    }

    fetchStatus()
    const id = setInterval(fetchStatus, 60000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [host, port])

  const bars = (() => {
    if (!status.online) return 0
    const ms = status.latency
    if (ms == null) return 4
    if (ms < 75) return 5
    if (ms < 150) return 4
    if (ms < 250) return 3
    if (ms < 400) return 2
    return 1
  })()

  return (
    <div className={`status-card ${status.online ? 'online' : 'offline'}`} aria-live="polite">
      <img
        className="status-icon"
        src="/icon.webp"
        alt="server icon"
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = '/VatraMC.png'
        }}
      />
      <div className="status-main">
        <div className="status-name">{name}</div>
        <div className="status-sub">{host}:{port}</div>
      </div>
      <div className="status-right">
        <div className="status-count">{status.online ? `${status.onlinePlayers}/${status.maxPlayers}` : 'Offline'}</div>
        <div className="status-bars" aria-label="signal strength">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`bar ${i < bars ? 'on' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Pl3xMapEmbed({ url }) {
  const [expanded, setExpanded] = useState(false)
  let mapUrl = url
  const envUrl = import.meta.env && import.meta.env.VITE_PL3XMAP_URL

  if (!mapUrl) {
    if (envUrl) {
      try {
        const u = new URL(envUrl, window.location.origin)
        if (window.location.protocol === 'https:' && u.protocol === 'http:') {
          mapUrl = '/pl3xmap' + u.pathname + u.search
        } else {
          mapUrl = envUrl
        }
      } catch {
        mapUrl = envUrl
      }
    } else {
      // Default to proxied path to avoid mixed content
      mapUrl = '/pl3xmap/?world=world&renderer=vintage_story&zoom=1&x=-66&z=-171'
    }
  }

  return (
    <div className={`map-embed ${expanded ? 'expanded' : 'collapsed'}`}>
      {!expanded && (
        <button
          type="button"
          className="map-collapsed"
          onClick={() => setExpanded(true)}
          aria-label="Open interactive map"
        >
          <span className="label">Interactive map</span>
        </button>
      )}
      {expanded && (
        <>
          <iframe
            className="map-frame"
            title="VatraMC Live Map (Pl3xMap)"
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="map-open">
            <a href={mapUrl} target="_blank" rel="noreferrer">Відкрити мапу у новій вкладці</a>
          </div>
        </>
      )}
    </div>
  )
}

function App() {
  const [navOpen, setNavOpen] = useState(false)

  // Smooth-scroll helper for both container and window scrolling
  function scrollToId(id) {
    const app = document.querySelector('.app')
    const el = document.getElementById(id)
    if (!el) return
    const headerOffset = 12
    if (app && app.scrollHeight > app.clientHeight) {
      const appRect = app.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const current = app.scrollTop
      const top = current + (elRect.top - appRect.top) - headerOffset
      app.scrollTo({ top, behavior: 'smooth' })
    } else {
      const y = el.getBoundingClientRect().top + window.pageYOffset - headerOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
    // Close mobile nav after navigating
    setNavOpen(false)
  }

  return (
    <div className="app">
      <ThreeBackground />
      <div className="content">
        {/* Sticky header with minecraft-style logo */}
        <header className="site-header" role="banner">
          <div className="container header-inner">
            <a
              className="logo-title"
              href="#hero"
              onClick={(e) => {
                e.preventDefault()
                scrollToId('hero')
              }}
            >
              VatraMC
            </a>
            <button
              className="menu-toggle"
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
            >
              <span className="bar" />
            </button>
            <nav className={`site-nav ${navOpen ? 'open' : ''}`} aria-label="Main">
              <a href="#status" onClick={(e) => { e.preventDefault(); scrollToId('status') }}>Статус</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollToId('features') }}>Фічі</a>
              <a href="#rules" onClick={(e) => { e.preventDefault(); scrollToId('rules') }}>Правила</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); scrollToId('about') }}>Про нас</a>
              <a
                className="btn btn-discord nav-discord"
                href="https://discord.gg/4VuAhzK6"
                target="_blank"
                rel="noopener noreferrer"
              >Discord</a>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section id="hero" className="section hero" aria-label="Вітання">
          <div className="container">
            <h1 className="site-title">VatraMC</h1>
            <p>Найкращий український сервер Minecraft</p>
            <div className="hero-ctas">
              <a
                className="btn btn-discord"
                href="https://discord.gg/4VuAhzK6"
                target="_blank"
                rel="noopener noreferrer"
              >Приєднатися до Discord</a>
              <a
                className="btn btn-outline"
                href="#status"
                onClick={(e) => { e.preventDefault(); scrollToId('status') }}
              >Переглянути статус</a>
            </div>
          </div>
        </section>

        {/* Status + Map */}
        <section id="status" className="section server-status" aria-label="Статус сервера">
          <div className="container status-grid">
            <div className="grid-item">
              <Pl3xMapEmbed />
            </div>
            <div className="grid-item">
              <ServerStatusCard />
            </div>
          </div>
        </section>

        {/* Discord CTA card */}
        <section id="discord" className="section discord" aria-label="Discord">
          <div className="container">
            <div className="glass-panel discord-card">
              <img className="discord-logo" src="/discord.svg" alt="" />
              <div className="discord-content">
                <h2>Наш Discord</h2>
                <p>Приєднуйся до ком’юніті, спілкуйся та слідкуй за новинами.</p>
                <a
                  className="btn btn-discord"
                  href="https://discord.gg/4VuAhzK6"
                  target="_blank"
                  rel="noopener noreferrer"
                >Приєднатися до Discord</a>
              </div>
            </div>
          </div>
        </section>

        {/* Особливості Сервера */}
        <section id="features" className="section features-ua" aria-label="Особливості">
          <div className="container">
            <h2>Особливості Сервера</h2>
            <div className="features-grid">
              {/* PvP Система */}
              <div className="feature-card sword">
                <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="14" />
                    <line x1="9" y1="12" x2="15" y2="12" />
                    <path d="M7 16 l5 -2 l5 2 l-5 6 z" />
                  </g>
                </svg>
                <div className="feature-title">PvP Система</div>
                <div className="feature-sub">Захоплюючі PvP битви та турніри з нагородами для найкращих воїнів.</div>
              </div>

              {/* Захист Територій */}
              <div className="feature-card shield">
                <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M12 2l7 4v6c0 5-4 8-7 10C9 20 5 17 5 12V6l7-4z" />
                </svg>
                <div className="feature-title">Захист Територій</div>
                <div className="feature-sub">Повний захист ваших будівель та ресурсів від ґріферів (GriefPrevention).</div>
              </div>

              {/* Towny & Клани */}
              <div className="feature-card globe">
                <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c3 4 3 14 0 18c-3 -4 -3 -14 0 -18z" />
                  </g>
                </svg>
                <div className="feature-title">Towny & Клани</div>
                <div className="feature-sub">Створюйте міста, об’єднуйтесь у клани та будуйте цивілізації з друзями.</div>
              </div>

              {/* Політична Система */}
              <div className="feature-card crown">
                <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2,16 6,8 12,13 18,8 22,16" />
                    <rect x="3" y="16" width="18" height="4" rx="1" ry="1" />
                  </g>
                </svg>
                <div className="feature-title">Політична Система</div>
                <div className="feature-sub">Участь у житті сервера: вибори мерів, керування містами та альянсами.</div>
              </div>

              {/* Великий Світ */}
              <div className="feature-card world">
                <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6l6-2l6 2l6-2v12l-6 2l-6-2l-6 2z" />
                    <path d="M9 4v12m6-10v12" />
                  </g>
                </svg>
                <div className="feature-title">Великий Світ</div>
                <div className="feature-sub">Велетенська карта з унікальними біомами, структурами та пригодами.</div>
              </div>

              {/* Без Вайпів */}
              <div className="feature-card bolt">
                <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M13 2L3 14h7l-1 8l12-12h-7l1-8z" />
                </svg>
                <div className="feature-title">Без Вайпів</div>
                <div className="feature-sub">Ваш прогрес збережено назавжди — ніяких вайпів карти чи інвентаря.</div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Rules section */}
        <section id="rules" className="section rules" aria-label="Правила">
          <div className="container">
            <div className="rules-grid">
              {/* Allowed */}
              <div className="glass-panel rule-card allowed">
                <div className="rule-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#2ecc71" d="M12 2l8 4v6c0 5.25-3.75 9-8 10C7.75 21 4 17.25 4 12V6l8-4Zm-1.2 13.2l6-6l-1.4-1.4l-4.6 4.58l-2.2-2.2l-1.4 1.42l3.6 3.6Z"/></svg>
                  <h3>Дозволено</h3>
                </div>
                <ul>
                  <li>Будівництво та креативні проєкти в будь‑якому стилі</li>
                  <li>Торгівля, бартер та створення власних магазинів</li>
                  <li>Автоматичні ферми, що не створюють надмірних лагів</li>
                  <li>Редстоун‑механізми в межах оптимізації сервера</li>
                  <li>Клієнтські моди без переваги (OptiFine/Sodium, шейдери тощо)</li>
                  <li>PvP за взаємною згодою або у спеціальних зонах</li>
                  <li>Створення міст, кланів та альянсів</li>
                  <li>Текстурпаки та шрифти, що не дають ігрової переваги</li>
                </ul>
              </div>

              {/* Prohibited */}
              <div className="glass-panel rule-card banned">
                <div className="rule-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ff6b6b" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2Zm5 11H7v-2h10v2Z"/></svg>
                  <h3>Заборонено</h3>
                </div>
                <ul>
                  <li>Чіти, макроси, автоклікери, X‑Ray або будь‑які моди з перевагою</li>
                  <li>Використання багів/експлойтів, дюп та обхід ігрових механік</li>
                  <li>Ґріферство: руйнування чи псування чужих будівель, саботаж ферм</li>
                  <li>Крадіжка майна або шахрайство під час торгівлі</li>
                  <li>Спам, флуд, нав’язлива реклама, масовий капс</li>
                  <li>Образи, токсичність, дискримінація, мова ненависті</li>
                  <li>Обхід покарань і використання альт‑акаунтів для обходу бану</li>
                  <li>Намірне створення лагів: 0‑tick/lag‑машини, безкінечні цикли</li>
                  <li>DDoS/DoS, погрози або розкриття особистих даних</li>
                  <li>Спроби отримати несанкціонований доступ до чужих акаунтів</li>
                  <li>Клієнти/моди з packet spoofing, fly/velocity та подібні</li>
                  <li>Будь‑які дії, що суперечать правилам нашого Discord‑серверу</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="section about bg" aria-label="Про сервер">
          <div className="container">
            <div className="glass-panel about-card">
              <h2>Про наш сервер</h2>  
              <p className="about-lead">
                VatraMC — ванільний сервер з акуратними покращеннями, що зберігають дух оригінального Minecraft.
              </p>
              <ul className="about-list">
                <li>Будуйте міста та розвивайте спільноту разом з іншими гравцями</li>
                <li>Маркетплейс для зручної торгівлі та розвиток економіки</li>
                <li>Івенти та сезонні активності протягом року</li>
                <li>Чесні правила, без Pay‑To‑Win, активна модерація</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="site-footer" role="contentinfo">
          <div className="container">
            <p>© {new Date().getFullYear()} VatraMC. Усі права захищено.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
