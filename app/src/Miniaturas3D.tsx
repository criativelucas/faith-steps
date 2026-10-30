import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { criarBoneco, type Boneco } from './boneco3d';
import type { Look } from './personagem';

export type OpcaoVisual = { id: string; nome: string; look: Look; legenda?: string; bloqueado?: boolean };
export type Recorte = 'corpo' | 'rosto' | 'cima' | 'baixo' | 'calcado';
// One offscreen context for the whole catalogue. Tiles are images, never live canvases.
export default function Miniaturas3D({ opcoes, recorte, selecionado, onEscolher }: {
  opcoes: OpcaoVisual[]; recorte: Recorte; selecionado?: string; onEscolher: (id: string) => void;
}) {
  const [imagens, setImagens] = useState<Record<string, string>>({});
  const [erro, setErro] = useState(false);
  const assinatura = JSON.stringify(opcoes.map(o => ({ id: o.id, look: o.look })));
  useEffect(() => {
    let cancelado = false, quadro = 0;
    let renderer: THREE.WebGLRenderer | undefined, boneco: Boneco | undefined;
    const cena = new THREE.Scene();
    const gerar = async () => {
      try {
        boneco = await criarBoneco();
        if (cancelado) { boneco.descartar(); return; }
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(240, 260); renderer.setPixelRatio(1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        cena.add(new THREE.HemisphereLight('#f5fbff', '#a5b4be', 2));
        const luz = new THREE.DirectionalLight('#fff7eb', 2.8); luz.position.set(-3, 5, 6); cena.add(luz);
        const contra = new THREE.DirectionalLight('#d6f5ff', 1.4); contra.position.set(3, 2, -3); cena.add(contra);
        cena.add(boneco.objeto); boneco.objeto.rotation.y = 0.18;
        const camera = new THREE.PerspectiveCamera(28, 240 / 260, 0.01, 30);
        const [y, altura] = { corpo: [0.86, 1.92], rosto: [1.43, 0.64], cima: [1.02, 0.96], baixo: [0.48, 1.05], calcado: [0.14, 0.43] }[recorte];
        const d = altura / (2 * Math.tan(THREE.MathUtils.degToRad(14)));
        camera.position.set(0, y + 0.025, d); camera.lookAt(0, y, 0);
        setErro(false); setImagens({});
        const lista = JSON.parse(assinatura) as Pick<OpcaoVisual, 'id' | 'look'>[];
        let i = 0;
        const proxima = () => {
          if (cancelado || !renderer || !boneco || i >= lista.length) return;
          const opcao = lista[i++]; boneco.vestir(opcao.look, 50, 'normal');
          boneco.animar('parado'); boneco.atualizar(0);
          renderer.render(cena, camera);
          const imagem = renderer.domElement.toDataURL('image/png');
          setImagens(ant => ({ ...ant, [opcao.id]: imagem }));
          quadro = requestAnimationFrame(proxima);
        };
        proxima();
      } catch (erro) { console.warn('Falha nas miniaturas 3D:', erro); if (!cancelado) setErro(true); }
    };
    void gerar();
    return () => { cancelado = true; cancelAnimationFrame(quadro); boneco?.descartar(); renderer?.dispose(); renderer?.forceContextLoss(); };
  }, [assinatura, recorte]);
  return <div className="cas-grid" aria-label="Catálogo de visuais">
    {opcoes.map(o => <button key={o.id} className={`cas-tile ${selecionado === o.id ? 'selected' : ''}`} onClick={() => onEscolher(o.id)} aria-pressed={selecionado === o.id} aria-label={o.nome}>
      <span className="cas-tile-image">{imagens[o.id] ? <img src={imagens[o.id]} alt="" /> : <span className="cas-loading">{erro ? 'Prévia indisponível' : 'Preparando…'}</span>}</span>
      {selecionado === o.id && <span className="cas-tile-check">✓</span>}
      <span className="cas-tile-label">{o.nome}</span>
      <span className={`cas-tile-status ${o.bloqueado ? 'locked' : ''}`}>{o.legenda ?? 'Disponível'}</span>
    </button>)}
    {!opcoes.length && <p className="cas-empty">Nenhuma peça nesta combinação. Experimente outra ocasião.</p>}
  </div>;
}
