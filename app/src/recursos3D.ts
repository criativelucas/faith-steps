import * as THREE from 'three';

// Acessórios procedurais pertencem à instância, ao contrário das malhas GLTF em cache.
export function descartarCena(objeto: THREE.Object3D) {
  const geometrias = new Set<THREE.BufferGeometry>();
  const materiais = new Set<THREE.Material>();
  const texturas = new Set<THREE.Texture>();
  objeto.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Points) {
      geometrias.add(o.geometry);
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) materiais.add(material);
    }
    if (o instanceof THREE.Sprite) materiais.add(o.material);
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
  const registrar = (v: unknown) => {
    if (v instanceof THREE.Texture && !v.userData.compartilhada) texturas.add(v);
  };
  for (const material of materiais) {
    Object.values(material).forEach(registrar);
    if (material instanceof THREE.ShaderMaterial) Object.values(material.uniforms).forEach(u => registrar(u.value));
  }
  geometrias.forEach(g => g.dispose());
  materiais.forEach(m => m.dispose());
  texturas.forEach(t => t.dispose());
}

export function descartarAcessorio(objeto: THREE.Object3D) {
  descartarCena(objeto);
  objeto.removeFromParent();
}

export function descartarCorpo(corpo: {
  objeto: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  mats: Record<string, THREE.Material>;
}) {
  corpo.mixer.stopAllAction();
  corpo.mixer.uncacheRoot(corpo.objeto);
  const esqueletos = new Set<THREE.Skeleton>();
  corpo.objeto.traverse(o => {
    if (o instanceof THREE.SkinnedMesh) esqueletos.add(o.skeleton);
  });
  esqueletos.forEach(s => s.dispose());
  new Set(Object.values(corpo.mats)).forEach(m => m.dispose());
  // Geometrias e texturas continuam compartilhadas com o GLTF e outros personagens.
  corpo.objeto.removeFromParent();
}
