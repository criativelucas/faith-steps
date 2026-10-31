export type Obstaculo = [number, number, number, number];
// Swept disc against expanded footprints, including endpoints and short steps.
export function segmentoBloqueado(ax:number,az:number,bx:number,bz:number,obstaculos:Obstaculo[],raio=.22):boolean {
 return obstaculos.some(([x0,z0,x1,z1])=>{
  let entrada=0,saida=1;
  for(const [a,d,min,max] of [[ax,bx-ax,x0-raio,x1+raio],[az,bz-az,z0-raio,z1+raio]]){
   if(Math.abs(d)<1e-9){if(a<=min||a>=max)return false;continue;}
   const t0=(min-a)/d,t1=(max-a)/d;
   entrada=Math.max(entrada,Math.min(t0,t1));saida=Math.min(saida,Math.max(t0,t1));
   if(entrada>saida)return false;
  }
  return entrada<=saida;
 });
}
export function animacaoContextual(pose:string,texto='',item?:string):string {
 if(/pedal/i.test(texto))return 'pedalar';
 if(item==='microfone')return 'cantar';
 if(/polichinelo/i.test(texto))return 'exercicio';
 if(pose==='correr')return 'correr';
 return pose;
}
export const AJUSTE_ASSENTO = -.13;
