/* Pitch Pit shared helpers: formatting, investor portraits, report renderer. */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=l=>l>=100?`₹${+(l/100).toFixed(2)} Cr`:`₹${+(+l).toFixed(1)} L`;
const IDS=['vikram','zara','uncle'];
const NM={vikram:'Vikram Rao',zara:'Zara Mehta',uncle:'Uncle-ji'};
const TAG={vikram:'The Calculator',zara:'Hype Queen',uncle:'Old-school trader'};
const COL={vikram:'#4fd1c5',zara:'#ff5ca8',uncle:'#ff9a3c'};
const MOOD={bored:'Bored',curious:'Curious',excited:'Excited',angry:'Angry'};
const fmtCode=c=>String(c||'').replace(/^(.{3})(.*)$/,'$1-$2');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(msg){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
async function copyText(text,msg='Copied'){try{await navigator.clipboard.writeText(text)}catch{const a=document.createElement('textarea');a.value=text;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}toast(msg)}
// two-step confirmation for destructive buttons: first press arms, second press within 4s runs it
function armed(btn,label,fn){let t;const base=btn.textContent;btn.addEventListener('click',()=>{if(btn.classList.contains('armed')){clearTimeout(t);btn.classList.remove('armed');btn.textContent=base;fn()}else{btn.classList.add('armed');btn.textContent=label;t=setTimeout(()=>{btn.classList.remove('armed');btn.textContent=base},4000)}})}

/* ---------- portraits ---------- */
const SKIN={vikram:'#e2ae82',zara:'#cf9168',uncle:'#d9a171'};
function portrait(i,mood){
  const m={
    bored:{eye:'<ellipse cx="80" cy="93" rx="5" ry="2.6"/><ellipse cx="120" cy="93" rx="5" ry="2.6"/>',brow:'M68 82H92M108 82H132',mouth:'M86 133H114'},
    curious:{eye:'<circle cx="80" cy="92" r="4.4"/><circle cx="120" cy="92" r="4.4"/>',brow:'M69 80L91 77M109 72Q120 67 131 74',mouth:'M86 130Q100 137 114 128'},
    excited:{eye:'<circle cx="80" cy="92" r="5.8"/><circle cx="120" cy="92" r="5.8"/>',brow:'M69 73Q80 66 91 73M109 73Q120 66 131 73',mouth:'M82 124Q100 152 118 124Q100 130 82 124Z'},
    angry:{eye:'<circle cx="80" cy="93" r="4"/><circle cx="120" cy="93" r="4"/>',brow:'M67 73L92 84M133 73L108 84',mouth:'M86 137Q100 124 114 137'}
  }[mood]||{eye:'',brow:'',mouth:''};
  const sk=SKIN[i],mStroke=i=='zara'?'#d9266e':'#3a1a1a',mw=i=='zara'?5:3.4;
  const mouth=mood=='excited'?`<path d="${m.mouth}" fill="#6b1d2c" stroke="none"/>`:`<path d="${m.mouth}" fill="none" stroke="${mStroke}" stroke-width="${mw}" stroke-linecap="round"/>`;
  const face=`<g fill="#1a1020">${m.eye}</g><path d="${m.brow}" fill="none" stroke="#1a1020" stroke-width="4" stroke-linecap="round"/><g class="mouth">${mouth}</g>`;
  const head=`<circle cx="58" cy="100" r="8" fill="${sk}"/><circle cx="142" cy="100" r="8" fill="${sk}"/><rect x="88" y="130" width="24" height="30" fill="${sk}"/><ellipse cx="100" cy="95" rx="43" ry="51" fill="${sk}"/>`;
  let art='';
  if(i=='vikram')art=`<path d="M22 200Q26 152 100 148Q174 152 178 200Z" fill="#2b3a55"/><path d="M80 150L100 182L120 150Z" fill="#eef2f8"/><path d="M96 162h8l4 34-8 8-8-8z" fill="#4fd1c5"/>${head}<path d="M57 90Q52 40 100 38Q148 40 143 90Q138 62 100 60Q64 62 57 90Z" fill="#1d1b2b"/>${face}<g fill="none" stroke="#cfd6e0" stroke-width="3"><rect x="64" y="80" width="30" height="22" rx="6"/><rect x="106" y="80" width="30" height="22" rx="6"/><path d="M94 90h12"/></g>`;
  if(i=='zara')art=`<ellipse cx="100" cy="98" rx="60" ry="66" fill="#2a0f22"/><circle cx="100" cy="30" r="17" fill="#2a0f22"/><path d="M22 200Q26 152 100 148Q174 152 178 200Z" fill="#ff5ca8"/><path d="M82 150L100 176L118 150Z" fill="#fff3dc"/>${head}<path d="M57 92Q56 46 100 44Q144 46 143 92Q132 64 100 62Q70 64 57 92Z" fill="#2a0f22"/>${face}<circle cx="53" cy="116" r="6" fill="#ffc24a"/><circle cx="147" cy="116" r="6" fill="#ffc24a"/>`;
  if(i=='uncle')art=`<path d="M22 200Q26 152 100 148Q174 152 178 200Z" fill="#f4e8cc"/><path d="M24 200Q30 156 84 150L104 184L62 200Z" fill="#d9822b"/>${head}<path d="M60 74Q58 40 100 36Q142 40 140 74L134 80Q100 68 66 80Z" fill="#f7f4ea"/><path d="M60 74Q100 62 140 74" fill="none" stroke="#d8d2c0" stroke-width="3"/>${face}<path d="M76 122Q90 112 100 120Q110 112 124 122Q112 131 100 126Q88 131 76 122Z" fill="#f2f2f2" stroke="#b9b9b9" stroke-width="1.5"/><g fill="none" stroke="#6b4a22" stroke-width="3"><circle cx="80" cy="92" r="12"/><circle cx="120" cy="92" r="12"/><path d="M92 92h16"/></g>`;
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${NM[i]}, ${mood}">${art}</svg>`;
}

/* ---------- report ---------- */
const scoreBand=s=>s>=75?['hi','Strong']:s>=55?['mid','Promising']:s>=35?['mid','Needs proof']:['lo','Not ready'];
function rangeBars(d){
  const r=d.result,R=r.report,ask=r.val,deal=r.deal&&r.deal.val,lo=R&&R.fair?R.fair.low:0,hi=R&&R.fair?R.fair.high:0;
  const max=Math.max(ask,deal||0,hi||0)*1.05,pc=x=>(x/max*100).toFixed(1)+'%';
  const bar=(l,v,c)=>`<b>${l}</b><div class="tr"><i style="width:${pc(v)};background:${c}">${fmt(v)}</i></div>`;
  return `<div class="rg">${bar('Valuation you asked',ask,'var(--ink)')}${deal?bar('Valuation in the deal',deal,'var(--gold)'):''}${hi>lo?`<b>Fair range</b><div class="tr"><i style="left:${pc(lo)};width:calc(${pc(hi)} - ${pc(lo)});min-width:120px;background:var(--deal)">${fmt(lo)} to ${fmt(hi)}</i></div>`:''}</div>`}
// d = {p, val, inv, result, votes, tx}; opts = {open, actions}
function renderReport(d,opts={}){
  const r=d.result,R=r.report,deal=r.deal,v=d.votes||{invest:0,pass:0},t=v.invest+v.pass,p=d.p||{};
  const col=s=>s>=65?'var(--deal)':s>=40?'var(--gold)':'var(--out)';
  const wait='<div class="skel" style="width:92%"></div><div class="skel" style="width:76%"></div><div class="skel" style="width:84%"></div>';
  const [bandCls,bandName]=scoreBand(r.score);
  const dealNote=deal&&r.score<50?` The pitch itself scored ${r.score}, so read what to fix before you sign.`:'';
  const dims=R?Object.entries(R.dimensions).map(([n,x])=>`<div class="dim-row"><b>${n=='economics'?'Unit economics':n[0].toUpperCase()+n.slice(1)}</b><div class="b"><i style="--w:${x.score}%;--col:${col(x.score)}"></i></div><div class="s">${x.score}</div><p>${esc(x.why)}</p></div>`).join(''):'';
  const full=R?`<div class="rs-two"><section class="panel"><h3>Where you scored</h3>${dims}</section>
      <section class="panel"><h3>The panel's verdicts</h3><div style="display:grid;gap:16px">${IDS.map(i=>`<div class="verdict" data-i="${i}"><div class="pt">${portrait(i,(d.inv&&d.inv[i]||{}).mood||'curious')}</div><div><h3 class="who">${NM[i]}</h3><p>${esc((R.verdicts||{})[i]||'')}</p></div></div>`).join('')}</div></section></div>
    <div class="rs-three"><section class="panel"><h3>What worked</h3><ul>${R.strengths.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
      <section class="panel"><h3>What hurt you</h3><ul>${R.flaws.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
      <section class="panel"><h3>Test these in the next month</h3><ol>${R.experiments.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section></div>
    ${d.tx&&d.tx.length?`<section class="panel"><h3>Transcript</h3><div style="display:grid;gap:8px">${d.tx.map(x=>{const k=IDS.find(i=>NM[i].split(' ')[0]==x.who||(x.who=='Uncle-ji'&&i=='uncle'));return `<p><b${k?` class="who" data-i="${k}"`:''}>${esc(x.who)}</b> ${esc(x.text)}</p>`}).join('')}</div></section>`:''}`:'';
  return `<div class="rs">
    <div class="rs-top"><div class="stamp ${deal?'deal':'no'}">${deal?'DEAL':'NO DEAL'}</div>
      <div class="rs-head"><h2>${R?esc(R.headline):r.pending?'The analyst is writing up the pitch…':'Round complete'}</h2>
        <p>${deal?`${esc(NM[deal.inv]||deal.inv)} offered ${fmt(deal.amount)} for ${deal.equity}%. Condition: ${esc(String(deal.condition).replace(/\.+$/,''))}.${dealNote}`:'No investor closed. The notes below show what would change that.'}</p></div>
      <div class="score ${bandCls}"><b>${r.score}</b><span>${bandName}</span><small>pitch score out of 100</small></div></div>
    <div class="rs-two"><section class="panel"><h3>${esc(p.startup||'Your company')}: asked, offered, fair</h3>${rangeBars(d)}${R&&R.fair?`<p class="dim">${esc(R.fair.why)}</p>`:r.pending?wait:''}</section>
      <section class="panel"><h3>Prove this first</h3>${R?`<p style="font-size:21px">${esc(R.riskiest)}</p>`:wait}${t?`<p class="dim" style="margin-top:14px">The room: ${Math.round(100*v.invest/t)}% would invest (${t} vote${t==1?'':'s'}).</p>`:''}</section></div>
    ${R?`<details${opts.open?' open':''}><summary class="btn ghost noprint">Open the full report</summary><div style="display:grid;gap:18px;margin-top:18px">${full}</div></details>`:''}
    <div class="rs-foot"><p>Best roast: <q>${esc(r.roast)}</q></p>${opts.actions||''}</div></div>`;
}
