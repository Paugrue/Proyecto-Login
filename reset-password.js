// reset-password.js
import { supabase } from './src/supabaseClient.js'   // <-- ruta relativa a tu proyecto

const form   = document.getElementById('reset-form')
const status = document.getElementById('status')
const help   = document.getElementById('help')
const submit = document.getElementById('submit')

function show(el, yes = true) { el.classList.toggle('hidden', !yes) }
function ok(msg)  { status.textContent = msg; status.className = 'alert ok'; show(status, true); console.log('[RESET] OK:', msg) }
function err(msg) { status.textContent = msg; status.className = 'alert err'; show(status, true); console.error('[RESET] ERROR:', msg) }

console.log('[RESET] Página cargada:', window.location.href)

// --- Detectar parámetros de la URL ---
const url       = new URL(window.location.href)
const code      = url.searchParams.get('code')                 // PKCE
const tokenHash = url.searchParams.get('token_hash')           // verifyOtp
const type      = url.searchParams.get('type')                 // se espera 'recovery'
const debug     = url.searchParams.get('debug') === '1'        // modo debug opcional

console.log('[RESET] Params -> code:', !!code, ' token_hash:', !!tokenHash, ' type:', type, ' debug:', debug)

// --- Intercambiar/Verificar para crear sesión de recuperación ---
async function ensureRecoverySession() {
  try {
    if (code) {
      console.log('[RESET] Intercambiando code por sesión (exchangeCodeForSession)...')
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) throw error
      console.log('[RESET] Sesión creada por PKCE')
      return true
    }

    if (tokenHash && type === 'recovery') {
      console.log('[RESET] Verificando token_hash con verifyOtp...')
      const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
      if (error) throw error
      console.log('[RESET] Sesión de recuperación verificada')
      return true
    }

    // Si ya hay sesión (por recarga), también sirve
    const { data: { session } } = await supabase.auth.getSession()
    console.log('[RESET] ¿Sesión previa existente?:', !!session)
    return !!session
  } catch (e) {
    err('No se pudo activar la sesión de recuperación: ' + (e.message || 'error desconocido'))
    console.error(e)
    return false
  }
}

// --- Mostrar formulario cuando exista sesión de recuperación ---
async function tryShowForm() {
  if (debug) {
    console.warn('[RESET] DEBUG=1: mostrando formulario sin sesión de recuperación (solo para pruebas).')
    show(form, true)
    show(help, false)
    return
  }

  const okSession = await ensureRecoverySession()
  if (okSession) {
    show(form, true)
    show(help, false)
    console.log('[RESET] Formulario visible')
  } else {
    show(help, true)
    console.log('[RESET] NO hay sesión de recuperación; mostrando ayuda')
  }
}

// --- Escuchar eventos por si llegan después ---
supabase.auth.onAuthStateChange(async (event) => {
  console.log('[RESET] onAuthStateChange:', event)
  if (event === 'PASSWORD_RECOVERY') {
    show(form, true)
    show(help, false)
  }
})

// --- Arrancar ---
tryShowForm()

// --- Enviar nueva contraseña ---
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  show(status, false)

  const password = document.getElementById('password').value.trim()
  const confirm  = document.getElementById('confirm').value.trim()

  if (password.length < 8) { err('La contraseña debe tener al menos 8 caracteres.'); return }
  if (password !== confirm) { err('Las contraseñas no coinciden.'); return }

  submit.disabled = true
  console.log('[RESET] Llamando a updateUser()...')
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    err('Error al actualizar la contraseña: ' + (error.message || 'desconocido'))
    submit.disabled = false
    return
  }

  ok('¡Contraseña actualizada! Ya puedes iniciar sesión con tu nueva contraseña.')
  form.reset()
  submit.disabled = false
  show(form, false)
})