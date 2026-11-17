// Pruebas de las garantías del servidor, hablando directo con la API (sin la interfaz).
// Uso: con PocketBase recién arrancado y los datos de prueba, ejecutar desde la raíz del repo:
//   node pruebas/garantias.mjs
// Necesita Node 18 o superior (trae fetch). Modifica datos: úsalo sobre una base recién creada.

const B = (process.env.PB_URL ?? 'http://127.0.0.1:8090') + '/api/collections';
let ok = 0, mal = 0;
const check = (n, c, x = '') => { c ? ok++ : mal++; console.log((c ? 'OK  ' : 'MAL ') + n + (x ? '  -> ' + x : '')); };
async function req(method, url, body, isForm) {
  const r = await fetch(url.startsWith('http') ? url : B + url, { method, headers: body && !isForm ? { 'Content-Type': 'application/json' } : {}, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const t = await r.text(); let d = null; try { d = JSON.parse(t) } catch {}
  return { s: r.status, d };
}
const msg = (r) => r.s + ' ' + (r.d?.message || '') + (r.d?.data && Object.keys(r.d.data).length ? ' ' + JSON.stringify(r.d.data) : '');
const ordenes = (await req('GET', '/ordenes/records?perPage=100')).d.items;
const por = (eq) => ordenes.find((o) => o.equipo.startsWith(eq));
const cli = (await req('GET', '/clientes/records')).d.items[0];

// Crear
let r = await req('POST', '/ordenes/records', { cliente: cli.id, equipo: 'Radio', problema: 'No suena', estado: 'entregada' });
check('crear en entregada -> 400', r.s === 400, msg(r));
r = await req('POST', '/ordenes/records', { cliente: cli.id, equipo: 'Radio', problema: 'No suena', manoObra: 50 });
check('crear con presupuesto -> 400', r.s === 400, msg(r));
r = await req('POST', '/ordenes/records', { cliente: cli.id, equipo: 'Radio', problema: 'No suena' });
check('crear sin estado -> solicitada', r.s === 200 && r.d.estado === 'solicitada', msg(r));
const nueva = r.d;
let ev = (await req('GET', `/eventos/records?filter=${encodeURIComponent(`orden="${nueva.id}"`)}`)).d;
check('evento de creacion', ev.totalItems === 1 && ev.items[0].a === 'solicitada' && ev.items[0].de === '');
r = await req('POST', '/ordenes/records', { equipo: 'X', problema: 'Y' });
check('crear sin cliente -> 400', r.s === 400, msg(r));

// Saltos
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'presupuestada' });
check('saltar solicitada->presupuestada -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'lista' });
check('saltar solicitada->lista -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'inventado' });
check('estado inexistente -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { diagnostico: 'algo' });
check('presupuesto fuera de etapa -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'en_diagnostico' });
check('solicitada->en_diagnostico ok', r.s === 200, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'cancelada' });
check('cancelar en diagnostico -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'presupuestada' });
check('presupuestar sin diagnostico -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'presupuestada', diagnostico: 'Altavoz roto', manoObra: 0, piezas: [] });
check('presupuesto vacio -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'presupuestada', diagnostico: 'Altavoz roto', manoObra: 5, piezas: [{ descripcion: 'Altavoz', cantidad: 0, precio: 3 }] });
check('pieza cantidad 0 -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'presupuestada', diagnostico: 'Altavoz roto', manoObra: 5, piezas: { a: 1 } });
check('piezas no lista -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'presupuestada', diagnostico: 'Altavoz roto', manoObra: -1, piezas: [] });
check('manoObra negativa -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'presupuestada', diagnostico: 'Altavoz roto', manoObra: 5, piezas: [{ descripcion: 'Altavoz 4 ohm', cantidad: 2, precio: 3.5 }] });
check('presupuestar ok', r.s === 200 && r.d.piezas.length === 1, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { manoObra: 1 });
check('cambiar manoObra luego -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { piezas: [] });
check('cambiar piezas luego -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'en_reparacion' });
check('presupuestada->en_reparacion -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'aprobada' });
check('aprobar ok', r.s === 200, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'rechazada' });
check('aprobada->rechazada -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { cliente: (await req('GET', '/clientes/records')).d.items[1].id });
check('cambiar cliente -> 400', r.s === 400, msg(r));
for (const e of ['en_reparacion', 'lista', 'entregada']) { r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: e }); check('-> ' + e, r.s === 200, msg(r)); }
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { problema: 'otro' });
check('editar entregada -> 400', r.s === 400, msg(r));
r = await req('PATCH', `/ordenes/records/${nueva.id}`, { estado: 'lista' });
check('volver atras -> 400', r.s === 400, msg(r));
ev = (await req('GET', `/eventos/records?sort=created&filter=${encodeURIComponent(`orden="${nueva.id}"`)}`)).d;
check('historial completo: creación + 6 cambios = 7 eventos', ev.totalItems === 7, ev.items.map((x) => x.a).join(','));

// Cancelar y rechazar
// Orden nueva para cancelar (así el script se puede repetir sin reiniciar la base)
const tablet = (await req('POST', '/ordenes/records', { cliente: cli.id, equipo: 'Tablet de prueba', problema: 'Para cancelar' })).d;
r = await req('PATCH', `/ordenes/records/${tablet.id}`, { estado: 'cancelada' });
check('cancelar solicitada ok', r.s === 200, msg(r));
r = await req('PATCH', `/ordenes/records/${tablet.id}`, { estado: 'en_diagnostico' });
check('reabrir cancelada -> 400', r.s === 400, msg(r));
const dell = por('Laptop Dell');
r = await req('PATCH', `/ordenes/records/${dell.id}`, { estado: 'aprobada' });
check('aprobar rechazada -> 400', r.s === 400, msg(r));

// Borrar / eventos
r = await req('DELETE', `/ordenes/records/${nueva.id}`);
check('borrar orden -> 403', r.s === 403 || r.s === 404, msg(r));
r = await req('DELETE', `/clientes/records/${cli.id}`);
check('borrar cliente -> 403', r.s === 403 || r.s === 404, msg(r));
const e0 = ev.items[0];
r = await req('POST', '/eventos/records', { orden: nueva.id, de: 'lista', a: 'entregada' });
check('crear evento a mano -> 403', r.s === 403 || r.s === 400, msg(r));
r = await req('PATCH', `/eventos/records/${e0.id}`, { a: 'cancelada' });
check('editar evento -> 403', r.s === 403 || r.s === 404, msg(r));
r = await req('DELETE', `/eventos/records/${e0.id}`);
check('borrar evento -> 403', r.s === 403 || r.s === 404, msg(r));

// Fotos
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
let f = new FormData(); f.append('cliente', cli.id); f.append('equipo', 'Cámara'); f.append('problema', 'No enfoca');
for (let i = 0; i < 4; i++) f.append('fotos', new Blob([png], { type: 'image/png' }), `f${i}.png`);
r = await req('POST', '/ordenes/records', f, true);
check('4 fotos -> 400', r.s === 400, msg(r));
f = new FormData(); f.append('cliente', cli.id); f.append('equipo', 'Cámara'); f.append('problema', 'No enfoca');
f.append('fotos', new Blob(['hola'], { type: 'text/plain' }), 'x.txt');
r = await req('POST', '/ordenes/records', f, true);
check('foto no imagen -> 400', r.s === 400, msg(r));
f = new FormData(); f.append('cliente', cli.id); f.append('equipo', 'Cámara'); f.append('problema', 'No enfoca');
for (let i = 0; i < 2; i++) f.append('fotos', new Blob([png], { type: 'image/png' }), `f${i}.png`);
r = await req('POST', '/ordenes/records', f, true);
check('2 fotos ok', r.s === 200 && r.d.fotos.length === 2, msg(r));
const img = await fetch(B.replace('/collections', '') + `/files/ordenes/${r.d.id}/${r.d.fotos[0]}?thumb=120x120`);
check('servir foto', img.status === 200, img.headers.get('content-type'));

const res = await (await fetch(B.replace('/collections', '/taller/resumen'))).json();
const totalReal = (await req('GET', '/ordenes/records?perPage=1')).d.totalItems;
check('ruta propia /api/taller/resumen', res.total === totalReal && Object.values(res.porEstado).reduce((a, b) => a + b, 0) === totalReal, JSON.stringify(res));
console.log(`\n${ok} OK, ${mal} MAL`);
