// Audio is synthesized locally and only starts from an explicit player gesture.
export class AmbienteSonoro {
  private ctx?: AudioContext;
  private saida?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private passo = 0;
  private ativo = false;
  private volume = .22;
  desbloquear() {
    if (!this.ctx) { this.ctx = new AudioContext(); this.saida = this.ctx.createGain(); this.saida.gain.value = this.volume; this.saida.connect(this.ctx.destination); }
    void this.ctx.resume().catch(() => {});
  }
  ajustar(volume: number) { this.volume = Math.max(0,Math.min(1,volume)); if(this.saida&&this.ctx) this.saida.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.08); }
  private nota(freq: number, duracao: number, forca = .12) {
    if(!this.ctx||!this.saida||this.ctx.state!=='running') return;
    const agora=this.ctx.currentTime, osc=this.ctx.createOscillator(), ganho=this.ctx.createGain();
    osc.type='sine'; osc.frequency.value=freq;
    ganho.gain.setValueAtTime(0,agora); ganho.gain.linearRampToValueAtTime(forca,agora+.025); ganho.gain.exponentialRampToValueAtTime(.0001,agora+duracao);
    osc.connect(ganho); ganho.connect(this.saida); osc.start(); osc.stop(agora+duracao+.02);
    osc.onended=()=>{osc.disconnect();ganho.disconnect();};
  }
  musica() {
    this.ativo=true;
    if(this.timer) return;
    // Original quiet pentatonic instrumental, no streamed recordings.
    const notas=[261.63,329.63,392,523.25,440,392,329.63,293.66];
    const tocar=()=>{ if(document.hidden||!this.ativo) return; this.nota(notas[this.passo++%notas.length],1.5); if(this.passo%4===1)this.nota(130.81,2,.07); };
    tocar(); this.timer=setInterval(tocar,520);
  }
  pausar(pausa: boolean) { if(this.ctx) void (pausa?this.ctx.suspend():this.ctx.resume()).catch(()=>{}); }
  parar() {this.ativo=false;if(this.timer)clearInterval(this.timer);this.timer=undefined;}
  chaleira() {this.nota(1046.5,1,.06);}
  agua() {
    if(!this.ctx||!this.saida) return;
    const ctx=this.ctx, buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate), samples=buffer.getChannelData(0);
    let anterior=0;
    for(let i=0;i<samples.length;i++){anterior=(anterior+Math.random()*.04-.02)/1.02;samples[i]=anterior*4;}
    const fonte=ctx.createBufferSource(), filtro=ctx.createBiquadFilter(), ganho=ctx.createGain();
    fonte.buffer=buffer; filtro.type='lowpass'; filtro.frequency.value=1700;
    ganho.gain.setValueAtTime(0,ctx.currentTime);ganho.gain.linearRampToValueAtTime(.35,ctx.currentTime+.4);ganho.gain.linearRampToValueAtTime(0,ctx.currentTime+4);
    fonte.connect(filtro);filtro.connect(ganho);ganho.connect(this.saida);fonte.start();
    fonte.onended=()=>{fonte.disconnect();filtro.disconnect();ganho.disconnect();};
  }
  descartar() {this.parar();void this.ctx?.close();}
}
