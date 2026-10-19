// ══════════════════════════════════════════════════════
//  FEEDBACK SYSTEM
// ══════════════════════════════════════════════════════
let fbStars=0;

function setStars(n){
  fbStars=n;
  document.querySelectorAll('.fb-star').forEach((s,i)=>{
    s.textContent=i<n?'★':'☆'; s.classList.toggle('lit',i<n);
  });
}

function openFeedback(){
  renderFbList();
  document.getElementById('feedback-overlay').style.display='flex';
}
function closeFeedback(){ document.getElementById('feedback-overlay').style.display='none'; }

function submitFeedback(){
  const pseudo=document.getElementById('fb-pseudo').value.trim()||'Anonyme';
  const comment=document.getElementById('fb-comment').value.trim();
  if(!comment&&!fbStars){ document.getElementById('fb-status').textContent='⚠️ Ajoutez une note ou un commentaire.'; return; }
  const entry={
    id:Date.now(), ts:new Date().toISOString(), pseudo, stars:fbStars, comment,
    gameStats: G ? {
      turns: G._turnN||0,
      winner: G.winner!==null?F_NAME[G.winner]:null,
      scores: G.scores(),
      players: G.factions.map(f=>({name:f.name,isAI:f.isAI,bats:f.batPlaced}))
    } : null
  };
  const all=getFeedbacks(); all.push(entry); saveFeedbacks(all);
  document.getElementById('fb-status').innerHTML='<span style="color:var(--green)">✓ Retour enregistré — merci !</span>';
  document.getElementById('fb-comment').value=''; setStars(0);
  setTimeout(()=>{ document.getElementById('fb-status').textContent=''; renderFbList(); },1200);
}

function getFeedbacks(){ try{ return JSON.parse(localStorage.getItem('bdt_feedbacks')||'[]'); }catch(e){ return []; } }
function saveFeedbacks(arr){ localStorage.setItem('bdt_feedbacks',JSON.stringify(arr)); }

function renderFbList(){
  const all=getFeedbacks().reverse(); const wrap=document.getElementById('fb-list');
  if(!all.length){ wrap.innerHTML='<div style="color:var(--dim);font-size:0.85rem;font-style:italic">Aucun retour pour l\'instant.</div>'; return; }
  wrap.innerHTML=all.slice(0,12).map(e=>`
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(200,150,12,0.15);border-radius:7px;padding:0.5rem 0.75rem;">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:2px">
        <span style="font-family:var(--font-ui);font-size:0.8rem;color:var(--brun-xcl)">${e.pseudo}</span>
        <span style="color:var(--or);font-size:0.9rem">${'★'.repeat(e.stars||0)}${'☆'.repeat(5-(e.stars||0))}</span>
        <span style="font-size:0.7rem;color:var(--dim);margin-left:auto">${new Date(e.ts).toLocaleDateString('fr-FR')}</span>
      </div>
      ${e.comment?`<div style="font-size:0.85rem;color:var(--text);opacity:0.8">${e.comment}</div>`:''}
    </div>`).join('');
}

