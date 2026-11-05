import * as THREE from 'three';

// A trama só altera o relevo: a cor escolhida continua sendo a cor do tecido.
const tramas=new Map<string,THREE.DataTexture>();
export function tramaTecido(tipo:'malha'|'sarja') {
 const existente=tramas.get(tipo);if(existente)return existente;
 const lado=32,dados=new Uint8Array(lado*lado*4);
 for(let y=0;y<lado;y++)for(let x=0;x<lado;x++){
  const v=tipo==='sarja'?(((x+y)%4<2)?156:118):((x%4===0||y%4===0)?118:150);
  const i=(y*lado+x)*4;dados.set([v,v,v,255],i);
 }
 const tx=new THREE.DataTexture(dados,lado,lado,THREE.RGBAFormat);
 tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(12,12);tx.magFilter=THREE.LinearFilter;tx.minFilter=THREE.LinearMipmapLinearFilter;tx.generateMipmaps=true;tx.needsUpdate=true;
 tx.userData.compartilhada=true;tramas.set(tipo,tx);return tx;
}
export function acabamentoRoupa(id:string):{roughness:number;trama:'malha'|'sarja';relevo:number}{
 if(['camisa','blazer','calcaSocial','vestido','vestidoLongo'].includes(id))return {roughness:.72,trama:'sarja',relevo:.001};
 if(['calca','macacaoJardim','jaqueta'].includes(id))return {roughness:.88,trama:'sarja',relevo:.002};
 return {roughness:.96,trama:'malha',relevo:.0015};
}

// Os GLBs otimizados não trazem UVs. A projeção é calculada uma vez por geometria.
export function prepararUvTecido(geo:THREE.BufferGeometry){
 if(geo.hasAttribute('uv'))return;
 const p=geo.getAttribute('position'),n=geo.getAttribute('normal');
 const uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const nx=Math.abs(n?.getX(i)??0),ny=Math.abs(n?.getY(i)??0),nz=Math.abs(n?.getZ(i)??1);
  uv[i*2]=nx>nz?p.getZ(i):p.getX(i);
  uv[i*2+1]=ny>Math.max(nx,nz)?p.getZ(i):p.getY(i);
 }
 geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}
