// Logo e símbolo do Faith Steps servidos da pasta public (também usados pela abertura em public/index.html)
const base = process.env.NODE_ENV === 'production' && process.env.EXPO_BASE_URL ? process.env.EXPO_BASE_URL.replace(/\/$/, '') + '/' : '';
export const LOGO_URL = `${base}logo.webp`;
export const SIMBOLO_URL = `${base}simbolo.webp`;
