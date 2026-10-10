require('dotenv').config();
const express=require('express'),http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),QR=require('qrcode');
const {Server}=require('socket.io'),{MsEdgeTTS,OUTPUT_FORMAT}=require('msedge-tts'),{GoogleGenAI,Modality}=require('@google/genai');
process.on('uncaughtException',e=>console.error('uncaught (kept running):',e&&e.stack||e));
process.on('unhandledRejection',e=>console.error('unhandled rejection (kept running):',e&&e.stack||e));
const app=express(),srv=http.createServer(app),io=new Server(srv,{pingInterval:15000,pingTimeout:50000,connectionStateRecovery:{maxDisconnectionDuration:120000}});
const PORT=process.env.PORT||3000,PUBLIC=(process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL||`http://localhost:${PORT}`).replace(/\/$/,'');
const MODEL=process.env.MODEL||'claude-haiku-5-5',REPORT_MODEL=process.env.REPORT_MODEL||'claude-sonnet-5-5',KEY=process.env.ANTHROPIC_API_KEY;
const GLIVE=process.env.GEMINI_LIVE_MODEL||'gemini-3.1-flash-live-preview',GSTT=process.env.GEMINI_STT_MODEL||'gemini-3.5-transcribe-live';
const ai=process.env.GEMINI_API_KEY?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null,GEMINI=!!ai&&process.env.VOICE_ENGINE!='edge';
const DATA=process.env.DATA_DIR||__dirname;try{fs.mkdirSync(DATA,{recursive:true})}catch{}
const LBF=path.join(DATA,'leaderboard.json');let LB=[];try{LB=JSON.parse(fs.readFileSync(LBF))}catch{}

// ---- investors
const INV={
 vikram:{short:'Vikram',lens:'unit economics: pricing, gross margin, CAC, LTV, payback, burn, what happens when a bigger player copies you. If the pitcher gave no number, make them name one. Dry, surgical, deadpan.',
  persona:'Vikram "The Calculator" Rao: ex-private-equity analyst who has killed a thousand spreadsheets. Never raises his voice; the arithmetic does the damage. His roasts are deadpan one-liners that turn the pitcher\'s own numbers against them.',
  style:'Style examples (never reuse them): "Six hundred rupees to win a customer who leaves in eleven months. That is not growth, that is a very expensive goodbye. What is payback after Swiggy copies you?" / "Twenty-eight percent margin before the driver, the packaging and the refunds. So, roughly zero. Show me the P&L of one kitchen."'},
 zara:{short:'Zara',lens:'the customer and the brand: who is desperate for this, why would they tell a friend, what is the story, how does it spread, why is it not just a commodity with a logo. Dramatic, fast, savage about anything generic.',
  persona:'Zara "Hype Queen" Mehta: loud D2C brand founder who built a following on Instagram. Adores a real story and is brutally bored by a fake one. Her roasts are theatrical, vivid and quotable, with a few ALL-CAPS words.',
  style:'Style examples (never reuse them): "A tiffin with a logo is still a tiffin, darling. Where is the reason anyone posts it?" / "You said community four times and named zero humans. WHO is DM-ing you at midnight begging for this?"'},
 uncle:{short:'Uncle-ji',lens:'trust and cash: who pays today, how do you collect, what happens in a tier-2 town, why would an incumbent not crush you, when is the profit, and why should anyone trust a founder with no shop. Hinglish, folksy, haggling for more equity.',
  persona:'Uncle-ji: Marwari wholesaler who built a business over forty years and has seen every startup fad die. Affectionate but ruthless. His roasts are Hinglish proverbs and mandi comparisons that land like a slap on the back.',
  style:'Style examples (never reuse them): "Beta, 25 crore ka valuation aur ek bhi kitchen apni nahi? Pehle dukaan, phir dhamaka. Profit kab aayega?" / "App-vapp bahut hua. Gallay mein paisa kitna aata hai roz, wahi bolo."'}};
const IDS=Object.keys(INV);
const VOICE={vikram:{v:'en-GB-RyanNeural',rate:'+8%',pitch:'-2Hz'},zara:{v:'en-IN-NeerjaNeural',rate:'+20%',pitch:'+4Hz'},uncle:{v:'en-IN-PrabhatNeural',rate:'+4%',pitch:'-6Hz'}};
const FB={vikram:['Your margins are a rumour. Which number can you actually prove today?','That is a hobby with a pitch deck. What does one customer cost you?'],zara:['A logo is not a brand, darling. WHO would tell a friend about this?','This is giving a lunchbox with a LinkedIn profile. Where is the story?'],uncle:['Beta, app-vapp theek hai, par gallay mein paisa kahan hai? Profit kab aayega?','Itna bada valuation aur dukaan ek nahi? Thoda equity aur do, tabhi sochenge.']};
const OUT={vikram:"I'm out. Your unit economics survive only in the pitch, never in the spreadsheet.",zara:"I'm OUT. It is a commodity wearing a costume, and the costume is not even good.",uncle:"Main out, beta. Dukaan dikhti nahi, bas valuation dikhta hai."};
const fmt=l=>l>=100?`₹${+(l/100).toFixed(2)} Cr`:`₹${+(+l).toFixed(1)} L`;
const clip=(s,n)=>String(s||'').slice(0,n).trim();
// "60k" is sixty thousand, "2L" is two lakh, "1.5cr" is one and a half crore: spell them out so no model or voice misreads them
const NUM='(\\d[\\d,]*(?:\\.\\d+)?)';
const normNums=t=>String(t||'').replace(new RegExp(NUM+'\\s?[kK]\\b','g'),'$1 thousand').replace(new RegExp(NUM+'\\s?(?:lacs?|lakhs?|L)\\b','g'),'$1 lakh').replace(new RegExp(NUM+'\\s?(?:crores?|cr)\\b','gi'),'$1 crore');
const trim=(s,n=42)=>{const w=s.trim().split(/\s+/);if(w.length<=n)return s.trim();const cut=w.slice(0,n).join(' '),k=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('? '),cut.lastIndexOf('! '));return k>cut.length*.4?cut.slice(0,k+1):cut.replace(/[,;:]?$/,'.')};

