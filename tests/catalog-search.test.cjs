const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize,createKey,matches}=require('../assets/catalog-search.js');
const rows=[
 ['Гигиенический комплекс для кошки','Для кошек','cats'],
 ['Гигиенический комплекс для сфинкса','Для кошек','cats'],
 ['Гигиенический комплекс для Мейн-Куна','Для кошек','cats'],
 ['Экспресс линька для Мейн-Куна','Для кошек','cats'],
 ['Купание Мейн-Куна','Для кошек','cats'],
 ['Купание кошки','Для кошек','cats'],
 ['Экспресс линька для кошки','Для кошек','cats'],
 ['Стрижка когтей кошки','Для кошек','cats'],
 ['Немецкий боксёр','Комплексный уход','full'],
 ['Скотчтерьер','Комплексный уход','full'],
 ['Котон де тулеар','Комплексный уход','full'],
 ['Стрижка когтей собаки','Гигиена и уход','hygiene'],
 ['Креативное окрашивание кошки','Креативный груминг','creative']
].map(row=>({name:row[0],key:createKey(...row)}));
const find=query=>rows.filter(row=>matches(row.key,normalize(query).split(' ').filter(Boolean))).map(row=>row.name);
test('common cat word forms find all cat services, including breed-only names',()=>{
 for(const q of ['кошка','кошки','кошек','кот'])assert.equal(find(q).length,9,q);
});
test('cat aliases never mark dog services as cat services',()=>{
 assert.ok(find('кот').every(name=>!name.includes('собаки')&&!name.includes('боксёр')));
 assert.ok(!find('кот').includes('Скотчтерьер'));
 assert.ok(!find('кот').includes('Котон де тулеар'));
});
test('all query words are required, preserving precise service search',()=>{
 assert.deepEqual(find('кошка когти'),[]);
 assert.deepEqual(find('кошка когтей'),['Стрижка когтей кошки']);
 assert.deepEqual(find('мейн линька'),['Экспресс линька для Мейн-Куна']);
});
test('case, whitespace, yo/ye and hyphen punctuation are normalized',()=>{
 assert.deepEqual(find('  БОКСЕР '),find('боксёр'));
 assert.deepEqual(find('экспресс-линька'),find('Экспресс линька'));
});
test('category names are searchable while empty search returns all records',()=>{
 assert.deepEqual(find('комплексный уход'),['Немецкий боксёр','Скотчтерьер','Котон де тулеар']);
 assert.equal(find('').length,rows.length);
});
test('unknown queries and markup-like text cannot turn into service matches',()=>{
 assert.deepEqual(find('несуществующаяуслуга12345'),[]);
 assert.deepEqual(find('<b>тест</b>'),[]);
});
