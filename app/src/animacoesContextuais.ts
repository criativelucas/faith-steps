import * as THREE from 'three';

/** Ciclos específicos com pés estáveis; preserva a pose e as proporções de cada rig. */
export function adicionarAnimacoesContextuais(clipes: Map<string,THREE.AnimationClip>) {
 const parado=clipes.get('parado');if(!parado)return;
 const gerar=(nome:string,duracao:number,movimentos:Record<string,(t:number)=>[number,number,number]>,base=parado)=>{
  const tracks=base.tracks.map(track=>{
   const tamanho=track.getValueSize(),osso=track.name.split('.')[0],mover=movimentos[osso];
   if(track.name.endsWith('.quaternion')&&mover){
    const tempos:number[]=[],valores:number[]=[],q0=new THREE.Quaternion().fromArray(track.values),q=new THREE.Quaternion();
    for(let i=0;i<=32;i++) {const t=i/32;const [x,y,z]=mover(t);q.copy(q0).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)));tempos.push(t*duracao);valores.push(q.x,q.y,q.z,q.w);}
    return new THREE.QuaternionKeyframeTrack(track.name,tempos,valores);
   }
   const copia=track.clone();copia.times=new Float32Array([0,duracao]);copia.values=new Float32Array([...track.values.slice(0,tamanho),...track.values.slice(0,tamanho)]);return copia;
  });
  clipes.set(nome,new THREE.AnimationClip(nome,duracao,tracks));
 };
 const onda=(t:number)=>Math.sin(t*Math.PI*2);
 gerar('pesos',2.4,{lowerarm_l:t=>[-.8-.5*onda(t),0,0],lowerarm_r:t=>[-.8-.5*onda(t),0,0],upperarm_l:()=>[.12,0,-.12],upperarm_r:()=>[.12,0,.12]});
 gerar('alongar',4,{spine_01:t=>[.08,0,.15*onda(t)],upperarm_l:t=>[0,0,-.65-.12*onda(t)],upperarm_r:t=>[0,0,.65+.12*onda(t)]});
 gerar('nadar',2,{upperarm_l:t=>[-.8+.4*onda(t),0,-.35],upperarm_r:t=>[-.8-.4*onda(t),0,.35],lowerarm_l:t=>[-.5-.3*onda(t),0,0],lowerarm_r:t=>[-.5+.3*onda(t),0,0],thigh_l:t=>[.2*onda(t),0,0],thigh_r:t=>[-.2*onda(t),0,0]});
 gerar('teclado',1.2,{upperarm_l:()=>[-.45,0,-.15],upperarm_r:()=>[-.45,0,.15],lowerarm_l:t=>[-.7+.09*onda(t),0,0],lowerarm_r:t=>[-.7-.09*onda(t),0,0]});
 gerar('regar',2.8,{upperarm_r:()=>[-.45,0,.15],lowerarm_r:t=>[-.55+.1*onda(t),0,.12],spine_01:t=>[.04+.02*onda(t),0,0]});
}
