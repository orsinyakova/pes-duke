(() => {
 const header=document.querySelector('.site-header');
 if(!header)return;
 let frame=0;
 let docked=false;
 function syncHeader(){
  frame=0;
  const next=window.scrollY>header.offsetHeight+16;
  if(next===docked)return;
  docked=next;
  header.classList.toggle('is-scrolled',docked);
 }
 function requestSync(){if(!frame)frame=requestAnimationFrame(syncHeader);}
 window.addEventListener('scroll',requestSync,{passive:true});
 window.addEventListener('resize',requestSync);
 window.addEventListener('pageshow',requestSync);
 syncHeader();
})();
