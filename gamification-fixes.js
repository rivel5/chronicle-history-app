// State migration and replay-safety for Chronicle gamification.
function ensureMasteryState(){
  state.mastery=state.mastery||{};
  state.checkpoints=state.checkpoints||{};
  state.correctStreak=Number(state.correctStreak)||0;
  state.bestStreak=Number(state.bestStreak)||0;
  state.badges=Array.isArray(state.badges)?state.badges:[];
  state.attempts=state.attempts||{};
  state.completed=state.completed||{};
  state.reviews=Array.isArray(state.reviews)?state.reviews:[];
  save();
}
ensureMasteryState();

const originalImportData=importData;
importData=function(file){
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      state={...defaultState,...JSON.parse(r.result)};
      ensureMasteryState();
      render();
    }catch{alert('That file is not valid Chronicle progress.')}
  };
  r.readAsText(file);
};

resetData=function(){
  if(confirm('Erase all Chronicle progress, levels, badges, and review history on this device?')){
    localStorage.removeItem(KEY);
    state={...defaultState};
    ensureMasteryState();
    render();
  }
};

// Prevent repeatedly farming full milestone XP while still making replay useful.
const baseNextCheckpoint=nextCheckpoint;
nextCheckpoint=function(){
  const s=checkpointSession;
  if(s.q<s.questions.length-1){s.tries=0;s.q++;drawCheckpoint();return;}
  const previous=state.checkpoints[s.path]?.completed;
  const old=levelInfo(state.xp);
  const reward=(previous?15:75)+s.bonus;
  state.xp+=reward;
  const badge=checkpointBadges[s.path];
  const oldBest=state.checkpoints[s.path]?.bestFirstTry||0;
  state.checkpoints[s.path]={completed:true,date:today(),firstTry:s.firstTry,bestFirstTry:Math.max(oldBest,s.firstTry),total:s.questions.length,replays:(state.checkpoints[s.path]?.replays||0)+(previous?1:0)};
  if(!state.badges.includes(badge))state.badges.push(badge);
  save();
  const lv=levelInfo(state.xp);confettiBurst(true);
  document.getElementById('app').innerHTML=`<main class="app"><section class="card story reward-screen"><div class="eyebrow">${previous?'Challenge replay complete':'Chapter mastered'}</div><h2>${badge}</h2><p>You ${previous?'replayed':'completed'} the ${s.path} checkpoint and earned <strong>${reward} XP</strong>.</p><div class="badge-medallion">★</div><p class="muted">First-try recall: ${s.firstTry}/${s.questions.length} · Best: ${state.checkpoints[s.path].bestFirstTry}/${s.questions.length}${lv.n>old.n?` · Level up to ${lv.n}: ${lv.name}`:''}</p><button class="button block" onclick="checkpointSession=null;state.tab='paths';save();render()">Return to Paths</button></section></main>`;
};
