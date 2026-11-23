(() => {
  const observers=new Set(),resizers=new Set();
  function setTheme(project){
    const root=document.documentElement;
    root.dataset.tone=project?.tone||'dark';
    root.style.setProperty('--bg',project?.background||'#202020');
    document.querySelector('meta[name="theme-color"]').content=project?.background||'#202020';
  }
  function maskFor(pieces){
    const holes=pieces.map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="black"/>`).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><mask id="cut" x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse"><rect width="100" height="100" fill="white"/>${holes}</mask></defs><rect width="100" height="100" fill="white" mask="url(#cut)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  function create(project,open){
    const source=project.images[0];
    const figure=document.createElement('figure');figure.className='artwork scene-figure reveal-part';figure.dataset.step='2';figure.inert=true;
    const button=document.createElement('button');button.className='art-open scene-open';button.setAttribute('aria-label','放大查看：'+source.label);
    const canvas=document.createElement('div');canvas.className='scene-canvas';canvas.style.background=project.background;canvas.dataset.pieces=project.pieces.length;
    const base=document.createElement('img');base.className='scene-base';base.src=source.src;base.alt=source.label;base.width=source.width;base.height=source.height;
    const mask=maskFor(project.pieces);base.style.maskImage=mask;base.style.webkitMaskImage=mask;canvas.append(base);
    project.pieces.forEach((piece,i)=>{
      const slot=document.createElement('span');slot.className='scene-piece reveal-part';slot.dataset.step=String(i+3);slot.dataset.label=piece.label;slot.setAttribute('aria-hidden','true');
      Object.assign(slot.style,{left:piece.x+'%',top:piece.y+'%',width:piece.w+'%',height:piece.h+'%'});
      const img=document.createElement('img');img.src=source.src;img.alt='';img.draggable=false;
      Object.assign(img.style,{width:(10000/piece.w)+'%',left:(-piece.x/piece.w*100)+'%',top:(-piece.y/piece.h*100)+'%'});
      slot.append(img);canvas.append(slot);
    });
    const final=document.createElement('img');final.className='scene-final';final.src=source.src;final.alt='';final.setAttribute('aria-hidden','true');canvas.append(final);
    button.append(canvas);button.addEventListener('click',open);
    const caption=document.createElement('figcaption');caption.textContent=source.label;
    figure.append(button,caption);
    const resize=()=>{const r=button.getBoundingClientRect();if(!r.width||!r.height)return;const w=Math.min(r.width,r.height*source.width/source.height);canvas.style.width=w+'px';canvas.style.height=(w*source.height/source.width)+'px';};
    const observer=new ResizeObserver(resize);observer.observe(button);observers.add(observer);resizers.add(resize);
    requestAnimationFrame(resize);
    return figure;
  }
  window.OriginalScene={create,setTheme,resize(){resizers.forEach(resize=>resize());},clear(){observers.forEach(o=>o.disconnect());observers.clear();resizers.clear();},complete(value){document.querySelector('.scene-canvas')?.classList.toggle('scene-complete',value);}};
  window.addEventListener('resize',()=>window.OriginalScene.resize());
})();
