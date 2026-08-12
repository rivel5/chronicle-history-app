// Chronicle mastery and gamification layer
// Extends the local-first learning engine without requiring an account or backend.

const LEVELS=[
  {n:1,name:'Curious Explorer',min:0},
  {n:2,name:'Archive Scout',min:100},
  {n:3,name:'Story Seeker',min:250},
  {n:4,name:'Context Builder',min:450},
  {n:5,name:'Timeline Navigator',min:700},
  {n:6,name:'Chronicle Keeper',min:1000},
  {n:7,name:'History Detective',min:1350},
  {n:8,name:'World Connector',min:1750},
  {n:9,name:'Master Historian',min:2200},
  {n:10,name:'Living Archive',min:2750}
];

state.mastery=state.mastery||{};
state.checkpoints=state.checkpoints||{};
state.correctStreak=state.correctStreak||0;
state.bestStreak=state.bestStreak||0;
state.badges=state.badges||[];
save();

function levelInfo(xp=state.xp){
  let current=LEVELS[0];
  for(const level of LEVELS)if(xp>=level.min)current=level;
  const next=LEVELS.find(level=>level.min>xp)||null;
  const progress=next?Math.max(0,Math.min(100,Math.round((xp-current.min)/(next.min-current.min)*100))):100;
  return {...current,next,progress};
}

function levelLabel(){const l=levelInfo();return `Lv ${l.n} · ${l.name}`}

function confettiBurst(big=false){
  if(state.settings.reduced){notify(big?'Milestone unlocked!':'Correct!');return;}
  const layer=document.createElement('div');layer.className='confetti-layer';
  const count=big?90:42;
  for(let i=0;i<count;i++){
    const piece=document.createElement('i');piece.className='confetti-piece';
    piece.style.left=Math.random()*100+'vw';
    piece.style.setProperty('--drift',(Math.random()*180-90)+'px');
    piece.style.setProperty('--spin',(Math.random()*720+180)+'deg');
    piece.style.animationDelay=(Math.random()*.18)+'s';
    piece.style.animationDuration=(.85+Math.random()*.7)+'s';
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);setTimeout(()=>layer.remove(),1900);
}

function gentleNudge(){
  const lines=[
    'Not yet. Your brain just found the edge of the memory. Try once more.',
    'Close. Use the lesson’s main image or cause-and-effect link, then try again.',
    'Good attempt. Eliminate the choice that does not fit the story, then retry.',
    'That one is not it. Reconstruct the story instead of guessing, then choose again.'
  ];
  return lines[Math.floor(Math.random()*lines.length)];
}

const originalShell=shell;
shell=function(content,tab=state.tab){
  const lv=levelInfo();
  document.documentElement.style.setProperty('--text',state.settings.text+'px');
  document.body.classList.toggle('reduced',state.settings.reduced);
  document.getElementById('app').innerHTML=`<main class="app"><div class="topbar"><div class="brand"><div><div class="eyebrow">History you can remember</div><h1>Chronicle</h1></div><div class="level-stack"><span class="level-chip">${levelLabel()}</span><div class="pill">${state.xp} XP</div></div></div></div>${content}</main><nav class="bottom-nav"><div class="inner">${[['today','⌂','Today'],['paths','⌁','Paths'],['review','↻','Review'],['timeline','⌛','Timeline'],['profile','⚙','Profile']].map(([id,ic,tx])=>`<button class="nav-btn ${tab===id?'active':''}" onclick="go('${id}')"><span>${ic}</span>${tx}</button>`).join('')}</div></nav>`;
};

renderToday=function(){
  const l=chooseDaily(),due=dueReviews().length,week=state.days.filter(d=>(Date.now()-new Date(d).getTime())<7*864e5).length,lv=levelInfo();
  shell(`<section><p class="muted">Welcome back, ${esc(state.name)}.</p><h2 class="section-title">Today’s ${state.goal}-minute journey</h2><article class="card hero"><div class="eyebrow">${l.path} · ${l.era}</div><h2>${l.title}</h2><p>${l.beats[0][1]}</p><button class="button" onclick="startLesson('${l.id}')">${state.completed[l.id]?'Revisit lesson':'Start lesson'}</button></article><article class="card level-card"><div class="level-head"><div><div class="eyebrow">Level ${lv.n}</div><h3>${lv.name}</h3></div><strong>${state.xp} XP</strong></div><div class="progress"><span style="width:${lv.progress}%"></span></div><p class="muted">${lv.next?`${lv.next.min-state.xp} XP to ${lv.next.name}`:'Highest level reached'} · Best answer streak: ${state.bestStreak}</p></article><div class="stats"><div class="stat"><span class="muted">Learning rhythm</span><strong>${state.days.length}</strong><small>active days</small></div><div class="stat"><span class="muted">This week</span><strong>${week*state.goal}</strong><small>minutes</small></div><div class="stat"><span class="muted">Due now</span><strong>${due}</strong><small>reviews</small></div></div><article class="card"><div class="eyebrow">One thing to remember</div><p><strong>${l.beats[4][1]}</strong></p></article></section>`);
};