async function anthropic(body,ms){
 const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
 const post=th=>fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:ac.signal,headers:{'content-type':'application/json','x-api-key':KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({thinking:{type:th},...body})});
 try{let res=await post('disabled');
  if(res.status==400){const e=await res.text();if(/between_tools/.test(e))res=await post('between_tools');else throw new Error('http 400 '+e.slice(0,200))}
  if(!res.ok)throw new Error('http '+res.status+' '+(await res.text()).slice(0,200));
  return{res,done:()=>clearTimeout(t)}}catch(e){clearTimeout(t);throw e}}
// ---- rooms: every room is an independent game with its own state, audience, votes and report
const rooms=new Map(),MAX_ROOMS=+process.env.MAX_ROOMS||40,REPORTS=path.join(DATA,'reports'),RN=c=>'r:'+c;
function makeRoom(code,hostToken){
let RUN=0,TID=0,G,pend={},pt=0,llmFails=0;const taps={},lines=new Map();
const emit=(ev,d)=>io.to(RN(code)).emit(ev,d);
const fresh=()=>({run:++RUN,phase:'WAITING',round:0,p:null,val:null,asking:null,end:null,dur:0,tx:[],votes:{},voteRound:G?G.voteRound+1:0,result:null,roasts:[],notes:{vikram:[],zara:[],uncle:[]},outs:0,firstOut:null,t0:0,fallbacks:0,inv:Object.fromEntries(IDS.map(i=>[i,{interest:50,mood:'curious',decision:null,offer:null,last:''}]))});
G=fresh();
class Abort extends Error{}
const chk=r=>{if(G.run!==r)throw new Abort()};
const waitFor=(k,ms)=>new Promise(res=>{const t=setTimeout(()=>done(''),ms);function done(v){clearTimeout(t);if(pend[k]===done)delete pend[k];res(v)}pend[k]=done});
const crowd=()=>{const ids=io.sockets.adapter.rooms.get(RN(code)),devs=new Set();let watching=0;if(ids)for(const id of ids){const x=io.sockets.sockets.get(id);if(!x)continue;if(x.role=='vote')devs.add(x.dev);else if(x.role=='watch')watching++}return{joined:devs.size,watching}};
const pub=()=>{const v=Object.values(G.votes),c=crowd();return{room:code,phase:G.phase,round:G.round,p:G.p,val:G.val,inv:G.inv,end:G.end,dur:G.dur,asking:G.asking,vr:G.voteRound,tx:G.tx.slice(-12).map((t,k,a)=>({...t,n:G.tx.length-a.length+k})),result:G.result,joined:c.joined,watching:c.watching,fallbacks:G.fallbacks,live:!!KEY&&llmFails<3,voice:GEMINI?'gemini':'edge',votes:{invest:v.filter(x=>x=='invest').length,pass:v.filter(x=>x=='pass').length},lb:LB.slice(-50)}};
const push=()=>emit('state',pub()),pushSoon=()=>{pt||(pt=setTimeout(()=>{pt=0;push()},250))};
function reset(){G=fresh();Object.values(pend).forEach(f=>f(''));pend={};emit('reset');push()}

// ---- LLM
const SCHEMA=`Reply with ONLY strict JSON, keys in this order ("mood" first, then "speech"):
{"mood":"bored|curious|excited|angry","speech":"<MAX 30 words, 2 sentences>","interest":0-100,"note":"<private 10-word note on the pitcher's weakest claim so far>","decision":null|"out"|"offer","offer":null|{"amount":<number in rupees LAKH; 100 lakh = 1 crore>,"equity":<percent>,"condition":"<max 12 words, specific to this business>"}}`;
const sys=i=>`You are a real investor on a live Indian startup TV show called Pitch Pit. ${INV[i].persona}
Your lens: ${INV[i].lens}
${INV[i].style}
THE ROAST: every line has two beats. Beat one is a sharp, specific burn at something the pitcher actually said (a number, a claim, a comparison), built like a stand-up punchline: set it up, then twist it. Use one vivid Indian reference when it fits (Swiggy, Zomato, kirana, UPI, IPL, wedding caterers, WhatsApp forwards, mandi). Beat two is one pointed question that exposes the same weakness. Roast the IDEA and the business logic, never the person. DARK HUMOUR is welcome: gallows jokes about the business dying (the burn rate as a funeral, the cap table as a will, a pivot as last rites, runway with a date of death, the founder's savings as a sacrifice to the market). Keep it about the IDEA and the money, never about the person's identity, appearance, family, health, caste, religion, gender or anyone's real tragedy, and never joke about self-harm. Never be generic ("that's a bold ask", "interesting", "I love the energy"). Never reuse a joke shape you already used in the transcript. If the answer was genuinely good, give grudging respect with a sting.
HOW YOU TALK: like a person in the room, fast and punchy, contractions, no filler. HARD LIMIT: 32 words, 2 short sentences, because it is read aloud and a full pitch has nine of these turns. Never use bullet points, never say "as an investor", never read out your interest score (the audience sees it), never repeat a question already in the transcript. Amounts in ₹ (lakh/crore). Indian number words: k means thousand, L means lakh (1,00,000), Cr means crore (1,00,00,000), so "60k" is sixty thousand rupees, never sixty. Read the founder's numbers exactly as stated.
${G.p&&G.p.mode=='honest'?'Mode: honest evaluation. Stay sharp and funny, but every burn must point at a REAL flaw the founder can fix and every question must be answerable with evidence.':'Mode: ROAST. Go absolutely feral. Every line is a savage, quotable demolition: stack two burns in one breath, use absurd comparisons and gallows humour, call back to earlier answers, and escalate every round the pitcher dodges or repeats themselves. Mock the numbers, the logic, the buzzwords and the plan with surgical cruelty, and you may jab the last line of another shark. Make the audience gasp and laugh. The target is always the IDEA, the numbers and the claims: never the identity, looks, family or health of the founder, and never any real tragedy, and never self-harm.'}
Interest meter: it moves 5-20 points per answer. Concrete numbers, named customers and evidence raise it; vague, buzzword or dodged answers lower it hard. Start from your current value.
${SCHEMA}`;
function ctx(i,task){const p=G.p,notes=G.notes[i].slice(-3);
 return `Pitcher: ${p.name}. Startup: "${p.startup}".${p.desc?` What it does: ${p.desc}.`:''}${p.stage?` Stage: ${p.stage}.`:''}${p.traction?` Claimed traction: ${p.traction}.`:''}
Ask: ₹${p.amount} lakh for ${p.equity}% (implied valuation ${fmt(G.val)}). Your interest now: ${G.inv[i].interest}/100.
Others: ${IDS.filter(x=>x!=i).map(x=>`${INV[x].short} ${G.inv[x].interest}${G.inv[x].decision=='out'?' (OUT)':''}`).join(', ')}.
${notes.length?`Your earlier private notes: ${notes.join(' | ')}\n`:''}Transcript so far:
${G.tx.map(t=>`${t.who}: ${t.text}`).join('\n')||'(none yet)'}

TASK: ${task}`}
async function call(i,task,id){
 if(!KEY)throw new Error('no key');
 const {res,done}=await anthropic({model:MODEL,max_tokens:400,stream:true,system:sys(i),messages:[{role:'user',content:ctx(i,task)}]},12000);
 try{
  const dec=new TextDecoder();let buf='',txt='',last='';
  for await(const ch of res.body){buf+=dec.decode(ch,{stream:true});let n;
   while((n=buf.indexOf('\n'))>=0){const l=buf.slice(0,n).trim();buf=buf.slice(n+1);if(!l.startsWith('data:'))continue;
    try{const d=JSON.parse(l.slice(5));if(d.type=='content_block_delta'&&d.delta.text){txt+=d.delta.text;const m=txt.match(/"speech"\s*:\s*"((?:[^"\\]|\\.)*)/);
     if(m){let s=null;try{s=JSON.parse('"'+m[1].replace(/\\$/,'')+'"')}catch{}if(s&&s!==last){last=s;lines.set(id,s);const mm=txt.match(/"mood"\s*:\s*"(\w+)"/);emit('turnText',{id,text:s,mood:mm&&mm[1]})}}}}catch{}}}
  return JSON.parse(txt.replace(/^[^{]*|[^}]*$/g,''));
 }finally{done()}
}
function valid(r,d){
 if(!r||typeof r.speech!='string'||!r.speech.trim()||isNaN(+r.interest))throw new Error('bad json');
 r.interest=Math.max(0,Math.min(100,Math.round(+r.interest)));
 if(!['bored','curious','excited','angry'].includes(r.mood))r.mood='curious';
 r.note=clip(r.note,120);r.speech=trim(r.speech.replace(/(?:my )?interest (?:is|was|has dropped to|dropped to|sits|sitting)(?: at)? \d+[^.,;]*[,.;]?\s*/gi,''));
 if(!d){r.decision=null;r.offer=null;return r}
 if(r.decision!='offer'&&r.decision!='out')r.decision=r.interest>=40?'offer':'out';
 if(r.decision=='out'){r.interest=Math.min(r.interest,39);r.offer=null;return r}
 r.interest=Math.max(r.interest,40);
 const p=G.p,o=r.offer||{},a=+o.amount,e=+o.equity;
 r.offer={amount:+(a>0?Math.min(Math.max(a,p.amount*.25),p.amount*1.5):p.amount*(.5+r.interest/200)).toFixed(1),equity:+(e>0?Math.min(Math.max(e,3),60):Math.min(60,p.equity*(1.5-r.interest/150))).toFixed(1),condition:clip(o.condition||'Monthly reporting',120)};
 return r}
