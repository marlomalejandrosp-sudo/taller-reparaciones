import { Routes, Route } from 'react-router'
import Layout from './componentes/Layout.jsx'
import Panel from './paginas/Panel.jsx'
import Ordenes from './paginas/Ordenes.jsx'
import NuevaOrden from './paginas/NuevaOrden.jsx'
import DetalleOrden from './paginas/DetalleOrden.jsx'
import Clientes from './paginas/Clientes.jsx'
import NoEncontrada from './paginas/NoEncontrada.jsx'

// Todas las páginas comparten el diseño de Layout (cabecera + menú) y se dibujan en su <Outlet />
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="ordenes/nueva" element={<NuevaOrden />} />
        <Route path="ordenes/:id" element={<DetalleOrden />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}

export default App