function exportFeedbacks(){
  const all=getFeedbacks();
  if(!all.length){ document.getElementById('fb-status').innerHTML='<span style="color:var(--dim)">Aucun retour à exporter.</span>'; return; }
  const blob=new Blob([JSON.stringify(all,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`feedbacks_traditions_${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════
//  SURVEY SYSTEM
// ══════════════════════════════════════════════════════
const SURVEY_PAGES = [
  {
    section:"🎮 Expérience générale",
    questions:[
      {id:'overall_fun',type:'likert',label:"La partie était amusante",scale:5,labels:["Pas du tout","Beaucoup"]},
      {id:'overall_diff',type:'likert',label:"Le jeu est bien équilibré (trop facile / trop dur / équilibré)",scale:5,labels:["Trop facile","Trop difficile"]},
      {id:'overall_dur',type:'radio',label:"La durée d'une partie vous a semblé :",options:["Trop courte","Correcte","Un peu longue","Trop longue"]},
      {id:'overall_again',type:'radio',label:"Joueriez-vous à nouveau ?",options:["Oui, volontiers !","Peut-être","Probablement pas","Non"]},
    ]
  },
  {
    section:"🧠 Règles & Complexité",
    questions:[
      {id:'rules_clear',type:'likert',label:"Les règles de placement sont claires",scale:5,labels:["Confuses","Très claires"]},
      {id:'rules_bats',type:'likert',label:"La règle d'ordre des bâtiments est bien comprise",scale:5,labels:["Confuse","Évidente"]},
      {id:'rules_events',type:'likert',label:"Les événements (cartes au dessus) enrichissent la partie",scale:5,labels:["Inutiles","Indispensables"]},
      {id:'rules_complex',type:'radio',label:"La complexité globale vous semble :",options:["Trop simple","Juste bien","Un peu complexe","Trop complexe"]},
    ]
  },
  {
    section:"⚔️ Stratégie & Mécanique",
    questions:[
      {id:'strat_choices',type:'likert',label:"Vous avez eu des choix intéressants à chaque tour",scale:5,labels:["Jamais","Toujours"]},
      {id:'strat_powers',type:'likert',label:"Les cartes pouvoir sont amusantes à utiliser",scale:5,labels:["Inutiles","Très fun"]},
      {id:'strat_ai',type:'likert',label:"L'IA est suffisamment challenge",scale:5,labels:["Trop facile","Trop dure"]},
      {id:'best_mechanic',type:'radio',label:"Votre mécanique préférée :",options:["Les bâtiments","Les pouvoirs","Les événements","La gestion de pile","Le recouvrement"]},
    ]
  },
  {
    section:"🎨 Présentation & Interface",
    questions:[
      {id:'ui_clarity',type:'likert',label:"L'interface est lisible et agréable",scale:5,labels:["Confuse","Parfaite"]},
      {id:'ui_board',type:'likert',label:"Le plateau hexagonal est visuellement clair",scale:5,labels:["Illisible","Superbe"]},
      {id:'ui_theme',type:'radio',label:"Le thème de La Guerre de la Baguette vous plaît ?",options:["Beaucoup","Assez","Peu","Pas du tout"]},
      {id:'best_faction',type:'radio',label:"Quelle faction avez-vous préférée (visuellement ou mécaniquement) ?",options:["🥐 Boulangers","🍷 Vignerons","🎨 Artistes","🧀 Fromagers","Aucune préférence"]},
    ]
  },
  {
    section:"💡 Suggestions",
    questions:[
      {id:'open_bug',type:'textarea',label:"Avez-vous rencontré des bugs ou comportements étranges ?",placeholder:"Décrivez ce qui s'est passé…"},
      {id:'open_improve',type:'textarea',label:"Qu'aimeriez-vous améliorer ou ajouter ?",placeholder:"Nouvelles règles, factions, événements, interface…"},
      {id:'open_free',type:'textarea',label:"Un commentaire libre sur votre expérience ?",placeholder:"Ce que vous avez aimé, moins aimé, ce qui vous a surpris…"},
    ]
  }
];

let surveyPage=0, surveyAnswers={}, surveyTimerInt=null, surveySecondsLeft=0;

function launchSurvey(){
  surveyPage=0; surveyAnswers={};
  document.getElementById('victory-overlay').classList.remove('active');
  document.getElementById('survey-overlay').style.display='flex';
  startSurveyTimer(190); renderSurveyPage();
}

function skipSurvey(){
  clearInterval(surveyTimerInt);
  document.getElementById('survey-overlay').style.display='none';
  document.getElementById('screen-menu').style.display='flex';
  G=null;
}

function startSurveyTimer(seconds){
  surveySecondsLeft=seconds;
  clearInterval(surveyTimerInt);
  surveyTimerInt=setInterval(()=>{
    surveySecondsLeft--; const m=Math.floor(surveySecondsLeft/60), s=surveySecondsLeft%60;
    document.getElementById('survey-timer').textContent=`${m}:${String(s).padStart(2,'0')}`;
    if(surveySecondsLeft<=0){ clearInterval(surveyTimerInt); submitSurvey(); }
  },1000);
}

function renderSurveyPage(){
  const total=SURVEY_PAGES.length;
  const p=SURVEY_PAGES[surveyPage];
  document.getElementById('survey-progress').style.width=`${(surveyPage/total)*100}%`;
  document.getElementById('survey-page-lbl').textContent=`Page ${surveyPage+1} / ${total}`;
  document.getElementById('survey-prev').style.display=surveyPage>0?'block':'none';
  document.getElementById('survey-next').textContent=surveyPage===total-1?'Terminer ✓':'Suivant ▶';

  let html=`<div class="survey-section-title">${p.section}</div>`;
  for(const q of p.questions){
    html+=`<div class="survey-q">`;
    html+=`<div class="survey-q-label">${q.label}</div>`;
    if(q.type==='likert'){
      const cur=surveyAnswers[q.id]||0;
      html+=`<div class="likert">`;
      for(let i=1;i<=q.scale;i++)
        html+=`<button class="likert-btn${cur===i?' active':''}" onclick="setSurveyAnswer('${q.id}',${i},this.closest('.likert'))">${i}</button>`;
      html+=`</div><div class="likert-labels"><span>${q.labels[0]}</span><span>${q.labels[1]}</span></div>`;
    } else if(q.type==='radio'){
      html+=`<div class="survey-radio">`;
      for(const opt of q.options){
        const checked=surveyAnswers[q.id]===opt?'checked':'';
        html+=`<label><input type="radio" name="${q.id}" value="${opt}" ${checked} onchange="surveyAnswers['${q.id}']=this.value"> ${opt}</label>`;
      }
      html+=`</div>`;
    } else if(q.type==='textarea'){
      const val=surveyAnswers[q.id]||'';
      html+=`<textarea class="survey-textarea" placeholder="${q.placeholder||''}" oninput="surveyAnswers['${q.id}']=this.value">${val}</textarea>`;
    }
    html+=`</div>`;
  }
  document.getElementById('survey-content').innerHTML=html;
  document.getElementById('survey-content').scrollTop=0;
}

function setSurveyAnswer(id,val,container){
  surveyAnswers[id]=val;
  container.querySelectorAll('.likert-btn').forEach((b,i)=>b.classList.toggle('active',i+1===val));
}

function surveyNav(dir){
  const total=SURVEY_PAGES.length;
  if(dir===1&&surveyPage===total-1){ submitSurvey(); return; }
  surveyPage=Math.max(0,Math.min(total-1,surveyPage+dir));
  renderSurveyPage();
}

function submitSurvey(){
  clearInterval(surveyTimerInt);
  const entry={
    id:Date.now(), ts:new Date().toISOString(), type:'survey', answers:surveyAnswers,
    gameStats: G ? {
      turns:G._turnN||0, winner:G.winner!==null?F_NAME[G.winner]:null,
      scores:G.scores(), players:G.factions.map(f=>({name:f.name,isAI:f.isAI,bats:f.batPlaced}))
    } : null
  };
  const all=getFeedbacks(); all.push(entry); saveFeedbacks(all);
  // Show thank you
  document.getElementById('survey-content').innerHTML=`
    <div style="text-align:center;padding:2rem 1rem">
      <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
      <div style="font-family:var(--font-ui);font-size:1.3rem;color:var(--or);margin-bottom:0.5rem">Merci pour votre retour !</div>
      <div style="font-size:1rem;color:var(--dim)">Vos réponses ont été sauvegardées localement.<br>Le créateur peut les exporter via le bouton 💬 Retour.</div>
    </div>`;
  document.getElementById('survey-prev').style.display='none';
  document.getElementById('survey-next').style.display='none';
  document.getElementById('survey-timer').textContent='';
  setTimeout(()=>{ document.getElementById('survey-overlay').style.display='none'; showMenu(); },2200);
}


// ══════════════════════════════════════════════════════
//  RÈGLES & TUTORIEL
// ══════════════════════════════════════════════════════
let _rulesReturn = null; // where to go back after closing

function openRules(tab='tuto') {
  _rulesReturn = document.getElementById('screen-game').classList.contains('active') ? 'game' : 'menu';
  document.getElementById('rules-overlay').classList.add('active');
  switchRulesTab(tab);
}

function closeRules() {
  document.getElementById('rules-overlay').classList.remove('active');
}

function switchRulesTab(id) {
  // Update tabs
  document.querySelectorAll('.rules-tab').forEach(t => {
    const tabId = t.getAttribute('onclick').match(/'(\w+)'/)?.[1];
    t.classList.toggle('active', tabId === id);
  });
  // Update sections
  document.querySelectorAll('.rules-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('rules-' + id);
  if (sec) sec.classList.add('active');
  // Special init
  if (id === 'tuto') initTuto();
}

// ── TUTORIEL ───────────────────────────────────────────────
const TUTO_STEPS = [
  {title:"⬡ Bienvenue !", content:"<p><b>La Guerre de la Baguette</b> est un jeu de stratégie hexagonale pour 2 à 4 joueurs. Chaque clan tente de contrôler le territoire en posant des tuiles et construisant ses bâtiments.</p><p>Ce tutoriel vous guide à travers toutes les règles en quelques étapes.</p>"},
  {title:"⭐ Choisir un niveau", content:"<p>Avant la partie, choisissez un <b>niveau de complexité</b> dans le menu :</p><ul><li><b>Niveau 1 — Découverte :</b> pose + bâtiments + événements. Pas de passifs, pouvoirs, ni bonus. Idéal pour débuter.</li><li><b>Niveau 2 — Stratégique :</b> + cartes pouvoir et cases bonus sur le plateau.</li><li><b>Niveau 3 — Expert :</b> tout actif, passifs asymétriques de chaque clan.</li></ul><p>Commencez toujours par le niveau 1 avec de nouveaux joueurs.</p>"},
  {title:"🗺️ Choisir la carte", content:"<p>Après avoir configuré les joueurs, choisissez une <b>carte de jeu</b> parmi 8 cartes standard équilibrées (symétrie miroir parfaite), ou créez votre propre carte avec l'éditeur.</p><p>Les 8 cartes standard ont des <b>positions de cases bonus fixes</b> (niveaux 2 et 3) — équité garantie pour tous les joueurs.</p>"},
  {title:"⭐ Case de départ", content:"<p>En début de partie, chaque joueur choisit sa <b>case de départ</b> (étoile dorée) lors du draft. C'est là que vous devez poser votre première tuile.</p><p>Le premier joueur est tiré au hasard. L'ordre de jeu est ensuite <b>A → B → C → D → A…</b> classique, sans serpentin.</p>"},
  {title:"🎯 Poser une tuile", content:"<p>À votre tour, <b>sélectionnez une tuile</b> dans votre main (en bas de l'écran), puis <b>cliquez sur une case</b> du plateau pour la poser.</p><p>Les cases valides sont mises en surbrillance. Un message d'erreur apparaît si vous tentez un coup invalide.</p>"},
  {title:"🔗 Règle d'adjacence", content:"<p>Après votre premier placement, chaque tuile doit être posée <b>adjacente à l'une de vos tuiles déjà au sommet d'une pile</b>. Vous ne pouvez pas poser n'importe où !</p><p>Exception : l'événement Tir longue portée étend l'adjacence à 2 cases.</p>"},
  {title:"⚔️ Attaquer", content:"<p>Posez sur une case ennemie si votre tuile a une <b>valeur strictement supérieure</b> à celle du sommet ennemi. La case passe sous votre contrôle.</p><p><b>Règle du 1/10 :</b> jouer un 1 sur un sommet ennemi de valeur 10 détruit toute la pile — la case redevient vide !</p>"},
  {title:"📦 Piles", content:"<p>Une case peut accumuler jusqu'à <b>4 tuiles</b> empilées. Seule la tuile du sommet compte pour le contrôle et le combat. Vous ne pouvez pas vous empiler sur vos propres tuiles.</p><p>Les lacs 🌊 et montagnes ⛰️ sont <b>inaccessibles</b>. Les temples violets ⬡ sont <b>réservés exclusivement au B4</b>.</p>"},
  {title:"🏗 Bâtiments", content:"<p>Construisez dans l'ordre : <b>B1 → B2 → B3 → B4</b>. Pour débloquer le niveau N, le niveau N-1 doit avoir été posé par le passé et être encore visible sur le plateau.</p><p>Le B4 ne peut être posé que sur les <b>temples violets</b>. Il est <b>indestructible</b> et déclenche le <b>Dernier Tour</b> !</p>"},
  {title:"✦ Pouvoirs (Niv. 2 & 3)", content:"<p>En niveaux 2 et 3, chaque joueur reçoit <b>2 cartes pouvoir</b> tirées au hasard. Jouer un pouvoir est <b>gratuit</b> — vous pouvez aussi poser une tuile dans le même tour. Maximum 1 pouvoir par tour.</p><p>Exemples : Double meule (posez 2 tuiles), Pluie de pinceaux (retirez la tuile du dessus d'un ennemi), Rivière de vin (déplacez une de vos tuiles).</p>"},
  {title:"⭐ Cases bonus (Niv. 2 & 3)", content:"<p>En niveaux 2 et 3, <b>4 cases bonus</b> sont présentes sur le plateau (une par quadrant). Contrôlez-les pour bénéficier de leur effet : Arsenal (+1 d'attaque aux tuiles numériques), Citadelle (inattaquable), Carrefour (3pts), Bibliothèque (+1 carte), Entrepôt (pile max 5), Monument (+3pts fin).</p><p>Si un ennemi prend votre case bonus, vous perdez l'effet.</p>"},
  {title:"🎴 Événements", content:"<p>Une carte événement est active en permanence, renouvelée à chaque <b>tour complet</b> (chaque joueur joue une fois). Le deck de <b>28 cartes</b> contient 11 Calme plat (tours libres) et 17 événements variés.</p><p>La barre du haut affiche l'événement actif et les actions restantes avant le prochain renouvellement.</p>"},
  {title:"⭐ Scoring", content:"<p>Comptage final :</p><ul><li><b>Prairie :</b> 1 pt par case contrôlée</li><li><b>Village :</b> 3 pts (bord doré sur le plateau)</li><li><b>Temple :</b> 1 pt (son intérêt = accès au B4)</li><li><b>Bâtiments :</b> +1/+2/+3/+4 pts selon le niveau</li><li><b>Cases bonus :</b> Monument = +3 pts fin de partie</li></ul><p>Le joueur qui pose le B4 déclenche le Dernier Tour : chaque adversaire rejoue une fois, puis on compte.</p>"},
];

const DEMOS = {
  intro: () => `
    <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;justify-content:center;padding:0.5rem 0">
      ${['🥐 Boulangers','🍷 Vignerons','🎨 Artistes','🧀 Fromagers'].map((f,i)=>`
        <div style="text-align:center;padding:0.6rem 1rem;border-radius:8px;border:2px solid ${['#f5c87a','#c0394a','#5c9bd6','#d4c870'][i]};background:${['#5a3d0a','#3a0a10','#0e2a45','#1e232c'][i]}22">
          <div style="font-size:1.6rem">${f.split(' ')[0]}</div>
          <div style="font-family:var(--font-ui);font-size:0.7rem;color:${['#f5c87a','#c0394a','#5c9bd6','#d4c870'][i]};margin-top:3px">${f.split(' ')[1]}</div>
        </div>`).join('')}
    </div>`,

  hand: () => `
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:0.3rem 0">
      ${[['7','num'],['🌿','bat'],['3','num'],['✦P3','pow'],['10','num']].map(([v,t])=>`
        <div style="width:54px;height:72px;border-radius:7px;border:2px solid ${t==='pow'?'#c084fc':t==='bat'?'#5a8a5a':'#f5c87a'};
          background:${t==='pow'?'linear-gradient(160deg,#4a2080,#1a0830)':t==='bat'?'linear-gradient(160deg,#2a2040,#1a1028)':'linear-gradient(160deg,#14181e,#0c0e12)'};
          display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px">
          ${t==='pow'?`<div style="font-size:0.55rem;color:#c084fc;font-family:var(--font-ui)">POUVOIR</div><div style="font-size:1rem">✦</div>`:`<div style="font-size:0.85rem">🥐</div><div style="font-family:var(--font-ui);font-weight:900;font-size:${t==='bat'?'0.7':'1.1'}rem;color:${t==='bat'?'#5a8a5a':'#f5c87a'}">${v}</div>`}
        </div>`).join('')}
    </div>
    <div style="text-align:center;font-size:0.75rem;color:var(--dim);margin-top:4px">Main de 5 cartes — tuile num., bâtiment, pouvoir (survolez ✦ pour voir le détail)</div>`,

  first: () => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <div class="mini-board">
        ${[0,1,2].map(row=>`<div class="mini-row${row===1?' offset':''}">
          ${[0,1,2,3].slice(0,row===1?3:4-(row===0?0:1)).map(col=>{
            const active = row===1&&col===1;
            return `<div class="mini-hex ${active?'target f0':'empty'}">${active?'7':''}</div>`;
          }).join('')}
        </div>`).join('')}
      </div>
      <div style="font-size:0.8rem;color:var(--dim)">Premier tour : posez partout (ici case centrale, val.7)</div>
    </div>`,

  adj: () => {
    const cells = [
      [0,0,'empty',''],[0,1,'f0','7'],[0,2,'empty',''],[0,3,'empty',''],
      [1,0,'empty',''],[1,1,'glow',''],[1,2,'glow',''],[1,3,'empty',''],
      [2,0,'empty',''],[2,1,'glow',''],[2,2,'empty',''],[2,3,'empty',''],
    ];
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div class="mini-board">
        ${[0,1,2].map(r=>`<div class="mini-row${r===1?' offset':''}">
          ${cells.filter(c=>c[0]===r).map(([,, cls,v])=>`<div class="mini-hex ${cls}">${v||''}</div>`).join('')}
        </div>`).join('')}
      </div>
      <div style="font-size:0.8rem;color:var(--dim)">🟡 Votre tuile · <span style="color:#52b788">✦ Cases adjacentes jouables</span></div>
    </div>`;
  },

  attack: () => `
    <div style="display:flex;gap:1.5rem;align-items:center;justify-content:center;flex-wrap:wrap">
      <div style="text-align:center">
        <div style="display:flex;gap:4px;margin-bottom:6px">
          <div class="mini-hex f1" style="width:50px;height:50px;font-size:0.8rem">5</div>
          <div style="display:flex;align-items:center;font-size:1.4rem;color:var(--or)">→</div>
          <div class="mini-hex f0 target" style="width:50px;height:50px;font-size:0.8rem">10</div>
        </div>
        <div style="font-size:0.75rem;color:#52b788">✓ 10 > 5 : attaque réussie</div>
      </div>
      <div style="text-align:center">
        <div style="display:flex;gap:4px;margin-bottom:6px">
          <div class="mini-hex f1" style="width:50px;height:50px;font-size:0.8rem">4</div>
          <div style="display:flex;align-items:center;font-size:1.4rem;color:#e84040">→</div>
          <div class="mini-hex f0" style="width:50px;height:50px;font-size:0.8rem;opacity:0.6">7</div>
        </div>
        <div style="font-size:0.75rem;color:#e84040">✗ 4 < 7 : refusé</div>
      </div>
    </div>`,

  bat: () => `
    <div style="display:flex;gap:0.5rem;align-items:center;justify-content:center;flex-wrap:wrap;padding:0.2rem 0">
      ${[['🫓','Niv.1','✅','#52b788'],['🥐','Niv.2','✅','#52b788'],['🥖','Niv.3','⏳','var(--or)'],['🏪','Niv.4','🔒','#555']].map(([ico,lvl,st,clr])=>`
        <div style="text-align:center;width:70px">
          <div style="font-size:1.4rem">${ico}</div>
          <div style="font-family:var(--font-ui);font-size:0.65rem;color:${clr}">${lvl}</div>
          <div style="font-size:0.85rem;margin-top:2px">${st}</div>
        </div>
        ${lvl!=='Niv.4'?'<div style="color:var(--or);font-size:1.2rem;margin-top:8px">→</div>':''}`).join('')}
    </div>
    <div style="font-size:0.78rem;color:var(--dim);text-align:center;margin-top:6px">Ordre obligatoire — ici Niv.3 disponible, Niv.4 verrouillé</div>`,

  power: () => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
      ${[['🥖','🥖','Baguette ×2','Détruit une case ennemie définitivement','#c84040'],
         ['🧀','🧀','Fromage ×2','Bloque une case vide définitivement','#596477'],
         ['🖌️','🖌️','Pinceau ×2','Retire la tuile du dessus d\'un ennemi','#5c9bd6'],
         ['🥐','🥐','Croissant','Pioche 3 cartes immédiatement','#6b778d']].map(([ref,ico,nom,desc,clr])=>`
        <div style="background:rgba(255,255,255,0.03);border:1px solid ${clr}44;border-radius:7px;padding:0.6rem">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <span style="font-family:var(--font-ui);font-size:0.7rem;font-weight:700;color:${clr}">${ref}</span>
            <span style="font-size:0.9rem">${ico}</span>
            <span style="font-family:var(--font-ui);font-size:0.72rem;color:${clr}">${nom}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--dim)">${desc}</div>
        </div>`).join('')}
    </div>`,

  event: () => `
    <div style="background:#050607;border:1px solid rgba(200,150,12,0.3);border-radius:8px;padding:0.8rem">
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:0.6rem">
        <div style="font-size:2rem;flex-shrink:0">🎯</div>
        <div>
          <div style="font-family:var(--font-ui);font-size:0.9rem;color:var(--or)">Sniper — Pose libre partout</div>
          <div style="font-size:0.85rem;color:var(--text);margin-top:2px">Chaque joueur peut poser sans obligation d'adjacence.</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;background:rgba(200,150,12,0.08);border-radius:6px;padding:0.4rem 0.6rem">
        <span style="font-size:0.85rem">❶</span>
        <span style="font-size:0.8rem;color:var(--brun-xcl)">encore <b>5 actions</b> restantes — visible dans la barre du haut</span>
      </div>
    </div>`,

  pass: () => `
    <div style="display:flex;align-items:center;justify-content:center;gap:1rem;flex-wrap:wrap">
      <div style="text-align:center">
        <div style="font-size:0.9rem;color:var(--dim);margin-bottom:6px">Cartes en main</div>
        <div style="display:flex;gap:4px">
          ${['3','2','1','🏗','5'].map(v=>`<div style="width:28px;height:38px;border-radius:4px;border:1px solid #5a3d0a;background:#14181e;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#f5c87a">${v}</div>`).join('')}
        </div>
      </div>
      <div style="font-size:1.5rem;color:var(--or)">⏭</div>
      <div style="text-align:center">
        <div style="font-size:0.9rem;color:var(--dim);margin-bottom:6px">Nouvelles cartes</div>
        <div style="display:flex;gap:4px">
          ${['?','?','?','?','?'].map(v=>`<div style="width:28px;height:38px;border-radius:4px;border:1px solid #5a3d0a;background:#14181e;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#464e5c">${v}</div>`).join('')}
        </div>
      </div>
    </div>
    <div style="font-size:0.78rem;color:var(--dim);text-align:center;margin-top:6px">Toutes les cartes retournent dans le deck — 5 nouvelles piochées</div>`,

  scoring: () => `
    <div style="display:flex;gap:8px;flex-direction:column;padding:0.3rem 0">
      <div style="display:flex;gap:6px;align-items:center">
        <div style="width:36px;height:36px;border-radius:4px;border:2.5px solid rgba(200,150,12,0.8);background:rgba(200,150,12,0.08);display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#C8960C;font-family:var(--font-ui)">3pts</div>
        <span style="font-size:0.8rem;color:var(--text)">Cases centrales — anneau doré épais — <b>3 pts</b> chacune</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <div style="width:36px;height:36px;border-radius:4px;border:1.5px solid rgba(200,150,12,0.35);background:rgba(200,150,12,0.04);display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#566072;font-family:var(--font-ui)">2pts</div>
        <span style="font-size:0.8rem;color:var(--text)">Anneau intermédiaire — anneau doré léger — <b>2 pts</b></span>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <div style="width:36px;height:36px;border-radius:4px;border:1px solid #1a1f28;background:#29303d;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#464e5c;font-family:var(--font-ui)">1pt</div>
        <span style="font-size:0.8rem;color:var(--text)">Périphérie — case normale — <b>1 pt</b></span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
        ${[['🌾','Grenier','#647084'],['🏰','Citadelle','#8060c0'],['📖','Biblio.','#6080c0']].map(([ico,n,col])=>`
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid ${col};border-radius:6px;padding:4px 6px;background:${col}18;min-width:52px">
            <span style="font-size:1.1rem">${ico}</span>
            <span style="font-size:0.6rem;color:${col};font-family:var(--font-ui)">${n}</span>
          </div>`).join('')}
        <span style="font-size:0.75rem;color:var(--dim);margin-left:4px">← exemples de cases bonus tirées au hasard</span>
      </div>
    </div>`,

  victory: () => `
    <div style="display:flex;gap:1rem;align-items:center;justify-content:center;flex-wrap:wrap">
      <div style="text-align:center;padding:0.8rem 1.2rem;background:linear-gradient(135deg,#5a3d0a,#3a2005);border:2px solid #f5c87a;border-radius:10px">
        <div style="font-size:2rem">🏪</div>
        <div style="font-family:var(--font-ui);font-size:0.75rem;color:#f5c87a;margin-top:4px">Boulangerie posée !</div>
        <div style="font-size:0.7rem;color:var(--or);margin-top:2px">👑 DERNIER TOUR + SCORE</div>
      </div>
      <div style="font-size:1.2rem;color:var(--dim)">ou</div>
      <div style="text-align:center;padding:0.8rem 1.2rem;background:rgba(255,255,255,0.03);border:1px solid rgba(200,150,12,0.3);border-radius:10px">
        <div style="font-size:2rem">⬡</div>
        <div style="font-family:var(--font-ui);font-size:0.75rem;color:var(--brun-xcl);margin-top:4px">Decks épuisés</div>
        <div style="font-size:0.7rem;color:var(--dim);margin-top:2px">→ Victoire aux points</div>
      </div>
    </div>`,
};

let tutoStep = 0;

function initTuto() {
  tutoStep = 0;
  renderTutoStep();
}

function renderTutoStep() {
  const total = TUTO_STEPS.length;
  const step = TUTO_STEPS[tutoStep];

  // Dots
  const dots = document.getElementById('tuto-dots');
  if (dots) dots.innerHTML = TUTO_STEPS.map((_, i) =>
    `<div class="tuto-dot ${i < tutoStep ? 'done' : i === tutoStep ? 'active' : ''}" onclick="jumpTuto(${i})"></div>`
  ).join('');

  // Prev/Next buttons
  const prev = document.getElementById('tuto-prev');
  const next = document.getElementById('tuto-next');
  if (prev) prev.style.visibility = tutoStep === 0 ? 'hidden' : 'visible';
  if (next) next.textContent = tutoStep === total - 1 ? '✓ Terminé' : 'Suivant ▶';

  // Content
  const demoFn = DEMOS[step.demo];
  const demoHTML = demoFn ? demoFn() : '';

  const container = document.getElementById('tuto-steps-container');
  if (!container) return;
  container.innerHTML = `
    <div class="tuto-step active">
      <div class="tuto-scene">
        <div style="display:flex;align-items:flex-start;gap:0.9rem">
          <div style="font-size:2.4rem;flex-shrink:0;line-height:1">${step.icon}</div>
          <div style="flex:1">
            <div class="tuto-title">${step.title}</div>
            <div class="tuto-text">${step.text}</div>
          </div>
        </div>
        ${demoHTML ? `<div style="margin-top:0.9rem;border-top:1px solid rgba(200,150,12,0.15);padding-top:0.9rem">${demoHTML}</div>` : ''}
      </div>
      ${step.extra ? `<div class="tuto-highlight">💡 ${step.extra}</div>` : ''}
    </div>
    <div style="text-align:right;font-size:0.75rem;color:var(--dim);margin-top:0.2rem">${tutoStep + 1} / ${total}</div>
  `;
}

function tutoNav(dir) {
  const total = TUTO_STEPS.length;
  if (dir === 1 && tutoStep === total - 1) { closeRules(); return; }
  tutoStep = Math.max(0, Math.min(total - 1, tutoStep + dir));
  renderTutoStep();
}

function jumpTuto(i) { tutoStep = i; renderTutoStep(); }

// Patch showVictory to propose survey
const _origShowVictory = showVictory;
window.showVictory = function(){
  _origShowVictory();
  // Add survey button to victory card
  const vc=document.querySelector('.victory-card');
  if(vc&&!vc.querySelector('#btn-survey')){
    const btn=document.createElement('button');
    btn.id='btn-survey';
    btn.className='btn-restart';
    btn.style.cssText='background:transparent;border:1px solid var(--or);color:var(--or);margin-left:0.5rem';
    btn.textContent='📋 Donner mon avis (3 min)';
    btn.onclick=launchSurvey;
    vc.querySelector('.btn-restart').insertAdjacentElement('afterend',btn);
  }
};