function fb(i,kind){
 const L=FB[i];let r={speech:L[Math.random()*L.length|0],interest:Math.max(0,Math.min(100,G.inv[i].interest+(Math.random()*30-12|0))),mood:'curious',note:'',decision:null,offer:null,fallback:true};
 if(kind=='decide'||kind=='counter'){r=valid({...r,decision:r.interest<40?'out':'offer'},true);r.fallback=true;r.speech=r.decision=='out'?OUT[i]:`Fine. ${fmt(r.offer.amount)} for ${r.offer.equity}%, ${r.offer.condition}.`}
 return r}
async function turn(i,kind,task){
 const run=G.run,id=++TID;emit('turnStart',{id,inv:i});let r=null;
 for(let a=0;a<2&&!r;a++)try{r=valid(await call(i,task,id),kind=='decide'||kind=='counter');llmFails=0}catch(e){llmFails++;console.error('LLM fail',i,e&&e.message||e);if(G.run!==run)throw new Abort()}
 chk(run);if(!r){G.fallbacks++;r=fb(i,kind)}
 const s=G.inv[i];s.interest=r.interest;s.mood=r.mood;s.last=r.speech;if(r.decision){s.decision=r.decision;s.offer=r.offer}
 if(r.note)G.notes[i].push(r.note);
 G.tx.push({who:INV[i].short,text:r.speech});lines.set(id,r.speech);if(lines.size>16)lines.delete(lines.keys().next().value);
 if(r.decision=='out'){G.outs++;G.roasts.push(r.speech);if(G.firstOut==null)G.firstOut=Date.now()-G.t0}
 push();emit('turnEnd',{id,inv:i,r:{speech:r.speech,interest:r.interest,mood:r.mood,decision:r.decision,offer:r.offer,fallback:!!r.fallback}});
 await waitFor('spoken',30000);chk(run);return r}

