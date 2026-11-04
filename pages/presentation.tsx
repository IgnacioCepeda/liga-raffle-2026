/* eslint-disable @next/next/no-img-element -- selected local files use browser blob URLs. */
import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import styles from '../styles/Presentation.module.css'

type Slide = { id: string; name: string; url: string }
const effects = ['fade', 'zoom', 'slideLeft', 'slideUp'] as const
type Effect = typeof effects[number]

const Presentation: NextPage = () => {
  const [slides, setSlides] = useState<Slide[]>([])
  const [playing, setPlaying] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [effect, setEffect] = useState<Effect>('fade')
  const [seconds, setSeconds] = useState(5)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const advance = () => {
    setSlideIndex((current) => {
      if (slides.length < 2) return 0
      let next = Math.floor(Math.random() * slides.length)
      if (next === current) next = (next + 1) % slides.length
      return next
    })
    setEffect(effects[Math.floor(Math.random() * effects.length)])
  }

  useEffect(() => {
    if (!playing || !slides.length) return
    stopTimer()
    timerRef.current = setInterval(advance, seconds * 1000)
    return stopTimer
    // The timer is rebuilt only when its frequency or slideshow state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, seconds, slides.length])

  useEffect(() => () => {
    stopTimer()
    slides.forEach((slide) => URL.revokeObjectURL(slide.url))
  // Object URLs only need cleanup when this page is closed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'))
    const nextSlides = files.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, url: URL.createObjectURL(file) }))
    setSlides((current) => [...current, ...nextSlides])
    event.target.value = ''
  }

  const removeSlide = (id: string) => {
    setSlides((current) => {
      const deleted = current.find((slide) => slide.id === id)
      if (deleted) URL.revokeObjectURL(deleted.url)
      const next = current.filter((slide) => slide.id !== id)
      setSlideIndex((index) => Math.min(index, Math.max(next.length - 1, 0)))
      return next
    })
  }

  const start = async () => {
    if (!slides.length) return
    setSlideIndex(Math.floor(Math.random() * slides.length))
    setEffect('fade')
    setPlaying(true)
    try { await document.documentElement.requestFullscreen() } catch { /* Fullscreen remains optional. */ }
  }

  const stop = async () => {
    setPlaying(false)
    stopTimer()
    if (document.fullscreenElement) await document.exitFullscreen()
  }

  if (playing && slides.length) {
    const activeSlide = slides[slideIndex]
    return <main className={styles.player} onClick={advance}>
      <Head><title>Presentación · Torneo Intergrupos 2026</title></Head>
      <img key={`${activeSlide.id}-${effect}`} className={`${styles.slide} ${styles[effect]}`} src={activeSlide.url} alt={activeSlide.name} />
      <div className={styles.playerBar} onClick={(event) => event.stopPropagation()}>
        <span>{slideIndex + 1} / {slides.length}</span>
        <button onClick={advance}>Siguiente</button>
        <button onClick={stop}>Salir</button>
      </div>
      <p className={styles.playerHint}>Clic en la foto para avanzar · Esc para salir de pantalla completa</p>
    </main>
  }

  return <main className={styles.main}>
    <Head><title>Presentación · Torneo Intergrupos 2026</title></Head>
    <Link href="/" className={styles.back}>← Volver a la rifa</Link>
    <section className={styles.panel}>
      <p className={styles.eyebrow}>TORNEO INTERGRUPOS 2026</p>
      <h1>Presentación de bienvenida</h1>
      <p className={styles.description}>Selecciona las fotos que quieras mostrar antes de iniciar la rifa. Se reproducirán en orden y con transiciones aleatorias.</p>
      <div className={styles.controls}>
        <label className={styles.uploadButton}>Seleccionar imágenes<input type="file" accept="image/*" multiple onChange={addImages} /></label>
        <label className={styles.duration}>Cambiar cada <select value={seconds} onChange={(event) => setSeconds(Number(event.target.value))}><option value={3}>3 segundos</option><option value={5}>5 segundos</option><option value={8}>8 segundos</option></select></label>
        <button className={styles.startButton} onClick={start} disabled={!slides.length}>Iniciar presentación</button>
      </div>
      {slides.length ? <div className={styles.grid}>{slides.map((slide) => <article key={slide.id} className={styles.thumbnail}><img src={slide.url} alt={slide.name} /><button onClick={() => removeSlide(slide.id)} aria-label={`Quitar ${slide.name}`}>×</button><span>{slide.name}</span></article>)}</div> : <div className={styles.empty}>Aún no hay fotos seleccionadas.</div>}
    </section>
  </main>
}

export default Presentation
