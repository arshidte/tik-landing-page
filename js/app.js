/* =====================================================================
   TIK — interaction layer
   Lenis smooth scroll · GSAP ScrollTrigger · hero storytelling ·
   micro-interactions (cursor, magnetic, reveals, sliders).
   ===================================================================== */
(function(){
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch  = matchMedia('(hover:none)').matches;
  const $  = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const lerp=(a,b,t)=>a+(b-a)*t;

  gsap.registerPlugin(ScrollTrigger);

  /* ================================================================
     0 · INTRO  (no preloader — kick off straight away)
  ================================================================ */
  requestAnimationFrame(startIntro);

  /* header scrim shows once you leave the very top */
  const navScrim = $('#nav-scrim');
  if(navScrim){
    const onScrimScroll = ()=> navScrim.classList.toggle('show', window.scrollY > 40);
    window.addEventListener('scroll', onScrimScroll, { passive:true });
    onScrimScroll();
  }

  /* ================================================================
     1 · LENIS SMOOTH SCROLL
  ================================================================ */
  let lenis = null;
  if(!reduce){
    lenis = new Lenis({ duration:1.15, easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),
      smoothWheel:true, wheelMultiplier:0.95, touchMultiplier:1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t=>lenis.raf(t*1000));
    gsap.ticker.lagSmoothing(0);
  }
  function scrollTo(target){
    if(lenis) lenis.scrollTo(target,{ offset:0, duration:1.4 });
    else document.querySelector(target)?.scrollIntoView({behavior:'smooth'});
  }

  /* ================================================================
     2 · CUSTOM CURSOR  (dot + ring, magnetic, view state)
  ================================================================ */
  if(!touch){
    const dot=$('#cursor'), ring=$('#cursor-ring');
    let mx=innerWidth/2,my=innerHeight/2, rx=mx,ry=my;
    addEventListener('mousemove',e=>{ mx=e.clientX; my=e.clientY;
      dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    (function ringLoop(){ rx=lerp(rx,mx,.18); ry=lerp(ry,my,.18);
      ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(ringLoop); })();
    const hoverSel='[data-cursor],a,button';
    document.addEventListener('mouseover',e=>{
      if(e.target.closest('[data-cursor-view]')) document.body.classList.add('cursor-view');
      else if(e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout',e=>{
      if(e.target.closest('[data-cursor-view]')) document.body.classList.remove('cursor-view');
      if(e.target.closest(hoverSel) && !e.relatedTarget?.closest?.(hoverSel)) document.body.classList.remove('cursor-hover');
    });
  }

  /* ================================================================
     3 · MAGNETIC BUTTONS
  ================================================================ */
  if(!touch && !reduce){
    $$('.magnetic').forEach(el=>{
      const strength = 0.4;
      el.addEventListener('mousemove',e=>{
        const r=el.getBoundingClientRect();
        const x=(e.clientX-(r.left+r.width/2))*strength;
        const y=(e.clientY-(r.top+r.height/2))*strength;
        gsap.to(el,{x,y,duration:.5,ease:'power3.out'});
      });
      el.addEventListener('mouseleave',()=>gsap.to(el,{x:0,y:0,duration:.6,ease:'elastic.out(1,.4)'}));
    });
  }

  /* ================================================================
     4 · NAV state + progress rail + mobile menu
  ================================================================ */
  const progress=$('#progress');
  ScrollTrigger.create({ start:0, end:'max',
    onUpdate:self=>{ progress.style.width=(self.progress*100)+'%'; }});

  const menu=$('#menu');
  $('#burger')?.addEventListener('click',()=>{ menu.classList.add('open'); lenis?.stop(); });
  $('#menu-close')?.addEventListener('click',()=>{ menu.classList.remove('open'); lenis?.start(); });
  $$('[data-menu]').forEach(a=>a.addEventListener('click',()=>{ menu.classList.remove('open'); lenis?.start(); }));

  // internal anchor smooth-scroll
  $$('a[href^="#"]').forEach(a=>{
    const href=a.getAttribute('href');
    if(href.length>1) a.addEventListener('click',e=>{ e.preventDefault(); scrollTo(href); });
  });

  /* ================================================================
     5 · HERO STORYTELLING  — drives the 3D scene + editorial frames
  ================================================================ */
  const frames=$$('[data-frame]');
  const heroPhoto=$('#hero-photo');
  const heroCta=$('#hero-cta');
  const scrollHint=$('#scroll-hint');

  /* --- scroll-scrubbed hero film (primary) ; WebGL scene is the fallback --- */
  const heroVideo=$('#hero-video');
  let useVideo=false, vDur=0, vTarget=0;
  if(heroVideo){
    const activate=()=>{
      if(useVideo) return;
      useVideo=true; vDur=heroVideo.duration||0;
      heroVideo.classList.add('ready');
      document.body.classList.add('video-active');
      window.TIKScene?.stop();                       // release the GPU — video owns the hero now
      // prime the decoder so seeks paint immediately (esp. Safari)
      heroVideo.play().then(()=>heroVideo.pause()).catch(()=>{});
      if(reduce){ try{ heroVideo.currentTime=vDur*0.86; }catch(e){} }
    };
    heroVideo.addEventListener('loadeddata',activate,{once:true});
    heroVideo.addEventListener('error',()=>{ heroVideo.remove(); }); // keep WebGL/gradient
    heroVideo.load();
    // damped seek loop → cinematic, decoupled from scroll-event frequency
    if(!reduce){
      (function scrub(){
        requestAnimationFrame(scrub);
        if(!useVideo || !vDur) return;
        const t=vTarget*(vDur-0.04), cur=heroVideo.currentTime;
        if(Math.abs(t-cur)>0.006) heroVideo.currentTime = cur+(t-cur)*0.2;
      })();
    }
  }

  // feed scroll progress (0..1 over the tall #hero track) to film + WebGL scene
  ScrollTrigger.create({
    trigger:'#hero', start:'top top', end:'bottom bottom', scrub:true,
    onUpdate:self=>{
      const p=self.progress;
      vTarget=clamp(p/0.86);                              // film completes by ~86%
      window.TIKScene?.setProgress(clamp(p/0.86));       // (no-op once stopped)
      // scroll hint fades quickly
      if(scrollHint) scrollHint.style.opacity = String(clamp(1 - p*6));

      // editorial frames — each owns a slice of the scroll
      const slices=[[0.04,0.17],[0.20,0.33],[0.36,0.49],[0.52,0.63],[0.66,0.78]];
      frames.forEach((f,i)=>{
        const [a,b]=slices[i]; const mid=(a+b)/2;
        let o=0, y=0;
        if(p>=a && p<=b){ const t=(p-a)/(b-a); o=Math.sin(t*Math.PI); y=(0.5-t)*40; }
        f.style.opacity=o.toFixed(3);
        f.style.transform=`translateY(${y}px)`;
      });

      // hero exit → real photograph emerges from the wall/window
      const ph=clamp((p-0.8)/0.2);
      if(heroPhoto){
        heroPhoto.style.opacity=ph.toFixed(3);
        const inset=lerp(50,0,ph);
        heroPhoto.style.clipPath=`inset(${inset}% ${inset}% ${inset}% ${inset}%)`;
      }
      // CTA cluster
      if(heroCta){
        const c=clamp((p-0.9)/0.1);
        heroCta.style.opacity=c.toFixed(3);
        heroCta.style.transform=`translateY(${lerp(20,0,c)}px)`;
        heroCta.classList.toggle('show',c>0.5);
      }
    }
  });

  function startIntro(){
    // nav + logo drop in
    gsap.from('.nav',{ y:-40, opacity:0, duration:1, ease:'expo.out', delay:.2 });
    gsap.from('.scroll-hint',{ opacity:0, duration:1, delay:1 });
    // first frame nudge so the hero isn't blank before scroll
    if(frames[0]){ gsap.fromTo(frames[0],{opacity:0},{opacity:1,duration:1.4,delay:.5}); }
    window.TIKScene?.setProgress(0.02);
  }

  /* ================================================================
     6 · TEXT REVEALS  (words rise into place)
  ================================================================ */
  function wrapWords(el){
    if(el.dataset.wrapped) return;
    el.dataset.wrapped='1';
    const walk=(node)=>{
      Array.from(node.childNodes).forEach(n=>{
        if(n.nodeType===3){
          const frag=document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok=>{
            if(tok.trim()===''){ frag.appendChild(document.createTextNode(tok)); return; }
            const w=document.createElement('span'); w.className='split-word';
            const inner=document.createElement('span'); inner.textContent=tok;
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag,n);
        } else if(n.nodeType===1){ walk(n); }
      });
    };
    walk(el);
  }
  if(!reduce){
    // IntersectionObserver drives every reveal — robust against ScrollTrigger
    // measurement races caused by the tall scrubbed hero + Lenis + pinned sections.
    const io = new IntersectionObserver((entries,obs)=>{
      entries.forEach(e=>{
        if(!e.isIntersecting) return;
        const el=e.target; obs.unobserve(el);
        if(el.hasAttribute('data-reveal-words')){
          const spans=el.querySelectorAll('.split-word > span');
          gsap.to(spans,{ y:0, opacity:1, duration:1, ease:'expo.out', stagger:0.045 });
        } else if(el.hasAttribute('data-line')){
          gsap.to(el,{ y:0, opacity:1, duration:1.1, ease:'expo.out' });
        } else { // data-fade
          gsap.to(el,{ opacity:1, y:0, duration:1, ease:'power3.out' });
        }
      });
    }, { rootMargin:'0px 0px -10% 0px', threshold:0 });

    $$('[data-reveal-words]').forEach(el=>{ try{ wrapWords(el); }catch(_){} io.observe(el); });
    $$('[data-line]').forEach(el=>io.observe(el));
    $$('[data-fade]').forEach(el=>{ gsap.set(el,{ opacity:0, y:24 }); io.observe(el); });

    // safety net: force-reveal anything still hidden & already on-screen after load
    addEventListener('load',()=>setTimeout(()=>{
      $$('[data-reveal-words] .split-word > span, [data-line], [data-fade]').forEach(s=>{
        const r=s.getBoundingClientRect();
        if(getComputedStyle(s).opacity!=='1' && r.top<innerHeight && r.bottom>0)
          gsap.set(s,{y:0, opacity:1});
      });
    }, 1500));
  } else {
    $$('[data-fade]').forEach(el=>{ el.style.opacity=1; el.style.transform='none'; });
    $$('[data-reveal-words] .split-word > span, [data-line]').forEach(el=>{ el.style.transform='none'; });
  }

  /* ================================================================
     7 · PROJECT IMAGE PARALLAX
  ================================================================ */
  if(!reduce){
    $$('[data-parallax]').forEach(el=>{
      const img=el.querySelector('img')||el;
      gsap.fromTo(img,{yPercent:-8},{yPercent:8,ease:'none',
        scrollTrigger:{ trigger:el, start:'top bottom', end:'bottom top', scrub:true }});
    });
    // project media clip reveal
    $$('[data-project] .project-media').forEach(m=>{
      gsap.fromTo(m,{clipPath:'inset(12% 0 12% 0)'},{clipPath:'inset(0% 0 0% 0)',ease:'none',
        scrollTrigger:{ trigger:m, start:'top 90%', end:'top 45%', scrub:true }});
    });
  }

  /* ================================================================
     8 · DESIGN → EXECUTION SEQUENCE  (crossfade 5 layers + wireframe)
  ================================================================ */
  const seqLayers=$$('.seq-layer');
  const seqSteps=$$('.seq-steps .ss');
  const seqLabel=$('#seq-label'), seqTitle=$('#seq-title');
  const SEQ=[
    {label:'2D Plan',     title:'From drawing<br>to space.'},
    {label:'3D Model',    title:'Volume,<br>tested early.'},
    {label:'Materials',   title:'Chosen,<br>then specified.'},
    {label:'Construction',title:'Built by<br>our own hands.'},
    {label:'Final Space', title:'Delivered,<br>as promised.'}
  ];
  ScrollTrigger.create({
    trigger:'#seq', start:'top top', end:'bottom bottom', scrub:true,
    onUpdate:self=>{
      const n=seqLayers.length;
      const raw=clamp(self.progress)*(n-0.0001);
      const active=Math.min(n-1, Math.floor(raw));
      const frac=raw-active;                              // 0..1 within the active step
      seqLayers.forEach((l,i)=>{
        // hold the active layer, briefly crossfade to the next near the boundary
        let o=0;
        if(i===active) o = frac<0.85 ? 1 : lerp(1,0.35,(frac-0.85)/0.15);
        else if(i===active+1) o = frac<0.85 ? 0 : lerp(0,0.65,(frac-0.85)/0.15);
        l.style.opacity=o.toFixed(3);
        l.style.transform=`scale(${lerp(1.05,1,i===active?frac:0)})`;
      });
      seqSteps.forEach((s,i)=>s.classList.toggle('active',i===active));
      if(SEQ[active]){ seqLabel.textContent=SEQ[active].label; seqTitle.innerHTML=SEQ[active].title; }
    }
  });

  /* ================================================================
     9 · MATERIAL LAB  (horizontal scroll pinned)
  ================================================================ */
  const track=$('#matter-track'), wrap=$('.matter-track-wrap');
  if(track && wrap && !reduce){
    const getX=()=>Math.max(0, track.scrollWidth - innerWidth + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')||40));
    gsap.to(track,{ x:()=>-getX(), ease:'none',
      scrollTrigger:{ trigger:wrap, start:'top top', end:()=>'+='+getX(),
        scrub:1, pin:true, anticipatePin:1, invalidateOnRefresh:true }});
  }

  /* ================================================================
     10 · SERVICES  — cursor-following media preview
  ================================================================ */
  const svcMedia=$('#svc-media'), svcImg=$('#svc-media-img');
  if(svcMedia && !touch && !reduce){
    let sx=0,sy=0,tx=0,ty=0,shown=false;
    $$('[data-svc]').forEach(row=>{
      row.addEventListener('mouseenter',()=>{ svcImg.src=row.dataset.media; shown=true;
        gsap.to(svcMedia,{opacity:1,scale:1,duration:.5,ease:'power3.out'}); });
      row.addEventListener('mouseleave',()=>{ shown=false;
        gsap.to(svcMedia,{opacity:0,scale:.9,duration:.4,ease:'power3.out'}); });
    });
    addEventListener('mousemove',e=>{ tx=e.clientX; ty=e.clientY; });
    (function loop(){ sx=lerp(sx,tx,.12); sy=lerp(sy,ty,.12);
      svcMedia.style.left=sx+'px'; svcMedia.style.top=sy+'px';
      requestAnimationFrame(loop); })();
  }

  /* ================================================================
     11 · PROCESS  — active step + rail fill
  ================================================================ */
  const rail=$('#proc-rail');
  const steps=$$('[data-proc]');
  if(rail){
    // drive the ::after progress-fill height via an injected style rule
    const fillEl=document.createElement('style'); document.head.appendChild(fillEl);
    ScrollTrigger.create({ trigger:rail, start:'top 55%', end:'bottom 75%', scrub:true,
      onUpdate:self=>{ fillEl.textContent=`#proc-rail::after{height:${(self.progress*100).toFixed(1)}%}`; }});
    steps.forEach(step=>{
      ScrollTrigger.create({ trigger:step, start:'top 60%', end:'bottom 60%',
        onToggle:self=>step.classList.toggle('active',self.isActive) });
    });
  }

  /* ================================================================
     12 · TESTIMONIALS  — auto + manual rotation
  ================================================================ */
  const tItems=$$('.testi-item'), tNav=$$('.testi-nav button');
  let ti=0, tTimer;
  function showTesti(i){
    ti=(i+tItems.length)%tItems.length;
    tItems.forEach((el,k)=>el.classList.toggle('active',k===ti));
    tNav.forEach((b,k)=>b.classList.toggle('on',k===ti));
  }
  tNav.forEach(b=>b.addEventListener('click',()=>{ showTesti(+b.dataset.testi); restartTesti(); }));
  function restartTesti(){ clearInterval(tTimer); tTimer=setInterval(()=>showTesti(ti+1),5200); }
  ScrollTrigger.create({ trigger:'#testi', start:'top 60%', end:'bottom top',
    onToggle:self=>{ if(self.isActive) restartTesti(); else clearInterval(tTimer); }});

  /* ================================================================
     13 · FINAL CTA background parallax
  ================================================================ */
  if(!reduce){
    gsap.to('.final-bg',{ yPercent:12, ease:'none',
      scrollTrigger:{ trigger:'.final', start:'top bottom', end:'bottom top', scrub:true }});
  }

  /* ================================================================
     14 · BROKEN-IMAGE GRACE  — hide failed images so the tasteful
          surface colour shows instead of an alt-text box.
  ================================================================ */
  $$('img[data-img]').forEach(img=>{
    img.addEventListener('error',()=>{ img.style.visibility='hidden'; },{once:true});
  });

  /* ================================================================
     15 · BRAND STATEMENT — kinetic word rotator + interactive picker
          "We design how you [live / cook / gather / host / ...]"
  ================================================================ */
  (function(){
    const rotor = $('#liveRotor');
    if(!rotor) return;
    const words = ['live','cook','gather','host','unwind','work'];
    let current = null, idx = 0, timer = null, started = false;

    // reset any word-reveal wrapping the reveal engine applied
    rotor.innerHTML = '';
    const first = document.createElement('span');
    first.className = 'rotor-word'; first.textContent = words[0];
    rotor.appendChild(first); current = words[0];
    if(!reduce) gsap.set(first,{ opacity:0 });

    function show(word){
      if(word===current) return;
      rotor.setAttribute('aria-label', word);
      const outgoing = rotor.querySelector('.rotor-word');
      if(reduce){ outgoing.textContent = word; current = word; return; }

      const w0 = rotor.getBoundingClientRect().width;
      outgoing.style.position='absolute'; outgoing.style.left='0'; outgoing.style.top='0';
      const incoming = document.createElement('span');
      incoming.className='rotor-word'; incoming.textContent = word;
      rotor.appendChild(incoming);
      const w1 = rotor.getBoundingClientRect().width;

      gsap.fromTo(rotor,{ width:w0 },{ width:w1, duration:.55, ease:'expo.out',
        onComplete:()=>{ rotor.style.width=''; } });
      gsap.to(outgoing,{ y:'-0.34em', opacity:0, duration:.42, ease:'power2.in',
        onComplete:()=>outgoing.remove() });
      gsap.fromTo(incoming,{ y:'0.42em', opacity:0 },
        { y:'0em', opacity:1, duration:.62, ease:'expo.out' });
      current = word;
    }

    function next(){ idx = (idx+1) % words.length; show(words[idx]); }
    function stop(){ if(timer){ clearInterval(timer); timer=null; } }
    function play(){ stop(); if(!reduce) timer = setInterval(next, 2600); }

    const start = ()=>{ if(started) return; started=true;
      if(!reduce) gsap.to(first,{ opacity:1, duration:.8, ease:'power3.out' });
      play(); };
    const host = $('#statement') || rotor;
    if(reduce){ start(); }
    else {
      new IntersectionObserver((es,ob)=>es.forEach(e=>{
        if(e.isIntersecting){ start(); ob.disconnect(); }
      }),{ threshold:.25 }).observe(host);
    }
  })();

  /* refresh once fonts / images settle */
  addEventListener('load',()=>ScrollTrigger.refresh());
  document.addEventListener('tik:scene-ready',()=>ScrollTrigger.refresh());
})();
