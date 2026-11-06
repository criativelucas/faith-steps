// Rádio gospel ao vivo. As estações vêm do diretório aberto Radio Browser (radio-browser.info): gospel do Brasil,
// só endereços https (o app roda em https) e que passaram na última checagem. Se uma estação não toca, vai para a próxima.
export type Estacao = { nome: string; url: string };
export type EstadoRadio = { estado: 'carregando' | 'tocando' | 'erro'; estacao?: Estacao };

const SERVIDORES = ['https://de1.api.radio-browser.info', 'https://nl1.api.radio-browser.info', 'https://at1.api.radio-browser.info'];
const BUSCA = '/json/stations/search?tag=gospel&countrycode=BR&hidebroken=true&order=clickcount&reverse=true&limit=40';
// Reserva se o diretório estiver fora do ar
const RESERVA: Estacao[] = [
  { nome: 'Rádio Melodia 97.5 FM', url: 'https://26573.live.streamtheworld.com/MELODIAFMAAC.aac' },
  { nome: 'MGT Gospel', url: 'https://cast.mgtradio.net/radio/8040/aac' },
  { nome: 'Rádio Gospel Hits', url: 'https://webradio.bsoundradio.com.br/listen/gospelhits/live' },
];

type Registro = { name: string; url_resolved: string; lastcheckok: number };
export function filtrarEstacoes(lista: Registro[]): Estacao[] {
  const vistas = new Set<string>();
  return lista
    .filter(r => r.lastcheckok === 1 && r.url_resolved?.startsWith('https://'))
    .map(r => ({ nome: r.name.trim().replace(/\s+/g, ' ').slice(0, 48), url: r.url_resolved }))
    .filter(e => e.nome && !vistas.has(e.url) && vistas.add(e.url));
}

let cache: Promise<Estacao[]> | null = null;
async function buscarEstacoes(): Promise<Estacao[]> {
  for (const s of SERVIDORES) {
    try {
      const r = await fetch(s + BUSCA, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const lista = filtrarEstacoes(await r.json());
      if (lista.length) return lista;
    } catch { /* tenta o próximo servidor */ }
  }
  return RESERVA;
}

export class RadioGospel {
  private audio?: HTMLAudioElement;
  private estacoes: Estacao[] = [];
  private indice = 0;
  private tentativas = 0;
  private volume = 0.5;
  private ligado = false;
  private avisar: (e: EstadoRadio | null) => void;
  constructor(avisar: (e: EstadoRadio | null) => void) { this.avisar = avisar; }

  async ligar() {
    this.ligado = true;
    this.avisar({ estado: 'carregando' });
    this.estacoes = await (cache ??= buscarEstacoes().catch(() => RESERVA));
    if (!this.ligado) return;
    this.tentativas = 0;
    this.tocar();
  }
  proxima() {
    if (!this.estacoes.length) return;
    this.indice = (this.indice + 1) % this.estacoes.length;
    this.tentativas = 0;
    this.tocar();
  }
  private tocar() {
    const estacao = this.estacoes[this.indice];
    if (!estacao) { this.avisar({ estado: 'erro' }); return; }
    this.soltarAudio();
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = this.volume;
    this.audio = audio;
    this.avisar({ estado: 'carregando', estacao });
    const falhou = () => {
      if (this.audio !== audio || !this.ligado) return;
      // Pula estações quebradas; desiste depois de passar por várias
      if (++this.tentativas >= Math.min(8, this.estacoes.length)) { this.soltarAudio(); this.avisar({ estado: 'erro', estacao }); return; }
      this.indice = (this.indice + 1) % this.estacoes.length;
      this.tocar();
    };
    audio.addEventListener('playing', () => { if (this.audio === audio) { this.tentativas = 0; this.avisar({ estado: 'tocando', estacao }); } });
    audio.addEventListener('error', falhou);
    audio.src = estacao.url;
    audio.play().catch(e => { if ((e as DOMException)?.name !== 'AbortError') falhou(); });
  }
  ajustar(volume: number) { this.volume = Math.max(0, Math.min(1, volume)); if (this.audio) this.audio.volume = this.volume; }
  pausar(pausa: boolean) {
    if (!this.audio || !this.ligado) return;
    if (pausa) this.audio.pause(); else void this.audio.play().catch(() => {});
  }
  private soltarAudio() {
    if (!this.audio) return;
    const a = this.audio; this.audio = undefined;
    a.pause(); a.removeAttribute('src'); a.load();
  }
  desligar() { this.ligado = false; this.soltarAudio(); this.avisar(null); }
}
