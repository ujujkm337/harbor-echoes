// ГАВАНЬ — логика + Пространственный звук (Web Audio API)
let state = JSON.parse(localStorage.getItem('harbor')||'{}');
state.p1 = state.p1||34; state.p2 = state.p2||12; state.unlocked3 = state.unlocked3||false;
state.inv = state.inv || {lens:false,herb:false,lamp:false};
state.fear = state.fear||22; state.oil = state.oil||62;
state.audioEnabled = state.audioEnabled||false;

function save(){ localStorage.setItem('harbor', JSON.stringify(state)); updateHub(); }
function toast(m){ const t=document.getElementById('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }

function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  window.scrollTo(0,0);
  // audio scene switch
  if(id==='game3'){ Audio.startHorror(); Audio.heartbeat(true); }
  else if(id==='game2'){ Audio.startDay(); Audio.heartbeat(false); }
  else if(id==='game1'){ Audio.startHouse(); Audio.heartbeat(false); }
  else { Audio.stopAll(); }
  if(state.audioEnabled) Audio.resume();
}
function openGame(n){
  // need user gesture for audio
  if(!state.audioEnabled) Audio.init();
  if(n===3 && !state.unlocked3){
    const code = prompt('Ночная смена закрыта. Откроется после Дня 3 в «Маяке».\nВведи код смотрителя (подсказка: год постройки маяка — ищи в Доме, на подоконнике) или Отмена → в Маяк','');
    if(code==='1987'){ state.unlocked3=true; save(); toast('Код принят • Ночь открыта — НАДЕНЬ НАУШНИКИ'); Audio.playKnock(0); }
    else { showView('game2'); return; }
  }
  if(n===1) showView('game1');
  if(n===2) showView('game2');
  if(n===3) showView('game3');
}
function updateHub(){
  document.getElementById('p1').style.width = state.p1+'%';
  document.getElementById('p2').style.width = state.p2+'%';
  const total = Math.round((state.p1+state.p2 + (state.unlocked3?30:0))/3);
  document.getElementById('totalProgress').style.width = total+'%';
  document.getElementById('progressText').textContent = total+'% • Антология';
  if(state.unlocked3){
    document.getElementById('card3').classList.remove('locked');
    document.getElementById('play3').textContent='Играть →';
  }
}
updateHub();

// ========== ПРОСТРАНСТВЕННЫЙ ЗВУК ==========
const Audio = {
  ctx:null, master:null, ambientGain:null, horrorGain:null, isInit:false,
  windNode:null, seaNode:null, lampNode:null, heartbeatNode:null, heartbeatGain:null, heartbeatInt:null,
  init(){
    if(this.isInit) return;
    try{
      this.ctx = new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
      this.master = this.ctx.createGain(); this.master.gain.value = 0.85; this.master.connect(this.ctx.destination);
      this.ambientGain = this.ctx.createGain(); this.ambientGain.gain.value=0; this.ambientGain.connect(this.master);
      this.horrorGain = this.ctx.createGain(); this.horrorGain.gain.value=0; this.horrorGain.connect(this.master);
      // lowpass for horror
      this.isInit=true; state.audioEnabled=true; save();
      this.ctx.resume();
      toast('🔊 Звук включён — надень наушники для 3D');
      document.getElementById('audioBtn') && (document.getElementById('audioBtn').textContent='🔊 3D звук вкл');
    }catch(e){ console.warn(e); }
  },
  resume(){ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  // filtered noise for wind/sea
  createNoiseBuffer(){
    const len = this.ctx.sampleRate*2;
    const buf = this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++){ d[i]=(Math.random()*2-1)*0.5; }
    return buf;
  },
  stopAll(){
    if(!this.ctx) return;
    [this.windNode,this.seaNode,this.lampNode].forEach(n=>{ try{n && n.stop && n.stop();}catch{} });
    this.ambientGain && (this.ambientGain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+0.6));
    this.horrorGain && (this.horrorGain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+0.4));
    this.heartbeat(false);
  },
  startHouse(){
    this.init();
    if(!this.ctx) return;
    this.stopAll();
    // wind through window - slightly left
    const src = this.ctx.createBufferSource(); src.buffer=this.createNoiseBuffer(); src.loop=true;
    const filter = this.ctx.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=900; filter.Q.value=0.7;
    const panner = this.ctx.createStereoPanner(); panner.pan.value=-0.35;
    const gain = this.ctx.createGain(); gain.gain.value=0.12;
    src.connect(filter).connect(panner).connect(gain).connect(this.ambientGain);
    src.start(); this.windNode=src;
    this.ambientGain.gain.linearRampToValueAtTime(0.7,this.ctx.currentTime+1.2);
  },
  startDay(){
    this.init();
    if(!this.ctx) return;
    this.stopAll();
    // cozy: kettle hiss center, sea soft stereo, radio crackle right
    const src = this.ctx.createBufferSource(); src.buffer=this.createNoiseBuffer(); src.loop=true;
    const lp = this.ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1200;
    const pan = this.ctx.createStereoPanner(); pan.pan.value=0.1;
    const g = this.ctx.createGain(); g.gain.value=0.08;
    src.connect(lp).connect(pan).connect(g).connect(this.ambientGain); src.start(); this.seaNode=src;
    // lamp hum 60hz
    const osc=this.ctx.createOscillator(); osc.type='sine'; osc.frequency.value=58;
    const og=this.ctx.createGain(); og.gain.value=0.03;
    const op=this.ctx.createStereoPanner(); op.pan.value=0;
    osc.connect(og).connect(op).connect(this.ambientGain); osc.start(); this.lampNode=osc;
    this.ambientGain.gain.linearRampToValueAtTime(0.55,this.ctx.currentTime+0.8);
  },
  startHorror(){
    this.init();
    if(!this.ctx) return;
    this.stopAll();
    // deep wind + rumble
    const src=this.ctx.createBufferSource(); src.buffer=this.createNoiseBuffer(); src.loop=true;
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=320; bp.Q.value=0.4;
    const pan=this.ctx.createStereoPanner(); pan.pan.value=0;
    const g=this.ctx.createGain(); g.gain.value=0.18;
    src.connect(bp).connect(pan).connect(g).connect(this.horrorGain); src.start(); this.windNode=src;
    // sub rumble oscillator
    const sub=this.ctx.createOscillator(); sub.type='sine'; sub.frequency.value=29;
    const lfo=this.ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.22;
    const lfoGain=this.ctx.createGain(); lfoGain.gain.value=8;
    lfo.connect(lfoGain).connect(sub.frequency);
    const sg=this.ctx.createGain(); sg.gain.value=0.09;
    const sp=this.ctx.createStereoPanner(); sp.pan.value=0;
    sub.connect(sg).connect(sp).connect(this.horrorGain); sub.start(); lfo.start(); this.seaNode=sub; this.lampNode=lfo;
    this.horrorGain.gain.linearRampToValueAtTime(0.75,this.ctx.currentTime+1.0);
    // random spatial knocks will be triggered separately
    this.scheduleHorrorEvents();
  },
  scheduleHorrorEvents(){
    if(!this.ctx) return;
    clearTimeout(this._horrorTimer);
    const loop=()=>{
      if(document.getElementById('view-game3').classList.contains('active')){
        const r=Math.random();
        if(r<0.35) this.playKnock( (Math.random()<0.5?-0.9:0.9) ); // left or right door
        else if(r<0.6) this.playScratch( (Math.random()-0.5)*0.6 );
        else if(r<0.8) this.playWhisperSpatial();
        // lamp flicker visual
        if(Math.random()<0.3) flicker();
      }
      this._horrorTimer=setTimeout(loop, 2800 + Math.random()*4500);
    };
    this._horrorTimer=setTimeout(loop, 2000);
  },
  // spatial one-shot from URL with panning
  playSpatial(url, pan=-0.2, vol=0.9){
    if(!this.ctx) return;
    fetch(url).then(r=>r.arrayBuffer()).then(b=>this.ctx.decodeAudioData(b)).then(buf=>{
      const src=this.ctx.createBufferSource(); src.buffer=buf;
      const panner=this.ctx.createStereoPanner(); panner.pan.value=pan;
      // also add 3D panner for distance
      const gain=this.ctx.createGain(); gain.gain.value=vol;
      src.connect(panner).connect(gain).connect(this.master);
      // slight reverb via delay for horror
      if(document.getElementById('view-game3').classList.contains('active')){
        const delay=this.ctx.createDelay(); delay.delayTime.value=0.14;
        const dg=this.ctx.createGain(); dg.gain.value=0.18;
        panner.connect(delay).connect(dg).connect(this.master);
      }
      src.start();
    }).catch(()=>{});
  },
  playKnock(pan){
    if(!this.ctx) return;
    // synthesize knock: short filtered noise burst + low thump
    const t=this.ctx.currentTime;
    const osc=this.ctx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(85,t); osc.frequency.exponentialRampToValueAtTime(28,t+0.18);
    const gain=this.ctx.createGain(); gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(0.95,t+0.01); gain.gain.exponentialRampToValueAtTime(0.01,t+0.32);
    const panNode=this.ctx.createStereoPanner(); panNode.pan.value=pan;
    osc.connect(gain).connect(panNode).connect(this.master); osc.start(t); osc.stop(t+0.34);
    // second knock after 120ms
    setTimeout(()=>{
      const o2=this.ctx.createOscillator(); o2.type='sine'; o2.frequency.setValueAtTime(82,t); o2.frequency.exponentialRampToValueAtTime(30,this.ctx.currentTime+0.15);
      const g2=this.ctx.createGain(); g2.gain.setValueAtTime(0,this.ctx.currentTime); g2.gain.linearRampToValueAtTime(0.8,this.ctx.currentTime+0.01); g2.gain.exponentialRampToValueAtTime(0.01,this.ctx.currentTime+0.28);
      o2.connect(g2).connect(panNode).connect(this.master); o2.start(); o2.stop(this.ctx.currentTime+0.3);
    }, 140);
    // screen shake
    if(Math.abs(pan)>0.5) shake(pan>0?1:-1);
  },
  playScratch(pan){
    if(!this.ctx) return;
    const src=this.ctx.createBufferSource(); src.buffer=this.createNoiseBuffer();
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value= 400+Math.random()*600; bp.Q.value=1.2;
    const gain=this.ctx.createGain(); gain.gain.value=0;
    const panNode=this.ctx.createStereoPanner(); panNode.pan.value=pan;
    src.connect(bp).connect(panNode).connect(gain).connect(this.master);
    gain.gain.linearRampToValueAtTime(0.32,this.ctx.currentTime+0.05);
    gain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+0.9+Math.random()*0.6);
    src.start(); src.stop(this.ctx.currentTime+1.1);
    // subtle pitch wobble
    src.playbackRate.setValueAtTime(0.6,this.ctx.currentTime);
    src.playbackRate.linearRampToValueAtTime(0.35,this.ctx.currentTime+0.8);
  },
  playWhisperSpatial(){
    const whispers=['assets/whisper1.mp3','assets/whisper2.mp3','assets/whisper3.mp3'];
    const u=whispers[Math.floor(Math.random()*whispers.length)];
    const pan = (Math.random()<0.33 ? -0.9 : Math.random()<0.5 ? 0.9 : (Math.random()-0.5)*0.4 ); // left, right or center-behind
    this.playSpatial(u, pan, 0.85+Math.random()*0.2);
    // also text whisper alternative if file fails: use speech synth? keep file
  },
  playTeaPour(){
    if(!this.ctx) return;
    const osc=this.ctx.createOscillator(); osc.type='triangle'; osc.frequency.value=880;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0,this.ctx.currentTime); g.gain.linearRampToValueAtTime(0.12,this.ctx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.01,this.ctx.currentTime+0.45);
    osc.connect(g).connect(this.master); osc.start(); osc.stop(this.ctx.currentTime+0.5);
  },
  playCollect(){
    if(!this.ctx) return;
    const o=this.ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(520,this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(880,this.ctx.currentTime+0.18);
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.18,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,this.ctx.currentTime+0.32);
    o.connect(g).connect(this.master); o.start(); o.stop(this.ctx.currentTime+0.34);
  },
  heartbeat(on){
    if(!this.ctx) return;
    if(this.heartbeatInt) clearInterval(this.heartbeatInt);
    if(this.heartbeatNode) try{this.heartbeatNode.stop();}catch{}
    if(!on) return;
    const thump=()=>{
      if(!document.getElementById('view-game3').classList.contains('active')) return;
      const fear=state.fear||30;
      const interval = fear>65 ? 520 : fear>40 ? 780 : 1100;
      // create two beats
      const t=this.ctx.currentTime;
      [0,0.18].forEach(off=>{
        const o=this.ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(45,t+off); o.frequency.exponentialRampToValueAtTime(28,t+off+0.18);
        const g=this.ctx.createGain(); g.gain.setValueAtTime(0,t+off); g.gain.linearRampToValueAtTime(0.42,t+off+0.02); g.gain.exponentialRampToValueAtTime(0.01,t+off+0.28);
        const pan=this.ctx.createStereoPanner(); pan.pan.value= (Math.random()-0.5)*0.15;
        o.connect(g).connect(pan).connect(this.master); o.start(t+off); o.stop(t+off+0.3);
      });
      this.heartbeatInt=setTimeout(thump, interval);
    };
    thump();
  }
};