// ---- evaluation report (one deeper call at the end)
const DIMS=['problem','market','moat','economics','execution','clarity'];
async function report(deal){
 if(!KEY)return null;
 const p=G.p;
 const prompt=`You are the analyst for the Pitch Pit investor panel. Write an honest, specific evaluation of this pitch for the founder, based ONLY on what was said. If the founder gave no evidence for something, say so rather than guessing. No flattery, no filler; be constructive. Indian market context, amounts in ₹.

Founder: ${p.name}. Startup: "${p.startup}". ${p.desc?`What it does: ${p.desc}. `:''}${p.stage?`Stage: ${p.stage}. `:''}${p.traction?`Traction: ${p.traction}. `:''}Ask: ₹${p.amount} lakh for ${p.equity}% (valuation ${fmt(G.val)} = ${G.val} lakh).
Panel interest at the end: ${IDS.map(i=>`${INV[i].short} ${G.inv[i].interest} (${G.inv[i].decision||'-'})`).join(', ')}.
${IDS.map(i=>`${INV[i].short}'s private notes: ${G.notes[i].join(' | ')||'none'}`).join('\n')}
Outcome: ${deal?`founder accepted ${INV[deal.inv].short}'s offer of ${fmt(deal.amount)} for ${deal.equity}%`:'no deal'}.

Transcript:
${G.tx.map(t=>`${t.who}: ${t.text}`).join('\n')}

Return ONLY strict JSON:
{"headline":"<one honest sentence verdict, max 20 words>",
"dimensions":{${DIMS.map(d=>`"${d}":{"score":0-100,"why":"<max 18 words, cite what was said or missing>"}`).join(',')}},
"strengths":["<3 items, each max 20 words>"],
"flaws":["<3 items, the real problems, each max 20 words>"],
"riskiest":"<the single assumption that most needs proof, max 30 words>",
"experiments":["<3 concrete tests to run in the next 2-4 weeks with a success number, each max 25 words>"],
"fair":{"low":<fair valuation low, in rupees LAKH where 100 lakh = 1 crore; the asked valuation is ${G.val} lakh for reference>,"high":<high, same unit>,"why":"<max 25 words>"},
"verdicts":{"vikram":"<his honest take in his voice, max 30 words>","zara":"<hers, max 30 words>","uncle":"<his, Hinglish, max 30 words>"}}
Dimensions: problem (is it a real, painful problem), market (size and reachability), moat (why it lasts), economics (unit economics and path to profit), execution (founder evidence, traction, plan), clarity (how clearly it was pitched). Scores should be spread honestly; a pitch with no numbers cannot score high on economics.`;
 for(const model of[REPORT_MODEL,MODEL])try{
  const {res,done}=await anthropic({model,max_tokens:2000,messages:[{role:'user',content:prompt}]},40000);
  const j=await res.json();done();
  const txt=(j.content||[]).filter(b=>b.type=='text').map(b=>b.text).join('');
  const r=JSON.parse(txt.replace(/^[^{]*|[^}]*$/g,''));
  if(!r.dimensions||!DIMS.every(d=>r.dimensions[d]))throw new Error('report shape');
  DIMS.forEach(d=>{r.dimensions[d].score=Math.max(0,Math.min(100,Math.round(+r.dimensions[d].score||0)))});
  r.strengths=[].concat(r.strengths||[]).slice(0,3);r.flaws=[].concat(r.flaws||[]).slice(0,3);r.experiments=[].concat(r.experiments||[]).slice(0,3);
  if(r.fair){r.fair.low=+r.fair.low||0;r.fair.high=+r.fair.high||0}
  return r;
 }catch(e){console.error('report fail',model,e&&e.message||e)}
 return null}

// ---- game flow
async function play(){
 const run=G.run,p=G.p,W=async(k,ms)=>{const v=await waitFor(k,ms);chk(run);return v};
 try{
  for(const i of IDS)await turn(i,'react',`Give a first reaction to the ask and the valuation ${fmt(G.val)}: ONE short sentence, at most 14 words, specific to this business. decision null.`);
  G.phase='READY';push();await W('go',36e5);
  G.phase='PITCH';G.end=Date.now()+p.secs*1000;G.dur=p.secs*1000;push();G.t0=Date.now();
  G.tx.push({who:p.name,text:(await W('input',p.secs*1000+4000))||'(silence)'});G.end=null;
  for(let r=1;r<=3;r++)for(const i of IDS){
   G.round=r;G.phase='GRILLING';G.asking=i;push();
   await turn(i,'ask',`Round ${r} of 3. Start with a short reaction to the pitcher's last answer that quotes something specific they said, adjust your interest honestly, then ask ONE sharp question about the biggest unproven assumption in your lens that nobody has asked yet.${r==3?' This is the last round: make it the question that decides your offer.':''} decision null.`);
   G.phase='ANSWER';G.end=Date.now()+60000;G.dur=60000;push();
   const ans=(await W('input',60000))||'(no answer)';G.end=null;G.tx.push({who:p.name,text:ans});
  }
  G.phase='DECISIONS';G.asking=null;G.voteRound++;G.votes={};push();
  for(const i of IDS)await turn(i,'decide',(p.mode=='show'?'ROAST MODE: if you are OUT, make it the most savage, quotable roast of the whole show. ':'')+'Final decision. If your interest is below 40: decision "out" with a one-line roast of the idea that names the real flaw. Otherwise decision "offer" with amount (₹ lakh), equity %, and a condition tied to the biggest risk you identified, consistent with your interest (higher interest = closer to the ask, less equity). Speech announces it.');
  const offers=()=>IDS.filter(i=>G.inv[i].decision=='offer');let win=null;
  if(offers().length){
   G.phase='NEGOTIATION';G.end=Date.now()+60000;G.dur=60000;push();const t=await W('input',60000);G.end=null;
   if(t=='@none'){}else if(t.startsWith('@accept:'))win=t.slice(8);
   else{
    if(t)G.tx.push({who:p.name,text:'Counter-offer: '+t});
    for(const i of offers())await turn(i,'counter',`The pitcher countered: "${t||'(silence)'}". Your offer: ${JSON.stringify(G.inv[i].offer)}. Respond once: accept (decision "offer", same terms), counter (decision "offer", new terms) or reject (decision "out" with a roast).`);
    if(offers().length){G.phase='FINAL';G.end=Date.now()+60000;G.dur=60000;push();const f=await W('input',60000);G.end=null;if(f.startsWith('@accept:'))win=f.slice(8)}
   }
  }
  if(win&&G.inv[win]?.decision!='offer')win=null;
  const o=win&&G.inv[win].offer,deal=o?{inv:win,...o,val:Math.round(o.amount*100/o.equity)}:null;
  const avg=IDS.reduce((s,i)=>s+G.inv[i].interest,0)/3;
  const base=Math.min(100,Math.round(avg*.6+offers().length*10+(deal?10:0)));
  const roast=[...G.roasts].sort((a,b)=>b.length-a.length)[0]||'Nobody was brave enough to roast you.';
  G.result={deal,val:G.val,score:base,roast,outs:G.outs,report:null,pending:!!KEY};G.phase='RESULT';
  push();emit(deal?'dealSfx':'noDealSfx');
  const rep=await report(deal);chk(run);
  if(rep){const dm=DIMS.reduce((s,d)=>s+rep.dimensions[d].score,0)/DIMS.length;G.result.report=rep;G.result.score=Math.round(dm*.8+avg*.2)}
  G.result.pending=false;if(rep)G.result.reportId=saveReport(code,G);
  LB.push({name:p.name,startup:p.startup,val:deal?deal.val:null,outs:G.outs,fast:G.firstOut,score:G.result.score,deal:!!deal});LB=LB.slice(-200);fs.writeFile(LBF,JSON.stringify(LB),()=>{});
  push();
 }catch(e){if(!(e instanceof Abort))console.error(e)}
}


