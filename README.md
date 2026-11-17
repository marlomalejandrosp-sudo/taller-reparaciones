# Taller de reparaciones (React + PocketBase)

Aplicación que reemplaza la libreta de un taller de reparación de equipos electrónicos: registra los equipos que llegan (cliente, problema y fotos), lleva cada orden por sus etapas, guarda el presupuesto y el historial de cada cambio.

| Carpeta | Contenido |
|---|---|
| `servidor/` | PocketBase: esquema en `pb_migrations/` y validaciones en `pb_hooks/` |
| `cliente/` | Interfaz con React + Vite + React Router; las peticiones se hacen con `fetch` |
| `pruebas/` | `garantias.mjs`: prueba las garantías atacando la API directamente |

## Cómo arrancarlo desde cero

### Requisitos
- **Node.js** (versión LTS reciente) con **npm**. Comprobar con `node -v` y `npm -v`.
- **PocketBase** (probado con la v0.41.1). No se sube al repositorio: se descarga de las *releases* de PocketBase.

### 1. Servidor
1. Copia el ejecutable de PocketBase dentro de `servidor/`, junto a `pb_migrations/` y `pb_hooks/`.
2. En una terminal, desde la carpeta `servidor`:
   ```powershell
   .\pocketbase.exe superuser upsert admin@ejemplo.com 1234567890   # solo la primera vez
   .\pocketbase.exe serve
   ```
   En Linux o macOS: `./pocketbase superuser upsert ...` y `./pocketbase serve`.
3. Al arrancar, PocketBase ejecuta las migraciones: crea las colecciones, las reglas y los **datos de prueba**. La API queda en <http://127.0.0.1:8090> y el panel de administración en <http://127.0.0.1:8090/_/>.

Deja esa terminal abierta.

### 2. Cliente
En **otra** terminal, desde la carpeta `cliente`:
```powershell
npm install
npm run dev
```
Abre <http://localhost:5173>.

Si PocketBase no está en `http://127.0.0.1:8090`, copia `cliente/.env.example` como `cliente/.env` y cambia `VITE_PB_URL`.

En Windows, si PowerShell dice que *running scripts is disabled*, ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Datos de prueba
La migración `1790000001_datos_prueba.js` crea **2 clientes** y **6 órdenes** en etapas distintas:

| Cliente | Equipo | Etapa |
|---|---|---|
| Ana María Pérez (52345678) | iPhone 11 | entregada (recorrió todo el proceso) |
| Ana María Pérez | Televisor Samsung 43" | presupuestada |
| Ana María Pérez | Tablet Lenovo Tab M10 | solicitada |
| Luis Alberto Gómez (53456789) | Laptop HP Pavilion 15 | en_reparacion |
| Luis Alberto Gómez | Xiaomi Redmi Note 10 | en_diagnostico |
| Luis Alberto Gómez | Laptop Dell Inspiron 3520 | rechazada |

Las órdenes se crean en `solicitada` y se hacen avanzar etapa por etapa con los **mismos hooks** que usa la API, así que su historial se genera solo.

Para volver a empezar con los datos originales: detén PocketBase, borra `servidor/pb_data/` y arráncalo otra vez (repitiendo el `superuser upsert`).

### Probar las garantías
Con el servidor recién arrancado:
```powershell
node pruebas/garantias.mjs
```
Hace 42 comprobaciones contra la API, sin pasar por la interfaz: saltos de etapa, cancelaciones fuera de plazo, cambios de presupuesto, órdenes cerradas, edición y borrado de eventos, fotos... Crea sus propias órdenes de prueba, así que se puede repetir sin reiniciar la base.

## Modelo de datos

| Colección | Campos |
|---|---|
| `clientes` | `nombre` (texto), `telefono` (texto) |
| `ordenes` | `cliente` (relación a clientes, requerida), `equipo`, `problema`, `estado` (select), `diagnostico`, `manoObra` (número), `piezas` (json: `[{ descripcion, cantidad, precio }]`), `fotos` (hasta 3 imágenes) |
| `eventos` | `orden` (relación a ordenes), `de`, `a` y `created` (fecha automática) |

```
clientes 1 ──── * ordenes 1 ──── * eventos
```

## Garantías y cómo se cumplen

### Reglas de acceso (`pb_migrations/1790000000_esquema.js`)
No hay autenticación, así que las reglas no distinguen quién pide. Bloquean lo que **nunca** debe ocurrir; lo demás lo valida un hook.

| Colección | Ver/listar | Crear | Editar | Borrar |
|---|---|---|---|---|
| `clientes` | sí | sí | sí | **nadie** |
| `ordenes` | sí | sí (hook valida) | sí (hook valida) | **nadie** |
| `eventos` | sí | **nadie** (lo crea el servidor) | **nadie** | **nadie** |

"Nadie" es una regla `null`: solo el superusuario puede, nunca una petición normal a la API.

### Validaciones (`pb_hooks/main.pb.js`)
Se usan **hooks de modelo** (`onRecordCreate` y `onRecordUpdate`), no de petición. Se ejecutan en cualquier guardado de una orden (API, panel de administración o código) y dentro de la **misma transacción**: si algo falla, no se guarda nada.