function flicker(){
  const h=document.querySelector('#view-game3 .game-head img');
  if(!h) return;
  h.style.filter='brightness(1.35) contrast(1.2)';
  setTimeout(()=>h.style.filter='brightness(.75)',90);
  setTimeout(()=>h.style.filter='brightness(1.25)',170);
  setTimeout(()=>h.style.filter='brightness(.75)',260);
  Audio.playKnock((Math.random()<0.5?-0.7:0.7));
}
function shake(dir){
  const app=document.querySelector('.app');
  app.style.transform=`translateX(${dir*6}px)`;
  setTimeout(()=>app.style.transform='translateX(0)',120);
  setTimeout(()=>app.style.transform=`translateX(${dir*-4}px)`,60);
}

// ========== GAME LOGIC (с аудио) ==========
let g1found = {...state.inv};
function collect(which){
  if(g1found[which]) return;
  g1found[which]=true; state.inv[which]=true;
  save();
  Audio.init(); Audio.playCollect();
  // spatial: lens left, herb right, lamp center
  const pans={lens:-0.7,herb:0.7,lamp:0};
  Audio.playKnock(pans[which]*0.5);
  const map = {lens:'линза найдена', herb:'травы для проявителя', lamp:'лампа с тёплым светом'};
  toast('Найдено: '+map[which]);
  document.getElementById('g1text').innerHTML = {
    lens: 'Линза от старого проектора. Сколотый край, но свет собирает идеально. <i>1/3</i>',
    herb: 'Пучок полыни и морской капусты. Бабушка сушила для чая и... для фото-раствора? <i>2/3</i>',
    lamp: 'Керосинка бабушки. Фитиль ещё влажный. Пахнет домом. <i>3/3 — можно проявить!</i>'
  }[which];
  const inv = document.getElementById('inv');
  inv.innerHTML = `
    <div class="inv-item" style="${g1found.lens?'':'opacity:.3'}">🔍<span>линза</span></div>
    <div class="inv-item" style="${g1found.herb?'':'opacity:.3'}">🌿<span>травы</span></div>
    <div class="inv-item" style="${g1found.lamp?'':'opacity:.3'}">💡<span>лампа</span></div>
    <div class="inv-item" style="opacity:${(g1found.lens&&g1found.herb&&g1found.lamp)?'1':'.3'}">🗺️<span>карта</span></div>
  `;
  document.getElementById('journalText').textContent = `Собрано ${Object.values(g1found).filter(Boolean).length}/3. ${g1found.lens&&g1found.herb&&g1found.lamp ? 'Всё есть! Теперь прояви фото.' : 'Ищи точки на фото комнаты.'}`;
  state.p1 = Math.min(100, 34 + Object.values(g1found).filter(Boolean).length*11);
  save();
}
function g1action(what){
  Audio.init();
  const texts={
    window:'Ставня скрипит. За ней — отлив, и вдалеке маяк мигает раз в 7 секунд. Ты считаешь. На подоконнике — царапина: «1987». Год постройки?',
    radio:'Крутишь ручку. 87.9 — чистый тон. Голос: «...Лина? Если слышишь, не гаси...» Это бабушка? Или запись? Ты записываешь частоту.',
    diary:'«Сегодня Витя снова приходил. Говорит, город пустеет. Я сказала — пока светит, город жив. Даже если в нём никого». Запись за 12 октября. После — пусто.'
  };
  document.getElementById('g1text').textContent = texts[what];
  if(what==='window') Audio.playKnock(-0.6);
  if(what==='radio') Audio.playSpatial('assets/whisper1.mp3', 0.3, 0.7);
  toast('Записано в дневник');
}
function finishG1(){
  Audio.init();
  if(!(g1found.lens&&g1found.herb&&g1found.lamp)){
    toast('Сначала собери 3 света на фото комнаты');
    document.querySelectorAll('.hotspot').forEach(h=>h.style.transform='scale(1.25)');
    setTimeout(()=>document.querySelectorAll('.hotspot').forEach(h=>h.style.transform=''),600);
    Audio.playKnock(0);
    return;
  }
  document.getElementById('g1text').innerHTML = 'Ты наливаешь раствор, кладёшь бумагу, направляешь свет линзы... Проявляется снимок: <b>маяк, а у его подножия — маленькая чайная с вывеской «ГАВАНЬ». На обороте — карта и ключ.</b> <br><small style="opacity:.6">Ты открыла «Маяк». + прогресс</small>';
  document.getElementById('g1choices').innerHTML = '<button class="choice" style="background:var(--ink);color:white;text-align:center" onclick="state.p1=100;save();toast(\'Глава завершена\');showView(\'hub\')">Вернуться в Гавань →</button>';
  state.p1=78; state.p2=Math.max(state.p2,28);
  save();
  Audio.playCollect();
  toast('Фото проявлено • Карта получена 🗺️');
}

