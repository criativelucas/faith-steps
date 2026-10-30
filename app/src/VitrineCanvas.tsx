// Vitrine do boneco 3D: mostra o personagem fora da casa (espelho, guarda-roupa, criação, recompensa e retrato).
// Arraste para girar. Com "rosto", enquadra só a cabeça.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { type Look, type Pose } from './personagem';
import { animacaoDe, criarBoneco, extrasDe, type Boneco } from './boneco3d';

export type PropsVitrine = {
  look: Look;
  forma: number;
  humor: string;
  pose?: Pose;
  fones?: boolean;
  olhosFechados?: boolean;
  rosto?: boolean;
  busto?: boolean;
  giroOffset?: number;
  dom?: import('expo/dom').DOMProps;
};

export default function Vitrine3D(props: PropsVitrine) {
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);
  const p = useRef(props);
  useEffect(() => { p.current = props; }, [props]);
  const vestir = useRef(() => {});
  const ajustarRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = raiz.current!;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch {
      // The renderer is an external system; report its initialization failure to the UI.
      setErro(true); setCarregando(false); return;
    }
    const maxPR = (typeof window !== 'undefined' && window.innerWidth < 768) ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(maxPR);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    const tela = renderer.domElement;
    Object.assign(tela.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' });
    el.appendChild(tela);

    const cena = new THREE.Scene();
    cena.add(new THREE.HemisphereLight('#FFF8F0', '#9CB8C8', 1.8));
    const luz = new THREE.DirectionalLight('#FFF7ED', 2.6);
    luz.position.set(-2, 4, 3);
    const recorte = new THREE.DirectionalLight('#D2F7FF', 1.4); // luz de contorno rosada
    recorte.position.set(2.5, 2, -2.5);
    cena.add(luz, recorte);
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), new THREE.MeshBasicMaterial({ color: '#315C65', transparent: true, opacity: 0.12, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2;
    cena.add(sombra);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    const pivo = new THREE.Group();
    cena.add(pivo);

    let boneco: Boneco | null = null;
    vestir.current = () => {
      if (!boneco) return;
      const q = p.current, pose = q.pose ?? 'baixo';
      boneco.vestir(q.look, q.forma, q.humor);
      boneco.expressao({ olhosFechados: !!q.olhosFechados, extras: extrasDe(pose, q.fones) });
      boneco.animar(animacaoDe(pose));
      if (quieto) boneco.atualizar(0.5); // sem animação: só a pose
    };
    let vivo = true;
    criarBoneco().then(b => {
      if (!vivo) { b.descartar(); return; }
      boneco = b;
      setCarregando(false);
      pivo.add(b.objeto);
      vestir.current();
    }).catch(erro => { console.warn('Falha no personagem 3D:', erro); if (vivo) { setErro(true); setCarregando(false); } });

    // Enquadramento dinâmico: corpo inteiro, busto ou só o rosto
    const ajustar = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const r = !!p.current.rosto, b = !!p.current.busto;
      camera.fov = r ? 22 : b ? 24 : 28;
      const [alvoY, meiaAltura, meiaLargura] = r ? [1.43, 0.32, 0.28] : b ? [1.12, 0.5, 0.38] : [0.86, 0.94, 0.43];
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(meiaAltura / t, meiaLargura / (t * camera.aspect));
      camera.position.set(0, alvoY + dist * (r ? 0 : 0.025), dist);
      camera.lookAt(0, alvoY, 0);
      camera.updateProjectionMatrix();
    };
    ajustarRef.current = ajustar;
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    ajustar();

    // Arrastar para girar livremente
    let giro = 0.08, puxando: number | null = null;
    const descer = (e: PointerEvent) => {
      puxando = e.clientX;
      try { tela.setPointerCapture(e.pointerId); } catch {}
      tela.style.cursor = 'grabbing';
    };
    const mover = (e: PointerEvent) => { if (puxando === null) return; giro += (e.clientX - puxando) * 0.012; puxando = e.clientX; };
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
      boneco?.atualizar(quieto ? 0 : dt);
      pivo.rotation.y = giro + (p.current.giroOffset ?? 0);
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
  }, [tentativa]);

  const { look, forma, humor, pose, fones, olhosFechados, rosto, busto } = props;
  const chaveLook = JSON.stringify(look);
  useEffect(() => {
    vestir.current();
    ajustarRef.current?.();
  }, [chaveLook, forma, humor, pose, fones, olhosFechados, rosto, busto]);

  return <div style={{ position: 'absolute', inset: 0 }}>
    <div ref={raiz} style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none' }} />
    {(erro || carregando) && <div role="status" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#315765', font: '12px Arial', gap: 12 }}>
      {erro ? 'Não foi possível carregar o personagem.' : 'Preparando seu personagem…'}
      {erro && <button onClick={() => { setErro(false); setCarregando(true); setTentativa(n => n + 1); }}>Tentar novamente</button>}
    </div>}
  </div>;
}
