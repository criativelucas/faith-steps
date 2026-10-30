export type ParedeCirculacao={x0:number;z0:number;x1:number;z1:number;y0?:number;y1?:number;externa?:boolean;e0?:boolean;e1?:boolean};
export type Passagem={id:string;eixo:'x'|'z';fixo:number;inicio:number;fim:number;nome:string};
// Shared by geometry, navigation and furniture placement: one source for every opening.
export const PASSAGENS:Passagem[]=[
 {id:'jardim',eixo:'x',fixo:0,inicio:3.4,fim:4.8,nome:'Quarto · Jardim'},
 {id:'varanda',eixo:'x',fixo:0,inicio:10.4,fim:11.8,nome:'Estudo · Varanda'},
 {id:'piscina',eixo:'z',fixo:0,inicio:1.7,fim:2.9,nome:'Quarto · Piscina'},
 {id:'deck',eixo:'z',fixo:0,inicio:7.7,fim:8.9,nome:'Sala · Deck'},
 {id:'estudio',eixo:'z',fixo:12,inicio:3.25,fim:4.35,nome:'Estudo · Galeria'},
 {id:'academia',eixo:'z',fixo:12,inicio:4.65,fim:5.45,nome:'Cozinha · Galeria'},
 {id:'garagem',eixo:'x',fixo:9.2,inicio:-2.7,fim:-1.2,nome:'Deck · Oficina'},
];
export function abrirPassagens(paredes:ParedeCirculacao[],passagens:Passagem[]):ParedeCirculacao[]{
 return passagens.reduce((lista,p)=>lista.flatMap(pa=>{
  const horizontal=p.eixo==='x';
  if(pa.y0 || (horizontal?(pa.z0!==p.fixo||pa.z1!==p.fixo):(pa.x0!==p.fixo||pa.x1!==p.fixo)))return [pa];
  const a=horizontal?pa.x0:pa.z0,b=horizontal?pa.x1:pa.z1;
  const inicio=Math.max(a,p.inicio),fim=Math.min(b,p.fim);
  if(inicio>=fim)return [pa];
  const segmento=(de:number,ate:number,y0?:number)=>({...pa,...(horizontal?{x0:de,x1:ate}:{z0:de,z1:ate}),e0:de===a?pa.e0:false,e1:ate===b?pa.e1:false,...(y0?{y0}:{} )});
  return [...(a<inicio?[segmento(a,inicio)]:[]),segmento(inicio,fim,2.25),...(fim<b?[segmento(fim,b)]:[])];
 }),paredes);
}
export function areaPassagem(p:Passagem):[number,number,number,number]{
 return p.eixo==='x'?[p.inicio,p.fixo-.55,p.fim,p.fixo+.55]:[p.fixo-.55,p.inicio,p.fixo+.55,p.fim];
}
