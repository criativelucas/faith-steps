// Água estilizada (piscina, fonte): turquesa clara nas bordas rasas, azul profundo no meio,
// ondas suaves, brilho do sol, reflexo do céu nas bordas (fresnel), cáusticas e espuma junto à borda.
import * as THREE from 'three';

export type Agua = { mesh: THREE.Mesh; material: THREE.ShaderMaterial };

export function criarAgua(largura: number, comprimento: number, circular = false, segmentos = 48): Agua {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTempo: { value: 0 },
      uTamanho: { value: new THREE.Vector2(largura, comprimento) },
      uCircular: { value: circular ? 1 : 0 },
      uRaso: { value: new THREE.Color('#3CCFE0') },
      uFundo: { value: new THREE.Color('#145BC4') },
      uCeu: { value: new THREE.Color('#BFE9FF') },
      uSol: { value: new THREE.Vector3(-0.5, 0.8, 0.3).normalize() },
      uLuz: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTempo; uniform vec2 uTamanho;
      varying vec2 vUv; varying vec3 vMundo; varying vec3 vNormal;
      float onda(vec2 p) {
        return sin(p.x * 3.1 + uTempo * 1.6) * 0.5 + sin(p.y * 2.3 - uTempo * 1.2) * 0.35 + sin((p.x + p.y) * 5.7 + uTempo * 2.4) * 0.15;
      }
      void main() {
        vUv = uv;
        vec2 p = (uv - 0.5) * uTamanho;
        float h = onda(p) * 0.012;
        float e = 0.05;
        float dx = (onda(p + vec2(e, 0.0)) - onda(p - vec2(e, 0.0))) / (2.0 * e);
        float dy = (onda(p + vec2(0.0, e)) - onda(p - vec2(0.0, e))) / (2.0 * e);
        vNormal = normalize(mat3(modelMatrix) * normalize(vec3(-dx * 0.09, -dy * 0.09, 1.0)));
        vec4 mundo = modelMatrix * vec4(position + vec3(0.0, 0.0, h), 1.0);
        vMundo = mundo.xyz;
        gl_Position = projectionMatrix * viewMatrix * mundo;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTempo; uniform vec2 uTamanho; uniform float uCircular; uniform float uLuz;
      uniform vec3 uRaso; uniform vec3 uFundo; uniform vec3 uCeu; uniform vec3 uSol;
      varying vec2 vUv; varying vec3 vMundo; varying vec3 vNormal;
      void main() {
        // Distância até a borda, em metros
        vec2 q = (vUv - 0.5) * uTamanho;
        float borda = uCircular > 0.5 ? (uTamanho.x * 0.5 - length(q)) : min(uTamanho.x * 0.5 - abs(q.x), uTamanho.y * 0.5 - abs(q.y));
        float fundo = smoothstep(0.0, min(uTamanho.x, uTamanho.y) * 0.42, borda);
        vec3 cor = mix(uRaso, uFundo, fundo);
        // Cáusticas: rede de luz que dança no fundo raso
        vec2 c = q * 4.2;
        float caus = abs(sin(c.x + sin(c.y * 0.8 + uTempo) * 1.4) * sin(c.y + sin(c.x * 0.7 - uTempo * 1.1) * 1.4));
        cor += pow(1.0 - caus, 6.0) * 0.14 * (1.0 - fundo * 0.6);
        // Reflexo do céu nas bordas do olhar e brilho do sol
        vec3 olhar = normalize(cameraPosition - vMundo);
        float fresnel = pow(1.0 - max(dot(vNormal, olhar), 0.0), 3.0);
        cor = mix(cor, uCeu, fresnel * 0.35);
        vec3 meio = normalize(uSol + olhar);
        cor += pow(max(dot(vNormal, meio), 0.0), 140.0) * 1.6;
        // Espuma fina junto à borda
        float espuma = (1.0 - smoothstep(0.0, 0.09, borda)) * (0.65 + 0.35 * sin(uTempo * 2.0 + (q.x + q.y) * 18.0));
        cor = mix(cor, vec3(1.0), espuma * 0.8);
        gl_FragColor = vec4(cor * uLuz, clamp(mix(0.82, 0.95, fundo) + espuma * 0.1, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
  });
  const geometria = circular ? new THREE.CircleGeometry(largura / 2, segmentos) : new THREE.PlaneGeometry(largura, comprimento, segmentos, segmentos);
  const mesh = new THREE.Mesh(geometria, material);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, material };
}
