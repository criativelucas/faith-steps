export type CartaBairro = {dia:string;texto:string;referencia:string};
export type VidaLocal = {cartas:CartaBairro[];horta:{dias:number;ultimaRega:string}};
export const vidaVazia=():VidaLocal=>({cartas:[],horta:{dias:0,ultimaRega:''}});
export const diaLocal=(data=new Date())=>`${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
export function lerVidaLocal(raw:string|null):VidaLocal {
 if(!raw)return vidaVazia();
 const v=JSON.parse(raw);
 if(!v||!Array.isArray(v.cartas)||!v.cartas.every((c:CartaBairro)=>c&&typeof c.dia==='string'&&typeof c.texto==='string'&&typeof c.referencia==='string')||!Number.isInteger(v.horta?.dias)||v.horta.dias<0||v.horta.dias>3||typeof v.horta.ultimaRega!=='string')throw new Error('Arquivo local inválido');
 return v;
}
export function regarHorta(vida:VidaLocal,dia:string):VidaLocal {
 return vida.horta.ultimaRega===dia?vida:{...vida,horta:{dias:Math.min(3,vida.horta.dias+1),ultimaRega:dia}};
}
export function receberCarta(vida:VidaLocal,carta:CartaBairro):VidaLocal {
 return vida.cartas.some(c=>c.dia===carta.dia)?vida:{...vida,cartas:[carta,...vida.cartas]};
}