startLesson=function(id){
  const lesson=LESSONS.find(l=>l.id===id);
  lessonSession={lesson,index:0,phase:'beats',score:0,q:0,answered:false,questionAttempts:0,bonusXp:0};
  drawLesson();
};

drawQuiz=function(){
  const s=lessonSession,q=s.lesson.quiz[s.q];
  document.getElementById('app').innerHTML=`<main class="app"><section class="card story"><div class="eyebrow">Retrieval ${s.q+1}/${s.lesson.quiz.length} · ${levelLabel()}</div><h2>${q.q}</h2><p class="muted">You must retrieve the correct answer before moving on. Wrong attempts are part of learning.</p><div>${q.o.map((x,i)=>`<button class="quiz-option" onclick="answerQuiz(${i})">${x}</button>`).join('')}</div><div id="feedback"></div></section></main>`;
};

answerQuiz=function(i){
  const s=lessonSession,q=s.lesson.quiz[s.q];if(s.answered)return;
  const buttons=[...document.querySelectorAll('.quiz-option')];
  if(i===q.a){
    const firstTry=s.questionAttempts===0;
    s.answered=true;
    if(firstTry)s.score++;
    s.bonusXp+=firstTry?10:6;
    state.correctStreak=(state.correctStreak||0)+1;
    state.bestStreak=Math.max(state.bestStreak||0,state.correctStreak);
    buttons.forEach((b,j)=>{b.disabled=true;if(j===q.a)b.classList.add('correct')});
    document.getElementById('feedback').innerHTML=`<div class="feedback success-feedback"><strong>${firstTry?'Correct!':'Yes. You corrected it.'}</strong><p>${q.e}</p><div class="reward-line">+${firstTry?10:6} XP · ${state.correctStreak} answer streak</div><button class="button block" onclick="nextQuiz()">Continue</button></div>`;
    save();confettiBurst(false);
  }else{
    s.questionAttempts++;
    state.correctStreak=0;save();
    buttons[i].classList.add('wrong','shake');buttons[i].disabled=true;
    document.getElementById('feedback').innerHTML=`<div class="feedback retry-feedback"><strong>Try again.</strong><p>${gentleNudge()}</p><div class="hint-line">Memory cue: think about <em>${esc(s.lesson.beats[4][0].toLowerCase())}</em> and the story’s main cause-and-effect link.</div></div>`;
    setTimeout(()=>buttons[i].classList.remove('shake'),450);
  }
};

nextQuiz=function(){
  const s=lessonSession;s.answered=false;s.questionAttempts=0;
  if(s.q<s.lesson.quiz.length-1){s.q++;drawQuiz()}else{s.phase='finish';drawFinish()}
};

