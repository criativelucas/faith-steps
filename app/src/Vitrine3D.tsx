'use dom';
// Vitrine do boneco 3D: mostra o personagem fora da casa (espelho, guarda-roupa, criação, recompensa e retrato).
// Arraste para girar. Com "rosto", enquadra só a cabeça.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { type Look, type Pose } from './personagem';
import { animacaoDe, criarBoneco, extrasDe, type Boneco } from './boneco3d';

type Props = {
  look: Look;
  forma: number;
  humor: string;
  pose?: Pose;
  fones?: boolean;
  olhosFechados?: boolean;
  rosto?: boolean;
  dom?: import('expo/dom').DOMProps;
};

export default function Vitrine3D(props: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const p = useRef(props);
  p.current = props;
  const vestir = useRef(() => {});

  useEffect(() => {
    const el = raiz.current!;
    const rosto = !!p.current.rosto;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const tela = renderer.domElement;
    Object.assign(tela.style, { display: 'block', width: '100%', height: '100%', touchAction: 'pan-y', cursor: rosto ? 'inherit' : 'grab' });
    el.appendChild(tela);

    const cena = new THREE.Scene();
    cena.add(new THREE.HemisphereLight('#FFF8F0', '#D9C2AA', 1.7));
    const luz = new THREE.DirectionalLight('#FFF1DE', 2.1);
    luz.position.set(-2, 4, 3);
    const recorte = new THREE.DirectionalLight('#FFD6E8', 0.9); // luz de contorno rosada
    recorte.position.set(2.5, 2, -2.5);
    cena.add(luz, recorte);
    if (!rosto) {
      const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), new THREE.MeshBasicMaterial({ color: '#42124C', transparent: true, opacity: 0.12, depthWrite: false }));
      sombra.rotation.x = -Math.PI / 2;
      cena.add(sombra);
    }
    const camera = new THREE.PerspectiveCamera(rosto ? 22 : 28, 1, 0.1, 50);
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
      if (!vivo) return;
      boneco = b;
      pivo.add(b.objeto);
      vestir.current();
    }).catch(() => { /* sem o modelo, a vitrine fica vazia */ });

    // Enquadramento: corpo inteiro ou só o rosto
    const ajustar = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const [alvoY, meiaAltura, meiaLargura] = rosto ? [1.25, 0.34, 0.34] : [0.84, 0.92, 0.5];
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(meiaAltura / t, meiaLargura / (t * camera.aspect));
      camera.position.set(0, alvoY + dist * 0.12, dist);
      camera.lookAt(0, alvoY, 0);
      camera.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    ajustar();

    // Arrastar para girar (o rosto do HUD não gira: ele é um botão)
    let giro = rosto ? 0.2 : 0.35, puxando: number | null = null;
    const descer = (e: PointerEvent) => { puxando = e.clientX; tela.setPointerCapture(e.pointerId); tela.style.cursor = 'grabbing'; };
    const mover = (e: PointerEvent) => { if (puxando === null) return; giro += (e.clientX - puxando) * 0.012; puxando = e.clientX; };
    const subir = () => { puxando = null; tela.style.cursor = 'grab'; };
    if (!rosto) {
      tela.addEventListener('pointerdown', descer);
      tela.addEventListener('pointermove', mover);
      tela.addEventListener('pointerup', subir);
      tela.addEventListener('pointercancel', subir);
    }

    let ultimo = performance.now(), quadro = 0;
    const laco = () => {
      if (!vivo) return;
      const agora = performance.now(), dt = Math.min((agora - ultimo) / 1000, 0.1);
      ultimo = agora;
      boneco?.atualizar(quieto ? 0 : dt);
      pivo.rotation.y = giro;
      renderer.render(cena, camera);
      quadro = requestAnimationFrame(laco);
    };
    laco();

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      obs.disconnect();
      renderer.dispose();
      tela.remove();
    };
  }, []);

  const { look, forma, humor, pose, fones, olhosFechados } = props;
  useEffect(() => vestir.current(), [JSON.stringify(look), forma, humor, pose, fones, olhosFechados]);

  return <div ref={raiz} style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none' }} />;
}
