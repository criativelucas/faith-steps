'use dom';
// Loja 3D no estilo The Sims Mobile: vitrine 3D interativa para experimentar roupas e fantasias
// no próprio boneco 3D, miniaturas 3D geradas em tempo real (sem o boneco 2D antigo) e catálogo completo.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { criarFilaCompra, validarCompra, type ResultadoCompra } from './loja';
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
  onComprar: (itemId: string) => Promise<ResultadoCompra>;
  onVestir: (itemId: string) => Promise<void>;
  onDecorar: (itemId:string) => Promise<void>;
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
function guardarMiniatura(chave:string,url:string){
  CACHE_MINIATURAS.set(chave,url);
  while(CACHE_MINIATURAS.size>180)CACHE_MINIATURAS.delete(CACHE_MINIATURAS.keys().next().value!);
}

function chaveVisualBase(look: Look, forma: number): string {
  return JSON.stringify({
    corpo: look.corpo, pele: look.pele, rosto: look.rosto, olhos: look.olhos, corOlhos: look.corOlhos,
    sobrancelha: look.sobrancelha, nariz: look.nariz, cabelo: look.cabelo, corCabelo: look.corCabelo,
    barba: look.barba, oculos: look.oculos, moletom: look.moletom,
    corTopo: look.corTopo, corBaixo: look.corBaixo, corCalcado: look.corCalcado,
    forma, topo:look.topo, baixo:look.baixo, calcado:look.calcado, fantasia:look.fantasia,
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

export default function Loja3D(props: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const catalogoRef = useRef<HTMLDivElement>(null);
  const [aba, setAba] = useState<Item['tipo']>(props.abaInicial);
  const [subRoupa, setSubRoupa] = useState<'tudo' | 'topo' | 'baixo' | 'calcado'>('tudo');
  const [subMovel, setSubMovel] = useState<'tudo' | 'chao' | 'tapete' | 'parede'>('tudo');
  useEffect(()=>{if(catalogoRef.current)catalogoRef.current.scrollTop=0;},[aba,subRoupa,subMovel]);
  const [selId, setSelId] = useState<string | null>(null);
  const [zoomPeca, setZoomPeca] = useState(false);
  const [largo, setLargo] = useState(true);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [comprando,setComprando]=useState(false);
  const filaCompra=useRef(criarFilaCompra());
  const [carregandoModelo,setCarregandoModelo]=useState(true);
  const [erroPrevia,setErroPrevia]=useState(false);
  const fecharRef=useRef(props.onFechar);fecharRef.current=props.onFechar;
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
  const motivoBloqueio = (it:Item) => validarCompra({talentos:props.talentos,nivel:props.nivel,humor:props.humor as import('./jogo').Estado['humor'],itens:props.itens},it)?.mensagem??null;

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
    const vestiveis = itensVisiveis.filter(i => (i.tipo === 'roupa' || i.tipo === 'fantasia') && servePara(i, props.look.corpo));
    const jaProntas: Record<string, string> = {};
    const faltam: Item[] = [];
    for (const it of vestiveis) {
      const k = `${chaveBase}:${it.id}`;
      const salvo = CACHE_MINIATURAS.get(k);
      if (salvo) jaProntas[it.id] = salvo;
      else faltam.push(it);
    }
    setMiniaturas(ant => ({ ...ant, ...Object.fromEntries(vestiveis.map(it=>[it.id,jaProntas[it.id]??''])) }));
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
            guardarMiniatura(`${chaveBase}:${it.id}`, url);
            novas[it.id] = url;
            if (i % 3 === 2) {
              if(!cancelado)setMiniaturas(ant => ({ ...ant, ...novas }));
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
        if(!cancelado)setErroPrevia(true);
      }
    })();

    return () => { cancelado = true; };
  }, [chaveBase, props.look, props.forma, itensVisiveis]);

  // Gera miniaturas 3D de todos os móveis, cômodos, funções, paredes, pisos e atividades
  useEffect(() => {
    let cancelado = false;
    const itensNaoVestiveis = itensVisiveis.filter(i => i.tipo !== 'roupa' && i.tipo !== 'fantasia');
    const jaProntas: Record<string, string> = {};
    const faltam: Item[] = [];

    for (const it of itensNaoVestiveis) {
      const k = `loja3d:${props.cor}:${it.id}`;
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
                  if (Array.isArray(m.material)) m.material.forEach(mat => {if(mat.userData.texturaLoja)(mat as THREE.MeshStandardMaterial).map?.dispose();mat.dispose();});
                  else {if(m.material?.userData.texturaLoja)(m.material as THREE.MeshStandardMaterial).map?.dispose();m.material?.dispose();}
                }
              });
            }

            montarItemLoja3D(pivo, it,props.cor);

            const enq = enquadrarItemLoja3D(it);
            const dimensoes=new THREE.Box3().setFromObject(pivo).getSize(new THREE.Vector3());
            enq.alvoY=dimensoes.y/2;
            enq.meiaAltura=Math.max(dimensoes.y/2,Math.hypot(dimensoes.x,dimensoes.z)/2)*1.16;
            pivo.rotation.y = enq.giro;
            const dist = Math.max(enq.meiaAltura / tFov, 0.45);
            cam.position.set(0, enq.alvoY + dist * enq.elev, dist);
            cam.lookAt(0, enq.alvoY, 0);
            cam.updateProjectionMatrix();
            cena.updateMatrixWorld(true);

            renderer.render(cena, cam);
            const url = canvas.toDataURL('image/png');
            guardarMiniatura(`loja3d:${props.cor}:${it.id}`, url);
            novas[it.id] = url;

            if (i % 6 === 5 || i === faltam.length - 1) {
              if (!cancelado) setMiniaturas(ant => ({ ...ant, ...novas }));
              await new Promise(r => requestAnimationFrame(r));
            }
          }
        } finally {
          pivo.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();const materiais=Array.isArray(m.material)?m.material:[m.material];materiais.forEach(mat=>{if(mat.userData.texturaLoja)(mat as THREE.MeshStandardMaterial).map?.dispose();mat.dispose();});}});
          renderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
          renderer.dispose();
        }
      } catch {
        if(!cancelado)setErroPrevia(true);
      }
    })();

    return () => { cancelado = true; };
  }, [itensVisiveis,props.cor]);

  // Palco 3D interativo (pedestal estilo The Sims Mobile)
  const estadoPalco = useRef({
    look: lookVitrine,
    forma: props.forma,
    humor: props.humor,
    temVitrine,
    zoomPeca,
    item: itemSelecionado, cor:props.cor,
  });
  useEffect(() => { estadoPalco.current = { look: lookVitrine, forma: props.forma, humor: props.humor, temVitrine, zoomPeca, item: itemSelecionado, cor:props.cor }; }, [lookVitrine, props.forma, props.humor, temVitrine, zoomPeca, itemSelecionado,props.cor]);
  const atualizarPalco = useRef(() => {});
  const ajustarCamPalco = useRef(() => {});

  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({ antialias: true, alpha: true });}catch{setErroPrevia(true);return;}
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

    let giro=.36;
    let ultimoItemPalco:string|undefined;
    atualizarPalco.current = () => {
      const st = estadoPalco.current;
      if(st.item?.id!==ultimoItemPalco){giro=st.item?enquadrarItemLoja3D(st.item).giro:.36;ultimoItemPalco=st.item?.id;}
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
              if (Array.isArray(m.material)) m.material.forEach(mat => {if(mat.userData.texturaLoja)(mat as THREE.MeshStandardMaterial).map?.dispose();mat.dispose();});
              else {if(m.material?.userData.texturaLoja)(m.material as THREE.MeshStandardMaterial).map?.dispose();m.material?.dispose();}
            }
          });
        }
        montarItemLoja3D(grupoItem, st.item,st.cor);
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
          const bounds=new THREE.Box3().setFromObject(grupoItem);
          if(!bounds.isEmpty()){
            const tamanho=bounds.getSize(new THREE.Vector3());alvoY=bounds.getCenter(new THREE.Vector3()).y;
            meiaAltura=Math.max(tamanho.y/2,tamanho.z*.3)*1.18;
            meiaLargura=Math.hypot(tamanho.x,tamanho.z)*.58;
          }
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
      setCarregandoModelo(false);
      pivo.add(b.objeto);
      atualizarPalco.current();
    }).catch(() => {if(vivo)setErroPrevia(true);});

    const obs = new ResizeObserver(() => ajustarCamPalco.current());
    obs.observe(el);
    ajustarCamPalco.current();

    let puxando: number | null = null;
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
      if (puxando === null && !quieto && (estadoPalco.current.item?.tipo==='roupa'||estadoPalco.current.item?.tipo==='fantasia')) {
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
          if (Array.isArray(m.material)) m.material.forEach(mat => {if(mat.userData.texturaLoja)(mat as THREE.MeshStandardMaterial).map?.dispose();mat.dispose();});
          else {if(m.material?.userData.texturaLoja)(m.material as THREE.MeshStandardMaterial).map?.dispose();m.material?.dispose();}
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
  }, [itemSelecionado?.id, chaveLookVitrine, props.forma, props.humor, zoomPeca, largo,props.cor]);

  useEffect(()=>{
    const anterior=document.activeElement as HTMLElement|null;
    const frame=requestAnimationFrame(()=>raiz.current?.querySelector<HTMLButtonElement>('[aria-label="Fechar loja"]')?.focus());
    const teclado=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();void fecharRef.current();}
      if(e.key==='Tab'){
        const focaveis=Array.from(raiz.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')??[]).filter(el=>el.getClientRects().length);
        const primeiro=focaveis[0],ultimo=focaveis[focaveis.length-1];
        if(e.shiftKey&&document.activeElement===primeiro){e.preventDefault();ultimo?.focus();}
        else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primeiro?.focus();}
      }
    };
    document.addEventListener('keydown',teclado);
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',teclado);anterior?.focus();};
  },[]);

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
          executar: () => {void props.onDecorar(item.id);},
        };
      }
      if (item.tipo === 'papel' || item.tipo === 'piso') {
        return {
          rotulo: aplicado ? 'Trocar cômodo' : 'Usar na casa',
          cor: '#1287C9',
          habilitado: true,
          executar: () => {void props.onDecorar(item.id);},
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
      habilitado: !comprando,
      executar: () => {void filaCompra.current(async()=>{setComprando(true);try{const resultado=await props.onComprar(item.id);mostrarFeedback(resultado.mensagem);return resultado;}catch{const resultado:ResultadoCompra={status:'falha',mensagem:'Não foi possível concluir a compra. Tente novamente.'};mostrarFeedback(resultado.mensagem);return resultado;}finally{setComprando(false);}});},
    };
  };

  const acaoSel = itemSelecionado ? acaoDoItem(itemSelecionado) : null;
  const vestivel=itemSelecionado?.tipo==='roupa'||itemSelecionado?.tipo==='fantasia';
  const imagemItem=(item:Item)=>item.tipo==='movel'?movelSvg(item.id):item.tipo==='papel'||item.tipo==='piso'?revestimentoSvg(item.id):itemExtraSvg(item.id);
  return <div ref={raiz} className="loja-overlay" onClick={e=>{if(e.target===e.currentTarget)void props.onFechar();}}>
    <style>{ESTILO_LOJA}</style>
    <section className="loja-dialog" role="dialog" aria-modal="true" aria-labelledby="titulo-loja">
      <header className="loja-header">
        <div><span className="loja-eyebrow">FAITH STEPS · SUA CASA, SEU ESTILO</span><h1 id="titulo-loja">Loja</h1></div>
        <div className="loja-saldo"><small>Nível {props.nivel}</small><strong>{props.talentos>=999000?'∞':props.talentos.toLocaleString('pt-BR')} talentos</strong></div>
        <button aria-label="Fechar loja" className="loja-fechar" onClick={()=>void props.onFechar()}>✕</button>
      </header>
      <nav className="loja-abas" aria-label="Categorias da loja">{ABAS.map(a=><button key={a.id} aria-pressed={aba===a.id} onClick={()=>{setAba(a.id);setSelId(null);setZoomPeca(false);}}><span aria-hidden="true" dangerouslySetInnerHTML={{__html:icone(a.icone,aba===a.id?'#FFFFFF':'#49756B',2)}}/>{a.nome}</button>)}</nav>
      <div className="loja-conteudo">
        <aside className="loja-previa" aria-label="Prévia do item">
          <div className="loja-palco"><div ref={palcoRef} className="loja-canvas"/>
            {vestivel&&carregandoModelo&&!erroPrevia&&<span className="loja-carregando" role="status">Preparando prévia…</span>}
            {erroPrevia&&itemSelecionado&&<div className="loja-alternativa" dangerouslySetInnerHTML={{__html:tingirSvg(imagemItem(itemSelecionado),props.cor)}}/>}
            {itemSelecionado?.tipo==='roupa'&&<button className="loja-zoom" aria-pressed={zoomPeca} onClick={()=>setZoomPeca(v=>!v)}>{zoomPeca?'Ver personagem':'Ver peça'}</button>}
            <small className="loja-girar">{erroPrevia?'Prévia indisponível · catálogo disponível':'Arraste para girar'}</small>
          </div>
          {itemSelecionado&&<div className="loja-detalhes"><span className="loja-eyebrow">{temItem(itemSelecionado)?'NA SUA COLEÇÃO':vestivel?'EXPERIMENTANDO':'CONHEÇA O ITEM'}</span><h2>{itemSelecionado.nome}</h2><p>{itemSelecionado.descricao??(vestivel?'Experimente à vontade. Seu visual só muda ao vestir ou comprar.':'Personalize sua experiência.')}</p><small>{itemSelecionado.preco===0?'Item gratuito':`${itemSelecionado.preco} talentos · Nível ${itemSelecionado.nivel}`}</small></div>}
        </aside>
        <div className="loja-catalogo">
          <div className="loja-filtros"><strong>{ABAS.find(a=>a.id===aba)?.nome} <small>· {itensVisiveis.length}</small></strong>
            {aba==='roupa'&&<div aria-label="Filtrar roupas">{([['tudo','Tudo'],['topo','Parte de cima'],['baixo','Parte de baixo'],['calcado','Calçados']] as const).map(([id,nome])=><button key={id} aria-pressed={subRoupa===id} onClick={()=>setSubRoupa(id)}>{nome}</button>)}</div>}
            {aba==='movel'&&<div aria-label="Filtrar móveis">{([['tudo','Tudo'],['chao','Móveis'],['tapete','Tapetes'],['parede','Parede']] as const).map(([id,nome])=><button key={id} aria-pressed={subMovel===id} onClick={()=>setSubMovel(id)}>{nome}</button>)}</div>}
          </div>
          <div ref={catalogoRef} className="loja-grid">{itensVisiveis.map(item=>{
            const tem=temItem(item),bloqueado=tem?null:motivoBloqueio(item),vestindo=vestindoItem(props.look,item);
            const naCasa=item.tipo==='movel'&&props.mobilia.some(m=>m.item===item.id);
            const aplicado=(item.tipo==='papel'||item.tipo==='piso')&&Object.values(props.acabamentos).some(a=>a[item.tipo as 'papel'|'piso']===item.id);
            const imagem=miniaturas[item.id],svg=imagemItem(item);
            return <button key={item.id} className="loja-card" aria-pressed={itemSelecionado?.id===item.id} aria-label={`Ver ${item.nome}`} onClick={()=>setSelId(item.id)}>
              <div className="loja-miniatura">{imagem?<img src={imagem} alt="" draggable={false}/>:svg?<div dangerouslySetInnerHTML={{__html:tingirSvg(svg,props.cor)}}/>:<span>{erroPrevia?'Sem prévia':'Carregando…'}</span>}<small>{imagem?'3D':svg?'Ilustração':'Prévia'}</small></div>
              <span className="loja-card-nome">{item.nome}</span><span className="loja-card-estado">{vestindo?'✓ Vestindo':naCasa?'✓ Na casa':aplicado?'✓ Aplicado':tem?'✓ Adquirido':bloqueado??`${item.preco} talentos`}</span>
            </button>;
          })}{!itensVisiveis.length&&<p>Nenhum item nesta categoria.</p>}</div>
        </div>
      </div>
      <footer className="loja-rodape"><div role="status" aria-live="polite">{avisoLoja??(itemSelecionado?`${itemSelecionado.nome}${vestivel&&!vestindoItem(props.look,itemSelecionado)?' · Apenas prévia':''}`:'Selecione um item')}</div>{acaoSel&&<button className="loja-principal" disabled={!acaoSel.habilitado||comprando} onClick={()=>acaoSel.executar()}>{comprando?'Comprando…':acaoSel.rotulo===String(itemSelecionado?.preco)?`Comprar · ${acaoSel.rotulo} talentos`:acaoSel.rotulo}</button>}</footer>
    </section>
  </div>;
}

