import * as THREE from 'three';
type Tipo = 'agua' | 'vapor' | 'gratidao';
/** One reusable instanced mesh: bounded particle count even on repeated interactions. */
export function criarMicroEfeitos(cena: THREE.Scene) {
  const material=new THREE.MeshBasicMaterial({transparent:true,opacity:.7,depthWrite:false});
  const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,5),material,40);
  mesh.frustumCulled=false;mesh.visible=false;cena.add(mesh);
  const dummy=new THREE.Object3D(), origem=new THREE.Vector3();
  let inicio=0,tipo:Tipo='agua';
  return {
    iniciar(t:Tipo,p:THREE.Vector3){tipo=t;origem.copy(p);inicio=performance.now();mesh.visible=true;material.color.set(t==='agua'?'#8EDCFF':t==='vapor'?'#F6F5ED':'#F4CE65');},
    atualizar(agora:number){
      if(!mesh.visible)return;
      const tempo=(agora-inicio)/1000;
      if(tempo>5){mesh.visible=false;return;}
      for(let i=0;i<40;i++){
        const fase=(tempo+i*.073)%1.5,angulo=i*2.39996;
        const raio=tipo==='gratidao'?.35+fase*.12:tipo==='vapor'?.08+fase*.08:.18;
        dummy.position.set(origem.x+Math.cos(angulo)*raio,origem.y+(tipo==='agua'?-fase*.7:fase*.45),origem.z+Math.sin(angulo)*raio);
        const tam=tipo==='vapor'?.03+fase*.05:tipo==='gratidao'?.018:.014;
        dummy.scale.set(tam,tipo==='agua'?tam*2:tam,tam);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      }
      material.opacity=Math.min(.65,(5-tempo)*.3);mesh.instanceMatrix.needsUpdate=true;
    },
  };
}
