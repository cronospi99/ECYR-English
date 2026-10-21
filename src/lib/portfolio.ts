/**
 * "Mis trabajos" — typed client for the portfolio (supabase/migrations/07_portfolio.sql).
 *
 * Rows live in `public.portfolio_items`; files in the private Storage bucket
 * `portfolio`, under `<user id>/<uuid>-<safe name>`. Row-level security does the
 * real access control (owner + their teacher); everything here is UX-level
 * validation so the user hears about a bad file before it is uploaded.
 */
import type { LucideIcon } from 'lucide-react';
import { Award, ClipboardCheck, File as FileIcon, FolderKanban, Image, Mic, NotebookPen, PenLine } from 'lucide-react';
import { supabase, supabaseConfig } from '@/lib/supabase';

// ------------------------------------------------------------------ types --

export const PORTFOLIO_KINDS = ['writing', 'homework', 'test', 'project', 'certificate', 'audio', 'image', 'other'] as const;
export type PortfolioKind = (typeof PORTFOLIO_KINDS)[number];

export const PORTFOLIO_SKILLS = ['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary'] as const;
export type PortfolioSkill = (typeof PORTFOLIO_SKILLS)[number];

export const PORTFOLIO_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type PortfolioLevel = (typeof PORTFOLIO_LEVELS)[number];

export type ScoreScale = 'percent' | 'band';
export type PortfolioSource = 'upload' | 'migration' | 'import';

export interface PortfolioItem {
  id: string;
  user_id: string;
  kind: PortfolioKind;
  title: string;
  description: string | null;
  level: PortfolioLevel | null;
  skill: PortfolioSkill | null;
  /** ISO date (yyyy-mm-dd) the work was done. */
  done_at: string | null;
  score: number | null;
  score_scale: ScoreScale | null;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  source: PortfolioSource;
  teacher_note: string | null;
  teacher_score: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the owner may set when creating an item. */
export interface PortfolioDraft {
  kind: PortfolioKind;
  title: string;
  description?: string | null;
  level?: PortfolioLevel | null;
  skill?: PortfolioSkill | null;
  done_at?: string | null;
  score?: number | null;
  score_scale?: ScoreScale | null;
  text_content?: string | null;
  source?: PortfolioSource;
}

/** Fields the owner may change afterwards (mirrors the column grant in 07). */
export type PortfolioPatch = Partial<Omit<PortfolioDraft, 'source'>>;

// ------------------------------------------------------------- UI metadata --

export const KIND_INFO: Record<PortfolioKind, { label: string; plural: string; icon: LucideIcon; color: string }> = {
  writing: { label: 'Escrito', plural: 'Escritos', icon: PenLine, color: 'var(--purple)' },
  homework: { label: 'Tarea', plural: 'Tareas', icon: NotebookPen, color: 'var(--blue)' },
  test: { label: 'Examen', plural: 'Exámenes', icon: ClipboardCheck, color: 'var(--red)' },
  project: { label: 'Proyecto', plural: 'Proyectos', icon: FolderKanban, color: 'var(--teal)' },
  certificate: { label: 'Certificado', plural: 'Certificados', icon: Award, color: 'var(--orange)' },
  audio: { label: 'Audio', plural: 'Audios', icon: Mic, color: 'var(--pink)' },
  image: { label: 'Foto', plural: 'Fotos', icon: Image, color: 'var(--green)' },
  other: { label: 'Otro', plural: 'Otros', icon: FileIcon, color: '#8e8e93' },
};

export const SKILL_LABEL: Record<PortfolioSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  grammar: 'Gramática',
  vocabulary: 'Vocabulario',
};

export function formatScore(score: number | null, scale: ScoreScale | null): string | null {
  if (score == null) return null;
  return scale === 'band' ? `Band ${trimNum(score)}` : `${trimNum(score)} %`;
}

export function formatBytes(n: number | null | undefined): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.0', '')} MB`;
}

const trimNum = (n: number) => String(Math.round(n * 10) / 10);

// ------------------------------------------------------------ file checks --

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT_CHARS = 60000;

/** Extension → content type sent to Storage (must be in the bucket's allow-list). */
const EXT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  rtf: 'application/rtf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  mp4: 'video/mp4',
};

const ALLOWED_TYPES = new Set([
  ...Object.values(EXT_TYPES),
  'text/x-markdown',
  'text/rtf',
  'audio/mp3',
  'audio/x-m4a',
  'audio/m4a',
  'audio/x-wav',
  'audio/wave',
  'application/ogg',
  'video/webm',
]);

/** Value for an <input type="file" accept>. */
export const ACCEPT_ATTR = Object.keys(EXT_TYPES)
  .map((e) => '.' + e)
  .join(',');

export const ACCEPT_HUMAN = 'PDF, Word, ODT, TXT, MD, RTF, imágenes (PNG, JPG, WEBP, HEIC), audio (MP3, M4A, WAV, OGG, WEBM) o MP4';

export function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1]!.toLowerCase() : '';
}

