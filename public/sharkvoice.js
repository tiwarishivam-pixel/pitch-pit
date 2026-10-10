/* Shared investor voice player, used by the room page (host and watchers) and the phone page.
   Streams one sentence at a time (Gemini Live PCM, Edge mp3, or the browser voice as fallbacks), never overlaps two voices,
   and reveals each sentence as it starts to be spoken so readers follow the voice instead of racing ahead of it. */
function SharkVoice(o){
  const RATE=o.rate||1.04,IDS=['vikram','zara','uncle'];
  let ac=null,ana=null,Q=[],playing=false,gen=0,cur=null,pcm=[],speaker=null,T={},muted=!!o.muted;
  const headers=()=>({'x-room':o.room,'x-token':o.token||''});
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function audio(){ac=ac||new AudioContext();if(!ana){ana=ac.createAnalyser();ana.fftSize=512;ana.connect(ac.destination)}ac.resume();return ac}
  // a suspended context (no tap yet) would stack every sentence at time zero, so treat it as muted until the first tap unlocks it
  const ready=()=>!muted&&ac&&ac.state=='running';
  const fetchAudio=(inv,text,mood)=>fetch(`/api/tts?inv=${inv}&mood=${mood||''}&text=${encodeURIComponent(text)}`,{headers:headers()}).then(r=>r.ok?r:Promise.reject(r.status));
  function playUrl(url){return new Promise((res,rej)=>{const a=cur=new Audio(url);a.playbackRate=RATE;try{ac.createMediaElementSource(a).connect(ana)}catch{}const t=setTimeout(res,30000);a.onended=()=>{clearTimeout(t);res()};a.onerror=()=>{clearTimeout(t);rej()};a.play().catch(e=>{clearTimeout(t);rej(e)})})}
  async function playPcm(r,my){const reader=r.body.getReader();let carry=new Uint8Array(0),next=0;
    for(;;){const {value,done}=await reader.read();if(my!==gen){reader.cancel();return}
      if(value){const b=new Uint8Array(carry.length+value.length);b.set(carry);b.set(value,carry.length);const n=b.length&~1;carry=b.slice(n);
        if(n){const i16=new Int16Array(b.buffer,0,n/2),f=new Float32Array(n/2);for(let k=0;k<f.length;k++)f[k]=i16[k]/32768;
          const buf=ac.createBuffer(1,f.length,24000);buf.copyToChannel(f,0);const src=ac.createBufferSource();src.buffer=buf;src.playbackRate.value=RATE;src.connect(ana);
          const at=Math.max(ac.currentTime+.06,next);src.start(at);next=at+buf.duration/RATE;pcm.push(src);src.onended=()=>{pcm=pcm.filter(x=>x!==src)}}}
      if(done)break}
    await sleep(Math.max(0,(next-ac.currentTime)*1000)+60)}
  const playResponse=async(r,my)=>(r.headers.get('content-type')||'').startsWith('audio/mpeg')?playUrl(URL.createObjectURL(await r.blob())):playPcm(r,my);
  function browserSay(inv,text){return new Promise(res=>{try{const u=new SpeechSynthesisUtterance(text),v=speechSynthesis.getVoices().filter(x=>/^en/i.test(x.lang));u.voice=v[IDS.indexOf(inv)%(v.length||1)]||null;u.lang='en-IN';u.pitch={vikram:.7,zara:1.5,uncle:.5}[inv];u.rate=1.15;u.onend=u.onerror=res;speechSynthesis.speak(u)}catch{res()}})}
  async function pump(){if(playing)return;playing=true;
    while(Q.length){const it=Q.shift();if(it.g!==gen)continue;const t=it.t;speaker=t.inv;o.onSpeaking&&o.onSpeaking(t.inv,true);t.shown=(t.shown?t.shown+' ':'')+it.s;o.onReveal&&o.onReveal(t.inv,t.shown);
      try{await playResponse(await it.p,it.g)}catch{if(it.g===gen)await browserSay(t.inv,it.s)}
      speaker=null;o.onSpeaking&&o.onSpeaking(t.inv,false);t.pend--;check(t)}
    playing=false}
  function check(t){if(t.ended&&t.pend<=0){if(!t.idled){t.idled=1;o.onIdle&&o.onIdle(t.inv)}if(!t.done){t.done=1;o.onSpoken&&o.onSpoken()}}}
  function say(t,s){s=s.trim();if(!s)return;t.pend++;const p=fetchAudio(t.inv,s,t.mood);p.catch(()=>{});Q.push({t,s,p,g:gen});pump()}
  function flush(t,end){const rest=t.text.slice(t.idx),re=/.+?[.!?।]+(?=\s)/gs;let m,last=0;while((m=re.exec(rest))){say(t,m[0]);last=re.lastIndex}t.idx+=last;if(end&&t.text.slice(t.idx).trim()){say(t,t.text.slice(t.idx));t.idx=t.text.length}}
  function stop(){gen++;Q=[];cur&&cur.pause();pcm.forEach(x=>{try{x.stop()}catch{}});pcm=[];try{speechSynthesis.cancel()}catch{}speaker=null}
  return{
    audio,ready,stop,
    get ana(){return ana},get speaker(){return speaker},get muted(){return muted},
    resume(){ac&&ac.resume()},
    setMuted(m){muted=m;if(m)stop()},
    turnStart(id,inv){T[id]={inv,idx:0,pend:0,text:'',shown:''}},
    turnText(id,text,mood){const t=T[id];if(!t)return;if(mood)t.mood=mood;t.text=text;if(!ready())o.onReveal&&o.onReveal(t.inv,text)}, // spoken whole at turnEnd, so the intonation carries across sentences
    turnEnd(id,inv,r){const t=T[id]||(T[id]={inv,idx:0,pend:0,shown:''});t.mood=t.mood||r.mood;t.text=r.speech;t.ended=1;
      if(ready()){say(t,r.speech);if(!t.pend)o.onReveal&&o.onReveal(inv,r.speech)}else o.onReveal&&o.onReveal(inv,r.speech);
      check(t);setTimeout(()=>{if(!t.done){t.done=1;o.onSpoken&&o.onSpoken()}},30000)},
    reset(){stop();T={}}
  };
}