// GAME2
let cup = [];
const cupEl = ()=>document.getElementById('cupContent');
function mix(ing){
  Audio.init();
  if(cup.length>=2){ cup=[]; }
  cup.push(ing);
  const icons={mint:'🌿',sea:'🌊',pine:'🌲',honey:'🍯'};
  const names={mint:'мята',sea:'солерос',pine:'хвоя',honey:'мёд'};
  cupEl().textContent = cup.map(c=>icons[c]).join(' + ');
  document.getElementById('cupDesc').textContent = cup.map(c=>names[c]).join(' + ') + (cup.length===2?' — готово к подаче':' — добавь ещё один');
  Audio.playTeaPour();
  if(cup.length===1) toast('Добавлено: '+names[ing]);
}
function g2choose(which){
  Audio.init();
  const replies={
    a:'Витя кивает медленно. «Тогда налей мне того, что от тумана. И держи чайник горячим — люди ещё придут». Его глаза теплеют.',
    b:'Витя молчит, потом улыбается грустно. «Все так говорят сначала. А потом остаются. Чай всё равно налей».',
    c:'«А я? Я тут рыбу ловил, когда ещё школы были. Теперь ловлю тишину. Она тоже клюёт, если прикормить чаем». — смеётся.'
  };
  document.getElementById('g2text').textContent = replies[which];
  document.getElementById('g2choices').innerHTML = '<button class="choice" style="background:var(--moss);color:white;text-align:center" onclick="serveTea(true)">Подать чай, который смешала →</button>';
  state.p2 = Math.min(100, state.p2+6); save();
  // soft spatial voice
  Audio.playSpatial('assets/whisper2.mp3', -0.4, 0.45);
}
function serveTea(fromChoice){
  Audio.init();
  if(cup.length!==2){ toast('Смешай 2 ингредиента'); Audio.playKnock(0); return; }
  const key = cup.join('+');
  const combos={
    'mint+honey':'Идеально! Витя выдыхает: «Туман отошёл. Спасибо, дочка». Он оставляет тебе ржавый ключ от люка маяка и уходит, насвистывая.',
    'mint+sea':'Странно-солёный. Витя морщится, но допивает: «Напомнило море в ноябре. Тоже сгодится».',
    'pine+honey':'Тёплый, как баня. Витя: «Вот это — как будто дом затопила. Спасибо».',
    'sea+pine':'Горько. Витя качает головой: «Не моё, но выпью — уважу труд».'
  };
  const result = combos[key] || combos[Object.keys(combos)[Math.floor(Math.random()*4)]];
  document.getElementById('g2text').innerHTML = result + '<br><br><b>День 1 завершён.</b> За дверью уже ждёт Мира с книгой про птиц.';
  document.getElementById('g2choices').innerHTML = '<button class="choice" style="background:var(--ink);color:white;text-align:center" onclick="nextDay()">Следующий день →</button>';
  document.getElementById('cupDesc').textContent = 'Подано ✓';
  Audio.playTeaPour();
  state.p2 = Math.min(100, state.p2+14); save();
  if(state.p2>=34 && !state.unlocked3){ state.unlocked3=true; toast('Открылась Ночная смена! 🔓'); }
}
function nextDay(){
  document.getElementById('g2text').innerHTML = 'Следующий день начнётся в полной версии — сейчас демо Дня 1. Твои выборы сохранились. В полной игре каждый из 7 гостей меняет финал.<br><br><i style="opacity:.6">Ты можешь вернуться в Гавань — прогресс сохранён.</i>';
  document.getElementById('g2choices').innerHTML = '<button class="choice" style="background:var(--ink);color:white;text-align:center" onclick="showView(\'hub\')">В Гавань →</button>';
  toast('День сохранён • Прогресс '+state.p2+'%');
}

