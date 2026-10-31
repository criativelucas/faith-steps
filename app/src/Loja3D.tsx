'use dom';
// Loja 3D no estilo The Sims Mobile: vitrine 3D interativa para experimentar roupas e fantasias
// no próprio boneco 3D, miniaturas 3D geradas em tempo real (sem o boneco 2D antigo) e catálogo completo.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { type Look } from './personagem';
import { criarBoneco, type Boneco } from './boneco3d';
import { tingirSvg } from './cores';
import {
  LOJA, servePara,
  type Acabamento, type AtividadeId, type Item, type Mobilia,
} from './jogo';
import { itemExtraSvg, movelSvg, revestimentoSvg } from './casa';
import { icone } from './icones';
import { montarItemLoja3D, enquadrarItemLoja3D } from './modelos3DLoja';

type Props = {
  abaInicial: Item['tipo'];
  look: Look;
  forma: number;
  humor: string;
  nivel: number;
  talentos: number;
  itens: string[];
  mobilia: Mobilia[];
  acabamentos: Record<string, Acabamento>;
  cor: string;
  onComprar: (itemId: string) => Promise<void>;
  onVestir: (itemId: string) => Promise<void>;
  onDecorar: () => Promise<void>;
  onIrComodo: (comodoId: string) => Promise<void>;
  onAbrirAtividade: (atividadeId: AtividadeId) => Promise<void>;
  onVersiculo: () => Promise<void>;
  onFechar: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

const ABAS: { id: Item['tipo']; nome: string; icone: string }[] = [
  { id: 'roupa', nome: 'Roupas', icone: 'cabide' },
  { id: 'fantasia', nome: 'Fantasias', icone: 'acao' },
  { id: 'movel', nome: 'Móveis', icone: 'construir' },
  { id: 'papel', nome: 'Paredes', icone: 'casa' },
  { id: 'piso', nome: 'Pisos', icone: 'camadas' },
  { id: 'comodo', nome: 'Cômodos', icone: 'quarto' },
  { id: 'atividade', nome: 'Atividades', icone: 'missao' },
  { id: 'funcao', nome: 'Funções', icone: 'versiculo' },
];

// Cache em memória das miniaturas 3D para abrir e trocar de aba instantaneamente
const CACHE_MINIATURAS = new Map<string, string>();

function chaveVisualBase(look: Look, forma: number): string {
  return JSON.stringify({
    corpo: look.corpo, pele: look.pele, rosto: look.rosto, olhos: look.olhos, corOlhos: look.corOlhos,
    sobrancelha: look.sobrancelha, nariz: look.nariz, cabelo: look.cabelo, corCabelo: look.corCabelo,
    barba: look.barba, oculos: look.oculos, moletom: look.moletom,
    corTopo: look.corTopo, corBaixo: look.corBaixo, corCalcado: look.corCalcado,
    forma: Math.round(forma),
  });
}

function vestindoItem(look: Look, item: Item): boolean {
  if (item.tipo === 'fantasia') return look.fantasia === item.id;
  if (item.peca) {
    const padrao = { topo: 'moletom', baixo: 'calca', calcado: 'tenis' }[item.peca];
    return !look.fantasia && (look[item.peca] ?? padrao) === item.id;
  }
  return false;
}

function lookParaVitrine(look: Look, item: Item | null): Look {
  if (!item || (item.tipo !== 'roupa' && item.tipo !== 'fantasia')) return look;
  if (item.tipo === 'fantasia') return { ...look, fantasia: item.id };
  if (item.peca === 'topo') return { ...look, fantasia: undefined, topo: item.id as Look['topo'] };
  if (item.peca === 'baixo') {
    const topoAtual = look.topo ?? 'moletom';
    const topo = topoAtual === 'vestido' || topoAtual === 'vestidoLongo' ? 'camiseta' : topoAtual;
    return { ...look, fantasia: undefined, topo, baixo: item.id as Look['baixo'] };
  }
  if (item.peca === 'calcado') {
    const topoAtual = look.topo ?? 'moletom';
    const baixoAtual = look.baixo ?? 'calca';
    const topo = topoAtual === 'vestidoLongo' ? 'vestido' : topoAtual;
    const baixo = baixoAtual === 'saiaLonga' ? 'saia' : baixoAtual;
    return { ...look, fantasia: undefined, topo, baixo, calcado: item.id as Look['calcado'] };
  }
  return look;
}

function lookParaMiniatura(look: Look, item: Item): Look {
  if (item.tipo === 'fantasia') return { ...look, fantasia: item.id };
  if (item.peca === 'topo') return { ...look, fantasia: undefined, topo: item.id as Look['topo'] };
  if (item.peca === 'baixo') {
    const topoAtual = look.topo ?? 'moletom';
    const topo = topoAtual === 'vestido' || topoAtual === 'vestidoLongo' ? 'camiseta' : topoAtual;
    return { ...look, fantasia: undefined, topo, baixo: item.id as Look['baixo'] };
  }
  if (item.peca === 'calcado') {
    const baixo = look.corpo === 'feminino' ? 'saia' : 'bermuda';
    return { ...look, fantasia: undefined, topo: 'camiseta', baixo, calcado: item.id as Look['calcado'] };
  }
  return look;
}

function enquadrarMiniatura(item: Item): { alvoY: number; meiaAltura: number; giro: number; elev: number } {
  if (item.tipo === 'fantasia') return { alvoY: 0.85, meiaAltura: 0.94, giro: 0.46, elev: 0.08 };
  if (item.peca === 'topo') {
    if (item.id === 'vestido' || item.id === 'vestidoLongo') return { alvoY: 0.62, meiaAltura: 0.58, giro: 0.38, elev: 0.08 };
    return { alvoY: 1.0, meiaAltura: 0.42, giro: 0.38, elev: 0.08 };
  }
  if (item.peca === 'baixo') return { alvoY: 0.43, meiaAltura: 0.43, giro: 0.42, elev: 0.1 };
  return { alvoY: 0.12, meiaAltura: 0.2, giro: 0.64, elev: 0.2 };
}

function LogoLoja({ largo }: { largo: boolean }) {
  const fonte = 'Archivo_700Bold, system-ui, -apple-system, sans-serif';
  const fonteTitulo = 'Archivo_600SemiBold, Archivo_600SemiBold, system-ui, sans-serif';
  const fonteRegular = 'Archivo_600SemiBold, system-ui, -apple-system, sans-serif';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: largo ? 12 : 8, minWidth: 0 }}>
      {/* Emblema Sims Plumbob + Cruz da Fé + Boutique */}
      <div
        style={{
          width: largo ? 46 : 38,
          height: largo ? 46 : 38,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #1C6E5C 0%, #0E4237 100%)',
          border: '2px solid rgba(255,255,255,0.92)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.28), inset 0 1px 2px rgba(255,255,255,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width={largo ? 30 : 25} height={largo ? 30 : 25} viewBox="0 0 48 48" fill="none">
          {/* Plumbob / Diamante lapidado */}
          <polygon points="24,3 39,20 24,45 9,20" fill="url(#gradDiamanteLoja)" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
          <polygon points="24,3 24,45 9,20" fill="rgba(0,0,0,0.18)" />
          <polygon points="24,3 39,20 24,20" fill="rgba(255,255,255,0.32)" />
          {/* Cruz Dourada Central Iluminada */}
          <path d="M24 10 V33 M16 18 H32" stroke="#FFE769" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M24 10 V33 M16 18 H32" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
          {/* Brilho estrela no ápice */}
          <circle cx="36" cy="11" r="2.2" fill="#FFFBE3" />
          <defs>
            <linearGradient id="gradDiamanteLoja" x1="9" y1="3" x2="39" y2="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7EFF98" />
              <stop offset="50%" stopColor="#3BD66F" />
              <stop offset="100%" stopColor="#12823A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontFamily: fonte,
            fontSize: 9,
            letterSpacing: 1.8,
            color: '#FFE27A',
            textTransform: 'uppercase',
            fontWeight: 800,
            lineHeight: '11px',
            textShadow: '0 1px 3px rgba(0,0,0,0.35)',
          }}>
            FAITH STEPS
          </span>
          <span style={{
            fontFamily: fonte,
            fontSize: 8.5,
            background: 'rgba(255,255,255,0.22)',
            color: '#FFFFFF',
            padding: '1px 5px',
            borderRadius: 4,
            fontWeight: 700,
            lineHeight: '11px',
          }}>
            3D
          </span>
        </div>
        <div style={{
          fontFamily: fonteTitulo,
          fontSize: largo ? 24 : 18,
          lineHeight: largo ? '25px' : '20px',
          color: '#FFFFFF',
          letterSpacing: 0.3,
          textShadow: '0 2px 4px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          LOJA & BOUTIQUE
        </div>
        {largo && (
          <div style={{ fontFamily: fonteRegular, fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 1, whiteSpace: 'nowrap' }}>
            Visualização 3D em tempo real • Experimente roupas & decore seu lar
          </div>
        )}
      </div>
    </div>
  );
}