export type FileCheck = { ok: true; contentType: string; kind: PortfolioKind | null } | { ok: false; error: string };

/** Size, type and name checks. Browsers often report '' for .md / .heic, so the extension decides. */
export function validatePortfolioFile(file: File): FileCheck {
  if (file.size === 0) return { ok: false, error: 'El archivo está vacío.' };
  if (file.size > MAX_FILE_BYTES)
    return { ok: false, error: `El archivo pesa ${formatBytes(file.size)}; el máximo es 20 MB.` };
  const ext = extOf(file.name);
  const fromExt = EXT_TYPES[ext];
  const reported = file.type.toLowerCase();
  const contentType = ALLOWED_TYPES.has(reported) ? reported : fromExt;
  if (!contentType || (!fromExt && !ALLOWED_TYPES.has(reported)))
    return { ok: false, error: `Este tipo de archivo no se admite. Usa ${ACCEPT_HUMAN}.` };
  return { ok: true, contentType, kind: kindForType(contentType) };
}

export function kindForType(type: string | null | undefined): PortfolioKind | null {
  if (!type) return null;
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/') || type === 'application/ogg') return 'audio';
  return null;
}

/** "Mi Ensayo (final) ñ.docx" → "Mi-Ensayo-final-n.docx": ASCII only, safe as a Storage key. */
export function safeFileName(name: string): string {
  const ext = extOf(name);
  const base = (ext ? name.slice(0, -(ext.length + 1)) : name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/[-.]{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return (base || 'archivo') + (ext ? '.' + ext : '');
}

// -------------------------------------------------------------------- API --

const TABLE = 'portfolio_items';
const BUCKET = 'portfolio';

function client() {
  if (!supabase) throw new Error('Las cuentas no están configuradas en este despliegue.');
  return supabase;
}

/** Turns PostgREST / Storage errors into something a learner can act on. */
function friendly(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e ?? '');
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code === 'PGRST205' || code === '42P01' || (/portfolio_items|bucket not found/i.test(msg) && /not find|not found|does not exist/i.test(msg)))
    return new Error('El servidor aún no tiene "Mis trabajos". Pide al administrador ejecutar supabase/migrations/07_portfolio.sql.');
  if (/object not found/i.test(msg)) return new Error('El archivo ya no existe.');
  if (/payload too large|exceeded the maximum|too large/i.test(msg)) return new Error('El archivo supera el máximo de 20 MB.');
  if (/mime type|invalid_mime|not supported/i.test(msg)) return new Error('Este tipo de archivo no se admite.');
  if (/row-level security|permission denied|42501|not from a student in your class/i.test(msg))
    return new Error('No tienes permiso para hacer esto.');
  if (/band score/i.test(msg)) return new Error('Una banda IELTS va de 0 a 9.');
  if (/between 0 and 100/i.test(msg)) return new Error('La nota va de 0 a 100.');
  if (/failed to fetch|network/i.test(msg)) return new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
  return new Error(msg || fallback);
}

function clean(d: PortfolioPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const str = (v: string | null | undefined) => (v == null ? null : v.trim() || null);
  if (d.kind !== undefined) out.kind = d.kind;
  if (d.title !== undefined) out.title = d.title.trim().slice(0, 200);
  if (d.description !== undefined) out.description = str(d.description)?.slice(0, 2000) ?? null;
  if (d.level !== undefined) out.level = d.level || null;
  if (d.skill !== undefined) out.skill = d.skill || null;
  if (d.done_at !== undefined) out.done_at = d.done_at || null;
  if (d.score !== undefined || d.score_scale !== undefined) {
    const has = d.score != null && Number.isFinite(d.score);
    out.score = has ? d.score : null;
    out.score_scale = has ? (d.score_scale ?? 'percent') : null;
  }
  if (d.text_content !== undefined) {
    const t = d.text_content?.replace(/\s+$/, '') || null;
    if (t && t.length > MAX_TEXT_CHARS) throw new Error(`El texto es demasiado largo (máximo ${MAX_TEXT_CHARS.toLocaleString('es')} caracteres).`);
    out.text_content = t;
  }
  return out;
}

