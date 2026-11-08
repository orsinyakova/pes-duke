const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const source=readFileSync(join(__dirname,'../assets/works-gallery.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function setup(){
 const requests=new Map(),timers=new Map();let timerId=0;
 const document={documentElement:{style:{overflow:''}},activeElement:null};
 class Element{
  constructor(){this.listeners={};this.attrs={};this.hidden=false;this.disabled=false;this.textContent='';this.dataset={};this.style={};this.children=[];this.classList={toggle(){}};}
  addEventListener(type,callback){(this.listeners[type]??=[]).push(callback);}
  fire(type,extras={}){const event={target:this,currentTarget:this,preventDefault(){},...extras};for(const callback of this.listeners[type]||[])callback(event);}
  setAttribute(name,value){this.attrs[name]=value;}
  getAttribute(name){return this.attrs[name]??null;}
  focus(){document.activeElement=this;this.fire('focus');}
  closest(){return this.parent;}
  querySelector(selector){return this.selectors[selector];}
  replaceWith(other){if(this===other)return;if(other.parent)other.parent.children=other.parent.children.filter(node=>node!==other);const parent=this.parent;parent.children[parent.children.indexOf(this)]=other;other.parent=parent;this.parent=null;}
 }
 class Image extends Element{
  constructor(){super();this.complete=false;this.naturalWidth=0;this.decoded=Promise.withResolvers();}
  set src(src){this._src=src;const list=requests.get(src)||[];list.push(this);requests.set(src,list);}
  get src(){return this._src;}
  decode(){return this.decoded.promise;}
 }
 const viewer=new Element(),pair=new Element(),before=new Element(),after=new Element();
 const beforeFigure=new Element(),afterFigure=new Element(),caption=new Element();
 beforeFigure.children=[before];before.parent=beforeFigure;
 afterFigure.children=[after];after.parent=afterFigure;afterFigure.selectors={figcaption:caption};
 const title=new Element(),master=new Element(),prev=new Element(),next=new Element(),count=new Element(),feedback=new Element(),status=new Element(),retry=new Element(),close=new Element();
 title.textContent='До / после';pair.hidden=true;feedback.hidden=true;retry.hidden=true;
 viewer.selectors={'#works-viewer-title':title,'#works-viewer-master':master,'[data-works-before]':before,'[data-works-after]':after,'.works-pair':pair,'[data-works-prev]':prev,'[data-works-next]':next,'[data-works-count]':count,'.works-load-feedback':feedback,'[data-works-status]':status,'[data-works-retry]':retry,'[data-works-close]':close};
 viewer.showModal=()=>{viewer.open=true;};viewer.close=()=>{viewer.open=false;viewer.fire('close');};
 const cards=['spitz','griffon-elena','maltipoo'].map((name,index)=>{
  const card=new Element();card.dataset={workTitle:'Case '+index,workBreed:name,workBefore:'assets/works/'+name+'-before.webp'};card.attrs.href='assets/works/'+name+'-after.webp';return card;
 });
 const all=new Element();document.querySelector=selector=>({'#works-viewer':viewer,'[data-works-all]':all}[selector]);document.querySelectorAll=()=>cards;
 vm.runInNewContext(source,{document,window:{},Image,Map,Promise,Error,setTimeout:(callback,delay)=>{const id=++timerId;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id)});
 function click(element){assert.ok(!element.disabled,'cannot click a disabled button');element.focus();element.fire('click');}
 function load(src,{decode=true}={}){
  const image=requests.get(src)?.at(-1);assert.ok(image,'image requested: '+src);image.complete=true;image.naturalWidth=960;image.onload?.();if(decode)image.decoded.resolve();return image;
 }
 function loadWork(name){load('assets/works/'+name+'-before.webp');load('assets/works/'+name+'-after.webp');}
 function frame(){return{before:beforeFigure.hidden?null:beforeFigure.children[0].src,after:afterFigure.children[0].src,title:title.textContent,count:count.textContent};}
 return{viewer,pair,title,prev,next,count,feedback,status,retry,close,cards,all,document,requests,timers,click,load,loadWork,frame};
}

test('a pair is displayed only after both images have decoded; neighbors are prefetched',async()=>{
 const h=setup();h.click(h.cards[0]);
 assert.equal(h.viewer.open,true);assert.equal(h.pair.hidden,true);
 assert.ok(h.requests.has('assets/works/griffon-elena-before.webp'));
 const before=h.load('assets/works/spitz-before.webp',{decode:false});
 h.load('assets/works/spitz-after.webp');await tick();assert.equal(h.pair.hidden,true);
 before.decoded.resolve();await tick();
 assert.equal(h.pair.hidden,false);assert.equal(h.frame().title,'Case 0');assert.equal(h.pair.attrs['aria-busy'],'false');
});

test('the old pair and captions stay together until the next pair is ready',async()=>{
 const h=setup();h.click(h.cards[0]);h.loadWork('spitz');await tick();
 h.click(h.next);h.load('assets/works/griffon-elena-after.webp');await tick();
 assert.equal(h.frame().title,'Case 0');assert.match(h.frame().before,/spitz-before/);assert.match(h.frame().after,/spitz-after/);
 h.load('assets/works/griffon-elena-before.webp');await tick();
 assert.equal(h.frame().title,'Case 1');assert.match(h.frame().before,/griffon-elena-before/);assert.match(h.frame().after,/griffon-elena-after/);
});

test('rapid clicks and reversals ignore stale completions and reuse loaded images',async()=>{
 const h=setup();h.click(h.cards[0]);h.loadWork('spitz');await tick();
 h.click(h.next);h.click(h.next);h.loadWork('maltipoo');await tick();
 assert.equal(h.frame().title,'Case 2');
 h.loadWork('griffon-elena');await tick();assert.equal(h.frame().title,'Case 2');
 h.click(h.prev);h.click(h.prev);await tick();
 assert.equal(h.frame().title,'Case 0');assert.equal(h.requests.get('assets/works/spitz-before.webp').length,1);
});

test('closing invalidates pending navigation, including after reopening a different case',async()=>{
 const h=setup();h.click(h.cards[0]);h.click(h.close);h.click(h.cards[2]);
 h.loadWork('spitz');await tick();assert.equal(h.pair.hidden,true);
 h.loadWork('maltipoo');await tick();assert.equal(h.frame().title,'Case 2');
 h.click(h.next);h.click(h.close);h.loadWork('spitz-kristina');await tick();
 assert.equal(h.viewer.open,false);assert.equal(h.pair.hidden,true);assert.equal(h.title.textContent,'До / после');assert.equal(h.document.documentElement.style.overflow,'');
});

test('failed requests preserve the current pair and can be retried',async()=>{
 const h=setup();h.click(h.cards[0]);h.loadWork('spitz');await tick();h.click(h.next);
 h.requests.get('assets/works/griffon-elena-before.webp')[0].onerror();await tick();
 assert.equal(h.frame().title,'Case 0');assert.equal(h.retry.hidden,false);
 h.click(h.retry);assert.equal(h.document.activeElement,h.next);h.loadWork('griffon-elena');await tick();
 assert.equal(h.frame().title,'Case 1');assert.equal(h.feedback.hidden,true);assert.equal(h.requests.get('assets/works/griffon-elena-before.webp').length,2);
});

test('single-result cases switch back to complete pairs without a stale image',async()=>{
 const h=setup();h.click(h.cards[0]);h.loadWork('spitz');await tick();
 for(let i=0;i<6;i++)h.click(h.next);
 h.load('assets/works/cat-shedding-kristina-after.webp');await tick();
 assert.equal(h.frame().before,null);assert.match(h.frame().after,/cat-shedding/);
 h.click(h.next);h.loadWork('poodle');await tick();
 assert.match(h.frame().before,/poodle-before/);assert.match(h.frame().after,/poodle-after/);
 h.click(h.prev);await tick();assert.equal(h.frame().before,null);assert.match(h.frame().after,/cat-shedding/);
});

test('a stalled request reports a recoverable failure rather than leaving the viewer busy',async()=>{
 const h=setup();h.click(h.cards[0]);
 const timer=[...h.timers.values()].find(item=>item.delay===15000);timer.callback();await tick();
 assert.equal(h.pair.attrs['aria-busy'],'false');assert.equal(h.retry.hidden,false);assert.equal(h.viewer.open,true);
});
