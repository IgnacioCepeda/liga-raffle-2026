import Link from 'next/link'
import styles from '../styles/AppMenu.module.css'

const AppMenu = () => <nav className={styles.menu} aria-label="Navegación principal">
  <Link href="/" aria-label="Inicio">Inicio</Link>
  <Link href="/scores?view=setup">Configuración</Link>
  <Link href="/rifa">Rifa</Link>
  <Link href="/scores?view=capture">Premiación</Link>
</nav>

export default AppMenu
