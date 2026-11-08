import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import AppMenu from '../components/AppMenu'
import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import styles from '../styles/Scores.module.css'

const STORAGE_KEY = 'intergrupos-2026-ceremony'
type Player = { id: string; name: string; phcp: number; gross: string; sortSurname?: string }
type Team = { id: string; name: string; averageHcpi: string; players: Player[]; presented: boolean }
const templateTeams = (): Team[] => Array.from({ length: 15 }, (_, teamNumber) => ({ id: `team-${teamNumber + 1}`, name: `Equipo ${String(teamNumber + 1).padStart(2, '0')}`, averageHcpi: '', presented: false, players: Array.from({ length: 12 }, (_, playerNumber) => ({ id: `${teamNumber}-${playerNumber}`, name: `Jugador ${playerNumber + 1}`, phcp: 0, gross: '' })) }))
const playerNet = (player: Player) => player.gross === '' ? null : Number(player.gross) - player.phcp
const surnameParticles = new Set(['de', 'del', 'la', 'las', 'los', 'y'])
const surname = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length < 3) return words[words.length - 1] || name
  let start = words.length - 2
  while (start > 0 && surnameParticles.has(words[start - 1].toLocaleLowerCase('es'))) start -= 1
  return words.slice(start, words.length - 1).join(' ')
}
const sumNet = (team: Team) => team.players.reduce((sum, player) => sum + (playerNet(player) ?? 0), 0)
const complete = (team: Team) => team.players.length === 12 && team.players.every((player) => player.gross !== '')
const bestNet = (team: Team) => Math.min(...team.players.map(playerNet).filter((value): value is number => value !== null))
const normalizedTeamName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
const TEAM_LOGOS: Record<string, string> = {
  JAGUARES: '/img/team-logos/LOGO_JAGUARES.png',
  RESTODELMUNDO: '/img/team-logos/LOGO_RESTO DEL MUNDO.jpg',
  LALIGAJR: '/img/team-logos/LOGO_LALIGAJR.jpeg',
  EARLYGOLF: '/img/team-logos/LOGO_EARLYGOLF.jpeg',
  CHAROLASTRAS: '/img/team-logos/LOGO_CHAROLASTRAS.jpeg',
  PERIODIQUEROS: '/img/team-logos/LOGO_PERIODIQUEROS.jpeg',
  SHANKEROS1: '/img/team-logos/LOGO_SHANKEROS1.jpg',
  SHANKEROS2: '/img/team-logos/LOGO_SHANKEROS2.jpg',
  GALLOS: '/img/team-logos/LOGO_GALLOS.jpeg',
  SEMIPROS: '/img/team-logos/LOGO_SEMIPROS.jpeg',
  LAGARTOS: '/img/team-logos/LOGO_LAGARTOS.jpg',
  TALIYUCAS: '/img/team-logos/LOGO_TALIYUCAS.jpeg',
  LALIGANEGRO: '/img/team-logos/LOGO_LALIGANEGRO.jpeg',
  LALIGABLANCO: '/img/team-logos/LOGO_LALIGABLANCO.jpeg',
  HUACHES: '/img/team-logos/LOGO_HUACHES.jpeg',
}
const teamLogo = (name: string) => TEAM_LOGOS[normalizedTeamName(name)]

const fanfare = (final = false) => {
  try {
    const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return
    const context = new Audio(); const now = context.currentTime
    ;(final ? [262, 330, 392, 523, 659] : [392, 523, 659]).forEach((frequency, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain(); const start = now + index * .13
      oscillator.frequency.value = frequency; oscillator.type = final ? 'square' : 'triangle'
      gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.1, start + .02); gain.gain.exponentialRampToValueAtTime(.0001, start + .3)
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + .31)
    })
  } catch { /* Audio is a progressive enhancement. */ }
}

const playCaptainEntrance = () => {
  try {
    const audio = new Audio('/audio/entrada-capitan.mp3')
    audio.volume = .9
    audio.addEventListener('error', () => fanfare(), { once: true })
    audio.play().catch(() => fanfare())
  } catch { fanfare() }
}

const playChampionFanfare = () => {
  try {
    const audio = new Audio('/audio/campeon-intergrupos-2026.mp3')
    audio.volume = .9
    audio.addEventListener('error', () => fanfare(true), { once: true })
    audio.play().catch(() => fanfare(true))
  } catch { fanfare(true) }
}

