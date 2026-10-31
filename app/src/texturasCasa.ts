import * as THREE from 'three';
import { tingir } from './cores.ts';
const ROSA='#FFD1E6';
export function textura(desenhar: (c: CanvasRenderingContext2D, t: number) => void, tamanho = 256, repetir = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tamanho;
  desenhar(cv.getContext('2d')!, tamanho);
  const tx = new THREE.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.repeat.set(repetir, repetir);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
export const escurecer = (hex: string, t: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#1A0420'), t).getHexString();
export const clarear = (hex: string, t: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#FFFFFF'), t).getHexString();

export function texturaPapel(id: string, corTema: string): { tx: THREE.CanvasTexture; roughness: number } {
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

export function texturaRevestimentoPiso(id: string, corTema: string): { tx: THREE.CanvasTexture; roughness: number } {
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