const room={code,hostToken,created:Date.now(),touched:Date.now(),pub,push,pushSoon,reset,
 speakable:t=>{t=String(t||'').trim();if(!t)return false;for(const l of lines.values())if(l.includes(t))return true;return false},
 phase:()=>G.phase,title:()=>G.p?G.p.startup:'',
 mine:dev=>({vr:G.voteRound,vote:G.votes[dev]||null}),
 setup(d){const p={name:clip(d.name,40),startup:clip(d.startup,40),desc:normNums(clip(d.desc,200)),stage:clip(d.stage,30),traction:normNums(clip(d.traction,160)),mode:d.mode=='honest'?'honest':'show',secs:[60,90,120,180].includes(+d.secs)?+d.secs:90,amount:+d.amount,equity:+d.equity};
  if(!p.name||!p.startup||!(p.amount>0)||!(p.equity>0&&p.equity<=100))return;reset();G.p=p;G.val=Math.round(p.amount*100/p.equity);G.t0=Date.now();G.phase='SETUP';push();play()},
 go(){pend.go&&pend.go('go')},
 submit(t){pend.input&&pend.input(normNums(String(t||'').slice(0,1500)))},
 accept(i){if(['NEGOTIATION','FINAL'].includes(G.phase)&&G.inv[i]?.decision=='offer'&&pend.input)pend.input('@accept:'+i)},
 spoken(){pend.spoken&&pend.spoken('x')},
 skip(){['input','spoken','go'].forEach(k=>pend[k]&&pend[k](k=='go'?'go':''))},
 resetVotes(){G.votes={};G.voteRound++;push();emit('mine',{vr:G.voteRound,vote:null})},
 react(s,e){if(!['🔥','💀','💸','😂'].includes(e))return;const n=Date.now(),a=taps[s.dev]=(taps[s.dev]||[]).filter(t=>n-t<1000);if(a.length>=3)return;a.push(n);emit('react',e)},
 vote(s,v){if(!['invest','pass'].includes(v)||!['DECISIONS','NEGOTIATION','FINAL'].includes(G.phase))return;G.votes[s.dev]=v;s.emit('mine',{vr:G.voteRound,vote:v});pushSoon()}};