const Scores: NextPage = () => {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>(templateTeams)
  const [activeId, setActiveId] = useState('team-1')
  const [view, setView] = useState<'setup' | 'capture' | 'results'>('setup')
  const [reveal, setReveal] = useState(false)
  const [finale, setFinale] = useState(false)
  const [downloadsOpen, setDownloadsOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({})
  const [entryMessage, setEntryMessage] = useState('Teclea el score bruto y presiona Enter para confirmar el neto.')
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { const requested = router.query.view; if (requested === 'setup' || requested === 'capture' || requested === 'results') setView(requested) }, [router.query.view])
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setTeams(JSON.parse(saved) as Team[]) } catch { /* Use the template. */ } finally { setHydrated(true) } }, [])
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(teams)) }, [teams, hydrated])
  const active = teams.find((team) => team.id === activeId) || teams[0]
  useEffect(() => {
    setScoreDrafts({})
    setEntryMessage(`Captura los scores de ${active.name}. Teclea el score bruto y presiona Enter para confirmar el neto.`)
  }, [activeId, active.name])
  const completeTeams = teams.filter(complete).length
  const updateTeam = (id: string, change: (team: Team) => Team) => setTeams((current) => current.map((team) => team.id === id ? change(team) : team))
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3000) }
  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(teams)); showNotice('Cambios guardados en esta computadora') }
  const importCsv = (file: File) => Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: ({ data }) => {
    const columns = Object.keys(data[0] || {}).reduce<Record<string, string>>((map, key) => ({ ...map, [key.toLowerCase().trim()]: key }), {})
    const nameKey = columns.nombre || columns.jugador || columns.player || columns.name; const teamKey = columns.equipo || columns.team; const phcpKey = columns.phcp || columns['playing handicap'] || columns.handicap || columns.hcp; const surnameKey = columns.apellido || columns['apellido paterno'] || columns.paterno
    if (!nameKey || !teamKey || !phcpKey) { showNotice('El CSV debe incluir: nombre, equipo y PHCP.'); return }
    const grouped = new Map<string, Player[]>()
    data.forEach((row, index) => { const teamName = row[teamKey]?.trim(); const name = row[nameKey]?.trim(); if (!teamName || !name) return; const players = grouped.get(teamName) || []; players.push({ id: `${teamName}-${index}`, name, phcp: Number(row[phcpKey]) || 0, gross: '', sortSurname: surnameKey ? row[surnameKey]?.trim() : undefined }); grouped.set(teamName, players) })
    const imported = Array.from(grouped, ([name, players], index): Team => ({ id: `import-${index}`, name, averageHcpi: '', players, presented: false }))
    if (!imported.length) { showNotice('No encontré jugadores válidos en el CSV.'); return }
    setTeams(imported); setActiveId(imported[0].id); showNotice(`${imported.length} equipos importados. Configura su HCPI promedio.`)
  } })
  const chooseTeam = () => { const choices = teams.filter((team) => !team.presented); if (!choices.length) { showNotice('Ya se presentaron todos los equipos.'); return }; const selected = choices[Math.floor(Math.random() * choices.length)]; setActiveId(selected.id); updateTeam(selected.id, (team) => ({ ...team, presented: true })); setReveal(true); playCaptainEntrance() }
  const commitScore = (player: Player, position: number) => {
    const draft = scoreDrafts[player.id] ?? player.gross
    if (!/^\d+$/.test(draft) || Number(draft) < 0 || Number(draft) > 200) { setEntryMessage('Ingresa sólo un número entero entre 0 y 200 y presiona Enter.'); return }
    updateTeam(active.id, (team) => ({ ...team, players: team.players.map((item) => item.id === player.id ? { ...item, gross: draft } : item) }))
    setScoreDrafts((current) => { const next = { ...current }; delete next[player.id]; return next })
    setEntryMessage(`✓ ${player.name}: bruto ${draft} − PHCP ${player.phcp} = neto ${Number(draft) - player.phcp}`)
    document.querySelector<HTMLInputElement>(`[data-score-position="${position + 1}"]`)?.focus()
  }
  const sortedPlayers = [...active.players].sort((a, b) => {
    const bySurname = (a.sortSurname || surname(a.name)).localeCompare(b.sortSurname || surname(b.name), 'es')
    return bySurname || a.name.localeCompare(b.name, 'es')
  })
  const lowestNet = Math.min(...active.players.map(playerNet).filter((value): value is number => value !== null))
  const ranking = useMemo(() => [...teams].filter(complete).sort((a, b) => {
    if (sumNet(a) !== sumNet(b)) return sumNet(a) - sumNet(b)
    const lowestScore = Math.min(...teams.filter(complete).map(sumNet))
    if (sumNet(a) === lowestScore) { const aScores = a.players.map(playerNet).filter((value): value is number => value !== null).sort((x, y) => x - y); const bScores = b.players.map(playerNet).filter((value): value is number => value !== null).sort((x, y) => x - y); for (let i = 0; i < 12; i += 1) if (aScores[i] !== bScores[i]) return aScores[i] - bScores[i] }
    return Number(a.averageHcpi || Infinity) - Number(b.averageHcpi || Infinity)
  }), [teams])
  const needsManualTie = ranking.some((team, index) => index > 0 && sumNet(team) === sumNet(ranking[index - 1]) && sumNet(team) !== Math.min(...ranking.map(sumNet)) && Number(team.averageHcpi) === Number(ranking[index - 1].averageHcpi))
  const downloadCsv = (filename: string, fields: string[], rows: Array<Record<string, string | number>>) => {
    const csv = `\uFEFF${Papa.unparse({ fields, data: rows })}`
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    link.download = filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }
  const makePdf = (filename: string, title: string, subtitle: string, columns: string[], rows: Array<Array<string | number>>) => {
    const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
    const pageWidth = document.internal.pageSize.getWidth()
    document.setFillColor(4, 29, 18)
    document.rect(0, 0, pageWidth, 27, 'F')
    document.setTextColor(244, 235, 202)
    document.setFont('helvetica', 'bold')
    document.setFontSize(22)
    document.text('TORNEO INTERGRUPOS 2026', 14, 13)
    document.setFontSize(10)
    document.setTextColor(224, 193, 98)
    document.text(subtitle.toUpperCase(), 14, 21)
    document.setTextColor(20, 43, 29)
    document.setFontSize(16)
    document.text(title, 14, 36)
    autoTable(document, {
      head: [columns], body: rows, startY: 41, theme: 'grid', margin: { left: 14, right: 14, bottom: 15 },
      styles: { font: 'helvetica', fontStyle: 'bold', fontSize: 10, textColor: [12, 26, 16], cellPadding: 2.6, lineColor: [49, 83, 58], lineWidth: .15, halign: 'center' },
      headStyles: { fillColor: [3, 17, 11], textColor: [255, 255, 255], fontSize: 10.5 },
      alternateRowStyles: { fillColor: [24, 174, 219] },
      columnStyles: { 0: { cellWidth: 20 }, 1: { halign: 'left' } },
      didDrawPage: (data) => {
        document.setFontSize(8)
        document.setTextColor(66, 86, 71)
        document.text(`Página ${data.pageNumber}`, pageWidth - 27, document.internal.pageSize.getHeight() - 7)
      },
    })
    document.save(filename)
  }
  const teamReport = () => {
    const teamFields = ['Posición', 'Equipo', 'Score neto', 'Mejor score neto', 'HCPI promedio']
    const teamRows = ranking.map((team, index) => ({
      Posición: index + 1, Equipo: team.name, 'Score neto': sumNet(team), 'Mejor score neto': bestNet(team), 'HCPI promedio': team.averageHcpi || '—',
    }))
    return { teamFields, teamRows }
  }
  const playerReport = () => {
    const players = ranking.flatMap((team) => team.players.map((player) => ({ player, team }))).filter(({ player }) => playerNet(player) !== null).sort((a, b) => (playerNet(a.player) as number) - (playerNet(b.player) as number) || a.player.phcp - b.player.phcp || a.player.name.localeCompare(b.player.name, 'es'))
    const playerFields = ['Posición', 'Jugador', 'Score neto', 'Equipo', 'PHCP']
    const playerRows = players.map(({ player, team }, index) => ({ Posición: index + 1, Jugador: player.name, 'Score neto': playerNet(player) as number, Equipo: team.name, PHCP: player.phcp }))
    return { playerFields, playerRows }
  }
  const exportTeamPdf = () => { const { teamFields, teamRows } = teamReport(); makePdf('resultados-equipos-intergrupos-2026.pdf', 'Resultados por equipos', 'Clasificación oficial y criterios de desempate', teamFields, teamRows.map((row) => teamFields.map((field) => row[field as keyof typeof row]))); showNotice('PDF de resultados por equipos descargado.') }
  const exportPlayerPdf = () => { const { playerFields, playerRows } = playerReport(); makePdf('resultados-jugadores-intergrupos-2026.pdf', 'Clasificación general de jugadores', 'Desempate por PHCP menor', playerFields, playerRows.map((row) => playerFields.map((field) => row[field as keyof typeof row]))); showNotice('PDF de clasificación de jugadores descargado.') }
  const exportTeamCsv = () => { const { teamFields, teamRows } = teamReport(); downloadCsv('resultados-equipos-intergrupos-2026.csv', teamFields, teamRows); showNotice('CSV de resultados por equipos descargado.') }
  const exportPlayerCsv = () => { const { playerFields, playerRows } = playerReport(); downloadCsv('resultados-jugadores-intergrupos-2026.csv', playerFields, playerRows); showNotice('CSV de clasificación de jugadores descargado.') }
  const clearCapture = () => {
    if (!window.confirm('¿Borrar toda la captura de scores? Se conservarán los equipos, jugadores, PHCP y HCPI promedio.')) return
    setTeams((current) => current.map((team) => ({ ...team, presented: false, players: team.players.map((player) => ({ ...player, gross: '' })) })))
    setScoreDrafts({}); setActiveId(teams[0]?.id || 'team-1'); setView('capture')
    showNotice('La captura fue borrada. La configuración permanece intacta.')
  }
  return <main className={styles.page}>
    <Head><title>Ceremonia de Scores · Intergrupos 2026</title></Head>
    <header className={styles.header}>
      <AppMenu />
      <div className={styles.eventBrand}>
        <div className={styles.logoFrame}><Image src="/img/branding/logo-intergrupos-2026.jpg" alt="Logo Torneo Intergrupos 2026" width={92} height={92} priority /></div>
        <div className={styles.eventTitle}><p>CEREMONIA DE PREMIACIÓN</p><h1>Torneo Intergrupos <strong>2026</strong></h1><span>Consola oficial de scores</span></div>
        <div className={`${styles.logoFrame} ${styles.clubLogo}`}><Image src="/img/branding/logo-ycc.jpg" alt="Yucatán Country Club" width={128} height={82} priority /></div>
      </div>
    </header>
    <nav className={styles.tabs}><button className={view === 'setup' ? styles.selected : ''} onClick={() => setView('setup')}>1. Configuración</button><button className={view === 'capture' ? styles.selected : ''} onClick={() => setView('capture')}>2. Ceremonia</button><button className={view === 'results' ? styles.selected : ''} onClick={() => setView('results')}>3. Resultados</button></nav>
    {notice && <div className={styles.notice}>{notice}</div>}
    {view === 'setup' && <section className={styles.panel}><div className={styles.sectionTitle}><div><p>PREPARACIÓN</p><h2>Jugadores y criterios</h2><span>Importa la lista oficial; el PHCP queda protegido para calcular el neto.</span></div><label className={styles.importButton}>Importar CSV<input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) importCsv(file); event.target.value = '' }} /></label></div><div className={styles.rules}><b>Score neto de equipo = suma de los 12 netos.</b><span>Empate por 1.º: netos individuales más bajos, en orden. Del 2.º al 15.º: HCPI promedio menor. Un empate persistente se marca para decisión manual.</span></div><div className={styles.configTeams}>{teams.map((team) => <article key={team.id}><input value={team.name} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, name: event.target.value }))} aria-label="Nombre del equipo" /><label>HCPI promedio<input type="number" step="0.1" min="0" value={team.averageHcpi} onChange={(event) => updateTeam(team.id, (current) => ({ ...current, averageHcpi: event.target.value }))} placeholder="Ej. 12.4" /></label><small>{team.players.length} jugadores · {team.players.filter((player) => player.phcp !== 0).length} PHCP cargados</small></article>)}</div><div className={styles.bottomActions}><button onClick={save}>Guardar configuración</button><button className={styles.primary} onClick={() => setView('capture')}>Abrir ceremonia →</button></div></section>}
    {view === 'capture' && <section className={styles.ceremony}><aside className={styles.control}><p>ORDEN DE PRESENTACIÓN</p><h2>{teams.filter((team) => !team.presented).length} por presentar</h2><button className={styles.draw} onClick={chooseTeam}>✦ Elegir equipo al azar</button><div className={styles.teamList}>{teams.map((team) => <button key={team.id} onClick={() => setActiveId(team.id)} className={team.id === active.id ? styles.activeTeam : ''}>{team.presented ? '✓ ' : ''}{team.name}<b>{complete(team) ? 'Listo' : 'pendiente'}</b></button>)}</div><button onClick={save}>Guardar captura</button></aside><section className={styles.capturePanel}><div className={styles.captureHead}><div><p>EQUIPO EN ESCENARIO</p><h2>{active.name}</h2><span>HCPI promedio: {active.averageHcpi || 'sin capturar'}</span></div><div className={styles.total}><span>NETO DE EQUIPO</span><strong>{complete(active) ? sumNet(active) : '—'}</strong><small>{active.players.filter((player) => player.gross !== '').length}/12 scores</small></div></div><p className={styles.scoreHint}>{entryMessage}</p><div className={styles.scoreTable}><div className={styles.scoreHead}><span>JUGADOR · ORDEN ALFABÉTICO</span><span>GROSS</span><span>PHCP</span><span>NETO</span></div>{sortedPlayers.map((player, index) => { const net = playerNet(player); const best = complete(active) && net === lowestNet; const displayedScore = scoreDrafts[player.id] ?? player.gross; return <div key={player.id} className={`${styles.scoreRow} ${best ? styles.best : ''}`}><span>{player.name}{best && <em>MEJOR NETO</em>}</span><input data-score-position={index} type="text" inputMode="numeric" autoComplete="off" value={displayedScore} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setScoreDrafts((current) => ({ ...current, [player.id]: event.target.value })) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitScore(player, index) } }} placeholder="—" aria-label={`Gross de ${player.name}`} /><b>{player.phcp}</b><strong>{net ?? '—'}</strong></div>})}</div><footer><button onClick={() => { setReveal(true); fanfare() }}>Presentar en pantalla</button>{complete(active) && <button className={styles.primary} onClick={() => { setReveal(true); fanfare(true) }}>✦ Revelar mejor neto</button>}<button onClick={() => setView('results')}>Ver clasificación</button></footer></section></section>}
    {view === 'results' && <section className={styles.panel}><div className={styles.sectionTitle}><div><p>CLASIFICACIÓN FINAL</p><h2>Tabla de resultados</h2><span>{completeTeams === teams.length ? 'Los equipos han sido capturados.' : `Faltan ${teams.length - completeTeams} equipos por completar.`}</span></div><div className={styles.resultActions}><button className={styles.primary} disabled={!ranking.length} onClick={() => { setFinale(true); playChampionFanfare() }}>✦ Fanfarria final</button><button className={styles.printResults} disabled={!ranking.length} onClick={() => setDownloadsOpen((current) => !current)}>Imprimir resultados</button><button className={styles.clearResults} onClick={clearCapture}>Borrar captura</button></div></div>{downloadsOpen && <div className={styles.downloadPanel}><strong>Descarga cada archivo por separado</strong><span>Así el navegador no bloqueará ninguna descarga.</span><div><button onClick={exportTeamPdf}>PDF equipos</button><button onClick={exportTeamCsv}>CSV equipos</button><button onClick={exportPlayerPdf}>PDF jugadores</button><button onClick={exportPlayerCsv}>CSV jugadores</button></div></div>}{needsManualTie && <div className={styles.warning}>Hay un empate con igual score neto y HCPI promedio. Requiere resolución manual.</div>}<div className={styles.results}><div><span>POS.</span><span>EQUIPO</span><span>NETO EQUIPO</span><span>HCPI PROM.</span></div>{ranking.map((team, index) => <div key={team.id} className={index === 0 ? styles.champion : ''}><b>{index + 1}º</b><span>{team.name}</span><strong>{sumNet(team)}</strong><span>{team.averageHcpi || '—'}</span></div>)}</div></section>}
    {reveal && <div className={styles.reveal} onClick={() => setReveal(false)} role="dialog" aria-label={`Presentación de ${active.name}`}>
      <div className={styles.revealRays} /><div className={styles.revealSparkles}>✦ ✧ ✦</div>
      <p>TORNEO INTERGRUPOS 2026</p><div className={styles.teamLogoStage}>{teamLogo(active.name) ? <Image src={teamLogo(active.name) as string} alt={`Logo ${active.name}`} width={310} height={310} unoptimized /> : <span>{active.name.slice(0, 1)}</span>}</div>
      <h2>{active.name}</h2><span>{complete(active) ? `Score neto del equipo: ${sumNet(active)}` : 'Capitán, adelante al escenario'}</span><small>Haz clic para volver a la consola</small>
    </div>}
    {finale && <div className={styles.finale} onClick={() => setFinale(false)} role="dialog"><div className={styles.finaleSmoke} aria-hidden="true" /><div className={styles.finaleConfetti}>✦ ✧ ✦ ✧ ✦</div><p className={styles.championPhrase}>✦ CAMPEÓN INTERGRUPOS 2026 ✦</p>{ranking[0] && <div className={styles.championLogoStage}>{teamLogo(ranking[0].name) ? <Image src={teamLogo(ranking[0].name) as string} alt={`Logo campeón ${ranking[0].name}`} width={360} height={360} unoptimized /> : <span>{ranking[0].name.slice(0, 1)}</span>}</div>}<h2 className={styles.championName}>{ranking[0]?.name}</h2><strong>{ranking[0] ? `${sumNet(ranking[0])} NETO` : 'Resultados pendientes'}</strong><small>Haz clic para cerrar</small></div>}
  </main>
}
export default Scores
