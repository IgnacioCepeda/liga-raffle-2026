import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import React, { useState } from 'react'
import Papa from 'papaparse'
import AppMenu from '../components/AppMenu'
import { setReduxParticipants } from '../redux/actions'
import { useAppDispatch } from '../redux/hooks'
import { Participant } from '../redux/states/participants/interfaces'
import styles from '../styles/RifaSetup.module.css'

type CsvParticipant = { nombre?: string; equipo?: string; apodo?: string; handicap?: string | number }

const Rifa: NextPage = () => {
  const dispatch = useAppDispatch()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [message, setMessage] = useState('Selecciona el archivo oficial de participantes para la rifa.')

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
      setParticipants(valid)
      setMessage(`${valid.length} participantes cargados correctamente.`)
    }, error: () => setMessage('No se pudo leer el archivo CSV.') })
    event.target.value = ''
  }

  return <main className={styles.page}>
    <Head><title>Rifa · Torneo Intergrupos 2026</title></Head>
    <AppMenu />
    <section className={styles.card}>
      <p>TORNEO INTERGRUPOS 2026</p><h1>Preparar rifa</h1>
      <span>{message}</span>
      <label className={styles.upload}>Cargar archivo CSV<input type="file" accept=".csv,text/csv" onChange={loadFile} /></label>
      <small>Columnas requeridas: nombre, equipo, apodo y handicap.</small>
      {participants.length > 0 && <Link href="/raffle" className={styles.start}>Iniciar rifa →</Link>}
    </section>
  </main>
}

export default Rifa