return room}

// shareable, separately stored evaluation for every finished pitch
function saveReport(code,G){
 try{fs.mkdirSync(REPORTS,{recursive:true});
  const id=crypto.randomBytes(5).toString('hex');
  fs.writeFileSync(path.join(REPORTS,id+'.json'),JSON.stringify({id,room:code,ts:Date.now(),p:G.p,val:G.val,inv:G.inv,result:{...G.result,reportId:id},tx:G.tx}));
  const all=fs.readdirSync(REPORTS).filter(f=>f.endsWith('.json'));
  if(all.length>300)all.map(f=>[f,fs.statSync(path.join(REPORTS,f)).mtimeMs]).sort((x,y)=>x[1]-y[1]).slice(0,all.length-300).forEach(([f])=>fs.unlink(path.join(REPORTS,f),()=>{}));
  return id}catch(e){console.error('report save fail',e.message);return null}}

// ---- sockets
const normCode=c=>String(c||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,6);
const newCode=()=>{for(;;){const c=Array.from({length:6},()=>'ABCDEFGHJKMNPQRSTUVWXYZ'[crypto.randomInt(23)]).join('');if(!rooms.has(c))return c}};
io.on('connection',s=>{
 // host-only actions: the creator's token is what makes a socket the host
 const host=f=>(...a)=>{if(s.role=='stage'&&s.room){s.room.touched=Date.now();f(s.room,...a)}};
 s.on('join',({role,room,token,deviceId}={},ack)=>{
  const r=rooms.get(normCode(room));
  if(!r)return ack&&ack({err:'Room not found. Check the code or start a new room.'});
  if(s.room)s.leave(RN(s.room.code));
  s.room=r;s.dev=String(deviceId||s.id).slice(0,40);
  s.role=role=='vote'?'vote':(role=='stage'&&token&&token===r.hostToken)?'stage':'watch';
  s.join(RN(r.code));r.touched=Date.now();
  ack&&ack({ok:1,role:s.role,code:r.code});s.emit('state',r.pub());s.emit('mine',r.mine(s.dev));r.pushSoon()});
 s.on('react',e=>{if(s.room&&s.role!='stage')s.room.react(s,e)});
 s.on('vote',v=>{if(s.room&&s.role!='stage')s.room.vote(s,v)});
 s.on('setup',host((r,d)=>r.setup(d||{})));
 s.on('mic:start',host(()=>{if(!GEMINI)return;s.stt&&s.stt.finish();s.stt=openStt(t=>s.emit('mic:text',{text:t,final:false}))}));
 s.on('mic:chunk',host((r,b)=>s.stt&&s.stt.send(b)));
 s.on('mic:stop',host(async()=>{const x=s.stt;s.stt=null;if(!x)return;s.emit('mic:text',{text:await x.finish(),final:true})}));
 s.on('go',host(r=>r.go()));
 s.on('submit',host((r,t)=>r.submit(t)));
 s.on('accept',host((r,i)=>r.accept(i)));
 s.on('spoken',host(r=>r.spoken()));
 s.on('skip',host(r=>r.skip()));
 s.on('new',host(r=>r.reset()));
 s.on('resetVotes',host(r=>r.resetVotes()));
 s.on('disconnect',()=>{s.stt&&s.stt.finish();s.room&&s.room.pushSoon()});
});
// rooms that nobody is in are dropped after 10 minutes; any room after 3 hours
function sweep(force){
 const now=Date.now();
 for(const [c,r] of [...rooms]){const n=(io.sockets.adapter.rooms.get(RN(c))||{size:0}).size;
  if((!n&&now-r.touched>10*60e3)||now-r.created>3*3600e3||(force&&!n&&now-r.touched>60e3))rooms.delete(c)}}
setInterval(sweep,60e3).unref();

// ---- voice: Gemini Live (investor voices + pitcher transcription), Edge neural voices as fallback
const GV={
 vikram:{voice:'Charon',role:'Vikram Rao, a cold, precise private-equity analyst. Low, exact and dry, with a faint smirk. Indian English accent.'},
 zara:{voice:'Zephyr',role:'Zara Mehta, a loud, expressive brand founder. Bright, quick, dramatic and warm. Indian English accent.'},
 uncle:{voice:'Gacrux',role:'Uncle-ji, a 65-year-old trader from Rajasthan. Gravelly and folksy but brisk. He speaks Hinglish: say Hindi words in natural Hindi and English words in Indian English.'}};
