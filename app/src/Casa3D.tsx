'use dom';
// Casa 3D do Faith Steps (three.js). No navegador roda direto; no celular roda dentro de uma WebView do Expo.
// A casa tem 5 cômodos numa planta só. A câmera gira em volta (presa na casa), dá zoom e foca em cada cômodo.
// O personagem é um boneco 3D feito no Blender (arte3d/boneco.py), com esqueleto e animações.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { type Look, type Pose } from './personagem';
import { animacaoDe, criarBoneco, extrasDe, type Boneco, type ItemMao } from './boneco3d';
import { modeloCarro, avancarTrafego, RAIO_RODA } from './mundoExterior';
import { rosado, tingir, tingirSvg } from './cores';
import {
  ATIVIDADES, CORES_CASA, LOJA, servePara,
  type Acabamento, type AtividadeId, type Item, type Mobilia,
} from './jogo';
import { MOVEIS, movelSvg, revestimentoSvg, snapGrid, validarPosicaoMovel } from './casa';
import { calcularAmbienteTempo } from './relogio';
import { icone } from './icones';
import { PASSAGENS, abrirPassagens, areaPassagem } from './circulacao';
import { MOVEIS_ORIGINAIS, idOriginal } from './moveisOriginais';
import { diaLocal, lerVidaLocal, vidaVazia, receberCarta, regarHorta, type VidaLocal } from './vidaLocal';
import { criarMicroEfeitos } from './microEfeitos';
import { desafioDoDia } from './praticas';
import { AmbienteSonoro } from './ambienteSonoro';

type Props = {
  look: Look;
  forma: number;
  humor: string;
  nome: string;
  perfilId: string;
  itens: string[];
  mobilia: Mobilia[];
  acabamentos: Record<string, Acabamento>;
  decorando: boolean;
  talentos: number;
  nivel: number;
  achados: string[];
  acao: AtividadeId | null;
  foco: string;
  cor: string; // cor dos móveis e detalhes (o que era rosa)
  pausado?: boolean;
  onUsar: (alvo: string) => Promise<void>;
  onFoco: (foco: string) => Promise<void>;
  onMudarMobilia: (mobilia: Mobilia[]) => Promise<void>;
  onMudarAcabamento: (comodo: string, acabamento: Acabamento) => Promise<void>;
  onCor: (cor: string) => Promise<void>;
  onComprar: (itemId: string) => Promise<void>;
  onFecharDecorar: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

/* ---------- Planta da casa ---------- */

const ALTURA = 2.6, ESP = 0.14, BAIXA = 0.32;
type Comodo = { id: string; nome: string; x0: number; z0: number; x1: number; z1: number; parede: string; chao: string; piso: 'madeira' | 'azulejo' | 'carpete' };
const COMODOS: Comodo[] = [
  { id: 'quarto', nome: 'Quarto', x0: 0, z0: 0, x1: 5, z1: 4.5, parede: '#F4E3EA', chao: '#F3E9E0', piso: 'carpete' },
  { id: 'banheiro', nome: 'Banheiro', x0: 5, z0: 0, x1: 8, z1: 4.5, parede: '#F3EEE8', chao: '#EFE3DA', piso: 'azulejo' },
  { id: 'estudo', nome: 'Sala de estudo', x0: 8, z0: 0, x1: 12, z1: 4.5, parede: '#EFE5D8', chao: '#D9C2AA', piso: 'madeira' },
  { id: 'sala', nome: 'Sala', x0: 0, z0: 4.5, x1: 7, z1: 9, parede: '#F2EAE0', chao: '#DCC6B0', piso: 'madeira' },
  { id: 'cozinha', nome: 'Cozinha', x0: 7, z0: 4.5, x1: 12, z1: 9, parede: '#EEF0E8', chao: '#F1E8DD', piso: 'azulejo' },
];
const comodoEm = (x: number, z: number) => [...COMODOS, ...EXTRAS.filter(e => !e.aberto)].find(c => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);
const CENTRO_CASA = new THREE.Vector3(6, 0, 4.5);

// Paredes divididas por cômodo (com vãos das portas e vergas y0/y1), para cada cômodo ter seu próprio papel de parede.
// e0/e1 estendem só os cantos externos por ESP/2, evitando sobreposição entre trechos alinhados.
type Parede = { x0: number; z0: number; x1: number; z1: number; y0?: number; y1?: number; externa?: boolean; e0?: boolean; e1?: boolean };
const PAREDES_BASE: Parede[] = [
  // Parede dos fundos (z = 0): quarto, banheiro e estudo
  { x0: 0, z0: 0, x1: 5, z1: 0, externa: true, e0: true },
  { x0: 5, z0: 0, x1: 8, z1: 0, externa: true },
  { x0: 8, z0: 0, x1: 12, z1: 0, externa: true, e1: true },
  // Parede da frente (z = 9): sala (com porta 2..3) e cozinha
  { x0: 0, z0: 9, x1: 2, z1: 9, externa: true, e0: true },
  { x0: 2, z0: 9, x1: 3, z1: 9, y0: 2.15, externa: true },
  { x0: 3, z0: 9, x1: 7, z1: 9, externa: true },
  { x0: 7, z0: 9, x1: 12, z1: 9, externa: true, e1: true },
  // Parede esquerda (x = 0): quarto e sala
  { x0: 0, z0: 0, x1: 0, z1: 4.5, externa: true, e0: true },
  { x0: 0, z0: 4.5, x1: 0, z1: 9, externa: true, e1: true },
  // Parede direita (x = 12): estudo e cozinha
  { x0: 12, z0: 0, x1: 12, z1: 4.5, externa: true, e0: true },
  { x0: 12, z0: 4.5, x1: 12, z1: 9, externa: true, e1: true },
  // Parede central (z = 4.5), cortada nas divisórias x = 5, 7, 8 e portas
  { x0: 0, z0: 4.5, x1: 2.6, z1: 4.5 },
  { x0: 2.6, z0: 4.5, x1: 3.5, z1: 4.5, y0: 2.15 },
  { x0: 3.5, z0: 4.5, x1: 5, z1: 4.5 },
  { x0: 5, z0: 4.5, x1: 6.0, z1: 4.5 },
  { x0: 6.0, z0: 4.5, x1: 6.9, z1: 4.5, y0: 2.15 },
  { x0: 6.9, z0: 4.5, x1: 7, z1: 4.5 },
  { x0: 7, z0: 4.5, x1: 8, z1: 4.5 },
  { x0: 8, z0: 4.5, x1: 9.6, z1: 4.5 },
  { x0: 9.6, z0: 4.5, x1: 10.5, z1: 4.5, y0: 2.15 },
  { x0: 10.5, z0: 4.5, x1: 12, z1: 4.5 },
  // Divisórias internas verticais
  { x0: 5, z0: 0, x1: 5, z1: 4.5 },
  { x0: 8, z0: 0, x1: 8, z1: 4.5 },
  { x0: 7, z0: 4.5, x1: 7, z1: 5.4 },
  { x0: 7, z0: 8.1, x1: 7, z1: 9 },
];

const PAREDES: Parede[] = abrirPassagens(PAREDES_BASE,PASSAGENS.filter(p=>p.id!=='garagem'));

// Cômodos comprados na loja: dois anexos do lado direito (porta virada para a casa) e o jardim nos fundos
type Extra = Comodo & { item: string; aberto?: boolean; placa: [number, number] };
const EXTRAS: Extra[] = [
  { id: 'estudio', item: 'estudio', nome: 'Estúdio de louvor', x0: 13.4, z0: 0.2, x1: 18.2, z1: 4.4, parede: '#ECE5F3', chao: '#D9CCE6', piso: 'carpete', placa: [15.8, 2.3] },
  { id: 'academia', item: 'academia', nome: 'Academia', x0: 13.4, z0: 4.8, x1: 18.2, z1: 9.0, parede: '#E7EEF1', chao: '#C3CCD3', piso: 'azulejo', placa: [15.8, 6.9] },
  { id: 'jardim', item: 'jardim', nome: 'Jardim com horta', x0: 0.3, z0: -6.3, x1: 11.7, z1: -0.7, parede: '', chao: '', piso: 'madeira', aberto: true, placa: [5.6, -3.2] },
  { id: 'piscina', item: 'piscina', nome: 'Área da Piscina', x0: -5.6, z0: 0.4, x1: -0.2, z1: 8.8, parede: '', chao: '', piso: 'madeira', aberto: true, placa: [-2.9, 4.6] },
  { id: 'garagem', item: 'garagem', nome: 'Garagem / Oficina Criativa', x0: -5.6, z0: 9.2, x1: -0.2, z1: 12.2, parede: '#E6EAEF', chao: '#C4C8CE', piso: 'azulejo', placa: [-2.9, 10.7] },
  { id: 'varanda', item: 'varanda', nome: 'Varanda Gourmet & Horta', x0: 7.2, z0: -4.2, x1: 12.2, z1: -0.2, parede: '#F5EFE6', chao: '#D5B28A', piso: 'madeira', aberto: true, placa: [9.7, -2.2] },
];
const anexo = (x0: number, z0: number, x1: number, z1: number, p0: number, p1: number): Parede[] => [
  { x0, z0, x1, z1: z0, externa: true, e0: true, e1: true },
  { x0, z0: z1, x1, z1, externa: true, e0: true, e1: true },
  { x0: x1, z0, x1, z1, externa: true, e0: true, e1: true },
  { x0, z0, x1: x0, z1: p0, externa: true, e0: true },
  { x0, z0: p1, x1: x0, z1: z1, externa: true, e1: true },
  { x0, z0: p0, x1: x0, z1: p1, y0: 2.15, externa: true },
];
const PAREDES_EXTRAS: Record<string, Parede[]> = {
  estudio: anexo(13.4, 0.2, 18.2, 4.4, 1.8, 2.7),
  academia: anexo(13.4, 4.8, 18.2, 9.0, 6.4, 7.3),
  jardim: [],
  piscina: [],
  garagem: [
    { x0: -5.6, z0: 9.2, x1: -0.2, z1: 9.2, externa: true, e0: true, e1: true },
    { x0: -5.6, z0: 9.2, x1: -5.6, z1: 12.2, externa: true, e0: true, e1: true },
    { x0: -0.2, z0: 9.2, x1: -0.2, z1: 10.1, externa: true, e0: true },
    { x0: -0.2, z0: 11.2, x1: -0.2, z1: 12.2, externa: true, e1: true },
    { x0: -0.2, z0: 10.1, x1: -0.2, z1: 11.2, y0: 2.15, externa: true },
  ],
  varanda: [],
};

PAREDES_EXTRAS.garagem=abrirPassagens(PAREDES_EXTRAS.garagem,PASSAGENS.filter(p=>p.id==='garagem'));

const LIMA = '#8AFF00', PINK = '#FE0472', NOITE = '#2A0A31', NEVOA = '#FBF3F8', ROSA = '#FFD1E6';
const MADEIRA = '#C9A88A', MADEIRA_CLARA = '#E0CDBE', AMEIXA_SUAVE = '#6A4A6E', BRANCO = '#FFFFFF';

/* ---------- Ajudantes de geometria ---------- */

// Tudo que é rosa na casa segue a cor escolhida (regra em cores.ts)
function tingirCasa(grupos: THREE.Object3D[], cor: string) {
  for (const g of grupos) g.traverse(obj => {
    const m = (obj as THREE.Mesh).material;
    for (const mt of !m ? [] : Array.isArray(m) ? m : [m]) {
      if (!(mt instanceof THREE.MeshStandardMaterial) || mt.userData.revestimento) continue;
      const u = mt.userData;
      if (!('orig' in u)) {
        const c = '#' + mt.color.getHexString(), e = '#' + mt.emissive.getHexString();
        u.orig = rosado(c) ? c : null;
        u.origEmissivo = rosado(e) ? e : null;
      }
      if (u.orig) mt.color.set(tingir(u.orig, cor));
      if (u.origEmissivo) mt.emissive.set(tingir(u.origEmissivo, cor));
    }
  });
}

const mat = (cor: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, ...extra });

function caixa(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, cor: string | THREE.Material, sombra = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof cor === 'string' ? mat(cor) : cor);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = sombra;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cil(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, cor: string, topo?: number, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(topo ?? r, r, h, seg), mat(cor));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function bola(g: THREE.Object3D, x: number, y: number, z: number, r: number, cor: string, achatada = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(cor, { flatShading: true }));
  m.position.set(x, y, z);
  m.scale.y = achatada;
  m.castShadow = true;
  g.add(m);
  return m;
}

// Texturas desenhadas num canvas (pisos, papéis de parede, janelas dos prédios)
function textura(desenhar: (c: CanvasRenderingContext2D, t: number) => void, tamanho = 256, repetir = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tamanho;
  desenhar(cv.getContext('2d')!, tamanho);
  const tx = new THREE.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.repeat.set(repetir, repetir);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
const escurecer = (hex: string, t: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#1A0420'), t).getHexString();
const clarear = (hex: string, t: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#FFFFFF'), t).getHexString();

function texturaPiso(piso: Comodo['piso'], cor: string) {
  return textura((c, t) => {
    c.fillStyle = cor;
    c.fillRect(0, 0, t, t);
    c.strokeStyle = escurecer(cor, 0.1);
    c.lineWidth = 2;
    if (piso === 'madeira') {
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(0, i * 32); c.lineTo(t, i * 32); c.stroke(); }
      for (let i = 0; i < 8; i++) { const x = ((i * 97) % t); c.beginPath(); c.moveTo(x, i * 32); c.lineTo(x, i * 32 + 32); c.stroke(); }
    } else if (piso === 'azulejo') {
      for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(0, i * 64); c.lineTo(t, i * 64); c.moveTo(i * 64, 0); c.lineTo(i * 64, t); c.stroke(); }
    } else {
      c.fillStyle = escurecer(cor, 0.04);
      for (let i = 0; i < 400; i++) c.fillRect((i * 53) % t, (i * 97) % t, 2, 2);
    }
  });
}

function texturaPapel(id: string, corTema: string): { tx: THREE.CanvasTexture; roughness: number } {
  const tom = tingir(ROSA, corTema);
  let roughness = 0.82;
  const tx = textura((c, t) => {
    if (id === 'papelCreme') {
      c.fillStyle = '#F6EFE6'; c.fillRect(0, 0, t, t);
      c.fillStyle = '#ECE2D4';
      for (let i = 0; i < 240; i++) c.fillRect((i * 67) % t, (i * 109) % t, 3, 2);
    } else if (id === 'papelListras') {
      c.fillStyle = '#FCF7FA'; c.fillRect(0, 0, t, t);
      c.fillStyle = tom;
      for (let x = 0; x < t; x += 32) c.fillRect(x, 0, 14, t);
    } else if (id === 'papelPoa') {
      c.fillStyle = '#FBF4EC'; c.fillRect(0, 0, t, t);
      for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
        c.fillStyle = (r + col) % 2 ? '#FFE09E' : tom;
        c.beginPath();
        c.arc(col * 64 + (r % 2) * 32 + 16, r * 64 + 32, 9, 0, Math.PI * 2);
        c.fill();
      }
    } else if (id === 'papelSalvia') {
      c.fillStyle = '#D5E3D0'; c.fillRect(0, 0, t, t);
      c.fillStyle = '#BBCDB4';
      for (const [x, y] of [[48, 56], [176, 56], [112, 120], [48, 184], [176, 184]]) {
        c.beginPath(); c.ellipse(x, y, 16, 7, -0.45, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(x + 14, y - 10, 13, 6, 0.55, 0, Math.PI * 2); c.fill();
      }
    } else if (id === 'papelAzulejo') {
      roughness = 0.45;
      c.fillStyle = '#F4F7FA'; c.fillRect(0, 0, t, t);
      c.strokeStyle = '#CBD6E0'; c.lineWidth = 3;
      for (let r = 0; r < 8; r++) {
        const y = r * 32;
        c.beginPath(); c.moveTo(0, y); c.lineTo(t, y); c.stroke();
        for (let col = 0; col < 4; col++) {
          const x = (col * 64 + (r % 2) * 32) % t;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke();
        }
      }
    } else if (id === 'papelTijolo') {
      roughness = 0.9;
      c.fillStyle = '#EAE0D5'; c.fillRect(0, 0, t, t);
      for (let r = 0; r < 8; r++) for (let col = -1; col < 4; col++) {
        c.fillStyle = ['#C86D51', '#B95B40', '#D17A5E'][(r * 3 + col + 4) % 3];
        c.fillRect(col * 64 + (r % 2) * 32 + 3, r * 32 + 3, 58, 26);
      }
    } else if (id === 'papelFloral') {
      c.fillStyle = '#FDF7F2'; c.fillRect(0, 0, t, t);
      for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
        const cx = col * 64 + (r % 2) * 32 + 16, cy = r * 64 + 32;
        c.fillStyle = '#9BC775';
        c.beginPath(); c.ellipse(cx + 10, cy + 7, 7, 3.5, 0.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = tom;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          c.beginPath(); c.arc(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 5.5, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = '#F5B700';
        c.beginPath(); c.arc(cx, cy, 4.5, 0, Math.PI * 2); c.fill();
      }
    } else if (id === 'papelCeu') {
      roughness = 0.72;
      c.fillStyle = '#283354'; c.fillRect(0, 0, t, t);
      c.fillStyle = '#FFE27A';
      for (let i = 0; i < 28; i++) {
        const x = (i * 83 + 19) % t, y = (i * 137 + 29) % t, r = 2 + (i % 3) * 1.5;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
    } else if (id === 'papelBoiserie') {
      c.fillStyle = '#EFEAE2'; c.fillRect(0, 0, t, t);
      c.strokeStyle = '#CFC4B4'; c.lineWidth = 6;
      c.strokeRect(18, 18, 92, 220); c.strokeRect(146, 18, 92, 220);
      c.strokeStyle = '#FAF7F2'; c.lineWidth = 2.5;
      c.strokeRect(23, 23, 82, 210); c.strokeRect(151, 23, 82, 210);
    } else {
      // papelMadeira (ripado)
      roughness = 0.76;
      c.fillStyle = '#C89B72'; c.fillRect(0, 0, t, t);
      for (let x = 0; x < t; x += 16) {
        c.fillStyle = '#9B6E48'; c.fillRect(x, 0, 4, t);
        c.fillStyle = '#D5AA82'; c.fillRect(x + 4, 0, 3, t);
      }
    }
  });
  return { tx, roughness };
}

function texturaRevestimentoPiso(id: string, corTema: string): { tx: THREE.CanvasTexture; roughness: number } {
  const tom = tingir(ROSA, corTema);
  let roughness = 0.8;
  const tx = textura((c, t) => {
    if (id === 'pisoClareira') {
      c.fillStyle = '#E2CCB2'; c.fillRect(0, 0, t, t);
      c.strokeStyle = '#C5AE94'; c.lineWidth = 2;
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(0, i * 32); c.lineTo(t, i * 32); c.stroke(); }
      for (let i = 0; i < 8; i++) { const x = (i * 97) % t; c.beginPath(); c.moveTo(x, i * 32); c.lineTo(x, i * 32 + 32); c.stroke(); }
    } else if (id === 'pisoPorcelanato') {
      roughness = 0.42;
      c.fillStyle = '#F5EFE6'; c.fillRect(0, 0, t, t);
      c.strokeStyle = '#DDD4C7'; c.lineWidth = 2.5;
      for (let i = 0; i <= 2; i++) { c.beginPath(); c.moveTo(0, i * 128); c.lineTo(t, i * 128); c.moveTo(i * 128, 0); c.lineTo(i * 128, t); c.stroke(); }
    } else if (id === 'pisoTerracota') {
      roughness = 0.86;
      c.fillStyle = '#EBCDAC'; c.fillRect(0, 0, t, t);
      for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
        c.fillStyle = (r + col) % 2 ? '#CE7654' : '#C36B4A';
        c.fillRect(col * 64 + 3, r * 64 + 3, 58, 58);
      }
    } else if (id === 'pisoCimento') {
      roughness = 0.65;
      c.fillStyle = '#C4C6CA'; c.fillRect(0, 0, t, t);
      for (let i = 0; i < 18; i++) {
        c.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(60,64,72,0.08)';
        c.beginPath(); c.ellipse((i * 73) % t, (i * 119) % t, 46, 26, i * 0.4, 0, Math.PI * 2); c.fill();
      }
    } else if (id === 'pisoNogueira') {
      roughness = 0.72;
      c.fillStyle = '#7D5538'; c.fillRect(0, 0, t, t);
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#754E33' : '#835A3C';
        c.fillRect(0, i * 32, t, 30);
        c.fillStyle = '#563721';
        c.fillRect(0, i * 32 + 30, t, 2);
        c.fillRect((i * 103) % t, i * 32, 2, 32);
      }
    } else if (id === 'pisoXadrez') {
      roughness = 0.5;
      for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
        c.fillStyle = (r + col) % 2 ? '#3B2344' : '#FAF6F0';
        c.fillRect(col * 64, r * 64, 64, 64);
      }
    } else if (id === 'pisoCarpete') {
      roughness = 0.95;
      c.fillStyle = tom; c.fillRect(0, 0, t, t);
      c.fillStyle = escurecer(tom, 0.08);
      for (let i = 0; i < 500; i++) c.fillRect((i * 53) % t, (i * 97) % t, 2, 2);
      c.fillStyle = clarear(tom, 0.35);
      for (let i = 0; i < 300; i++) c.fillRect((i * 71 + 9) % t, (i * 89 + 5) % t, 2, 2);
    } else if (id === 'pisoEspinha') {
      roughness = 0.72;
      c.fillStyle = '#CFA67B'; c.fillRect(0, 0, t, t);
      c.strokeStyle = '#9A724B'; c.lineWidth = 3;
      for (let y = -32; y < t + 32; y += 32) {
        c.beginPath();
        for (let x = 0; x <= t; x += 32) c.lineTo(x, y + (x % 64 === 0 ? 0 : 18));
        c.stroke();
      }
    } else if (id === 'pisoHidraulico') {
      roughness = 0.58;
      c.fillStyle = '#F7F3EB'; c.fillRect(0, 0, t, t);
      for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
        const cx = col * 64 + 32, cy = r * 64 + 32;
        c.strokeStyle = '#D9D2C5'; c.lineWidth = 2; c.strokeRect(col * 64, r * 64, 64, 64);
        c.fillStyle = '#3B7EA8';
        c.beginPath(); c.moveTo(cx, cy - 22); c.lineTo(cx + 22, cy); c.lineTo(cx, cy + 22); c.lineTo(cx - 22, cy); c.closePath(); c.fill();
        c.fillStyle = '#F7F3EB';
        c.beginPath(); c.arc(cx, cy, 10, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#E8B83A';
        c.beginPath(); c.arc(cx, cy, 5, 0, Math.PI * 2); c.fill();
      }
    } else {
      // pisoMarmore
      roughness = 0.36;
      c.fillStyle = '#FAF9F7'; c.fillRect(0, 0, t, t);
      c.strokeStyle = '#C9C6D2'; c.lineWidth = 3;
      for (const [y0, y1, y2] of [[30, 75, 48], [118, 92, 146], [202, 232, 188]]) {
        c.beginPath(); c.moveTo(0, y0); c.bezierCurveTo(85, y1, 170, y2, t, y0); c.stroke();
      }
      c.strokeStyle = '#E6E4EC'; c.lineWidth = 1.5;
      c.strokeRect(0, 0, 128, 128); c.strokeRect(128, 128, 128, 128);
    }
  });
  return { tx, roughness };
}

/* ---------- Texturas ricas do cenário exterior e iluminação volumétrica ---------- */

function texturaGramaJardim(): THREE.CanvasTexture {
  return textura((c, t) => {
    c.fillStyle = '#8DAA73'; c.fillRect(0, 0, t, t);
    let seed = 92317;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    // Low-contrast seeded grain avoids the old diagonal checkerboard of repeated flowers.
    for (let i=0;i<18000;i++) {
      const v = Math.floor(random()*24);
      c.fillStyle = `rgba(${111+v},${143+v},${83+v},.23)`;
      c.fillRect(random()*t, random()*t, 1+random()*3, 1+random()*2);
    }
    c.strokeStyle = '#718C5D44'; c.lineWidth = .7;
    for (let i=0;i<400;i++) { const x=random()*t,y=random()*t; c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*2-1,y-2-random()*3);c.stroke(); }
  }, 256, 32);
}

function texturaAsfalto(): THREE.CanvasTexture {
  return textura((c, t) => {
    // Asfalto cinza escuro grafite
    c.fillStyle = '#3E3C44';
    c.fillRect(0, 0, t, t);

    // Granulação e agregados minerais finos
    for (let i = 0; i < 900; i++) {
      const x = (i * 97) % t;
      const y = (i * 179) % t;
      c.fillStyle = (i % 3 === 0) ? '#4A4852' : (i % 3 === 1) ? '#323038' : '#575560';
      c.fillRect(x, y, 1.5, 1.5);
    }

    // Marcas de rodagem de pneus suaves
    c.fillStyle = '#35333B';
    c.fillRect(0, 35, t, 50);
    c.fillRect(0, 170, t, 50);

    // Junta de dilatação sutil
    c.strokeStyle = '#2B2930';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 128);
    c.bezierCurveTo(70, 131, 180, 125, t, 129);
    c.stroke();
  }, 256, 1);
}

function texturaCalcadaPaver(): THREE.CanvasTexture {
  return textura((c, t) => {
    // Base em tom areia / marfim suave
    c.fillStyle = '#EFEAE2';
    c.fillRect(0, 0, t, t);

    // Padrão de lajotas / paver intertravado
    const tileW = 32;
    const tileH = 16;
    for (let y = 0; y < t; y += tileH) {
      const row = Math.floor(y / tileH);
      const shift = (row % 2) * (tileW / 2);
      for (let x = -tileW; x < t + tileW; x += tileW) {
        const px = x + shift;
        const seed = ((px * 13) ^ (y * 37)) % 5;
        c.fillStyle = seed === 0 ? '#F5F0E8' : seed === 1 ? '#E9E2D8' : seed === 2 ? '#EDE6DC' : '#E4DDD2';
        c.fillRect(px + 1, y + 1, tileW - 2, tileH - 2);

        // Rejunte suave
        c.strokeStyle = '#C9C0B3';
        c.lineWidth = 1;
        c.strokeRect(px + 0.5, y + 0.5, tileW - 1, tileH - 1);
      }
    }
  }, 256, 1);
}

function texturaFachadaResidencial(corBase: string): THREE.CanvasTexture {
  return textura((c, t) => {
    c.fillStyle = corBase;
    c.fillRect(0, 0, t, t);

    // Linhas estruturais de alvenaria
    c.strokeStyle = escurecer(corBase, 0.07);
    c.lineWidth = 1;
    for (let y = 0; y < t; y += 14) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(t, y);
      c.stroke();
    }

    // 4 andares de janelas com molduras brancas, reflexo suave e jardineiras com flores
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const jx = 16 + i * 60;
        const jy = 16 + j * 60;

        // Moldura branca elegante
        c.fillStyle = '#FFFFFF';
        c.fillRect(jx - 2, jy - 2, 32, 40);

        // Vidro com reflexo do céu
        const vidGrad = c.createLinearGradient(jx, jy, jx + 28, jy + 36);
        vidGrad.addColorStop(0, (i * 3 + j) % 6 === 0 ? '#FFF2B2' : '#C7E4F2');
        vidGrad.addColorStop(1, (i * 3 + j) % 6 === 0 ? '#FFE080' : '#85B9D8');
        c.fillStyle = vidGrad;
        c.fillRect(jx, jy, 28, 36);

        // Esquadrias cruzadas
        c.fillStyle = '#FFFFFF';
        c.fillRect(jx + 13, jy, 2, 36);
        c.fillRect(jx, jy + 18, 28, 2);

        // Jardineira de flores sob a janela
        if ((i + j) % 2 === 0) {
          c.fillStyle = '#A67C52';
          c.fillRect(jx - 1, jy + 34, 30, 6);
          c.fillStyle = (i % 2 === 0) ? '#FF6B8B' : '#FFD93D';
          for (let f = 0; f < 4; f++) {
            c.beginPath();
            c.arc(jx + 3 + f * 7, jy + 34, 2.5, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    }
  }, 256, 1);
}

function texturaFachadaModerna(corBase: string): THREE.CanvasTexture {
  return textura((c, t) => {
    c.fillStyle = corBase;
    c.fillRect(0, 0, t, t);

    // Vidro espelhado contemporâneo
    const step = 42;
    for (let x = 8; x < t; x += step) {
      for (let y = 8; y < t; y += step) {
        const vidGrad = c.createLinearGradient(x, y, x + step - 10, y + step - 10);
        vidGrad.addColorStop(0, '#B3DFF4');
        vidGrad.addColorStop(0.5, '#78B8DC');
        vidGrad.addColorStop(1, '#538FA8');
        c.fillStyle = vidGrad;
        c.fillRect(x, y, step - 8, step - 8);

        // Brilho diagonal de reflexo
        c.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x + 2, y + step - 10);
        c.lineTo(x + step - 10, y + 2);
        c.stroke();
      }
    }

    // Frisos verticais metálicos
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 2;
    for (let x = 4; x < t; x += step) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, t);
      c.stroke();
    }
  }, 256, 1);
}

/* ---------- Objetos clicáveis e ações ---------- */

type Acao = {
  rotulo: string;
  alvo?: string; // vai para o app: "atividade:devocional", "visual", "roupas", "segredo:dracma"
  pose?: Pose;
  texto?: string; // o que aparece no balão enquanto faz
  lugar?: [number, number, number]; // onde ficam os pés durante a ação (sentar, deitar, banheira)
  deitar?: [number, number]; // direção do corpo deitado (cabeça para os pés)
  frente?: [number, number]; // para onde o boneco olha sentado
  fechados?: boolean;
  fones?: boolean;
  item?: ItemMao; // o que fica na mão durante a ação (violão, livro, copo...)
};
type Obj = { id: string; nome: string; comodo: string; ponto: [number, number]; acoes: Acao[]; grupo: THREE.Group };

type InfoBalao = {
  icone: string;
  bg: string;
  textoLimpo: string;
  animIcone: string;
  notas?: boolean;
  fumaca?: boolean;
};

function extrairInfoBalao(texto: string, item?: ItemMao, pose?: Pose): InfoBalao {
  const t = texto.toLowerCase();
  const limpo = texto.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}]+/gu, '').trim();

  // Música / Louvor
  if (t.includes('violão') || t.includes('violao') || t.includes('louvor') || t.includes('bateria') || t.includes('teclado') || t.includes('cantar') || t.includes('música') || t.includes('musica') || item === 'violao' || item === 'baquetas' || item === 'microfone') {
    return {
      icone: item === 'violao' ? '🎸' : item === 'baquetas' ? '🥁' : item === 'microfone' ? '🎤' : '🎵',
      bg: '#FFE8F2',
      textoLimpo: limpo || 'Louvando ao Senhor',
      animIcone: 'balancoMusica 1.2s ease-in-out infinite',
      notas: true,
    };
  }
  // Cozinhando / Frigideira
  if (t.includes('cozinh') || t.includes('fogão') || t.includes('fogao') || t.includes('panela') || t.includes('frigideira') || item === 'frigideira') {
    return {
      icone: '🍳',
      bg: '#FFF2DE',
      textoLimpo: limpo || 'Cozinhando na frigideira',
      animIcone: 'cozinharPulo 1.3s ease-in-out infinite',
      fumaca: true,
    };
  }
  // Bíblia / Leitura / Estudo
  if (t.includes('bíblia') || t.includes('biblia') || t.includes('livro') || t.includes('lendo') || t.includes('estud') || t.includes('devocional') || item === 'livro' || pose === 'livro') {
    return {
      icone: '📖',
      bg: '#EAE6FF',
      textoLimpo: limpo || 'Lendo as Escrituras',
      animIcone: 'felicidadeGlow 2.2s ease-in-out infinite',
    };
  }
  // Oração / Gratidão / Bênçãos
  if (t.includes('oraç') || t.includes('orac') || t.includes('orar') || t.includes('agradec') || t.includes('bênção') || t.includes('bencao') || t.includes('gratidão') || t.includes('gratidao')) {
    return {
      icone: '🙏',
      bg: '#FFF8DB',
      textoLimpo: limpo || 'Momento de oração',
      animIcone: 'oracaoPulso 1.8s ease-in-out infinite',
    };
  }
  // Água / Bebida
  if (t.includes('água') || t.includes('agua') || item === 'copo') {
    return {
      icone: '🥛',
      bg: '#E3F2FD',
      textoLimpo: limpo || 'Bebendo água',
      animIcone: 'felicidadeGlow 1.6s ease-in-out infinite',
    };
  }
  // Maçã / Lanche
  if (t.includes('maçã') || t.includes('maca') || t.includes('lanche') || t.includes('comendo') || item === 'maca') {
    return {
      icone: '🍎',
      bg: '#FFEBEE',
      textoLimpo: limpo || 'Comendo uma maçã',
      animIcone: 'cozinharPulo 1.4s ease-in-out infinite',
    };
  }
  // Escovar os dentes
  if (t.includes('dente') || t.includes('escova') || item === 'escova') {
    return {
      icone: '🪥',
      bg: '#E2F7F6',
      textoLimpo: limpo || 'Escovando os dentes',
      animIcone: 'balancoMusica 0.9s ease-in-out infinite',
    };
  }
  // Banho / Lavar mãos
  if (t.includes('banho') || t.includes('lavando as mãos') || t.includes('lavar as mãos') || t.includes('sabão')) {
    return {
      icone: '🫧',
      bg: '#E8F5FE',
      textoLimpo: limpo || 'Tomando banho',
      animIcone: 'flutuarPensamento 1.6s ease-in-out infinite',
    };
  }
  // Exercício / Treino
  if (t.includes('esteira') || t.includes('correndo') || t.includes('treino') || t.includes('halteres') || t.includes('polichinelo') || t.includes('pedalando') || item === 'halteres') {
    return {
      icone: '⚡',
      bg: '#FFF9C4',
      textoLimpo: limpo || 'Se exercitando',
      animIcone: 'felicidadeGlow 0.9s ease-in-out infinite',
    };
  }
  // Sono / Cochilo
  if (t.includes('cochilo') || t.includes('dormindo') || t.includes('zzz') || t.includes('descansando')) {
    return {
      icone: '💤',
      bg: '#EDE7F6',
      textoLimpo: limpo || 'Descansando...',
      animIcone: 'flutuarPensamento 2.4s ease-in-out infinite',
    };
  }
  // Aquário / Peixinhos
  if (t.includes('peix')) {
    return {
      icone: '🐠',
      bg: '#E0F7FA',
      textoLimpo: limpo || 'Observando os peixes',
      animIcone: 'balancoMusica 1.8s ease-in-out infinite',
    };
  }
  // Horta / Jardim
  if (t.includes('horta') || t.includes('regar') || t.includes('planta') || item === 'regador') {
    return {
      icone: '🌿',
      bg: '#E8F5E9',
      textoLimpo: limpo || 'Cuidando da horta',
      animIcone: 'felicidadeGlow 1.6s ease-in-out infinite',
    };
  }
  // Bichinhos
  if (t.includes('carinho') || t.includes('brincar') || t.includes('cachorro') || t.includes('gato')) {
    return {
      icone: '💖',
      bg: '#FCE4EC',
      textoLimpo: limpo || 'Brincando com o pet',
      animIcone: 'oracaoPulso 1.3s ease-in-out infinite',
    };
  }
  // TV
  if (t.includes('tv') || t.includes('culto')) {
    return {
      icone: '📺',
      bg: '#E1F3FE',
      textoLimpo: limpo || 'Assistindo culto online',
      animIcone: 'felicidadeGlow 2s ease-in-out infinite',
    };
  }
  // Natação / Piscina / Boia
  if (t.includes('nadando') || t.includes('piscina') || t.includes('mergulh') || t.includes('boia') || t.includes('água fresca')) {
    return {
      icone: t.includes('boia') ? '🦩' : '🏊‍♂️',
      bg: '#E0F7FA',
      textoLimpo: limpo || 'Nadando na piscina',
      animIcone: 'balancoMusica 1.4s ease-in-out infinite',
    };
  }
  // Solário / Espreguiçadeira
  if (t.includes('sol') || t.includes('espreguiçadeira') || t.includes('espreguicadeira')) {
    return {
      icone: '☀️',
      bg: '#FFF8E1',
      textoLimpo: limpo || 'Tomando sol e relaxando',
      animIcone: 'felicidadeGlow 2.0s ease-in-out infinite',
    };
  }
  // Coco / Bistrô
  if (t.includes('coco') || t.includes('bistrô') || t.includes('bistro') || item === 'coco') {
    return {
      icone: '🥥',
      bg: '#E8F5E9',
      textoLimpo: limpo || 'Tomando água de coco',
      animIcone: 'cozinharPulo 1.5s ease-in-out infinite',
    };
  }
  // Ducha refrescante / Lavar rosto
  if (t.includes('ducha') || t.includes('rosto') || t.includes('💦')) {
    return {
      icone: t.includes('rosto') ? '💦' : '🚿',
      bg: '#E1F5FE',
      textoLimpo: limpo || 'Ducha refrescante',
      animIcone: 'flutuarPensamento 1.5s ease-in-out infinite',
    };
  }
  // Chaleira / Café
  if (t.includes('chá') || t.includes('chaleira') || t.includes('café') || t.includes('🫖') || t.includes('☕')) {
    return {
      icone: t.includes('café') ? '☕' : '🫖',
      bg: '#FFF3E0',
      textoLimpo: limpo || 'Preparando bebida quentinha',
      animIcone: 'cozinharPulo 1.5s ease-in-out infinite',
      fumaca: true,
    };
  }
  // Rádio / Lo-fi
  if (t.includes('rádio') || t.includes('lo-fi') || t.includes('📻')) {
    return {
      icone: '📻',
      bg: '#F3E5F5',
      textoLimpo: limpo || 'Ouvindo hinos lo-fi',
      animIcone: 'balancoMusica 1.4s ease-in-out infinite',
      notas: true,
    };
  }
  // Portão / Vizinho / Gentileza
  if (t.includes('vizinho') || t.includes('gentileza') || t.includes('❤️')) {
    return {
      icone: '❤️',
      bg: '#FCE4EC',
      textoLimpo: limpo || 'Gesto de gentileza',
      animIcone: 'oracaoPulso 1.3s ease-in-out infinite',
    };
  }
  return {
    icone: '✨',
    bg: '#FFF9E6',
    textoLimpo: limpo || texto,
    animIcone: 'felicidadeGlow 1.8s ease-in-out infinite',
  };
}

