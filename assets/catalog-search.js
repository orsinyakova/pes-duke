/* Search stays local: aliases only change matching, never service names or prices. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.PesDukeCatalogSearch=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const normalize=value=>String(value??'').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
 const catAliases='кошка кошки кошке кошку кошек кот кота коту коты котов кошачий кошачья кошачьи';
 const catTerms=new Set(catAliases.split(' '));
 function createKey(name,category,id){
  const title=normalize(name);
  const isCat=id==='cats'||/(^| )кош[а-я]*/.test(title);
  return normalize(title+' '+category+(isCat?' '+catAliases:''));
 }
 function matches(key,terms){
  const words=key.split(' ');
  return terms.every(term=>catTerms.has(term)?words.includes(term):key.includes(term));
 }
 return {normalize,createKey,matches};
});