- **Orden del proceso.** Una orden nueva siempre empieza en `solicitada` y sin presupuesto. Solo se permiten los cambios de la tabla del enunciado (`SIGUIENTE` en `pb_hooks/util.js`); cualquier otro responde `400`.
- **Cancelar** solo desde `solicitada`. **Rechazada, cancelada y entregada no cambian más**, ni la etapa ni ningún otro dato.
- **Presupuesto.** Se registra **solo** en el paso `en_diagnostico → presupuestada`, y debe tener diagnóstico, piezas válidas (descripción, cantidad entera ≥ 1, precio ≥ 0) y mano de obra o al menos una pieza. Después **no se modifica**.
- **Total.** No se guarda: la interfaz lo calcula siempre (mano de obra + cantidad × precio de cada pieza).
- **Historial.** El hook escribe un evento por cada cambio de etapa, en la misma transacción que el cambio, y otro al crear la orden (`de` vacío, `a` = `solicitada`). Por eso no puede haber un cambio sin evento ni un evento sin cambio. Nadie puede crear eventos a mano, editarlos ni borrarlos.
- El cliente de una orden no se puede cambiar.

**Decisión de diseño sobre el historial:** el enunciado dice que "la propia aplicación puede escribir ese registro". Aquí lo escribe el **servidor** (el hook) y la API no deja crear eventos sueltos. Si el navegador pudiera crearlos, alguien podría inventar un historial falso o cambiar la etapa sin dejar rastro; así, cada evento corresponde siempre a un cambio real.

**Ruta propia:** `GET /api/taller/resumen` devuelve cuántas órdenes hay en cada etapa. La usa el panel.

### Coherencia
La interfaz **no guarda copias propias** de los datos: cada pantalla los pide al servidor al abrirse, después de cada acción y cada vez que el usuario vuelve a la pestaña. Si otra persona cambió una orden desde otro navegador, el servidor rechaza la acción vieja, la pantalla muestra el motivo y se recarga. Los filtros de la lista de órdenes viven en la URL (`/ordenes?q=...&estado=...`), así que sobreviven a una recarga.

## Interfaz (React)

### Rutas
| Ruta | Página |
|---|---|
| `/` | Panel: cifras, órdenes por etapa y trabajo pendiente |
| `/ordenes` | Lista con búsqueda (cliente, teléfono o equipo) y filtro por etapa |
| `/ordenes/nueva` | Registrar un equipo (cliente existente o nuevo, fotos) |
| `/ordenes/:id` | **Parámetro de ruta**: detalle, acciones, presupuesto, fotos e historial |
| `/clientes` | Clientes y sus equipos; alta de clientes |
| `*` | Página no encontrada |

Todas cuelgan de `Layout` (cabecera y menú), que las dibuja en su `<Outlet />`: es el **diseño anidado**.

### Estructura
```
cliente/src/
  main.jsx            BrowserRouter alrededor de la app
  App.jsx             definición de rutas
  api.js              todas las peticiones con fetch (solicitar + funciones por recurso)
  etapas.js           textos de etapas, acciones por etapa, cálculo del total
  hooks/useAlVolver.js
  componentes/        Layout, TarjetaOrden, AccionesOrden, FormPresupuesto, Presupuesto,
                      SelectorFotos, GaleriaFotos, Historial, Progreso, EtiquetaEtapa, Aviso
  paginas/            Panel, Ordenes, NuevaOrden, DetalleOrden, Clientes, NoEncontrada
```

### Dónde se usa cada hook y por qué
- **`useState`**: datos de cada pantalla y formularios controlados (nueva orden, presupuesto, nuevo cliente).
- **`useEffect`**:
  - Para pedir datos al servidor. Depende de `[id, version]` en el detalle, para volver a pedir si cambia la URL o hay que recargar. La **limpieza** cancela la petición con `AbortController` si la página se cierra o cambia el `id` antes de que llegue la respuesta.
  - En `useAlVolver`, escucha el evento `focus` de la ventana; la limpieza quita el listener.
  - En `Miniatura` (`SelectorFotos.jsx`), crea la vista previa con `URL.createObjectURL`; la limpieza la libera con `revokeObjectURL`.
- **`useRef`**:
  - Abre y vacía el `<input type="file">` oculto.
  - Pone la vista previa en el `<img>` de `Miniatura`.
  - Guarda en `FormPresupuesto` el contador de claves de las piezas, un valor que no se dibuja.
- **`useCallback`**: solo para `recargar`, porque es **dependencia de un efecto** (`useAlVolver`). Sin él sería una función nueva en cada dibujado y el listener se quitaría y pondría cada vez.
- **`useMemo`**: no se usa. Los filtros recorren unos cientos de órdenes y se calculan al dibujar sin coste apreciable.
- **`useParams`**, **`useNavigate`** y **`useSearchParams`** de React Router: id de la orden, ir al detalle tras crearla y filtros en la URL.

### Peticiones
`api.js` envuelve `fetch` en `solicitar()`:
- Pone `Content-Type: application/json`, salvo con `FormData` (las fotos), donde el navegador lo calcula solo.
- Revisa `response.ok`, porque `fetch` no falla con 400 o 404.
- Convierte los errores de PocketBase en mensajes por campo.

Los `id` se comprueban (15 letras o números) antes de usarlos en un filtro, para que no se pueda inyectar texto.

## Limitaciones conocidas
- Las listas piden hasta 500 registros de una vez, suficiente para un taller pequeño. Con más habría que paginar.
- Sin autenticación (lo pide el enunciado), cualquiera con acceso a la API puede crear clientes y órdenes. Lo que las reglas y los hooks garantizan es que nadie rompa el proceso ni el historial.
