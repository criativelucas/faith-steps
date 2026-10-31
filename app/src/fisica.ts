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
 if(/pedal|bicic/i.test(texto) || /bicic/i.test(item || '')) return 'pedalar';
 if(item==='microfone') return 'cantar';
 if(/esteira|corrid/i.test(texto) || /esteira/i.test(item || '')) return 'correr';
 if(/polichinelo|exercicio/i.test(texto)) return 'exercicio';
 if(pose==='correr') return 'correr';
 return pose;
}
export const AJUSTE_ASSENTO = 0;
