(() => {
 const viewer=document.querySelector('#works-viewer');
 if(!viewer||typeof viewer.showModal!=='function')return;
 const cards=[...document.querySelectorAll('.works-cover')];
 const all=document.querySelector('[data-works-all]');
 const works=cards.map(card=>({title:card.dataset.workTitle,breed:card.dataset.workBreed,before:card.dataset.workBefore,after:card.getAttribute('href')}));
 works.push({title:'Комплекс для\u00a0шпица',breed:'Шпиц',master:'Кристина',before:'assets/works/spitz-kristina-before.webp',after:'assets/works/spitz-kristina-after.webp'});
 works.push({title:'Комплекс для\u00a0мальтипу',breed:'Мальтипу',before:'assets/works/maltipoo-yaroslava-before.webp',after:'assets/works/maltipoo-yaroslava-after.webp'});
 works.push({title:'Комплекс для\u00a0цверга',breed:'Цверг',before:'assets/works/zwerg-yaroslava-before.webp',after:'assets/works/zwerg-yaroslava-after.webp'});
 works.push({title:'Экспресс-линька',breed:'Кошка',service:'экспресс-линьки',master:'Кристина',after:'assets/works/cat-shedding-kristina-after.webp'});
 works.push({title:'Бельгийский гриффон',breed:'Бельгийский гриффон',service:'комплекса с\u00a0триммингом',serviceLabel:'Комплекс с\u00a0триммингом',master:'Елена',before:'assets/works/griffon-elena-before.webp',after:'assets/works/griffon-elena-after.webp'});
 works.push({title:'Комплекс для\u00a0кошки',breed:'Кошка',master:'Дарья',after:'assets/works/cat-complex-darya-after.webp'});
 const title=viewer.querySelector('#works-viewer-title');
 const master=viewer.querySelector('#works-viewer-master');
 let before=viewer.querySelector('[data-works-before]');
 let after=viewer.querySelector('[data-works-after]');
 const pair=viewer.querySelector('.works-pair');
 const beforeFigure=before.closest('figure');
 const afterCaption=after.closest('figure').querySelector('figcaption');
 const prev=viewer.querySelector('[data-works-prev]');
 const next=viewer.querySelector('[data-works-next]');
 const count=viewer.querySelector('[data-works-count]');
 const feedback=viewer.querySelector('.works-load-feedback');
 const status=viewer.querySelector('[data-works-status]');
 const retry=viewer.querySelector('[data-works-retry]');
 const cache=new Map();
 let current=-1,requested=0,revision=0,failed=null,loadingTimer;
 let opener=null,previousOverflow='';

 function prepareImage(src,priority='low'){
  const existing=cache.get(src);
  if(existing){
   if(priority==='high'&&!existing.ready)existing.image.fetchPriority='high';
   return existing.promise;
  }
  const image=new Image(960,1280);
  image.decoding='async';
  image.loading='eager';
  image.fetchPriority=priority;
  const entry={image,ready:false,promise:null};
  entry.promise=new Promise((resolve,reject)=>{
   let settled=false;
   const timer=setTimeout(()=>finish(new Error('Image loading timed out')),15000);
   function finish(error){
    if(settled)return;
    settled=true;
    clearTimeout(timer);
    image.onload=null;
    image.onerror=null;
    if(error){reject(error);return;}
    entry.ready=true;
    resolve(image);
   }
   image.onerror=()=>finish(new Error('Image failed to load'));
   image.onload=async()=>{
    try{
     if(typeof image.decode==='function')await image.decode();
     if(!image.naturalWidth)throw new Error('Image is empty');
     finish();
    }catch(error){finish(error);}
   };
   image.src=src;
  }).catch(error=>{
   if(cache.get(src)===entry)cache.delete(src);
   throw error;
  });
  cache.set(src,entry);
  return entry.promise;
 }
 function prepareWork(index,priority='low'){
  const work=works[index];
  return Promise.all([work.before?prepareImage(work.before,priority):Promise.resolve(null),prepareImage(work.after,priority)]);
 }
 function warm(index){
  if(index>=0&&index<works.length)prepareWork(index).catch(()=>{});
 }
 function warmNeighbors(index){warm(index+1);warm(index-1);}
 function syncNavigation(){
  prev.disabled=requested===0;
  next.disabled=requested===works.length-1;
 }
 function clearFeedback(){
  clearTimeout(loadingTimer);
  feedback.hidden=true;
  retry.hidden=true;
  status.textContent='';
 }
 async function render(index){
  const target=Math.max(0,Math.min(index,works.length-1));
  const ticket=++revision;
  requested=target;
  failed=null;
  syncNavigation();
  if(document.activeElement===retry)(next.disabled?prev:next).focus({preventScroll:true});
  clearFeedback();
  pair.setAttribute('aria-busy','true');
  const showLoading=()=>{
   if(ticket!==revision||!viewer.open)return;
   status.textContent='Загружаем фотографии…';
   feedback.hidden=false;
  };
  if(current<0)showLoading();
  else loadingTimer=setTimeout(showLoading,150);
  const loading=prepareWork(target,'high');
  warmNeighbors(target);
  try{
   const [beforeImage,afterImage]=await loading;
   if(ticket!==revision||!viewer.open)return;
   const work=works[target];
   const service=work.service||'комплексного ухода';
   // Commit decoded elements and their captions in one turn: never a mixed pair.
   if(beforeImage){
    beforeImage.alt=work.breed+' до '+service;
    beforeImage.setAttribute('data-works-before','');
    before.replaceWith(beforeImage);
    before=beforeImage;
   }
   afterImage.alt=work.breed+' после '+service;
   afterImage.setAttribute('data-works-after','');
   after.replaceWith(afterImage);
   after=afterImage;
   beforeFigure.hidden=!beforeImage;
   pair.classList.toggle('works-pair--single',!beforeImage);
   afterCaption.textContent=beforeImage?'После':'Результат';
   title.textContent=work.title;
   master.textContent=[work.serviceLabel,work.master?'Мастер: '+work.master:''].filter(Boolean).join(' · ');
   master.hidden=!master.textContent;
   current=target;
   count.textContent=work.breed+' · '+(target+1)+' из\u00a0'+works.length;
   pair.hidden=false;
   pair.setAttribute('aria-busy','false');
   clearFeedback();
   viewer.scrollTop=0;
  }catch(error){
   if(ticket!==revision||!viewer.open)return;
   clearFeedback();
   pair.setAttribute('aria-busy','false');
   failed=target;
   requested=current>=0?current:target;
   syncNavigation();
   status.textContent='Не удалось загрузить фотографии. Попробуйте ещё раз.';
   feedback.hidden=false;
   retry.hidden=false;
  }
 }
 function open(event,index){
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  opener=event.currentTarget;
  previousOverflow=document.documentElement.style.overflow;
  viewer.showModal();
  document.documentElement.style.overflow='hidden';
  render(index);
 }
 function navigate(delta){
  render(requested+delta);
  if(document.activeElement===prev&&prev.disabled)next.focus({preventScroll:true});
  else if(document.activeElement===next&&next.disabled)prev.focus({preventScroll:true});
 }
 function bindOpener(link,index){
  link.addEventListener('click',event=>open(event,index));
  const prepare=()=>{warm(index);warmNeighbors(index);};
  link.addEventListener('pointerenter',prepare,{once:true});
  link.addEventListener('focus',prepare,{once:true});
 }
 cards.forEach(bindOpener);
 if(all)bindOpener(all,0);
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting))return;
   warm(0);
   warm(1);
   observer.disconnect();
  },{rootMargin:'320px'});
  const section=document.querySelector('#before-after');
  if(section)observer.observe(section);
 }
 viewer.querySelector('[data-works-close]').addEventListener('click',()=>viewer.close());
 prev.addEventListener('click',()=>navigate(-1));
 next.addEventListener('click',()=>navigate(1));
 retry.addEventListener('click',()=>{if(failed!==null)render(failed);});
 viewer.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();
   navigate(event.key==='ArrowRight'?1:-1);
  }
 });
 viewer.addEventListener('click',event=>{
  if(event.target!==viewer)return;
  const box=viewer.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)viewer.close();
 });
 viewer.addEventListener('close',()=>{
  ++revision;
  current=-1;
  pair.hidden=true;
  pair.setAttribute('aria-busy','false');
  clearFeedback();
  title.textContent='До / после';
  master.hidden=true;
  count.textContent='';
  document.documentElement.style.overflow=previousOverflow;
  if(opener)opener.focus({preventScroll:true});
 });
})();
