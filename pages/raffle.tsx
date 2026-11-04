import type { NextPage } from 'next'
import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Raffle.module.css'
import Logo from '../public/img/logo-intergrupos-2026.jpg'
import DFLogo from '../public/img/df_logo.png'
import { selectParticipants } from '../redux/states/participants/reducer'
import { useAppSelector } from '../redux/hooks'
import { Participant } from '../redux/states/participants/interfaces'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import UploadRoundedIcon from '@mui/icons-material/UploadRounded'
import { motion } from 'framer-motion'

type AnimationStyle = 'orbit' | 'pulse' | 'wave'
type RaffleSettings = { background: string; animation: AnimationStyle }

const defaults: RaffleSettings = { background: '/img/torneo-intergrupos-2026-bienvenida.jpg', animation: 'orbit' }
const animations: Array<{ id: AnimationStyle; name: string; description: string }> = [
  { id: 'orbit', name: 'Órbita neón', description: 'Versión más fluida y elegante del aro actual.' },
  { id: 'pulse', name: 'Pulso de sorteo', description: 'El aro respira y acelera para crear suspenso.' },
  { id: 'wave', name: 'Onda energética', description: 'Movimiento elástico y dinámico para un cierre festivo.' },
]

const Raffle: NextPage = () => {
  const participants = useAppSelector(selectParticipants) as Participant[]
  const [winner, setWinner] = useState<Participant | null>(null)
  const [current, setCurrent] = useState<Participant | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [drawing, setDrawing] = useState(false)
  const [slow, setSlow] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<RaffleSettings>(defaults)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedRef = useRef(false)

  const stop = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }

  const eligible = () => {
    const deleted = JSON.parse(localStorage.getItem('deletedNames') || '[]') as string[]
    return participants.filter((participant) => !deleted.includes(participant.nombre))
  }

  const runRaffle = (pool = eligible()) => {
    stop()
    if (!pool.length) return
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected = shuffled[Math.floor(Math.random() * shuffled.length)]
    // Keep the show concise regardless of list size: ~4–5 seconds from start to winner.
    const target = 26
    let step = 0
    setWinner(null); setRemaining(pool.length); setDrawing(true); setSlow(false)

    const advance = () => {
      setCurrent(shuffled[step % shuffled.length])
      step += 1
      if (step > target) {
        setCurrent(selected); setWinner(selected); setDrawing(false); setSlow(false)
        return
      }
      const slowPoint = Math.floor(target * .62)
      const inFinalPhase = step >= slowPoint
      setSlow(inFinalPhase)
      const progress = inFinalPhase ? (step - slowPoint) / Math.max(1, target - slowPoint) : 0
      timeoutRef.current = setTimeout(advance, inFinalPhase ? 120 + Math.round(progress * 500) : 48)
    }
    advance()
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('raffleSettings')
      if (saved) {
        const savedSettings = JSON.parse(saved) as RaffleSettings
        const background = savedSettings.background === '/img/background.png' ? defaults.background : savedSettings.background
        setSettings({ ...defaults, ...savedSettings, background })
      }
    } catch { /* Use defaults if storage is unavailable. */ }
  }, [])

  useEffect(() => {
    if (participants.length && !startedRef.current) {
      startedRef.current = true
      localStorage.setItem('deletedNames', JSON.stringify([]))
      setRemaining(participants.length)
      runRaffle(participants)
    }
    return stop
    // The source file populates the Redux store after navigating here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants])

  const updateSettings = (change: Partial<RaffleSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...change }
      try { localStorage.setItem('raffleSettings', JSON.stringify(next)) } catch { /* Large uploads remain available this session. */ }
      return next
    })
  }

  const uploadBackground = (event: React.ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0]
    if (!image || !image.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => updateSettings({ background: String(reader.result) })
    reader.readAsDataURL(image)
    event.target.value = ''
  }

  const replayWithoutWinner = () => {
    if (!winner) return
    const deleted = JSON.parse(localStorage.getItem('deletedNames') || '[]') as string[]
    const nextDeleted = Array.from(new Set(deleted.concat(winner.nombre)))
    localStorage.setItem('deletedNames', JSON.stringify(nextDeleted))
    const pool = participants.filter((participant) => !nextDeleted.includes(participant.nombre))
    setRemaining(pool.length); runRaffle(pool)
  }
  const replayAll = () => { localStorage.setItem('deletedNames', JSON.stringify([])); setRemaining(participants.length); runRaffle(participants) }

  const movement = !drawing ? { rotate: 0, scale: 1, y: 0 }
    : settings.animation === 'pulse' ? { rotate: slow ? [0, 90, 180] : [0, 360], scale: slow ? [1, 1.1, 1] : [1, 1.055, 1] }
    : settings.animation === 'wave' ? { rotate: slow ? [0, 70, 180] : [0, 360], y: slow ? [0, -12, 0] : [0, -7, 0], scale: [1, 1.03, 1] }
    : { rotate: 360 }

  return <div>
    <Head><title>Rifa · Torneo Intergrupos</title><meta name="description" content="Rifa del Torneo Intergrupos" /><link rel="icon" href="/favicon.ico" /></Head>
    <main className={styles.main} style={{ backgroundImage: `url("${settings.background}")` }}>
      <div className={styles.overlay}>
        <div className={styles.settingsButton}><Tooltip title="Configuración" placement="left"><IconButton aria-label="Abrir configuración de la rifa" onClick={() => setSettingsOpen(true)}><SettingsRoundedIcon /></IconButton></Tooltip></div>
        <motion.div className={`${styles.outer__circle} ${settings.animation === 'pulse' ? styles.pulseCircle : ''} ${settings.animation === 'wave' ? styles.waveCircle : ''}`} animate={movement} transition={{ duration: slow ? 2.8 : .62, repeat: drawing ? Infinity : 0, ease: slow ? 'easeOut' : 'linear' }}>
          <div className={styles.ball} />{settings.animation !== 'orbit' && <div className={styles.ballSecondary} />}
        </motion.div>
        <div className={styles.circle} />
        <div className={styles.card__container} aria-live="polite"><div>
          {winner && <h2 className={styles.winner__title}>¡Ganador!</h2>}
          <h1 className={styles.name}>{current?.nombre?.toUpperCase() || 'PREPARANDO...'}</h1>
          <p className={styles.nickname}>{current ? `(${current.apodo})` : 'La rifa está por comenzar'}</p>
          {winner && <p className={styles.winnerTeam}>{winner.equipo}</p>}
        </div></div>
        <div className={styles.actions__container}><div className={styles.icon__container}><PersonRoundedIcon className={styles.person__icon} /><p className={styles.participants}>{remaining || '--'}/{participants.length || '--'}</p></div>
          {winner && <div className={styles.buttons}>
            <Tooltip title="Repetir sin el ganador" placement="top"><Image onClick={replayWithoutWinner} className={styles.icon__image} style={{ marginRight: '10px' }} src="/img/redo_w.svg" alt="Repetir sin ganador" width={35} height={35} /></Tooltip>
            <Tooltip title="Repetir con todos" placement="top"><Image onClick={replayAll} className={styles.icon__image} style={{ marginRight: '10px' }} src="/img/redo.svg" alt="Repetir con todos" width={35} height={35} /></Tooltip>
            <Tooltip title="Hacer otra rifa" placement="top"><Link href="/"><Image className={styles.icon__image} src="/img/another.svg" alt="Otra rifa" width={35} height={35} /></Link></Tooltip>
          </div>}
        </div>
        <div className={styles.title__container}><h1 className={styles.title}>TORNEO INTERGRUPOS {new Date().getFullYear()}</h1><div className={styles.logo__container}><Image src={Logo} width={150} height={150} alt="Logo Intergrupos 2026" /></div></div>
        <div className={styles.df__logo__container}><Image src={DFLogo} width={500} height={160} alt="DFuture" objectFit="contain" /></div>
      </div>
    </main>
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm" aria-labelledby="raffle-settings-title">
      <DialogTitle id="raffle-settings-title">Configuración de la rifa</DialogTitle><DialogContent dividers>
        <p className={styles.settingsLabel}>Fondo de pantalla</p><div className={styles.backgroundChoices}>{['/img/torneo-intergrupos-2026-bienvenida.jpg', '/img/background.png', '/img/background_2.png', '/img/inter.png'].map((background, index) => <button key={background} type="button" className={`${styles.backgroundChoice} ${settings.background === background ? styles.selectedChoice : ''}`} style={{ backgroundImage: `url(${background})` }} onClick={() => updateSettings({ background })} aria-label={`Elegir fondo ${index + 1}`} />)}</div>
        <Button component="label" startIcon={<UploadRoundedIcon />} variant="outlined" size="small">Subir imagen propia<input hidden type="file" accept="image/*" onChange={uploadBackground} /></Button>
        <p className={styles.settingsLabel}>Animación del sorteo</p><div className={styles.animationChoices}>{animations.map((option) => <button key={option.id} type="button" className={`${styles.animationChoice} ${settings.animation === option.id ? styles.selectedAnimation : ''}`} onClick={() => updateSettings({ animation: option.id })}><strong>{option.name}</strong><span>{option.description}</span></button>)}</div>
      </DialogContent><DialogActions><Button onClick={() => setSettingsOpen(false)} variant="contained">Listo</Button></DialogActions>
    </Dialog>
  </div>
}

export default Raffle