completeLesson=function(){
  const s=lessonSession,l=s.lesson,conf=+document.getElementById('confidence').value,ratio=s.score/l.quiz.length;
  const previous=state.completed[l.id];
  const oldLevel=levelInfo(state.xp);
  state.completed[l.id]={date:today(),score:s.score,total:l.quiz.length,confidence:conf};
  state.attempts[l.id]=(state.attempts[l.id]||0)+1;
  const mastery=state.mastery[l.id]||{bestFirstTry:0,completions:0};
  mastery.bestFirstTry=Math.max(mastery.bestFirstTry,s.score);
  mastery.completions++;
  mastery.lastCompleted=today();mastery.confidence=conf;
  state.mastery[l.id]=mastery;
  const completionXp=(previous?5:20)+s.bonusXp+10;
  state.xp+=completionXp;
  if(!state.days.includes(today()))state.days.push(today());
  const base=ratio===1&&conf===3?3:ratio>=.67?1:0,intervals=[1,3,7,14,30,90],idx=Math.min(base,intervals.length-1);
  const due=new Date(Date.now()+intervals[idx]*864e5).toISOString();
  state.reviews=state.reviews.filter(r=>r.lessonId!==l.id);state.reviews.push({lessonId:l.id,due,stage:idx});
  const pathDone=completedCount(l.path)===LESSONS.filter(x=>x.path===l.path).length;
  const checkpointNew=pathDone&&!state.checkpoints[l.path]?.completed;
  save();
  const newLevel=levelInfo(state.xp),levelUp=newLevel.n>oldLevel.n;
  lessonSession=null;
  if(levelUp||checkpointNew)confettiBurst(true);
  document.getElementById('app').innerHTML=`<main class="app"><section class="card story reward-screen"><div class="eyebrow">Progress saved</div><h2>${levelUp?`Level ${newLevel.n}: ${newLevel.name}`:'Memory strengthened'}</h2><p>You earned <strong>${completionXp} XP</strong>. Chronicle remembered your score, confidence, completion count, and next review date.</p>${checkpointNew?`<div class="milestone-box"><strong>${l.path} Chapter Challenge unlocked</strong><p>You completed every lesson in this path. The checkpoint mixes questions from all four lessons.</p><button class="button" onclick="startCheckpoint('${l.path}')">Take the chapter challenge</button></div>`:''}<div class="stats"><div class="stat"><span class="muted">Best first-try recall</span><strong>${Math.round(state.mastery[l.id].bestFirstTry/l.quiz.length*100)}%</strong></div><div class="stat"><span class="muted">Best streak</span><strong>${state.bestStreak}</strong></div><div class="stat"><span class="muted">Level</span><strong>${newLevel.n}</strong></div></div><button class="button block" onclick="state.tab='today';save();render()">Back to Today</button></section></main>`;
};

const checkpointBadges={Bahamian:'Island Historian',Caribbean:'Caribbean Connector',World:'World Navigator',American:'American Context Builder'};
let checkpointSession=null;
function startCheckpoint(path){
  const lessons=LESSONS.filter(l=>l.path===path);
  if(lessons.some(l=>!state.completed[l.id])){notify('Complete all four lessons first.');return;}
  checkpointSession={path,questions:lessons.map((l,i)=>({lesson:l,...l.quiz[i%l.quiz.length]})),q:0,firstTry:0,tries:0,bonus:0};
  drawCheckpoint();
}
function drawCheckpoint(){
  const s=checkpointSession,q=s.questions[s.q];
  document.getElementById('app').innerHTML=`<main class="app"><section class="card story"><div class="eyebrow">${s.path} Chapter Challenge · ${s.q+1}/${s.questions.length}</div><h2>${q.q}</h2><p class="muted">Mixed retrieval from ${q.lesson.title}</p><div>${q.o.map((x,i)=>`<button class="quiz-option" onclick="answerCheckpoint(${i})">${x}</button>`).join('')}</div><div id="feedback"></div></section></main>`;
}
function answerCheckpoint(i){
  const s=checkpointSession,q=s.questions[s.q],buttons=[...document.querySelectorAll('.quiz-option')];
  if(i===q.a){
    if(s.tries===0)s.firstTry++;s.bonus+=s.tries===0?15:8;
    state.correctStreak++;state.bestStreak=Math.max(state.bestStreak,state.correctStreak);save();
    buttons.forEach((b,j)=>{b.disabled=true;if(j===q.a)b.classList.add('correct')});
    document.getElementById('feedback').innerHTML=`<div class="feedback success-feedback"><strong>Correct.</strong><p>${q.e}</p><button class="button block" onclick="nextCheckpoint()">${s.q===s.questions.length-1?'Finish challenge':'Next'}</button></div>`;
    confettiBurst(false);
  }else{
    s.tries++;state.correctStreak=0;save();buttons[i].disabled=true;buttons[i].classList.add('wrong','shake');
    document.getElementById('feedback').innerHTML=`<div class="feedback retry-feedback"><strong>Not yet. Try again.</strong><p>${gentleNudge()}</p></div>`;
  }
}
function nextCheckpoint(){
  const s=checkpointSession;s.tries=0;
  if(s.q<s.questions.length-1){s.q++;drawCheckpoint();return;}
  const old=levelInfo(state.xp),reward=75+s.bonus;state.xp+=reward;
  const badge=checkpointBadges[s.path];state.checkpoints[s.path]={completed:true,date:today(),firstTry:s.firstTry,total:s.questions.length};
  if(!state.badges.includes(badge))state.badges.push(badge);save();
  const lv=levelInfo(state.xp);confettiBurst(true);
  document.getElementById('app').innerHTML=`<main class="app"><section class="card story reward-screen"><div class="eyebrow">Chapter mastered</div><h2>${badge}</h2><p>You completed the ${s.path} checkpoint and earned <strong>${reward} XP</strong>.</p><div class="badge-medallion">★</div><p class="muted">First-try recall: ${s.firstTry}/${s.questions.length}${lv.n>old.n?` · Level up to ${lv.n}: ${lv.name}`:''}</p><button class="button block" onclick="checkpointSession=null;state.tab='paths';save();render()">Return to Paths</button></section></main>`;
}

