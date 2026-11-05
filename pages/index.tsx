import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import AppMenu from '../components/AppMenu'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => <main className={styles.main}>
  <Head><title>Torneo Intergrupos 2026</title><meta name="description" content="Centro de control del Torneo Intergrupos 2026" /></Head>
  <Image className={styles.background} src="/img/imagen-bienvenida.jpg" alt="Bienvenida al Torneo Intergrupos 2026" layout="fill" priority sizes="100vw" />
  <div className={styles.shade} />
  <header className={styles.header}>
    <div className={styles.brand}>
      <Image className={styles.tournamentLogo} src="/img/branding/logo-intergrupos-2026.jpg" alt="Intergrupos 2026" width={72} height={72} />
      <div className={styles.brandText}><span>YUCATÁN COUNTRY CLUB</span><strong>Torneo Intergrupos 2026</strong></div>
      <div className={styles.clubMark}><Image src="/img/branding/logo-ycc.jpg" alt="Yucatán Country Club" width={104} height={66} /></div>
    </div>
    <AppMenu />
  </header>
</main>

export default Home