const ESTILO_LOJA=`
.loja-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(16,39,51,.48);font-family:Archivo_600SemiBold,system-ui,sans-serif;color:#24463F;box-sizing:border-box}
.loja-overlay *{box-sizing:border-box}.loja-overlay button{font:inherit;cursor:pointer}.loja-overlay button:disabled{cursor:default;opacity:.65}.loja-overlay button:focus-visible{outline:3px solid #196DA2;outline-offset:3px}
.loja-dialog{width:100%;max-width:1120px;height:min(92dvh,820px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #fff;border-radius:26px;background:#F4FAF7;box-shadow:0 24px 80px #142C4255}
.loja-header{display:flex;align-items:center;gap:16px;padding:20px 26px;background:linear-gradient(115deg,#DBEBFB,#CFF1DF);flex-shrink:0}.loja-header h1{margin:4px 0 0;font-size:28px}.loja-eyebrow{font-size:10px;letter-spacing:1.3px;color:#4E756C}.loja-saldo{margin-left:auto;display:flex;flex-direction:column;gap:4px;text-align:right;font-size:15px}.loja-saldo small{font-size:11px}.loja-fechar{width:40px;height:40px;border-radius:50%;border:1px solid #ABCAC0;background:#FFFFFFBB;color:#24463F}
.loja-abas{display:flex;gap:6px;padding:10px 18px;overflow-x:auto;flex-shrink:0;border-bottom:1px solid #DCEAE4}.loja-abas button{border:0;border-radius:24px;display:flex;gap:7px;align-items:center;padding:10px 14px;white-space:nowrap;background:transparent;color:#43695F;font-size:12px;min-height:42px}.loja-abas span{display:flex;width:18px;height:18px}.loja-abas svg{width:100%;height:100%}.loja-abas button[aria-pressed=true]{background:#357965;color:white}
.loja-conteudo{display:flex;flex:1;min-height:0}.loja-previa{width:36%;display:flex;flex-direction:column;min-width:0;background:radial-gradient(ellipse at 50% 40%,#F3FFF7,#D4EAF6 75%,#CFEADB)}.loja-palco{position:relative;flex:1;min-height:130px}.loja-canvas{position:absolute;inset:0}.loja-carregando{position:absolute;inset:40% 0 auto;text-align:center;font-size:12px}.loja-alternativa{position:absolute;inset:30px 20px 40px;pointer-events:none}.loja-alternativa svg{width:100%;height:100%}.loja-girar{position:absolute;bottom:10px;left:0;right:0;text-align:center;pointer-events:none;font-size:11px;color:#54776E}.loja-zoom{position:absolute;top:12px;left:12px;background:#FFFFFFCC;border:1px solid #B3CEC4;border-radius:22px;padding:8px 12px;font-size:11px}.loja-detalhes{padding:18px 22px;background:#FFFFFF77}.loja-detalhes h2{font-size:21px;line-height:1.2;margin:6px 0}.loja-detalhes p{font-size:12px;line-height:1.5;color:#527269;margin:8px 0}.loja-detalhes small{font-size:11px;color:#527269}
.loja-catalogo{flex:1;min-width:0;display:flex;flex-direction:column}.loja-filtros{padding:14px 18px;flex-shrink:0}.loja-filtros strong{font-size:14px}.loja-filtros small{font-weight:normal;color:#698278}.loja-filtros>div{display:flex;overflow-x:auto;gap:6px;margin-top:10px}.loja-filtros button{border:1px solid #D2E3DA;background:white;border-radius:20px;padding:8px 12px;white-space:nowrap;color:#44695D;font-size:11px}.loja-filtros button[aria-pressed=true]{background:#D9ECE2;border-color:#76AB91}
.loja-grid{overflow:auto;overscroll-behavior:contain;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));align-content:start;gap:12px;padding:4px 18px 20px;min-height:0}.loja-card{text-align:left;display:flex;flex-direction:column;gap:8px;border:2px solid transparent;border-radius:16px;padding:9px;background:white;color:#294C42;min-width:0;box-shadow:0 2px 9px #294C4209}.loja-card[aria-pressed=true]{border-color:#408C76;background:#EEFAF3}.loja-miniatura{aspect-ratio:1;width:100%;border-radius:10px;background:linear-gradient(#E5F0F5,#E5F0E8);position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}.loja-miniatura img,.loja-miniatura>div{width:100%;height:100%;object-fit:contain}.loja-miniatura svg{width:100%;height:100%}.loja-miniatura small{position:absolute;right:6px;bottom:6px;font-size:9px;padding:3px 5px;border-radius:6px;color:#436559;background:#FFFFFFCC}.loja-card-nome{font-size:12px;line-height:1.4;overflow-wrap:anywhere}.loja-card-estado{font-size:10px;line-height:1.4;color:#56776B;margin-top:auto}
.loja-rodape{display:flex;align-items:center;gap:16px;padding:14px 22px;background:#FFFFFF;border-top:1px solid #DCEAE4;flex-shrink:0;min-height:72px}.loja-rodape>div{flex:1;font-size:12px;line-height:1.4;min-width:0}.loja-principal{background:#357965;color:white;border:0;border-radius:24px;padding:13px 24px;min-height:44px;max-width:55%;font-size:13px}
@media(max-width:699px){.loja-overlay{padding:6px}.loja-dialog{height:calc(100dvh - 12px);border-radius:20px}.loja-header{padding:12px;gap:10px}.loja-header h1{font-size:23px}.loja-header .loja-eyebrow{font-size:8px;letter-spacing:.6px}.loja-saldo{font-size:12px}.loja-fechar{width:36px;height:36px;flex-shrink:0}.loja-abas{padding:6px 9px}.loja-abas button{padding:8px 10px}.loja-conteudo{flex-direction:column}.loja-previa{width:100%;height:176px;flex-direction:row;flex-shrink:0}.loja-palco{width:42%;flex:none}.loja-detalhes{flex:1;min-width:0;padding:12px;overflow:auto}.loja-detalhes h2{font-size:16px}.loja-detalhes p{font-size:11px}.loja-detalhes .loja-eyebrow{font-size:9px}.loja-catalogo{min-height:0}.loja-filtros{padding:10px 12px}.loja-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:4px 12px 12px}.loja-rodape{padding:10px 12px;gap:10px}.loja-principal{padding:12px 15px;font-size:12px}.loja-rodape>div{font-size:11px}.loja-girar{font-size:9px}.loja-zoom{font-size:10px;top:6px;left:6px;padding:6px 9px}}
@media(max-height:500px) and (orientation:landscape){.loja-overlay{padding:4px}.loja-dialog{height:calc(100dvh - 8px)}.loja-header{padding:6px 14px}.loja-header h1{font-size:20px}.loja-header .loja-eyebrow{display:none}.loja-abas{padding:3px 10px}.loja-abas button{min-height:32px;padding:5px 10px}.loja-conteudo{flex-direction:row}.loja-previa{width:34%;height:auto;flex-direction:column}.loja-palco{width:100%;min-height:80px;flex:1}.loja-detalhes{flex:none;padding:8px 12px}.loja-detalhes h2{font-size:14px}.loja-detalhes p,.loja-detalhes .loja-eyebrow{display:none}.loja-rodape{min-height:52px;padding:6px 14px}.loja-filtros{padding:6px 12px}.loja-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}.loja-principal{padding:8px 18px}}
`;
