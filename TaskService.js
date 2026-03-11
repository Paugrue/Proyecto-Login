// src/TaskService.js
import { supabase } from './src/supabaseClient'

/**
 * Servicio unificado para tareas.
 * - Mantiene compatibilidad con tus métodos existentes (getAll, getAllAdmin, create, updateTitle, updateStatus, delete).
 * - Añade métodos nuevos para las nuevas páginas (getMine, getAllWithOwner, updateDescription, toggleDone, createV2).
 *
 * NOTAS DE ESQUEMA:
 * - Si aún no lo hiciste, añade a tasks:
 *     alter table public.tasks
 *       add column if not exists description text,
 *       add column if not exists done boolean not null default false;
 * - Si vas a usar la página “todas las tareas” con nombre del creador, crea la VIEW:
 *     create or replace view public.tasks_with_owner as
 *     select t.id,t.title,t.description,t.done,t.file_url,t.created_at,t.user_id,
 *            coalesce(p.full_name, 'Usuario ' || left(t.user_id::text,8)) as owner_name
 *     from public.tasks t
 *     left join public.profiles p on p.id = t.user_id;
 */
export class TaskService {
  /* --------------------------
   * LISTADOS GENERALES
   * -------------------------- */

  static async getAll() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  static async getAllAdmin() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  /* --------------------------
   * NUEVAS VISTAS / RUTAS
   * -------------------------- */

  // “Mis tareas” (por usuario)
  static async getMine(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id,title,description,done,file_url,created_at,user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  // “Todas las tareas” con nombre del creador (lee la VIEW tasks_with_owner)
  static async getAllWithOwner() {
    const { data, error } = await supabase
      .from('tasks_with_owner')
      .select('id,title,description,done,file_url,created_at,user_id,owner_name')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  /* --------------------------
   * CREAR
   * -------------------------- */

  // Mantiene tu create (añadí param opcional description para facilitar)
  static async create(title, userId, fileUrl = null, description = null) {
    const payload = { title, user_id: userId, file_url: fileUrl }
    if (description !== null && description !== undefined) payload.description = description

    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return data
  }

  // Variante por objeto
  static async createV2({ title, description = null, user_id, file_url = null }) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, description, user_id, file_url }])
      .select()
      .single()
    if (error) throw error
    return data
  }

  /* --------------------------
   * EDITAR
   * -------------------------- */

  static async updateTitle(taskId, newTitle) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ title: newTitle })
      .eq('id', taskId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // Nueva: editar descripción
  static async updateDescription(taskId, newDescription) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ description: newDescription })
      .eq('id', taskId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // Nueva: marcar “realizada” (columna moderna `done`)
  static async toggleDone(taskId, done) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ done })
      .eq('id', taskId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // Compatibilidad: si aún usas `is_completed` en alguna parte de tu UI
  static async updateStatus(taskId, isCompleted) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_completed: isCompleted })
      .eq('id', taskId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  /* --------------------------
   * BORRAR
   * -------------------------- */

  static async delete(taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
    if (error) throw error
  }
}