// ====== GAME3 — ЖЁСТКИЙ ХОРРОР ======
function g3choose(act){
  Audio.init();
  const oilEl=document.getElementById('oil');
  const fearEl=document.getElementById('fearLabel');
  let fear=state.fear, oil=state.oil;
  const app=document.querySelector('.app');
  if(act==='let'){
    document.getElementById('g3text').innerHTML='Ты впускаешь. Он садится, пьёт чай, не оставляя пара. Тень так и не появилась. Он шепчет: <i>«Спасибо, что не спросила, откуда я»</i> — голос идёт <b>слева</b>, хотя он сидит справа. Тревога +18. <br><span style="opacity:.6;font-size:12px">Правило нарушено.</span>';
    fear=Math.min(100,fear+18); oil=Math.max(0,oil-7);
    Audio.playWhisperSpatial(); Audio.playScratch(-0.8);
    toast('Тревога выросла — слышишь слева?');
    shake(-1);
  } else if(act==='dim'){
    document.getElementById('g3text').innerHTML='<span style="color:#ff4a4a;font-weight:700">Ты приглушаешь лампу.</span> Сразу темнеет. Снизу — СКРЕЖЕТ в люке ГРОМЧЕ, будто ногтями по металлу. Гость улыбается слишком широко, зубы слишком острые: «Вот теперь уютно».<br>Масло -22%, тревога +30 — <b>лампа сейчас погаснет!</b>';
    fear=Math.min(100,fear+30); oil=Math.max(0,oil-22);
    Audio.playScratch(0); flicker(); flicker();
    app.style.filter='brightness(.45)';
    setTimeout(()=>app.style.filter='',900);
    toast('Свет гаснет! Скрежет снизу!');
  } else {
    document.getElementById('g3text').innerHTML='Ты говоришь твёрдо: «Без тени не пускаю». Гость замирает, потом кивает: «Умница. Бабушка бы похвалила». Он растворяется в тумане, на пороге остаётся сухой венок из водорослей. Но из люка слышен <b>удар</b> — будто что-то злится, что ты не пустила. <b>Правильно, но опасно.</b> Тревога -8, но люк...';
    fear=Math.max(0,fear-8); oil=Math.max(0,oil-3);
    Audio.playKnock(0); Audio.playScratch(0.2);
    toast('Правило соблюдено ✓ — но люк бьёт');
  }
  state.fear=fear; state.oil=oil; save();
  oilEl.style.width=oil+'%';
  oilEl.style.background = oil<22 ? '#8a1a1a' : oil<45 ? '#C77A5A' : 'linear-gradient(90deg,#C77A5A,#8a1a1a)';
  fearEl.textContent = fear<28?'низкая':fear<58?'средняя':fear<82?'высокая':'ПАНИКА';
  fearEl.style.color = fear<28?'#6A8B6F':fear<58?'#C77A5A':fear<82?'#ff4a4a':'#ff0000';
  document.getElementById('g3journal').textContent = `${new Date().toLocaleTimeString().slice(0,5)} — масло ${oil}%. Тревога ${fear}%. ${fear>70?'СЕРДЦЕ КОЛОТИТСЯ.':'Снизу стук.'} ${oil<20?'МАСЛО НА ИСХОДЕ — ПОДЛЕЙ!':''}`;
  // vignette intensity
  const v=document.getElementById('vignette');
  if(v){ v.style.opacity = 0.15 + fear/260; v.style.boxShadow = `inset 0 0 ${60+fear*1.2}px rgba(0,0,0,${0.45+fear/220})`; }
  // heartbeat speed
  Audio.heartbeat(true);
  document.getElementById('g3choices').innerHTML = '<button class="choice" style="background:#1a2a3a;color:#E8DCCA;border-color:rgba(255,255,255,.12)" onclick="nextGuest()">Следующий гость →</button>';
  if(oil<12){ document.getElementById('g3journal').innerHTML += '<br><span style="color:#ff4a4a">ЛАМПА ГАСНЕТ! ЖМИ «Подлить масла» СРОЧНО!</span>'; flicker(); }
}
function nextGuest(){
  Audio.init();
  // escalation
  Audio.playKnock(0.88); Audio.playWhisperSpatial();
  document.getElementById('g3text').innerHTML='Следующий гость стучит уже <b>в окно</b>, а не в дверь. На стекле — отпечаток ладони <i>изнутри</i>. Снизу люк подпрыгивает. Рация на 87.9 хрипит: <i>«Не открывай... не открывай...»</i><br><span style="opacity:.6;font-size:12px">Продолжение — ещё 4 гостя и 3 концовки: «Дождаться рассвета», «Стать смотрителем», «Уйти в море». Демо закончено, но страх — настоящий. Попробуй надеть наушники и нажать «Подлить масла» — услышишь, откуда идёт стук.</span>';
  document.getElementById('guestMeta').textContent='силуэт • стук в окно • ЛЮК ДРОЖИТ';
  document.getElementById('g3choices').innerHTML='<button class="choice" style="background:#8a1a1a;color:white;text-align:center" onclick="triggerJump()">Открыть люк? (не надо) </button><button class="choice" style="background:#C77A5A;color:white;text-align:center" onclick="showView(\'hub\')">Дожить до утра — в Гавань →</button>';
}
function triggerJump(){
  Audio.init();
  // fake jumpscare - but prepared
  Audio.playScratch(0); Audio.playKnock(-0.9); Audio.playKnock(0.9);
  shake(1); flicker();
  document.getElementById('g3text').innerHTML='<span style="color:#ff4a4a;font-size:18px;font-weight:800">ТЫ ОТКРЫЛА ЛЮК.</span><br>Внизу — темнота, пахнет солью и гнилью. Что-то смотрит на тебя снизу вверх. Ты захлопываешь, но теперь знаешь — оно знает, что ты здесь.<br><span style="opacity:.6">Тревога 100. Масло 5%. Это была плохая идея.</span>';
  state.fear=96; state.oil=5; save();
  document.getElementById('oil').style.width='5%'; document.getElementById('fearLabel').textContent='ПАНИКА'; document.getElementById('fearLabel').style.color='#ff0000';
  Audio.heartbeat(true);
  toast('Зря открыла... оно проснулось');
}
function oilTick(d){
  Audio.init();
  state.oil=Math.max(0,Math.min(100,state.oil - d));
  state.fear=Math.max(0, state.fear + d);
  if(d<0){ // подлить = отрицательный d? в кнопке -8, но мы вызываем -8, значит oil+8
    Audio.playTeaPour(); // звук наливания
  }
  save(); document.getElementById('oil').style.width=state.oil+'%';
  toast(state.oil<20?'Масло критично!':'Масло '+state.oil+'%');
  Audio.heartbeat(true);
}
function resetAll(){
  if(!confirm('Сбросить весь прогресс?')) return;
  localStorage.removeItem('harbor'); location.reload();
}
if(state.inv) g1found={...state.inv};
updateHub();

// auto-enable audio button handler
document.addEventListener('click', ()=>{ if(state.audioEnabled && Audio.ctx && Audio.ctx.state==='suspended') Audio.ctx.resume(); }, {once:true});

// PWA
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }

// Expose for console
window.Audio = Audio;