export default function Loja3D(props: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const [aba, setAba] = useState<Item['tipo']>(props.abaInicial);
  const [subRoupa, setSubRoupa] = useState<'tudo' | 'topo' | 'baixo' | 'calcado'>('tudo');
  const [subMovel, setSubMovel] = useState<'tudo' | 'chao' | 'tapete' | 'parede'>('tudo');
  const [selId, setSelId] = useState<string | null>(null);
  const [zoomPeca, setZoomPeca] = useState(false);
  const [largo, setLargo] = useState(true);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [avisoLoja, setAvisoLoja] = useState<string | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAba(props.abaInicial);
    setSelId(null);
    setZoomPeca(false);
  }, [props.abaInicial]);

  const mostrarFeedback = (txt: string) => {
    setAvisoLoja(txt);
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAvisoLoja(null), 2600);
  };

  useEffect(() => () => { if (timerAviso.current) clearTimeout(timerAviso.current); }, []);

  // Observa largura para alternar entre vitrine lateral (desktop/paisagem) e vitrine no topo (celular vertical)
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const medir = () => setLargo(el.clientWidth >= 700);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const temVitrine = true;
  const temItem = (it: Item) => it.preco === 0 || props.itens.includes(it.id);
  const motivoBloqueio = (it: Item) => {
    if (props.talentos >= 999000) return null;
    if (it.nivel > props.nivel) return `Nível ${it.nivel}`;
    if (props.talentos < it.preco) return `Faltam ${it.preco - props.talentos}`;
    return null;
  };

  const itensVisiveis = useMemo(() => {
    return LOJA.filter(i => {
      if (i.tipo !== aba || !servePara(i, props.look.corpo)) return false;
      if (aba === 'roupa' && subRoupa !== 'tudo' && i.peca !== subRoupa) return false;
      if (aba === 'movel' && subMovel !== 'tudo' && i.vaga !== subMovel) return false;
      return true;
    });
  }, [aba, subRoupa, subMovel, props.look.corpo]);

  const itemSelecionado = useMemo(() => {
    const achado = selId ? itensVisiveis.find(i => i.id === selId) : null;
    if (achado) return achado;
    return itensVisiveis.find(i => vestindoItem(props.look, i)) ?? itensVisiveis[0] ?? null;
  }, [selId, itensVisiveis, props.look]);

  const lookVitrine = useMemo(
    () => lookParaVitrine(props.look, itemSelecionado),
    [props.look, itemSelecionado],
  );

  // Gera miniaturas 3D de roupas e fantasias com o personagem
  const chaveBase = useMemo(() => chaveVisualBase(props.look, props.forma), [props.look, props.forma]);
  useEffect(() => {
    let cancelado = false;
    const vestiveis = LOJA.filter(i => (i.tipo === 'roupa' || i.tipo === 'fantasia') && servePara(i, props.look.corpo));
    const jaProntas: Record<string, string> = {};
    const faltam: Item[] = [];
    for (const it of vestiveis) {
      const k = `${chaveBase}:${it.id}`;
      const salvo = CACHE_MINIATURAS.get(k);
      if (salvo) jaProntas[it.id] = salvo;
      else faltam.push(it);
    }
    setMiniaturas(ant => ({ ...ant, ...jaProntas }));
    if (!faltam.length) return;

    (async () => {
      try {
        const boneco = await criarBoneco();
        if (cancelado) { boneco.descartar(); return; }
        const TAM = 180;
        const canvas = document.createElement('canvas');
        canvas.width = TAM;
        canvas.height = TAM;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(TAM, TAM, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const cena = new THREE.Scene();
        cena.add(new THREE.HemisphereLight('#FFF9F2', '#D4DFEC', 1.8));
        const luzChave = new THREE.DirectionalLight('#FFF2E0', 2.2);
        luzChave.position.set(-2.2, 4.0, 3.2);
        const luzRecorte = new THREE.DirectionalLight('#D6EEFF', 1.0);
        luzRecorte.position.set(2.4, 2.2, -2.4);
        cena.add(luzChave, luzRecorte);

        const pivo = new THREE.Group();
        pivo.add(boneco.objeto);
        cena.add(pivo);

        const cam = new THREE.PerspectiveCamera(24, 1, 0.05, 30);
        const tFov = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

        boneco.animar('parado');
        boneco.atualizar(0.35);

        const novas: Record<string, string> = { ...jaProntas };
        try {
          for (let i = 0; i < faltam.length; i++) {
            if (cancelado) break;
            const it = faltam[i];
            const lp = lookParaMiniatura(props.look, it);
            boneco.vestir(lp, props.forma, 'normal');
            boneco.expressao({ olhosFechados: false, extras: [] });
            const enq = enquadrarMiniatura(it);
            pivo.rotation.y = enq.giro;
            const dist = enq.meiaAltura / tFov;
            cam.position.set(0, enq.alvoY + dist * enq.elev, dist);
            cam.lookAt(0, enq.alvoY, 0);
            cam.updateProjectionMatrix();
            cena.updateMatrixWorld(true);
            renderer.render(cena, cam);
            const url = canvas.toDataURL('image/png');
            CACHE_MINIATURAS.set(`${chaveBase}:${it.id}`, url);
            novas[it.id] = url;
            if (i % 6 === 5) {
              setMiniaturas(ant => ({ ...ant, ...novas }));
              await new Promise(r => requestAnimationFrame(r));
            }
          }
          if (!cancelado) setMiniaturas(ant => ({ ...ant, ...novas }));
        } finally {
          boneco.descartar();
          renderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
          renderer.dispose();
        }
      } catch {
        /* sem modelo 3D disponível */
      }
    })();

    return () => { cancelado = true; };
  }, [chaveBase, props.look, props.forma]);

  // Gera miniaturas 3D de todos os móveis, cômodos, funções, paredes, pisos e atividades
  useEffect(() => {
    let cancelado = false;
    const itensNaoVestiveis = LOJA.filter(i => i.tipo !== 'roupa' && i.tipo !== 'fantasia');
    const jaProntas: Record<string, string> = {};
    const faltam: Item[] = [];

    for (const it of itensNaoVestiveis) {
      const k = `loja3d:${it.id}`;
      const salvo = CACHE_MINIATURAS.get(k);
      if (salvo) jaProntas[it.id] = salvo;
      else faltam.push(it);
    }
    if (Object.keys(jaProntas).length > 0) {
      setMiniaturas(ant => ({ ...ant, ...jaProntas }));
    }
    if (!faltam.length) return;

    (async () => {
      try {
        const TAM = 180;
        const canvas = document.createElement('canvas');
        canvas.width = TAM;
        canvas.height = TAM;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(TAM, TAM, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const cena = new THREE.Scene();
        cena.add(new THREE.HemisphereLight('#FFF9F2', '#D4DFEC', 1.9));
        const luzChave = new THREE.DirectionalLight('#FFF5E6', 2.2);
        luzChave.position.set(-2.5, 4.5, 3.5);
        const luzRecorte = new THREE.DirectionalLight('#D6EEFF', 1.1);
        luzRecorte.position.set(2.5, 2.5, -2.5);
        cena.add(luzChave, luzRecorte);

        const pedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.6, 0.04, 32),
          new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.35, metalness: 0.05 }),
        );
        pedestal.position.y = -0.02;
        cena.add(pedestal);

        const pivo = new THREE.Group();
        cena.add(pivo);

        const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 30);
        const tFov = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

        const novas: Record<string, string> = { ...jaProntas };

        try {
          for (let i = 0; i < faltam.length; i++) {
            if (cancelado) break;
            const it = faltam[i];

            while (pivo.children.length > 0) {
              const o = pivo.children[0];
              pivo.remove(o);
              o.traverse(c => {
                const m = c as THREE.Mesh;
                if (m.isMesh) {
                  m.geometry?.dispose();
                  if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                  else m.material?.dispose();
                }
              });
            }

            montarItemLoja3D(pivo, it);

            const enq = enquadrarItemLoja3D(it);
            pivo.rotation.y = enq.giro;
            const dist = Math.max(enq.meiaAltura / tFov, 0.45);
            cam.position.set(0, enq.alvoY + dist * enq.elev, dist);
            cam.lookAt(0, enq.alvoY, 0);
            cam.updateProjectionMatrix();
            cena.updateMatrixWorld(true);

            renderer.render(cena, cam);
            const url = canvas.toDataURL('image/png');
            CACHE_MINIATURAS.set(`loja3d:${it.id}`, url);
            novas[it.id] = url;

            if (i % 6 === 5 || i === faltam.length - 1) {
              if (!cancelado) setMiniaturas(ant => ({ ...ant, ...novas }));
              await new Promise(r => requestAnimationFrame(r));
            }
          }
        } finally {
          renderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
          renderer.dispose();
        }
      } catch {
        /* sem modelo 3D disponível */
      }
    })();

    return () => { cancelado = true; };
  }, []);

  // Palco 3D interativo (pedestal estilo The Sims Mobile)
  const estadoPalco = useRef({
    look: lookVitrine,
    forma: props.forma,
    humor: props.humor,
    temVitrine,
    zoomPeca,
    item: itemSelecionado,
  });
  useEffect(() => { estadoPalco.current = { look: lookVitrine, forma: props.forma, humor: props.humor, temVitrine, zoomPeca, item: itemSelecionado }; }, [lookVitrine, props.forma, props.humor, temVitrine, zoomPeca, itemSelecionado]);
  const atualizarPalco = useRef(() => {});
  const ajustarCamPalco = useRef(() => {});

  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const maxPR = (typeof window !== 'undefined' && window.innerWidth < 768) ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(maxPR);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const tela = renderer.domElement;
    Object.assign(tela.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' });
    el.appendChild(tela);

    const cena = new THREE.Scene();
    cena.add(new THREE.HemisphereLight('#FFF9F2', '#D2DFEC', 1.75));
    const luz = new THREE.DirectionalLight('#FFF2E0', 2.15);
    luz.position.set(-2.2, 4.2, 3.2);
    const recorte = new THREE.DirectionalLight('#C8EAFF', 0.95);
    recorte.position.set(2.5, 2.2, -2.5);
    cena.add(luz, recorte);

    // Pedestal circular iluminado no estilo The Sims
    const pedestal = new THREE.Group();
    const baseDisco = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.52, 0.055, 48),
      new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.32, metalness: 0.05 }),
    );
    baseDisco.position.y = -0.028;
    const anelLuz = new THREE.Mesh(
      new THREE.RingGeometry(0.41, 0.455, 48),
      new THREE.MeshBasicMaterial({ color: '#4AD662', side: THREE.DoubleSide }),
    );
    anelLuz.rotation.x = -Math.PI / 2;
    anelLuz.position.y = 0.002;
    const sombra = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 36),
      new THREE.MeshBasicMaterial({ color: '#1D2B3A', transparent: true, opacity: 0.14, depthWrite: false }),
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.003;
    pedestal.add(baseDisco, anelLuz, sombra);
    cena.add(pedestal);

    const camera = new THREE.PerspectiveCamera(26, 1, 0.08, 40);
    const pivo = new THREE.Group();
    cena.add(pivo);

    let boneco: Boneco | null = null;
    const grupoItem = new THREE.Group();
    pivo.add(grupoItem);

    atualizarPalco.current = () => {
      const st = estadoPalco.current;
      const ehVestivel = st.item ? (st.item.tipo === 'roupa' || st.item.tipo === 'fantasia') : true;

      if (ehVestivel) {
        grupoItem.visible = false;
        if (boneco) {
          boneco.objeto.visible = true;
          const humor = st.humor === 'adormecido' ? 'normal' : st.humor;
          boneco.vestir(st.look, st.forma, humor);
          boneco.expressao({ olhosFechados: false, extras: [] });
          boneco.animar('parado');
          if (quieto) boneco.atualizar(0.4);
        }
      } else if (st.item) {
        if (boneco) boneco.objeto.visible = false;
        grupoItem.visible = true;
        while (grupoItem.children.length > 0) {
          const o = grupoItem.children[0];
          grupoItem.remove(o);
          o.traverse(c => {
            const m = c as THREE.Mesh;
            if (m.isMesh) {
              m.geometry?.dispose();
              if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
              else m.material?.dispose();
            }
          });
        }
        montarItemLoja3D(grupoItem, st.item);
      }
    };

    ajustarCamPalco.current = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const st = estadoPalco.current;
      let alvoY = 0.83, meiaAltura = 0.97, meiaLargura = 0.56, elev = 0.1;

      if (st.item) {
        if (st.item.tipo === 'roupa' || st.item.tipo === 'fantasia') {
          if (st.zoomPeca && st.item.tipo === 'roupa') {
            const enq = enquadrarMiniatura(st.item);
            alvoY = enq.alvoY;
            meiaAltura = enq.meiaAltura * 1.08;
            meiaLargura = meiaAltura * 0.85;
            elev = enq.elev;
          }
        } else {
          const enq = enquadrarItemLoja3D(st.item);
          alvoY = enq.alvoY;
          meiaAltura = enq.meiaAltura * 1.15;
          meiaLargura = meiaAltura * 0.9;
          elev = enq.elev;
        }
      }

      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(meiaAltura / t, meiaLargura / (t * camera.aspect));
      camera.position.set(0, alvoY + dist * elev, dist);
      camera.lookAt(0, alvoY, 0);
      camera.updateProjectionMatrix();
    };

    let vivo = true;
    criarBoneco().then(b => {
      if (!vivo) { b.descartar(); return; }
      boneco = b;
      pivo.add(b.objeto);
      atualizarPalco.current();
    }).catch(() => {});

    const obs = new ResizeObserver(() => ajustarCamPalco.current());
    obs.observe(el);
    ajustarCamPalco.current();

    let giro = 0.36, puxando: number | null = null;
    const descer = (e: PointerEvent) => {
      puxando = e.clientX;
      try { tela.setPointerCapture(e.pointerId); } catch {}
      tela.style.cursor = 'grabbing';
    };
    const mover = (e: PointerEvent) => { if (puxando === null) return; giro += (e.clientX - puxando) * 0.013; puxando = e.clientX; };
    const subir = (e: PointerEvent) => {
      puxando = null;
      try { tela.releasePointerCapture(e.pointerId); } catch {}
      tela.style.cursor = 'grab';
    };
    tela.addEventListener('pointerdown', descer);
    tela.addEventListener('pointermove', mover);
    tela.addEventListener('pointerup', subir);
    tela.addEventListener('pointercancel', subir);

    let visivelAba = typeof document === 'undefined' ? true : !document.hidden;
    const aoMudarVisibilidade = () => {
      visivelAba = !document.hidden;
      if (visivelAba) ultimo = performance.now();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', aoMudarVisibilidade);

    let ultimo = performance.now(), quadro = 0;
    const laco = () => {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);
      if (!visivelAba) return;
      const agora = performance.now(), dt = Math.min((agora - ultimo) / 1000, 0.1);
      ultimo = agora;

      // Rotação suave contínua quando ocioso estilo vitrine Sims
      if (puxando === null && !quieto) {
        giro += dt * 0.28;
      }

      const st = estadoPalco.current;
      if (st.item?.tipo === 'roupa' || st.item?.tipo === 'fantasia') {
        boneco?.atualizar(quieto ? 0 : dt);
      }
      pivo.rotation.y = giro;
      renderer.render(cena, camera);
    };
    laco();

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      obs.disconnect();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      boneco?.descartar();
      cena.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
          else m.material?.dispose();
        }
      });
      renderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
      renderer.dispose();
      tela.remove();
    };
  }, []);

  const chaveLookVitrine = JSON.stringify(lookVitrine);
  useEffect(() => {
    atualizarPalco.current();
    ajustarCamPalco.current();
  }, [itemSelecionado?.id, chaveLookVitrine, props.forma, props.humor, zoomPeca, largo]);

  const fonte = 'Archivo_700Bold, system-ui, -apple-system, sans-serif';
  const fonteRegular = 'Archivo_600SemiBold, system-ui, -apple-system, sans-serif';
  const fonteTitulo = 'Archivo_600SemiBold, Archivo_600SemiBold, system-ui, sans-serif';

  const acaoDoItem = (item: Item): { rotulo: string; cor: string; habilitado: boolean; executar: () => void } => {
    const tem = temItem(item);
    const bloqueado = tem ? null : motivoBloqueio(item);
    const vestindo = vestindoItem(props.look, item);
    const naCasa = item.tipo === 'movel' && props.mobilia.some(m => m.item === item.id);
    const aplicado = (item.tipo === 'papel' || item.tipo === 'piso') && Object.values(props.acabamentos).some(a => a[item.tipo as 'papel' | 'piso'] === item.id);

    if (tem) {
      if (item.tipo === 'roupa') {
        return {
          rotulo: vestindo ? '✓ Vestindo' : 'Vestir',
          cor: vestindo ? '#43B93B' : '#1287C9',
          habilitado: !vestindo,
          executar: () => { props.onVestir(item.id); mostrarFeedback(`Vestindo: ${item.nome}`); },
        };
      }
      if (item.tipo === 'fantasia') {
        return {
          rotulo: vestindo ? 'Tirar fantasia' : 'Vestir',
          cor: vestindo ? '#6E7781' : '#1287C9',
          habilitado: true,
          executar: () => { props.onVestir(item.id); mostrarFeedback(vestindo ? 'Fantasia removida' : `Fantasia: ${item.nome}`); },
        };
      }
      if (item.tipo === 'movel') {
        return {
          rotulo: naCasa ? 'Mover na casa' : 'Colocar na casa',
          cor: '#1287C9',
          habilitado: true,
          executar: () => props.onDecorar(),
        };
      }
      if (item.tipo === 'papel' || item.tipo === 'piso') {
        return {
          rotulo: aplicado ? 'Trocar cômodo' : 'Usar na casa',
          cor: '#1287C9',
          habilitado: true,
          executar: () => props.onDecorar(),
        };
      }
      if (item.tipo === 'comodo') {
        return { rotulo: 'Ir até lá', cor: '#1287C9', habilitado: true, executar: () => props.onIrComodo(item.id) };
      }
      if (item.tipo === 'atividade') {
        return { rotulo: 'Registrar agora', cor: '#1287C9', habilitado: true, executar: () => props.onAbrirAtividade(item.id as AtividadeId) };
      }
      if (item.id === 'versiculoDia') {
        return { rotulo: 'Ler versículo', cor: '#1287C9', habilitado: true, executar: () => props.onVersiculo() };
      }
      return { rotulo: '✓ Na casa', cor: '#43B93B', habilitado: false, executar: () => {} };
    }

    if (bloqueado) {
      return { rotulo: bloqueado, cor: '#9AA2AC', habilitado: false, executar: () => {} };
    }
    return {
      rotulo: item.preco === 0 ? 'Grátis' : `${item.preco}`,
      cor: '#47C23B',
      habilitado: true,
      executar: () => { props.onComprar(item.id); mostrarFeedback(`Comprado: ${item.nome}!`); },
    };
  };

  const largoCard = aba === 'comodo' || aba === 'atividade' || aba === 'funcao';
  const acaoSel = itemSelecionado ? acaoDoItem(itemSelecionado) : null;
  const provandoSel = itemSelecionado ? !vestindoItem(props.look, itemSelecionado) : false;

  return (
    <div
      ref={raiz}
      onClick={e => { if (e.target === e.currentTarget) props.onFechar(); }}
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        background: 'rgba(28,76,86,0.5)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: largo ? 18 : 8, userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 1080, height: largo ? 'min(90vh, 760px)' : 'min(94dvh, 94vh)',
        background: '#EFF8F3', borderRadius: largo ? 24 : 20, border: '3px solid #FFFFFF',
        boxShadow: '0 22px 54px rgba(12, 6, 24, 0.45)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      }}>
        {/* Cabeçalho com Logo Oficial da Loja 3D */}
        <div style={{
          background: 'linear-gradient(115deg, #2D6B5A 0%, #3F8F75 50%, #4D8CA9 100%)',
          borderBottom: '2.5px solid #FFFFFF', padding: largo ? '10px 18px' : '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0,
        }}>
          <LogoLoja largo={largo} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(20, 14, 32, 0.5)',
              borderRadius: 999, padding: '3px 12px 3px 3px', border: '1.5px solid rgba(255,255,255,0.65)',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 13, background: '#49C842', border: '2px solid #FFFFFF',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fonteTitulo, fontSize: 14, color: '#FFFFFF',
              }}>
                {props.nivel}
              </span>
              <span style={{ fontFamily: fonte, fontSize: 12, color: '#FFFFFF' }}>Nível</span>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(20, 14, 32, 0.55)',
              borderRadius: 999, padding: '3px 13px 3px 3px', border: '1.5px solid rgba(255,255,255,0.75)',
            }}>
              <span
                style={{
                  width: 26, height: 26, borderRadius: 13, background: '#53C737', border: '2px solid #FFFFFF',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
                dangerouslySetInnerHTML={{ __html: icone('talento', '#FFFFFF', 2.4) }}
              />
              <span style={{ fontFamily: fonteTitulo, fontSize: 19, lineHeight: '20px', color: '#FFFFFF' }}>
                {props.talentos >= 999000 ? '999k+ (∞)' : props.talentos}
              </span>
            </div>

            <button
              onClick={() => props.onFechar()}
              aria-label="Fechar loja"
              style={{
                width: 36, height: 36, borderRadius: 18, border: '2.5px solid #FFFFFF', cursor: 'pointer',
                background: '#E04F3E', color: '#FFFFFF', fontFamily: fonte, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de categorias com ícones, contagem de itens e navegação 3D fluida */}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px',
          background: '#E4E3DD', borderBottom: '1.5px solid #D5D3CB', flexShrink: 0, touchAction: 'pan-x',
          scrollbarWidth: 'none',
        }}>
          {ABAS.map(t => {
            const ativo = aba === t.id;
            const contagem = LOJA.filter(i => i.tipo === t.id && (t.id !== 'roupa' || servePara(i, props.look.corpo))).length;
            return (
              <button
                key={t.id}
                onClick={() => { setAba(t.id); setSelId(null); setZoomPeca(false); }}
                style={{
                  flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
                  padding: largo ? '7px 13px' : '6px 10px', borderRadius: 12, cursor: 'pointer',
                  border: ativo ? '2px solid #FFFFFF' : '1.5px solid #D3D1C9',
                  background: ativo ? '#1287C9' : '#FFFFFF',
                  color: ativo ? '#FFFFFF' : '#333B44',
                  fontFamily: fonte, fontSize: 13,
                  boxShadow: ativo ? '0 3px 10px rgba(18,135,201,0.32)' : 'none',
                  transition: 'all 0.12s ease',
                }}
              >
                <span
                  style={{ width: 17, height: 17, display: 'inline-flex' }}
                  dangerouslySetInnerHTML={{ __html: icone(t.icone, ativo ? '#FFFFFF' : '#4C5662', 2.2) }}
                />
                <span>{t.nome}</span>
                <span style={{
                  fontSize: 10, fontFamily: fonteRegular,
                  background: ativo ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.06)',
                  color: ativo ? '#FFFFFF' : '#68737F',
                  padding: '1px 6px', borderRadius: 999,
                }}>
                  {contagem}
                </span>
              </button>
            );
          })}
        </div>

        {/* Aviso rápido dentro da loja */}
        {avisoLoja && (
          <div style={{
            position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)', zIndex: 25, pointerEvents: 'none',
            background: 'rgba(30, 22, 42, 0.92)', color: '#FFFFFF', fontFamily: fonte, fontSize: 13,
            padding: '7px 16px', borderRadius: 999, border: '2px solid #FFFFFF', boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
            whiteSpace: 'nowrap',
          }}>
            {avisoLoja}
          </div>
        )}

        {/* Corpo principal: Vitrine 3D Interativa + Grade de itens */}
        <div style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: largo ? 'row' : 'column',
          overflow: 'hidden',
        }}>
          {/* Painel do Provador / Pedestal 3D iluminado */}
          <div style={{
            display: 'flex',
            flexDirection: largo ? 'column' : 'row',
            width: largo ? 284 : '100%',
            height: largo ? '100%' : 198,
            flexShrink: 0,
            background: 'linear-gradient(180deg, #DCEAF5 0%, #EAEEF2 65%, #E3E5E0 100%)',
            borderRight: largo ? '2px solid #FFFFFF' : 'none',
            borderBottom: largo ? 'none' : '2px solid #FFFFFF',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Losango decorativo estilo The Sims atrás do modelo */}
            <div style={{
              position: 'absolute',
              left: largo ? '50%' : 76, top: largo ? '36%' : '52%',
              width: largo ? 156 : 108, height: largo ? 156 : 108,
              transform: 'translate(-50%, -50%) rotate(-14deg)',
              borderRadius: 26, background: 'rgba(74, 214, 98, 0.22)',
              border: '2.5px solid rgba(255,255,255,0.85)', pointerEvents: 'none',
            }} />

            {/* Palco 3D interativo */}
            <div style={{
              position: 'relative',
              width: largo ? '100%' : 154,
              flex: largo ? 1 : '0 0 154px',
              minHeight: 0,
            }}>
              <div ref={palcoRef} style={{ position: 'absolute', inset: 0 }} />
              {itemSelecionado?.tipo === 'roupa' && (
                <button
                  onClick={() => setZoomPeca(z => !z)}
                  style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 3,
                    fontFamily: fonte, fontSize: 11, padding: '4px 9px', borderRadius: 999,
                    border: '1.5px solid #FFFFFF', cursor: 'pointer',
                    background: zoomPeca ? '#1287C9' : 'rgba(28, 22, 38, 0.58)', color: '#FFFFFF',
                  }}
                >
                  {zoomPeca ? 'Corpo todo' : 'Zoom na peça'}
                </button>
              )}
              <div style={{
                position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                pointerEvents: 'none', fontFamily: fonteRegular, fontSize: 10, color: '#4B5966',
                background: 'rgba(255,255,255,0.82)', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              }}>
                ↻ 360° Arraste para girar
              </div>
            </div>

            {/* Cartão do item em foco na vitrine 3D */}
            {itemSelecionado && acaoSel && (
              <div style={{
                flex: largo ? '0 0 auto' : 1,
                padding: largo ? '12px 14px 14px' : '10px 12px',
                background: largo ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.85)',
                borderTop: largo ? '2px solid #FFFFFF' : 'none',
                borderLeft: largo ? 'none' : '1.5px solid rgba(255,255,255,0.8)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: fonte, fontSize: 10, padding: '2px 8px', borderRadius: 999,
                    background: provandoSel
                      ? '#1287C9'
                      : (itemSelecionado.tipo === 'roupa' || itemSelecionado.tipo === 'fantasia')
                        ? '#43B93B'
                        : temItem(itemSelecionado) ? '#2B8C65' : '#7357A6',
                    color: '#FFFFFF',
                  }}>
                    {itemSelecionado.tipo === 'roupa' || itemSelecionado.tipo === 'fantasia'
                      ? (provandoSel ? 'Provando no 3D' : '✓ Vestindo')
                      : itemSelecionado.tipo === 'movel'
                        ? (props.mobilia.some(m => m.item === itemSelecionado.id) ? '✓ No seu Lar' : temItem(itemSelecionado) ? '✓ Comprado' : 'Móvel 3D')
                        : itemSelecionado.tipo === 'comodo'
                          ? (temItem(itemSelecionado) ? '✓ Desbloqueado' : 'Cômodo 3D')
                          : itemSelecionado.tipo === 'papel' || itemSelecionado.tipo === 'piso'
                            ? (Object.values(props.acabamentos).some(a => a[itemSelecionado.tipo as 'papel' | 'piso'] === itemSelecionado.id) ? '✓ Aplicado' : temItem(itemSelecionado) ? '✓ Comprado' : 'Revestimento 3D')
                            : (temItem(itemSelecionado) ? '✓ Desbloqueado' : 'Item 3D')}
                  </span>
                  {selId && (
                    <button
                      onClick={() => setSelId(null)}
                      style={{
                        fontFamily: fonteRegular, fontSize: 10, color: '#58636E', background: 'transparent',
                        border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0,
                      }}
                    >
                      {itemSelecionado.tipo === 'roupa' || itemSelecionado.tipo === 'fantasia' ? 'Voltar ao look' : 'Item padrão'}
                    </button>
                  )}
                </div>
                <div style={{ fontFamily: fonte, fontSize: largo ? 16 : 14, color: '#242C34', lineHeight: '19px' }}>
                  {itemSelecionado.nome}
                </div>
                {itemSelecionado.descricao && (
                  <div style={{ fontFamily: fonteRegular, fontSize: 11, color: '#5E6873', lineHeight: '15px' }}>
                    {itemSelecionado.descricao}
                  </div>
                )}
                <div style={{ fontFamily: fonteRegular, fontSize: 11, color: '#68737E' }}>
                  {itemSelecionado.preco === 0 ? 'Item básico gratuito' : `${itemSelecionado.preco} talentos`}
                  {itemSelecionado.nivel > 1 ? ` • Nível ${itemSelecionado.nivel}` : ''}
                </div>
                <button
                  onClick={acaoSel.executar}
                  disabled={!acaoSel.habilitado}
                  style={{
                    marginTop: 2, width: '100%', padding: '9px 12px', borderRadius: 12,
                    border: '2px solid #FFFFFF', cursor: acaoSel.habilitado ? 'pointer' : 'default',
                    background: acaoSel.cor, color: '#FFFFFF', fontFamily: fonte, fontSize: 13,
                    opacity: acaoSel.habilitado ? 1 : 0.78,
                    boxShadow: acaoSel.habilitado ? '0 4px 10px rgba(0,0,0,0.16)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {!temItem(itemSelecionado) && !motivoBloqueio(itemSelecionado) && itemSelecionado.preco > 0 && (
                    <span style={{ width: 15, height: 15, display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: icone('talento', '#FFFFFF', 2.4) }} />
                  )}
                  {!temItem(itemSelecionado) && !motivoBloqueio(itemSelecionado) && itemSelecionado.preco > 0
                    ? `Comprar • ${acaoSel.rotulo}`
                    : acaoSel.rotulo}
                </button>
              </div>
            )}
          </div>

          {/* Coluna direita / inferior: Sub-filtros + Grade de cartões */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {(aba === 'roupa' || aba === 'movel') && (
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 14px 4px',
                flexShrink: 0, touchAction: 'pan-x', scrollbarWidth: 'none',
              }}>
                {(aba === 'roupa'
                  ? [['tudo', 'Todos os looks'], ['topo', 'Parte de cima'], ['baixo', 'Parte de baixo'], ['calcado', 'Calçados']] as const
                  : [['tudo', 'Todos os móveis'], ['chao', 'Chão & Assentos'], ['tapete', 'Tapetes'], ['parede', 'Quadros & Parede']] as const
                ).map(([id, rotulo]) => {
                  const ativo = aba === 'roupa' ? subRoupa === id : subMovel === id;
                  return (
                    <button
                      key={id}
                      onClick={() => (aba === 'roupa' ? setSubRoupa(id as typeof subRoupa) : setSubMovel(id as typeof subMovel))}
                      style={{
                        flex: '0 0 auto', fontFamily: fonte, fontSize: 11, padding: '5px 12px', borderRadius: 999,
                        cursor: 'pointer',
                        border: ativo ? '1.5px solid #498C75' : '1.5px solid #D4D2CA',
                        background: ativo ? '#498C75' : '#FFFFFF',
                        color: ativo ? '#FFFFFF' : '#4C5662',
                      }}
                    >
                      {rotulo}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{
              flex: 1, overflowY: 'auto', padding: largo ? 14 : 10, touchAction: 'pan-y',
              display: 'grid',
              gridTemplateColumns: largoCard
                ? `repeat(auto-fill, minmax(${largo ? 220 : 160}px, 1fr))`
                : `repeat(auto-fill, minmax(${largo ? 146 : 124}px, 1fr))`,
              gap: largo ? 12 : 9,
              alignContent: 'start',
            }}>
              {itensVisiveis.map(item => {
                const tem = temItem(item);
                const bloqueado = tem ? null : motivoBloqueio(item);
                const vestindo = vestindoItem(props.look, item);
                const naCasa = item.tipo === 'movel' && props.mobilia.some(m => m.item === item.id);
                const aplicado = (item.tipo === 'papel' || item.tipo === 'piso') && Object.values(props.acabamentos).some(a => a[item.tipo as 'papel' | 'piso'] === item.id);
                const emUso = vestindo || naCasa || aplicado;
                const selecionado = itemSelecionado?.id === item.id;
                const acao = acaoDoItem(item);
                const miniatura3D = miniaturas[item.id] || CACHE_MINIATURAS.get(`loja3d:${item.id}`) || CACHE_MINIATURAS.get(`${chaveBase}:${item.id}`);
                const svgArte = item.tipo === 'movel'
                  ? tingirSvg(movelSvg(item.id), props.cor)
                  : item.tipo === 'papel' || item.tipo === 'piso'
                    ? tingirSvg(revestimentoSvg(item.id), props.cor)
                    : tingirSvg(itemExtraSvg(item.id), props.cor);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelId(item.id)}
                    style={{
                      background: '#FFFFFF', borderRadius: 16, padding: 9,
                      border: selecionado
                        ? '2.5px solid #1287C9'
                        : emUso
                          ? '2.5px solid #49C842'
                          : '1.5px solid #DDDAD2',
                      boxShadow: selecionado
                        ? '0 6px 18px rgba(18,135,201,0.26)'
                        : '0 2px 7px rgba(20,16,28,0.06)',
                      display: 'flex', flexDirection: 'column', gap: 6, position: 'relative',
                      cursor: 'pointer',
                      transform: selecionado ? 'scale(1.02)' : 'none',
                      transition: 'transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease',
                    }}
                  >
                    {/* Selo de estado no canto superior */}
                    {emUso ? (
                      <span style={{
                        position: 'absolute', top: 14, left: 14, zIndex: 2,
                        background: '#43B93B', color: '#FFFFFF', fontFamily: fonte, fontSize: 10,
                        padding: '2px 7px', borderRadius: 999, border: '1.5px solid #FFFFFF',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.16)',
                      }}>
                        ✓ {vestindo ? 'Vestindo' : naCasa ? 'Na casa' : 'Aplicado'}
                      </span>
                    ) : tem ? (
                      <span style={{
                        position: 'absolute', top: 14, left: 14, zIndex: 2,
                        width: 20, height: 20, borderRadius: 10,
                        background: '#43B93B', color: '#FFFFFF', fontFamily: fonte, fontSize: 11,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px solid #FFFFFF', boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                      }}>
                        ✓
                      </span>
                    ) : item.nivel > props.nivel ? (
                      <span style={{
                        position: 'absolute', top: 14, right: 14, zIndex: 2,
                        background: 'rgba(34, 24, 48, 0.78)', color: '#FFFFFF', fontFamily: fonte, fontSize: 10,
                        padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.7)',
                      }}>
                        Nível {item.nivel}
                      </span>
                    ) : null}

                    {/* Quadro da arte 3D / miniatura */}
                    <div style={{
                      width: '100%', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden',
                      background: 'linear-gradient(180deg, #E8F1F8 0%, #D7E4F0 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {miniatura3D ? (
                        <img
                          src={miniatura3D}
                          alt={item.nome}
                          draggable={false}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                      ) : svgArte ? (
                        <div
                          style={{ width: '100%', height: '100%' }}
                          dangerouslySetInnerHTML={{ __html: svgArte }}
                        />
                      ) : (
                        <div style={{ fontFamily: fonteRegular, fontSize: 11, color: '#7D8B99' }}>3D...</div>
                      )}
                      <span style={{
                        position: 'absolute', bottom: 5, right: 5,
                        fontFamily: fonte, fontSize: 9, fontWeight: 800,
                        background: 'rgba(20, 16, 32, 0.65)', color: '#FFFFFF',
                        padding: '1px 5px', borderRadius: 4, letterSpacing: 0.5,
                        pointerEvents: 'none',
                      }}>
                        3D
                      </span>
                    </div>

                    <div style={{
                      fontFamily: fonte, fontSize: 13, lineHeight: '16px', color: '#262E36',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {item.nome}
                    </div>

                    {item.descricao && (
                      <div style={{ fontFamily: fonteRegular, fontSize: 11, lineHeight: '15px', color: '#66717C' }}>
                        {item.descricao}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: 2 }}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelId(item.id);
                          if (acao.habilitado) acao.executar();
                        }}
                        disabled={!acao.habilitado}
                        style={{
                          width: '100%', padding: '7px 8px', borderRadius: 10,
                          border: '1.5px solid #FFFFFF',
                          cursor: acao.habilitado ? 'pointer' : 'default',
                          background: acao.cor, color: '#FFFFFF',
                          fontFamily: fonte, fontSize: 12,
                          opacity: acao.habilitado || emUso ? 1 : 0.72,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          boxShadow: acao.habilitado ? '0 2px 6px rgba(0,0,0,0.14)' : 'none',
                        }}
                      >
                        {!tem && !bloqueado && item.preco > 0 && (
                          <span style={{ width: 13, height: 13, display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: icone('talento', '#FFFFFF', 2.5) }} />
                        )}
                        {acao.rotulo}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

