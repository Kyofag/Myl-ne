(function(){
  var book=document.getElementById('book'),cover=document.getElementById('cover'),nav=document.getElementById('nav');
  var sp=[].slice.call(document.querySelectorAll('.spread')),i=0;
  var prev=document.getElementById('prev'),next=document.getElementById('next'),pg=document.getElementById('pg');
  var opened=false,busy=false,closed=false;
  var back=document.getElementById('backcover');
  var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function mobile(){return matchMedia('(max-width:50em)').matches}
  function plain(){return mobile()||reduce}

  function update(){
    sp.forEach(function(s,k){s.classList.remove('keep-l','keep-r');s.classList.toggle('on',k===i)});
    prev.disabled=i===0;next.disabled=false;next.textContent=(i===sp.length-1)?'Fermer ▶':'Suivant ▶';
    pg.textContent=sp[i].dataset.title+' — '+(i+1)+'/'+sp.length;
  }
  function clear(){sp.forEach(function(s){s.classList.remove('on','keep-l','keep-r')})}

  // Feuille 3D : recto = ce qui part, verso = ce qui arrive
  function leaf(kind,front,back,ms){
    var l=document.createElement('div');l.className='leaf '+kind;l.style.setProperty('--d',ms+'ms');
    var f=document.createElement('div');f.className='lf f';f.appendChild(front.cloneNode(true));
    var b=document.createElement('div');b.className='lf b';b.appendChild(back.cloneNode(true));
    l.appendChild(f);l.appendChild(b);
    var c=document.createElement('div');c.className='cast '+(kind.indexOf('prev')>-1?'prev':'next');c.style.setProperty('--d',ms+'ms');
    l._cast=c;if(kind.indexOf('pg')<0)book.appendChild(c);book.appendChild(l);return l;
  }
  function run(l,deg,ms){
    var s=deg<0?-1:1;
    return l.animate([{transform:'rotateY(0deg)'},{transform:'rotateY('+(s*8)+'deg)',offset:.08},{transform:'rotateY('+deg+'deg)'}],
      {duration:ms,easing:'cubic-bezier(.45,.05,.25,1)',fill:'forwards'}).finished;
  }

  function open(){
    if(opened)return;opened=true;
    book.classList.add('is-open');nav.classList.add('visible');
    cover.setAttribute('aria-hidden','true');cover.tabIndex=-1;
    if(plain()){book.classList.add('landed');update();return}
    busy=true;clear();sp[0].classList.add('keep-r');
    var l=leaf('next cov',cover.querySelector('.front'),sp[0].querySelector('.l'),1700);
    run(l,-180,1700).then(function(){l._cast.remove();l.remove();book.classList.add('landed');update();busy=false});
  }

  function setClosedUI(){prev.disabled=false;next.disabled=true;next.textContent='Suivant ▶';pg.textContent='Dos du livre'}

  // Fermer le livre : la dernière page se tourne et laisse apparaître la couverture arrière
  function closeBook(){
    if(busy||closed||!opened)return;
    closed=true;
    if(plain()){clear();book.classList.remove('landed');book.classList.add('closed');setClosedUI();return}
    busy=true;clear();sp[i].classList.add('keep-l');
    book.classList.add('closing');
    var l=leaf('next cov pg',sp[i].querySelector('.r'),back.querySelector('.bc-face'),1700);
    run(l,-180,1700).then(function(){
      l._cast.remove();l.remove();clear();
      book.classList.remove('landed','closing');book.classList.add('closed');
      setClosedUI();busy=false;
    });
  }
  // Rouvrir depuis la couverture arrière
  function reopen(){
    if(busy||!closed)return;
    closed=false;i=sp.length-1;
    if(plain()){book.classList.remove('closed');book.classList.add('landed');update();return}
    busy=true;clear();sp[i].classList.add('keep-l');
    var l=leaf('prev cov pg',back.querySelector('.bc-face'),sp[i].querySelector('.r'),1700);
    book.classList.remove('closed');book.classList.add('reopening');
    run(l,180,1700).then(function(){
      l._cast.remove();l.remove();
      book.classList.remove('reopening');book.classList.add('landed');
      update();busy=false;
    });
  }

  function turn(n){
    if(closed)return;
    if(n>=sp.length&&i===sp.length-1){closeBook();return}
    if(busy||!opened||n<0||n>=sp.length||n===i)return;
    if(plain()){i=n;update();return}
    busy=true;
    var fwd=n>i,cur=sp[i],tgt=sp[n];
    clear();
    cur.classList.add(fwd?'keep-l':'keep-r');
    tgt.classList.add(fwd?'keep-r':'keep-l');
    var l=fwd?leaf('next',cur.querySelector('.r'),tgt.querySelector('.l'),1100)
             :leaf('prev',cur.querySelector('.l'),tgt.querySelector('.r'),1100);
    run(l,fwd?-180:180,1100).then(function(){l._cast.remove();l.remove();i=n;update();busy=false});
  }

  cover.addEventListener('click',open);
  cover.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  // Clic sur une page : gauche = page précédente, droite = page suivante
  book.addEventListener('click',function(e){
    if(!opened||busy)return;
    if(mobile()||e.target.closest('.cipher'))return;
    if(window.getSelection&&String(window.getSelection()))return; // on sélectionne du texte
    var p=e.target.closest('.page');
    if(!p||p.closest('.leaf'))return;
    turn(p.classList.contains('l')?i-1:i+1);
  });
  prev.addEventListener('click',function(){if(closed)reopen();else turn(i-1)});
  back.addEventListener('click',reopen);
  back.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();reopen()}});
  next.addEventListener('click',function(){turn(i+1)});
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight')turn(i+1);
    if(e.key==='ArrowLeft'){if(closed)reopen();else turn(i-1)}
  });
  [].forEach.call(document.querySelectorAll('.cipher'),function(c){
    function t(){c.classList.toggle('rev')}
    c.addEventListener('click',t);
    c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();t()}});
  });

  // ===== Histoire : le texte est réparti automatiquement sur les pages (ordinateur) pour les remplir jusqu'en bas =====
  var flowPages=[].slice.call(document.querySelectorAll('.page.flow')),items=null,staticHTML=null;
  function body(pg){return pg.querySelector('.pbody')}
  function collect(){
    items=[];staticHTML=flowPages.map(function(pg){return body(pg).innerHTML});
    flowPages.forEach(function(pg){
      [].forEach.call(body(pg).children,function(el){
        items.push({tag:el.tagName.toLowerCase(),cls:el.className,html:el.innerHTML,text:el.textContent});
      });
    });
  }
  function restore(){flowPages.forEach(function(pg,k){body(pg).innerHTML=staticHTML[k];pg.style.removeProperty('--fs')})}
  function over(b){return b.scrollHeight>b.clientHeight+1}
  function mk(tag,cls){var e=document.createElement(tag);if(cls)e.className=cls;return e}
  function layout(f){
    var bodies=flowPages.map(function(pg){var b=body(pg);b.innerHTML='';pg.style.setProperty('--fs',f+'rem');return b});
    var pi=0,last=null;
    function nextPage(){pi++;return pi<bodies.length}
    for(var n=0;n<items.length;n++){
      var it=items[n];
      if(it.tag!=='p'){
        var h=mk(it.tag,it.cls);h.innerHTML=it.html;bodies[pi].appendChild(h);
        if(over(bodies[pi])){bodies[pi].removeChild(h);if(!nextPage())return false;bodies[pi].appendChild(h);if(over(bodies[pi]))return false}
        last=h;continue;
      }
      var words=it.text.split(/\s+/).filter(Boolean),cls=it.cls,start=0;
      while(start<words.length){
        var b=bodies[pi],p=mk('p',cls);b.appendChild(p);
        var lo=0,hi=words.length-start;
        while(lo<hi){var mid=Math.ceil((lo+hi)/2);p.textContent=words.slice(start,start+mid).join(' ');if(over(b))hi=mid-1;else lo=mid}
        var k=lo,rest=words.length-start-k;
        if(rest>0&&rest<4&&k>8)k-=4;
        if(k<Math.min(10,words.length-start)){
          b.removeChild(p);
          var carry=null;
          if(last&&last===b.lastElementChild){carry=last;b.removeChild(last)}
          if(!nextPage())return false;
          if(carry)bodies[pi].appendChild(carry);
          continue;
        }
        p.textContent=words.slice(start,start+k).join(' ');
        start+=k;last=null;
        if(start<words.length){if(!nextPage())return false;cls='cont'}
      }
    }
    return true;
  }
  function fit(){
    try{
      if(!flowPages.length)return;
      if(!items)collect();
      if(mobile()){restore();return}
      var lo=.88,hi=1.28,best=lo;
      if(!layout(lo)){restore();return}
      for(var t=0;t<6;t++){var mid=(lo+hi)/2;if(layout(mid)){best=mid;lo=mid}else hi=mid}
      if(!layout(best))restore();
    }catch(e){if(items)restore()}
  }
  if(flowPages.length){
    collect();
    (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(fit);
    var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(fit,250)});
  }
  update();
})();