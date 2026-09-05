/* =====================================================================
   TIK — Hero 3D architectural experience  ("Space, in motion.")
   A scroll-controlled room that builds itself from raw shell → finished
   interior. Procedural (no external GLB), PBR materials, cinematic dolly.
   Exposes: window.TIKScene.setProgress(0..1)
   ===================================================================== */
import * as THREE from 'three';

const canvas = document.getElementById('scene-canvas');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 860px)').matches;

/* --- WebGL support / fallback gate --- */
function hasWebGL(){
  try{ const c=document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl')||c.getContext('experimental-webgl')));
  }catch(e){ return false; }
}
if(!canvas || !hasWebGL()){
  document.body.classList.add('no-webgl');
  window.TIKScene = { setProgress(){}, ready:false };
} else {
  boot();
}

function boot(){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cbc2b0');
  scene.fog = new THREE.Fog('#cbc2b0', 12, 30);

  const camera = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.6 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* ------------------------------------------------------------------ *
   *  ROOM SHELL                                                         *
   * ------------------------------------------------------------------ */
  const W = 8, H = 4.2, D = 16;               // room width / height / depth
  const room = new THREE.Group();
  scene.add(room);

  // material palette — we lerp between "raw shell" and "finished"
  const RAW   = { floor:'#8f8a80', wall:'#a49d90', wood:'#7c7368' };
  const FINE  = { floor:'#b9a48a', wall:'#efe9dd', wood:'#9a6a3f' };

  const floorMat = new THREE.MeshStandardMaterial({ color:RAW.floor, roughness:.85, metalness:0 });
  const wallMat  = new THREE.MeshStandardMaterial({ color:RAW.wall,  roughness:.95, metalness:0 });
  const woodMat  = new THREE.MeshStandardMaterial({ color:RAW.wood,  roughness:.6,  metalness:.05, transparent:true, opacity:0 });

  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI/2; floor.position.z = -D/2 + 2; floor.receiveShadow = true;
  room.add(floor);

  // helper: wall that "grows" from the floor up
  function makeWall(w,h){
    const g = new THREE.PlaneGeometry(w,h);
    g.translate(0, h/2, 0);                     // pivot at base → scale.y grows upward
    const m = new THREE.Mesh(g, wallMat.clone());
    m.receiveShadow = true;
    return m;
  }
  // back wall (with a large opening / window)
  const backL = makeWall(W*0.34, H); backL.position.set(-W*0.33, 0, -D/2+2); room.add(backL);
  const backR = makeWall(W*0.34, H); backR.position.set( W*0.33, 0, -D/2+2); room.add(backR);
  const backTop = new THREE.Mesh(new THREE.PlaneGeometry(W*0.36, H*0.28), wallMat.clone());
  backTop.position.set(0, H*0.86, -D/2+2); room.add(backTop);
  // side walls
  const left  = makeWall(D, H); left.rotation.y =  Math.PI/2; left.position.set(-W/2, 0, -D/2+2); room.add(left);
  const right = makeWall(D, H); right.rotation.y = -Math.PI/2; right.position.set( W/2, 0, -D/2+2); room.add(right);
  // ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), wallMat.clone());
  ceil.rotation.x = Math.PI/2; ceil.position.set(0, H, -D/2+2); ceil.material.opacity = 0; ceil.material.transparent = true;
  room.add(ceil);

  const growWalls = [backL, backR, left, right];

  // wood feature panel on the right wall (appears in materials phase)
  const woodPanel = new THREE.Mesh(new THREE.PlaneGeometry(5.5, H*0.72), woodMat);
  woodPanel.rotation.y = -Math.PI/2; woodPanel.position.set(W/2-0.02, H*0.42, -6); room.add(woodPanel);

  // the bright opening beyond the back wall (the "window" light)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(W*0.34, H*0.82),
    new THREE.MeshBasicMaterial({ color:'#fff6e8', transparent:true, opacity:.0 })
  );
  glow.position.set(0, H*0.42, -D/2+1.6); room.add(glow);

  /* ------------------------------------------------------------------ *
   *  FURNITURE  (materialises in the 60–80% band)                       *
   * ------------------------------------------------------------------ */
  const furniture = new THREE.Group(); room.add(furniture);
  const soft = (c) => new THREE.MeshStandardMaterial({ color:c, roughness:.9, metalness:0, transparent:true, opacity:0 });
  const metal = (c) => new THREE.MeshStandardMaterial({ color:c, roughness:.35, metalness:.9, transparent:true, opacity:0 });

  function box(w,h,d,mat,x,y,z){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; furniture.add(m); return m;
  }
  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2,3), soft('#c8bca7'));
  rug.rotation.x=-Math.PI/2; rug.position.set(0,0.01,-5.4); furniture.add(rug);
  // sofa
  box(3.2,0.45,1.2, soft('#6f6a61'), 0,0.32,-6.4);              // base
  box(3.2,0.5,0.28, soft('#7a746a'), 0,0.72,-6.95);            // back
  box(0.9,0.32,1.0, soft('#8a8478'), -1.05,0.72,-6.3);         // cushions
  box(0.9,0.32,1.0, soft('#8a8478'),  0,0.72,-6.3);
  box(0.9,0.32,1.0, soft('#8a8478'),  1.05,0.72,-6.3);
  // coffee table (travertine top + brass legs)
  box(1.5,0.12,0.8, soft('#d8cdb8'), 0,0.42,-5.0);
  box(0.06,0.42,0.06, metal('#b98a4a'), -0.65,0.21,-4.7);
  box(0.06,0.42,0.06, metal('#b98a4a'),  0.65,0.21,-4.7);
  box(0.06,0.42,0.06, metal('#b98a4a'), -0.65,0.21,-5.3);
  box(0.06,0.42,0.06, metal('#b98a4a'),  0.65,0.21,-5.3);
  // floor lamp
  box(0.05,1.9,0.05, metal('#c39457'),  2.4,0.95,-6.6);
  const shade = box(0.5,0.4,0.5, soft('#efe6d4'), 2.4,2.0,-6.6);
  // low console under wood panel
  box(2.4,0.5,0.45, soft('#5f5850'), 2.2,0.28,-6.0);
  // artwork on left wall
  const art = box(0.04,1.2,1.8, soft('#3a352d'), -W/2+0.06,1.7,-6.5);
  // planter
  box(0.4,0.5,0.4, soft('#9a9284'), -2.6,0.28,-4.4);

  const furnitureMeshes = furniture.children;

  /* ------------------------------------------------------------------ *
   *  LIGHTING                                                           *
   * ------------------------------------------------------------------ */
  const amb = new THREE.AmbientLight('#c9c0b0', 0.5); scene.add(amb);
  const hemi = new THREE.HemisphereLight('#fff4e2', '#4a4136', 0.5); scene.add(hemi);
  // sun through the opening
  const sun = new THREE.DirectionalLight('#ffedcf', 0.0);
  sun.position.set(-2, 6, -12); sun.target.position.set(0,1,-4);
  sun.castShadow = !isMobile;
  if(!isMobile){ sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.near=1; sun.shadow.camera.far=30;
    sun.shadow.camera.left=-8; sun.shadow.camera.right=8; sun.shadow.camera.top=8; sun.shadow.camera.bottom=-8; sun.shadow.bias=-0.0004; }
  scene.add(sun); scene.add(sun.target);
  // warm interior fill that swells at the end
  const warm = new THREE.PointLight('#ffb26b', 0.0, 16, 2); warm.position.set(1.5,2.4,-5.5); scene.add(warm);

  /* ------------------------------------------------------------------ *
   *  PROGRESS → STATE  mapping                                          *
   * ------------------------------------------------------------------ */
  const clamp = (v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth = t => t*t*(3-2*t);
  const remap = (v,a,b)=>clamp((v-a)/(b-a));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const cRaw={}, cFine={}, cTmp=new THREE.Color();
  for(const k in RAW){ cRaw[k]=new THREE.Color(RAW[k]); cFine[k]=new THREE.Color(FINE[k]); }

  const camStart = new THREE.Vector3(0, 1.65, 11);
  const camEnd   = new THREE.Vector3(0, 1.5, -1.5);
  const lookStart= new THREE.Vector3(0, 1.5, -4);
  const lookEnd  = new THREE.Vector3(0, 1.35, -8);
  const _look = new THREE.Vector3();

  function apply(p){
    // ---- 0–20% : camera enters ---------------------------------------
    const enter = smooth(remap(p, 0, 0.28));
    camera.position.lerpVectors(camStart, camEnd, enter);
    // gentle parallax sway
    camera.position.x = Math.sin(p*Math.PI)*0.25;
    _look.lerpVectors(lookStart, lookEnd, enter);
    camera.lookAt(_look);

    // ---- 20–40% : walls & planes form --------------------------------
    const build = smooth(remap(p, 0.16, 0.44));
    growWalls.forEach((w,i)=>{ w.scale.y = clamp(build*1.15 - i*0.03, 0.001, 1); });
    ceil.material.opacity = clamp(remap(p,0.34,0.46));
    backTop.material.opacity = 1; backTop.material.transparent = true;
    backTop.scale.y = clamp(build,0.001,1);

    // ---- 40–60% : materials (raw → finished) -------------------------
    const mat = smooth(remap(p, 0.4, 0.66));
    floorMat.color.copy(cTmp.copy(cRaw.floor).lerp(cFine.floor, mat));
    floorMat.roughness = lerp(0.9, 0.55, mat);
    floorMat.metalness = lerp(0, 0.08, mat);
    const wc = cTmp.copy(cRaw.wall).lerp(cFine.wall, mat);
    [backL,backR,backTop,left,right,ceil].forEach(w=>{ w.material.color.copy(wc); w.material.roughness = lerp(0.95,0.7,mat); });
    woodMat.opacity = mat;
    woodMat.color.copy(cTmp.copy(cRaw.wood).lerp(cFine.wood, mat));

    // ---- 60–80% : lighting + furniture materialise -------------------
    const furn = smooth(remap(p, 0.58, 0.82));
    furnitureMeshes.forEach((m,i)=>{
      const d = clamp(furn*1.25 - (i%6)*0.04, 0, 1);
      m.material.opacity = d;
      const s = lerp(0.82, 1, smooth(d));
      m.scale.setScalar(s);
      m.visible = d > 0.02;
    });
    rug.scale.set(lerp(0.6,1,furn), 1, lerp(0.6,1,furn));

    // ---- lighting transition -----------------------------------------
    const light = smooth(remap(p, 0.5, 0.9));
    sun.intensity = lerp(0.0, 2.1, light);
    hemi.intensity = lerp(0.5, 0.85, light);
    amb.intensity  = lerp(0.5, 0.34, light);
    glow.material.opacity = lerp(0, 0.95, smooth(remap(p,0.42,0.8)));

    // ---- 80–100% : warm, completed room ------------------------------
    const finish = smooth(remap(p, 0.8, 1));
    warm.intensity = lerp(0, 1.4, finish);
    renderer.toneMappingExposure = lerp(1.0, 1.16, finish);
    // background & fog warm up
    scene.background.copy(cTmp.set('#cbc2b0').lerp(new THREE.Color('#efe7d8'), mat));
    scene.fog.color.copy(scene.background);
    scene.fog.near = lerp(9, 14, build);
  }

  /* ------------------------------------------------------------------ *
   *  RENDER LOOP  — damped scroll progress for cinematic smoothing      *
   * ------------------------------------------------------------------ */
  let target = 0, current = 0, running = true, visible = true;
  apply(0);

  function frame(){
    if(!running){ return; }
    requestAnimationFrame(frame);
    if(!visible) return;
    current += (target - current) * 0.07;         // smooth interpolation
    if(Math.abs(target-current) < 0.0002) current = target;
    apply(current);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // pause rendering when hero is off-screen (perf)
  const heroEl = document.getElementById('hero');
  if('IntersectionObserver' in window && heroEl){
    new IntersectionObserver(([e])=>{ visible = e.isIntersecting; }, {threshold:0})
      .observe(heroEl);
  }

  /* ------------------------------------------------------------------ *
   *  RESIZE                                                             *
   * ------------------------------------------------------------------ */
  let rz;
  addEventListener('resize', ()=>{
    clearTimeout(rz);
    rz = setTimeout(()=>{
      camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile?1.6:2));
    }, 150);
  });

  /* ------------------------------------------------------------------ *
   *  PUBLIC API                                                         *
   * ------------------------------------------------------------------ */
  window.TIKScene = {
    ready:true,
    setProgress(p){ target = clamp(p); },
    snapshot(){ current = target; apply(current); renderer.render(scene,camera); },
    stop(){ running = false; }        // called when the hero video takes over
  };

  // reduced motion → present a finished room, no scroll drive
  if(reduce){ target = 0.9; current = 0.9; apply(0.9); renderer.render(scene,camera); }

  // signal readiness for the loader
  document.dispatchEvent(new CustomEvent('tik:scene-ready'));
}
