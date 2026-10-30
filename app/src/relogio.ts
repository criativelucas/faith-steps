// app/src/relogio.ts
export type PeriodoDia = 'madrugada' | 'amanhecer' | 'manha' | 'tarde' | 'entardecer' | 'noite';

export type AmbienteTempo = {
  periodo: PeriodoDia;
  rotulo: string;
  icone: 'sol' | 'lua' | 'amanhecer' | 'entardecer';
  horaFormatada: string;
  dataCurta: string;
  dataCompleta: string;
  temperaturaC: number;
  climaRotulo: string;
  ceuTopo: string;
  ceuHorizonte: string;
  luzAmbienteCor: string;
  luzAmbienteInt: number;
  luzDirecionalCor: string;
  luzDirecionalInt: number;
  posicaoAstro: [number, number, number];
  luzesInternasAcesas: boolean;
};

export function calcularAmbienteTempo(agoraMs: number): AmbienteTempo {
  const data = new Date(agoraMs);
  const horas = data.getHours();
  const minutos = data.getMinutes();
  const horaDecimal = horas + minutos / 60;

  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataCurta = data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
  const dataCompleta = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Oscilação térmica diária realista (21°C na madrugada até 29°C à tarde)
  const curvaTemp = Math.sin(((horaDecimal - 5) / 24) * Math.PI * 2);
  const temperaturaC = Math.round(25 + curvaTemp * 4);

  const anguloAstro = ((horaDecimal - 6) / 12) * Math.PI;
  const astroX = Math.cos(anguloAstro) * 18;
  const astroY = Math.max(3.5, Math.abs(Math.sin(anguloAstro)) * 16);
  const astroZ = -10 + Math.sin(anguloAstro * 0.5) * 6;

  if (horaDecimal >= 5 && horaDecimal < 7.5) {
    return {
      periodo: 'amanhecer', rotulo: 'Amanhecer', icone: 'amanhecer',
      horaFormatada, dataCurta, dataCompleta, temperaturaC, climaRotulo: 'Brisa suave da manhã',
      ceuTopo: '#4B6CB7', ceuHorizonte: '#FFD194',
      luzAmbienteCor: '#FFE4C4', luzAmbienteInt: 1.35,
      luzDirecionalCor: '#FFA07A', luzDirecionalInt: 1.9,
      posicaoAstro: [astroX, astroY, astroZ], luzesInternasAcesas: true,
    };
  }
  if (horaDecimal >= 7.5 && horaDecimal < 12) {
    return {
      periodo: 'manha', rotulo: 'Manhã', icone: 'sol',
      horaFormatada, dataCurta, dataCompleta, temperaturaC, climaRotulo: 'Céu limpo e ensolarado',
      ceuTopo: '#56CCF2', ceuHorizonte: '#E8F6FF',
      luzAmbienteCor: '#FFFDF9', luzAmbienteInt: 1.75,
      luzDirecionalCor: '#FFF6E0', luzDirecionalInt: 2.5,
      posicaoAstro: [astroX, astroY, astroZ], luzesInternasAcesas: false,
    };
  }
  if (horaDecimal >= 12 && horaDecimal < 17) {
    return {
      periodo: 'tarde', rotulo: 'Tarde', icone: 'sol',
      horaFormatada, dataCurta, dataCompleta, temperaturaC, climaRotulo: 'Sol radiante',
      ceuTopo: '#2F80ED', ceuHorizonte: '#D9F0FF',
      luzAmbienteCor: '#FFF9F0', luzAmbienteInt: 1.85,
      luzDirecionalCor: '#FFF0D1', luzDirecionalInt: 2.7,
      posicaoAstro: [astroX, astroY, astroZ], luzesInternasAcesas: false,
    };
  }
  if (horaDecimal >= 17 && horaDecimal < 19.2) {
    return {
      periodo: 'entardecer', rotulo: 'Fim de tarde', icone: 'entardecer',
      horaFormatada, dataCurta, dataCompleta, temperaturaC, climaRotulo: 'Crepúsculo dourado',
      ceuTopo: '#355C7D', ceuHorizonte: '#F67280',
      luzAmbienteCor: '#FFD3B6', luzAmbienteInt: 1.3,
      luzDirecionalCor: '#FF8C42', luzDirecionalInt: 2.0,
      posicaoAstro: [astroX, astroY, astroZ], luzesInternasAcesas: true,
    };
  }
  const madrugada = horaDecimal < 5;
  return {
    periodo: madrugada ? 'madrugada' : 'noite',
    rotulo: madrugada ? 'Madrugada' : 'Noite',
    icone: 'lua',
    horaFormatada, dataCurta, dataCompleta, temperaturaC,
    climaRotulo: madrugada ? 'Madrugada serena' : 'Noite estrelada',
    ceuTopo: '#0F2027', ceuHorizonte: '#203A43',
    luzAmbienteCor: '#90B4CE', luzAmbienteInt: 0.78,
    luzDirecionalCor: '#C4E0F9', luzDirecionalInt: 0.95,
    posicaoAstro: [astroX, astroY, astroZ], luzesInternasAcesas: true,
  };
}

