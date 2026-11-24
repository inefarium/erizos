const TIPOS = new Set([
  'bola', 'estrella', 'campana', 'copo', 'regalo',
  'lazo', 'caramelo', 'galleta', 'pina', 'vela'
]);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept'
};

function respuesta(datos, estado = 200) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, CORS)
  });
}

function numero(valor, minimo, maximo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return Math.min(Math.max(numero, minimo), maximo);
}

function mapear(fila) {
  return {
    id: fila.id,
    tipo: fila.tipo,
    color: fila.color,
    x: fila.pos_x,
    y: fila.pos_y,
    z: fila.pos_z,
    rotY: fila.rot_y,
    rotZ: fila.rot_z,
    escala: fila.escala,
    creado: fila.creado
  };
}

function validarAdorno(valor) {
  if (!valor || typeof valor !== 'object') return { error: 'Adorno no valido' };
  const tipo = String(valor.tipo || '').trim();
  if (!TIPOS.has(tipo)) return { error: 'Tipo de adorno no valido' };

  const idOriginal = String(valor.id || '').trim();
  const id = /^[A-Za-z0-9_-]{4,90}$/.test(idOriginal) ? idOriginal : crypto.randomUUID();
  const color = /^#[0-9a-f]{6}$/i.test(String(valor.color || ''))
    ? String(valor.color).toLowerCase()
    : '#ffcf7a';

  const x = numero(valor.x, -2.5, 2.5);
  const y = numero(valor.y, -2, 2.5);
  const z = numero(valor.z, -2.5, 2.5);
  const rotY = numero(valor.rotY, -Math.PI * 4, Math.PI * 4);
  const rotZ = numero(valor.rotZ, -Math.PI * 4, Math.PI * 4);
  const escala = numero(valor.escala, 0.3, 3);

  if ([x, y, z, rotY, rotZ, escala].some((dato) => dato === null)) {
    return { error: 'Coordenadas no validas' };
  }

  const creado = typeof valor.creado === 'string' && !Number.isNaN(Date.parse(valor.creado))
    ? valor.creado
    : new Date().toISOString();

  return {
    adorno: {
      id: id,
      tipo: tipo,
      color: color,
      x: x,
      y: y,
      z: z,
      rotY: rotY,
      rotZ: rotZ,
      escala: escala,
      creado: creado
    }
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const ruta = url.pathname.replace(/\/+$/, '') || '/';

    if (ruta === '/salud' && request.method === 'GET') {
      return respuesta({ ok: true, servicio: 'navidad-chamoys' });
    }

    if (ruta !== '/adornos') {
      return respuesta({ error: 'No encontrado' }, 404);
    }

    if (!env || !env.DB) {
      return respuesta({ error: 'D1 no configurado' }, 500);
    }

    if (request.method === 'GET') {
      try {
        const resultado = await env.DB.prepare(
          'SELECT id, tipo, color, pos_x, pos_y, pos_z, rot_y, rot_z, escala, creado FROM adornos ORDER BY creado ASC, id ASC'
        ).all();
        const filas = resultado && Array.isArray(resultado.results) ? resultado.results : [];
        return respuesta({ adornos: filas.map(mapear) });
      } catch (error) {
        return respuesta({ error: 'No se pudieron leer los adornos' }, 500);
      }
    }

    if (request.method === 'POST') {
      let cuerpo;
      try {
        cuerpo = await request.json();
      } catch (error) {
        return respuesta({ error: 'JSON no valido' }, 400);
      }

      const entrada = cuerpo && cuerpo.adorno && typeof cuerpo.adorno === 'object' ? cuerpo.adorno : cuerpo;
      const validacion = validarAdorno(entrada);
      if (validacion.error) return respuesta({ error: validacion.error }, 400);
      const adorno = validacion.adorno;

      try {
        await env.DB.prepare(
          `INSERT INTO adornos (id, tipo, color, pos_x, pos_y, pos_z, rot_y, rot_z, escala, creado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             tipo = excluded.tipo,
             color = excluded.color,
             pos_x = excluded.pos_x,
             pos_y = excluded.pos_y,
             pos_z = excluded.pos_z,
             rot_y = excluded.rot_y,
             rot_z = excluded.rot_z,
             escala = excluded.escala`
        ).bind(
          adorno.id,
          adorno.tipo,
          adorno.color,
          adorno.x,
          adorno.y,
          adorno.z,
          adorno.rotY,
          adorno.rotZ,
          adorno.escala,
          adorno.creado
        ).run();
        return respuesta({ adorno: adorno }, 201);
      } catch (error) {
        return respuesta({ error: 'No se pudo guardar el adorno' }, 500);
      }
    }

    return respuesta({ error: 'Metodo no permitido' }, 405);
  }
};
