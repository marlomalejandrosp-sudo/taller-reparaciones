import { NavLink, Outlet, Link } from 'react-router'

const claseEnlace = ({ isActive }) => (isActive ? 'activo' : '')

function Layout() {
  return (
    <>
      <header className="cabecera">
        <Link to="/" className="marca">
          <img src="/icono.svg" alt="" width="28" height="28" />
          Taller de reparaciones
        </Link>
        <nav aria-label="Principal">
          <NavLink to="/" end className={claseEnlace}>Panel</NavLink>
          <NavLink to="/ordenes" end className={claseEnlace}>Órdenes</NavLink>
          <NavLink to="/clientes" className={claseEnlace}>Clientes</NavLink>
          <NavLink to="/ordenes/nueva" className={({ isActive }) => 'boton ' + (isActive ? 'activo' : '')}>
            + Nueva orden
          </NavLink>
        </nav>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </>
  )
}

export default Layout
