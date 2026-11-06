(() => {
 const notice=document.querySelector('#cookie-notice');
 if(!notice)return;
 const cookieName='pes_duke_cookie_notice';
 const scriptUrl=new URL(document.currentScript.src);
 const cookiePath=scriptUrl.pathname.replace(/\/assets\/[^/]+$/,'/');
 const acknowledge=notice.querySelector('[data-cookie-acknowledge]');
 const openButtons=[...document.querySelectorAll('[data-cookie-open]')];
 let opener=null;
 function hasAcknowledgement(){
  try{return document.cookie.split(';').some(value=>value.trim()===cookieName+'=read-v1');}
  catch{return false;}
 }
 notice.hidden=hasAcknowledgement();
 acknowledge.addEventListener('click',()=>{
  try{document.cookie=cookieName+'=read-v1; Max-Age=15552000; Path='+cookiePath+'; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}
  catch{/* The notice can still be dismissed if the browser blocks cookies. */}
  notice.hidden=true;
  if(opener)opener.focus({preventScroll:true});
  else if(document.activeElement===acknowledge)acknowledge.blur();
 });
 openButtons.forEach(button=>{
  button.hidden=false;
  button.addEventListener('click',()=>{
   opener=button;
   notice.hidden=false;
   notice.querySelector('details').open=true;
   acknowledge.focus({preventScroll:true});
  });
 });
})();