const GMOOD={bored:'Delivery: deadpan and flat, but quick.',curious:'Delivery: sharp and interested.',excited:'Delivery: fast, bright and very energetic.',angry:'Delivery: clipped, tense and cutting.'};
const spoken=t=>String(t).replace(/(\d)\s?[kK]\b/g,'$1 thousand').replace(/(?:₹|\bRs\.?)\s?([\d.,]+)\s?(?:Cr|crore)s?\b/gi,'$1 crore rupees').replace(/(?:₹|\bRs\.?)\s?([\d.,]+)\s?(?:L|lakh)s?\b/gi,'$1 lakh rupees').replace(/(?:₹|\bRs\.?)\s?([\d.,]+)\s?thousand/gi,'$1 thousand rupees').replace(/(?:₹|\bRs\.?)\s?([\d.,]+)/gi,'$1 rupees').replace(/(\d)\s?%/g,'$1 percent').replace(/\bCAC\b/g,'customer acquisition cost').replace(/\bLTV\b/g,'lifetime value');
// One Live session per spoken line; PCM16 24kHz chunks go to `write` as they arrive. Rejects only if no audio was produced.
function geminiSpeak(inv,mood,text,write,onAbort){
 return new Promise((resolve,reject)=>{
  let got=false,fin=false,sess=null,ft,all;
  const end=err=>{if(fin)return;fin=true;clearTimeout(ft);clearTimeout(all);try{sess&&sess.close()}catch{}got?resolve():reject(err||new Error('no audio'))};
  ft=setTimeout(()=>end(new Error('gemini first-audio timeout')),9000);all=setTimeout(()=>end(),30000);
  onAbort(()=>end());
  ai.live.connect({model:GLIVE,config:{responseModalities:[Modality.AUDIO],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:GV[inv].voice}}},
    systemInstruction:`You are the voice actor for ${GV[inv].role} ${GMOOD[mood]||''} The user message is one line of dialogue. Say it aloud exactly, word for word, but ACT it: you are a real person on live TV, not a narrator. Use natural breath, real emphasis, a beat before the punchline, rising and falling pitch, a smirk on the burn. Keep a brisk, conversational pace with no robotic evenness and no long pauses. Never answer it, never add or skip words.`},
   callbacks:{onmessage:m=>{const sc=m.serverContent;if(!sc)return;for(const p of sc.modelTurn?.parts||[])if(p.inlineData){got=true;clearTimeout(ft);write(Buffer.from(p.inlineData.data,'base64'))}if(sc.turnComplete)end()},
    onerror:e=>end(new Error(e&&e.message||'gemini error')),onclose:()=>end()}
  }).then(x=>{sess=x;if(fin)return x.close();x.sendRealtimeInput({text})}).catch(end)})}
// Live transcription of the pitcher's mic (16kHz PCM16 in, text out). Reconnects by itself if Gemini closes the session mid-pitch.
function openStt(onText){
 let sess=null,opening=null,text='',pending=[],ending=false,last=Date.now();
 const pcm=b=>({audio:{data:b.toString('base64'),mimeType:'audio/pcm;rate=16000'}});
 const open=()=>{if(text&&!/\s$/.test(text))text+=' ';
  opening=ai.live.connect({model:GSTT,config:{responseModalities:[Modality.TEXT],inputAudioTranscription:{}},
   callbacks:{onmessage:m=>{const t=m.serverContent&&m.serverContent.inputTranscription;if(t&&t.text){text+=t.text;last=Date.now();onText(text.trim())}},
    onerror:e=>console.error('stt error',e&&e.message),onclose:()=>{sess=null;opening=null}}})
   .then(x=>{sess=x;pending.forEach(b=>x.sendRealtimeInput(pcm(b)));pending=[];return x}).catch(e=>{console.error('stt connect fail',e.message);sess=null;opening=null});return opening};
 open();
 return{
  send(b){b=Buffer.from(b);if(sess){try{sess.sendRealtimeInput(pcm(b));return}catch{}}pending.push(b);if(pending.length>400)pending.shift();if(!opening&&!ending)open()},
  async finish(){ending=true;if(opening)await opening;
   if(sess){try{sess.sendRealtimeInput({audioStreamEnd:true})}catch{}
    const t0=Date.now();last=Date.now();while(Date.now()-t0<4500&&Date.now()-last<1400&&sess)await new Promise(r=>setTimeout(r,150))}
   try{sess&&sess.close()}catch{}return text.trim()}}}

// a redeploy restarts the process and empties every in-memory room; tell people instead of letting them hang
process.on('SIGTERM',()=>{io.emit('serverRestart');setTimeout(()=>process.exit(0),1200)});
// ---- http
const ttsCache=new Map();
async function edgeSpeak(inv,text,r){
 const k=inv+'|'+text,hit=ttsCache.get(k);
 if(hit)return r.type('audio/mpeg').send(hit);
 const V=VOICE[inv],tts=new MsEdgeTTS();await tts.setMetadata(V.v,OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
 const out=tts.toStream(text.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])),{rate:V.rate,pitch:V.pitch}),a=out.audioStream||out,chunks=[];
 const buf=await new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('tts timeout')),9000);a.on('data',d=>chunks.push(d));a.on('end',()=>{clearTimeout(t);ok(Buffer.concat(chunks))});a.on('error',e=>{clearTimeout(t);no(e)})});
 if(!buf.length)throw new Error('empty audio');
 if(ttsCache.size>300)ttsCache.delete(ttsCache.keys().next().value);ttsCache.set(k,buf);
 r.type('audio/mpeg').send(buf)}