/* ---------- Componente ---------- */

type AbaDecorar = 'chao' | 'tapete' | 'parede' | 'papel' | 'piso' | 'tema';
type SelMobilia = { idx: number; x: number; y: number; nome: string; parede: boolean };

export default function Casa3D(props: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const bandejaRef = useRef<HTMLDivElement>(null);
  const p = useRef(props);
  p.current = props;
  const api = useRef<{
    setFoco: (f: string) => void; setVisual: () => void; setDecoracao: () => void; setCor: () => void; setAcao: (a: AtividadeId | null) => void;
    reiniciarTempo: () => void;
    girar: (d: number) => void; zoom: (d: number) => void;
    girarSel: () => void; guardarSel: () => void; limparSel: () => void;
    aplicarNoFoco: (tipo: 'papel' | 'piso', id: string) => void;
    iniciarArrasto: (tipo: 'movel' | 'papel' | 'piso', id: string, e: React.PointerEvent) => void;
  } | null>(null);
  const som = useRef<AmbienteSonoro | null>(null);
  const [volumeSom, setVolumeSom] = useState(.22);
  const [tocandoSom, setTocandoSom] = useState(false);
  const [vida, setVida] = useState<VidaLocal>(vidaVazia);
  const vidaRef=useRef<VidaLocal>(vidaVazia());
  const [erroVida,setErroVida]=useState('');
  const vidaCarregada=useRef(false);
  useEffect(()=>{vidaCarregada.current=false;try{const dados=lerVidaLocal(localStorage.getItem(`faithsteps:vida:v1:${props.perfilId}`));vidaRef.current=dados;setVida(dados);vidaCarregada.current=true;}catch{setErroVida('Não foi possível abrir o arquivo do bairro. Os dados foram preservados.');}},[props.perfilId]);
  const salvarVida=useCallback((proxima:VidaLocal)=>{if(!vidaCarregada.current)return false;try{localStorage.setItem(`faithsteps:vida:v1:${p.current.perfilId}`,JSON.stringify(proxima));vidaRef.current=proxima;setVida(proxima);setErroVida('');return true;}catch{setErroVida('Não foi possível salvar no aparelho. Tente novamente.');return false;}},[]);
  const [cartaAberta, setCartaAberta] = useState(false);
  const [canalTv, setCanalTv] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; obj: Obj } | null>(null);
  const [balao, setBalao] = useState<{ x: number; y: number; texto: string; item?: ItemMao; pose?: Pose } | null>(null);
  const [abaDec, setAbaDec] = useState<AbaDecorar>('chao');
  const [sel, setSel] = useState<SelMobilia | null>(null);
  const [passoGrid, setPassoGrid] = useState<0.5 | 0.25>(0.25);
  const passoGridRef = useRef<0.5 | 0.25>(0.25);
  passoGridRef.current = passoGrid;
  const [dicaDec, setDicaDec] = useState<string | null>(null);
  const timerDica = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisarDica = (txt: string) => {
    setDicaDec(txt);
    if (timerDica.current) clearTimeout(timerDica.current);
    timerDica.current = setTimeout(() => setDicaDec(null), 2800);
  };
  const [arrastandoItem, setArrastandoItem] = useState<{ nome: string; x: number; y: number; ok: boolean } | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const ultimoRoteiroRef = useRef<string | null>(null);

  useEffect(() => {
    const el = raiz.current!;
    let vivo = true;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const maxPR = (typeof window !== 'undefined' && window.innerWidth < 768) ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(maxPR);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    el.prepend(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    const cena = new THREE.Scene();
    const microEfeitos = criarMicroEfeitos(cena);
    const ambInicial = calcularAmbienteTempo(Date.now());
    cena.background = new THREE.Color(ambInicial.ceuTopo);
    cena.fog = new THREE.Fog(ambInicial.ceuHorizonte, 42, 92);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

    const luzHemi = new THREE.HemisphereLight(ambInicial.luzAmbienteCor, '#9AAE91', ambInicial.luzAmbienteInt);
    cena.add(luzHemi);
    const sol = new THREE.DirectionalLight(ambInicial.luzDirecionalCor, ambInicial.luzDirecionalInt);
    sol.position.set(...ambInicial.posicaoAstro);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 65 });
    sol.shadow.bias = -0.0006;
    sol.target.position.copy(CENTRO_CASA);
    cena.add(sol, sol.target);

    // Luz de preenchimento suave e quente do lado oposto
    const luzSuave = new THREE.DirectionalLight('#FFE8D0', 0.65);
    luzSuave.position.set(15, 14, -10);
    cena.add(luzSuave);

    const casa = new THREE.Group();
    cena.add(casa);
    const luzesInternas: THREE.PointLight[] = [];
    for (const [lx, lz] of [[2.5, 2.2], [6.5, 2.2], [10.0, 2.2], [3.5, 6.7], [9.5, 6.7]] as const) {
      const pt = new THREE.PointLight('#FFE8B8', 0.85, 6.5);
      pt.position.set(lx, 2.35, lz);
      pt.visible = ambInicial.luzesInternasAcesas;
      casa.add(pt);
      luzesInternas.push(pt);
    }
    const objetos: Obj[] = [];
    const bloqueios: [number, number, number, number][] = [];
    let ultimoObjetoConstruido = '';
    const bloquear = (x0: number, z0: number, x1: number, z1: number) => { if (!MOVEIS_ORIGINAIS[ultimoObjetoConstruido]) bloqueios.push([x0, z0, x1, z1]); };
    const interativo = (id: string, nome: string, comodo: string, ponto: [number, number], acoes: Acao[], construir: (g: THREE.Group) => void) => {
      ultimoObjetoConstruido=id;
      const g = new THREE.Group();
      construir(g);
      g.userData.objeto = id;
      casa.add(g);
      objetos.push({ id, nome, comodo, ponto, acoes, grupo: g });
      return g;
    };

    const esfera = (g: THREE.Object3D, x: number, y: number, z: number, rx: number, ry: number, rz: number, cor: string) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat(cor));
      m.scale.set(rx, ry, rz);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };

    /* Vizinhança: gramado, cerca, calçada, rua, árvores, prédios e igreja */
    const fora = new THREE.Group();
    cena.add(fora);

    // Gramado enriquecido com textura procedural de folhas e pequenas flores silvestres
    const txGrama = texturaGramaJardim();
    const matGrama = new THREE.MeshStandardMaterial({ map: txGrama, roughness: 1, metalness: 0 });
    const terreno = new THREE.Shape(); terreno.moveTo(-90,-90); terreno.lineTo(90,-90); terreno.lineTo(90,90); terreno.lineTo(-90,90); terreno.closePath();
    const buraco = new THREE.Path(); buraco.moveTo(-4.18,-2.32); buraco.lineTo(-4.18,-6.08); buraco.lineTo(-1.72,-6.08); buraco.lineTo(-1.72,-2.32); buraco.closePath(); terreno.holes.push(buraco);
    const geoGrama = new THREE.ShapeGeometry(terreno);
    const uvGrama = geoGrama.getAttribute('uv');
    for (let i=0;i<uvGrama.count;i++) uvGrama.setXY(i,(uvGrama.getX(i)+90)/180,(uvGrama.getY(i)+90)/180);
    const grama = new THREE.Mesh(geoGrama, matGrama);
    grama.rotation.x = -Math.PI / 2;
    grama.position.y = -0.02; // abaixo da base da casa (y = 0)
    grama.receiveShadow = true;
    grama.userData.chao = true;
    fora.add(grama);
    const tampaPiscina = new THREE.Mesh(new THREE.PlaneGeometry(2.46, 3.76), matGrama);
    tampaPiscina.rotation.x = -Math.PI / 2; tampaPiscina.position.set(-2.95,-.02,4.2); tampaPiscina.receiveShadow = true; fora.add(tampaPiscina);

    // Calçada norte com lajotas / paver intertravado
    const txCalcada = texturaCalcadaPaver();
    txCalcada.repeat.set(24, 1);
    const matCalcada = new THREE.MeshStandardMaterial({ map: txCalcada, roughness: 0.78, metalness: 0.05 });
    const calcadaNorte = new THREE.Mesh(new THREE.BoxGeometry(96, 0.08, 1.6), matCalcada);
    calcadaNorte.position.set(6, 0.04, 13.0);
    calcadaNorte.receiveShadow = true;
    fora.add(calcadaNorte);

    // Meio-fio chanfrado norte
    caixa(fora, -42, 0, 13.74, 96, 0.09, 0.12, '#D1C9BE', false);

    // Rua com asfalto grafite texturizado
    const txAsfalto = texturaAsfalto();
    txAsfalto.repeat.set(16, 1);
    const matAsfalto = new THREE.MeshStandardMaterial({ map: txAsfalto, roughness: 0.85, metalness: 0.15 });
    const ruaMesh = new THREE.Mesh(new THREE.BoxGeometry(96, 0.04, 4.4), matAsfalto);
    ruaMesh.position.set(6, 0.02, 16.0);
    ruaMesh.receiveShadow = true;
    fora.add(ruaMesh);

    // Linhas centrais tracejadas amarelas com relevo sutil
    for (let x = -38; x < 50; x += 2.4) {
      caixa(fora, x, 0.045, 15.94, 1.2, 0.005, 0.14, '#FFEB3B', false);
    }

    // Faixa de pedestres branca na travessia
    for (let i = 0; i < 7; i++) {
      caixa(fora, 2.0 + i * 0.52, 0.045, 13.9, 0.32, 0.006, 4.2, '#FFFFFF', false);
    }

    // Bueiros de ferro fundido na sarjeta
    for (const bx of [-8, 9, 26]) {
      caixa(fora, bx, 0.042, 13.95, 0.8, 0.008, 0.35, '#222226', false);
      for (let g = 0; g < 4; g++) {
        caixa(fora, bx + 0.1 + g * 0.18, 0.045, 13.98, 0.04, 0.009, 0.29, '#151518', false);
      }
    }

    // Calçada sul com lajotas / paver intertravado
    const calcadaSul = new THREE.Mesh(new THREE.BoxGeometry(96, 0.08, 1.8), matCalcada);
    calcadaSul.position.set(6, 0.04, 19.1);
    calcadaSul.receiveShadow = true;
    fora.add(calcadaSul);

    // Meio-fio chanfrado sul
    caixa(fora, -42, 0, 18.14, 96, 0.09, 0.12, '#D1C9BE', false);

    // Pedras decorativas de caminho na entrada do quintal
    for (let i = 0; i < 5; i++) {
      const c = cil(fora, 2.5 + (i % 2) * 0.2, 0, 9.6 + i * 0.55, 0.24, 0.04, '#EDE6DE');
      c.castShadow = false;
    }

    // Cerca baixa em volta do terreno, com passagem na frente
    const cerca = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.45);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        caixa(fora, x0 + (x1 - x0) * t - 0.04, 0, z0 + (z1 - z0) * t - 0.04, 0.08, 0.62, 0.08, BRANCO);
      }
      const trilho = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.05), mat(BRANCO));
      trilho.position.set((x0 + x1) / 2, 0.42, (z0 + z1) / 2);
      trilho.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      fora.add(trilho);
    };
    cerca(-6.2, -6.8, 18.8, -6.8); cerca(-6.2, -6.8, -6.2, 11.6); cerca(18.8, -6.8, 18.8, 11.6);
    cerca(-6.2, 11.6, 1.9, 11.6); cerca(3.1, 11.6, 18.8, 11.6);

    const arvore = (x: number, z: number, k = 1) => {
      const tronco = cil(fora, x, 0, z, .13*k, 1.9*k, '#806B52', .075*k, 12);
      tronco.receiveShadow = true;
      for (const [dx,dy,dz,r,cor] of [[0,2.4,0,.86,'#76975B'],[-.48,2.08,.12,.65,'#66874E'],[.5,2.15,.2,.68,'#85A76A'],[.16,2.8,-.12,.6,'#8EAD73']] as const) {
        const copa = new THREE.Mesh(new THREE.SphereGeometry(r*k,20,14), mat(cor));
        copa.position.set(x+dx*k,dy*k,z+dz*k);copa.scale.set(1,1.13,.94);copa.castShadow=true;copa.receiveShadow=true;fora.add(copa);
      }
    };
    arvore(-4.5, -2.0, 1.2); arvore(17.6, -5.4, 1.1); arvore(-4.8, 10.6, 1); arvore(13.7, 10.4, 1.15); arvore(-7, 20.5, 1.2); arvore(20, 20.8, 1); arvore(-6, -8, 1.3);
    for (const [x, z] of [[4.5, 10.6], [6, 10.8], [8.5, 10.6], [10.5, 10.8], [12.5, 10.6], [0.6, 10.7], [-5.8, 3], [16.2, 10.5]]) {
      bola(fora, x, 0.32, z, 0.42, '#93C06C', 0.8);
      bola(fora, x + 0.15, 0.55, z, 0.07, ROSA);
    }

    // Prédios ao redor com arquiteturas distintas (residencial com tijolos/jardineiras vs moderno espelhado)
    const predio = (x: number, z: number, w: number, d: number, h: number, cor: string, estilo: 'residencial' | 'moderno' = 'residencial') => {
      const tx = estilo === 'moderno' ? texturaFachadaModerna(cor) : texturaFachadaResidencial(cor);
      tx.repeat.set(Math.max(1, Math.round(w / 3.2)), Math.max(1, Math.round(h / 3.2)));
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
        mat(cor, { map: tx, roughness: estilo === 'moderno' ? 0.28 : 0.72, metalness: estilo === 'moderno' ? 0.32 : 0.04 }),
        mat(cor, { map: tx, roughness: estilo === 'moderno' ? 0.28 : 0.72, metalness: estilo === 'moderno' ? 0.32 : 0.04 }),
        mat(escurecer(cor, 0.08)),
        mat(cor),
        mat(cor, { map: tx, roughness: estilo === 'moderno' ? 0.28 : 0.72, metalness: estilo === 'moderno' ? 0.32 : 0.04 }),
        mat(cor, { map: tx, roughness: estilo === 'moderno' ? 0.28 : 0.72, metalness: estilo === 'moderno' ? 0.32 : 0.04 }),
      ]);
      m.position.set(x + w / 2, h / 2, z + d / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      fora.add(m);

      // Platibanda / borda do telhado
      caixa(fora, x - 0.1, h, z - 0.1, w + 0.2, 0.30, d + 0.2, escurecer(cor, 0.12));

      // Cobertura detalhada: caixa d'água cilíndrica, antena metálica e casa de máquinas
      const cx = x + w / 2, cz = z + d / 2;
      cil(fora, cx - w * 0.2, h + 0.3, cz - d * 0.15, 0.65, 0.85, '#9BA3AF');
      cil(fora, cx + w * 0.22, h + 0.3, cz + d * 0.2, 0.035, 1.8, '#6B7280');
      caixa(fora, cx + w * 0.16, h + 0.3, cz - d * 0.2, 0.85, 0.52, 0.65, '#BAC0C9');
    };

    predio(-14, -12, 6, 6, 11, '#E2D5CC', 'residencial');
    predio(-6, -13, 5, 5, 7.5, '#DCE7E1', 'moderno');
    predio(10, -13, 5, 5, 9.5, '#E8DDD0', 'residencial');
    predio(17, -10, 5, 6, 6.5, '#D8E2EC', 'moderno');
    predio(-13, -3, 5, 6, 8.5, '#E5DCD4', 'residencial');
    predio(-13, 5, 5, 6, 6.5, '#DFE6E8', 'moderno');
    predio(19, -1, 5, 6, 9.5, '#E8DFD5', 'residencial');
    predio(19, 7, 5, 5, 7.0, '#DDE5EC', 'moderno');
    predio(-12, 21, 6, 5, 7.5, '#E8DDD5', 'residencial');
    predio(-4, 21, 5, 5, 10.5, '#D5E2EC', 'moderno');
    predio(4, 21, 7, 5, 6.5, '#E6DAD2', 'residencial');
    predio(13, 21, 5, 5, 8.5, '#D9E6E2', 'moderno');

    // Igreja ao fundo, com torre, campanário com sino, vitral rosácea e cruz dourada iluminada
    {
      const ig = new THREE.Group();
      ig.position.set(1.5, 0, -13);
      fora.add(ig);

      // Nave principal
      caixa(ig, 0, 0, 0, 5, 3.8, 3.6, '#FAF7F2');
      const perfilTelhado = new THREE.Shape();
      perfilTelhado.moveTo(-.2,3.8);perfilTelhado.lineTo(1.8,5.45);perfilTelhado.lineTo(3.8,3.8);perfilTelhado.closePath();
      const geoTelhado = new THREE.ExtrudeGeometry(perfilTelhado,{depth:5.4,bevelEnabled:false});
      // Shape x is depth (Z); extrusion depth becomes width (X).
      geoTelhado.rotateY(-Math.PI/2);geoTelhado.translate(5.2,0,0);
      const telhado = new THREE.Mesh(geoTelhado,mat('#8E6B9E'));telhado.castShadow=true;ig.add(telhado);

      // Torre do campanário
      caixa(ig, 5.15, 0, 2.6, 1.6, 7.8, 1.6, '#FAF7F2');
      // Sino no interior do campanário
      cil(ig, 5.95, 6.8, 3.4, 0.28, 0.45, '#DDA236');
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 4), mat('#8E6B9E'));
      ponta.position.set(5.95, 9.1, 3.4);
      ponta.rotation.y = Math.PI / 4;
      ig.add(ponta);

      // Cruz dourada no topo com brilho suave
      const matCruz = new THREE.MeshStandardMaterial({
        color: '#FFD700',
        emissive: new THREE.Color('#FFA500'),
        emissiveIntensity: 0.45,
        metalness: 0.85,
        roughness: 0.2,
      });
      const cV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 0.14), matCruz);
      cV.position.set(5.95, 10.7, 3.4);
      ig.add(cV);
      const cH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.14), matCruz);
      cH.position.set(5.95, 11.0, 3.4);
      ig.add(cH);

      // Porta dupla de madeira com arco
      caixa(ig, 1.8, 0, 3.61, 1.4, 2.2, 0.08, '#6B4226');

      // Rosácea circular de vitral colorido acima da porta
      const molduraRosacea = cil(ig, 2.5, 2.9, 3.62, 0.65, 0.06, '#FFFFFF');
      molduraRosacea.rotation.x = Math.PI / 2;
      const vitral = cil(ig, 2.5, 2.9, 3.64, 0.55, 0.03, '#4DA6FF');
      vitral.rotation.x = Math.PI / 2;
      (vitral.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#9B59B6');
      (vitral.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45;

      // Vitrais laterais
      for (const x of [0.6, 3.2]) {
        caixa(ig, x, 1.5, 3.61, 0.55, 1.4, 0.05, '#E8C2D8');
      }
    }

    // Iluminação pública: postes ao longo da calçada
    for (const x of [-16, -2.2, 12]) {
      cil(fora, x, 0, 12.6, 0.06, 3.4, AMEIXA_SUAVE);
      const globo = bola(fora, x, 3.5, 12.6, 0.22, '#FFF6C8');
      (globo.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#FFF6C8');
      (globo.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
    }

    // Carros circulando na rua: modelos charmosos low-poly com cavas de roda, capô inclinado, para-brisa, retrovisores e rodas realistas
    type CarroRua = {
      grupo: THREE.Group;
      dir: number;
      vel: number;
      pos: number;
      z: number;
      rodas: THREE.Group[];
    };
    const carros: CarroRua[] = [];
    const criarCarro = (
      cor: string,
      z: number,
      dir: 1 | -1,
      vel: number,
      xIni: number,
      modelo: 'sedan' | 'taxi' | 'suv' | 'esporte' = 'sedan'
    ) => {
      const { grupo: g, rodas } = modeloCarro(cor, modelo);
      if (dir < 0) g.rotation.y = Math.PI;
      fora.add(g);
      g.position.set(xIni, 0.04, z);
      carros.push({ grupo: g, dir, vel, pos: xIni, z, rodas });
    };

    criarCarro('#D92B3A', 14.85, -1, 5.2, 34, 'esporte'); // Vermelho esportivo
    criarCarro('#1E3A5F', 14.85, -1, 4.2, 6, 'sedan');    // Azul noturno executivo
    criarCarro('#F5A623', 17.15, 1, 5.0, -18, 'taxi');    // Táxi urbano luminoso
    criarCarro('#2D6A4F', 17.15, 1, 4.5, 12, 'suv');      // SUV verde floresta

    // Pedestres usam o mesmo rig, roupas e animações do personagem principal.
    type PedestreRua = { grupo: THREE.Group; dir: number; vel: number; pos: number; modelo?: Boneco; saudacaoAte?: number; saudando?: boolean; entrega?: boolean; destino?: number };
    const pedestres: PedestreRua[] = [];
    const carregarPedestre = (g: THREE.Group, look: Look, vel: number, atribuir: (b: Boneco) => void) => {
      criarBoneco().then(b => {
        if (!vivo) { b.descartar(); return; }
        b.vestir(look, 50, 'normal'); b.animar('andar', vel / .72); b.atualizar(Math.random());
        g.add(b.objeto); atribuir(b);
      }).catch(() => { /* A rua continua disponível se o asset não carregar. */ });
    };
    const criarPedestre = (look: Look, z: number, dir: 1 | -1, vel: number, xIni: number) => {
      const g = new THREE.Group(); fora.add(g); g.position.set(xIni, .08, z);
      g.rotation.y = dir * Math.PI / 2;
      const pessoa: PedestreRua = { grupo: g, dir, vel, pos: xIni }; pedestres.push(pessoa);
      carregarPedestre(g, look, vel, b => { pessoa.modelo = b; });
      return pessoa;
    };
    criarPedestre({ corpo:'feminino', pele:'#E9B48C', cabelo:'rabo', corCabelo:'#6B3A1C', moletom:'rosa', topo:'camiseta', corTopo:'rosa', corBaixo:'jeans', olhos:'amendoado', calcado:'tenis' }, 12.65, 1, .72, -12);
    criarPedestre({ corpo:'masculino', pele:'#7A4A2E', cabelo:'crespo', corCabelo:'#120A12', moletom:'jeans', topo:'polo', corTopo:'jeans', corBaixo:'areia', olhos:'amendoado', calcado:'sapato' }, 18.72, -1, .8, 26);
    criarPedestre({ corpo:'feminino', pele:'#F6D3B3', cabelo:'chanel', corCabelo:'#A0432A', moletom:'nevoa', topo:'blusa', corTopo:'nevoa', baixo:'calca', corBaixo:'noite', calcado:'sapatilha' }, 19.45, 1, .65, -4);

    const carteiro=criarPedestre({corpo:'masculino',pele:'#C98B62',cabelo:'curto',corCabelo:'#33251E',moletom:'jeans',topo:'polo',corTopo:'jeans',corBaixo:'areia',calcado:'sapato'},12.55,1,.85,-25);
    const bolsaCorreio=caixa(carteiro.grupo,-.26,.6,-.08,.14,.25,.21,'#B57D48');
    bolsaCorreio.rotation.z=.12;
    const coracaoCanvas=document.createElement('canvas');coracaoCanvas.width=128;coracaoCanvas.height=128;
    const coracaoCtx=coracaoCanvas.getContext('2d')!;coracaoCtx.font='90px sans-serif';coracaoCtx.textAlign='center';coracaoCtx.fillStyle='#E96983';coracaoCtx.fillText('♥',64,100);
    const coracaoTextura=new THREE.CanvasTexture(coracaoCanvas);
    for(const pessoa of pedestres){const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:coracaoTextura,depthTest:false}));spr.name='reacao';spr.position.y=2;spr.scale.set(.45,.45,1);spr.visible=false;pessoa.grupo.add(spr);}

    // Pedestre passeando com cachorro na calçada norte
    const donoCachorro = {
      grupo: new THREE.Group(),
      perna1: new THREE.Group(),
      perna2: new THREE.Group(),
      bracoD: new THREE.Group(),
      bracoE: new THREE.Group(),
      cao: new THREE.Group(),
      raboCao: new THREE.Group(),
      pernasCao: [] as THREE.Object3D[],
      pos: -4.0,
      vel: .72,
      dir: 1 as const,
      z: 13.3,
      modelo: undefined as Boneco | undefined,
    };
    {
      const g = donoCachorro.grupo;
      fora.add(g);
      carregarPedestre(g, { corpo:'masculino', pele:'#C98B62', cabelo:'curto', corCabelo:'#3A2010', moletom:'areia', topo:'moletom', corTopo:'areia', corBaixo:'jeans', calcado:'tenis' }, donoCachorro.vel, b => { donoCachorro.modelo = b; });

      const cao = donoCachorro.cao;
      cao.position.set(-0.35, 0, 0.52);
      g.add(cao);
      const c1 = '#D98B4A', c2 = '#F8E8D4', c3 = '#6B4226';
      esfera(cao, 0, 0.2, 0, 0.11, 0.1, 0.18, c1);
      esfera(cao, 0, 0.34, 0.15, 0.09, 0.085, 0.09, c1);
      esfera(cao, 0, 0.31, 0.22, 0.05, 0.045, 0.06, c2);
      esfera(cao, 0, 0.34, 0.28, 0.02, 0.016, 0.016, NOITE);
      for (const s of [1, -1]) esfera(cao, s * 0.08, 0.33, 0.14, 0.03, 0.07, 0.04, c3).rotation.z = s * 0.3;
      const col = cil(cao, 0, 0.28, 0.1, 0.065, 0.025, PINK);
      col.rotation.x = Math.PI / 2;
      const rb = donoCachorro.raboCao;
      rb.position.set(0, 0.24, -0.14);
      cil(rb, 0, 0.05, 0, 0.018, 0.12, c1).rotation.x = -0.7;
      cao.add(rb);
      donoCachorro.pernasCao = [
        cil(cao, -0.06, 0.09, 0.08, 0.02, 0.17, c1),
        cil(cao, 0.06, 0.09, 0.08, 0.02, 0.17, c1),
        cil(cao, -0.06, 0.09, -0.08, 0.02, 0.17, c1),
        cil(cao, 0.06, 0.09, -0.08, 0.02, 0.17, c1),
      ];
      const pts = [new THREE.Vector3(-0.25, 0.7, 0.03), new THREE.Vector3(-0.35, 0.3, 0.65)];
      const guia = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: PINK, linewidth: 2 }));
      g.add(guia);

      g.position.set(donoCachorro.pos, .08, donoCachorro.z);
      g.rotation.y = Math.PI / 2;
    }

    // Passarinhos voando e pousados pelo jardim e céu
    type Passarinho = {
      grupo: THREE.Group;
      asaE: THREE.Group;
      asaD: THREE.Group;
      tipo: 'voando1' | 'voando2' | 'cerca' | 'grama';
      fase: number;
    };
    const passarinhos: Passarinho[] = [];
    const criarPassarinho = (cor: string, tipo: Passarinho['tipo'], fase = 0) => {
      const g = new THREE.Group();
      fora.add(g);
      const corpo = bola(g, 0, 0, 0, 0.055, cor);
      corpo.scale.set(0.85, 0.85, 1.25);
      bola(g, 0, 0.045, 0.05, 0.04, cor);
      const bico = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 5), mat('#FFA000'));
      bico.rotation.x = Math.PI / 2;
      bico.position.set(0, 0.045, 0.095);
      g.add(bico);
      for (const s of [-1, 1]) bola(g, s * 0.03, 0.055, 0.06, 0.008, NOITE);
      const aE = new THREE.Group(); aE.position.set(0.045, 0.02, 0); g.add(aE);
      const mA = caixa(aE, 0, 0, -0.03, 0.1, 0.008, 0.06, clarear(cor, 0.25));
      mA.rotation.y = -0.2;
      const aD = new THREE.Group(); aD.position.set(-0.045, 0.02, 0); g.add(aD);
      const mB = caixa(aD, -0.1, 0, -0.03, 0.1, 0.008, 0.06, clarear(cor, 0.25));
      mB.rotation.y = 0.2;
      const cauda = caixa(g, -0.022, 0.01, -0.12, 0.044, 0.008, 0.07, escurecer(cor, 0.2));
      cauda.rotation.x = -0.3;
      passarinhos.push({ grupo: g, asaE: aE, asaD: aD, tipo, fase });
    };
    criarPassarinho('#FFD13B', 'voando1', 0);
    criarPassarinho('#4AA8FF', 'voando2', 2.5);
    criarPassarinho('#E84B30', 'cerca', 0);
    criarPassarinho('#A87B51', 'grama', 1.2);

    let ultimoCicloDia = 0;
    const atualizarMundoFora = (dt: number, agora: number) => {
      if (agora - ultimoCicloDia > 10000) {
        ultimoCicloDia = agora;
        const amb = calcularAmbienteTempo(Date.now());
        (cena.background as THREE.Color).set(amb.ceuTopo);
        cena.fog?.color.set(amb.ceuHorizonte);
        luzHemi.color.set(amb.luzAmbienteCor);
        luzHemi.intensity = amb.luzAmbienteInt;
        sol.color.set(amb.luzDirecionalCor);
        sol.intensity = amb.luzDirecionalInt;
        sol.position.set(...amb.posicaoAstro);
        for (const pt of luzesInternas) pt.visible = amb.luzesInternasAcesas;
      }
      tampaPiscina.visible = !p.current.itens.includes('piscina');
      const trafego = avancarTrafego(carros, dt);
      carros.forEach((c, i) => {
        c.pos = trafego[i].pos; c.grupo.position.x = c.pos;
        // Rotation is in the car's local frame, so both directions roll forwards.
        for (const r of c.rodas) r.rotation.z -= trafego[i].passo / RAIO_RODA;
      });
      for (const p of pedestres) {
        if(p.entrega && p.destino!==undefined){
          const distancia=p.destino-p.pos;
          if(Math.abs(distancia)<.08){p.entrega=false;p.saudacaoAte=agora+6000;atePortaoAberto=agora+6500;salvarVida(receberCarta(vidaRef.current,{dia:diaLocal(),...desafioDoDia()}));setCartaAberta(true);}
          else {p.dir=Math.sign(distancia);p.grupo.rotation.y=p.dir*Math.PI/2;}
        }
        const saudando = agora < (p.saudacaoAte ?? 0);
        const reacao=p.grupo.getObjectByName('reacao');if(reacao){reacao.visible=saudando;reacao.position.y=2+Math.sin(agora*.003)*.08;}
        if(saudando !== !!p.saudando) {
          p.saudando=saudando; p.modelo?.animar(saudando?'louvor':'andar',saudando?1:p.vel/.72);
          p.grupo.rotation.y=saudando?Math.PI:p.dir*Math.PI/2;
        }
        if(saudando){p.modelo?.atualizar(dt);continue;}
        p.pos = -42 + ((p.pos + 42 + p.dir * p.vel * dt) % 96 + 96) % 96;
        p.grupo.position.x = p.pos;
        p.modelo?.atualizar(dt);
      }
      const dc = donoCachorro;
      dc.pos += dc.dir * dc.vel * dt;
      if (dc.pos > 46) dc.pos = -34;
      dc.grupo.position.x = dc.pos;
      const tD = (agora / 1000) * (dc.vel * 5.5);
      dc.modelo?.atualizar(dt);
      dc.raboCao.rotation.y = Math.sin(agora * 0.016) * 0.6;
      dc.pernasCao.forEach((pv, k2) => { pv.rotation.x = Math.sin(tD * 2 + (k2 % 2 ? 0 : Math.PI)) * 0.55; });
      dc.cao.position.y = Math.abs(Math.sin(tD * 2)) * 0.02;

      const tSec = agora / 1000;
      for (const pass of passarinhos) {
        if (pass.tipo === 'voando1') {
          const a1 = tSec * 0.55 + pass.fase;
          pass.grupo.position.set(7.5 + Math.cos(a1) * 12, 3.4 + Math.sin(tSec * 1.8) * 0.35, 5.0 + Math.sin(a1) * 7.5);
          pass.grupo.rotation.y = -a1 + Math.PI / 2;
          pass.grupo.rotation.z = Math.sin(a1) * 0.22;
          pass.asaE.rotation.z = Math.sin(tSec * 24) * 0.65;
          pass.asaD.rotation.z = -Math.sin(tSec * 24) * 0.65;
        } else if (pass.tipo === 'voando2') {
          const a2 = tSec * 0.46 + pass.fase;
          pass.grupo.position.set(4.0 + Math.sin(a2) * 10, 3.8 + Math.cos(tSec * 1.6) * 0.4, 2.5 + Math.cos(a2) * 8);
          pass.grupo.rotation.y = a2;
          pass.grupo.rotation.z = -Math.cos(a2) * 0.22;
          pass.asaE.rotation.z = Math.sin(tSec * 24) * 0.65;
          pass.asaD.rotation.z = -Math.sin(tSec * 24) * 0.65;
        } else if (pass.tipo === 'cerca') {
          const hop = Math.floor(tSec * 0.4) % 2 === 0;
          const pulo = Math.abs(Math.sin(tSec * 6)) * 0.05;
          pass.grupo.position.set(7.8, 0.64 + (hop ? pulo : 0), 11.6);
          pass.grupo.rotation.y = Math.sin(tSec * 0.8) * 0.6;
          pass.grupo.rotation.x = hop ? Math.sin(tSec * 12) * 0.3 : 0;
          pass.asaE.rotation.z = hop ? Math.sin(tSec * 24) * 0.25 : 0;
          pass.asaD.rotation.z = hop ? -Math.sin(tSec * 24) * 0.25 : 0;
        } else if (pass.tipo === 'grama') {
          const hop = Math.floor(tSec * 0.35) % 3 === 0;
          const pulo = Math.abs(Math.sin(tSec * 8)) * 0.05;
          pass.grupo.position.set(-0.5 + Math.sin(tSec * 0.2) * 0.3, 0.04 + (hop ? pulo : 0), 10.4 + Math.cos(tSec * 0.2) * 0.3);
          pass.grupo.rotation.y = Math.sin(tSec * 0.5) * 1.2;
          pass.grupo.rotation.x = Math.max(0, Math.sin(tSec * 4)) * 0.4;
        }
      }

    };

    /* Casa: fundação, pisos, paredes, janelas */
    caixa(casa, -0.25, -0.25, -0.25, 12.5, 0.25, 9.5, '#F6F0E9', false);
    const pisosMap: Record<string, { mesh: THREE.Mesh; padrao: Comodo; padraoTx: THREE.CanvasTexture }> = {};
    for (const c of COMODOS) {
      const tx = texturaPiso(c.piso, c.chao);
      tx.repeat.set((c.x1 - c.x0) / 1.6, (c.z1 - c.z0) / 1.6);
      const mt = mat(c.chao, { map: tx });
      mt.userData.revestimento = true;
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(c.x1 - c.x0, c.z1 - c.z0), mt);
      piso.rotation.x = -Math.PI / 2;
      piso.position.set((c.x0 + c.x1) / 2, 0.005, (c.z0 + c.z1) / 2);
      piso.receiveShadow = true;
      piso.userData.chao = true;
      piso.userData.comodo = c.id;
      casa.add(piso);
      pisosMap[c.id] = { mesh: piso, padrao: c, padraoTx: tx };
    }
    // Cada face da parede pega a cor/papel do cômodo daquele lado; o lado de fora é claro
    const EXTERNA = '#F7F1EA';
    type ParedeMesh = {
      mesh: THREE.Mesh; p: Parede; centro: THREE.Vector3; alvo: number; atual: number;
      aoLongoX: boolean; len: number; h: number;
      comodoPos: Comodo | undefined; comodoNeg: Comodo | undefined;
    };
    const fazerParede = (pa: Parede, grupo: THREE.Object3D): ParedeMesh => {
      const aoLongoX = pa.z0 === pa.z1;
      const a0 = (aoLongoX ? Math.min(pa.x0, pa.x1) : Math.min(pa.z0, pa.z1)) - (pa.e0 ? ESP / 2 : 0);
      const a1 = (aoLongoX ? Math.max(pa.x0, pa.x1) : Math.max(pa.z0, pa.z1)) + (pa.e1 ? ESP / 2 : 0);
      const len = a1 - a0, mid = (a0 + a1) / 2;
      const y0 = pa.y0 ?? 0, y1 = pa.y1 ?? ALTURA, h = y1 - y0;
      const cx = aoLongoX ? mid : pa.x0, cz = aoLongoX ? pa.z0 : mid;
      const scx = (pa.x0 + pa.x1) / 2, scz = (pa.z0 + pa.z1) / 2;
      const comodoPos = aoLongoX ? comodoEm(scx, scz + 0.25) : comodoEm(scx + 0.25, scz);
      const comodoNeg = aoLongoX ? comodoEm(scx, scz - 0.25) : comodoEm(scx - 0.25, scz);
      const topo = mat(BRANCO);
      const facePos = mat(comodoPos?.parede ?? EXTERNA);
      const faceNeg = mat(comodoNeg?.parede ?? EXTERNA);
      facePos.userData.revestimento = true;
      faceNeg.userData.revestimento = true;
      const faces = aoLongoX
        ? [mat(EXTERNA), mat(EXTERNA), topo, mat(EXTERNA), facePos, faceNeg]
        : [facePos, faceNeg, topo, mat(EXTERNA), mat(EXTERNA), mat(EXTERNA)];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(aoLongoX ? len : ESP, h, aoLongoX ? ESP : len), faces);
      mesh.position.set(cx, y0 + h / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grupo.add(mesh);
      const pm: ParedeMesh = { mesh, p: pa, centro: new THREE.Vector3(scx, 0, scz), alvo: 1, atual: 1, aoLongoX, len, h, comodoPos, comodoNeg };
      mesh.userData.parede = pm;
      return pm;
    };
    const paredes: ParedeMesh[] = PAREDES.map(pa => fazerParede(pa, casa));
    // Garden thresholds and a continuous side gallery connect the annexes to the house.
    const acesso = new THREE.Group();casa.add(acesso);
    for(const [x,z,w,d] of [[3.35,-1.25,1.5,1.3],[10.35,-.8,1.5,.85],[-.65,1.65,.7,1.3],[-1.2,7.65,1.25,1.3],[12,1.65,1.4,5.85],[-2.75,8.75,1.6,.5]] as const){
      caixa(acesso,x,-.015,z,w,.025,d,'#D5C7AF',false);
    }
    // Open timber portals make circulation readable without swinging doors in the way.
    for(const p of PASSAGENS.filter(p=>p.id!=='garagem')){
      const g=new THREE.Group();acesso.add(g);
      g.position.set(p.eixo==='x'?p.inicio:p.fixo,0,p.eixo==='x'?p.fixo:p.inicio);
      if(p.eixo==='z')g.rotation.y=-Math.PI/2;
      const largura=p.fim-p.inicio;
      caixa(g,-.06,0,-.09,.06,2.25,.18,'#E0D4BC');caixa(g,largura,0,-.09,.06,2.25,.18,'#E0D4BC');
      caixa(g,-.06,2.18,-.09,largura+.12,.07,.18,'#E0D4BC');
    }

    const paredeMaisPerto = (x: number, z: number) => {
      let melhor: ParedeMesh | null = null, dist = 0.4;
      for (const pm of paredes) {
        if (pm.p.y0) continue;
        const pa = pm.p;
        const d = pm.aoLongoX
          ? (x >= Math.min(pa.x0, pa.x1) - 0.15 && x <= Math.max(pa.x0, pa.x1) + 0.15 ? Math.abs(z - pa.z0) : 99)
          : (z >= Math.min(pa.z0, pa.z1) - 0.15 && z <= Math.max(pa.z0, pa.z1) + 0.15 ? Math.abs(x - pa.x0) : 99);
        if (d < dist) { dist = d; melhor = pm; }
      }
      return melhor;
    };
    const janelasLista: { grupo: THREE.Group; parede: ParedeMesh | null; x: number; z: number; w: number; y: number; h: number; aoLongoX: boolean }[] = [];
    const janela = (x: number, z: number, w: number, y: number, h: number, aoLongoX: boolean) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      if (!aoLongoX) g.rotation.y = Math.PI / 2;
      caixa(g, -w / 2 - 0.06, -0.06, -0.1, w + 0.12, h + 0.12, 0.2, BRANCO);
      caixa(g, -w / 2, 0, -0.11, w, h, 0.22, '#CFE8F7');
      caixa(g, -0.03, 0, -0.12, 0.06, h, 0.24, BRANCO);
      caixa(g, -w / 2 - 0.1, -0.12, -0.16, w + 0.2, 0.06, 0.3, BRANCO);
      casa.add(g);
      janelasLista.push({ grupo: g, parede: paredeMaisPerto(x, z), x, z, w, y, h, aoLongoX });
      return g;
    };
    janela(0.65, 0, 0.8, 1.15, 0.8, true); janela(6.6, 0, 0.7, 1.6, 0.5, true);  janela(12, 6.0, 1.0, 1.35, 0.8, false);

    /* Móveis com ações. Os pontos são onde o personagem para; "lugar" é onde ele fica (sentado, deitado...) */
    // Quarto
    interativo('cama', 'Cama', 'quarto', [3.4, 1.4], [{ rotulo: 'Deitar', texto: 'Descansando', lugar: [2.1, 0.76, 2.15], deitar: [0, 1], fechados: true }, { rotulo: 'Sentar na cama', pose: 'sentado', texto: 'Sentado na cama', lugar: [2.8, 0.06, 1.75], frente: [1, 0] }], g => {
      caixa(g, 1.15, 0, 0.12, 1.9, 1.15, 0.14, AMEIXA_SUAVE);
      caixa(g, 1.2, 0, 0.26, 1.8, 0.32, 2.1, MADEIRA_CLARA);
      caixa(g, 1.25, 0.32, 0.28, 1.7, 0.22, 2.05, BRANCO);
      caixa(g, 1.35, 0.54, 0.35, 0.7, 0.14, 0.4, NEVOA);
      caixa(g, 2.15, 0.54, 0.35, 0.7, 0.14, 0.4, NEVOA);
      caixa(g, 1.22, 0.54, 0.95, 1.76, 0.07, 1.36, PINK);
      caixa(g, 1.22, 0.6, 0.95, 1.76, 0.03, 0.25, clarear(PINK, 0.45));
    });
    bloquear(1.15, 0.1, 3.05, 2.4);
    interativo('biblia', 'Bíblia na cabeceira', 'quarto', [0.65, 1.15], [
      { rotulo: 'Devocional', alvo: 'atividade:devocional' },
      { rotulo: 'Caderno de Intercessão', alvo: 'atividade:intercessao' },
      { rotulo: 'Diário de Gratidão', alvo: 'atividade:gratidao' },
    ], g => {
      caixa(g, 0.3, 0, 0.18, 0.62, 0.52, 0.48, MADEIRA_CLARA);
      caixa(g, 0.33, 0.25, 0.67, 0.56, 0.02, 0.01, escurecer(MADEIRA_CLARA, 0.25));
      caixa(g, 0.38, 0.52, 0.26, 0.3, 0.07, 0.22, NOITE);
      caixa(g, 0.39, 0.53, 0.27, 0.28, 0.05, 0.2, BRANCO);
      caixa(g, 0.38, 0.58, 0.26, 0.3, 0.02, 0.22, NOITE);
      caixa(g, 0.52, 0.605, 0.3, 0.02, 0.005, 0.14, LIMA);
      caixa(g, 0.47, 0.605, 0.35, 0.12, 0.005, 0.02, LIMA);
      cil(g, 0.78, 0.52, 0.42, 0.03, 0.35, AMEIXA_SUAVE);
      cil(g, 0.78, 0.82, 0.42, 0.14, 0.18, ROSA, 0.09);
    });
    bloquear(0.25, 0.1, 0.95, 0.7);
    interativo('guarda-roupa', 'Guarda-roupa', 'quarto', [1.2, 3.5], [{ rotulo: 'Trocar de roupa', alvo: 'roupas' }], g => {
      caixa(g, 0.1, 0, 2.8, 0.65, 2.1, 1.4, MADEIRA_CLARA);
      caixa(g, 0.74, 0.08, 2.86, 0.02, 1.95, 0.64, clarear(MADEIRA_CLARA, 0.2));
      caixa(g, 0.74, 0.08, 3.54, 0.02, 1.95, 0.6, clarear(MADEIRA_CLARA, 0.2));
      caixa(g, 0.77, 0.95, 3.38, 0.03, 0.22, 0.03, AMEIXA_SUAVE);
      caixa(g, 0.77, 0.95, 3.6, 0.03, 0.22, 0.03, AMEIXA_SUAVE);
      caixa(g, 0.06, 2.1, 2.76, 0.73, 0.08, 1.48, escurecer(MADEIRA_CLARA, 0.06));
    });
    bloquear(0.05, 2.75, 0.85, 4.25);
    interativo('almofada', 'Almofada de oração', 'quarto', [4.0, 2.4], [
      { rotulo: 'Orar', alvo: 'atividade:oracao' },
      { rotulo: 'Interceder por amigos', alvo: 'atividade:intercessao' },
    ], g => {
      caixa(g, 3.6, 0, 1.15, 0.8, 0.14, 0.8, PINK);
      caixa(g, 3.66, 0.14, 1.21, 0.68, 0.03, 0.68, '#FF5AA8');
    });
    interativo('moeda', 'Algo brilha aqui...', 'quarto', [3.4, 2.7], [{ rotulo: 'Pegar', alvo: 'segredo:dracma' }], g => {
      const m = cil(g, 3.2, 0.01, 2.45, 0.09, 0.02, '#F2C94C');
      (m.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#6A5200');
      g.userData.moeda = true;
    });
    // Banheiro
    interativo('banheira', 'Banheira', 'banheiro', [6.1, 1.5], [{ rotulo: 'Tomar banho', texto: 'Tomando banho', lugar: [5.9, -0.34, 0.6], pose: 'sentado', frente: [1, 0], alvo: 'acao:banho' }], g => {
      for (const [x, z] of [[5.3, 0.25], [6.85, 0.25], [5.3, 0.9], [6.85, 0.9]]) cil(g, x, 0, z, 0.05, 0.12, '#C9B6A2');
      caixa(g, 5.2, 0.1, 0.15, 1.8, 0.48, 0.12, BRANCO);
      caixa(g, 5.2, 0.1, 0.93, 1.8, 0.48, 0.12, BRANCO);
      caixa(g, 5.2, 0.1, 0.27, 0.12, 0.48, 0.66, BRANCO);
      caixa(g, 6.88, 0.1, 0.27, 0.12, 0.48, 0.66, BRANCO);
      caixa(g, 5.32, 0.1, 0.27, 1.56, 0.05, 0.66, BRANCO);
      caixa(g, 5.32, 0.4, 0.27, 1.56, 0.02, 0.66, '#BFE6FF', false);
      cil(g, 5.32, 0.58, 0.55, 0.03, 0.25, '#C9B6A2');
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      hit.position.set(6.1, 0.35, 0.6);
      g.add(hit);
    });
    bloquear(5.15, 0.1, 7.05, 1.1);
    interativo('patinho', 'Patinho de borracha', 'banheiro', [5.7, 1.5], [{ rotulo: 'Apertar o patinho', alvo: 'segredo:patinho' }], g => {
      bola(g, 5.75, 0.47, 0.5, 0.09, '#F2C94C', 0.75);
      bola(g, 5.8, 0.56, 0.5, 0.055, '#F2C94C');
      caixa(g, 5.84, 0.54, 0.48, 0.05, 0.02, 0.04, PINK);
    });
    {
      const g = new THREE.Group();
      casa.add(g);
      caixa(g, 7.3, 0, 0.12, 0.5, 0.5, 0.2, BRANCO);
      caixa(g, 7.35, 0, 0.32, 0.4, 0.38, 0.45, BRANCO);
      caixa(g, 7.34, 0.38, 0.32, 0.42, 0.04, 0.47, '#F1EAE2');
    }
    bloquear(7.25, 0.1, 7.85, 0.8);
    interativo('espelho', 'Pia e espelho', 'banheiro', [7.05, 2.6], [
      { rotulo: 'Mudar o visual', alvo: 'visual' },
      { rotulo: 'Lavar o rosto', pose: 'mexer', texto: 'Lavando o rosto e arrumando o visual 💦', lugar: [6.95, 0, 2.6], frente: [1, 0], alvo: 'acao:espelho_lavar' },
      { rotulo: 'Escovar os dentes', pose: 'comer', texto: 'Escovando os dentes 🪥', lugar: [6.95, 0, 2.6], frente: [1, 0], item: 'escova', alvo: 'acao:dentes' },
    ], g => {
      caixa(g, 7.4, 0, 2.2, 0.52, 0.82, 0.8, '#F2B8CF');
      caixa(g, 7.36, 0.82, 2.16, 0.58, 0.05, 0.88, BRANCO);
      cil(g, 7.62, 0.87, 2.6, 0.16, 0.02, '#E8F4FF');
      cil(g, 7.8, 0.87, 2.6, 0.02, 0.22, '#C9B6A2');
      caixa(g, 7.82, 1.15, 2.15, 0.06, 0.95, 0.9, '#E79BB9');
      caixa(g, 7.8, 1.2, 2.2, 0.06, 0.85, 0.8, '#DDF0FF');
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 1.0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      hit.position.set(7.65, 1.0, 2.6);
      g.add(hit);
    });
    bloquear(7.35, 2.1, 7.95, 3.05);
    {
      const t = new THREE.Group();
      casa.add(t);
      caixa(t, 5.08, 1.5, 3.1, 0.04, 0.05, 0.9, '#C9B6A2');
      caixa(t, 5.1, 0.95, 3.15, 0.05, 0.6, 0.8, '#C7F28A');
      caixa(t, 6.0, 0.005, 2.3, 1.0, 0.01, 0.6, '#F2B8CF', false);
    }
    // Sala de estudo
    interativo('estante', 'Estante', 'estudo', [9.3, 1.15], [
      { rotulo: 'Ler a Bíblia', alvo: 'atividade:leitura' },
      { rotulo: 'Memorizar Versículo', alvo: 'atividade:memorizacao' },
      { rotulo: 'Pegar um livro', pose: 'livro', texto: 'Folheando um livro 📖', frente: [0, 1], item: 'livro' },
    ], g => {
      // Estante aberta: fundo, laterais e tampo, com os livros à mostra
      caixa(g, 8.3, 0, 0.1, 2.0, 2.2, 0.05, escurecer(MADEIRA, 0.3));
      caixa(g, 8.3, 0, 0.1, 0.08, 2.2, 0.44, MADEIRA);
      caixa(g, 10.22, 0, 0.1, 0.08, 2.2, 0.44, MADEIRA);
      caixa(g, 8.3, 2.14, 0.1, 2.0, 0.08, 0.44, MADEIRA);
      caixa(g, 8.3, 0, 0.1, 2.0, 0.1, 0.44, MADEIRA);
      const cores = ['#42124C', ROSA, PINK, NEVOA, '#8E6A9A', '#F2B8CF', '#A9CF86'];
      [0.1, 0.62, 1.14, 1.66].forEach((y, fila) => {
        caixa(g, 8.38, y, 0.12, 1.84, 0.04, 0.4, clarear(MADEIRA, 0.15));
        for (let i = 0, x = 8.42; x < 10.1; i++, x += 0.12) {
          if ((i + fila) % 9 === 8) { x += 0.1; continue; }
          const h = 0.32 + ((i * 7 + fila * 3) % 4) * 0.035;
          caixa(g, x, y + 0.04, 0.16, 0.1, h, 0.3, cores[(i + fila) % cores.length]);
        }
      });
      cil(g, 9.6, 2.2, 0.3, 0.1, 0.16, PINK);
      bola(g, 9.6, 2.45, 0.3, 0.16, '#93C06C');
    });
    bloquear(8.25, 0.05, 10.35, 0.6);
    interativo('pergaminho', 'Pergaminho', 'estudo', [11.0, 0.7], [{ rotulo: 'Ler o pergaminho', alvo: 'segredo:pergaminho' }], g => {
      caixa(g, 11.65, 1.5, 0.25, 0.28, 0.05, 0.9, MADEIRA);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12), mat('#FBF8F4'));
      r.rotation.x = Math.PI / 2;
      r.position.set(11.78, 1.6, 0.7);
      g.add(r);
      (r.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#4A3A10');
    });
    interativo('mesa', 'Mesa de estudo', 'estudo', [10.75, 2.2], [
      { rotulo: 'Estudar a Bíblia', alvo: 'atividade:estudo' },
      { rotulo: 'Memorizar Versículo', alvo: 'atividade:memorizacao' },
      { rotulo: 'Diário de Gratidão', alvo: 'atividade:gratidao' },
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Sentado na mesa', lugar: [10.84, -0.09, 2.15], frente: [1, 0] },
    ], g => {
      for (const [x, z] of [[11.2, 1.4], [11.82, 1.4], [11.2, 2.88], [11.82, 2.88]]) caixa(g, x, 0, z, 0.06, 0.72, 0.06, BRANCO);
      caixa(g, 11.15, 0.72, 1.35, 0.75, 0.05, 1.6, BRANCO);
      caixa(g, 11.35, 0.77, 1.55, 0.35, 0.02, 0.5, PINK);
      caixa(g, 11.35, 0.77, 2.15, 0.4, 0.015, 0.45, BRANCO);
      cil(g, 11.6, 0.77, 2.75, 0.05, 0.12, '#E79BB9');
      cil(g, 11.7, 0.77, 1.5, 0.08, 0.02, AMEIXA_SUAVE);
      cil(g, 11.7, 0.79, 1.5, 0.015, 0.4, AMEIXA_SUAVE);
      cil(g, 11.7, 1.15, 1.5, 0.12, 0.13, ROSA, 0.07);
      for (const [x, z] of [[10.62, 1.92], [11.0, 1.92], [10.62, 2.36], [11.0, 2.36]]) caixa(g, x, 0, z, 0.04, 0.45, 0.04, AMEIXA_SUAVE);
      caixa(g, 10.6, 0.45, 1.9, 0.45, 0.05, 0.5, PINK);
      caixa(g, 10.58, 0.45, 1.9, 0.05, 0.5, 0.5, PINK);
    }).scale.y = 0.85;
    bloquear(11.1, 1.3, 11.95, 3.0);
    interativo('poltrona', 'Poltrona', 'estudo', [9.4, 3.4], [
      { rotulo: 'Devocional', alvo: 'atividade:devocional' },
      { rotulo: 'Ler um livro', pose: 'sentado', texto: 'Lendo na poltrona 📚', lugar: [8.9, -0.11, 3.4], frente: [1, 0], item: 'livro' },
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Descansando na poltrona', lugar: [8.9, -0.11, 3.4], frente: [1, 0] },
    ], g => {
      caixa(g, 8.3, 0.1, 2.95, 0.85, 0.32, 0.9, '#8E6A9A');
      caixa(g, 8.3, 0.42, 2.95, 0.22, 0.6, 0.9, '#7A5686');
      caixa(g, 8.52, 0.42, 2.95, 0.63, 0.25, 0.15, '#7A5686');
      caixa(g, 8.52, 0.42, 3.7, 0.63, 0.25, 0.15, '#7A5686');
      caixa(g, 8.52, 0.42, 3.1, 0.6, 0.08, 0.6, '#A88AB2');
      for (const [x, z] of [[8.35, 3.0], [9.08, 3.0], [8.35, 3.78], [9.08, 3.78]]) caixa(g, x, 0, z, 0.05, 0.1, 0.05, NOITE);
    }).scale.y = 0.8;
    bloquear(8.25, 2.9, 9.2, 3.9);
    // Sala
    som.current = new AmbienteSonoro();
    let telaTvRef: THREE.Mesh | null = null;
    let luzTvRef: THREE.PointLight | null = null;
    let ateTvAtiva = 0;
    let portaGeladeiraRef: THREE.Group | null = null;
    let luzGeladeiraRef: THREE.PointLight | null = null;
    let ateGeladeiraAberta = 0;
    let folhaPortaoRef: THREE.Group | null = null;
    let atePortaoAberto = 0;

    interativo('sofa', 'Sofá', 'sala', [1.65, 6.7], [
      { rotulo: 'Descanso Sabático', alvo: 'atividade:descansoSabatico' },
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Relaxando no sofá', lugar: [0.94, -0.09, 6.7], frente: [1, 0] },
      { rotulo: 'Ler no sofá', pose: 'sentado', texto: 'Lendo no sofá 📖', lugar: [0.94, -0.09, 6.7], frente: [1, 0], item: 'livro' },
    ], g => {
      caixa(g, 0.2, 0.08, 5.6, 0.95, 0.35, 2.2, '#F2B8CF');
      caixa(g, 0.2, 0.43, 5.6, 0.3, 0.5, 2.2, '#E79BB9');
      caixa(g, 0.5, 0.43, 5.6, 0.65, 0.25, 0.22, '#E79BB9');
      caixa(g, 0.5, 0.43, 7.58, 0.65, 0.25, 0.22, '#E79BB9');
      caixa(g, 0.5, 0.43, 5.84, 0.62, 0.1, 0.84, ROSA);
      caixa(g, 0.5, 0.43, 6.72, 0.62, 0.1, 0.84, ROSA);
      caixa(g, 0.52, 0.53, 6.0, 0.14, 0.3, 0.4, PINK);
      caixa(g, 0.52, 0.53, 7.1, 0.14, 0.3, 0.4, NEVOA);
      for (const [x, z] of [[0.25, 5.65], [1.08, 5.65], [0.25, 7.73], [1.08, 7.73]]) caixa(g, x, 0, z, 0.05, 0.08, 0.05, NOITE);
    }).scale.y = 0.8;
    bloquear(0.15, 5.55, 1.2, 7.85);
    // TV e Rack na frente do sofá
    interativo('tv', 'TV e Rack da sala', 'sala', [2.7, 6.7], [
      { rotulo: 'Canal de Louvor Acústico', pose: 'sentado', texto: 'Ouvindo louvor acústico na TV 🎶', lugar: [0.94, -0.09, 6.7], frente: [1, 0], alvo: 'acao:tv:louvor' },
      { rotulo: 'Lugares da Bíblia', pose: 'sentado', texto: 'Conhecendo lugares da Bíblia 🌍', lugar: [0.94, -0.09, 6.7], frente: [1, 0], alvo: 'acao:tv:terrasanta' },
      { rotulo: 'Mensagem do Dia', pose: 'sentado', texto: 'Lendo a mensagem do dia 📖', lugar: [0.94, -0.09, 6.7], frente: [1, 0], alvo: 'acao:tv:mensagem' },
      { rotulo: 'Assistir culto online', pose: 'sentado', texto: 'Assistindo o culto online 📺', lugar: [0.94, -0.09, 6.7], frente: [1, 0] },
      { rotulo: 'Diário de Gratidão', alvo: 'atividade:gratidao' },
      { rotulo: 'Assistir louvores', alvo: 'atividade:louvor' },
    ], g => {
      // Rack console moderno de madeira (largura Z = 1.6, profundidade X = 0.44, altura = 0.46)
      const xRack = 3.32, zRack = 5.9, largX = 0.44, largZ = 1.6, altRack = 0.46;
      // Pés pretos
      for (const [px, pz] of [[xRack + 0.05, zRack + 0.08], [xRack + largX - 0.05, zRack + 0.08], [xRack + 0.05, zRack + largZ - 0.08], [xRack + largX - 0.05, zRack + largZ - 0.08]]) {
        cil(g, px, 0, pz, 0.02, 0.12, NOITE);
      }
      // Corpo do rack: base, fundo, laterais, divisória e tampo
      caixa(g, xRack, 0.1, zRack, largX, 0.035, largZ, MADEIRA);
      caixa(g, xRack, 0.135, zRack, 0.035, altRack - 0.135, largZ, escurecer(MADEIRA, 0.2));
      caixa(g, xRack, 0.135, zRack, largX, altRack - 0.135, 0.035, escurecer(MADEIRA, 0.1));
      caixa(g, xRack, 0.135, zRack + largZ - 0.035, largX, altRack - 0.135, 0.035, escurecer(MADEIRA, 0.1));
      caixa(g, xRack, 0.135, zRack + largZ * 0.5 - 0.018, largX, altRack - 0.135, 0.035, escurecer(MADEIRA, 0.15));
      caixa(g, xRack - 0.02, altRack, zRack - 0.02, largX + 0.04, 0.04, largZ + 0.04, MADEIRA);

      // Itens nos nichos do rack
      // Nicho esquerdo: aparelho de TV / streaming box com LED
      caixa(g, xRack + 0.08, 0.14, zRack + 0.15, 0.26, 0.05, 0.42, NOITE);
      cil(g, xRack + 0.06, 0.165, zRack + 0.2, 0.008, 0.01, '#00D2FF');
      // Nicho direito: livros organizados
      for (let k = 0; k < 4; k++) {
        caixa(g, xRack + 0.08, 0.14, zRack + largZ * 0.5 + 0.1 + k * 0.09, 0.24, 0.18, 0.06, [PINK, AMEIXA_SUAVE, '#3F7F4A', MADEIRA_CLARA][k]);
      }

      // No tampo: Soundbar slim preta em frente à TV
      caixa(g, xRack + 0.03, altRack + 0.04, zRack + largZ * 0.5 - 0.45, 0.08, 0.04, 0.9, NOITE);

      // No tampo: Vasinho moderno com planta suculenta no canto
      cil(g, xRack + largX * 0.5, altRack + 0.04, zRack + largZ - 0.18, 0.06, 0.09, NEVOA);
      bola(g, xRack + largX * 0.5, altRack + 0.15, zRack + largZ - 0.18, 0.065, '#5CA84D');
      bola(g, xRack + largX * 0.5 + 0.02, altRack + 0.18, zRack + largZ - 0.16, 0.045, '#75BC62');

      // Suporte e base da TV
      caixa(g, xRack + 0.16, altRack + 0.04, zRack + largZ * 0.5 - 0.18, 0.14, 0.015, 0.36, escurecer(NOITE, 0.2));
      caixa(g, xRack + 0.21, altRack + 0.055, zRack + largZ * 0.5 - 0.05, 0.05, 0.12, 0.1, escurecer(NOITE, 0.2));

      // TV Smart Slim (borda preta fina, voltada para -X em direção ao sofá)
      const altTv = 0.68, largTv = 1.25, espTv = 0.03;
      const yTv = altRack + 0.16, zTv = zRack + (largZ - largTv) * 0.5;
      caixa(g, xRack + 0.21, yTv, zTv, espTv, altTv, largTv, '#151515');
      const tela = caixa(g, xRack + 0.205, yTv + 0.025, zTv + 0.025, 0.006, altTv - 0.05, largTv - 0.05, '#1B2430', false);
      tela.material = mat('#1B2430', { roughness: 0.2, metalness: 0.1, emissive: '#1B2430', emissiveIntensity: 0 });
      telaTvRef = tela;

      // Detalhe de culto online na tela: Cruz dourada de adoração no centro
      const xTela = xRack + 0.202, yCentroTv = yTv + altTv * 0.5, zCentroTv = zTv + largTv * 0.5;
      const matLuz = new THREE.MeshBasicMaterial({ color: '#FFEAA7' });
      const cruzV = caixa(g, xTela, yCentroTv - 0.12, zCentroTv - 0.018, 0.004, 0.24, 0.036, '#FFEAA7', false);
      cruzV.material = matLuz;
      const cruzH = caixa(g, xTela, yCentroTv + 0.02, zCentroTv - 0.065, 0.004, 0.036, 0.13, '#FFEAA7', false);
      cruzH.material = matLuz;
      const luzTv = new THREE.PointLight('#4FA8FF', 1.4, 3.2);
      luzTv.position.set(xTela - 0.25, yCentroTv, zCentroTv);
      g.add(luzTv);
      luzTvRef = luzTv;
    });
    bloquear(3.26, 5.85, 3.82, 7.55);
    interativo('aquario', 'Aquário', 'sala', [1.5, 5.25], [{ rotulo: 'Ver o peixe', alvo: 'segredo:peixe' }], g => {
      caixa(g, 0.2, 0, 4.65, 0.8, 0.6, 0.45, AMEIXA_SUAVE);
      caixa(g, 0.24, 0.6, 4.69, 0.72, 0.45, 0.37, '#BFE6FF', false).material = mat('#BFE6FF', { transparent: true, opacity: 0.55 });
      caixa(g, 0.26, 0.6, 4.71, 0.68, 0.06, 0.33, '#E9DCCB');
      bola(g, 0.6, 0.85, 4.88, 0.06, PINK, 0.6);
      cil(g, 0.4, 0.66, 4.8, 0.015, 0.25, '#88B862');
    });
    bloquear(0.15, 4.6, 1.05, 5.15);
    interativo('som', 'Caixa de som & Rádio', 'sala', [4.7, 5.55], [
      { rotulo: 'Ouvir louvor', alvo: 'atividade:louvor' },
      { rotulo: 'Rádio Instrumental', pose: 'cima', texto: 'Ouvindo instrumental suave 📻', frente: [0, 1], fones: true, alvo: 'acao:radio' },
    ], g => {
      caixa(g, 3.8, 0, 4.62, 1.8, 0.5, 0.45, MADEIRA);
      caixa(g, 3.55, 0, 4.62, 0.25, 0.95, 0.3, NOITE);
      caixa(g, 5.6, 0, 4.62, 0.25, 0.95, 0.3, NOITE);
      for (const x of [3.675, 5.725]) for (const y of [0.28, 0.66]) { const c = cil(g, x, y, 4.93, 0.07, 0.01, LIMA); c.rotation.x = Math.PI / 2; c.position.set(x, y, 4.93); }
      caixa(g, 4.35, 0.5, 4.68, 0.7, 0.06, 0.36, NEVOA);
      cil(g, 4.62, 0.56, 4.86, 0.15, 0.01, NOITE);
      cil(g, 4.62, 0.57, 4.86, 0.04, 0.01, PINK);
      for (let k = 0; k < 7; k++) caixa(g, 3.9 + k * 0.08, 0.04, 4.68, 0.05, 0.3, 0.32, [PINK, NOITE, ROSA, LIMA, '#8E6A9A', NEVOA, PINK][k]);
    });
    bloquear(3.5, 4.55, 5.9, 5.1);
    const violaoSuporte = interativo('violao', 'Violão', 'sala', [6.0, 7.3], [
      { rotulo: 'Tocar violão', pose: 'mexer', texto: 'Tocando violão 🎸', item: 'violao', frente: [-1, 0] },
      { rotulo: 'Ensaiar', alvo: 'atividade:ensaio' },
    ], g => {
      caixa(g, 6.45, 0, 8.4, 0.2, 0.05, 0.2, NOITE);
      const corpo = new THREE.Group();
      corpo.position.set(6.55, 0.05, 8.5);
      corpo.rotation.set(-0.15, 0.4, 0);
      g.add(corpo);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20), mat(MADEIRA));
      a.rotation.x = Math.PI / 2;
      a.position.y = 0.3;
      corpo.add(a);
      const b = a.clone();
      b.scale.setScalar(0.75);
      b.position.y = 0.6;
      corpo.add(b);
      caixa(corpo, -0.03, 0.75, -0.03, 0.06, 0.6, 0.06, escurecer(MADEIRA, 0.3));
      caixa(corpo, -0.05, 1.33, -0.04, 0.1, 0.14, 0.08, NOITE);
      corpo.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    });
    interativo('porta', 'Porta da rua', 'sala', [2.5, 8.3], [{ rotulo: 'Ir à igreja', alvo: 'atividade:igreja' }], g => {
      caixa(g, 2.02, 0, 8.98, 0.96, 2.12, 0.06, AMEIXA_SUAVE);
      caixa(g, 2.12, 0.15, 8.95, 0.76, 0.85, 0.02, '#5A3D60');
      caixa(g, 2.12, 1.15, 8.95, 0.76, 0.8, 0.02, '#5A3D60');
      bola(g, 2.85, 1.0, 8.94, 0.04, '#F2C94C');
      caixa(g, 2.0, 0.005, 8.25, 1.0, 0.01, 0.6, '#D9C3CD', false);
    });
    interativo('portao', 'Portão da frente', 'sala', [2.5, 9.8], [
      { rotulo: 'Cumprimentar vizinho ❤️', pose: 'cima', texto: 'Cumprimentando o vizinho com alegria ❤️', frente: [0, 1], alvo: 'acao:portao' },
      { rotulo: 'Gesto de Gentileza', alvo: 'atividade:gentileza' },
      { rotulo: 'Ler carta bíblica do dia', alvo: 'acao:correio' },
    ], g => {
      cil(g, 1.9, 0, 11.6, 0.06, 0.78, BRANCO);
      cil(g, 3.1, 0, 11.6, 0.06, 0.78, BRANCO);
      const folha = new THREE.Group();
      folha.position.set(1.94, 0, 11.6);
      caixa(folha, 0, 0.14, -0.025, 1.12, 0.05, 0.05, BRANCO);
      caixa(folha, 0, 0.52, -0.025, 1.12, 0.05, 0.05, BRANCO);
      for (let i = 0; i < 5; i++) caixa(folha, 0.08 + i * 0.22, 0.08, -0.02, 0.06, 0.56, 0.04, BRANCO);
      g.add(folha);
      folhaPortaoRef = folha;
    });
    interativo('treino', 'Tapete de treino', 'sala', [5.1, 7.85], [{ rotulo: 'Fazer exercício', alvo: 'atividade:exercicio' }], g => {
      caixa(g, 4.5, 0.005, 7.5, 1.3, 0.02, 0.7, '#C7F28A', false);
      caixa(g, 5.9, 0, 7.65, 0.35, 0.06, 0.06, NOITE);
      for (const x of [5.85, 6.2]) cil(g, x + 0.04, 0, 7.68, 0.08, 0.04, PINK).rotation.z = Math.PI / 2;
    });
    // Cozinha
    const balcao = (z0: number, z1: number) => {
      caixa(casa, 11.3, 0, z0, 0.65, 0.86, z1 - z0, '#FBF8F4');
      caixa(casa, 11.26, 0.86, z0 - 0.02, 0.72, 0.05, z1 - z0 + 0.04, MADEIRA);
      caixa(casa, 11.28, 0.12, z0 + 0.05, 0.02, 0.6, z1 - z0 - 0.1, '#EFE7DD');
      caixa(casa, 11.65, 1.55, z0, 0.32, 0.6, z1 - z0, '#FBF8F4');
    };
    balcao(4.65, 5.55); balcao(6.45, 6.95); balcao(7.65, 8.05);
    interativo('pia', 'Pia da cozinha', 'cozinha', [10.75, 6.0], [{ rotulo: 'Lavar a louça', pose: 'mexer', texto: 'Lavando a louça', frente: [1, 0] }], g => {
      caixa(g, 11.3, 0, 5.55, 0.65, 0.86, 0.9, '#FBF8F4');
      caixa(g, 11.26, 0.86, 5.53, 0.72, 0.05, 0.94, MADEIRA);
      caixa(g, 11.42, 0.88, 5.7, 0.42, 0.02, 0.6, '#DDE8EE');
      cil(g, 11.88, 0.9, 6.0, 0.02, 0.28, '#C9B6A2');
      caixa(g, 11.38, 0.9, 5.62, 0.12, 0.08, 0.12, PINK);
      caixa(g, 11.65, 1.55, 5.55, 0.32, 0.6, 0.9, '#FBF8F4');
    });
    interativo('fogao', 'Fogão e Chaleira', 'cozinha', [10.75, 7.3], [
      { rotulo: 'Cozinhar', pose: 'mexer', texto: 'Cozinhando na frigideira 🍳', item: 'frigideira', frente: [1, 0] },
      { rotulo: 'Passar café / chá na chaleira', pose: 'mexer', texto: 'Fazendo chá quentinho na chaleira 🫖', item: 'copo', frente: [1, 0], alvo: 'acao:chaleira' },
    ], g => {
      caixa(g, 11.3, 0, 6.95, 0.65, 0.86, 0.7, '#E8E2EA');
      caixa(g, 11.28, 0.12, 7.0, 0.02, 0.45, 0.6, NOITE);
      caixa(g, 11.3, 0.86, 6.95, 0.65, 0.04, 0.7, NOITE);
      for (const [x, z] of [[11.48, 7.12], [11.75, 7.12], [11.48, 7.45], [11.75, 7.45]]) cil(g, x, 0.9, z, 0.08, 0.01, '#5A3D60');
      cil(g, 11.48, 0.91, 7.12, 0.11, 0.12, PINK);
      // Chaleira esmaltada
      cil(g, 11.75, 0.91, 7.45, 0.085, 0.13, '#4BA7CC', 0.06);
      bola(g, 11.75, 1.05, 7.45, 0.022, MADEIRA);
    });
    interativo('geladeira', 'Geladeira', 'cozinha', [10.7, 8.4], [
      { rotulo: 'Fazer um lanche', pose: 'comer', texto: 'Comendo uma maçã 🍎', item: 'maca', frente: [0, 1], alvo: 'acao:geladeira' },
      { rotulo: 'Beber água', pose: 'comer', texto: 'Bebendo água 🥛', item: 'copo', frente: [0, 1], alvo: 'acao:geladeira' },
    ], g => {
      caixa(g, 11.28, 0, 8.1, 0.67, 1.95, 0.78, '#E8EDF2');
      const porta = new THREE.Group();
      porta.position.set(11.25, 0, 8.1);
      caixa(porta, 0, 0, 0, 0.04, 1.95, 0.78, '#F2F4F6');
      caixa(porta, -0.02, 1.25, 0.02, 0.02, 0.02, 0.74, '#C8CED6');
      caixa(porta, -0.03, 0.9, 0.1, 0.03, 0.3, 0.04, '#C8CED6');
      caixa(porta, -0.03, 1.4, 0.1, 0.03, 0.3, 0.04, '#C8CED6');
      caixa(porta, -0.02, 1.6, 0.4, 0.01, 0.16, 0.12, LIMA);
      g.add(porta);
      portaGeladeiraRef = porta;
      const luzGel = new THREE.PointLight('#FFF9D2', 0, 1.8);
      luzGel.position.set(11.15, 1.1, 8.45);
      g.add(luzGel);
      luzGeladeiraRef = luzGel;
    });
    bloquear(11.2, 4.6, 12, 8.95);
    interativo('jantar', 'Mesa de jantar', 'cozinha', [9.2, 7.75], [
      { rotulo: 'Refeição em Comunhão', alvo: 'atividade:comunhaoMesa' },
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Sentado à mesa', lugar: [9.2, -0.11, 7.5], frente: [0, -1] },
      { rotulo: 'Agradecer pela comida', alvo: 'atividade:oracao' },
    ], g => {
      for (const [x, z] of [[8.55, 6.25], [9.8, 6.25], [8.55, 7.1], [9.8, 7.1]]) caixa(g, x, 0, z, 0.06, 0.72, 0.06, MADEIRA);
      caixa(g, 8.5, 0.72, 6.2, 1.4, 0.05, 1.0, MADEIRA);
      cil(g, 9.2, 0.77, 6.7, 0.18, 0.02, BRANCO);
      bola(g, 9.2, 0.84, 6.7, 0.08, '#F2C94C', 0.6);
      cil(g, 8.85, 0.77, 6.45, 0.04, 0.1, ROSA);
      const cadeira = (x: number, z: number, frente: boolean) => {
        for (const [dx, dz] of [[0, 0], [0.38, 0], [0, 0.38], [0.38, 0.38]]) caixa(g, x + dx, 0, z + dz, 0.04, 0.42, 0.04, MADEIRA_CLARA);
        caixa(g, x - 0.02, 0.42, z - 0.02, 0.46, 0.05, 0.46, MADEIRA_CLARA);
        caixa(g, x - 0.02, 0.47, frente ? z + 0.4 : z - 0.02, 0.46, 0.45, 0.04, MADEIRA_CLARA);
      };
      cadeira(8.97, 5.62, false);
      cadeira(8.97, 7.33, true);
    }).scale.y = 0.85;
    bloquear(8.45, 5.55, 9.95, 7.25);
    /* Cômodos comprados na loja: dois anexos do lado direito e o jardim nos fundos.
       Antes da compra, o lote fica vazio com uma placa que leva à loja. */
    const tem = (item: string) => p.current.itens.includes(item);
    const grupoExtra: Record<string, THREE.Group> = {};
    const lotes: Record<string, THREE.Group> = {};
    const bloqueiosExtra: { area: [number, number, number, number]; quando: () => boolean }[] = [];
    const bloquearSe = (quando: () => boolean, x0: number, z0: number, x1: number, z1: number) => bloqueiosExtra.push({ area: [x0, z0, x1, z1], quando });
    const mudarPara = (g: THREE.Group, destino: THREE.Group) => { casa.remove(g); destino.add(g); return g; };
    const textoPlaca = (nome: string) => {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 320;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#E8D5BC'; c.fillRect(0, 0, 512, 320);
      c.strokeStyle = '#A9825F'; c.lineWidth = 14; c.strokeRect(7, 7, 498, 306);
      c.fillStyle = '#6B4E36'; c.textAlign = 'center';
      c.font = '600 40px Archivo, system-ui, sans-serif'; c.fillText('Em breve', 256, 82);
      c.fillStyle = '#42124C'; c.font = '800 54px Archivo, system-ui, sans-serif';
      const palavras = nome.split(' ');
      const linhas = palavras.length > 2 ? [palavras.slice(0, -2).join(' '), palavras.slice(-2).join(' ')] : [nome];
      linhas.forEach((l, i) => c.fillText(l, 256, 160 + i * 60 - (linhas.length - 1) * 30));
      c.fillStyle = '#6B4E36'; c.font = '600 34px Archivo, system-ui, sans-serif'; c.fillText('Toque para ver na loja', 256, 278);
      const tx = new THREE.CanvasTexture(cv);
      tx.colorSpace = THREE.SRGBColorSpace;
      return tx;
    };
    for (const e of EXTRAS) {
      const g = new THREE.Group();
      grupoExtra[e.id] = g;
      casa.add(g);
      const w = e.x1 - e.x0, d = e.z1 - e.z0;
      if (!e.aberto) {
        caixa(g, e.x0 - 0.25, -0.25, e.z0 - 0.25, w + 0.5, 0.25, d + 0.5, '#F6F0E9', false);
        const tx = texturaPiso(e.piso, e.chao);
        tx.repeat.set(w / 1.6, d / 1.6);
        const mt = mat(e.chao, { map: tx });
        mt.userData.revestimento = true;
        const piso = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mt);
        piso.rotation.x = -Math.PI / 2;
        piso.position.set((e.x0 + e.x1) / 2, 0.005, (e.z0 + e.z1) / 2);
        piso.receiveShadow = true;
        piso.userData.chao = true;
        piso.userData.comodo = e.id;
        g.add(piso);
        pisosMap[e.id] = { mesh: piso, padrao: e, padraoTx: tx };
        for (const pa of PAREDES_EXTRAS[e.id]) paredes.push(fazerParede(pa, g));
      }
      // Lote vazio: terra batida, estacas nos cantos e a placa
      const lote = new THREE.Group();
      lotes[e.id] = lote;
      casa.add(lote);
      if (!e.aberto) caixa(lote, e.x0, -0.012, e.z0, w, 0.004, d, '#E6DCC6', false);
      for (const [x, z] of [[e.x0, e.z0], [e.x1, e.z0], [e.x0, e.z1], [e.x1, e.z1]]) cil(lote, x, 0, z, 0.04, 0.35, MADEIRA);
      const [px, pz] = e.placa;
      const placa = interativo(`placa-${e.id}`, `Lote do ${e.nome.toLowerCase().startsWith('jardim') ? 'jardim' : e.nome}`, e.id, [px + 0.45, pz + 0.75], [{ rotulo: 'Ver na loja', alvo: 'loja:comodo' }], s => {
        const quadro = new THREE.Group();
        quadro.position.set(px, 0, pz);
        quadro.rotation.y = 0.55;
        cil(quadro, -0.5, 0, 0, 0.04, 1.25, MADEIRA);
        cil(quadro, 0.5, 0, 0, 0.04, 1.25, MADEIRA);
        const madeira = mat('#C9A88A');
        const tabua = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.875, 0.06), [madeira, madeira, madeira, madeira, mat('#FFFFFF', { map: textoPlaca(e.nome) }), madeira]);
        tabua.position.set(0, 1.15, 0.05);
        tabua.castShadow = true;
        quadro.add(tabua);
        s.add(quadro);
      });
      mudarPara(placa, lote);
      bloquearSe(() => !tem(e.item), px - 0.6, pz - 0.35, px + 0.6, pz + 0.35);
    }

    const cachePapel = new Map<string, { tx: THREE.CanvasTexture; roughness: number }>();
    const cachePiso = new Map<string, { tx: THREE.CanvasTexture; roughness: number }>();
    const possuiItem = (id: string) => { const it = LOJA.find(x => x.id === id); return !!it && (it.preco === 0 || tem(id)); };
    const aplicarAcabamentos = (previa?: { comodo: string; tipo: 'papel' | 'piso'; id: string } | null) => {
      const acab = p.current.acabamentos ?? {}, cor = p.current.cor;
      const pintarFace = (mt: THREE.MeshStandardMaterial, cm: Comodo | undefined, len: number, h: number) => {
        if (!cm) return;
        const pid = previa?.comodo === cm.id && previa.tipo === 'papel' ? previa.id : (acab[cm.id]?.papel ?? '');
        const valido = pid && possuiItem(pid) ? pid : '';
        const chave = valido ? `${valido}|${cor}` : '';
        if (mt.userData.papelChave === chave) return;
        mt.userData.papelChave = chave;
        if (!valido) {
          mt.map = null; mt.color.set(cm.parede); mt.roughness = 0.85; mt.needsUpdate = true;
          return;
        }
        let base = cachePapel.get(chave);
        if (!base) { base = texturaPapel(valido, cor); cachePapel.set(chave, base); }
        const clone = base.tx.clone();
        clone.needsUpdate = true;
        clone.repeat.set(len / 1.5, h / 1.5);
        mt.map = clone; mt.color.set('#FFFFFF'); mt.roughness = base.roughness; mt.needsUpdate = true;
      };
      for (const pm of paredes) {
        const faces = pm.mesh.material as THREE.MeshStandardMaterial[];
        pintarFace(faces[pm.aoLongoX ? 4 : 0], pm.comodoPos, pm.len, pm.h);
        pintarFace(faces[pm.aoLongoX ? 5 : 1], pm.comodoNeg, pm.len, pm.h);
      }
      for (const [cid, info] of Object.entries(pisosMap)) {
        const fid = previa?.comodo === cid && previa.tipo === 'piso' ? previa.id : (acab[cid]?.piso ?? '');
        const valido = fid && possuiItem(fid) ? fid : '';
        const chave = valido ? `${valido}|${cor}` : '';
        const mt = info.mesh.material as THREE.MeshStandardMaterial;
        if (mt.userData.pisoChave === chave) continue;
        mt.userData.pisoChave = chave;
        if (!valido) {
          mt.map = info.padraoTx; mt.color.set(info.padrao.chao); mt.roughness = 0.85; mt.needsUpdate = true;
          continue;
        }
        let base = cachePiso.get(chave);
        if (!base) { base = texturaRevestimentoPiso(valido, cor); cachePiso.set(chave, base); }
        const clone = base.tx.clone();
        clone.needsUpdate = true;
        clone.repeat.set((info.padrao.x1 - info.padrao.x0) / 1.6, (info.padrao.z1 - info.padrao.z0) / 1.6);
        mt.map = clone; mt.color.set('#FFFFFF'); mt.roughness = base.roughness; mt.needsUpdate = true;
      }
    };

    // Estúdio de louvor
    {
      const g = grupoExtra.estudio;
      caixa(g, 14.55, 0.005, 1.25, 2.9, 0.012, 2.4, '#5A3D6A', false);
      for (const x of [13.8, 14.55, 16.75, 17.5]) caixa(g, x, 1.15, 0.27, 0.6, 0.6, 0.06, '#3A2E48');
      const led = caixa(g, 13.6, 2.3, 0.27, 4.4, 0.05, 0.04, PINK);
      (led.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#FE0472');
      for (const x of [13.55, 17.68]) {
        caixa(g, x, 0, 3.8, 0.45, 1.1, 0.42, NOITE);
        for (const y of [0.35, 0.8]) { const c = cil(g, x + 0.225, y, 4.23, 0.12, 0.02, LIMA); c.rotation.x = Math.PI / 2; c.position.set(x + 0.225, y, 4.23); }
        bloquearSe(() => tem('estudio'), x, 3.75, x + 0.45, 4.25);
      }
    }
    mudarPara(interativo('bateria', 'Bateria', 'estudio', [16.6, 2.7], [
      { rotulo: 'Ensaiar', alvo: 'atividade:ensaio' },
      { rotulo: 'Tocar bateria', pose: 'sentado', texto: 'Tocando bateria 🥁', lugar: [17.1, -0.09, 1.98], frente: [0, -1], item: 'baquetas' },
    ], g => {
      const bumbo = cil(g, 17.1, 0, 1.25, 0.3, 0.32, PINK); bumbo.rotation.x = Math.PI / 2; bumbo.position.set(17.1, 0.3, 1.25);
      const pele = cil(g, 17.1, 0, 1.42, 0.26, 0.012, BRANCO); pele.rotation.x = Math.PI / 2; pele.position.set(17.1, 0.3, 1.42);
      for (const x of [16.92, 17.28]) { cil(g, x, 0.62, 1.18, 0.12, 0.13, PINK); cil(g, x, 0.75, 1.18, 0.11, 0.01, BRANCO); }
      cil(g, 16.6, 0, 1.6, 0.012, 0.5, '#C8CED6'); cil(g, 16.6, 0.5, 1.6, 0.16, 0.12, BRANCO);
      cil(g, 17.65, 0, 1.6, 0.17, 0.45, PINK); cil(g, 17.65, 0.45, 1.6, 0.16, 0.01, BRANCO);
      for (const [x, h] of [[16.45, 1.05], [17.8, 1.12]] as const) { cil(g, x, 0, 0.9, 0.012, h, '#C8CED6'); cil(g, x, h, 0.9, 0.22, 0.012, '#E8B83A'); }
      cil(g, 17.1, 0, 1.98, 0.15, 0.42, NOITE);
    }), grupoExtra.estudio);
    bloquearSe(() => tem('estudio'), 16.25, 0.6, 18.0, 2.2);
    mudarPara(interativo('teclado-estudio', 'Teclado', 'estudio', [14.75, 1.15], [
      { rotulo: 'Ensaiar', alvo: 'atividade:ensaio' },
      { rotulo: 'Tocar teclado', pose: 'mexer', texto: 'Tocando teclado 🎹', frente: [0, -1] },
    ], g => {
      for (const x of [14.3, 15.15]) caixa(g, x, 0, 0.55, 0.05, 0.78, 0.06, NOITE);
      caixa(g, 14.3, 0.3, 0.57, 0.9, 0.04, 0.03, NOITE);
      caixa(g, 14.15, 0.78, 0.45, 1.2, 0.08, 0.34, NOITE);
      caixa(g, 14.2, 0.86, 0.62, 1.1, 0.012, 0.15, BRANCO);
      for (let k = 0; k < 11; k++) if (k % 7 !== 2 && k % 7 !== 6) caixa(g, 14.26 + k * 0.095, 0.872, 0.6, 0.04, 0.012, 0.09, NOITE);
      cil(g, 14.75, 0, 1.5, 0.17, 0.45, AMEIXA_SUAVE);
    }), grupoExtra.estudio);
    bloquearSe(() => tem('estudio'), 14.1, 0.4, 15.4, 0.85);
    bloquearSe(() => tem('estudio'), 14.55, 1.3, 14.95, 1.7);
    mudarPara(interativo('microfone', 'Microfone', 'estudio', [15.7, 3.75], [
      { rotulo: 'Cantar', pose: 'cima', texto: 'Louvando no microfone', item: 'microfone' },
      { rotulo: 'Ouvir louvor', alvo: 'atividade:louvor' },
    ], g => {
      cil(g, 15.7, 0, 3.3, 0.14, 0.03, NOITE);
      cil(g, 15.7, 0.03, 3.3, 0.012, 1.35, '#C8CED6');
      bola(g, 15.7, 1.43, 3.3, 0.05, NOITE);
    }), grupoExtra.estudio);
    bloquearSe(() => tem('estudio'), 15.55, 3.15, 15.85, 3.45);

    // Academia
    {
      const g = grupoExtra.academia;
      caixa(g, 13.6, 0.5, 4.87, 1.6, 1.5, 0.03, BRANCO);
      caixa(g, 13.65, 0.55, 4.89, 1.5, 1.4, 0.03, '#DDF0FF');
      cil(g, 14.05, 0, 8.55, 0.3, 0.012, NOITE);
      bola(g, 14.05, 0.3, 8.55, 0.3, PINK);
      bloquearSe(() => tem('academia'), 13.7, 8.2, 14.4, 8.9);
    }
    mudarPara(interativo('esteira', 'Esteira', 'academia', [16.3, 6.25], [
      { rotulo: 'Correr na esteira', pose: 'andar', texto: 'Correndo na esteira', lugar: [16.1, 0.17, 5.42], frente: [1, 0] },
      { rotulo: 'Registrar exercício', alvo: 'atividade:exercicio' },
    ], g => {
      caixa(g, 15.4, 0, 5.05, 1.7, 0.16, 0.72, NOITE);
      caixa(g, 15.5, 0.16, 5.13, 1.45, 0.012, 0.56, '#4A4352');
      for (const z of [5.08, 5.69]) caixa(g, 16.98, 0.16, z, 0.05, 0.98, 0.05, '#8E96A0');
      caixa(g, 16.92, 1.1, 5.06, 0.18, 0.12, 0.7, NOITE);
      const tela = caixa(g, 16.9, 1.13, 5.25, 0.01, 0.07, 0.32, LIMA);
      (tela.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#3F7F00');
    }), grupoExtra.academia);
    bloquearSe(() => tem('academia'), 15.35, 5.0, 17.15, 5.82);
    mudarPara(interativo('bicicleta', 'Bicicleta', 'academia', [14.95, 6.4], [
      { rotulo: 'Pedalar', pose: 'sentado', texto: 'Pedalando', lugar: [14.4, 0.15, 5.98], frente: [0, -1] },
      { rotulo: 'Registrar exercício', alvo: 'atividade:exercicio' },
    ], g => {
      caixa(g, 14.15, 0, 5.15, 0.5, 0.06, 1.05, NOITE);
      caixa(g, 14.37, 0.06, 5.25, 0.06, 0.85, 0.06, '#8E96A0');
      caixa(g, 14.15, 0.9, 5.22, 0.5, 0.04, 0.06, NOITE);
      const roda = cil(g, 14.4, 0, 5.5, 0.2, 0.06, PINK); roda.rotation.z = Math.PI / 2; roda.position.set(14.4, 0.32, 5.5);
      caixa(g, 14.37, 0.06, 5.92, 0.06, 0.55, 0.06, '#8E96A0');
      caixa(g, 14.27, 0.6, 5.84, 0.26, 0.06, 0.26, NOITE);
    }), grupoExtra.academia);
    bloquearSe(() => tem('academia'), 14.1, 5.1, 14.7, 6.25);
    mudarPara(interativo('halteres', 'Halteres', 'academia', [17.05, 8.1], [
      { rotulo: 'Levantar peso', pose: 'correr', texto: 'Treinando', item: 'halteres' },
      { rotulo: 'Registrar exercício', alvo: 'atividade:exercicio' },
    ], g => {
      caixa(g, 17.62, 0, 7.4, 0.45, 0.62, 1.4, '#8E96A0');
      for (const y of [0.34, 0.66]) for (const z of [7.6, 8.1, 8.6]) {
        caixa(g, 17.67, y, z - 0.12, 0.04, 0.04, 0.24, NOITE);
        for (const dz of [-0.13, 0.13]) bola(g, 17.69, y + 0.02, z + dz, 0.055, NOITE);
      }
    }), grupoExtra.academia);
    bloquearSe(() => tem('academia'), 17.55, 7.35, 18.13, 8.85);
    mudarPara(interativo('colchonete', 'Colchonete', 'academia', [15.1, 8.1], [{ rotulo: 'Alongar', pose: 'correr', texto: 'Alongando' }], g => {
      caixa(g, 14.6, 0.005, 7.7, 1.9, 0.03, 0.8, LIMA, false);
    }), grupoExtra.academia);

    // Jardim com horta
    {
      const g = grupoExtra.jardim;
      for (let k = 0; k < 8; k++) { const c = cil(g, -1.0 + k * 0.62, 0, -0.9 - k * 0.38, 0.2, 0.03, '#F1EAE2'); c.castShadow = false; }
      cil(g, 1.4, 0, -2.3, 0.14, 1.3, '#9C7A62');
      bola(g, 1.4, 1.7, -2.3, 0.75, '#88B862');
      for (const [x, y, z] of [[1.0, 1.6, -1.8], [1.8, 1.9, -2.0], [1.6, 1.4, -2.8], [0.9, 2.0, -2.4]]) bola(g, x, y, z, 0.08, '#F59A2E');
      bloquearSe(() => tem('jardim'), 1.2, -2.5, 1.6, -2.1);
      for (const x of [3.2, 4.9, 6.6]) { bola(g, x, 0.3, -1.25, 0.36, '#93C06C', 0.8); bola(g, x + 0.12, 0.52, -1.2, 0.07, ROSA); bola(g, x - 0.15, 0.45, -1.1, 0.06, PINK); }
      const regador = cil(g, 8.4, 0, -5.4, 0.12, 0.24, PINK);
      regador.castShadow = true;
      const bico = cil(g, 8.55, 0.12, -5.4, 0.02, 0.22, PINK); bico.rotation.z = -0.9; bico.position.set(8.62, 0.22, -5.4);
    }
    const folhasHorta: {obj:THREE.Object3D;escala:THREE.Vector3}[]=[];
    mudarPara(interativo('horta', 'Horta', 'jardim', [4.6, -4.35], [
      { rotulo: 'Cuidar da Criação', alvo: 'atividade:cuidarCriacao' },
      { rotulo: 'Regar a horta', pose: 'mexer', texto: 'Regando a horta', item: 'regador' },
      { rotulo: 'Colher verduras', pose: 'mexer', texto: 'Colhendo verduras' },
    ], g => {
      const antesHorta = g.children.length;
      [1.2, 3.6, 6.0].forEach((x, k) => {
        caixa(g, x, 0, -5.9, 1.8, 0.28, 0.9, MADEIRA);
        caixa(g, x + 0.06, 0.28, -5.84, 1.68, 0.02, 0.78, '#7A5236');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
          const cx = x + 0.3 + i * 0.4, cz = -5.65 + j * 0.4;
          if (k === 0) bola(g, cx, 0.38, cz, 0.13, '#7FB65A', 0.8);
          if (k === 1) { cil(g, cx, 0.3, cz, 0.03, 0.04, '#F07A22'); bola(g, cx, 0.42, cz, 0.08, '#6FA84A', 1.4); }
          if (k === 2 && j === 0) { cil(g, cx, 0.3, cz + 0.2, 0.012, 0.6, MADEIRA_CLARA); bola(g, cx, 0.55, cz + 0.2, 0.15, '#6FA84A'); bola(g, cx + 0.08, 0.5, cz + 0.32, 0.05, '#E63B2E'); bola(g, cx - 0.07, 0.62, cz + 0.28, 0.045, '#E63B2E'); }
        }
      });
      for(const obj of g.children.slice(antesHorta)) if(obj.position.y>.32) folhasHorta.push({obj,escala:obj.scale.clone()});
    }), grupoExtra.jardim);
    bloquearSe(() => tem('jardim'), 1.1, -6.0, 7.9, -4.9);
    mudarPara(interativo('banco', 'Banco do jardim', 'jardim', [5.5, -2.15], [
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Descansando no jardim', lugar: [5.5, -0.11, -2.74], frente: [0, 1] },
      { rotulo: 'Orar no jardim', alvo: 'atividade:oracao' },
    ], g => {
      caixa(g, 4.8, 0.38, -3.1, 1.4, 0.06, 0.45, MADEIRA);
      caixa(g, 4.8, 0.44, -3.12, 1.4, 0.42, 0.06, MADEIRA);
      for (const x of [4.85, 6.1]) for (const z of [-3.08, -2.72]) caixa(g, x, 0, z, 0.06, 0.38, 0.06, '#6B4E36');
    }), grupoExtra.jardim).scale.y = 0.82;
    bloquearSe(() => tem('jardim'), 4.75, -3.18, 6.25, -2.62);
    mudarPara(interativo('fonte', 'Fonte', 'jardim', [10.3, -3.9], [{ rotulo: 'Ouvir a fonte', pose: 'mexer', texto: 'Descansando ao som da água', alvo: 'acao:fonte' }], g => {
      cil(g, 10.3, 0, -4.8, 0.55, 0.3, '#D9D2CC');
      const agua = cil(g, 10.3, 0.29, -4.8, 0.48, 0.02, '#9ED8F0');
      (agua.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#1D5A7A');
      cil(g, 10.3, 0.3, -4.8, 0.08, 0.5, '#D9D2CC');
      cil(g, 10.3, 0.8, -4.8, 0.22, 0.08, '#D9D2CC', 0.16);
      cil(g, 10.3, 0.87, -4.8, 0.18, 0.015, '#9ED8F0');
    }), grupoExtra.jardim);
    bloquearSe(() => tem('jardim'), 9.7, -5.4, 10.9, -4.2);

    let boiaPiscinaRef: THREE.Group | null = null;
    if (grupoExtra.piscina) {
      const g = grupoExtra.piscina;

      // 1. Deck de madeira nobre (peroba / cumaru) elevado a 5cm do solo
      const matDeck = mat('#C49A6C');
      caixa(g, -5.55, 0, .45, 1.17, .05, 8.3, matDeck);
      caixa(g, -1.52, 0, .45, 1.27, .05, 8.3, matDeck);
      caixa(g, -4.38, 0, .45, 2.86, .05, 1.67, matDeck);
      caixa(g, -4.38, 0, 6.28, 2.86, .05, 2.47, matDeck);

      // Ripas de madeira chanfradas no deck
      for (let z = 0.8; z < 8.6; z += 0.34) {
        if (z < 2.12 || z > 6.28) caixa(g, -5.52, .05, z, 5.24, .003, .012, '#9E744A', false);
        else { caixa(g, -5.52, .05, z, 1.14, .003, .012, '#9E744A', false); caixa(g, -1.52, .05, z, 1.24, .003, .012, '#9E744A', false); }
      }

      // 2. Piscina com cuba rebaixada e borda de pedra atérmica
      // Borda de pedra branca atérmica ao redor da água
      const bordaPedra = mat('#FAF7F2', { roughness: 0.82 });
      caixa(g, -4.38, .048, 2.12, .2, .038, 4.16, bordaPedra);
      caixa(g, -1.72, .048, 2.12, .2, .038, 4.16, bordaPedra);
      caixa(g, -4.18, .048, 2.12, 2.46, .038, .2, bordaPedra);
      caixa(g, -4.18, .048, 6.08, 2.46, .038, .2, bordaPedra);
      // Cuba azul marinho com azulejos
      caixa(g, -4.18, -.45, 2.32, 2.46, .04, 3.76, '#237C94', false);
      caixa(g, -4.18, -.45, 2.32, .035, .5, 3.76, '#368DA5', false);
      caixa(g, -1.755, -.45, 2.32, .035, .5, 3.76, '#368DA5', false);
      caixa(g, -4.18, -.45, 2.32, 2.46, .5, .035, '#368DA5', false);
      caixa(g, -4.18, -.45, 6.045, 2.46, .5, .035, '#368DA5', false);

      // Superfície da água azul-turquesa cristalina com refração suave
      const matAgua = new THREE.MeshStandardMaterial({
        color: '#28C5E6',
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      });
      const aguaMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.44, 3.74), matAgua);
      aguaMesh.rotation.x = -Math.PI / 2;
      aguaMesh.position.set(-2.95, 0.035, 4.2);
      aguaMesh.receiveShadow = true;
      g.add(aguaMesh);

      // Reflexos/glints suaves de luz na água
      for (const [gx, gz, gw, gh] of [
        [-3.4, 3.2, 0.6, 0.04],
        [-2.5, 4.6, 0.8, 0.035],
        [-3.1, 5.4, 0.5, 0.03],
        [-2.6, 2.8, 0.4, 0.03],
      ]) {
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), new THREE.MeshBasicMaterial({
          color: '#FFFFFF', transparent: true, opacity: 0.55,
        }));
        gl.rotation.x = -Math.PI / 2;
        gl.rotation.z = 0.4;
        gl.position.set(gx, 0.038, gz);
        g.add(gl);
      }

      // 3. Escadinha de piscina em aço inox cromado
      const matInox = new THREE.MeshStandardMaterial({ color: '#E8ECEF', metalness: 0.92, roughness: 0.15 });
      for (const s of [-0.22, 0.22]) {
        const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 12), matInox);
        c1.position.set(-1.7 + s * 0.2, 0.22, 4.2 + s);
        g.add(c1);
      }
      for (let k = 0; k < 3; k++) {
        const degrau = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 10), matInox);
        degrau.rotation.x = Math.PI / 2;
        degrau.position.set(-1.8, 0.16 - k * 0.12, 4.2);
        g.add(degrau);
      }

      // 4. Boia inflável de flamingo rosa flutuando na água
      const grupoBoia = new THREE.Group();
      grupoBoia.position.set(-2.6, 0.05, 3.4);
      const matFlamingo = mat('#FF4081', { roughness: 0.3, metalness: 0.05 });
      const anelBoia = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 14, 24), matFlamingo);
      anelBoia.rotation.x = Math.PI / 2;
      grupoBoia.add(anelBoia);
      cil(grupoBoia, 0, 0.05, -0.28, 0.032, 0.32, '#FF4081');
      bola(grupoBoia, 0, 0.36, -0.3, 0.065, '#FF4081');
      caixa(grupoBoia, -0.018, 0.34, -0.42, 0.036, 0.028, 0.07, '#FFD54F', false);
      caixa(grupoBoia, -0.018, 0.34, -0.44, 0.036, 0.028, 0.022, '#212121', false);
      g.add(grupoBoia);
      boiaPiscinaRef = grupoBoia;

      // 5. Vasos de plantas tropicais nas quinas do deck
      for (const [vx, vz] of [[-5.2, 0.8], [-5.2, 8.3], [-0.6, 8.3]]) {
        cil(g, vx, 0.05, vz, 0.18, 0.32, '#ECEFF1');
        bola(g, vx, 0.45, vz, 0.28, '#2E7D32', 1.2);
        bola(g, vx + 0.08, 0.52, vz - 0.04, 0.2, '#388E3C', 1.1);
        bola(g, vx - 0.06, 0.48, vz + 0.08, 0.18, '#43A047', 1.1);
      }
    }

    // Espreguiçadeiras com Ombrelone (Solário)
    mudarPara(interativo('espreguicadeira', 'Espreguiçadeira', 'piscina', [-3.6, 7.8], [
      { rotulo: 'Tomar sol', pose: 'sentado', texto: 'Tomando um sol e descansando ☀️', lugar: [-3.6, 0.08, 7.2], frente: [0, -1], alvo: 'acao:piscina_sol' },
      { rotulo: 'Ler a Bíblia', pose: 'sentado', texto: 'Lendo a Bíblia na espreguiçadeira 📖', lugar: [-3.6, 0.08, 7.2], frente: [0, -1], item: 'livro' },
      { rotulo: 'Orar ao ar livre', alvo: 'atividade:oracao' },
    ], g => {
      for (const [x, corColchao] of [[-4.0, '#FFD54F'], [-3.2, '#4FC3F7']] as const) {
        caixa(g, x - 0.28, 0.05, 6.7, 0.56, 0.12, 1.3, '#A9825F');
        caixa(g, x - 0.25, 0.17, 6.75, 0.5, 0.06, 0.85, corColchao);
        const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.48), mat(corColchao));
        encosto.position.set(x, 0.30, 7.78);
        encosto.rotation.x = -0.42;
        encosto.castShadow = true;
        g.add(encosto);
        caixa(g, x - 0.2, 0.23, 7.0, 0.4, 0.02, 0.25, '#FFFFFF');
      }
      cil(g, -3.6, 0.05, 7.4, 0.16, 0.26, '#C49A6C');
      cil(g, -3.6, 0.31, 7.4, 0.03, 0.08, '#FF8A65');
      const ox = -2.5, oz = 7.7;
      cil(g, ox, 0.05, oz, 0.24, 0.06, '#37474F');
      cil(g, ox, 0.11, oz, 0.035, 2.2, '#8D6E63');
      const cupula = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.38, 8), mat('#FFF8E1'));
      cupula.position.set(ox, 2.35, oz);
      cupula.castShadow = true;
      g.add(cupula);
    }), grupoExtra.piscina);
    bloquearSe(() => tem('piscina'), -4.4, 6.6, -2.2, 8.4);

    // Piscina: nadar e relaxar na água
    mudarPara(interativo('piscina_nadar', 'Piscina', 'piscina', [-1.4, 4.2], [
      { rotulo: 'Nadar na piscina', pose: 'andar', texto: 'Nadando e se refrescando 🏊‍♂️', lugar: [-2.9, -0.32, 4.2], frente: [-1, 0], alvo: 'acao:piscina_nadar' },
      { rotulo: 'Boia de Flamingo', pose: 'sentado', texto: 'Flutuando na boia da piscina 🦩', lugar: [-2.6, -0.18, 3.4], frente: [0, 1], alvo: 'acao:piscina_boia' },
      { rotulo: 'Relaxar na água', pose: 'sentado', texto: 'Relaxando na água fresca 🌊', lugar: [-2.7, -0.22, 3.6], frente: [0, 1] },
    ], g => {
      caixa(g, -1.5, 0.05, 3.9, 0.3, 0.005, 0.6, '#FAF7F2', false);
    }), grupoExtra.piscina);
    bloquearSe(() => tem('piscina'), -4.35, 2.15, -1.45, 6.25);

    // Mesa Bistrô da Piscina
    mudarPara(interativo('bistro_piscina', 'Mesa Bistrô', 'piscina', [-4.1, 1.8], [
      { rotulo: 'Tomar água de coco', pose: 'mexer', texto: 'Tomando água de coco geladinha 🥥', item: 'coco', frente: [0, -1], alvo: 'acao:piscina_coco' },
      { rotulo: 'Comer fruta fresca', pose: 'mexer', texto: 'Saboreando fruta fresca 🍉', item: 'maca', frente: [0, -1] },
    ], g => {
      const bx = -4.1, bz = 1.3;
      cil(g, bx, 0.05, bz, 0.22, 0.04, '#37474F');
      cil(g, bx, 0.09, bz, 0.03, 0.72, '#CFD8DC');
      cil(g, bx, 0.81, bz, 0.42, 0.03, '#ECEFF1');
      for (const [cx, cz] of [[bx - 0.45, bz], [bx + 0.45, bz]]) {
        cil(g, cx, 0.05, cz, 0.16, 0.45, '#8D6E63');
        caixa(g, cx - 0.14, 0.5, cz - 0.02, 0.28, 0.38, 0.04, '#A9825F');
      }
      bola(g, bx - 0.08, 0.88, bz - 0.04, 0.055, '#4CAF50');
      cil(g, bx - 0.06, 0.94, bz - 0.04, 0.004, 0.06, '#FE0472');
      bola(g, bx + 0.08, 0.88, bz + 0.05, 0.052, '#4CAF50');
      cil(g, bx, 0.83, bz, 0.12, 0.015, '#FFFFFF');
      caixa(g, bx - 0.05, 0.85, bz - 0.03, 0.1, 0.025, 0.05, '#E53935');
    }), grupoExtra.piscina);
    bloquearSe(() => tem('piscina'), -4.8, 0.8, -3.4, 1.8);

    // Ducha Externa
    mudarPara(interativo('ducha_piscina', 'Ducha Externa', 'piscina', [-1.0, 1.6], [
      { rotulo: 'Ducha refrescante', pose: 'cima', texto: 'Tomando uma ducha refrescante 🚿', frente: [0, -1], alvo: 'acao:piscina_ducha' },
    ], g => {
      const dx = -1.0, dz = 1.0;
      caixa(g, dx - 0.35, 0.051, dz - 0.35, 0.7, 0.01, 0.7, '#A9825F', false);
      cil(g, dx, 0.055, dz, 0.06, 0.008, '#78909C');
      const matInox = new THREE.MeshStandardMaterial({ color: '#CFD8DC', metalness: 0.9, roughness: 0.15 });
      const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 12), matInox);
      coluna.position.set(dx, 1.15, dz - 0.28);
      g.add(coluna);
      const braco = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 10), matInox);
      braco.rotation.x = Math.PI / 2;
      braco.position.set(dx, 2.22, dz - 0.14);
      g.add(braco);
      const prato = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16), matInox);
      prato.position.set(dx, 2.18, dz);
      g.add(prato);
      caixa(g, dx - 0.04, 1.0, dz - 0.26, 0.08, 0.05, 0.08, '#90A4AE');
    }), grupoExtra.piscina);
    bloquearSe(() => tem('piscina'), -1.3, 0.7, -0.7, 1.3);

    // Garagem / Oficina Criativa
    if (grupoExtra.garagem) {
      const g = grupoExtra.garagem;
      // Rampa de acesso para a calçada
      caixa(g, -4.8, 0.002, 12.0, 3.8, 0.02, 0.9, '#D4D9DF', false);
      // Painel de ferramentas (pegboard) na parede norte
      caixa(g, -4.8, 1.1, 9.28, 2.0, 0.85, 0.03, '#D2A679');
      // Caixas de doação organizadas no canto
      caixa(g, -5.3, 0, 11.2, 0.55, 0.42, 0.55, '#C89B72');
      caixa(g, -5.25, 0.42, 11.25, 0.45, 0.35, 0.45, '#DFB68E');
      bloquearSe(() => tem('garagem'), -5.4, 11.1, -4.6, 11.9);
    }
    mudarPara(interativo('bancada_oficina', 'Bancada de Marcenaria', 'garagem', [-3.8, 10.2], [
      { rotulo: 'Restaurar móvel de madeira', pose: 'mexer', texto: 'Restaurando madeira na oficina 🪚', frente: [0, -1] },
      { rotulo: 'Separar doações', alvo: 'atividade:gentileza' },
    ], g => {
      caixa(g, -4.7, 0, 9.35, 1.8, 0.82, 0.62, '#6B4E36');
      caixa(g, -4.75, 0.82, 9.32, 1.9, 0.06, 0.68, MADEIRA);
      caixa(g, -4.4, 0.88, 9.48, 0.35, 0.14, 0.25, '#D94336');
      cil(g, -3.3, 0.88, 9.55, 0.08, 0.16, '#4BA7CC');
    }), grupoExtra.garagem);
    bloquearSe(() => tem('garagem'), -4.8, 9.3, -2.8, 10.05);

    mudarPara(interativo('bicicleta_passeio', 'Bicicleta de Passeio', 'garagem', [-1.5, 10.6], [
      { rotulo: 'Sair para pedalar', alvo: 'atividade:exercicio' },
      { rotulo: 'Calibrar pneus', pose: 'mexer', texto: 'Cuidando da bicicleta de passeio 🚲', frente: [1, 0] },
    ], g => {
      for (const dz of [-0.38, 0.38]) {
        const roda = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 10, 20), mat(NOITE));
        roda.rotation.y = Math.PI / 2;
        roda.position.set(-1.1, 0.27, 10.6 + dz);
        g.add(roda);
      }
      caixa(g, -1.13, 0.26, 10.22, 0.05, 0.38, 0.76, '#2366B5');
      caixa(g, -1.28, 0.64, 10.18, 0.36, 0.04, 0.04, '#CFD8DC');
      caixa(g, -1.18, 0.58, 10.68, 0.16, 0.05, 0.22, '#6B4226');
    }), grupoExtra.garagem);
    bloquearSe(() => tem('garagem'), -1.4, 10.0, -0.8, 11.2);

    // Varanda Gourmet & Horta
    if (grupoExtra.varanda) {
      const g = grupoExtra.varanda;
      const matDeckV = mat('#C99E70');
      caixa(g, 7.25, 0, -4.15, 4.9, 0.05, 3.9, matDeckV);
      // Pergolado de madeira
      for (const [px, pz] of [[7.35, -4.05], [12.0, -4.05], [7.35, -0.35], [12.0, -0.35]] as const) {
        caixa(g, px, 0.05, pz, 0.12, 2.35, 0.12, '#8A5A3C');
      }
      for (let x = 7.35; x <= 12.05; x += 0.58) {
        caixa(g, x, 2.35, -4.1, 0.07, 0.09, 3.85, '#9E6B47');
      }
      // Festão de luzinhas quentes no pergolado
      for (let i = 0; i <= 7; i++) {
        const lx = 7.6 + i * 0.6;
        const l = bola(g, lx, 2.28, -2.2, 0.04, '#FFE27A');
        (l.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#FFA500');
        (l.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;
      }
    }
    mudarPara(interativo('mesa_varanda', 'Mesa da Varanda Gourmet', 'varanda', [9.5, -2.1], [
      { rotulo: 'Refeição em Comunhão', alvo: 'atividade:comunhaoMesa' },
      { rotulo: 'Sentar na varanda', pose: 'sentado', texto: 'Conversando na varanda gourmet ☕', lugar: [9.5, -0.09, -2.1], frente: [0, 1] },
    ], g => {
      caixa(g, 8.7, 0.05, -2.9, 1.6, 0.68, 0.9, MADEIRA);
      caixa(g, 8.65, 0.73, -2.95, 1.7, 0.05, 1.0, '#A97850');
      cil(g, 9.5, 0.78, -2.45, 0.14, 0.03, BRANCO);
      bola(g, 9.5, 0.84, -2.45, 0.07, '#88B862');
    }), grupoExtra.varanda);
    bloquearSe(() => tem('varanda'), 8.6, -3.0, 10.4, -1.9);

    mudarPara(interativo('cafeteira_varanda', 'Cantinho do Café & Ervas', 'varanda', [11.2, -1.3], [
      { rotulo: 'Passar café fresco', pose: 'mexer', texto: 'Passando café fresquinho na varanda ☕', item: 'copo', frente: [1, 0], alvo: 'acao:chaleira' },
      { rotulo: 'Cuidar dos vasos', alvo: 'atividade:cuidarCriacao' },
    ], g => {
      caixa(g, 11.4, 0.05, -1.9, 0.55, 0.82, 1.2, '#FAF6F0');
      caixa(g, 11.38, 0.87, -1.92, 0.59, 0.05, 1.24, MADEIRA);
      cil(g, 11.65, 0.92, -1.5, 0.09, 0.18, '#D94336', 0.06);
      cil(g, 11.65, 0.92, -1.1, 0.1, 0.14, '#7FB65A');
      bola(g, 11.65, 1.12, -1.1, 0.14, '#5CA84D');
    }), grupoExtra.varanda);
    bloquearSe(() => tem('varanda'), 11.35, -1.95, 12.0, -0.65);


    /* Decoração comprada: posição 3D livre (drag and drop) */
    const decoracao = new THREE.Group();
    casa.add(decoracao);
    const fantasma = new THREE.Group();
    fantasma.visible = false;
    casa.add(fantasma);
    const matAnelBase = new THREE.MeshBasicMaterial({ color: '#F5B700', side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthTest: false });
    const anelBase = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.58, 36), matAnelBase);
    anelBase.rotation.x = -Math.PI / 2;
    anelBase.position.y = 0.022;
    anelBase.renderOrder = 11;
    anelBase.visible = false;
    casa.add(anelBase);
    const matAnel = new THREE.MeshBasicMaterial({ color: '#4FD466', side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthTest: false });
    const anelChao = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.45, 36), matAnel);
    anelChao.rotation.x = -Math.PI / 2;
    anelChao.position.y = 0.025;
    anelChao.renderOrder = 12;
    anelChao.visible = false;
    casa.add(anelChao);
    const anelParede = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 4), matAnel);
    anelParede.rotation.z = Math.PI / 4;
    anelParede.renderOrder = 12;
    anelParede.visible = false;
    casa.add(anelParede);
    const txNeon = (() => {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 192;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#000000'; c.fillRect(0, 0, 512, 192);
      c.font = '900 112px BarlowCondensed_900Black, Archivo, system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#FFFFFF'; c.shadowBlur = 18;
      c.fillStyle = '#FFFFFF'; c.fillText('JESUS', 256, 102);
      const tx = new THREE.CanvasTexture(cv);
      tx.colorSpace = THREE.SRGBColorSpace;
      return tx;
    })();
    // Cada móvel é montado em volta da origem (parede: virado para +z; chão: em pé no chão)
    const MONTAR: Record<string, (g: THREE.Group) => void> = {
      quadro: g => { caixa(g, -0.45, -0.38, 0, 0.9, 0.76, 0.04, MADEIRA); caixa(g, -0.39, -0.32, 0.02, 0.78, 0.64, 0.03, NEVOA); caixa(g, -0.03, -0.2, 0.05, 0.06, 0.42, 0.02, PINK); caixa(g, -0.14, 0.04, 0.05, 0.28, 0.06, 0.02, PINK); },
      cruz: g => { caixa(g, -0.05, -0.5, 0, 0.1, 1.0, 0.06, MADEIRA); caixa(g, -0.28, 0.1, 0, 0.56, 0.1, 0.06, MADEIRA); },
      relogio: g => { const a = cil(g, 0, 0, 0, 0.28, 0.05, AMEIXA_SUAVE); a.rotation.x = Math.PI / 2; a.position.set(0, 0, 0.025); const b = cil(g, 0, 0, 0, 0.24, 0.02, BRANCO); b.rotation.x = Math.PI / 2; b.position.set(0, 0, 0.055); caixa(g, -0.01, 0, 0.07, 0.02, 0.17, 0.01, NOITE); caixa(g, 0, -0.01, 0.07, 0.13, 0.02, 0.01, PINK); },
      espelhoRedondo: g => { const a = cil(g, 0, 0, 0, 0.36, 0.04, '#E79BB9'); a.rotation.x = Math.PI / 2; a.position.set(0, 0, 0.02); const b = cil(g, 0, 0, 0, 0.3, 0.02, '#DDF0FF'); b.rotation.x = Math.PI / 2; b.position.set(0, 0, 0.045); },
      poster: g => { caixa(g, -0.3, -0.42, 0, 0.6, 0.84, 0.02, NOITE); const n = cil(g, 0, 0, 0, 0.08, 0.01, LIMA); n.rotation.x = Math.PI / 2; n.position.set(-0.06, -0.12, 0.03); caixa(g, 0.0, -0.12, 0.025, 0.03, 0.34, 0.01, LIMA); },
      versiculo: g => { caixa(g, -0.4, -0.45, 0, 0.8, 0.9, 0.04, MADEIRA); caixa(g, -0.34, -0.39, 0.02, 0.68, 0.78, 0.03, '#FBF8F4'); for (const [y, w] of [[0.05, 0.5], [-0.07, 0.42], [-0.19, 0.5], [-0.3, 0.26]]) caixa(g, -w / 2, y, 0.05, w, 0.025, 0.01, AMEIXA_SUAVE); caixa(g, -0.015, 0.14, 0.05, 0.03, 0.16, 0.01, PINK); caixa(g, -0.06, 0.2, 0.05, 0.12, 0.03, 0.01, PINK); },
      paisagem: g => { caixa(g, -0.55, -0.38, 0, 1.1, 0.76, 0.04, BRANCO); caixa(g, -0.49, -0.32, 0.02, 0.98, 0.64, 0.03, '#FFE3EF'); caixa(g, -0.49, -0.32, 0.04, 0.98, 0.22, 0.02, '#88B862'); const m = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 3), mat('#A9CF86')); m.position.set(-0.15, -0.04, 0.05); m.scale.z = 0.05; g.add(m); const s = cil(g, 0, 0, 0, 0.07, 0.01, '#FFD27A'); s.rotation.x = Math.PI / 2; s.position.set(0.25, 0.12, 0.05); },
      luzinhas: g => { for (let i = 0; i <= 10; i++) { const x = -0.9 + i * 0.18, y = 0.15 - 0.2 * Math.sin((i / 10) * Math.PI); const l = bola(g, x, y, 0.04, 0.035, ['#FFD27A', PINK, LIMA][i % 3]); (l.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(['#FFD27A', PINK, LIMA][i % 3]); (l.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6; } },
      prateleira: g => { caixa(g, -0.45, -0.1, 0, 0.9, 0.04, 0.22, MADEIRA); for (const x of [-0.25, 0.22]) { cil(g, x, -0.06, 0.11, 0.06, 0.12, PINK); bola(g, x, 0.12, 0.11, 0.09, '#93C06C'); } },
      planta: g => { cil(g, 0, 0, 0, 0.2, 0.38, PINK, 0.24); bola(g, 0, 0.62, 0, 0.26, '#93C06C'); bola(g, 0.12, 0.85, 0.05, 0.18, '#A9CF86'); bola(g, -0.12, 0.8, -0.05, 0.17, '#88B862'); },
      vaso: g => { cil(g, 0, 0, 0, 0.13, 0.42, '#FBF8F4', 0.1); for (const [x, y, c] of [[0, 0.62, PINK], [-0.1, 0.56, ROSA], [0.1, 0.58, '#E79BB9']] as const) { cil(g, x, 0.42, 0, 0.01, y - 0.42, '#88B862'); bola(g, x, y, 0, 0.06, c); } },
      cacto: g => { cil(g, 0, 0, 0, 0.14, 0.22, MADEIRA_CLARA); cil(g, 0, 0.22, 0, 0.08, 0.45, '#88B862'); bola(g, 0, 0.67, 0, 0.08, '#88B862'); cil(g, 0.13, 0.38, 0, 0.045, 0.18, '#93C06C'); bola(g, 0, 0.75, 0, 0.03, PINK); },
      puff: g => { cil(g, 0, 0, 0, 0.3, 0.36, '#E79BB9'); cil(g, 0, 0.36, 0, 0.27, 0.03, ROSA); },
      cesto: g => { cil(g, 0, 0, 0, 0.28, 0.36, MADEIRA, 0.3); cil(g, 0, 0.36, 0, 0.22, 0.12, ROSA); },
      estantinha: g => { caixa(g, -0.3, 0, -0.15, 0.6, 0.9, 0.3, MADEIRA); for (const [y, c] of [[0.08, PINK], [0.5, '#42124C']] as const) caixa(g, -0.25, y, -0.12, 0.5, 0.3, 0.26, c); },
      luminaria: g => { cil(g, 0, 0, 0, 0.18, 0.04, NOITE); cil(g, 0, 0.04, 0, 0.02, 1.45, NOITE); const s = cil(g, 0, 1.45, 0, 0.26, 0.3, PINK, 0.16); (s.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#5A0024'); },
      teclado: g => { for (const x of [-0.4, 0.36]) caixa(g, x, 0, -0.1, 0.04, 0.72, 0.2, NOITE); caixa(g, -0.5, 0.72, -0.18, 1.0, 0.08, 0.34, NOITE); caixa(g, -0.46, 0.8, 0.0, 0.92, 0.01, 0.14, BRANCO); },
      tapete: g => { caixa(g, -0.95, 0, -0.75, 1.9, 0.012, 1.5, '#E79BB9', false); caixa(g, -0.75, 0.002, -0.55, 1.5, 0.012, 1.1, ROSA, false); },
      tapeteRedondo: g => { cil(g, 0, 0, 0, 0.9, 0.012, '#C9B6D9').castShadow = false; cil(g, 0, 0.002, 0, 0.6, 0.012, NEVOA).castShadow = false; },
      tapeteListrado: g => { caixa(g, -0.8, 0, -0.6, 1.6, 0.012, 1.2, NEVOA, false); for (let i = 0; i < 4; i++) caixa(g, -0.8, 0.002, -0.5 + i * 0.3, 1.6, 0.012, 0.14, i % 2 ? '#C7F28A' : '#F2B8CF', false); },
      girassol: g => {
        cil(g, 0, 0, 0, 0.15, 0.34, '#C98B4A', 0.19);
        cil(g, 0, 0.34, 0, 0.02, 0.48, '#6FA84A');
        for (const s of [-1, 1]) { const f = bola(g, s * 0.09, 0.54 + s * 0.04, 0.02, 0.07, '#88B862', 0.4); f.rotation.z = s * 0.4; }
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          const pt = bola(g, Math.cos(a) * 0.11, 0.84 + Math.sin(a) * 0.11, 0.03, 0.048, '#F5B700', 0.7);
          pt.scale.z = 0.35;
        }
        const centroF = bola(g, 0, 0.84, 0.045, 0.07, '#5A3420');
        centroF.scale.z = 0.45;
      },
      bau: g => {
        caixa(g, -0.34, 0, -0.2, 0.68, 0.32, 0.4, '#A97850');
        const tampa = cil(g, 0, 0.32, 0, 0.2, 0.68, MADEIRA, 0.2, 16);
        tampa.rotation.z = Math.PI / 2;
        tampa.position.set(0, 0.32, 0);
        tampa.scale.set(0.6, 1, 1);
        for (const x of [-0.24, 0.2]) caixa(g, x, 0, -0.21, 0.05, 0.43, 0.42, '#6B4E36');
        caixa(g, -0.04, 0.24, 0.19, 0.08, 0.12, 0.03, '#E8B83A');
      },
      cadeiraBalanco: g => {
        for (const x of [-0.24, 0.2]) {
          caixa(g, x, 0.02, -0.34, 0.04, 0.04, 0.68, '#8A5A3C').rotation.x = 0.04;
          for (const z of [-0.2, 0.18]) caixa(g, x, 0.04, z, 0.04, 0.32, 0.04, MADEIRA);
          caixa(g, x, 0.52, -0.22, 0.05, 0.04, 0.44, MADEIRA);
          caixa(g, x, 0.36, 0.16, 0.04, 0.16, 0.04, MADEIRA);
        }
        caixa(g, -0.24, 0.35, -0.22, 0.48, 0.05, 0.44, MADEIRA);
        caixa(g, -0.2, 0.4, -0.18, 0.4, 0.05, 0.36, ROSA);
        caixa(g, -0.24, 0.4, -0.24, 0.48, 0.48, 0.04, MADEIRA);
      },
      arvoreNatal: g => {
        cil(g, 0, 0, 0, 0.16, 0.24, '#8A5A3C', 0.19);
        cil(g, 0, 0.24, 0, 0.06, 0.2, '#6B4E36');
        for (const [y, r, h, c] of [[0.36, 0.44, 0.55, '#4E8C45'], [0.68, 0.35, 0.5, '#5FA354'], [0.98, 0.25, 0.44, '#73B865']] as const) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat(c));
          cone.position.set(0, y + h / 2, 0);
          cone.castShadow = true;
          g.add(cone);
        }
        const est = bola(g, 0, 1.48, 0, 0.075, '#F5B700');
        (est.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#7A5600');
        for (let k = 0; k < 9; k++) {
          const a = k * 1.9, y = 0.5 + k * 0.095, r = 0.36 - k * 0.025;
          const corB = [PINK, '#F5B700', '#E63B2E'][k % 3];
          const enfeite = bola(g, Math.cos(a) * r, y, Math.sin(a) * r, 0.038, corB);
          (enfeite.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(corB);
          (enfeite.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
        }
      },
      neon: g => {
        caixa(g, -0.58, -0.24, 0, 1.16, 0.48, 0.03, NOITE);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.4), new THREE.MeshStandardMaterial({
          color: BRANCO, emissive: new THREE.Color(PINK), emissiveMap: txNeon, emissiveIntensity: 1.4, roughness: 0.35,
        }));
        m.position.set(0, 0, 0.034);
        g.add(m);
      },
      pomba: g => {
        caixa(g, -0.44, -0.38, 0, 0.88, 0.76, 0.04, BRANCO);
        caixa(g, -0.38, -0.32, 0.02, 0.76, 0.64, 0.025, '#CFEAFF');
        const corpo = bola(g, -0.02, -0.04, 0.055, 0.13, BRANCO, 0.75); corpo.scale.z = 0.25;
        const cab = bola(g, 0.11, 0.04, 0.058, 0.065, BRANCO); cab.scale.z = 0.3;
        const asa1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 4), mat('#F7FAFF'));
        asa1.position.set(-0.08, 0.11, 0.06); asa1.rotation.z = 0.45; asa1.scale.z = 0.15; g.add(asa1);
        caixa(g, 0.15, -0.02, 0.06, 0.14, 0.02, 0.01, '#6FA84A').rotation.z = -0.35;
      },
      tv: g => {
        caixa(g, -0.68, -0.4, 0, 1.36, 0.8, 0.05, '#1E1624');
        const telaTv = caixa(g, -0.63, -0.35, 0.035, 1.26, 0.7, 0.02, '#62B2EC');
        (telaTv.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#193A58');
        caixa(g, -0.63, -0.35, 0.056, 1.26, 0.22, 0.008, '#7EC26B');
        const solTv = cil(g, 0, 0, 0, 0.08, 0.008, '#FFE27A');
        solTv.rotation.x = Math.PI / 2; solTv.position.set(0.36, 0.16, 0.06);
      },
      calendario: g => {
        caixa(g, -0.32, -0.38, 0, 0.64, 0.76, 0.025, BRANCO);
        caixa(g, -0.32, 0.2, 0.01, 0.64, 0.18, 0.02, PINK);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          caixa(g, -0.26 + c * 0.14, -0.3 + r * 0.15, 0.025, 0.09, 0.09, 0.01, r === 1 && c === 2 ? LIMA : '#EADFD3');
        }
      },
      tapeteFelpudo: g => {
        for (const [dx, dz, r] of [[0, 0, 0.78], [-0.42, 0.06, 0.52], [0.42, -0.06, 0.52], [0.06, 0.38, 0.5], [-0.08, -0.38, 0.5]]) {
          cil(g, dx, 0, dz, r, 0.022, '#FAF4EE').castShadow = false;
        }
        cil(g, 0, 0.004, 0, 0.5, 0.022, ROSA).castShadow = false;
      },
      tapeteColorido: g => {
        caixa(g, -0.9, 0, -0.68, 1.8, 0.012, 1.36, NEVOA, false);
        caixa(g, -0.8, 0.002, -0.58, 0.75, 0.012, 0.53, '#F2B8CF', false);
        caixa(g, 0.05, 0.002, -0.58, 0.75, 0.012, 0.53, '#FFD27A', false);
        caixa(g, -0.8, 0.002, 0.05, 0.75, 0.012, 0.53, '#9ED8F0', false);
        caixa(g, 0.05, 0.002, 0.05, 0.75, 0.012, 0.53, '#C7F28A', false);
      },
      quadroJosue: g => {
        caixa(g, -0.45, -0.38, 0, 0.9, 0.76, 0.04, '#8A5A3C');
        caixa(g, -0.39, -0.32, 0.02, 0.78, 0.64, 0.03, '#FAF6F0');
        caixa(g, -0.02, -0.18, 0.05, 0.04, 0.34, 0.015, '#D4AF37');
        caixa(g, -0.12, 0.02, 0.05, 0.24, 0.04, 0.015, '#D4AF37');
      },
      mapaPaulo: g => {
        caixa(g, -0.52, -0.38, 0, 1.04, 0.76, 0.04, '#6B4226');
        caixa(g, -0.46, -0.32, 0.02, 0.92, 0.64, 0.03, '#A7D8F0');
        caixa(g, -0.4, -0.05, 0.045, 0.35, 0.22, 0.015, '#E8D4B4');
        caixa(g, 0.05, -0.22, 0.045, 0.32, 0.28, 0.015, '#E8D4B4');
      },
      painelBotanico: g => {
        caixa(g, -0.48, -0.36, 0, 0.96, 0.72, 0.04, MADEIRA);
        for (const dx of [-0.22, 0, 0.22]) {
          bola(g, dx, -0.05, 0.06, 0.14, '#6FA84A', 0.8);
          bola(g, dx + 0.04, -0.18, 0.06, 0.1, '#88B862', 0.9);
        }
      },
      quadroSalmo23: g => {
        caixa(g, -0.5, -0.38, 0, 1.0, 0.76, 0.04, '#C89B72');
        caixa(g, -0.44, -0.32, 0.02, 0.88, 0.64, 0.03, '#E0F2FE');
        caixa(g, -0.44, -0.32, 0.04, 0.88, 0.24, 0.015, '#88B862');
        caixa(g, -0.08, -0.32, 0.05, 0.16, 0.24, 0.015, '#4BA7CC');
      },
      poltronaCostela: g => {
        for (const [dx, dz] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) cil(g, dx, 0, dz, 0.025, 0.24, '#6B4226');
        caixa(g, -0.32, 0.22, -0.28, 0.64, 0.06, 0.56, '#8A5A3C');
        caixa(g, -0.28, 0.28, -0.24, 0.56, 0.12, 0.48, '#F5EFE6');
        caixa(g, -0.3, 0.36, -0.28, 0.6, 0.44, 0.1, '#8A5A3C');
        caixa(g, -0.26, 0.38, -0.2, 0.52, 0.38, 0.08, '#F5EFE6');
      },
      lustreNordico: g => {
        cil(g, 0, 0, 0, 0.18, 0.04, '#8A5A3C');
        cil(g, 0, 0.04, 0, 0.025, 1.38, '#C89B72');
        const cup = cil(g, 0, 1.4, 0, 0.28, 0.26, '#FAF6F0', 0.18);
        (cup.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#FFE09E');
        (cup.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
      },
      estanteArvore: g => {
        caixa(g, -0.24, 0, -0.14, 0.48, 0.05, 0.28, '#8A5A3C');
        caixa(g, -0.05, 0.05, -0.12, 0.1, 1.15, 0.24, '#8A5A3C');
        for (const [y, dx, corL] of [[0.28, -0.22, PINK], [0.55, 0.04, '#4BA7CC'], [0.82, -0.22, LIMA], [1.05, 0.02, '#F5B700']] as const) {
          caixa(g, dx, y, -0.11, 0.22, 0.04, 0.22, '#A97850');
          caixa(g, dx + 0.04, y + 0.04, -0.08, 0.12, 0.16, 0.16, corL);
        }
      },
      tapeteNordico: g => {
        caixa(g, -0.92, 0, -0.7, 1.84, 0.012, 1.4, '#FAF6F0', false);
        caixa(g, -0.82, 0.002, -0.6, 1.64, 0.012, 1.2, '#EAE0D5', false);
        const los = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.34, 4), mat('#8A5A3C'));
        los.rotation.x = -Math.PI / 2;
        los.position.set(0, 0.016, 0);
        g.add(los);
      },
      plantasVivas: g => {
        for (const [dx, dz, h, corV, corF] of [[-0.18, 0.04, 0.32, '#C86D51', '#5CA84D'], [0.16, -0.05, 0.24, '#FAF6F0', '#7FB65A'], [0, 0.14, 0.18, '#D4AF37', '#88B862']] as const) {
          cil(g, dx, 0, dz, 0.11, h, corV, 0.14);
          bola(g, dx, h + 0.16, dz, 0.16, corF);
        }
      },
      poteGratidao: g => {
        cil(g, 0, 0, 0, 0.22, 0.42, '#C89B72', 0.26);
        const pote = cil(g, 0, 0.42, 0, 0.12, 0.24, '#DDF0FF');
        (pote.material as THREE.MeshStandardMaterial).transparent = true;
        (pote.material as THREE.MeshStandardMaterial).opacity = 0.72;
        cil(g, 0, 0.66, 0, 0.1, 0.04, '#8A5A3C');
        for (const [dx, dy, c] of [[-0.04, 0.48, PINK], [0.04, 0.52, '#FFD27A'], [0, 0.56, LIMA]] as const) {
          bola(g, dx, dy, 0, 0.04, c);
        }
      },
    };
    const originais = new Map<string,{obj:Obj;centro:THREE.Vector3;caixa:THREE.Box3;ponto:[number,number];acoes:Acao[]}>();
    // The duck belongs to the bath, so it follows the same transform.
    const banheiraObj=objetos.find(o=>o.id==='banheira'), patoObj=objetos.find(o=>o.id==='patinho');
    if(banheiraObj&&patoObj) banheiraObj.grupo.attach(patoObj.grupo);
    for(const obj of objetos.filter(o=>!!MOVEIS_ORIGINAIS[o.id])) {
      const caixa=new THREE.Box3().setFromObject(obj.grupo), centro=caixa.getCenter(new THREE.Vector3());centro.y=0;
      const antigo=obj.grupo, pai=antigo.parent!; const pivot=new THREE.Group();pai.add(pivot);pivot.position.copy(centro);pivot.attach(antigo);
      pivot.userData.objeto=obj.id;obj.grupo=pivot;
      originais.set(obj.id,{obj,centro,caixa:caixa.clone().translate(centro.clone().negate()),ponto:[...obj.ponto],acoes:obj.acoes.map(a=>({...a}))});
    }
    const transformarPonto=(id:string,ponto:[number,number]):[number,number]=>{
      const o=originais.get(id);if(!o)return ponto;
      const v=new THREE.Vector3(ponto[0]-o.centro.x,0,ponto[1]-o.centro.z).applyAxisAngle(new THREE.Vector3(0,1,0),o.obj.grupo.rotation.y).add(o.obj.grupo.position);return [v.x,v.z];
    };
    const transformarAcao=<T extends {lugar?:[number,number,number];frente?:[number,number];deitar?:[number,number]}>(id:string,a:T):T=>{
      const o=originais.get(id);if(!o)return a;const b={...a};
      if(a.lugar){const [x,z]=transformarPonto(id,[a.lugar[0],a.lugar[2]]);b.lugar=[x,a.lugar[1],z];}
      for(const k of ['frente','deitar'] as const) if(a[k]){const v=new THREE.Vector3(a[k]![0],0,a[k]![1]).applyAxisAngle(new THREE.Vector3(0,1,0),o.obj.grupo.rotation.y);b[k]=[v.x,v.z];}
      return b;
    };
    let originaisInicializados=false;
    type ItemCena = { dados: Mobilia; grupo: THREE.Group; paredeRef: ParedeMesh | null; idx: number };
    let itensCena: ItemCena[] = [];
    let selIdx: number | null = null;
    const limparGrupo = (g: THREE.Object3D) => {
      g.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const materiais = Array.isArray(m.material) ? m.material : [m.material];
          materiais.forEach(mt => { Object.values(mt).forEach(v => { if (v instanceof THREE.Texture) v.dispose(); }); mt.dispose(); });
        }
      });
      g.clear();
    };

    const medidasMoveis = new Map<string, THREE.Box3>();
    const areaMovel = (m: Pick<Mobilia,'item'|'x'|'z'|'giro'>): [number,number,number,number] => {
      let caixaLocal=idOriginal(m.item)?originais.get(idOriginal(m.item)!)?.caixa:medidasMoveis.get(m.item);
      if(!caixaLocal){
        const g=new THREE.Group(); MONTAR[m.item]?.(g);
        caixaLocal=new THREE.Box3().setFromObject(g);
        if(caixaLocal.isEmpty()) caixaLocal.set(new THREE.Vector3(-.25,0,-.25),new THREE.Vector3(.25,.5,.25));
        medidasMoveis.set(m.item,caixaLocal); limparGrupo(g);
      }
      const b=caixaLocal.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(m.giro??0)).translate(new THREE.Vector3(m.x,0,m.z));
      return [b.min.x,b.min.z,b.max.x,b.max.z];
    };
    const sobrepoe = (a: number[], b: number[], folga=.05) => a[0]<b[2]+folga && a[2]>b[0]-folga && a[1]<b[3]+folga && a[3]>b[1]-folga;
    const cabeMovel = (m: Pick<Mobilia,'item'|'x'|'z'|'giro'>, ignorar: number) => {
      const area=areaMovel(m);
      const fixos=[...bloqueios,...bloqueiosExtra.filter(b=>b.quando()).map(b=>b.area),...PASSAGENS.map(areaPassagem)];
      if(fixos.some(b=>sobrepoe(area,b))) return false;
      if(p.current.mobilia.some((outro,k)=>k!==ignorar && MOVEIS[outro.item]?.tipo==='chao' && sobrepoe(area,areaMovel(outro)))) return false;
      if(muros.some(pa=>!pa.y0&&sobrepoe(area,[Math.min(pa.x0,pa.x1)-.08,Math.min(pa.z0,pa.z1)-.08,Math.max(pa.x0,pa.x1)+.08,Math.max(pa.z0,pa.z1)+.08]))) return false;
      return true;
    };

    const montarDecoracao = () => {
      limparGrupo(decoracao);
      itensCena = [];
      p.current.mobilia.forEach((m, idx) => {
        const original=idOriginal(m.item);
        if(original){
          const o=originais.get(original);if(!o)return;
          o.obj.grupo.position.set(m.x,0,m.z);o.obj.grupo.rotation.y=m.giro??0;o.obj.grupo.visible=true;o.obj.grupo.userData.mobiliaIdx=idx;
          o.obj.ponto=transformarPonto(original,o.ponto);o.obj.acoes=o.acoes.map(a=>transformarAcao(original==='tv'&&a.lugar?'sofa':original,a));
          itensCena.push({dados:m,grupo:o.obj.grupo,paredeRef:null,idx});return;
        }
        const montar = MONTAR[m.item];
        if (!montar || !possuiItem(m.item)) return;
        const g = new THREE.Group();
        montar(g);
        g.position.set(m.x, m.y ?? 0, m.z);
        g.rotation.y = m.giro ?? 0;
        g.userData.mobiliaIdx = idx;
        g.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true; });
        decoracao.add(g);
        itensCena.push({ dados: m, grupo: g, paredeRef: m.parede ? paredeMaisPerto(m.x, m.z) : null, idx });
      });
      if (selIdx !== null && selIdx >= p.current.mobilia.length) {
        selIdx = null;
        setSel(null);
      }
    };
    montarDecoracao();

    /* Caminhos: grade de 0,25 no terreno todo, com paredes, móveis, árvores e arbustos bloqueando */
    const CEL = 0.25, OX = -6.2, OZ = -6.6, NX = 102, NZ = 78;
    const livre = new Uint8Array(NX * NZ);
    const centro = (i: number, j: number): [number, number] => [OX + (i + 0.5) * CEL, OZ + (j + 0.5) * CEL];
    let muros: Parede[] = PAREDES;
    const pertoDeParede = (x: number, z: number) => muros.some(pa => {
      if (pa.y0) return false;
      if (pa.z0 === pa.z1) return Math.abs(z - pa.z0) < 0.26 && x > Math.min(pa.x0, pa.x1) - 0.2 && x < Math.max(pa.x0, pa.x1) + 0.2;
      return Math.abs(x - pa.x0) < 0.26 && z > Math.min(pa.z0, pa.z1) - 0.2 && z < Math.max(pa.z0, pa.z1) + 0.2;
    });
    for (const [x, z] of [[-4.5, -2.0], [17.6, -5.4], [-4.8, 10.6], [13.7, 10.4]]) bloquear(x - 0.25, z - 0.25, x + 0.25, z + 0.25);
    for (const [x, z] of [[4.5, 10.6], [6, 10.8], [8.5, 10.6], [10.5, 10.8], [12.5, 10.6], [0.6, 10.7], [-5.8, 3], [16.2, 10.5]]) bloquear(x - 0.4, z - 0.4, x + 0.4, z + 0.4);
    const calcularGrade = () => {
      muros = [...PAREDES, ...EXTRAS.filter(e => tem(e.item)).flatMap(e => PAREDES_EXTRAS[e.id])];
      const moveisChao: [number, number, number, number][] = p.current.mobilia
        .filter(m => MOVEIS[m.item]?.tipo === 'chao')
        .map(m => areaMovel(m));
      const ativos = [...bloqueios, ...bloqueiosExtra.filter(b => b.quando()).map(b => b.area), ...moveisChao];
      for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
        const [x, z] = centro(i, j);
        const bloq = ativos.some(([x0, z0, x1, z1]) => x > x0 - 0.12 && x < x1 + 0.12 && z > z0 - 0.12 && z < z1 + 0.12);
        livre[j * NX + i] = !bloq && !pertoDeParede(x, z) ? 1 : 0;
      }
    };
    calcularGrade();
    const atravessaParede = (ax: number, az: number, bx: number, bz: number) => muros.some(pa => {
      if (pa.y0) return false;
      const R = 0.16;
      if (pa.z0 === pa.z1) {
        const xMin = Math.min(pa.x0, pa.x1), xMax = Math.max(pa.x0, pa.x1);
        const zWall = pa.z0;
        if ((az > zWall + R && bz > zWall + R) || (az < zWall - R && bz < zWall - R)) return false;
        const dz = bz - az;
        if (Math.abs(dz) > 1e-5) {
          const t = (zWall - az) / dz;
          if (t >= -0.05 && t <= 1.05) {
            const x = ax + (bx - ax) * t;
            if (x >= xMin - R && x <= xMax + R) return true;
          }
        }
        const minX = Math.min(ax, bx), maxX = Math.max(ax, bx);
        if (maxX >= xMin - R && minX <= xMax + R && Math.min(az, bz) <= zWall + R && Math.max(az, bz) >= zWall - R) {
          return true;
        }
        return false;
      }
      if (pa.x0 === pa.x1) {
        const zMin = Math.min(pa.z0, pa.z1), zMax = Math.max(pa.z0, pa.z1);
        const xWall = pa.x0;
        if ((ax > xWall + R && bx > xWall + R) || (ax < xWall - R && bx < xWall - R)) return false;
        const dx = bx - ax;
        if (Math.abs(dx) > 1e-5) {
          const t = (xWall - ax) / dx;
          if (t >= -0.05 && t <= 1.05) {
            const z = az + (bz - az) * t;
            if (z >= zMin - R && z <= zMax + R) return true;
          }
        }
        const minZ = Math.min(az, bz), maxZ = Math.max(az, bz);
        if (maxZ >= zMin - R && minZ <= zMax + R && Math.min(ax, bx) <= xWall + R && Math.max(ax, bx) >= xWall - R) {
          return true;
        }
        return false;
      }
      return false;
    });
    const celula = (x: number, z: number) => [Math.max(0, Math.min(NX - 1, Math.floor((x - OX) / CEL))), Math.max(0, Math.min(NZ - 1, Math.floor((z - OZ) / CEL)))];
    const maisPerto = (x: number, z: number) => {
      const [ci, cj] = celula(x, z);
      let melhor = -1, dist = Infinity;
      for (let i = Math.max(0, ci - 6); i < Math.min(NX, ci + 7); i++) for (let j = Math.max(0, cj - 6); j < Math.min(NZ, cj + 7); j++) {
        if (!livre[j * NX + i]) continue;
        const [cx, cz] = centro(i, j), dd = (cx - x) ** 2 + (cz - z) ** 2;
        if (dd < dist && !atravessaParede(x, z, cx, cz)) { dist = dd; melhor = j * NX + i; }
      }
      return melhor;
    };
    const linhaLivre = (a: THREE.Vector3, b: THREE.Vector3) => {
      if (atravessaParede(a.x, a.z, b.x, b.z)) return false;
      const n = Math.ceil(a.distanceTo(b) / 0.10);
      for (let k = 1; k < n; k++) {
        const px = a.x + ((b.x - a.x) * k) / n, pz = a.z + ((b.z - a.z) * k) / n;
        const [i, j] = celula(px, pz);
        if (!livre[j * NX + i] || pertoDeParede(px, pz)) return false;
      }
      return true;
    };
    // ponytail: busca em largura na grade do terreno (6.048 células); trocar por A* se o terreno crescer muito
    const caminho = (de: THREE.Vector3, para: [number, number]): THREE.Vector3[] | null => {
      const ini = maisPerto(de.x, de.z), fim = maisPerto(para[0], para[1]);
      if (ini < 0 || fim < 0) return null;
      const veio = new Int32Array(NX * NZ).fill(-1);
      veio[ini] = ini;
      const fila = [ini];
      for (let q = 0; q < fila.length && veio[fim] < 0; q++) {
        const c = fila[q], i = c % NX, j = (c - i) / NX, [cx, cz] = centro(i, j);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
          const n = nj * NX + ni;
          if (veio[n] >= 0 || !livre[n]) continue;
          if (di && dj && (!livre[j * NX + ni] || !livre[nj * NX + i])) continue;
          const [nx, nz] = centro(ni, nj);
          if (atravessaParede(cx, cz, nx, nz)) continue;
          veio[n] = c;
          fila.push(n);
        }
      }
      if (veio[fim] < 0) return null;
      const celulas: THREE.Vector3[] = [];
      for (let c = fim; c !== ini; c = veio[c]) { const [x, z] = centro(c % NX, Math.floor(c / NX)); celulas.unshift(new THREE.Vector3(x, 0, z)); }
      const destino=new THREE.Vector3(para[0],0,para[1]);
      if(linhaLivre(celulas[celulas.length-1]??de,destino))celulas.push(destino);
      // Atalhos em linha reta quando não há parede nem móvel no meio
      const suave: THREE.Vector3[] = [];
      let atual = de.clone();
      for (let k = 0; k < celulas.length; k++) {
        let mais = k;
        while (mais + 1 < celulas.length && linhaLivre(atual, celulas[mais + 1])) mais++;
        suave.push(celulas[mais]);
        atual = celulas[mais];
        k = mais;
      }
      return suave;
    };

    /* Personagem: boneco 3D feito no Blender + chama do Espírito (línguas de fogo de Atos 2) acima da cabeça */
    let modelo: Boneco | null = null;
    const pivo = new THREE.Group();
    cena.add(pivo);
    // Perfil de gota: base redonda e ponta fina, girado em volta do eixo Y
    const perfilChama = (raio: number, altura: number) => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        pts.push(new THREE.Vector2(raio * Math.sqrt(Math.sin(Math.PI * Math.pow(u, 0.62))) * Math.pow(1 - u, 0.55), u * altura));
      }
      return new THREE.LatheGeometry(pts, 20);
    };
    const matChama = new THREE.MeshStandardMaterial({ color: '#FFB21E', emissive: '#FF7A00', emissiveIntensity: 0.75, roughness: 0.35, transparent: true, opacity: 0.8, depthWrite: false });
    const matMiolo = new THREE.MeshBasicMaterial({ color: '#FFF3B0' });
    const chama = new THREE.Group();
    const chamaFora = new THREE.Mesh(perfilChama(0.085, 0.3), matChama);
    const chamaMiolo = new THREE.Mesh(perfilChama(0.045, 0.17), matMiolo);
    chamaMiolo.position.set(0, 0.012, 0);
    chama.add(chamaFora, chamaMiolo);
    cena.add(chama);
    const atualizarChama = () => {
      const h = p.current.humor;
      if (h === 'radiante') { matChama.color.set('#FFC21E'); matChama.emissive.set('#FF8A00'); matChama.emissiveIntensity = 0.95; }
      else if (h === 'abatido') { matChama.color.set('#E9573A'); matChama.emissive.set('#8E1E10'); matChama.emissiveIntensity = 0.45; }
      else { matChama.color.set('#FFAA2B'); matChama.emissive.set('#E06A00'); matChama.emissiveIntensity = 0.7; }
    };
    atualizarChama();
    criarBoneco().then(b => {
      if (!vivo) { b.descartar(); return; }
      modelo = b;
      pivo.add(b.objeto);
      b.vestir(p.current.look, p.current.forma, p.current.humor);
      b.animar('parado');
    }).catch(() => { /* sem o modelo a casa continua funcionando */ });
    const boneco = {
      pos: new THREE.Vector3(3.5, 0, 6.8),
      rota: [] as THREE.Vector3[],
      depois: null as null | (() => void),
      giro: 0,
      acao: null as null | { pose: Pose; texto?: string; lugar?: THREE.Vector3; deitar?: [number, number]; frente?: [number, number]; fones?: boolean; fechados?: boolean; item?: ItemMao; ate: number; voltar: THREE.Vector3 },
      paradoDesde: 0,
    };
    const andarAte = (alvo: [number, number], depois?: () => void) => {
      boneco.acao = null;
      boneco.depois = null;
      const r = caminho(boneco.pos, alvo);
      if (!r || r.length === 0) {
        const d = Math.hypot(boneco.pos.x - alvo[0], boneco.pos.z - alvo[1]);
        if (d < 0.35 && !atravessaParede(boneco.pos.x, boneco.pos.z, alvo[0], alvo[1])) {
          boneco.pos.set(alvo[0], 0, alvo[1]);
          boneco.rota = [];
          boneco.paradoDesde = performance.now();
          depois?.();
        } else {
          boneco.rota = [];
          boneco.paradoDesde = performance.now();
        }
        return;
      }
      boneco.rota = r;
      boneco.depois = depois ?? null;
      boneco.paradoDesde = 0;
    };
    const fazer = (a: { pose: Pose; texto?: string; lugar?: [number, number, number]; deitar?: [number, number]; frente?: [number, number]; fones?: boolean; fechados?: boolean; item?: ItemMao }, segundos = 9) => {
      boneco.rota = [];
      boneco.acao = {
        ...a,
        lugar: a.lugar ? new THREE.Vector3(...a.lugar) : undefined,
        ate: performance.now() + segundos * 1000,
        voltar: boneco.pos.clone(),
      };
    };

    type Roteiro = {
      id: string;
      comodo: string;
      ponto: [number, number];
      quando?: () => boolean;
      acao: {
        pose: Pose;
        texto: string;
        lugar?: [number, number, number];
        deitar?: [number, number];
        frente?: [number, number];
        fones?: boolean;
        fechados?: boolean;
        item?: ItemMao;
      };
      tempo?: number;
    };

    // Assentos conferidos com a altura de cada móvel (quadril ≈ assento + 0,09; o quadril do modelo fica a 0,6 do chão)
    const SOFA = { lugar: [0.94, -0.09, 6.7] as [number, number, number], frente: [1, 0] as [number, number] };
    const POLTRONA = { lugar: [8.9, -0.11, 3.4] as [number, number, number], frente: [1, 0] as [number, number] };
    const MESA = { lugar: [10.84, -0.09, 2.15] as [number, number, number], frente: [1, 0] as [number, number] };
    const JANTAR = { lugar: [9.2, -0.11, 7.5] as [number, number, number], frente: [0, -1] as [number, number] };
    const BEIRA_CAMA = { lugar: [2.8, 0.06, 1.75] as [number, number, number], frente: [1, 0] as [number, number] };
    const BANCO = { lugar: [5.5, -0.11, -2.74] as [number, number, number], frente: [0, 1] as [number, number] };
    const ALMOFADA = { lugar: [4.0, 0.16, 1.55] as [number, number, number], frente: [0, 1] as [number, number] };

    // Como cada atividade registrada fica quando é feita num móvel
    let ultimoObjeto: { id: string; ponto: [number, number] } | null = null;
    const ESTILO_ATIVIDADE: Record<string, { pose?: Pose; lugar?: [number, number, number]; frente?: [number, number]; item?: ItemMao }> = {
      poltrona: { pose: 'sentado', ...POLTRONA, item: 'livro' },
      mesa: { pose: 'sentado', ...MESA, item: 'livro' },
      jantar: { pose: 'sentado', ...JANTAR },
      banco: { pose: 'sentado', ...BANCO },
      almofada: { ...ALMOFADA },
      tv: { pose: 'sentado', ...SOFA },
      biblia: { pose: 'livro', frente: [0, 1], item: 'livro' },
      estante: { pose: 'livro', frente: [0, 1], item: 'livro' },
      violao: { pose: 'mexer', item: 'violao', frente: [-1, 0] },
      'teclado-estudio': { pose: 'mexer', frente: [0, -1] },
      bateria: { pose: 'sentado', lugar: [17.1, -0.09, 1.98], frente: [0, -1], item: 'baquetas' },
      microfone: { pose: 'cima', item: 'microfone', frente: [0, 1] },
      halteres: { pose: 'correr', item: 'halteres', frente: [0, 1] },
      esteira: { pose: 'andar', lugar: [16.1, 0.17, 5.42], frente: [1, 0] },
      bicicleta: { pose: 'sentado', lugar: [14.4, 0.15, 5.98], frente: [0, -1] },
      fogao: { pose: 'mexer', item: 'frigideira', frente: [1, 0] },
      espreguicadeira: { pose: 'sentado', lugar: [-3.6, 0.08, 7.2], frente: [0, -1] },
      piscina_nadar: { pose: 'andar', lugar: [-2.9, -0.32, 4.2], frente: [-1, 0] },
      bistro_piscina: { pose: 'mexer', item: 'coco', frente: [0, -1] },
      ducha_piscina: { pose: 'cima', frente: [0, -1] },
      portao: { pose: 'cima', frente: [0, 1] },
      bancada_oficina: { pose: 'mexer', frente: [0, 1] },
      bicicleta_passeio: { pose: 'correr', frente: [-1, 0] },
      mesa_varanda: { pose: 'sentado', lugar: [9.5, -0.09, -2.1], frente: [0, -1] },
      cafeteira_varanda: { pose: 'mexer', frente: [1, 0] },
    };

    const ROTEIROS: Roteiro[] = [
      // Sala
      { id: 'tv_culto', comodo: 'sala', ponto: [1.65, 6.7], acao: { pose: 'sentado', texto: 'Assistindo o culto online 📺', ...SOFA }, tempo: 14 },
      { id: 'sofa_ler', comodo: 'sala', ponto: [1.65, 6.7], acao: { pose: 'sentado', texto: 'Lendo um devocional no sofá 📖', ...SOFA, item: 'livro' }, tempo: 13 },
      { id: 'sala_louvor', comodo: 'sala', ponto: [4.7, 5.55], acao: { pose: 'cima', texto: 'Louvando com a caixa de som 🎶', frente: [0, 1], fones: true }, tempo: 10 },
      { id: 'sala_peixe', comodo: 'sala', ponto: [1.55, 5.3], acao: { pose: 'baixo', texto: 'Observando os peixinhos 🐠', frente: [-1, -0.5] }, tempo: 8 },
      { id: 'sala_violao', comodo: 'sala', ponto: [6.0, 7.3], acao: { pose: 'mexer', texto: 'Tocando um louvor no violão 🎸', frente: [-1, 0], item: 'violao' }, tempo: 12 },
      { id: 'sala_treino', comodo: 'sala', ponto: [5.1, 7.85], acao: { pose: 'correr', texto: 'Fazendo polichinelos 💪', frente: [0, 1] }, tempo: 9 },

      // Quarto
      { id: 'quarto_oracao', comodo: 'quarto', ponto: [4.0, 2.4], acao: { pose: 'orar', texto: 'Momento de oração e gratidão 🙏', ...ALMOFADA, fechados: true }, tempo: 14 },
      { id: 'quarto_biblia', comodo: 'quarto', ponto: [3.4, 1.75], acao: { pose: 'sentado', texto: 'Lendo a Bíblia na beira da cama 📖', ...BEIRA_CAMA, item: 'livro' }, tempo: 13 },
      { id: 'quarto_beira_cama', comodo: 'quarto', ponto: [3.4, 1.75], acao: { pose: 'sentado', texto: 'Refletindo sobre as bênçãos ✨', ...BEIRA_CAMA, fechados: true }, tempo: 10 },
      { id: 'quarto_cochilo', comodo: 'quarto', ponto: [3.4, 1.4], acao: { pose: 'baixo', texto: 'Tirando um cochilo 😴', lugar: [2.1, 0.76, 2.15], deitar: [0, 1], fechados: true }, tempo: 12 },

      // Banheiro
      { id: 'banheiro_dentes', comodo: 'banheiro', ponto: [6.95, 2.6], acao: { pose: 'comer', texto: 'Escovando os dentes 🪥', frente: [1, 0], item: 'escova' }, tempo: 9 },
      { id: 'banheiro_lavar_maos', comodo: 'banheiro', ponto: [6.95, 2.6], acao: { pose: 'mexer', texto: 'Lavando as mãos 🧼', frente: [1, 0] }, tempo: 7 },

      // Estudo
      { id: 'estudo_mesa', comodo: 'estudo', ponto: [10.75, 2.2], acao: { pose: 'sentado', texto: 'Estudando as Escrituras ✍️', ...MESA, item: 'livro' }, tempo: 14 },
      { id: 'estudo_poltrona', comodo: 'estudo', ponto: [9.4, 3.4], acao: { pose: 'sentado', texto: 'Lendo na poltrona 📚', ...POLTRONA, item: 'livro' }, tempo: 13 },
      { id: 'estudo_procurar_livro', comodo: 'estudo', ponto: [9.3, 1.05], acao: { pose: 'mexer', texto: 'Escolhendo um livro na estante 📚', frente: [0, -1] }, tempo: 7 },
      { id: 'estudo_estante', comodo: 'estudo', ponto: [9.3, 1.15], acao: { pose: 'livro', texto: 'Folheando um livro da estante 📖', frente: [0, 1], item: 'livro' }, tempo: 10 },

      // Cozinha
      { id: 'cozinha_agua', comodo: 'cozinha', ponto: [10.7, 8.4], acao: { pose: 'comer', texto: 'Bebendo uma água fresca 🥛', frente: [0, 1], item: 'copo' }, tempo: 8 },
      { id: 'cozinha_lanche', comodo: 'cozinha', ponto: [10.7, 8.4], acao: { pose: 'comer', texto: 'Comendo uma maçã 🍎', frente: [0, 1], item: 'maca' }, tempo: 8 },
      { id: 'cozinha_mesa', comodo: 'cozinha', ponto: [9.2, 7.75], acao: { pose: 'sentado', texto: 'Agradecendo pelo sustento diário 🙏', ...JANTAR, fechados: true }, tempo: 11 },
      { id: 'cozinha_pia', comodo: 'cozinha', ponto: [10.75, 6.0], acao: { pose: 'mexer', texto: 'Lavando a louça 🍽️', frente: [1, 0] }, tempo: 9 },
      { id: 'cozinha_fogao', comodo: 'cozinha', ponto: [10.75, 7.3], acao: { pose: 'mexer', texto: 'Cozinhando na frigideira 🍳', frente: [1, 0], item: 'frigideira' }, tempo: 11 },

      // Extras (só quando o cômodo foi comprado)
      { id: 'estudio_bateria', comodo: 'estudio', ponto: [16.6, 2.7], quando: () => tem('estudio'), acao: { pose: 'sentado', texto: 'Treinando ritmo na bateria 🥁', lugar: [17.1, -0.09, 1.98], frente: [0, -1], item: 'baquetas' }, tempo: 12 },
      { id: 'estudio_teclado', comodo: 'estudio', ponto: [14.75, 1.15], quando: () => tem('estudio'), acao: { pose: 'mexer', texto: 'Tocando hinos no teclado 🎹', frente: [0, -1] }, tempo: 12 },
      { id: 'estudio_microfone', comodo: 'estudio', ponto: [15.7, 3.75], quando: () => tem('estudio'), acao: { pose: 'cima', texto: 'Louvando no microfone 🎤', frente: [0, 1], item: 'microfone' }, tempo: 10 },
      { id: 'academia_esteira', comodo: 'academia', ponto: [16.3, 6.25], quando: () => tem('academia'), acao: { pose: 'andar', texto: 'Correndo na esteira 🏃', lugar: [16.1, 0.17, 5.42], frente: [1, 0] }, tempo: 12 },
      { id: 'academia_halteres', comodo: 'academia', ponto: [17.05, 8.1], quando: () => tem('academia'), acao: { pose: 'correr', texto: 'Treinando com halteres 💪', frente: [0, 1], item: 'halteres' }, tempo: 10 },
      { id: 'jardim_horta', comodo: 'jardim', ponto: [4.6, -4.35], quando: () => tem('jardim'), acao: { pose: 'mexer', texto: 'Regando a horta 🌿', frente: [0, -1], item: 'regador' }, tempo: 10 },
      { id: 'jardim_banco', comodo: 'jardim', ponto: [5.5, -2.15], quando: () => tem('jardim'), acao: { pose: 'sentado', texto: 'Apreciando a paz do jardim 🌸', ...BANCO }, tempo: 12 },
      { id: 'piscina_sol', comodo: 'piscina', ponto: [-3.6, 7.8], quando: () => tem('piscina'), acao: { pose: 'sentado', texto: 'Tomando um sol e descansando ☀️', lugar: [-3.6, 0.08, 7.2], frente: [0, -1] }, tempo: 13 },
      { id: 'piscina_ler', comodo: 'piscina', ponto: [-3.6, 7.8], quando: () => tem('piscina'), acao: { pose: 'sentado', texto: 'Lendo a Bíblia à beira da piscina 📖', lugar: [-3.6, 0.08, 7.2], frente: [0, -1], item: 'livro' }, tempo: 14 },
      { id: 'piscina_nadar', comodo: 'piscina', ponto: [-1.4, 4.2], quando: () => tem('piscina'), acao: { pose: 'andar', texto: 'Nadando e se refrescando 🏊‍♂️', lugar: [-2.9, -0.32, 4.2], frente: [-1, 0] }, tempo: 15 },
      { id: 'piscina_coco', comodo: 'piscina', ponto: [-4.1, 1.8], quando: () => tem('piscina'), acao: { pose: 'mexer', texto: 'Tomando água de coco geladinha 🥥', item: 'coco', frente: [0, -1] }, tempo: 10 },
      { id: 'piscina_ducha', comodo: 'piscina', ponto: [-1.0, 1.6], quando: () => tem('piscina'), acao: { pose: 'cima', texto: 'Tomando uma ducha refrescante 🚿', frente: [0, -1] }, tempo: 9 },
      { id: 'garagem_bancada', comodo: 'garagem', ponto: [-3.8, 10.2], quando: () => tem('garagem'), acao: { pose: 'mexer', texto: 'Criando projetos de madeira na oficina 🛠️', frente: [0, 1] }, tempo: 12 },
      { id: 'varanda_mesa', comodo: 'varanda', ponto: [9.5, -2.1], quando: () => tem('varanda'), acao: { pose: 'sentado', texto: 'Comunhão à mesa na varanda gourmet 🍞', lugar: [9.5, -0.09, -2.1], frente: [0, -1] }, tempo: 13 },
      { id: 'varanda_cha', comodo: 'varanda', ponto: [11.2, -1.3], quando: () => tem('varanda'), acao: { pose: 'mexer', texto: 'Preparando chá quentinho na varanda ☕', frente: [1, 0] }, tempo: 10 },
    ];

    /* Bichinhos comprados na loja: seguem o personagem pela casa */
    type Bicho = { id: string; grupo: THREE.Group; rabo: THREE.Object3D; pernas: THREE.Object3D[]; pos: THREE.Vector3; rota: THREE.Vector3[]; giro: number; proxima: number; vel: number; lado: [number, number]; abana: number };
    const bichos: Bicho[] = [];
    const pernasDe = (g: THREE.Group, cor: string, pata: string, altura: number, dx: number, dz: number, r: number) => [[dx, dz], [-dx, dz], [dx, -dz], [-dx, -dz]].map(([x, z]) => {
      const pv = new THREE.Group();
      pv.position.set(x, altura, z);
      cil(pv, 0, -altura, 0, r, altura, cor);
      esfera(pv, 0, -altura + 0.015, 0.012, r * 1.15, 0.025, r * 1.4, pata);
      g.add(pv);
      return pv;
    });
    const criarBicho = (id: string, nome: string, artigo: string, vel: number, lado: [number, number], inicio: [number, number], abana: number, montar: (g: THREE.Group) => { rabo: THREE.Object3D; pernas: THREE.Object3D[] }) => {
      let partes = { rabo: new THREE.Object3D(), pernas: [] as THREE.Object3D[] };
      const g = interativo(id, nome, '', inicio, [
        { rotulo: 'Fazer carinho', pose: 'mexer', texto: `Fazendo carinho ${artigo}` },
        { rotulo: 'Brincar', pose: 'cima', texto: `Brincando ${artigo}` },
      ], gr => { partes = montar(gr); });
      bichos.push({ id, grupo: g, ...partes, pos: new THREE.Vector3(inicio[0], 0, inicio[1]), rota: [], giro: 0, proxima: 0, vel, lado, abana });
    };
    criarBicho('cachorro', 'Cachorro', 'no cachorro', 2.3, [0.75, 0.45], [4.2, 7.6], 13, g => {
      const [c1, c2, c3] = ['#C98B4A', '#F3E3CC', '#6B4226'];
      esfera(g, 0, 0.28, 0, 0.13, 0.12, 0.21, c1);
      esfera(g, 0, 0.45, 0.2, 0.12, 0.11, 0.11, c1);
      esfera(g, 0, 0.42, 0.3, 0.065, 0.055, 0.07, c2);
      esfera(g, 0, 0.45, 0.37, 0.025, 0.02, 0.02, NOITE);
      for (const s of [1, -1]) {
        esfera(g, s * 0.047, 0.49, 0.29, 0.018, 0.02, 0.012, NOITE);
        esfera(g, s * 0.11, 0.43, 0.18, 0.035, 0.08, 0.05, c3).rotation.z = s * 0.35;
      }
      const coleira = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 20), mat(PINK));
      coleira.position.set(0, 0.37, 0.15);
      coleira.rotation.x = Math.PI / 2 - 0.5;
      g.add(coleira);
      const rabo = new THREE.Group();
      rabo.position.set(0, 0.34, -0.19);
      esfera(rabo, 0, 0.06, -0.04, 0.025, 0.08, 0.025, c1).rotation.x = -0.6;
      g.add(rabo);
      return { rabo, pernas: pernasDe(g, c1, c2, 0.2, 0.07, 0.12, 0.034) };
    });
    criarBicho('gato', 'Gato', 'com o gato', 1.9, [-0.7, 0.55], [3.6, 3.2], 3, g => {
      const [c1, c2] = ['#9A94A6', '#F4F1F6'];
      esfera(g, 0, 0.22, 0, 0.1, 0.095, 0.18, c1);
      esfera(g, 0, 0.21, 0.08, 0.07, 0.07, 0.08, c2);
      esfera(g, 0, 0.37, 0.16, 0.095, 0.085, 0.085, c1);
      esfera(g, 0, 0.35, 0.235, 0.04, 0.03, 0.025, c2);
      esfera(g, 0, 0.365, 0.255, 0.012, 0.01, 0.008, '#E58A7A');
      for (const s of [1, -1]) {
        esfera(g, s * 0.04, 0.39, 0.23, 0.016, 0.022, 0.01, '#3F7F00');
        const orelha = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.075, 4), mat(c1));
        orelha.position.set(s * 0.055, 0.46, 0.15);
        orelha.rotation.z = -s * 0.25;
        orelha.castShadow = true;
        g.add(orelha);
      }
      const rabo = new THREE.Group();
      rabo.position.set(0, 0.25, -0.17);
      for (let k = 0; k < 6; k++) esfera(rabo, 0, 0.02 + k * 0.045, -0.03 - Math.sin(k * 0.35) * 0.05, 0.022, 0.03, 0.022, c1);
      g.add(rabo);
      return { rabo, pernas: pernasDe(g, c1, c2, 0.16, 0.055, 0.1, 0.026) };
    });

    /* Câmera presa na casa: gira, dá zoom e foca em cômodos */
    const cam = { giro: 0.55, alvo: CENTRO_CASA.clone(), dist: 21, giroDesejado: 0.55, alvoDesejado: CENTRO_CASA.clone(), distDesejada: 21, focoComodo: '' };
    const ALTURA_CAM = 0.82; // ângulo de cima (rad)
    const salas = (): (Comodo & { aberto?: boolean })[] => [...COMODOS, ...EXTRAS.filter(e => tem(e.item))];
    const focar = (f: string) => {
      const c = salas().find(x => x.id === f);
      cam.focoComodo = c ? c.id : '';
      if (c) {
        cam.alvoDesejado.set((c.x0 + c.x1) / 2, 0, (c.z0 + c.z1) / 2);
        cam.distDesejada = c.aberto ? 15 : 11.5;
        return;
      }
      // Casa toda: enquadra a casa e os cômodos comprados
      let x0 = 0, z0 = 0, x1 = 12, z1 = 9;
      for (const e of EXTRAS) if (tem(e.item)) { x0 = Math.min(x0, e.x0); z0 = Math.min(z0, e.z0); x1 = Math.max(x1, e.x1); z1 = Math.max(z1, e.z1); }
      cam.alvoDesejado.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
      cam.distDesejada = 21 * Math.min(1.3, Math.max(1, Math.max((x1 - x0) / 12, (z1 - z0) / 9) * 0.85));
    };
    focar(p.current.foco);

    /* Interação: arrastar gira, roda/pinça dá zoom, toque escolhe; no Modo Construir arrasta móveis, paredes e pisos */
    const ray = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();
    const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pontoChao = new THREE.Vector3();
    const toques = new Map<number, { x: number; y: number }>();
    let arrasto = 0, inicio = { x: 0, y: 0 }, pinca = 0;
    const tela = renderer.domElement;
    const visivel = (o: THREE.Object3D | null): boolean => !o || (o.visible && visivel(o.parent));
    const comodoLiberado = (cm: Comodo | undefined) => !!cm && (COMODOS.some(c => c.id === cm.id) || EXTRAS.some(e => e.id === cm.id && tem(e.item)));

    const definirRaio = (cx: number, cy: number) => {
      const r = tela.getBoundingClientRect();
      ponteiro.set(((cx - r.left) / (r.width || 1)) * 2 - 1, -((cy - r.top) / (r.height || 1)) * 2 + 1);
      ray.setFromCamera(ponteiro, camera);
    };

    const mobiliaNo = (cx: number, cy: number): number | null => {
      definirRaio(cx, cy);
      const acertos = ray.intersectObjects([...decoracao.children,...[...originais.values()].map(o=>o.obj.grupo)], true);
      for (const a of acertos) {
        let o: THREE.Object3D | null = a.object;
        while (o && o.userData.mobiliaIdx === undefined) o = o.parent;
        if (o && visivel(o)) return o.userData.mobiliaIdx as number;
      }
      return null;
    };

    const objetoNo = (cx: number, cy: number) => {
      definirRaio(cx, cy);
      const acertos = ray.intersectObjects([casa, grama], true);
      for (const a of acertos) {
        let o: THREE.Object3D | null = a.object;
        while (o && !o.userData.objeto && !o.userData.chao) o = o.parent;
        if (!o) continue;
        if (o.userData.chao) return { chao: a.point };
        const obj = objetos.find(x => x.id === o!.userData.objeto && visivel(x.grupo));
        if (obj) return { obj };
      }
      return null;
    };

    const comodoNoPonto = (cx: number, cy: number): Comodo | null => {
      definirRaio(cx, cy);
      const alvos = [
        ...paredes.filter(pm => !pm.p.y0 && pm.atual > 0.5 && pm.mesh.visible).map(pm => pm.mesh),
        ...Object.values(pisosMap).filter(info => comodoLiberado(info.padrao)).map(info => info.mesh),
      ];
      const acertos = ray.intersectObjects(alvos, false);
      for (const hit of acertos) {
        const cid = hit.object.userData.comodo as string | undefined;
        if (cid) {
          const cm = COMODOS.find(c => c.id === cid) ?? EXTRAS.find(e => e.id === cid);
          if (comodoLiberado(cm)) return cm!;
        }
        const pm = hit.object.userData.parede as ParedeMesh | undefined;
        if (pm && hit.face) {
          const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          if (Math.abs(n.y) > 0.2) continue;
          const cm = comodoEm(hit.point.x + n.x * 0.25, hit.point.z + n.z * 0.25);
          if (comodoLiberado(cm)) return cm!;
        }
      }
      return null;
    };

    const calcularPosicaoMovel = (itemId: string, cx: number, cy: number, ignorarIdx: number, giroAtual: number) => {
      const mv = MOVEIS[itemId];
      if (!mv) return null;
      definirRaio(cx, cy);
      if (mv.tipo === 'parede') {
        const alvos = paredes.filter(pm => !pm.p.y0 && pm.atual > 0.5 && pm.mesh.visible).map(pm => pm.mesh);
        for (const hit of ray.intersectObjects(alvos, false)) {
          if (!hit.face) continue;
          const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          if (Math.abs(n.y) > 0.2) continue;
          const cm = comodoEm(hit.point.x + n.x * 0.25, hit.point.z + n.z * 0.25);
          if (!comodoLiberado(cm)) continue;
          const pm = hit.object.userData.parede as ParedeMesh;
          let x: number, z: number;
          if (pm.aoLongoX) {
            const minX = Math.min(pm.p.x0, pm.p.x1), maxX = Math.max(pm.p.x0, pm.p.x1);
            const mg = Math.min(0.42, Math.max(0.05, (maxX - minX) / 2 - 0.05));
            x = Math.round(THREE.MathUtils.clamp(hit.point.x, minX + mg, maxX - mg) * 20) / 20;
            z = pm.p.z0 + Math.sign(n.z) * 0.08;
          } else {
            const minZ = Math.min(pm.p.z0, pm.p.z1), maxZ = Math.max(pm.p.z0, pm.p.z1);
            const mg = Math.min(0.42, Math.max(0.05, (maxZ - minZ) / 2 - 0.05));
            z = Math.round(THREE.MathUtils.clamp(hit.point.z, minZ + mg, maxZ - mg) * 20) / 20;
            x = pm.p.x0 + Math.sign(n.x) * 0.08;
          }
          const y = Math.round(THREE.MathUtils.clamp(hit.point.y, 1.15, 1.98) * 20) / 20;
          const giro = Math.atan2(Math.round(n.x), Math.round(n.z));
          const bateJanela = janelasLista.some(jn => Math.hypot(jn.x - x, jn.z - z) < jn.w / 2 + 0.35 && y > jn.y - 0.35 && y < jn.y + jn.h + 0.35);
          const bateOutro = p.current.mobilia.some((m, k) => k !== ignorarIdx && m.parede && Math.hypot(m.x - x, m.z - z) < 0.55 && Math.abs((m.y ?? 1.65) - y) < 0.48 && Math.abs(Math.sin(((m.giro ?? 0) - giro) / 2)) < 0.2);
          return { x, y, z, giro, parede: true, ok: !bateJanela && !bateOutro };
        }
        return null;
      }
      if (!ray.ray.intersectPlane(planoChao, pontoChao)) return null;
      const passo = passoGridRef.current;
      const x = snapGrid(pontoChao.x, passo), z = snapGrid(pontoChao.z, passo);
      const cm = comodoEm(x, z);
      const dentroSala = comodoLiberado(cm);
      const jar = EXTRAS.find(e => e.id === 'jardim')!;
      const noJardim = mv.tipo === 'chao' && tem('jardim') && x > jar.x0 + 0.35 && x < jar.x1 - 0.35 && z > jar.z0 + 0.35 && z < jar.z1 - 0.25;
      const pis = EXTRAS.find(e => e.id === 'piscina')!;
      const naPiscina = mv.tipo === 'chao' && tem('piscina') && x > pis.x0 + 0.35 && x < pis.x1 - 0.35 && z > pis.z0 + 0.35 && z < pis.z1 - 0.25;
      const gar = EXTRAS.find(e => e.id === 'garagem')!;
      const naGaragem = mv.tipo === 'chao' && tem('garagem') && x > gar.x0 + 0.35 && x < gar.x1 - 0.35 && z > gar.z0 + 0.35 && z < gar.z1 - 0.25;
      const varanda = EXTRAS.find(e => e.id === 'varanda')!;
      const naVaranda = mv.tipo === 'chao' && tem('varanda') && x > varanda.x0 + 0.35 && x < varanda.x1 - 0.35 && z > varanda.z0 + 0.35 && z < varanda.z1 - 0.25;
      const validacao = mv.tipo === 'chao'
        ? validarPosicaoMovel(
            x,
            z,
            ignorarIdx,
            p.current.mobilia,
            false,
          )
        : { valido: true };
      const localOk = mv.tipo === 'tapete'
        ? !!cm && dentroSala && x > cm.x0 + 0.45 && x < cm.x1 - 0.45 && z > cm.z0 + 0.45 && z < cm.z1 - 0.45 && !pertoDeParede(x, z)
        : (dentroSala || noJardim || naPiscina || naGaragem || naVaranda) && !pertoDeParede(x, z) && validacao.valido;
      const fixos = [...bloqueios, ...bloqueiosExtra.filter(b => b.quando()).map(b => b.area)];
      const bateFixo = mv.tipo === 'chao' && fixos.some(([x0, z0, x1, z1]) => x > x0 - 0.22 && x < x1 + 0.22 && z > z0 - 0.22 && z < z1 + 0.22);
      const bateOutro = p.current.mobilia.some((m, k) => k !== ignorarIdx && MOVEIS[m.item]?.tipo === mv.tipo && Math.hypot(m.x - x, m.z - z) < (mv.tipo === 'tapete' ? 0.65 : 0.4));
      return { x, y: undefined as number | undefined, z, giro: giroAtual, parede: false, ok: localOk && !bateFixo && !bateOutro && (mv.tipo!=='chao' || cabeMovel({item:itemId,x,z,giro:giroAtual},ignorarIdx)) };
    };

    const mostrarAnel = (pos: { x: number; y?: number; z: number; giro: number; parede: boolean; ok: boolean } | null) => {
      if (!pos) { anelBase.visible = false; anelChao.visible = false; anelParede.visible = false; return; }
      matAnel.color.set(pos.ok ? '#4FD466' : '#F04E3E');
      if (pos.parede) {
        anelBase.visible = false;
        anelChao.visible = false;
        anelParede.visible = true;
        anelParede.position.set(pos.x, pos.y ?? 1.65, pos.z);
        anelParede.rotation.set(0, pos.giro, Math.PI / 4, 'YXZ');
      } else {
        anelParede.visible = false;
        anelBase.visible = true;
        anelBase.position.set(pos.x, 0.022, pos.z);
        anelChao.visible = true;
        anelChao.position.set(pos.x, 0.025, pos.z);
      }
    };

    const sobreBandeja = (cy: number) => {
      const b = bandejaRef.current?.getBoundingClientRect();
      return !!b && cy >= b.top - 4;
    };

    type ArrastoCena = { idx: number; item: string; giro: number; movido: boolean; ultimo: { x: number; y?: number; z: number; giro: number; parede: boolean; ok: boolean } | null; naBandeja: boolean };
    let arrastoCena: ArrastoCena | null = null;

    type ArrastoBandeja = {
      pointerId: number; tipo: 'movel' | 'papel' | 'piso'; id: string; nome: string;
      startX: number; startY: number; ativo: boolean;
      ultimoMovel: { x: number; y?: number; z: number; giro: number; parede: boolean; ok: boolean } | null;
      ultimoComodo: Comodo | null;
    };
    let arrastoBandeja: ArrastoBandeja | null = null;

    const prepararFantasma = (itemId: string) => {
      limparGrupo(fantasma);
      const montar = MONTAR[itemId];
      if (!montar) return;
      montar(fantasma);
      tingirCasa([fantasma], p.current.cor);
    };

    const moverBandeja = (e: PointerEvent) => {
      const ab = arrastoBandeja;
      if (!ab || e.pointerId !== ab.pointerId) return;
      const dx = e.clientX - ab.startX, dy = e.clientY - ab.startY;
      if (!ab.ativo) {
        if (e.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy) + 6 && Math.abs(dx) > 10) {
          arrastoBandeja = null;
          return;
        }
        const iniciou = e.pointerType === 'mouse' ? Math.hypot(dx, dy) > 6 : (ab.startY - e.clientY > 10 || Math.hypot(dx, dy) > 16);
        if (!iniciou) return;
        ab.ativo = true;
        selIdx = null;
        setSel(null);
        if (ab.tipo === 'movel') prepararFantasma(ab.id);
      }
      const r = el.getBoundingClientRect();
      const lx = e.clientX - r.left, ly = e.clientY - r.top;
      if (sobreBandeja(e.clientY)) {
        fantasma.visible = false;
        mostrarAnel(null);
        if (ab.tipo !== 'movel') aplicarAcabamentos(null);
        ab.ultimoMovel = null;
        ab.ultimoComodo = null;
        setArrastandoItem({ nome: `Arraste ${ab.nome.toLowerCase()} até a casa`, x: lx, y: ly, ok: true });
        return;
      }
      if (ab.tipo === 'movel') {
        const pos = calcularPosicaoMovel(ab.id, e.clientX, e.clientY, -1, 0);
        ab.ultimoMovel = pos;
        if (pos) {
          fantasma.visible = true;
          fantasma.position.set(pos.x, pos.y ?? 0, pos.z);
          fantasma.rotation.y = pos.giro;
          mostrarAnel(pos);
          setArrastandoItem({ nome: pos.ok ? ab.nome : 'Sem espaço aqui', x: lx, y: ly, ok: pos.ok });
        } else {
          fantasma.visible = false;
          mostrarAnel(null);
          setArrastandoItem({ nome: MOVEIS[ab.id]?.tipo === 'parede' ? 'Aponte para uma parede interna' : 'Aponte para um cômodo', x: lx, y: ly, ok: false });
        }
      } else {
        const cm = comodoNoPonto(e.clientX, e.clientY);
        ab.ultimoComodo = cm;
        if (cm) {
          aplicarAcabamentos({ comodo: cm.id, tipo: ab.tipo, id: ab.id });
          setArrastandoItem({ nome: `${ab.nome} → ${cm.nome}`, x: lx, y: ly, ok: true });
        } else {
          aplicarAcabamentos(null);
          setArrastandoItem({ nome: 'Arraste sobre um cômodo', x: lx, y: ly, ok: false });
        }
      }
    };

    const finalizarBandeja = (e: PointerEvent) => {
      const ab = arrastoBandeja;
      if (!ab || e.pointerId !== ab.pointerId) return;
      arrastoBandeja = null;
      fantasma.visible = false;
      fantasma.clear();
      mostrarAnel(null);
      setArrastandoItem(null);
      if (!ab.ativo) return;
      if (ab.tipo === 'movel') {
        const pos = ab.ultimoMovel;
        if (pos && pos.ok && !sobreBandeja(e.clientY)) {
          const novo: Mobilia = {
            item: ab.id, x: pos.x, ...(pos.y !== undefined ? { y: pos.y } : {}), z: pos.z,
            ...(pos.giro ? { giro: pos.giro } : {}), ...(pos.parede ? { parede: true } : {}),
          };
          const novaLista = [...p.current.mobilia, novo];
          selIdx = novaLista.length - 1;
          p.current.onMudarMobilia(novaLista);
        }
      } else {
        aplicarAcabamentos(null);
        if (ab.ultimoComodo && !sobreBandeja(e.clientY)) {
          const cid = ab.ultimoComodo.id;
          const atual = p.current.acabamentos[cid] ?? {};
          const prox: Acabamento = { ...atual, [ab.tipo]: ab.id || undefined };
          p.current.onMudarAcabamento(cid, prox);
          avisarDica(`${ab.nome} aplicado em ${ab.ultimoComodo.nome}!`);
        }
      }
    };
    window.addEventListener('pointermove', moverBandeja);
    window.addEventListener('pointerup', finalizarBandeja);
    window.addEventListener('pointercancel', finalizarBandeja);

    let destacado: THREE.Group | null = null;
    const destacar = (g: THREE.Group | null) => {
      if (destacado === g) return;
      const pintar = (gr: THREE.Group | null, cor: number) => gr?.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'emissive' in m && !o.parent?.userData.moeda) m.emissive.setHex(cor);
      });
      pintar(destacado, 0x000000);
      pintar(g, 0x2c2410);
      destacado = g;
      tela.style.cursor = g ? 'pointer' : 'grab';
    };

    const aoDescer = (e: PointerEvent) => {
      try { tela.setPointerCapture(e.pointerId); } catch {}
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (toques.size === 1) {
        arrasto = 0;
        inicio = { x: e.clientX, y: e.clientY };
        if (p.current.decorando) {
          const hitIdx = mobiliaNo(e.clientX, e.clientY);
          if (hitIdx !== null && p.current.mobilia[hitIdx]) {
            const m = p.current.mobilia[hitIdx];
            arrastoCena = { idx: hitIdx, item: m.item, giro: m.giro ?? 0, movido: false, ultimo: null, naBandeja: false };
          }
        }
      }
      if (toques.size === 2) {
        arrastoCena = null;
        const [a, b] = [...toques.values()];
        pinca = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const aoMover = (e: PointerEvent) => {
      const ant = toques.get(e.pointerId);
      if (!ant) {
        if (e.pointerType === 'mouse') {
          if (p.current.decorando) {
            const idx = mobiliaNo(e.clientX, e.clientY);
            tela.style.cursor = idx !== null ? 'grab' : 'default';
            destacar(null);
          } else {
            const h = objetoNo(e.clientX, e.clientY);
            destacar(h && 'obj' in h ? h.obj!.grupo : null);
          }
        }
        return;
      }
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (toques.size === 2) {
        const [a, b] = [...toques.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinca) cam.distDesejada = THREE.MathUtils.clamp(cam.distDesejada * (pinca / d), 7, 28);
        pinca = d;
        arrasto = 99;
        return;
      }
      arrasto += Math.abs(e.clientX - ant.x) + Math.abs(e.clientY - ant.y);
      if (arrastoCena && p.current.decorando) {
        if (arrasto <= 6 && !arrastoCena.movido) return;
        arrastoCena.movido = true;
        selIdx = arrastoCena.idx;
        const ic = itensCena.find(x => x.idx === arrastoCena!.idx);
        const r = el.getBoundingClientRect();
        const lx = e.clientX - r.left, ly = e.clientY - r.top;
        const nomeMov = MOVEIS[arrastoCena!.item]?.nome ?? 'Móvel';
        if (sobreBandeja(e.clientY) && !idOriginal(arrastoCena.item)) {
          arrastoCena.naBandeja = true;
          if (ic) ic.grupo.visible = false;
          mostrarAnel(null);
          setArrastandoItem({ nome: `Solte para guardar ${nomeMov.toLowerCase()}`, x: lx, y: ly, ok: true });
          return;
        }
        arrastoCena.naBandeja = false;
        const pos = calcularPosicaoMovel(arrastoCena.item, e.clientX, e.clientY, arrastoCena.idx, arrastoCena.giro);
        arrastoCena.ultimo = pos;
        if (pos && ic) {
          ic.grupo.visible = true;
          ic.grupo.position.set(pos.x, pos.y ?? 0, pos.z);
          ic.grupo.rotation.y = pos.giro;
          mostrarAnel(pos);
          setArrastandoItem({ nome: pos.ok ? nomeMov : 'Sem espaço aqui', x: lx, y: ly, ok: pos.ok });
        } else {
          mostrarAnel(null);
          setArrastandoItem({ nome: 'Fora do lugar', x: lx, y: ly, ok: false });
        }
        return;
      }
      if (arrasto > 6) cam.giroDesejado -= (e.clientX - ant.x) * 0.008;
    };

    const aoSubir = (e: PointerEvent) => {
      try { tela.releasePointerCapture(e.pointerId); } catch {}
      toques.delete(e.pointerId);
      if (toques.size) return;
      pinca = 0;
      if (arrastoCena) {
        const ac = arrastoCena;
        arrastoCena = null;
        setArrastandoItem(null);
        if (ac.movido) {
          if (ac.naBandeja) {
            const nova = p.current.mobilia.filter((_, k) => k !== ac.idx);
            selIdx = null;
            setSel(null);
            mostrarAnel(null);
            p.current.onMudarMobilia(nova);
            avisarDica('Móvel guardado na bandeja!');
            return;
          }
          if (ac.ultimo && ac.ultimo.ok) {
            const p0 = ac.ultimo;
            const nova = p.current.mobilia.map((m, k) => (k === ac.idx ? {
              item: m.item, x: p0.x, ...(p0.y !== undefined ? { y: p0.y } : {}), z: p0.z,
              ...(p0.giro ? { giro: p0.giro } : {}), ...(p0.parede ? { parede: true } : {}),
            } : m));
            selIdx = ac.idx;
            p.current.onMudarMobilia(nova);
          } else {
            montarDecoracao();
            tingirCasa([decoracao], p.current.cor);
          }
          return;
        }
        // Toque simples sobre um móvel já colocado: seleciona
        selIdx = ac.idx;
        return;
      }
      if (arrasto > 6) return;
      if (p.current.decorando) {
        selIdx = null;
        setSel(null);
        mostrarAnel(null);
        return;
      }
      if (menuRef.current) { setMenu(null); return; }
      const h = objetoNo(e.clientX, e.clientY);
      if (!h || p.current.humor === 'adormecido') return;
      if ('obj' in h && h.obj) {
        const r = tela.getBoundingClientRect();
        setMenu({ x: e.clientX - r.left, y: e.clientY - r.top, obj: h.obj });
      } else if (h.chao) {
        const [x, z] = [h.chao.x, h.chao.z];
        const emLoteFechado = EXTRAS.some(ex => !ex.aberto && !tem(ex.item) && x > ex.x0 && x < ex.x1 && z > ex.z0 && z < ex.z1);
        if (x > -5.7 && x < 18.5 && z > -6.5 && z < 12.2 && !emLoteFechado) andarAte([x, z]);
      }
    };
    const aoRodar = (e: WheelEvent) => { e.preventDefault(); cam.distDesejada = THREE.MathUtils.clamp(cam.distDesejada * (1 + e.deltaY * 0.0012), 7, 28); };
    tela.addEventListener('pointerdown', aoDescer);
    tela.addEventListener('pointermove', aoMover);
    tela.addEventListener('pointerup', aoSubir);
    tela.addEventListener('pointercancel', aoSubir);
    tela.addEventListener('wheel', aoRodar, { passive: false });

    /* Tamanho */
    const ajustar = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      tela.style.width = w + 'px';
      tela.style.height = h + 'px';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    ajustar();

    /* Laço principal */
    let visivelAba = typeof document === 'undefined' ? true : !document.hidden;
    const aoMudarVisibilidade = () => {
      visivelAba = !document.hidden;
      som.current?.pausar(!visivelAba || !!p.current.pausado);
      if (visivelAba) ultimo = performance.now();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', aoMudarVisibilidade);

    let ultimo = performance.now(), quadro = 0;
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
    const proj = (v: THREE.Vector3) => { tmp2.copy(v).project(camera); return { x: (tmp2.x * 0.5 + 0.5) * el.clientWidth, y: (-tmp2.y * 0.5 + 0.5) * el.clientHeight }; };
    let ultimoBalao = '', ultimaSel = '';
    const laco = () => {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);
      if (!visivelAba || p.current.pausado) return;
      const agora = performance.now(), dt = Math.min(0.12, (agora - ultimo) / 1000);
      ultimo = agora;
      const dormindo = p.current.humor === 'adormecido';
      const decorando = p.current.decorando;

      // Câmera suave
      const k = 1 - Math.pow(0.002, dt);
      cam.giro += (cam.giroDesejado - cam.giro) * k;
      cam.dist += (cam.distDesejada - cam.dist) * k;
      cam.alvo.lerp(cam.alvoDesejado, k);
      // Tela em pé (celular) corta os lados: afasta a câmera para caber a casa
      const dist = cam.dist * (camera.aspect < 1 ? Math.min(2.2, (1 / camera.aspect) ** 0.85) : 1);
      camera.position.set(
        cam.alvo.x + Math.sin(cam.giro) * Math.cos(ALTURA_CAM) * dist,
        cam.alvo.y + Math.sin(ALTURA_CAM) * dist,
        cam.alvo.z + Math.cos(cam.giro) * Math.cos(ALTURA_CAM) * dist,
      );
      camera.lookAt(cam.alvo);

      // Paredes da frente abaixam (como no The Sims); janelas e quadros nas paredes baixadas somem juntos
      tmp.set(Math.sin(cam.giro), 0, Math.cos(cam.giro));
      const ref = cam.focoComodo ? cam.alvo : cam.alvoDesejado;
      for (const pa of paredes) {
        const s = tmp2.copy(pa.centro).sub(ref).dot(tmp);
        const limite = pa.p.externa || cam.focoComodo ? 0.35 : -0.6;
        pa.alvo = s > limite ? 0 : 1;
        pa.atual += (pa.alvo - pa.atual) * Math.min(1, dt * 8);
        const y0 = pa.p.y0 ?? 0, y1 = pa.p.y1 ?? ALTURA, cheia = y1 - y0;
        if (pa.p.y0) { pa.mesh.visible = pa.atual > 0.5; continue; }
        const h = BAIXA + (cheia - BAIXA) * pa.atual;
        pa.mesh.scale.y = h / cheia;
        pa.mesh.position.y = y0 + h / 2;
      }
      for (const jn of janelasLista) jn.grupo.visible = jn.parede ? jn.parede.atual > 0.5 : true;
      for (const ic of itensCena) {
        if (arrastoCena?.movido && arrastoCena.idx === ic.idx) continue;
        if (ic.paredeRef) ic.grupo.visible = ic.paredeRef.atual > 0.5;
      }

      // Anel e barra flutuante do móvel selecionado no Modo Construir
      if (decorando && selIdx !== null && p.current.mobilia[selIdx] && !arrastoCena?.movido && !arrastoBandeja?.ativo) {
        const m = p.current.mobilia[selIdx];
        mostrarAnel({ x: m.x, y: m.y, z: m.z, giro: m.giro ?? 0, parede: !!m.parede, ok: true });
        const topo = proj(tmp.copy(tmp3.set(m.x, (m.y ?? 0) + (m.parede ? 0.55 : 0.95), m.z)));
        const nomeMov = MOVEIS[m.item]?.nome ?? 'Móvel';
        const ch = `${selIdx}|${Math.round(topo.x)}|${Math.round(topo.y)}|${m.parede ? 1 : 0}`;
        if (ch !== ultimaSel) {
          ultimaSel = ch;
          setSel({ idx: selIdx, x: topo.x, y: topo.y, nome: nomeMov, parede: !!m.parede });
        }
      } else if (!arrastoCena?.movido && !arrastoBandeja?.ativo) {
        mostrarAnel(null);
        if (ultimaSel) { ultimaSel = ''; setSel(null); }
      }

      // Personagem: anda pela rota, faz ações e passeia quando está à toa
      const b = boneco;
      let pose: Pose = 'baixo', fones = false, fechados = false, deitar: [number, number] | undefined, frente: [number, number] | undefined, item: ItemMao | undefined;
      let texto: string | null = null;
      if (dormindo) {
        b.rota = [];
        b.acao = null;
        b.pos.set(3.3, 0, 1.3);
        fechados = true;
        deitar = [0, 1];
        texto = 'Zzz';
      } else if (b.rota.length) {
        const prox = b.rota[0], d = prox.distanceTo(b.pos), passo = 1.6 * dt;
        tmp.copy(prox).sub(b.pos);
        if (tmp.lengthSq() > 1e-6) b.giro = Math.atan2(tmp.x, tmp.z);
        if (d <= passo) { b.pos.copy(prox); b.rota.shift(); } else b.pos.addScaledVector(tmp.normalize(), passo);
        pose = 'andar';
        if (!b.rota.length) { b.paradoDesde = agora; const f = b.depois; b.depois = null; f?.(); }
      } else if (b.acao) {
        if (agora > b.acao.ate) { b.acao = null; b.paradoDesde = agora; }
        else { pose = b.acao.pose; fones = !!b.acao.fones; fechados = !!b.acao.fechados; deitar = b.acao.deitar; frente = b.acao.frente; texto = b.acao.texto ?? null; item = b.acao.item; }
      } else if (!decorando && !menuRef.current && agora - b.paradoDesde > 5000 + Math.random() * 4000) {
        // Rotinas autônomas com vida própria: o boneco realiza atividades da vida diária
        const disponiveis = ROTEIROS.filter(r => (!r.quando || r.quando()) && r.id !== ultimoRoteiroRef.current);
        const doFoco = cam.focoComodo && cam.focoComodo !== 'casa' ? disponiveis.filter(r => r.comodo === cam.focoComodo) : [];
        const lista = doFoco.length && Math.random() < 0.75 ? doFoco : disponiveis;
        const escolhido = lista[Math.floor(Math.random() * lista.length)];
        if (escolhido) {
          ultimoRoteiroRef.current = escolhido.id;
          const dono=escolhido.id.startsWith('tv_')?'sofa':escolhido.id.startsWith('quarto_')?(escolhido.id==='quarto_oracao'?'almofada':'cama'):escolhido.id.startsWith('banheiro_')?'espelho':escolhido.id==='sala_louvor'?'som':escolhido.id==='sala_peixe'?'aquario':escolhido.id.split('_').find(id=>originais.has(id))??'';
          andarAte(transformarPonto(dono,escolhido.ponto), () => {
            fazer(transformarAcao(dono,escolhido.acao), escolhido.tempo ?? 9);
          });
        }
        b.paradoDesde = agora;
      }
      const lugar = !b.rota.length && b.acao?.lugar ? b.acao.lugar : null;
      const camaDormir=transformarPonto('cama',[2.1,2.15]);
      const onde = dormindo ? tmp3.set(camaDormir[0], 0.76, camaDormir[1]) : lugar ?? b.pos;
      pivo.position.copy(onde);
      // Deitado: barriga para cima, cabeça para a cabeceira. Em pé ou sentado: vira para onde vai
      if (deitar) pivo.rotation.set(-Math.PI / 2, Math.atan2(deitar[0], deitar[1]), 0, 'YXZ');
      else pivo.rotation.set(0, frente ? Math.atan2(frente[0], frente[1]) : b.giro, 0, 'YXZ');
      if (modelo) {
        modelo.expressao({ olhosFechados: fechados, extras: extrasDe(pose, fones, item) });
        modelo.segurar(deitar ? null : (item ?? (pose === 'livro' ? 'livro' : undefined)));
        modelo.animar(deitar ? 'deitado' : animacaoDe(pose), pose === 'andar' ? 1.3 : 1);
        modelo.atualizar(dt);
      }

      // O violão sai do suporte enquanto está no braço do personagem
      violaoSuporte.visible = !(item === 'violao' && Math.hypot(onde.x - 6.3, onde.z - 8.2) < 3);

      // Chama acima do personagem (flutua e tremula suavemente)
      chama.visible = !dormindo && !decorando;
      if (chama.visible) {
        chama.position.set(onde.x, onde.y + (deitar ? 0.75 : 1.9) + Math.sin(agora * 0.003) * 0.035, onde.z);
        const tremor = Math.sin(agora * 0.017) * 0.06 + Math.sin(agora * 0.029) * 0.04;
        chamaFora.scale.set(1 - tremor * 0.5, 1 + tremor, 1 - tremor * 0.5);
        chamaFora.rotation.z = Math.sin(agora * 0.011) * 0.07;
        chamaMiolo.scale.set(1, 1 - tremor, 1);
      }

      // Bichinhos: vão atrás do personagem quando ele se afasta
      for (const bi of bichos) {
        if (!bi.grupo.visible) continue;
        const ref2 = onde;
        const ax = ref2.x + bi.lado[0], az = ref2.z + bi.lado[1];
        if (!bi.rota.length && Math.hypot(ax - bi.pos.x, az - bi.pos.z) > 1.3 && agora > bi.proxima) {
          bi.rota = caminho(bi.pos, [ax, az]) ?? [];
          bi.proxima = agora + 700;
        }
        let andando = false;
        if (bi.rota.length) {
          const prox = bi.rota[0], passo = bi.vel * dt;
          tmp.copy(prox).sub(bi.pos);
          if (tmp.lengthSq() > 1e-6) bi.giro = Math.atan2(tmp.x, tmp.z);
          if (tmp.length() <= passo) { bi.pos.copy(prox); bi.rota.shift(); } else bi.pos.addScaledVector(tmp.normalize(), passo);
          andando = true;
        }
        const t = agora / 1000;
        bi.grupo.position.set(bi.pos.x, andando ? Math.abs(Math.sin(t * 14)) * 0.025 : 0, bi.pos.z);
        bi.grupo.rotation.y = bi.giro;
        bi.rabo.rotation.y = Math.sin(t * (andando ? bi.abana * 1.3 : bi.abana)) * 0.55;
        bi.pernas.forEach((pv, k2) => { pv.rotation.x = andando ? Math.sin(t * 14 + (k2 === 0 || k2 === 3 ? 0 : Math.PI)) * 0.6 : 0; });
        const o = objetos.find(x => x.id === bi.id);
        if (o) o.ponto = [bi.pos.x + 0.55, bi.pos.z + 0.35];
      }

      // Balão com o que está fazendo (microinterações)
      const textoVisivel = decorando ? null : texto;
      const cabeca = proj(tmp.copy(onde).add(tmp2.set(0, deitar ? 0.55 : 2.34, 0)));
      const chave = textoVisivel ? `${textoVisivel}|${item ?? ''}|${pose ?? ''}|${Math.round(cabeca.x)}|${Math.round(cabeca.y)}` : '';
      if (chave !== ultimoBalao) { ultimoBalao = chave; setBalao(textoVisivel ? { x: cabeca.x, y: cabeca.y, texto: textoVisivel, item, pose } : null); }

      // Boia da piscina flutuando suavemente na água
      if (boiaPiscinaRef && tem('piscina')) {
        boiaPiscinaRef.position.y = 0.05 + Math.sin(agora * 0.0024) * 0.015;
        boiaPiscinaRef.rotation.z = Math.sin(agora * 0.0018) * 0.08;
      }

      // Microinterações 3D: porta da geladeira, luz interna, portão da frente e brilho da TV
      if (portaGeladeiraRef) {
        const alvoRot = agora < ateGeladeiraAberta ? -Math.PI * 0.42 : 0;
        portaGeladeiraRef.rotation.y += (alvoRot - portaGeladeiraRef.rotation.y) * Math.min(1, dt * 8);
      }
      if (luzGeladeiraRef) {
        luzGeladeiraRef.intensity = agora < ateGeladeiraAberta ? 1.1 : 0;
      }
      if (folhaPortaoRef) {
        const alvoPortao = agora < atePortaoAberto ? -Math.PI * 0.45 : 0;
        folhaPortaoRef.rotation.y += (alvoPortao - folhaPortaoRef.rotation.y) * Math.min(1, dt * 6);
      }
      if (luzTvRef) {
        luzTvRef.intensity = agora < ateTvAtiva ? 1.2 + Math.sin(agora * 0.018) * 0.25 : 0;
      }

      // Vida do lado de fora: carros, pedestres, cachorro e passarinhos
      atualizarMundoFora(dt, agora);
      microEfeitos.atualizar(agora);
      const tamanhoHorta=.45+vidaRef.current.horta.dias*.1833;
      for(const folha of folhasHorta) folha.obj.scale.lerp(tmp3.copy(folha.escala).multiplyScalar(tamanhoHorta),Math.min(1,dt*3));

      renderer.render(cena, camera);
    };
    laco();

    /* O que muda vindo do app */
    api.current = {
      setFoco: focar,
      setVisual: () => {
        modelo?.vestir(p.current.look, p.current.forma, p.current.humor);
        atualizarChama();
      },
      setDecoracao: () => {
        if(!originaisInicializados){originaisInicializados=true;
          const faltantes=[...originais].filter(([id])=>!p.current.mobilia.some(m=>m.item===`original:${id}`)).map(([id,o])=>({item:`original:${id}`,x:o.centro.x,z:o.centro.z}));
          if(faltantes.length) p.current.onMudarMobilia([...p.current.mobilia,...faltantes]);
        }
        montarDecoracao();
        aplicarAcabamentos(null);
        const moeda = objetos.find(o => o.id === 'moeda');
        if (moeda) moeda.grupo.visible = !p.current.achados.includes('dracma');
        for (const e of EXTRAS) { grupoExtra[e.id].visible = tem(e.item); lotes[e.id].visible = !tem(e.item); }
        for (const bi of bichos) bi.grupo.visible = tem(bi.id);
        calcularGrade();
        if (!cam.focoComodo) focar(p.current.foco);
        tingirCasa(cena.children.filter(o => o !== pivo && o !== chama), p.current.cor);
      },
      setCor: () => {
        aplicarAcabamentos(null);
        tingirCasa(cena.children.filter(o => o !== pivo && o !== chama), p.current.cor);
      },
      setAcao: a => {
        if (!a) return;
        const at = ATIVIDADES[a];
        if(a==='gratidao') microEfeitos.iniciar('gratidao',new THREE.Vector3(boneco.pos.x,1,boneco.pos.z));
        // Se registrou a atividade num móvel, faz do jeito certo ali (sentado lendo, tocando o violão...)
        const perto = ultimoObjeto && Math.hypot(boneco.pos.x - ultimoObjeto.ponto[0], boneco.pos.z - ultimoObjeto.ponto[1]) < 1.2 ? ultimoObjeto.id : null;
        const est = perto ? transformarAcao(perto,ESTILO_ATIVIDADE[perto] || {}) : {};
        const sentado = est.pose === 'sentado';
        const pose: Pose = est.pose ?? (a === 'ensaio' ? 'mexer' : at.pose);
        const item: ItemMao | undefined = est.item ?? (at.pose === 'livro' ? 'livro' : a === 'ensaio' && !perto ? 'violao' : undefined);
        fazer({
          pose, fones: at.fones, texto: at.feito, item,
          fechados: at.olhosFechados || (sentado && at.pose === 'orar'),
          lugar: est.lugar, frente: est.frente,
        });
      },
      girar: d => { cam.giroDesejado += d; },
      zoom: f => { cam.distDesejada = THREE.MathUtils.clamp(cam.distDesejada * f, 7, 28); },
      girarSel: () => {
        if (selIdx === null || !p.current.mobilia[selIdx]) return;
        const m = p.current.mobilia[selIdx];
        if (m.parede) return;
        const giro = ((m.giro ?? 0) + Math.PI / 2) % (Math.PI * 2);
        if(MOVEIS[m.item]?.tipo==='chao' && !cabeMovel({...m,giro},selIdx)) { avisarDica('Não há espaço para girar o móvel aqui.'); return; }
        const nova = p.current.mobilia.map((x, k) => (k === selIdx ? { ...x, giro } : x));
        p.current.onMudarMobilia(nova);
      },
      guardarSel: () => {
        if (selIdx === null || !p.current.mobilia[selIdx]) return;
        const original=idOriginal(p.current.mobilia[selIdx].item);
        const origem=original?originais.get(original):null;
        if(origem){const inicial={...p.current.mobilia[selIdx],x:origem.centro.x,z:origem.centro.z,giro:0};
          if(!cabeMovel(inicial,selIdx)){avisarDica('A posição original está ocupada. Mova o objeto que bloqueia o espaço.');return;}
          p.current.onMudarMobilia(p.current.mobilia.map((m,i)=>i===selIdx?inicial:m));return;
        }
        const nova = p.current.mobilia.filter((_, k) => k !== selIdx);
        selIdx = null;
        setSel(null);
        mostrarAnel(null);
        p.current.onMudarMobilia(nova);
      },
      limparSel: () => {
        selIdx = null;
        setSel(null);
        mostrarAnel(null);
      },
      aplicarNoFoco: (tipo, id) => {
        const cm = [...COMODOS, ...EXTRAS.filter(e => !e.aberto && tem(e.item))].find(c => c.id === p.current.foco);
        if (!cm) {
          avisarDica('Arraste o revestimento até um cômodo da casa (ou escolha um cômodo no topo)!');
          return;
        }
        const atual = p.current.acabamentos[cm.id] ?? {};
        p.current.onMudarAcabamento(cm.id, { ...atual, [tipo]: id || undefined });
        const nome = id ? (LOJA.find(i => i.id === id)?.nome ?? 'Revestimento') : 'Original';
        avisarDica(`${nome} aplicado em ${cm.nome}!`);
      },
      iniciarArrasto: (tipo, id, e) => {
        const nome = id ? (LOJA.find(i => i.id === id)?.nome ?? 'Item') : 'Original';
        arrastoBandeja = {
          pointerId: e.pointerId, tipo, id, nome,
          startX: e.clientX, startY: e.clientY, ativo: false,
          ultimoMovel: null, ultimoComodo: null,
        };
      },
      reiniciarTempo: () => { ultimo = performance.now(); },
    };
    api.current.setDecoracao();
    (api.current as unknown as { usar: (o: Obj, a: Acao) => void }).usar = (o, a) => {
      if(a.alvo?.startsWith('acao:')) { try { som.current?.desbloquear(); } catch { /* Audio unavailable; visual interactions remain usable. */ } }
      ultimoObjeto = { id: o.id, ponto: o.ponto };
      andarAte(o.ponto, () => {
        // Chegou: olha para o objeto
        const c = new THREE.Box3().setFromObject(o.grupo).getCenter(new THREE.Vector3());
        boneco.giro = Math.atan2(c.x - boneco.pos.x, c.z - boneco.pos.z);
        if (o.id === 'geladeira') ateGeladeiraAberta = performance.now() + 3200;
        if (o.id === 'portao') atePortaoAberto = performance.now() + 4000;
        if (o.id === 'tv' && a.alvo?.startsWith('acao:tv:')) {
          ateTvAtiva = performance.now() + 60000;
          const canal=a.alvo.split(':')[2]; setCanalTv(canal);
          const cor=canal==='louvor'?'#429BD1':canal==='terrasanta'?'#D7B272':'#8CA78B';
          const mt=telaTvRef?.material as THREE.MeshStandardMaterial | undefined;
          if(mt){mt.color.set(cor);mt.emissive.set(cor);mt.emissiveIntensity=.65;}
          if(canal==='louvor'){som.current?.musica();setTocandoSom(true);}
        }
        if(a.alvo==='acao:correio') {carteiro.entrega=true;carteiro.destino=2.5;avisarDica('O carteiro está chegando pelo bairro.');}
        if(a.alvo==='acao:portao' || a.alvo==='atividade:gentileza') {
          const vizinho=pedestres.filter(p=>p.grupo.position.z<14).sort((a,b)=>Math.abs(a.pos-2.5)-Math.abs(b.pos-2.5))[0];
          if(vizinho) vizinho.saudacaoAte=performance.now()+6500;
        }
        if(a.alvo==='acao:radio'){som.current?.musica();setTocandoSom(true);}
        if(a.alvo==='acao:chaleira'){som.current?.chaleira();microEfeitos.iniciar('vapor',c.clone().add(new THREE.Vector3(0,.4,0)));}
        if(a.item==='regador' || a.alvo==='acao:espelho_lavar' || a.alvo==='acao:piscina_ducha') microEfeitos.iniciar('agua',new THREE.Vector3(boneco.pos.x+.15,1.1,boneco.pos.z+.2));
        if(o.id==='horta' && a.item==='regador') {
          const nova=regarHorta(vidaRef.current,diaLocal());
          if(salvarVida(nova)) avisarDica(nova.horta.dias===3?'Horta crescida! Você já pode colher.':`Horta cuidada: ${nova.horta.dias}/3 dias de crescimento.`);
        }
        if(o.id==='horta' && a.rotulo==='Colher verduras') {
          if(vidaRef.current.horta.dias<3){avisarDica('Cuide da horta em três dias para colher.');return;}
          if(salvarVida({...vidaRef.current,horta:{dias:0,ultimaRega:diaLocal()}})) avisarDica('Colheita feita! Amanhã começa um novo ciclo.');
        }
        if(a.alvo==='acao:fonte') som.current?.agua();
        if (a.alvo) {
          p.current.onUsar(a.alvo);
          if (a.alvo === 'segredo:dracma') o.grupo.visible = false;
        }
        if (a.pose || a.deitar) fazer({ pose: a.pose ?? 'baixo', texto: a.texto, lugar: a.lugar, deitar: a.deitar, frente: a.frente, fechados: a.fechados, item: a.item, fones: a.fones }, 10);
      });
    };

    return () => {
      som.current?.descartar();
      vivo = false;
      if (timerDica.current) clearTimeout(timerDica.current);
      cancelAnimationFrame(quadro);
      obs.disconnect();
      window.removeEventListener('pointermove', moverBandeja);
      window.removeEventListener('pointerup', finalizarBandeja);
      window.removeEventListener('pointercancel', finalizarBandeja);
      tela.removeEventListener('pointerdown', aoDescer);
      tela.removeEventListener('pointermove', aoMover);
      tela.removeEventListener('pointerup', aoSubir);
      tela.removeEventListener('pointercancel', aoSubir);
      tela.removeEventListener('wheel', aoRodar);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      modelo?.descartar();
      pedestres.forEach(p => p.modelo?.descartar());
      coracaoTextura.dispose();
      pedestres.forEach(p=>{const spr=p.grupo.getObjectByName('reacao') as THREE.Sprite; spr?.material.dispose();});
      donoCachorro.modelo?.descartar();
      limparGrupo(cena);
      renderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
      renderer.dispose();
      tela.remove();
    };
  }, [salvarVida]);

  useEffect(() => {
    som.current?.pausar(!!props.pausado);
    if (!props.pausado) api.current?.reiniciarTempo();
  }, [props.pausado]);

  useEffect(() => { api.current?.setFoco(props.foco); }, [props.foco]);
  useEffect(() => { api.current?.setVisual(); }, [JSON.stringify(props.look), props.forma, props.humor]);
  useEffect(() => { api.current?.setDecoracao(); }, [JSON.stringify(props.mobilia), JSON.stringify(props.acabamentos), props.itens.join(','), props.achados.join(',')]);
  useEffect(() => { api.current?.setAcao(props.acao); }, [props.acao]);
  useEffect(() => { api.current?.setCor(); }, [props.cor]);
  useEffect(() => {
    if (props.decorando) setMenu(null);
    else api.current?.limparSel();
  }, [props.decorando]);

  const usar = (o: Obj, a: Acao) => {
    setMenu(null);
    (api.current as unknown as { usar: (o: Obj, a: Acao) => void })?.usar(o, a);
  };
  const fonte = 'Archivo_700Bold, Archivo, system-ui, sans-serif';
  const fonteTitulo = 'BarlowCondensed_800ExtraBold, Archivo_700Bold, system-ui, sans-serif';
  const botao: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 20, border: '2px solid #FFFFFF', background: 'rgba(34, 24, 46, 0.62)', color: '#FFFFFF',
    fontSize: 19, fontFamily: fonte, cursor: 'pointer', boxShadow: '0 4px 12px rgba(20,10,28,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(6px)',
  };

  const temItem = (it: Item) => it.preco === 0 || props.itens.includes(it.id);
  const focosDec = [
    { id: 'casa', nome: 'Casa toda' },
    { id: 'quarto', nome: 'Quarto' },
    { id: 'sala', nome: 'Sala' },
    { id: 'estudo', nome: 'Estudo' },
    { id: 'cozinha', nome: 'Cozinha' },
    { id: 'banheiro', nome: 'Banheiro' },
    ...EXTRAS.filter(e => props.itens.includes(e.item)).map(e => ({
      id: e.id,
      nome: e.id === 'estudio' ? 'Estúdio' : e.id === 'jardim' ? 'Jardim' : e.id === 'piscina' ? 'Piscina' : e.id === 'garagem' ? 'Garagem' : e.id === 'varanda' ? 'Varanda' : 'Academia',
    })),
  ];
  const itensAba: Item[] = abaDec === 'tema'
    ? []
    : LOJA.filter(i => {
      if (abaDec === 'papel' || abaDec === 'piso') return i.tipo === abaDec;
      return i.tipo === 'movel' && i.vaga === abaDec && servePara(i, props.look.corpo);
    }).sort((a, b) => Number(temItem(b)) - Number(temItem(a)) || a.nivel - b.nivel || a.preco - b.preco);

  return (
    <div ref={raiz} style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      {!!erroVida&&!cartaAberta&&<div role="alert" style={{position:'absolute',top:110,left:16,right:16,zIndex:40,padding:14,borderRadius:14,background:'#fff4e9',color:'#854936'}}>{erroVida}</div>}
      {cartaAberta && <div role="dialog" aria-label="Carta bíblica" style={{position:'absolute',inset:'15% 10%',zIndex:35,maxWidth:420,margin:'auto',height:'fit-content',padding:28,borderRadius:24,background:'#fffaf0',color:'#45584d',boxShadow:'0 20px 80px #16312855'}}>
        <button aria-label="Fechar carta" onClick={()=>setCartaAberta(false)} style={{float:'right',border:0,background:'transparent',cursor:'pointer'}}>✕</button>
        {!!erroVida&&<p role="alert">{erroVida}</p>}
        <small>CORREIO DO BAIRRO · {new Date().toLocaleDateString('pt-BR')}</small>
        <h2>Uma palavra para hoje</h2>
        <p style={{fontSize:22,lineHeight:1.6}}>“{desafioDoDia().texto}”</p><p>{desafioDoDia().referencia}</p>
        <p style={{lineHeight:1.7}}>Leve esta palavra com você. Hoje, dedique alguns minutos a um vizinho: pergunte como ele está e escute com atenção.</p>
        <details style={{maxHeight:180,overflowY:'auto',marginBottom:16}}><summary>Cartas guardadas ({vida.cartas.length})</summary>{vida.cartas.map(c=><article key={c.dia}><small>{c.dia}</small><p>{c.texto} — {c.referencia}</p></article>)}</details>
        <button onClick={()=>{setCartaAberta(false);p.current.onUsar('atividade:memorizacao');}} style={{border:0,borderRadius:16,padding:14,background:'#d8e7c7',cursor:'pointer'}}>Praticar este versículo</button>
      </div>}
      {tocandoSom && <div style={{position:'absolute',right:16,top:100,zIndex:25,background:'rgba(247,253,250,.96)',borderRadius:18,padding:12,display:'flex',gap:10,alignItems:'center',boxShadow:'0 6px 24px #183d3822'}}>
        <button aria-label="Desligar música" onClick={()=>{som.current?.parar();setTocandoSom(false);}} style={{border:0,background:'#d9ebe3',borderRadius:12,padding:8,cursor:'pointer'}}>♫ Parar</button>
        <input aria-label="Volume da música" type="range" min="0" max="1" step=".01" value={volumeSom} onChange={e=>{const v=Number(e.target.value);setVolumeSom(v);som.current?.ajustar(v);}} style={{width:90}}/>
      </div>}
      {canalTv && <div role="dialog" aria-label="Televisão" style={{position:'absolute',right:16,top:160,zIndex:25,width:'min(290px,calc(100% - 32px))',padding:20,boxSizing:'border-box',borderRadius:22,background:'#f6fbf7',color:'#294c50',boxShadow:'0 10px 40px #183d3833'}}>
        <button aria-label="Fechar televisão" onClick={()=>setCanalTv(null)} style={{float:'right',border:0,background:'transparent',cursor:'pointer'}}>✕</button>
        <small>FAITH TV · {canalTv==='louvor'?'MÚSICA':canalTv==='terrasanta'?'TERRA SANTA':'MENSAGEM DO DIA'}</small>
        <h3>{canalTv==='louvor'?'Pausa para louvar':canalTv==='terrasanta'?'Paisagens da Bíblia':'Um passo de cada vez'}</h3>
        <p style={{fontSize:14,lineHeight:1.65}}>{canalTv==='louvor'?'Instrumental original para acompanhar seu momento de oração. Ajuste o volume no controle de música.':canalTv==='terrasanta'?'O mar da Galileia é um lago de água doce cercado por colinas. Seus barcos, margens e vilas aparecem nos relatos dos Evangelhos. Leia Marcos 4:35–41 e imagine a travessia.':'“Deus é amor.” — 1 João 4:8. Escolha hoje um gesto simples de cuidado: escutar alguém, agradecer ou oferecer ajuda.'}</p>
        <div style={{display:'flex',gap:6}}>{['louvor','terrasanta','mensagem'].map(c=><button key={c} onClick={()=>{setCanalTv(c);if(c==='louvor'){som.current?.desbloquear();som.current?.musica();setTocandoSom(true);}}} style={{flex:1,border:0,borderRadius:10,padding:7,background:c===canalTv?'#cde6ca':'#e7efeb',cursor:'pointer'}}>{c==='louvor'?'Louvor':c==='terrasanta'?'Lugares':'Mensagem'}</button>)}</div>
      </div>}
      <style>{`
        @keyframes popPensamento {
          0% { transform: translate(-50%, -75%) scale(0.4); opacity: 0; }
          65% { transform: translate(-50%, -105%) scale(1.12); opacity: 1; }
          100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
        }
        @keyframes flutuarPensamento {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes balancoMusica {
          0%, 100% { transform: rotate(-10deg) scale(1); }
          50% { transform: rotate(12deg) scale(1.18); }
        }
        @keyframes notaFlutuante1 {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          30% { opacity: 0.95; }
          100% { transform: translate(-14px, -22px) scale(1.15) rotate(-15deg); opacity: 0; }
        }
        @keyframes notaFlutuante2 {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
          35% { opacity: 0.95; }
          100% { transform: translate(16px, -24px) scale(1.2) rotate(18deg); opacity: 0; }
        }
        @keyframes fumacinhaBalao {
          0% { transform: translate(0, 0) scale(0.7); opacity: 0.3; }
          50% { opacity: 0.85; }
          100% { transform: translate(4px, -14px) scale(1.3); opacity: 0; }
        }
        @keyframes oracaoPulso {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(242, 201, 76, 0.4)); }
          50% { transform: scale(1.16); filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.85)); }
        }
        @keyframes felicidadeGlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(4deg); }
        }
        @keyframes cozinharPulo {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-6deg); }
        }
      `}</style>
      <div style={{ position: 'absolute', right: 12, top: props.decorando ? '36%' : '42%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 4 }}>
        <button aria-label="Girar para a esquerda" style={botao} onClick={() => api.current?.girar(-Math.PI / 4)}>⟲</button>
        <button aria-label="Girar para a direita" style={botao} onClick={() => api.current?.girar(Math.PI / 4)}>⟳</button>
        <button aria-label="Aproximar" style={botao} onClick={() => api.current?.zoom(0.8)}>+</button>
        <button aria-label="Afastar" style={botao} onClick={() => api.current?.zoom(1.25)}>−</button>
      </div>
      {balao && !props.decorando && (() => {
        const info = extrairInfoBalao(balao.texto, balao.item, balao.pose);
        return (
          <div
            key={balao.texto}
            style={{
              position: 'absolute',
              left: balao.x,
              top: balao.y - 12,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 8,
              animation: 'popPensamento 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            }}
          >
            {/* Balão principal estilo The Sims / Animal Crossing */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.98)',
                borderRadius: 22,
                padding: '5px 13px 5px 9px',
                boxShadow: '0 8px 24px rgba(42, 10, 49, 0.22), 0 2px 6px rgba(0,0,0,0.06)',
                border: '2px solid #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                animation: 'flutuarPensamento 2.4s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: info.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  flexShrink: 0,
                }}
              >
                <span style={{ display: 'inline-block', animation: info.animIcone }}>
                  {info.icone}
                </span>
                {/* Microinteração: notas musicais flutuantes */}
                {info.notas && (
                  <>
                    <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 13, color: '#FE0472', animation: 'notaFlutuante1 1.8s ease-in-out infinite' }}>♪</span>
                    <span style={{ position: 'absolute', top: -8, left: -6, fontSize: 12, color: '#1A88BE', animation: 'notaFlutuante2 2.1s ease-in-out 0.6s infinite' }}>♫</span>
                  </>
                )}
                {/* Microinteração: fumacinha saindo da frigideira */}
                {info.fumaca && (
                  <span style={{ position: 'absolute', top: -11, left: 10, fontSize: 12, animation: 'fumacinhaBalao 1.6s ease-in-out infinite' }}>♨️</span>
                )}
              </div>
              <span
                style={{
                  fontFamily: fonte,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#42124C',
                  letterSpacing: -0.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {info.textoLimpo}
              </span>
            </div>

            {/* Rastro clássico de bolinhas de pensamento */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FFFFFF', boxShadow: '0 2px 5px rgba(0,0,0,0.12)' }} />
              <div style={{ width: 5, height: 5, borderRadius: 2.5, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }} />
            </div>
          </div>
        );
      })()}
      {menu && !props.decorando && (
        <div style={{
          position: 'absolute',
          left: Math.max(12, Math.min(menu.x, (raiz.current?.clientWidth ?? 400) - 230)),
          top: Math.max(12, Math.min(menu.y - 20, (raiz.current?.clientHeight ?? 600) - 180)),
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', zIndex: 6,
        }}>
          <div style={{ fontFamily: fonte, fontSize: 13, color: '#7D6A7F', background: 'rgba(255,255,255,0.92)', padding: '4px 10px', borderRadius: 10 }}>{menu.obj.nome}</div>
          {menu.obj.acoes.map(a => (
            <button
              key={a.rotulo}
              onClick={() => usar(menu.obj, a)}
              style={{
                fontFamily: fonte, fontSize: 15, lineHeight: '20px', padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
                border: a.alvo?.startsWith('atividade') ? 'none' : '1.5px solid #EADFD3',
                background: a.alvo?.startsWith('atividade') ? props.cor : '#FFFFFF', color: a.alvo?.startsWith('atividade') ? '#FFFFFF' : '#42124C',
                boxShadow: '0 6px 18px rgba(42,10,49,0.16)', whiteSpace: 'nowrap',
              }}
            >
              {a.rotulo}
            </button>
          ))}
          {!menu.obj.acoes.length && <div style={{ fontFamily: fonte, fontSize: 13, color: '#42124C', background: '#FFFFFF', padding: '8px 12px', borderRadius: 12 }}>Nada para fazer aqui.</div>}
        </div>
      )}

      {props.decorando && (
        <>
          {/* Barra superior do Modo Construir / Decorar */}
          <div style={{
            position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, pointerEvents: 'none',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', pointerEvents: 'auto',
              background: 'rgba(30, 22, 42, 0.72)', padding: '5px 8px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)', maxWidth: 'calc(100% - 175px)', touchAction: 'pan-x',
            }}>
              {focosDec.map(f => {
                const ativo = props.foco === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => props.onFoco(f.id)}
                    style={{
                      fontFamily: fonte, fontSize: 12, padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: ativo ? '#1A88BE' : 'transparent', color: '#FFFFFF', whiteSpace: 'nowrap',
                    }}
                  >
                    {f.nome}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(30, 22, 42, 0.75)', color: '#FFFFFF',
                padding: '6px 12px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.85)', fontFamily: fonteTitulo, fontSize: 17,
              }}>
                <span style={{ width: 18, height: 18, borderRadius: 9, background: '#58C93A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: fonte }}>T</span>
                {props.talentos}
              </div>
              <button
                onClick={() => props.onFecharDecorar()}
                style={{
                  fontFamily: fonteTitulo, fontSize: 18, letterSpacing: 0.3, padding: '8px 18px', borderRadius: 999, cursor: 'pointer',
                  background: '#52C43A', color: '#FFFFFF', border: '2.5px solid #FFFFFF', boxShadow: '0 4px 14px rgba(20,10,30,0.28)',
                  whiteSpace: 'nowrap',
                }}
              >
                ✓ Pronto
              </button>
            </div>
          </div>

          {/* Dica rápida no topo */}
          {dicaDec && (
            <div style={{
              position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)', zIndex: 11, pointerEvents: 'none',
              background: 'rgba(34, 20, 44, 0.88)', color: '#FFFFFF', fontFamily: fonte, fontSize: 13, padding: '7px 16px',
              borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.6)', whiteSpace: 'nowrap',
            }}>
              {dicaDec}
            </div>
          )}

          {/* Barra flutuante sobre o móvel selecionado na cena */}
          {sel && !arrastandoItem && (
            <div style={{
              position: 'absolute',
              left: Math.max(135, Math.min((raiz.current?.clientWidth ?? 400) - 135, sel.x)),
              top: Math.max(66, Math.min((raiz.current?.clientHeight ?? 600) - 220, sel.y)),
              transform: 'translate(-50%, -100%)', zIndex: 9,
              display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(30, 22, 42, 0.92)', padding: '6px 10px',
              borderRadius: 999, border: '2px solid #FFFFFF', boxShadow: '0 6px 18px rgba(20,10,30,0.3)',
            }}>
              <span style={{ fontFamily: fonte, fontSize: 12, color: '#FFFFFF', padding: '0 6px', whiteSpace: 'nowrap' }}>{sel.nome}</span>
              {!sel.parede && (
                <>
                  <button
                    onClick={() => api.current?.girarSel()}
                    style={{
                      fontFamily: fonte, fontSize: 12, padding: '5px 11px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: '#1A88BE', color: '#FFFFFF', whiteSpace: 'nowrap',
                    }}
                  >
                    ↻ Girar 90°
                  </button>
                  <button
                    onClick={() => setPassoGrid(g => (g === 0.5 ? 0.25 : 0.5))}
                    style={{
                      fontFamily: fonte, fontSize: 12, padding: '5px 11px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: '#3B4F6B', color: '#FFFFFF', whiteSpace: 'nowrap',
                    }}
                  >
                    Grid: {passoGrid}m
                  </button>
                </>
              )}
              <button
                onClick={() => api.current?.guardarSel()}
                style={{
                  fontFamily: fonte, fontSize: 12, padding: '5px 11px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: '#E04F3E', color: '#FFFFFF', whiteSpace: 'nowrap',
                }}
              >
                {idOriginal(props.mobilia[sel.idx]?.item??'')?'↶ Posição original':'📦 Guardar'}
              </button>
            </div>
          )}

          {/* Etiqueta que acompanha o dedo durante o drag */}
          {arrastandoItem && (
            <div style={{
              position: 'absolute', left: arrastandoItem.x, top: Math.max(24, arrastandoItem.y - 44), transform: 'translate(-50%, -100%)',
              pointerEvents: 'none', zIndex: 15, fontFamily: fonte, fontSize: 12, color: '#FFFFFF',
              background: arrastandoItem.ok ? '#2E9E44' : '#D94336', padding: '6px 13px', borderRadius: 999,
              border: '2px solid #FFFFFF', boxShadow: '0 4px 14px rgba(0,0,0,0.28)', whiteSpace: 'nowrap',
            }}>
              {arrastandoItem.nome}
            </div>
          )}

          {/* Bandeja inferior de Construção & Decoração (estilo The Sims Mobile) */}
          <div
            ref={bandejaRef}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
              background: 'rgba(246, 243, 238, 0.97)', borderTop: '3px solid #FFFFFF',
              boxShadow: '0 -8px 26px rgba(26, 12, 34, 0.24)', padding: '8px 12px 12px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, overflowX: 'auto', touchAction: 'pan-x' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {([
                  ['chao', 'Móveis'],
                  ['tapete', 'Tapetes'],
                  ['parede', 'Quadros & TV'],
                  ['papel', 'Papel de parede'],
                  ['piso', 'Pisos'],
                  ['tema', 'Cores'],
                ] as [AbaDecorar, string][]).map(([id, rotulo]) => {
                  const ativo = abaDec === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setAbaDec(id)}
                      style={{
                        fontFamily: fonte, fontSize: 12, padding: '6px 13px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
                        border: ativo ? '2px solid #FFFFFF' : '1.5px solid #DFD5C8',
                        background: ativo ? '#1A88BE' : '#FFFFFF', color: ativo ? '#FFFFFF' : '#42124C',
                        boxShadow: ativo ? '0 3px 8px rgba(26,136,190,0.3)' : 'none',
                      }}
                    >
                      {rotulo}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontFamily: fonte, fontSize: 11, color: '#7D6A7F', whiteSpace: 'nowrap', paddingRight: 4 }}>
                {abaDec === 'tema' ? 'Toque numa cor para mudar os detalhes' : 'Arraste para a casa • Toque nos móveis da casa para mover'}
              </span>
            </div>

            {abaDec === 'tema' ? (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '6px 2px', touchAction: 'pan-x' }}>
                {CORES_CASA.map(([c, nomeCor]) => {
                  const ativo = props.cor === c;
                  return (
                    <button
                      key={c}
                      onClick={() => props.onCor(c)}
                      style={{
                        flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '10px 14px', borderRadius: 14, cursor: 'pointer', background: '#FFFFFF',
                        border: ativo ? '2.5px solid #1A88BE' : '1.5px solid #E4D6C6',
                      }}
                    >
                      <span style={{ width: 34, height: 34, borderRadius: 17, background: c, border: '2.5px solid #FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }} />
                      <span style={{ fontFamily: fonte, fontSize: 12, color: '#42124C' }}>{nomeCor}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 2px 4px', touchAction: 'pan-x' }}>
                {(abaDec === 'papel' || abaDec === 'piso') && (
                  <div
                    onPointerDown={e => api.current?.iniciarArrasto(abaDec, '', e)}
                    onClick={() => api.current?.aplicarNoFoco(abaDec, '')}
                    style={{
                      flex: '0 0 96px', background: '#FFFFFF', borderRadius: 14, padding: 8, cursor: 'grab',
                      border: '1.5px solid #DFD5C8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      touchAction: 'pan-x',
                    }}
                  >
                    <div
                      style={{ width: 58, height: 58, borderRadius: 10, background: '#F4EDE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      dangerouslySetInnerHTML={{ __html: icone('casa', '#6A4A6E', 2) }}
                    />
                    <div style={{ fontFamily: fonte, fontSize: 11, color: '#42124C', textAlign: 'center', lineHeight: '14px' }}>Original do cômodo</div>
                    <div style={{ marginTop: 'auto', fontFamily: fonte, fontSize: 10, color: '#2E9E44' }}>Arraste / toque</div>
                  </div>
                )}
                {itensAba.map(item => {
                  const possuiEste = temItem(item);
                  const svg = item.tipo === 'movel'
                    ? tingirSvg(movelSvg(item.id), props.cor)
                    : tingirSvg(revestimentoSvg(item.id), props.cor);
                  const qtdCasa = item.tipo === 'movel' ? props.mobilia.filter(m => m.item === item.id).length : 0;
                  const faltaNivel = item.nivel > props.nivel;
                  const podeComprar = !possuiEste && !faltaNivel && props.talentos >= item.preco;
                  return (
                    <div
                      key={item.id}
                      onPointerDown={possuiEste ? e => api.current?.iniciarArrasto(item.tipo === 'movel' ? 'movel' : abaDec as 'papel' | 'piso', item.id, e) : undefined}
                      onClick={() => {
                        if (!possuiEste) {
                          if (podeComprar) props.onComprar(item.id);
                          else avisarDica(faltaNivel ? `Libera no nível ${item.nivel}` : `Faltam ${item.preco - props.talentos} talentos`);
                          return;
                        }
                        if (abaDec === 'papel' || abaDec === 'piso') api.current?.aplicarNoFoco(abaDec, item.id);
                        else avisarDica('Segure e arraste para cima até a casa!');
                      }}
                      style={{
                        flex: '0 0 98px', background: '#FFFFFF', borderRadius: 14, padding: 8,
                        cursor: possuiEste ? 'grab' : podeComprar ? 'pointer' : 'default',
                        border: possuiEste ? '2px solid #BCE5C5' : '1.5px solid #E4D6C6',
                        opacity: !possuiEste && !podeComprar ? 0.68 : 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative',
                        touchAction: 'pan-x',
                      }}
                    >
                      {qtdCasa > 0 && (
                        <span style={{
                          position: 'absolute', top: 5, right: 5, background: '#1A88BE', color: '#FFFFFF',
                          fontFamily: fonte, fontSize: 10, padding: '1px 6px', borderRadius: 999,
                        }}>
                          ×{qtdCasa}
                        </span>
                      )}
                      <div
                        style={{ width: 58, height: 58, borderRadius: 10, background: '#F7F2EB', overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                      <div style={{
                        fontFamily: fonte, fontSize: 11, color: '#42124C', textAlign: 'center', lineHeight: '13px',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {item.nome}
                      </div>
                      <div style={{
                        marginTop: 'auto', width: '100%', textAlign: 'center', fontFamily: fonte, fontSize: 10,
                        padding: '3px 4px', borderRadius: 999,
                        background: possuiEste ? '#E7F7EB' : podeComprar ? props.cor : '#EFE8DF',
                        color: possuiEste ? '#258539' : podeComprar ? '#FFFFFF' : '#7D6A7F',
                      }}>
                        {possuiEste ? 'Arrastar' : faltaNivel ? `Nível ${item.nivel}` : `Comprar • ${item.preco}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
