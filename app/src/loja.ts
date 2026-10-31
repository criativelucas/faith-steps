import { bloqueio, type Estado, type Item } from './jogo.ts';
export type ResultadoCompra = { status: 'sucesso' | 'adquirido' | 'bloqueado' | 'falha'; mensagem: string };
export function validarCompra(estado: Pick<Estado,'talentos'|'nivel'|'humor'|'itens'>,item:Item):ResultadoCompra|null {
 if(item.preco===0||estado.itens.includes(item.id))return {status:'adquirido',mensagem:'Este item já é seu.'};
 const motivo=bloqueio(estado,item);
 return motivo?{status:'bloqueado',mensagem:motivo}:null;
}
export function criarFilaCompra(){
 let ocupada=false;
 return async (executar:()=>Promise<ResultadoCompra>):Promise<ResultadoCompra>=>{
  if(ocupada)return {status:'bloqueado',mensagem:'Aguarde a compra em andamento.'};
  ocupada=true;
  try{return await executar();}catch{return {status:'falha',mensagem:'Não foi possível concluir a compra. Tente novamente.'};}finally{ocupada=false;}
 };
}