renderPaths=function(){
  const paths=['Bahamian','Caribbean','World','American'];
  shell(`<h2 class="section-title">Learning paths</h2><p class="muted">Every lesson ends with retrieval. Completing all four lessons unlocks a mixed Chapter Challenge.</p><div class="path-grid">${paths.map(p=>{const n=completedCount(p),total=LESSONS.filter(l=>l.path===p).length,cp=state.checkpoints[p];return `<article class="card path-card"><div class="eyebrow">${p==='Bahamian'?'Priority path':'History path'}</div><h3>${p}</h3><div class="progress"><span style="width:${n/total*100}%"></span></div><p class="muted">${n} of ${total} lessons complete</p><div class="checkpoint-status ${cp?.completed?'complete':''}">${cp?.completed?`✓ ${checkpointBadges[p]} earned`:n===total?'Chapter Challenge unlocked':`${total-n} lessons to challenge`}</div>${n===total?`<button class="button secondary" onclick="startCheckpoint('${p}')">${cp?.completed?'Replay challenge':'Start challenge'}</button>`:''}</article>`}).join('')}</div>${paths.map(p=>`<h2 class="section-title">${p}</h2><div class="lesson-list">${LESSONS.filter(l=>l.path===p).map((l,i)=>{const m=state.mastery[l.id];return `<div class="lesson-row"><div class="node">${state.completed[l.id]?'✓':i+1}</div><div><strong>${l.title}</strong><div class="muted">${l.era} · ${l.minutes} min${m?` · best recall ${Math.round(m.bestFirstTry/l.quiz.length*100)}%`:''}</div></div><button class="button secondary" onclick="startLesson('${l.id}')">${state.completed[l.id]?'Replay':'Open'}</button></div>`}).join('')}</div>`).join('')}`,'paths');
};

renderProfile=function(){
  const lv=levelInfo();
  shell(`<h2 class="section-title">Profile and mastery</h2><article class="card"><div class="level-head"><div><div class="eyebrow">Level ${lv.n}</div><h3>${lv.name}</h3></div><strong>${state.xp} XP</strong></div><div class="progress"><span style="width:${lv.progress}%"></span></div><p class="muted">Best answer streak: ${state.bestStreak} · Lessons mastered: ${Object.keys(state.completed).length}/${LESSONS.length}</p></article><article class="card"><div class="eyebrow">Badges</div><div class="badge-grid">${state.badges.length?state.badges.map(b=>`<span class="badge-chip">★ ${esc(b)}</span>`).join(''):'<span class="muted">Complete a full history path and its Chapter Challenge to earn your first badge.</span>'}</div></article><article class="card"><label class="form-row">Name<input value="${esc(state.name)}" onchange="state.name=this.value;save()"></label><label class="form-row">Daily goal<select onchange="state.goal=+this.value;save()">${[5,8,10].map(x=>`<option ${state.goal===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="form-row">Text size<input type="range" min="15" max="22" value="${state.settings.text}" oninput="state.settings.text=+this.value;save();render()"></label><label><input type="checkbox" ${state.settings.reduced?'checked':''} onchange="state.settings.reduced=this.checked;save()"> Reduced motion</label></article><article class="card"><div class="eyebrow">Memory and data</div><p class="muted">Progress, mastery, levels, badges, quiz history, and review scheduling stay on this device in browser storage.</p><button class="button secondary" onclick="exportData()">Export progress</button> <button class="button secondary" onclick="document.getElementById('import').click()">Import</button><input id="import" type="file" hidden accept="application/json" onchange="importData(this.files[0])"><button class="button secondary" onclick="resetData()">Reset</button></article><article class="card"><div class="eyebrow">Learning method</div><p>Chronicle uses retrieval practice, retry-to-correct feedback, spacing, interleaving, dual coding, generation, explanatory feedback, and teach-back. Wrong answers are treated as useful retrieval attempts, not failures.</p></article>`,'profile');
};

// Re-render once so the upgraded header and mastery UI appear immediately.
render();