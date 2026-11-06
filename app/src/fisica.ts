export type Obstaculo = [number, number, number, number];
// Swept disc against expanded footprints, including endpoints and short steps.
export function segmentoBloqueado(ax:number,az:number,bx:number,bz:number,obstaculos:Obstaculo[],raio=.22):boolean {
 return obstaculos.some(([x0,z0,x1,z1])=>{
  const minX = Math.min(x0, x1) - raio, maxX = Math.max(x0, x1) + raio;
  const minZ = Math.min(z0, z1) - raio, maxZ = Math.max(z0, z1) + raio;
  let entrada=0,saida=1;
  for(const [a,d,min,max] of [[ax,bx-ax,minX,maxX],[az,bz-az,minZ,maxZ]]){
   if(Math.abs(d)<1e-9){if(a<=min||a>=max)return false;continue;}
   const t0=(min-a)/d,t1=(max-a)/d;
   entrada=Math.max(entrada,Math.min(t0,t1));saida=Math.min(saida,Math.max(t0,t1));
   if(entrada>saida)return false;
  }
  return entrada<=saida;
 });
}
export function animacaoContextual(pose:string,texto='',item?:string):string {
 // Caminhar até uma atividade não deve acionar seu ciclo antes da chegada.
 if(pose==='andar' && !/nadando|nadar|correndo|corrida/i.test(texto)) return 'andar';
 if(item==='halteres') return 'pesos';
 if(item==='regador') return 'regar';
 if(/nadando|nadar/i.test(texto)) return 'nadar';
 if(/along/i.test(texto)) return 'alongar';
 if(/teclado|piano/i.test(texto)) return 'teclado';
 if(item==='coco'||item==='maca'||item==='copo'||item==='colher') return pose==='sentado'?'sentado':'comer';
 if(pose==='sentado' && (/pedal|bicic/i.test(texto) || /bicic/i.test(item || ''))) return 'pedalar'; // em pé mexendo na bicicleta não pedala
 if(item==='microfone') return 'cantar';
 if(/esteira|corrid/i.test(texto) || /esteira/i.test(item || '')) return 'correr';
 if(/polichinelo|exercicio/i.test(texto)) return 'exercicio';
 if(pose==='correr') return 'correr';
 return pose;
}
export const AJUSTE_ASSENTO = 0;