/** All items of one user, newest first. Works for the owner and for their teacher. */
export async function listPortfolio(userId: string): Promise<PortfolioItem[]> {
  const { data, error } = await client().from(TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw friendly(error, 'No se pudieron cargar los trabajos.');
  return (data ?? []).map(normalize);
}

export interface CreateOptions {
  /** 0–1 while the file uploads. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Uploads the file (if any) to `portfolio/<uid>/<uuid>-<safe-name>`, then inserts the row.
 * If the insert fails the uploaded object is removed again, so nothing is orphaned.
 */
export async function createPortfolioItem(draft: PortfolioDraft, file?: File | null, opts: CreateOptions = {}): Promise<PortfolioItem> {
  const sb = client();
  const { data: auth } = await sb.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) throw new Error('Inicia sesión para subir trabajos.');
  if (!draft.title.trim()) throw new Error('Ponle un título a tu trabajo.');

  const row: Record<string, unknown> = { ...clean(draft), user_id: uid, source: draft.source ?? 'upload' };
  let path: string | null = null;

  if (file) {
    const check = validatePortfolioFile(file);
    if (!check.ok) throw new Error(check.error);
    path = `${uid}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    await uploadObject(path, file, check.contentType, auth.session!.access_token, opts);
    Object.assign(row, {
      file_path: path,
      file_name: file.name.slice(0, 255),
      file_type: check.contentType,
      file_size: file.size,
    });
  }

  const { data, error } = await sb.from(TABLE).insert(row).select('*').single();
  if (error) {
    if (path) await sb.storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw friendly(error, 'No se pudo guardar el trabajo.');
  }
  return normalize(data);
}

/** Edits the owner-editable metadata (not the file, not the review). */
export async function updatePortfolioItem(id: string, patch: PortfolioPatch): Promise<PortfolioItem> {
  const body = clean(patch);
  if ('title' in body && !body.title) throw new Error('El título no puede quedar vacío.');
  const { data, error } = await client().from(TABLE).update(body).eq('id', id).select('*').single();
  if (error) throw friendly(error, 'No se pudieron guardar los cambios.');
  return normalize(data);
}

/** Deletes the row, then its file (best effort: a stray object is harmless, a dangling row is not). */
export async function removePortfolioItem(item: Pick<PortfolioItem, 'id' | 'file_path'>): Promise<void> {
  const sb = client();
  const { error } = await sb.from(TABLE).delete().eq('id', item.id);
  if (error) throw friendly(error, 'No se pudo eliminar.');
  if (item.file_path) await sb.storage.from(BUCKET).remove([item.file_path]).catch(() => undefined);
}

/** A 60-minute link to a private file. Pass `download` to force a download with that file name. */
export async function portfolioSignedUrl(path: string, opts: { download?: string | boolean } = {}): Promise<string> {
  const { data, error } = await client()
    .storage.from(BUCKET)
    .createSignedUrl(path, 60 * 60, opts.download ? { download: opts.download } : undefined);
  if (error || !data?.signedUrl) throw friendly(error, 'No se pudo abrir el archivo.');
  return data.signedUrl;
}

/** Batch version for thumbnails: path → 60-minute URL (paths that fail are left out). */
export async function portfolioSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await client().storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw friendly(error, 'No se pudieron cargar las vistas previas.');
  const out: Record<string, string> = {};
  for (const r of data ?? []) if (r.path && r.signedUrl && !r.error) out[r.path] = r.signedUrl;
  return out;
}

/** Teacher review (note and/or score). Both null clears the review. */
export async function reviewPortfolioItem(id: string, note: string | null, score: number | null): Promise<PortfolioItem> {
  const { data, error } = await client().rpc('review_portfolio_item', {
    p_id: id,
    p_note: note?.trim() || null,
    p_score: score != null && Number.isFinite(score) ? score : null,
  });
  if (error) throw friendly(error, 'No se pudo guardar la revisión.');
  return normalize(data);
}

/** Same functions, grouped: `portfolio.list(uid)`, `portfolio.create(item, file)`, … */
export const portfolio = {
  list: listPortfolio,
  create: createPortfolioItem,
  update: updatePortfolioItem,
  remove: removePortfolioItem,
  signedUrl: portfolioSignedUrl,
  signedUrls: portfolioSignedUrls,
  review: reviewPortfolioItem,
};

// ---------------------------------------------------------------- helpers --

function normalize(r: unknown): PortfolioItem {
  const x = r as PortfolioItem;
  // numeric columns arrive as strings from some PostgREST versions
  return {
    ...x,
    score: x.score == null ? null : Number(x.score),
    teacher_score: x.teacher_score == null ? null : Number(x.teacher_score),
  };
}

/**
 * Storage upload via XHR so the sheet can show real progress (supabase-js has
 * no progress callback). Same endpoint and headers supabase-js uses; falls back
 * to supabase-js when the project config is not available.
 */
async function uploadObject(path: string, file: File, contentType: string, token: string, opts: CreateOptions): Promise<void> {
  const sb = client();
  if (!supabaseConfig || typeof XMLHttpRequest === 'undefined') {
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType, upsert: false });
    if (error) throw friendly(error, 'No se pudo subir el archivo.');
    opts.onProgress?.(1);
    return;
  }
  const url = `${supabaseConfig.url.replace(/\/$/, '')}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseConfig!.anonKey);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=3600');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(1);
        resolve();
        return;
      }
      let body: { message?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        /* not JSON */
      }
      const message = xhr.status === 413 ? 'Payload too large' : body.message || body.error || `HTTP ${xhr.status}`;
      reject(friendly({ message }, 'No se pudo subir el archivo.'));
    };
    xhr.onerror = () => reject(friendly({ message: 'network' }, 'No se pudo subir el archivo.'));
    xhr.onabort = () => reject(new Error('Subida cancelada.'));
    opts.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
