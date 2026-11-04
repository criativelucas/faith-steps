import * as THREE from 'three';

export type AreaEdicao = [number,number,number,number];
export const TERRENO_EDICAO: AreaEdicao = [-6.1,-6.5,18.7,12.1];
export const areasSobrepostas = (a: AreaEdicao,b: AreaEdicao) => a[0]<b[2]-.015 && a[2]>b[0]+.015 && a[1]<b[3]-.015 && a[3]>b[1]+.015;
export function validarAreaEdicao(area: AreaEdicao, obstaculos: AreaEdicao[]) {
  const [x0,z0,x1,z1]=TERRENO_EDICAO;
  return area.every(Number.isFinite) && area[0]>=x0 && area[1]>=z0 && area[2]<=x1 && area[3]<=z1 && !obstaculos.some(b=>areasSobrepostas(area,b));
}

export function criarGradeEdicao(passo: .25|.5) {
  const grupo=new THREE.Group();grupo.name='Grade do terreno';
  const [x0,z0,x1,z1]=TERRENO_EDICAO;
  const finas:number[]=[],principais:number[]=[];
  for(let x=Math.ceil(x0/passo)*passo;x<=x1;x+=passo) (Math.abs(x-Math.round(x))<.001?principais:finas).push(x,.095,z0,x,.095,z1);
  for(let z=Math.ceil(z0/passo)*passo;z<=z1;z+=passo) (Math.abs(z-Math.round(z))<.001?principais:finas).push(x0,.095,z,x1,.095,z);
  for(const [pontos,opacity] of [[finas,.28],[principais,.65]] as const) {
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pontos,3));
    const linhas=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#D5FFF0',transparent:true,opacity,depthWrite:false}));
    linhas.raycast=()=>{};grupo.add(linhas);
  }
  return grupo;
}
