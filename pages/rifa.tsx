import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import Papa from 'papaparse'
import AppMenu from '../components/AppMenu'
import { setReduxParticipants } from '../redux/actions'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { Participant } from '../redux/states/participants/interfaces'
import { selectParticipants } from '../redux/states/participants/reducer'
import styles from '../styles/RifaSetup.module.css'

type CsvParticipant = { nombre?: string; equipo?: string; apodo?: string; handicap?: string | number }
const PARTICIPANTS_KEY = 'intergruposRaffleParticipants'
const DELETED_NAMES_KEY = 'deletedNames'
const RAFFLE_SESSION_KEY = 'intergruposRaffleSession'
const LAST_WINNER_KEY = 'intergruposRaffleLastWinner'

const Rifa: NextPage = () => {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const reduxParticipants = useAppSelector(selectParticipants) as Participant[]
  const [participants, setParticipants] = useState<Participant[]>([])
  const [message, setMessage] = useState('Selecciona el archivo oficial de participantes para la rifa.')

  useEffect(() => {
    const savedParticipants = (() => {
      try { return JSON.parse(localStorage.getItem(PARTICIPANTS_KEY) || '[]') as Participant[] } catch { return [] as Participant[] }
    })()
    const activeParticipants = reduxParticipants.length ? reduxParticipants : savedParticipants
    if (!activeParticipants.length) return
    setParticipants(activeParticipants)
    if (!reduxParticipants.length) dispatch(setReduxParticipants(activeParticipants))
    setMessage(`${activeParticipants.length} participantes listos para continuar la rifa.`)
  }, [dispatch, reduxParticipants])

  const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) { setMessage('Selecciona un archivo de tipo CSV.'); return }
    Papa.parse<CsvParticipant>(file, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim().toLowerCase(), complete: ({ data, meta }) => {
      const required = ['nombre', 'equipo', 'apodo', 'handicap']
      const missing = required.filter((column) => !meta.fields?.includes(column))
      if (missing.length) { setMessage(`Faltan columnas requeridas: ${missing.join(', ')}.`); return }

      const valid = data.reduce<Participant[]>((list, item) => {
        const nombre = item.nombre?.trim()
        const equipo = item.equipo?.trim()
        const apodo = item.apodo?.trim()
        const handicap = Number(item.handicap)
        if (nombre && equipo && apodo && Number.isFinite(handicap)) list.push({ nombre, equipo, apodo, handicap })
        return list
      }, [])
      if (!valid.length) { setMessage('No encontré participantes válidos. Revisa los datos del CSV.'); return }
      dispatch(setReduxParticipants(valid))
      localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(valid))
      localStorage.setItem(DELETED_NAMES_KEY, JSON.stringify([]))
      localStorage.removeItem(RAFFLE_SESSION_KEY)
      localStorage.removeItem(LAST_WINNER_KEY)
      setParticipants(valid)
      setMessage(`${valid.length} participantes cargados correctamente.`)
    }, error: () => setMessage('No se pudo leer el archivo CSV.') })
    event.target.value = ''
  }

  const resetRaffle = () => {
    if (!window.confirm('¿Reiniciar la rifa? Se borrará la lista de ganadores y podrás cargar un nuevo CSV.')) return
    localStorage.removeItem(PARTICIPANTS_KEY)
    localStorage.removeItem(DELETED_NAMES_KEY)
    localStorage.removeItem(RAFFLE_SESSION_KEY)
    localStorage.removeItem(LAST_WINNER_KEY)
    dispatch(setReduxParticipants([]))
    setParticipants([])
    setMessage('Rifa reiniciada. Selecciona el nuevo archivo CSV oficial.')
  }

  return <main className={styles.page}>
    <Head><title>Rifa · Torneo Intergrupos 2026</title></Head>
    <AppMenu />
    <section className={styles.card}>
      <p>TORNEO INTERGRUPOS 2026</p><h1>Preparar rifa</h1>
      <span>{message}</span>
      {!participants.length ? <><label className={styles.upload}>Cargar archivo CSV<input type="file" accept=".csv,text/csv" onChange={loadFile} /></label><small>Columnas requeridas: nombre, equipo, apodo y handicap.</small></> : <><small>La lista y los ganadores se conservan aunque navegues a otra sección.</small><button type="button" className={styles.reset} onClick={resetRaffle}>Reiniciar rifa</button></>}
      <button type="button" className={styles.start} disabled={!participants.length} onClick={() => router.push('/raffle')}>{participants.length ? 'Continuar rifa →' : 'Iniciar rifa →'}</button>
    </section>
  </main>
}

export default Rifa
