// Login e sincronização com o Supabase.
// Sem EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY o app funciona só no aparelho.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { juntarPerfil, type Evento, type Perfil } from './jogo';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chave = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase = url && chave
  ? createClient(url, chave, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' } })
  : null;

// No celular, renova a sessão só com o app aberto
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', s => (s === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
}

const cliente = () => {
  if (!supabase) throw new Error('Nuvem não configurada');
  return supabase;
};

// O e-mail traz um link de entrada (e um código, se o modelo do e-mail tiver {{ .Token }}).
// No navegador, o link volta para esta mesma página, e o Supabase conecta sozinho ao abrir.
export async function enviarCodigo(email: string) {
  const volta = Platform.OS === 'web' ? window.location.origin + window.location.pathname : undefined;
  const { error } = await cliente().auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: volta } });
  if (error) throw error;
}

// Entrar com Google (só no navegador): vai para o Google e volta para esta página já conectado
export async function entrarComGoogle() {
  const { error } = await cliente().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
  if (error) throw error;
}

// O botão do Google só aparece depois que o provedor é ligado no painel do Supabase
export async function googleAtivo(): Promise<boolean> {
  if (Platform.OS !== 'web' || !url || !chave) return false;
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: chave } });
    return !!(await r.json())?.external?.google;
  } catch {
    return false;
  }
}

// Link de entrada vencido ou já usado: o Supabase volta com o erro no endereço. Limpa o endereço e explica.
export function erroDoLink(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
  const codigo = p.get('error_code') ?? p.get('error');
  if (!codigo) return null;
  window.history.replaceState(window.history.state, '', window.location.pathname);
  return /expired/i.test(codigo + (p.get('error_description') ?? ''))
    ? 'O link de entrada venceu ou já foi usado. Peça outro em Conta > Entrar.'
    : 'Não deu para entrar com esse link. Peça outro em Conta > Entrar.';
}

export async function confirmarCodigo(email: string, codigo: string) {
  const { error } = await cliente().auth.verifyOtp({ email, token: codigo, type: 'email' });
  if (error) throw error;
}

export async function sair() {
  await cliente().auth.signOut();
}

export function mensagemErro(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  if (/rate limit|too many|security purposes/i.test(m)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if (/email.*invalid|invalid.*email/i.test(m)) return 'Confira se o e-mail está certo.';
  if (/expired|invalid|token/i.test(m)) return 'Código errado ou vencido. Confira o e-mail ou peça um novo código.';
  if (/fetch|network/i.test(m)) return 'Sem conexão com a internet.';
  return `Não deu certo: ${m}`;
}

async function baixarPerfil(): Promise<Perfil | null> {
  const { data, error } = await cliente().from('perfis').select('nome, criado_em, look, casa, cor, atualizado_em').maybeSingle();
  if (error) throw error;
  return data ? { nome: data.nome, criadoEm: Number(data.criado_em), atualizadoEm: Number(data.atualizado_em), look: data.look, casa: data.casa ?? undefined, cor: data.cor ?? undefined } : null;
}

async function enviarPerfil(userId: string, p: Perfil) {
  const { error } = await cliente().from('perfis').upsert({ user_id: userId, nome: p.nome, criado_em: p.criadoEm, atualizado_em: p.atualizadoEm, look: p.look, casa: p.casa ?? null, cor: p.cor ?? null });
  if (error) throw error;
}

async function enviarEventos(userId: string, eventos: Evento[]) {
  for (let i = 0; i < eventos.length; i += 500) {
    const linhas = eventos.slice(i, i + 500).map(({ id, ...dados }) => ({ id, user_id: userId, dados }));
    const { error } = await cliente().from('eventos').upsert(linhas, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }
}

// Baixa o que chegou ao servidor desde o último cursor (hora em que o servidor recebeu)
async function baixarEventos(desde: string | null) {
  const eventos: Evento[] = [];
  let cursor = desde;
  for (;;) {
    let q = cliente().from('eventos').select('id, dados, recebido_em').order('recebido_em', { ascending: true }).limit(1000);
    if (cursor) q = q.gte('recebido_em', cursor);
    const { data, error } = await q;
    if (error) throw error;
    const novos = data.filter(r => !eventos.some(e => e.id === r.id));
    eventos.push(...novos.map(r => ({ ...r.dados, id: r.id }) as Evento));
    if (data.length) cursor = data[data.length - 1].recebido_em;
    if (data.length < 1000 || !novos.length) break;
  }
  return { eventos, cursor };
}

export type Local = { perfil: Perfil | null; eventos: Evento[]; pendentes: string[]; cursor: string | null };
export type Resultado = { enviados: string[]; recebidos: Evento[]; perfil: Perfil | null; cursor: string | null };

export async function sincronizar(userId: string, local: Local): Promise<Resultado> {
  const pendentes = new Set(local.pendentes);
  const paraEnviar = local.eventos.filter(e => pendentes.has(e.id));
  await enviarEventos(userId, paraEnviar);

  const remoto = await baixarPerfil();
  const perfil = juntarPerfil(local.perfil, remoto);
  if (perfil && (!remoto || remoto.atualizadoEm !== perfil.atualizadoEm || remoto.criadoEm !== perfil.criadoEm)) await enviarPerfil(userId, perfil);

  const { eventos, cursor } = await baixarEventos(local.cursor);
  const conhecidos = new Set(local.eventos.map(e => e.id));
  return { enviados: paraEnviar.map(e => e.id), recebidos: eventos.filter(e => !conhecidos.has(e.id)), perfil, cursor };
}

export async function apagarNuvem(userId: string) {
  const a = await cliente().from('eventos').delete().eq('user_id', userId);
  if (a.error) throw a.error;
  const b = await cliente().from('perfis').delete().eq('user_id', userId);
  if (b.error) throw b.error;
}
