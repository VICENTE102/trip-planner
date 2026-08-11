import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import type { Connect, Plugin } from 'vite'
import type { ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_DIR = resolve(import.meta.dirname, 'api')

// Resuelve una URL /api/... al archivo que la atiende, con las mismas reglas
// de fichero-como-ruta que usa Vercel en producción: primero coincidencia
// exacta (api/trips/generate.ts) y, si no la hay, un segmento dinámico del
// directorio (api/trips/[id].ts), devolviendo el parámetro capturado.
function resolveApiRoute(pathname: string): { file: string; params: Record<string, string> } | null {
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  if (segments.length === 0) return null

  const exact = resolve(API_DIR, `${segments.join('/')}.ts`)
  if (existsSync(exact)) return { file: exact, params: {} }

  const parentDir = resolve(API_DIR, ...segments.slice(0, -1))
  if (!existsSync(parentDir)) return null

  const dynamic = readdirSync(parentDir).find((name) => /^\[.+\]\.ts$/.test(name))
  if (!dynamic) return null

  const paramName = dynamic.slice(1, dynamic.lastIndexOf(']'))
  return {
    file: resolve(parentDir, dynamic),
    params: { [paramName]: segments[segments.length - 1] },
  }
}

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('error', reject)
    req.on('end', () => {
      if (raw.trim() === '') return resolvePromise(undefined)
      try {
        resolvePromise(JSON.parse(raw))
      } catch {
        resolvePromise(undefined)
      }
    })
  })
}

// Las funciones de api/ solo existen en Vercel, así que `npm run dev` a
// secas se quedaba sin backend. Este plugin las ejecuta dentro del propio
// servidor de Vite (mismo código, sin duplicar nada), para poder desarrollar
// con `npm run dev` sin levantar `vercel dev` aparte. Solo se activa en
// desarrollo: en producción sirve Vercel.
function devApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'trip-planner-dev-api',
    apply: 'serve',
    configureServer(server) {
      // Las claves del servidor (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      // no llevan prefijo VITE_, así que Vite no las expone: se cargan aquí
      // en process.env para que la persistencia funcione igual en local.
      // No se sobrescribe nada que ya venga del entorno real.
      for (const [key, value] of Object.entries(env)) {
        if (!key.startsWith('VITE_') && process.env[key] === undefined) {
          process.env[key] = value
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()

        const { pathname, searchParams } = new URL(url, 'http://localhost')
        const route = resolveApiRoute(pathname)
        if (!route) return next()

        try {
          const module = await server.ssrLoadModule(route.file)
          const handler = module.default as (req: unknown, res: unknown) => unknown

          // Vercel entrega el cuerpo ya parseado y la query como objeto
          // plano; se reproduce aquí lo justo que usan los handlers.
          const vercelReq = Object.assign(req, {
            body: await readJsonBody(req),
            query: { ...Object.fromEntries(searchParams), ...route.params },
          })

          const vercelRes = Object.assign(res as ServerResponse, {
            status(code: number) {
              res.statusCode = code
              return vercelRes
            },
            json(payload: unknown) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
              return vercelRes
            },
            send(payload: string) {
              res.end(payload)
              return vercelRes
            },
          })

          await handler(vercelReq, vercelRes)
        } catch (error) {
          server.config.logger.error(`[dev-api] Error en ${pathname}: ${String(error)}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: { code: 'DEV_API_ERROR', message: 'Error del backend en desarrollo. Mira la consola de Vite.' },
              requestId: '',
            }),
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Tercer argumento "" = cargar TODAS las variables de .env*, no solo las
  // que empiezan por VITE_.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), devApiPlugin(env)],
  }
})