const shared=new Map(); // inv|mood|text -> in-flight or finished PCM, so ten listeners cost one Gemini call
function shareSpeak(inv,mood,text){
 const key=inv+'|'+mood+'|'+text;let e=shared.get(key);
 if(!e){e={chunks:[],done:false,fail:null,subs:new Set()};shared.set(key,e);
  if(shared.size>200)shared.delete(shared.keys().next().value);setTimeout(()=>shared.delete(key),150e3).unref();
  geminiSpeak(inv,mood,text,b=>{e.chunks.push(b);e.subs.forEach(f=>f(b))},()=>{})
   .catch(err=>{e.fail=err}).finally(()=>{e.done=true;e.subs.forEach(f=>f(null))})}
 return e}
app.get('/api/tts',async(q,r)=>{
 // the endpoint is not a free text-to-speech API: the room's host may speak anything, guests only lines the sharks actually said
 const hr=rooms.get(normCode(q.get('x-room')));if(!hr)return r.sendStatus(403);
 const raw=clip(q.query.text,500);
 if(!(q.get('x-token')&&q.get('x-token')===hr.hostToken)&&!hr.speakable(raw))return r.sendStatus(403);
 const inv=VOICE[q.query.inv]?q.query.inv:'vikram',text=spoken(raw),mood=String(q.query.mood||'');
 if(!text)return r.sendStatus(400);
 if(GEMINI){
  const e=shareSpeak(inv,mood,text);let started=false;
  await new Promise(res=>{
   const send=b=>{if(b===null)return res();if(!started){started=true;r.set({'Content-Type':'audio/L16;rate=24000','Cache-Control':'no-store'});r.flushHeaders()}r.write(b)};
   e.chunks.forEach(send);if(e.done)return res();
   e.subs.add(send);r.on('close',()=>{e.subs.delete(send);res()})});
  if(started)return r.end();
  if(e.fail)console.error('gemini voice fail, using fallback:',e.fail.message)}
 try{await edgeSpeak(inv,text,r)}catch(e){console.error('tts fail',e.message);r.sendStatus(502)}});
app.set('trust proxy',1);
app.use(express.json());
const made=new Map(); // ip -> room creation times, so one visitor cannot drain the model credits
const tooMany=ip=>{const now=Date.now(),a=(made.get(ip)||[]).filter(t=>now-t<3600e3);made.set(ip,a);if(a.length>=(+process.env.ROOMS_PER_IP_HOUR||8))return true;a.push(now);return false};
app.post('/api/rooms',(q,r)=>{
 if(tooMany(q.ip))return r.status(429).json({err:'You have opened a lot of rooms in the last hour'});
 if(rooms.size>=MAX_ROOMS)sweep(true);
 if(rooms.size>=MAX_ROOMS)return r.status(503).json({err:'All rooms are busy right now. Try again in a few minutes.'});
 const code=newCode(),token=crypto.randomBytes(12).toString('hex');rooms.set(code,makeRoom(code,token));
 r.json({code,token})});
app.get('/api/rooms/:code',(q,r)=>{const x=rooms.get(normCode(q.params.code));r.json(x?{ok:1,code:x.code,phase:x.phase(),title:x.title()}:{ok:0})});
app.get('/api/qr',async(q,r)=>{const code=normCode(q.query.room),want=String(q.query.url||''),url=want.startsWith(PUBLIC+'/')?want:`${PUBLIC}/vote?room=${code}`;r.json({url,room:code,qr:await QR.toDataURL(url,{width:360,margin:1,color:{dark:'#160f2e',light:'#fff8ea'}})})});
app.get('/healthz',(q,r)=>r.json({ok:true,rooms:rooms.size}));
app.get('/api/leaderboard',(q,r)=>r.json(LB.slice(-50)));
app.get('/api/report/:id',(q,r)=>{
 if(!/^[a-f0-9]{10}$/.test(q.params.id))return r.sendStatus(404);
 fs.readFile(path.join(REPORTS,q.params.id+'.json'),(e,b)=>e?r.sendStatus(404):r.type('json').send(b))});
app.use(express.static(path.join(__dirname,'public'),{extensions:['html']}));
srv.listen(PORT,async()=>{
 console.log(`Pitch Pit  lobby: ${PUBLIC}/   (create a room, share the link or code)`);
 if(!KEY)return console.log('LLM: NO API KEY - canned lines only');
 try{const {res,done}=await anthropic({model:MODEL,max_tokens:8,messages:[{role:'user',content:'hi'}]},10000);done();console.log(res.ok?`LLM: ready (${MODEL}, report: ${REPORT_MODEL})`:'LLM: key rejected');console.log(GEMINI?`Voice: Gemini Live (${GLIVE}), mic transcription (${GSTT})`:'Voice: Edge neural voices (set GEMINI_API_KEY for Gemini Live)')}catch(e){console.log('LLM: check failed -',e.message)}
});
