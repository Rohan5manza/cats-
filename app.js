(() => {
  'use strict';
  const $ = (selector, from = document) => from.querySelector(selector);
  const $$ = (selector, from = document) => Array.from(from.querySelectorAll(selector));
  const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const countryFlag = c => ({India:'🇮🇳',Japan:'🇯🇵',USA:'🇺🇸',Unplaced:'◌'}[c] || '🌐');
  const statLabels = ['Power','Speed','Range','Durability','Precision','Potential'];
  const grades = ['—','E','D','C','B','A'];
  const artwork = {'alley':'assets/stands/alley.webp','cocaine':'assets/stands/cocaine.webp','hona':'assets/stands/hona.webp','campus-meowie':'assets/stands/campus-meowie.webp','kurohana':'assets/stands/kurohana.webp','kali':'assets/stands/kali.webp','window-twins':'assets/stands/window-twins.webp'};
  let cats = [], active = null, catRegion = 'All', miniRegion = 'All', atlasRegion = 'All';
  let maps = [], toastTimer;

  function photo(cat, card = false) { return esc((card ? cat.thumbnail : cat.photo) || cat.photo); }
  function monthDate(iso) { if (!iso) return 'Date unverified'; const d = new Date(`${iso}T12:00:00Z`); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}); }
  function notify(message) { const t=$('#toast'); t.textContent=message; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3100); }
  function radarMarkup(stats) {
    const cx=151, cy=135, R=81, steps=5;
    const pt=(i,r)=>{const a=Math.PI*(-.5+i*2/6);return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`;};
    let s='';
    for(let level=1;level<=steps;level++)s+=`<polygon points="${Array.from({length:6},(_,i)=>pt(i,R*level/steps)).join(' ')}" fill="${level===5?'#7d4b9b29':'none'}" stroke="#ad84c1" stroke-opacity="${.35+level*.07}" stroke-width="1"/>`;
    for(let i=0;i<6;i++)s+=`<line x1="${cx}" y1="${cy}" x2="${pt(i,R).split(',')[0]}" y2="${pt(i,R).split(',')[1]}" stroke="#9f72ba" stroke-width="1" opacity=".6"/>`;
    s+=`<polygon points="${stats.map((n,i)=>pt(i,R*Math.max(0,Math.min(5,+n))/5)).join(' ')}" fill="#b482ed88" stroke="#d9a2fc" stroke-width="2"/>`;
    const labelXY=[[cx,12],[267,68],[262,205],[cx,265],[30,205],[24,68]];
    statLabels.forEach((label,i)=>{let [x,y]=labelXY[i];let anchor=i===0||i===3?'middle':i===1||i===2?'start':'end';s+=`<text x="${x}" y="${y}" text-anchor="${anchor}" class="radar-text">${label}</text><text x="${x}" y="${y+16}" text-anchor="${anchor}" class="radar-grade">${grades[stats[i]] || 'C'}</text>`;});
    return s;
  }
  function selectFeatured(id, allowScroll = false) {
    const cat=cats.find(c=>c.id===id);if(!cat)return;active=id;
    $('#feature-name').textContent=cat.name;$('#feature-epithet').textContent=cat.epithet;$('#feature-number').textContent=`#${cat.number}`;
    $('#feature-stand').textContent=`「${cat.stand.name}」`;$('#feature-description').textContent=cat.stand.description;
    $('#feature-type').textContent=cat.stand.type.toUpperCase();$('#feature-radar').innerHTML=radarMarkup(cat.stand.stats);
    const art=$('#hero-art');art.style.backgroundImage=`url('${id==='alley'?'assets/art/hero-alley.webp':cat.photo}')`;
    art.classList.toggle('unillustrated',id!=='alley');art.setAttribute('data-glyph',cat.glyph);
    $$('.roster-card').forEach(b=>{const chosen=b.dataset.id===id;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});
    if(allowScroll) window.scrollTo({top:0,behavior:'instant'});
  }
  function buildRoster() {
    $('#roster').innerHTML=cats.map(cat=>`<button type="button" class="roster-card" data-id="${esc(cat.id)}" style="--cat-glow:${esc(cat.color)}" aria-label="Feature ${esc(cat.name)}, ${esc(cat.epithet)}"><img loading="lazy" src="${esc(artwork[cat.id]||cat.thumbnail)}" alt="${esc(cat.name)} ${artwork[cat.id]?'illustrated Stand portrait':'photograph'}"/><span class="roster-crown">${cat.featured?'♛':''}</span><span class="roster-num">${esc(cat.number)}</span><span class="roster-titles"><b>${esc(cat.name)}</b><small>${esc(cat.epithet)}</small></span></button>`).join('');
    $$('.roster-card').forEach(b=>b.addEventListener('click',()=>selectFeatured(b.dataset.id,true)));
    $('#feature-open').addEventListener('click',()=>openCat(active));
  }
  function cardHtml(cat) { return `<button class="cat-card" type="button" data-cat="${esc(cat.id)}" style="--cat-glow:${esc(cat.color)}" aria-label="Open ${esc(cat.name)} character file"><div class="cat-card-image"><img loading="lazy" src="${photo(cat,true)}" alt="Photo of ${esc(cat.name)}"/><span class="cat-card-glyph" aria-hidden="true">${esc(cat.glyph)}</span><span class="cat-card-stamp">#${esc(cat.number)}</span></div><div class="cat-card-body"><h3>${esc(cat.name)}</h3><span class="subname">${esc(cat.epithet)}</span><div class="stand-small"><small>STAND NAME</small><strong>「${esc(cat.stand.name)}」</strong></div><div class="cat-card-bottom"><span>${countryFlag(cat.country)} ${esc(cat.country)}</span><span>OPEN FILE ↗</span></div></div></button>`; }
  function filtersFit(cat, region, term='') {return (region==='All'||cat.country===region) && (`${cat.name} ${cat.epithet} ${cat.stand.name} ${cat.location} ${cat.traits.join(' ')}`).toLowerCase().includes(term.toLowerCase());}
  function buildCatdex() {const term=$('#cat-search').value.trim();const matched=cats.filter(c=>filtersFit(c,catRegion,term));$('#catdex-grid').innerHTML=matched.map(cardHtml).join('')||'<div class="loading">No matching Stand users. Try another search.</div>';$('#total-cats').textContent=String(cats.length).padStart(2,'0');}
  function regionButtons(id, handler) {$$(`#${id} [data-region]`).forEach(b=>b.addEventListener('click',()=>{const region=b.dataset.region;$$(`#${id} [data-region]`).forEach(el=>el.classList.toggle('selected',el===b));handler(region);}));}
  function buildRecent() {
    const ordered=[...cats].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    $('#recent-sightings').innerHTML=ordered.slice(0,4).map(cat=>`<button type="button" class="recent-item" data-cat="${esc(cat.id)}"><img loading="lazy" src="${photo(cat,true)}" alt=""/><span><b>${esc(cat.name)} ${esc(cat.emoji)}</b><span>${esc(cat.location)} · ${monthDate(cat.date)}</span></span><span>↗</span></button>`).join('');
  }
  function buildAtlasEntries() {
    const found=cats.filter(c=>c.lat!==null && c.lng!==null && (atlasRegion==='All'||c.country===atlasRegion));
    $('#atlas-counter').textContent=`${found.length} mapped characters · ${cats.filter(c=>c.lat===null).length} awaiting location`;
    $('#atlas-entries').innerHTML=found.map(cat=>`<button class="atlas-entry" data-cat="${esc(cat.id)}" type="button"><img loading="lazy" src="${photo(cat,true)}" alt=""/><span><strong>${countryFlag(cat.country)} ${esc(cat.name)}</strong><small>${esc(cat.location)} · ${esc(cat.accuracy)} area</small></span><span>›</span></button>`).join('');
  }
  function popupHtml(group) {return `<div class="map-popup-inner">${group.map(c=>`<div style="margin-bottom:9px"><img src="${photo(c,true)}" alt="${esc(c.name)}"/><b>${esc(c.name)}</b><p>${esc(c.location)}<br/>${c.accuracy==='country'?'Country-level marker':c.accuracy==='state'?'State-level marker':'Approximate neighborhood/city'}</p><button type="button" data-cat="${esc(c.id)}">VIEW CHARACTER ↗</button></div>`).join('')}</div>`;}
  function mapGroups(region) {
    const groups=new Map();cats.filter(c=>c.lat!==null && c.lng!==null && (region==='All'||c.country===region)).forEach(cat=>{const key=`${(+cat.lat).toFixed(3)},${(+cat.lng).toFixed(3)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(cat);});return [...groups.values()];
  }
  // Always-available illustrated map fallback when the optional Leaflet CDN cannot load.
  // This is a stylized locator, not geographic navigation or exact GPS.
  function fallbackMapMarkup(region, mini) {
    const land = [
      'M57 94 L105 72 167 48 235 66 278 112 272 153 231 165 207 200 174 189 155 224 126 205 94 164 62 145 Z',
      'M215 217 L253 221 275 258 265 300 249 337 237 390 219 418 204 364 195 318 177 264 Z',
      'M391 73 L425 55 447 80 434 116 410 105 Z',
      'M439 124 L474 101 521 116 533 150 510 177 470 167 445 145 Z',
      'M441 180 L515 167 548 208 536 257 514 300 472 319 450 281 427 239 Z',
      'M508 93 L552 69 611 49 690 41 760 58 821 91 866 133 835 174 794 169 768 206 710 193 673 214 628 179 592 193 541 168 Z',
      'M760 307 L820 290 851 324 831 361 785 355 758 332 Z',
      'M853 228 L864 234 859 252 845 242 Z'
    ];
    const xFor=lon=>(lon+180)/360*900, yFor=lat=>(90-lat)/180*430;
    const pools={};
    cats.filter(cat=>cat.lat!==null && cat.lng!==null && (region==='All'||cat.country===region)).forEach(c=>{const group=c.country==='India'?'india':c.country==='Japan'?'japan':c.country==='USA'?'usa':c.id;(pools[group] ||= []).push(c);});
    const grid=[...Array(7)].map((_,i)=>`<line x1="0" y1="${54+i*54}" x2="900" y2="${54+i*54}"/>`).join('')+[...Array(11)].map((_,i)=>`<line x1="${i*90}" y1="0" x2="${i*90}" y2="430"/>`).join('');
    const pins=Object.entries(pools).map(([group,cs])=>{
      const lon=cs.reduce((n,c)=>n+c.lng,0)/cs.length,lat=cs.reduce((n,c)=>n+c.lat,0)/cs.length;
      const x=xFor(lon),y=yFor(lat),name=group==='india'?'India':group==='japan'?'Japan':group==='usa'?'New York':cs[0].name;
      const showX=x<690?x+18:x-18,anchor=x<690?'start':'end';
      return `<g class="world-marker" tabindex="0" role="button" data-group="${esc(group)}" aria-label="Show ${cs.length} cats in ${esc(name)}"><circle class="world-marker-glow" cx="${x}" cy="${y}" r="24"/><circle class="world-marker-ring" cx="${x}" cy="${y}" r="17"/><text class="world-marker-icon" x="${x}" y="${y+7}" text-anchor="middle">${cs.length>1?cs.length:'✦'}</text><text class="world-marker-label" x="${showX}" y="${y-24}" text-anchor="${anchor}">${esc(name)} (${cs.length})</text></g>`;
    }).join('');
    return `<svg class="fallback-world" viewBox="0 0 900 430" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Stylized world map with clickable approximate cat locations"><defs><radialGradient id="sea-${mini?'mini':'full'}"><stop offset="0" stop-color="#35214e"/><stop offset="1" stop-color="#130e24"/></radialGradient></defs><rect width="900" height="430" fill="url(#sea-${mini?'mini':'full'})"/><g class="world-grid">${grid}</g><g class="world-land">${land.map(d=>`<path d="${d}"/>`).join('')}</g><g class="world-pins">${pins}</g><text class="world-decoration" x="22" y="408">THE STAND ARCHIVES  ·  APPROXIMATE WORLD MAP</text></svg><div class="world-popover" hidden></div>`;
  }
  function fallbackDraw(obj, region){
    obj.element.innerHTML=fallbackMapMarkup(region,obj.mini);
    const pools={};cats.filter(c=>c.lat!==null && c.lng!==null && (region==='All'||c.country===region)).forEach(c=>{const k=c.country==='India'?'india':c.country==='Japan'?'japan':c.country==='USA'?'usa':c.id;(pools[k] ||= []).push(c);});
    const show=(key)=>{const cs=pools[key]||[];if(!cs.length)return;const pop=$('.world-popover',obj.element);pop.hidden=false;pop.innerHTML=`<strong>✦ ${esc(cs[0].country)} CAT FILES</strong><button class="world-pop-close" type="button" aria-label="Close marker details">✕</button>${cs.map(cat=>`<button type="button" class="world-pop-cat" data-cat="${esc(cat.id)}"><img src="${photo(cat,true)}" alt=""/><span>${esc(cat.name)}<small>${esc(cat.location)}</small></span>↗</button>`).join('')}`;$('.world-pop-close',pop).addEventListener('click',()=>pop.hidden=true);$$('.world-pop-cat',pop).forEach(b=>b.addEventListener('click',()=>openCat(b.dataset.cat)));};
    $$('.world-marker',obj.element).forEach(mark=>{mark.addEventListener('click',()=>show(mark.dataset.group));mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(mark.dataset.group);}});});
  }
  function drawMarkers(mapObj, region) {
    if(!mapObj || typeof L==='undefined')return;
    mapObj.layer.clearLayers();const bounds=[];
    for(const group of mapGroups(region)) {
      const first=group[0],lat=group.reduce((s,c)=>s+c.lat,0)/group.length,lng=group.reduce((s,c)=>s+c.lng,0)/group.length;
      const icon=L.divIcon({html:`<div class="map-cat-pin"><span>${group.length>1?group.length:first.emoji||'🐈'}</span></div>`,className:'',iconSize:[36,40],iconAnchor:[18,37],popupAnchor:[0,-35]});
      L.marker([lat,lng],{icon}).addTo(mapObj.layer).bindPopup(popupHtml(group),{maxWidth:240});bounds.push([lat,lng]);
    }
    if(region!=='All'&&bounds.length) { if(bounds.length===1)mapObj.map.setView(bounds[0],region==='India'?11:region==='USA'?6:5);else mapObj.map.fitBounds(bounds,{padding:[28,28],maxZoom:region==='India'?11:6}); }
    else mapObj.map.setView([26,57],mapObj.mini?1:2);
  }
  function initMaps() {
    if(typeof L==='undefined') {
      maps=[{element:$('#mini-map'),mini:true,fallback:true},{element:$('#full-map'),mini:false,fallback:true}];
      fallbackDraw(maps[0],'All');fallbackDraw(maps[1],'All');
      regionButtons('mini-filters',region=>{miniRegion=region;fallbackDraw(maps[0],miniRegion);});
      regionButtons('atlas-filters',region=>{atlasRegion=region;fallbackDraw(maps[1],atlasRegion);buildAtlasEntries();});
      return;
    }
    [['mini-map',true],['full-map',false]].forEach(([id,mini])=>{
      const map=L.map(id,{scrollWheelZoom:!mini,zoomControl:!mini,worldCopyJump:true,minZoom:1,maxZoom:16}).setView([26,57],mini?1:2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:19,subdomains:'abcd'}).addTo(map);
      const layer=L.layerGroup().addTo(map);const m={map,layer,mini};maps.push(m);drawMarkers(m,'All');
      map.on('popupopen',event=>{const root=event.popup.getElement();$$('[data-cat]',root).forEach(b=>b.addEventListener('click',()=>openCat(b.dataset.cat)));});
    });
    regionButtons('mini-filters',region=>{miniRegion=region;drawMarkers(maps[0],miniRegion);});
    regionButtons('atlas-filters',region=>{atlasRegion=region;drawMarkers(maps[1],atlasRegion);buildAtlasEntries();});
    setTimeout(()=>maps.forEach(m=>m.map.invalidateSize()),200);
  }
  function openCat(id,updateHash=true){const cat=cats.find(c=>c.id===id);if(!cat)return;
    const rawPhoto=photo(cat);const statHtml=statLabels.map((name,i)=>`<div class="dialog-stat"><b>${name.toUpperCase()} · ${grades[cat.stand.stats[i]]}</b><div><i style="width:${cat.stand.stats[i]*20}%"></i></div></div>`).join('');
    $('#dialog-content').innerHTML=`<div class="dialog-layout" style="--cat-accent:${esc(cat.color)}"><div class="dialog-photo"><img src="${rawPhoto}" alt="Original photo: ${esc(cat.name)}"/><span class="dialog-glyph">${esc(cat.glyph)}</span><small>ORIGINAL SIGHTING PHOTO · ${countryFlag(cat.country)} ${esc(cat.country)}</small></div><div class="dialog-body"><span class="dialog-num">CHARACTER FILE // ${esc(cat.number)}</span><h2>${esc(cat.name)}</h2><div class="dialog-epithet">${esc(cat.epithet)}</div><div class="trait-tags">${cat.traits.map(s=>`<span>${esc(s)}</span>`).join('')}</div><p>${esc(cat.bio)}</p><div class="dialog-stand"><span>✦ STAND AWAKENED ✦</span><h3>「${esc(cat.stand.name)}」</h3><span>${esc(cat.stand.type)}</span><p><strong>${esc(cat.stand.ability)}:</strong> ${esc(cat.stand.description)}</p><p><strong>Weakness:</strong> ${esc(cat.stand.limitation)}</p><div class="dialog-stats">${statHtml}</div></div><div class="dialog-quote">“${esc(cat.quote)}”</div><div class="dialog-location"><span>📍 ${esc(cat.location)}</span><span>📅 ${monthDate(cat.date)}</span><span>🖋 ${esc(cat.nameSource||'Creative nickname')}</span><a href="https://www.instagram.com/manza.ganza/" target="_blank" rel="noopener noreferrer">Instagram ↗</a></div></div></div>`;
    const dialog=$('#cat-dialog');if(!dialog.open)dialog.showModal();if(updateHash)history.replaceState(null,'',`#cat/${cat.id}`);
  }
  function closeCat(){const dlg=$('#cat-dialog');if(dlg.open)dlg.close();if(location.hash.startsWith('#cat/'))history.replaceState(null,'','#catdex');}
  async function buildFeed(){let feed;try{const resp=await fetch('data/instagram.json',{cache:'no-store'});if(resp.ok)feed=await resp.json();}catch(err){/* the bundled local feed stays usable */}
    if(feed && Array.isArray(feed.items) && feed.items.length){
      $('#feed-status').textContent=`Latest connected Instagram posts · last synchronized ${feed.updated_at?new Date(feed.updated_at).toLocaleDateString():'recently'}.`;
      $('#instagram-feed').innerHTML=feed.items.slice(0,8).map(post=>`<a class="feed-card" target="_blank" rel="noopener noreferrer" href="${esc(post.permalink || 'https://www.instagram.com/manza.ganza/')}"><img loading="lazy" src="${esc(post.thumbnail_url || post.media_url || 'assets/cats/alley.webp')}" alt="Manza Ganza Instagram post" onerror="this.src='assets/cats/alley.webp'"/><div class="feed-card-content"><strong>FIELD NOTE ✦</strong><p>${esc((post.caption || 'A new cat adventure.').slice(0,120))}</p><span>OPEN POST ↗</span></div></a>`).join('');return;
    }
    $('#feed-status').textContent='Selected posts from our documented cat archive. Live Instagram updates can be enabled with the included GitHub Action.';
    $('#instagram-feed').innerHTML=[...cats].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,4).map(cat=>`<button class="feed-card" type="button" data-cat="${esc(cat.id)}" style="text-align:left;color:inherit;"><img loading="lazy" src="${photo(cat,true)}" alt="${esc(cat.name)}"/><div class="feed-card-content"><strong>${esc(cat.name)} ${cat.emoji}</strong><p>${esc(cat.caption)}</p><span>VIEW CAT DOSSIER ↗</span></div></button>`).join('');
  }
  function events() {
    $('#cat-search').addEventListener('input',buildCatdex);
    regionButtons('catdex-filters',region=>{catRegion=region;buildCatdex();});
    document.addEventListener('click',e=>{const card=e.target.closest('[data-cat]');if(!card||card.closest('.leaflet-popup'))return;const id=card.dataset.cat;if(id)openCat(id);});
    $('#dialog-close').addEventListener('click',closeCat);
    $('#cat-dialog').addEventListener('click',e=>{if(e.target===$('#cat-dialog'))closeCat();});
    $('#cat-dialog').addEventListener('close',()=>{if(location.hash.startsWith('#cat/'))history.replaceState(null,'','#catdex');});
    const toggle=$('#mobile-toggle');toggle.addEventListener('click',()=>{const open=$('#site-nav').classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');});
    $$('#site-nav a').forEach(a=>a.addEventListener('click',()=>{$('#site-nav').classList.remove('open');toggle.setAttribute('aria-expanded','false');}));
    window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#cat/'))openCat(decodeURIComponent(location.hash.slice(5)),false);});
  }
  async function init(){try{const resp=await fetch('data/cats.json',{cache:'no-store'});if(!resp.ok)throw Error(`HTTP ${resp.status}`);const raw=await resp.json();if(!Array.isArray(raw))throw Error('Cat manifest is not an array');cats=raw;}catch(error){document.querySelector('#roster').innerHTML=`<div class="loading">Could not load cat profiles. Run the site through a local server or GitHub Pages. (${esc(error.message)})</div>`;return;}
    buildRoster();selectFeatured(cats.find(c=>c.featured)?.id||cats[0].id);buildCatdex();buildRecent();buildAtlasEntries();events();initMaps();await buildFeed();
    if(location.hash.startsWith('#cat/'))openCat(decodeURIComponent(location.hash.slice(5)),false);
  }
  document.addEventListener('DOMContentLoaded',init);
})();
