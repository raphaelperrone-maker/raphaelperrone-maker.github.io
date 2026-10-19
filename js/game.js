// ═══════════════════════════════════════════════════════════════════
//  CONSTANTES & CONFIG
// ═══════════════════════════════════════════════════════════════════
// ── 8 types de cases bonus (3 placées aléatoirement par partie)
const BONUS_CELL_TYPES = [
  {id:'arsenal',   ico:'⚔️',name:'Arsenal',           color:'#c04040',desc:"Toutes vos tuiles attaquent avec +1 en valeur.",effect:'all_boost'},
  {id:'citadelle', ico:'🏰',name:'Citadelle',         color:'#8060c0',desc:"Vos tuiles sur cette case sont inattaquables.",effect:'shield'},
  {id:'carrefour', ico:'🗺️',name:'Carrefour',         color:'#40a0c0',desc:"Cette case vaut 3 pts au lieu de 1.",         effect:'triple_pts'},
  {id:'biblio',    ico:'📖',name:'Bibliothèque',      color:'#6080c0',desc:"Main maximale +1 tant que vous la contrôlez (Vignerons : 7 cartes, autres : 6).",effect:'hand_max'},
  {id:'entrepot',  ico:'📦',name:'Entrepôt',          color:'#535c6d',desc:"Votre pile max passe à 5 partout.",           effect:'stack_bonus'},
  {id:'monument',  ico:'⭐',name:'Monument',          color:'#c0a000',desc:"+3 pts bonus à la fin de partie.",            effect:'end_bonus'},
];


// ═══════════════════════════════════════════════════════════════════
//  TRAITS ASYMÉTRIQUES PAR CLAN (v1.06)
// ═══════════════════════════════════════════════════════════════════
// Profil complet de chaque faction : bonus passif + distribution de tuiles
const CLAN_TRAITS = [
  { // 0 — 🥐 Boulangers · Défensif · résilient
    passif:      'defBoost',
    passifLabel: 'Défense +1',
    passifDesc:  'Les tuiles 6 à 10 des Boulangers résistent avec +1 en défense. Une tuile 7 exige un 9 pour être prise. Les tuiles 1-5 restent vulnérables normalement.',
    passifIco:   '🛡️',
    dist: [4,4,3,3,2,2,3,3,3,3]  // solide en early (1-4) et late (7-10), un peu moins de milieu
  },
  { // 1 — 🍷 Vignerons · Flexible · opportuniste
    passif:      'hand6',
    passifLabel: 'Main de 6 cartes',
    passifDesc:  "Les Vignerons ont toujours 6 cartes en main (au lieu de 5). Plus d'options à chaque tour, jamais bloqués.",
    passifIco:   '🃏',
    dist: [2,2,3,3,4,4,4,4,2,2]  // milieu de gamme renforcé, très réactif
  },
  { // 2 — 🎨 Artistes · Offensif · agressif
    passif:      'equalAttack',
    passifLabel: 'Attaque à égalité',
    passifDesc:  "Avec les tuiles 1 à 5, les Artistes peuvent couvrir une tuile ennemie de même valeur (au lieu de strictement supérieure). Sur les tuiles 6+, la règle normale s'applique.",
    passifIco:   '⚔️',
    dist: [1,2,3,3,3,3,4,4,4,3]  // forte en 7-9, equalAttack exploite les 1-5 — légèrement moins de 3
  },
  { // 3 — 🧀 Fromagers · Progressif · bâtiments
    passif:      'batBoost',
    passifDesc:  'Les bâtiments Fromagers attaquent avec +1 en force (B1=5, B2=7, B3=9, B4=11). Progression redoutable.',
    passifLabel: 'Bâtiments +1',
    passifIco:   '🏗️',
    dist: [4,4,4,4,3,3,2,2,2,2]  // bonne présence early et milieu, bâtiments renforcés compensent le manque de hautes valeurs
  },
];

const GRID_SIZE = 10, MAX_STACK = 4, HAND_SIZE = 5, BONUS_N = 4;

// ── Tuiles modulaires double-face ──
// 4 quadrants : NW[0-4,0-4] NE[0-4,6-10] SW[6-10,0-4] SE[6-10,6-10]
// Chaque tuile a 2 faces (A/B). Terrains : lake=inaccessible, mount=inaccessible, village=2pts, start=départ
// Coordonnées locales [0-4, 0-4] → globales via offset du quadrant
const QUAD_OFFSETS = { NW:[0,0], NE:[0,5], SW:[5,0], SE:[5,5] };
// Grille 10×10 — quadrants 5×5
// Case départ fixe [2,2] local. Lacs jamais adjacents. Sanctuaires centraux fixes.
const START_LOCAL = [2,2];
// TILE_DEFS : quadrants 5×5, départ fixe [2,2], temples B4 variables par face
// special = position locale [row,col] du temple B4 dans ce quadrant
// Contraintes : jamais sur [2,2] (départ), jamais sur lac/mont/village
// Faces A et B donnent des temples à des positions différentes → objectifs variables selon la map
const TILE_DEFS = {
  NW: { // offset [0,0] — cases globales NW: rows 0-4, cols 0-4
    A:{ lakes:[[0,0],[2,4],[4,1]], mounts:[[1,2],[3,4]],
        villages:[[0,3],[1,4],[3,1],[4,3]], villageStyle:['church','house','hamlet','house'],
        special:[4,4] },  // global [4,4] — coin SE du quadrant, proche du centre
    B:{ lakes:[[0,4],[3,1],[4,3]], mounts:[[1,0],[2,3]],
        villages:[[0,1],[2,0],[3,4],[4,2]], villageStyle:['hamlet','house','church','house'],
        special:[3,3] }   // global [3,3]
  },
  NE: { // offset [0,5] — cases globales NE: rows 0-4, cols 5-9
    A:{ lakes:[[0,1],[2,3],[4,0]], mounts:[[1,4],[3,2]],
        villages:[[0,4],[1,1],[3,0],[4,4]], villageStyle:['house','church','hamlet','house'],
        special:[4,0] },  // global [4,5] — coin SW du quadrant NE
    B:{ lakes:[[0,3],[2,1],[4,4]], mounts:[[0,0],[3,3]],
        villages:[[1,0],[1,4],[3,2],[4,1]], villageStyle:['hamlet','house','house','church'],
        special:[3,1] }   // global [3,6]
  },
  SW: { // offset [5,0] — cases globales SW: rows 5-9, cols 0-4
    A:{ lakes:[[0,3],[2,0],[4,2]], mounts:[[1,4],[3,1]],
        villages:[[0,1],[1,3],[3,4],[4,0]], villageStyle:['house','hamlet','church','house'],
        special:[0,4] },  // global [5,4] — coin NE du quadrant SW
    B:{ lakes:[[0,1],[2,4],[4,0]], mounts:[[1,2],[3,3]],
        villages:[[0,4],[1,0],[3,2],[4,3]], villageStyle:['church','house','house','hamlet'],
        special:[1,3] }   // global [6,3]
  },
  SE: { // offset [5,5] — cases globales SE: rows 5-9, cols 5-9
    A:{ lakes:[[0,2],[2,4],[4,1]], mounts:[[1,0],[3,3]],
        villages:[[0,4],[1,2],[3,0],[4,3]], villageStyle:['hamlet','house','church','house'],
        special:[0,0] },  // global [5,5] — coin NW du quadrant SE
    B:{ lakes:[[0,0],[2,2],[4,4]], mounts:[[0,3],[3,1]],
        villages:[[0,2],[1,4],[3,3],[4,0]], villageStyle:['house','church','hamlet','house'],
        special:[2,1] }   // global [7,6] — évite le village, symétrique avec SW-B
  }
};
// 4 cases spéciales — croix autour du centre, équidistantes des starts [2,2][2,7][7,2][7,7]
// B4 uniquement posable ici
const CENTRAL_SANCTU = [[3,5],[5,3],[5,7],[7,5]];
function pickMapConfig(){
  const cfg={};
  for(const q of ['NW','NE','SW','SE']) cfg[q]=Math.random()<0.5?'A':'B';
  return cfg;
}
const HEX_R = 34;
const HEX_H = Math.round(HEX_R * Math.sqrt(3));
const PAD_X = HEX_R + 4, PAD_Y = Math.round(HEX_H / 2) + 4;

const F_COLOR = ['#f5c87a','#c0394a','#5c9bd6','#e8823a'];
const F_DARK  = ['#5a3d0a','#3a0a10','#0e2a45','#6b2e08'];
const F_NAME  = ['Boulangers','Vignerons','Artistes','Fromagers'];
const F_EMO   = ['🥐','🍷','🎨','🧀'];   // emoji : textes bruts (événements, infobulles)
const F_ICO   = [0,1,2,3].map(i=>iconSVG(CLAN_ICON_KEY[i],F_COLOR[i])); // icônes SVG : tout ce qui passe par innerHTML
const F_CSS   = ['--f0','--f1','--f2','--f3'];

const BAT_ORDER = ['B1','B2','B3','B4'];
const BAT_VAL   = {B1:4,B2:6,B3:8,B4:10};
const BAT_CLR   = {B1:'#5a8a5a',B2:'#3a6a9a',B3:'#8a5a2a',B4:'#8a2a6a'};
const BAT_LABEL = [
  {B1:'Fournil',B2:'Pâtisserie',B3:'Maison du Pain',B4:'Boulangerie'},
  {B1:'Vigne',B2:'Cave',B3:'Chai',B4:'Domaine'},
  {B1:'Atelier',B2:'Galerie',B3:'École des Arts',B4:'Musée'},
  {B1:'Fruitière',B2:'Affinoir',B3:'Cave à Fromage',B4:'Fromagerie'},
];
const BAT_KEY = {B1:'b1',B2:'b2',B3:'b3',B4:'b4'};
const BAT_ICO = [0,1,2,3].map(f=>({B1:iconSVG('b1',F_COLOR[f]),B2:iconSVG('b2',F_COLOR[f]),B3:iconSVG('b3',F_COLOR[f]),B4:iconSVG('b4',F_COLOR[f])}));

// ── Pool de 10 pouvoirs communs — chaque joueur en tire 2 au hasard au début
const POWER_POOL = [
  // Bombardement de baguette (×2)
  {id:'P_bomb_a',ico:'🥖',name:'Bombardement de baguette',desc:"Retire un bâtiment ennemi visible — la pile du dessous reste intacte.",color:'#8a2000',dark:'#300a00',target:'bat_enemy'},
  {id:'P_bomb_b',ico:'🥖',name:'Bombardement de baguette',desc:"Retire un bâtiment ennemi visible — la pile du dessous reste intacte.",color:'#8a2000',dark:'#300a00',target:'bat_enemy'},
  // Barricade de fromage (×2)
  {id:'P_bar_a',ico:'🧀',name:'Barricade de fromage',desc:"Une de vos cases devient inattaquable jusqu'à votre prochain tour — blindée façon comté !",color:'#a07010',dark:'#3a2600',target:'own_fortify'},
  {id:'P_bar_b',ico:'🧀',name:'Barricade de fromage',desc:"Une de vos cases devient inattaquable jusqu'à votre prochain tour — blindée façon comté !",color:'#a07010',dark:'#3a2600',target:'own_fortify'},
  // Pluie de pinceaux (×2)
  {id:'P_pin_a',ico:'🎨',name:'Pluie de pinceaux',desc:"Retire la tuile du dessus d'une pile ennemie — une œuvre d'art dévastatrice.",color:'#204090',dark:'#081430',target:'cell_enemy_top'},
  {id:'P_pin_b',ico:'🎨',name:'Pluie de pinceaux',desc:"Retire la tuile du dessus d'une pile ennemie — une œuvre d'art dévastatrice.",color:'#204090',dark:'#081430',target:'cell_enemy_top'},
  // Rivière de vin (×1)
  {id:'P5',ico:'🍷',name:'Rivière de vin',desc:"Déplace l'une de vos tuiles (non-bâtiment) vers une case adjacente vide — fluide comme un bon millésime.",color:'#6a1030',dark:'#280810',target:'own_tile'},
  // Tous pour le croissant (×1)
  {id:'P6',ico:'🥐',name:'Tous pour le croissant',desc:"Piochez immédiatement 3 cartes supplémentaires — la boulangerie ravitaille !",color:'#8a6010',dark:'#302000',target:'auto_rally'},
  {id:'P_DUMP',ico:'🗑️',name:'Jeter sa main',desc:"Défaussez toute votre main et repiochez autant de cartes. Rejouez immédiatement. (1×/partie)",color:'#6a3a6a',dark:'#2a102a',target:'auto_dump'},
  // Toile renforcée (×1)
  {id:'P7',ico:'🖼️',name:'Toile renforcée',desc:"Vos bâtiments sont inattaquables jusqu'à votre prochain tour — protégés par l'art.",color:'#403060',dark:'#100818',target:'auto_shield'},
  // Double meule (×1)
  {id:'P8',ico:'⚙️',name:'Double meule',desc:"Posez 2 tuiles numériques ce tour au lieu d'une seule — la meule tourne à plein régime !",color:'#602020',dark:'#200808',target:'auto_double'},
  // Inspiration (×1)
  {id:'P10',ico:'⭐',name:'Inspiration',desc:"Vos bâtiments gagnent +2 en valeur d'attaque ce tour — l'élan créatif des artisans.",color:'#806000',dark:'#281e00',target:'auto_inspire'},
];

const EVENT_CARDS = [
  {id:1,ico:'🛡️',name:'Trêve sacrée',desc:'Aucune attaque ni recouvrement ennemi.',key:'no_attack'},
  {id:2,ico:'🏚️',name:'Gel des chantiers',desc:'Aucun bâtiment ne peut être posé.',key:'no_bat'},
  {id:3,ico:'⚔️',name:'Frénésie guerrière',desc:'Chaque joueur DOIT attaquer ou passer.',key:'force_attack'},
  {id:4,ico:'🃏',name:'Main généreuse',desc:'Chaque joueur pioche 2 cartes supp.',key:'draw_bonus',param:2},
  {id:5,ico:'🗑️',name:'Défausse forcée',desc:'Chaque joueur perd sa plus petite tuile.',key:'discard_lowest'},
  {id:6,ico:'🔁',name:'Ordre inversé',desc:'L\'ordre de jeu est inversé.',key:'reverse_order'},
  // Blizzard retiré v1.21
  {id:21,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:22,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:23,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:24,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:25,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:8,ico:'🔥',name:'Incendie',desc:'Chaque joueur peut retirer 1 bâtiment ennemi visible ce tour.',key:'fire_bat'},
  // Sniper (pose libre) retiré v1.18
  {id:10,ico:'📦',name:'Cargaison',desc:'Pile max = 5 ce tour.',key:'max_stack_plus',param:1},
  {id:11,ico:'🕳️',name:'Gouffre',desc:'Pile max = 3 ce tour.',key:'max_stack_minus',param:-1},
  {id:12,ico:'🌊',name:'Marée montante',desc:'Les tuiles de valeur 1 ne peuvent pas être posées.',key:'only_no1'},
  {id:13,ico:'🏹',name:'Tir longue portée',desc:'Adjacence étendue à 2 cases.',key:'extended_adj'},
  {id:14,ico:'🎲',name:'Chaos total',desc:'Chaque joueur reçoit une carte ennemie.',key:'chaos_steal'},
  {id:15,ico:'🧲',name:'Attraction',desc:'Pose adjacent à n\'importe quel ennemi.',key:'adj_enemy'},
  {id:16,ico:'🌑',name:'Éclipse',desc:'Uniquement valeurs paires.',key:'only_even'},
  {id:17,ico:'☀️',name:'Solstice',desc:'Uniquement valeurs impaires.',key:'only_odd'},
  {id:18,ico:'🎁',name:'Abondance',desc:'Chaque joueur pioche 2 cartes supplémentaires.',key:'draw_bonus',param:2},
  {id:20,ico:'🌪️',name:'Tempête',desc:'Les tuiles de valeur 10 ne peuvent pas être posées.',key:'only_no10'},
  // +6 Calme plat ajoutés v1.23 — allonge les parties naturellement via turn limit
  {id:26,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:27,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:28,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:29,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:30,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
  {id:31,ico:'🌿',name:'Calme plat',desc:'Rien ne se passe — aucune règle spéciale.',key:'calme'},
];

// ═══════════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════════════
function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
}
function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function isPower(t){ return t && typeof t==='object' && t.id && t.id.startsWith('P'); }
function isBat(t)  { return typeof t==='string' && t.startsWith('B'); }
function tval(t)   { if(typeof t==='number') return t; return BAT_VAL[t]||0; }

function hexCenter(col, row){
  const x = PAD_X + col * HEX_R * 1.5;
  const y = PAD_Y + row * HEX_H + (col%2)*HEX_H/2;
  return [Math.round(x), Math.round(y)];
}
function hexPts(cx,cy,r){
  const pts=[];
  for(let i=0;i<6;i++) pts.push([cx+r*Math.cos(Math.PI/180*60*i), cy+r*Math.sin(Math.PI/180*60*i)]);
  return pts;
}
function neighbors(row,col){
  const dirs = col%2===0 ? [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1]]
                          : [[-1,0],[1,0],[0,-1],[0,1],[1,-1],[1,1]];
  return dirs.map(([dr,dc])=>[row+dr,col+dc])
             .filter(([r,c])=>r>=0&&r<GRID_SIZE&&c>=0&&c<GRID_SIZE);
}
function pixelToHex(px,py){
  let best=null, bd=Infinity;
  for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++){
    const [cx,cy]=hexCenter(c,r), d=(px-cx)**2+(py-cy)**2;
    if(d<bd){bd=d;best=[r,c];}
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════
//  FACTION
// ═══════════════════════════════════════════════════════════════════
class Faction {
  constructor(fid, isAI=false, assignedPowers=null){
    this.id=fid; this.name=F_NAME[fid]; this.color=F_COLOR[fid]; this.dark=F_DARK[fid];
    this.isAI=isAI;
    // 2 pouvoirs tirés au hasard depuis le pool commun (1 exemplaire chacun)
    this.myPowers = assignedPowers || [];
    // Deck asymétrique selon distribution clan + bâtiments + pouvoirs
    const dist = CLAN_TRAITS[fid].dist; // [nb_de_1, nb_de_2, ..., nb_de_10]
    const numTiles = dist.flatMap((n,i) => Array(n).fill(i+1));
    this.deck = [...numTiles,
                 ...BAT_ORDER.flatMap(b=>b==='B4'?[b]:[b,b,b]),
                 ...this.myPowers];
    shuffle(this.deck);
    this.hand=[]; this.drawFill();
    this.hasPlaced=false; this.batPlaced=[]; this.batOnBoard={};
    this.powUsedThisTurn=false;
    this.shielded=false; this.shieldTurns=0; // Forteresse P7
    this.doubleTurn=false;                   // Double meule P8
    this.inspireTurn=false;                  // Inspiration P10
  }
  handSize(g){
    let base=(CLAN_TRAITS[this.id].passif==='hand6'&&(g?g.gameLevel>=3:false))?HAND_SIZE+1:HAND_SIZE;
    if(g&&g.activeBonuses(this.id).has('hand_max')) base+=1; // Bibliothèque : +1 sur la main actuelle (Vignerons 7, autres 6)
    return base;
  }
  drawFill(g){
    if(this._noAutoDrawUntilMax){
      if(this.hand.filter(t=>!isPower(t)).length<=5) this._noAutoDrawUntilMax=false;
      else return;
    }
    while(this.hand.length<this.handSize(g)&&this.deck.length) this.hand.push(this.deck.pop());
  }
  drawOne(){ if(this.deck.length) this.hand.push(this.deck.pop()); }
  passAndRedraw(){
    const n=this.hand.length; this.deck.push(...this.hand); this.hand=[];
    shuffle(this.deck); this.drawFill(); return n;
  }
  tilesLeft(){ return this.deck.length+this.hand.length; }
  // Niveaux déjà "acquis" = niveau qu'on a posé et dont le suiv. a déjà été joué lui-même.
  // Règle : pour poser BatN, il faut que Bat(N-1) ait été posé ET soit encore visible (top d'une pile)
  // SAUF si Bat(N) lui-même (ou plus) a déjà été joué → le droit est acquis pour toujours.
  canPlayBat(bat, board=null){
    const i = BAT_ORDER.indexOf(bat);
    if(i === 0) return true;                       // Niv.1 toujours jouable
    const prev = BAT_ORDER[i-1];
    if(!this.batPlaced.includes(prev)) return false; // N-1 jamais posé
    // Si un bâtiment de niveau >= N a déjà été joué → droit acquis définitivement
    const higherDone = this.batPlaced.some(b => BAT_ORDER.indexOf(b) >= i);
    if(higherDone) return true;
    // Sinon : N-1 doit être visible (au sommet d'une pile quelconque) sur le plateau
    if(!board) return true; // sans plateau on accepte (cas legacy)
    for(let r=0;r<board.length;r++) for(let c=0;c<board[r].length;c++){
      const st=board[r][c];
      if(st.length){ const [tf,tt]=st[st.length-1]; if(tf===this.id && tt===prev) return true; }
    }
    return false; // N-1 enterré partout → bloqué
  }
}

// ═══════════════════════════════════════════════════════════════════
//  EVENT DECK
// ═══════════════════════════════════════════════════════════════════
class EvDeck {
  constructor(){ this.full=[...EVENT_CARDS]; this.deck=shuffle([...this.full]); this.current=null; }
  draw(){ if(!this.deck.length) this.deck=shuffle([...this.full]); this.current=this.deck.pop(); return this.current; }
}

// ═══════════════════════════════════════════════════════════════════
//  GAME
// ═══════════════════════════════════════════════════════════════════
class Game {
  constructor(factions, opts={}){
    this.gameLevel = opts.gameLevel || 1; // 1=découverte 2=stratégique 3=expert
    this.board=Array.from({length:GRID_SIZE},()=>Array.from({length:GRID_SIZE},()=>[]));
    this.factions=factions; this.np=factions.length;
    // Map fid→Faction pour accès par vrai identifiant de clan
    this.factionMap=new Map(factions.map(f=>[f.id,f]));
    this.cur=0; this.sel=null; this.over=false; this.winner=null;
    this.lastRoundTrigger=null; this.lastRoundLeft=0;
    this.snakeRound=0;
    this.noSnake = false; // v1.23 : tour classique, snake supprimé
    // teamMap : Map fid → 'A'|'B' (mode 2v2), null sinon
    this.teamMap = opts.teamMap || null;
    // Ordre 2v2 : A1 B1 A2 B2 interleave — mode FFA : aléatoire
    if(this.teamMap && factions.length===4){
      const teamA=factions.filter(f=>this.teamMap.get(f.id)==='A');
      const teamB=factions.filter(f=>this.teamMap.get(f.id)==='B');
      // Shuffle les deux équipes séparément pour varier qui commence
      shuffle(teamA); shuffle(teamB);
      this.turnOrder=[
        factions.indexOf(teamA[0]),
        factions.indexOf(teamB[0]),
        factions.indexOf(teamA[1]),
        factions.indexOf(teamB[1])
      ].filter(i=>i>=0);
    } else {
      // Tour classique : ordre aléatoire du premier joueur
      this.turnOrder=shuffle([...Array(this.np).keys()]);
    }
    this.curIdx=0;
    this.totalTurns=0;
    this.turnLimit=EVENT_CARDS.length * this.np; // 22 événements × nb_joueurs (ex: 88 tours avec 4j)
    this.event=''; this.evDeck=new EvDeck(); this.evCard=null; this.evDone=new Set();
    this.frozenCells=new Set(); this.bombedCells=new Set();
    this.powFreeze=new Map();
    this.bonusCells=new Map(); // key="r,c" → {type, owner}
    this.fortifiedCells=new Set(); // cases fortifiées par P2
    this.mapConfig=pickMapConfig(); // face A ou B pour chaque quadrant
    // Support carte custom : si window._customTerrainMap est défini, l'utiliser
    if(window._customTerrainMap){
      this.terrain=new Map(window._customTerrainMap);
      window._customTerrainMap=null;
      this.villageStyles=new Map();
    } else {
      this.terrain=this._buildTerrain(); // Map r,c → 'prairie'|'lake'|'mount'|'village'
    }
    this.startZones=this._computeStartZones();
    if(this.gameLevel >= 2) this._placeBonusCells(); // pas de cases bonus niveau 1
    this._newEvent();
  }

  // Construction du terrain depuis les tuiles modulaires
  _buildTerrain(){
    const t=new Map();
    this.villageStyles=new Map();
    const quads=['NW','NE','SW','SE'];
    for(const q of quads){
      const [or,oc]=QUAD_OFFSETS[q];
      const face=this.mapConfig[q];
      const def=TILE_DEFS[q][face];
      for(const [lr,lc] of def.lakes)  t.set(`${or+lr},${oc+lc}`,'lake');
      for(const [lr,lc] of def.mounts) t.set(`${or+lr},${oc+lc}`,'mount');
      def.villages.forEach(([lr,lc],vi)=>{
        const key=`${or+lr},${oc+lc}`;
        t.set(key,'village');
        if(def.villageStyle) this.villageStyles.set(key,def.villageStyle[vi]||'house');
      });
      t.set(`${or+START_LOCAL[0]},${oc+START_LOCAL[1]}`,'start');
    }
    // Temples B4 : 1 par quadrant, variable selon face A/B (pas de fallback CENTRAL_SANCTU)
    for(const q of quads){
      const [or,oc]=QUAD_OFFSETS[q];
      const face=this.mapConfig[q];
      const def=TILE_DEFS[q][face];
      if(!def.special) continue;
      const [lr,lc]=def.special;
      const key=`${or+lr},${oc+lc}`;
      const existing=t.get(key);
      if(!existing||existing==='prairie'){
        t.set(key,'special');
      } else {
        // Fallback local : case prairie proche du coin interne du quadrant
        const cands=[[or+4,oc+4],[or+4,oc+3],[or+3,oc+4],[or+3,oc+3],[or+2,oc+4],[or+4,oc+2]];
        for(const [fr,fc] of cands){
          if(fr<0||fr>=GRID_SIZE||fc<0||fc>=GRID_SIZE) continue;
          const fk=`${fr},${fc}`, fv=t.get(fk);
          if(!fv||fv==='prairie'){ t.set(fk,'special'); break; }
        }
      }
    }
    return t;
  }

  getTerrain(r,c){ return this.terrain.get(`${r},${c}`)||'prairie'; }
  isTerrainBlocked(r,c){ const t=this.getTerrain(r,c); return t==='lake'||t==='mount'; }
  isStartCell(r,c){ return this.getTerrain(r,c)==='start'; }
  isSpecial(r,c){ return this.getTerrain(r,c)==='special'; }

  // Zones de départ : les 4 cases [2,2] de chaque quadrant
  // Le draft permet à chaque clan de choisir sa case au début
  _computeStartZones(){
    const quads=['NW','NE','SW','SE'];
    // Retourner les 4 cases start disponibles (draft)
    const starts={};
    for(const q of quads){
      const [or,oc]=QUAD_OFFSETS[q];
      starts[q]=[or+START_LOCAL[0], oc+START_LOCAL[1]];
    }
    return starts; // {NW:[r,c], NE:[r,c], SW:[r,c], SE:[r,c]}
  }
  // Assignation après draft : fid → [r,c]
  assignStart(fid, quadrant){
    if(!this.startAssigned) this.startAssigned={};
    this.startAssigned[fid]=this.startZones[quadrant];
    this.startTaken=this.startTaken||new Set();
    this.startTaken.add(quadrant);
  }
  getStartPos(fid){ return this.startAssigned&&this.startAssigned[fid]; }
  getAvailableStarts(){ return Object.entries(this.startZones).filter(([q])=>!this.startTaken||!this.startTaken.has(q)).map(([q,pos])=>({q,pos})); }
  startOwnerOf(r,c){
    for(let fi=0;fi<this.np;fi++){
      const fid=this.factions[fi].id;
      if(this.startZoneCells(fid).some(([cr,cc])=>cr===r&&cc===c)) return fid;
    } return null;
  }

  startZoneCells(fid){
    const sp=this.getStartPos(fid); if(!sp) return [];
    return [sp]; // juste la case start exacte
  }

  // Valeur de case selon distance au centre (1/2/3)
  cellScore(r,c){
    const bon=this.bonusCells.get(r+','+c);
    if(bon&&bon.type.effect==='triple_pts') return 3;
    const terr=this.getTerrain(r,c);
    if(terr==='village') return 3;
    if(terr==='sanctu') return 1; // sanctuaire : 1pt comme prairie
    if(terr==='special') return 1; // temple : 1pt classique, valeur = permettre B4
    return 1;
  }

  // Bonus actifs pour une faction (Set d'effects)
  activeBonuses(fid){
    const s=new Set(); for(const [,b] of this.bonusCells) if(b.owner===fid) s.add(b.type.effect);
    return s;
  }

  // Met à jour le propriétaire d'une case bonus après modification du plateau
  _syncBonusOwner(r,c){
    const b=this.bonusCells.get(r+','+c); if(!b) return;
    const st=this.board[r][c]; const newOwner=st.length?st[st.length-1][0]:null;
    // attack_draw supprimé (Marché retiré en v1.11)
    b.owner=newOwner;
  }
  cf(){ return this.factions[this.cur]; }
  // Accès par vrai fid (0=Boulangers, 1=Vignerons, 2=Artistes, 3=Fromagers)
  ff(fid){ return this.factionMap.get(fid); }
  evk(){ return this.evCard?this.evCard.key:null; }
  isBlocked(r,c){ return this.isTerrainBlocked(r,c)||this.bombedCells.has(`${r},${c}`); }
  isFrozen(r,c){ return this.frozenCells.has(`${r},${c}`)||this.powFreeze.has(`${r},${c}`); }

  // _placeBlocked remplacé par _buildTerrain (tuiles modulaires v1.13)

  _placeBonusCells(){
    // Si positions fixes transmises depuis le sélecteur de carte standard
    if(window._customBonusPositions){
      const bonDefs=window._customBonusPositions;
      window._customBonusPositions=null;
      const QUAD_MIR={NW:[0,0],NE:[0,5],SW:[5,0],SE:[5,5]};
      bonDefs.forEach(({r,c,typeId})=>{
        const bt=BONUS_CELL_TYPES.find(b=>b.id===typeId)||BONUS_CELL_TYPES[0];
        // Vérifier que la case est prairie (pas bloquée)
        const ter=this.getTerrain(r,c);
        if(ter==='prairie') this.bonusCells.set(r+','+c,{type:bt,owner:null});
      });
      return;
    }
    // Exclure terrains bloqués (lac/montagne) et villages (déjà spéciaux)
    const res=new Set();
    for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++){
      const t=this.getTerrain(r,c);
      if(t==='lake'||t==='mount'||t==='village'||t==='sanctu'||t==='special'||t==='start') res.add(`${r},${c}`);
    }
    for(let fi=0;fi<this.np;fi++) this.startZoneCells(this.factions[fi].id).forEach(([r,c])=>res.add(r+','+c));
    const cr=Math.floor(GRID_SIZE/2), cc=Math.floor(GRID_SIZE/2);
    // Exclure le centre (zone 3) des candidats bonus
    for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++) res.add((cr+dr)+','+(cc+dc));

    // 4 coins diagonaux équidistants des départs — chacun centre d'une zone de 4 candidats
    const corners=[[cr-3,cc-3],[cr-3,cc+3],[cr+3,cc-3],[cr+3,cc+3]];
    // Générer les 4 candidats autour de chaque coin (dans zone 2 uniquement)
    const zoneCands=corners.map(([dr,dc])=>{
      const cells=[];
      for(let rr=dr-1;rr<=dr+1;rr++) for(let rc=dc-1;rc<=dc+1;rc++){
        if(rr<0||rr>=GRID_SIZE||rc<0||rc>=GRID_SIZE) continue;
        if(res.has(rr+','+rc)) continue;
        const d=Math.max(Math.abs(rr-cr),Math.abs(rc-cc));
        if(d>=2) cells.push([rr,rc]); // zone 2 ou 1 (pas centre)
      }
      return cells;
    });

    // Sélectionner les 4 zones (une par coin) pour équilibrer la carte
    const chosen=corners.map((_,i)=>i);
    const types=shuffle([...BONUS_CELL_TYPES]).slice(0,BONUS_N);

    chosen.forEach((zoneIdx,ti)=>{
      const zone=zoneCands[zoneIdx];
      if(!zone.length) return;
      const [r,c]=zone[Math.floor(Math.random()*zone.length)];
      this.bonusCells.set(r+','+c,{type:types[ti],owner:null});
    });
  }

  _newEvent(){
    this._discardLowestDone=false;
    this._fireTgts=null; this._fireChooser=null;
    this.evCard=this.evDeck.draw();
    // Durée = 2 tours complets = 2 × nombre de joueurs actions
    this.evTurnsLeft = this.np; // 1 tour complet = chaque joueur joue 1 fois
    this.frozenCells=new Set(); this._applyEvStart();
  }

  _applyEvStart(){
    const key=this.evk(); if(!key) return;
    const ev=this.evCard;
    // blizzard supprimé v1.21
    if(key==='plague'){
      const rightIdx=(this.curIdx+1)%this.np;
      const rightFid=this.factions[this.turnOrder[rightIdx]].id;
      const tgts=[];
      for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++){
        const st=this.board[r][c];
        if(st.length&&isBat(st[st.length-1][1])&&st[st.length-1][0]!==rightFid) tgts.push([r,c,...st[st.length-1]]);
      }
      if(tgts.length){
        this._fireTgts=tgts; this._fireChooser=rightFid;
        this.event=`🔥 Incendie ! ${F_NAME[rightFid]} choisit un bâtiment ennemi à brûler !`;
      } else { this._fireTgts=null; this.event='🔥 Incendie ! Aucun bâtiment visible.'; }
    } else if(key==='remove_ones'){
      let n=0; for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++)
        if(this.board[r][c].length&&this.board[r][c][this.board[r][c].length-1][1]===1){this.board[r][c].pop();n++;}
      this.event=`🌊 Marée montante ! ${n} tuile(s) '1' retirées.`;
    } else if(key==='draw_bonus'){
      const n=ev.param||2;
      for(const f of this.factions){
        for(let i=0;i<n;i++) f.drawOne();
        if(f.hand.filter(t=>!isPower(t)).length>5) f._noAutoDrawUntilMax=true;
      }
      const _evName=ev.ico==='🎁'?'Abondance':'Main généreuse';
      this.event=`${ev.ico||'🃏'} ${_evName} ! Chaque joueur pioche ${n} cartes (pas de repioche auto avant ≤5).`;
    } else if(key==='discard_lowest'){
      if(!this._discardLowestDone){
        this._discardLowestDone=true;
        for(const f of this.factions){
          const nums=f.hand.map((t,i)=>[i,t]).filter(([,t])=>typeof t==='number');
          if(nums.length){ const [idx]=nums.reduce((a,b)=>b[1]<a[1]?b:a); f.deck.push(f.hand.splice(idx,1)[0]); shuffle(f.deck); }
        }
        this.event='🕳️ Fosses forcées ! Chacun perd sa plus petite tuile (une fois).';
      } else { this.event='🕳️ Fosses forcées — effet déjà appliqué.'; }
    } else if(key==='chaos_steal'){
      for(let i=0;i<this.np;i++){
        const others=this.factions.filter((_,j)=>j!==i&&this.factions[j].deck.length);
        if(others.length){ const d=rnd(others); const idx=Math.floor(Math.random()*d.deck.length);
          this.factions[i].hand.push(d.deck.splice(idx,1)[0]); }
      }
      this.event='🎲 Chaos total ! Chacun reçoit une carte ennemie.';
    } else {
      const labels={no_attack:'🛡️ Trêve sacrée ! Aucune attaque.',no_bat:'🏚️ Gel des chantiers ! Pas de bâtiments.',
        force_attack:'⚔️ Frénésie guerrière ! Attaque obligatoire.',no_adj:'🎯 Sniper ! Pose libre partout.',
        max_stack_plus:'📦 Cargaison ! Pile max = 5.',max_stack_minus:'🕳️ Gouffre ! Pile max = 3.',
        extended_adj:'🏹 Tir longue portée ! Adjacence +2.',adj_enemy:'🧲 Attraction ! Adj. à tout ennemi.',
        only_even:'🌑 Éclipse ! Valeurs paires uniquement.',only_odd:'☀️ Solstice ! Valeurs impaires uniquement.',
        reverse_order:'🔁 Ordre inversé ! (2 tours)',bonus_one:'🛸 Invasion ! Tuile bonus \'1\'.',
        calme:'🌿 Calme plat — tour libre, aucune règle spéciale.',
      };
      this.event=labels[key]||'';
    }
  }

  effMaxStack(fi=null){ const k=this.evk();
    let base=MAX_STACK;
    if(k==='max_stack_plus') base=MAX_STACK+(this.evCard.param||1);
    else if(k==='max_stack_minus') base=Math.max(1,MAX_STACK+(this.evCard.param||-1));
    const fidx=fi!==null?fi:this.cur;
    const fclan=this.factions[fidx]?this.factions[fidx].id:fidx;
    // Trait Boulangers : pile max 5
    // pile5 supprimé v1.19 — remplacé par defBoost
    if(this.activeBonuses(fclan).has('stack_bonus')) base=Math.max(base,5);
    return base;
  }

  // Qui contrôle la case [r,c] (propriétaire de la tuile du dessus) ?
  topOwner(r,c){ const st=this.board[r][c]; return st.length ? st[st.length-1][0] : null; }

  // La faction fid est-elle au sommet d'au moins une case adjacente à [row,col] ?
  adjTopOwned(row,col,fid){
    return neighbors(row,col).some(([r2,c2]) => this.topOwner(r2,c2) === fid);
  }

  // Adjacence étendue (2 sauts) — uniquement cases où fid est AU SOMMET
  adj2(row,col,fid){
    for(const [r1,c1] of neighbors(row,col)){
      if(this.topOwner(r1,c1) === fid) return true;
      for(const [r2,c2] of neighbors(r1,c1))
        if(this.topOwner(r2,c2) === fid) return true;
    }
    return false;
  }

  // Y a-t-il une tuile ennemie AU SOMMET dans les N cases voisines (distance hex) ?
  hasEnemyNear(row,col,fid,dist=1){
    const visited=new Set([`${row},${col}`]);
    let frontier=[[row,col]];
    for(let d=0;d<dist;d++){
      const next=[];
      for(const [r,c] of frontier){
        for(const [r2,c2] of neighbors(r,c)){
          const k=`${r2},${c2}`; if(visited.has(k)) continue; visited.add(k);
          next.push([r2,c2]);
          const owner=this.topOwner(r2,c2);
          if(owner!==null && owner!==fid) return true;
        }
      }
      frontier=next;
    }
    return false;
  }

  // ── AURAS BÂTIMENTS ──
  // Niveau du bâtiment allié adjacent le plus élevé (0 si aucun)
  _bestAdjBat(row, col, fid){
    const BAT_LVL={B1:1,B2:2,B3:3,B4:4};
    let best=0;
    for(const [r2,c2] of neighbors(row,col)){
      const st=this.board[r2][c2]; if(!st.length) continue;
      const [owner,tile]=st[st.length-1];
      if(owner===fid&&isBat(tile)) best=Math.max(best,BAT_LVL[tile]||0);
    }
    return best;
  }

  // Bonus d'attaque apporté par l'aura du meilleur bâtiment allié adjacent
  // (pour une tuile alliée sur row,col qui va attaquer)
  auraAttackBonus(row, col, fid){
    const lvl=this._bestAdjBat(row,col,fid);
    if(lvl===1) return 1; // B1 : +1
    if(lvl===3) return 1; // B3 : +1
    if(lvl===4) return 2; // B4 : +2
    return 0;             // B2 : pas de bonus attaque
  }

  // Malus d'attaque imposé par le meilleur bâtiment ENNEMI adjacent
  // (pour une tuile ennemie sur row,col qui va attaquer vers nous)
  auraDefenseDebuff(row, col, fid){
    // On cherche le meilleur B3/B4 allié (fid) adjacent à la case CIBLE (row,col)
    // → les ennemis qui veulent attaquer (row,col) auront -1 si B3 allié nearby
    const BAT_LVL={B1:1,B2:2,B3:3,B4:4};
    let best=0;
    for(const [r2,c2] of neighbors(row,col)){
      const st=this.board[r2][c2]; if(!st.length) continue;
      const [owner,tile]=st[st.length-1];
      if(owner===fid&&isBat(tile)) best=Math.max(best,BAT_LVL[tile]||0);
    }
    return best===3?1:0; // seul B3 impose un malus ennemi
  }

  // Bonus de points de victoire par l'aura (pour scores())
  // Retourne pts bonus pour la case (row,col) contrôlée par fid
  auraPtsBonus(row, col, fid){
    const lvl=this._bestAdjBat(row,col,fid);
    if(lvl===2) return 1; // B2 : +1 pt
    if(lvl===4) return 1; // B4 : +1 pt
    return 0;
  }

  canPlace(row,col,ti,fi=null){
    if(fi===null) fi=this.cur;
    const f=this.factions[fi]; if(ti>=f.hand.length) return false;
    const tile=f.hand[ti]; if(isPower(tile)) return false;
    const stack=this.board[row][col]; const tv=tval(tile);
    if(this.isBlocked(row,col)||this.isFrozen(row,col)) return false;
    // Temple (special) : seul B4 autorisé — toute autre tuile bloquée
    if(this.getTerrain(row,col)==='special' && tile!=='B4') return false;
    if(stack.length>=this.effMaxStack(fi)) return false;

    // ── RÈGLE SPÉCIALE : tuile 1 peut être posée sur une pile dont le sommet est un 10 ennemi ──
    if(tile===1 && stack.length && stack[stack.length-1][0]!==f.id && stack[stack.length-1][1]===10){
      if(f.hasPlaced) return true; // autorisé — la destruction est gérée dans place()
    }

    // ── Règles de recouvrement ──
    // 2v2 : coéquipiers peuvent s'empiler
    if(this.teamMap && stack.length){
      const topFid=this.factions[stack[stack.length-1][0]].id;
      if(this.teamMap.get(f.id)===this.teamMap.get(topFid) && topFid!==f.id){
        // Empilement allié autorisé — on continue les vérifications normales
      }
    }
    if(stack.length){
      const [tfi,tt]=stack[stack.length-1];
      if(tfi===f.id) return false;
      if(this.evk()==='no_attack') return false;
      if(!f.hasPlaced) return false;
      // Citadelle : case inattaquable si propriétaire actuel la contrôle
      const bonC=this.bonusCells.get(row+','+col);
      if(bonC&&bonC.owner===tfi&&bonC.type.effect==='shield') return false;
      // B4 indestructible
      if(tt==='B4') return false;
      // Fortification (P2) : case alliée spécifiquement fortifiée
      if(this.fortifiedCells&&this.fortifiedCells.has(`${row},${col}`)) return false;
      // Toile renforcée (P7) : bâtiments du défenseur inattaquables
      const ftfi=this.ff(tfi);
      if(ftfi&&ftfi.shielded&&(!ftfi.shieldBatOnly||isBat(tt))) return false;
      // ── Valeur effective de l'ATTAQUANT ──
      let effTV=tv;
      if(f.inspireTurn&&isBat(tile)) effTV+=2;
      // Trait Fromagers (attaquant) : leurs bâtiments valent +1
      if(isBat(tile)&&CLAN_TRAITS[f.id]&&CLAN_TRAITS[f.id].passif==='batBoost'&&this.gameLevel>=3) effTV+=1;
      const bonA=this.activeBonuses(f.id);
      if(typeof tile==='number'&&bonA.has('all_boost')) effTV+=1;
      // ── Valeur effective du DÉFENSEUR ──
      let defTV=tval(tt);
      if(isBat(tt)&&CLAN_TRAITS[tfi]&&CLAN_TRAITS[tfi].passif==='batBoost'&&this.gameLevel>=3) defTV+=1;
      if(!isBat(tt)&&CLAN_TRAITS[tfi]&&CLAN_TRAITS[tfi].passif==='defBoost'&&typeof tt==='number'&&tt>=6&&this.gameLevel>=3) defTV+=1; // Boulangers: défense +1 niv3 seulement
      const defDebuff = 0; // auras supprimées v1.16

      // Artistes : attaque à égalité seulement avec tuiles 1-5 (infiltration faible)
      const isArtEq=this.gameLevel>=3&&CLAN_TRAITS[f.id]&&CLAN_TRAITS[f.id].passif==='equalAttack'&&typeof tile==='number'&&tile<=5;
      const minToWin = isArtEq ? 0 : 1;
      if(effTV < defTV+minToWin+defDebuff) return false;
    }

    // ── B4 : uniquement sur les cases spéciales centrales (sans contrainte d'adjacence) ──
    if(tile==='B4' && this.getTerrain(row,col)!=='special') return false;
    if(tile==='B4' && this.getTerrain(row,col)==='special'){
      if(!f.canPlayBat('B4', this.board)) return false;
      if(this.evk()==='no_bat') return false;
      return true; // B4 sur special : pas de contrainte d'adjacence
    }
    // ── Bâtiments : le niveau précédent doit être VISIBLE sur le plateau ──
    if(isBat(tile)){
      if(!f.canPlayBat(tile, this.board)) return false;
      if(this.evk()==='no_bat') return false;
    }

    const k=this.evk();
    if(k==='only_even' &&typeof tile==='number'&&tile%2!==0) return false;
    if(k==='only_odd'  &&typeof tile==='number'&&tile%2===0) return false;
    if(k==='only_no1'  &&typeof tile==='number'&&tile===1)   return false;
    if(k==='only_no10' &&typeof tile==='number'&&tile===10)  return false;

    // ── PREMIER PLACEMENT — case de départ assignée par draft ──
    if(!f.hasPlaced){
      const sp=this.getStartPos(f.id);
      if(!sp) return false; // draft pas encore fait
      if(row!==sp[0]||col!==sp[1]) return false; // doit poser exactement sur sa case start
      return true;
    }

    // ── RÉINTÉGRATION — joueur sans tuile sur le plateau ──
    const hasAnyTile = ()=>{ for(let r=0;r<GRID_SIZE;r++) for(let c2=0;c2<GRID_SIZE;c2++) { const st=this.board[r][c2]; if(st.length&&st[st.length-1][0]===f.id) return true; } return false; };
    if(f.hasPlaced && !hasAnyTile()){
      // Peut poser sur toute case vide (pas ennemi au sommet)
      if(stack.length) return false; // case occupée
      return true;
    }

    // ── PLACEMENTS SUIVANTS ──
    if(k==='no_adj') return true;
    if(k==='extended_adj') return this.adj2(row,col,f.id);
    if(k==='adj_enemy') return neighbors(row,col).some(([r2,c2])=>this.board[r2][c2].length>0);
    if(this.teamMap){
      const myTeam=this.teamMap.get(f.id);
      const allies=this.factions.filter(fx=>fx.id!==f.id&&this.teamMap.get(fx.id)===myTeam);
      if(allies.some(ally=>this.adjTopOwned(row,col,ally.id))) return true;
    }
    return this.adjTopOwned(row,col,f.id);
  }

  // Retourne {ico, msg} expliquant pourquoi on ne peut pas poser ici
  getPlaceRefusalReason(row,col,ti){
    const f=this.cf();
    if(ti===null||ti===undefined||ti>=f.hand.length) return null;
    const tile=f.hand[ti]; if(!tile||isPower(tile)) return null;
    const stack=this.board[row][col];
    // 2v2 : coéquipier
    if(this.teamMap && stack.length){
      const topFid=this.factions[stack[stack.length-1][0]].id;
      if(this.teamMap.get(f.id)===this.teamMap.get(topFid) && topFid!==f.id)
        return {ico:'🤝',msg:`Allié ${F_NAME[topFid]} — impossible de le couvrir !`};
    }
    const terr=this.getTerrain(row,col);
    if(terr==='lake')  return {ico:'🌊',msg:'Inaccessible — lac'};
    if(terr==='mount') return {ico:'⛰️',msg:'Inaccessible — montagne'};
    if(this.isBlocked&&this.isBlocked(row,col)) return {ico:'💣',msg:'Case bloquée ou barricadée'};
    if(this.isFrozen&&this.isFrozen(row,col))   return {ico:'❄️',msg:'Case gelée ce tour'};
    const maxStk=this.effMaxStack(this.cur);
    if(stack.length>=maxStk) return {ico:'📦',msg:`Pile pleine (max ${maxStk})`};
    if(tile==='B4'&&terr!=='special') return {ico:'⚔️',msg:'B4 uniquement sur les temples violets (1 par quadrant)'};
    if(terr==='special'&&tile!=='B4') return {ico:'⬡',msg:'Temple réservé au B4 uniquement — seul le bâtiment suprême peut y être fondé'};
    if(isBat(tile)){
      if(!f.canPlayBat(tile,this.board)){
        const lvl={'B1':1,'B2':2,'B3':3,'B4':4}[tile];
        return {ico:'🔒',msg:`Posez d'abord votre Niveau ${lvl-1} (doit être visible sur le plateau)`};
      }
      if(this.evk()==='no_bat') return {ico:'🏚️',msg:'Gel des chantiers — pas de bâtiment ce tour'};
    }
    if(stack.length){
      const [tfi,tt]=stack[stack.length-1];
      if(tfi===f.id) return {ico:'🚫',msg:"Déjà à vous — impossible de s'empiler dessus"};
      if(this.evk()==='no_attack') return {ico:'🛡️',msg:'Trêve sacrée — aucune attaque ce tour'};
      if(tt==='B4') return {ico:'👑',msg:'B4 est indestructible'};
      const ftfi=this.ff(tfi);
      if(ftfi&&ftfi.shielded) return {ico:'🖼️',msg:`${ftfi.name} : Toile renforcée — bâtiments inattaquables`};
      let effTV=tval(tile);
      if(f.inspireTurn&&isBat(tile)) effTV+=2;
      if(isBat(tile)&&CLAN_TRAITS[f.id]&&CLAN_TRAITS[f.id].passif==='batBoost') effTV+=1;
      let defTV=tval(tt);
      if(isBat(tt)&&CLAN_TRAITS[tfi]&&CLAN_TRAITS[tfi].passif==='batBoost') defTV+=1;
      if(!isBat(tt)&&CLAN_TRAITS[tfi]&&CLAN_TRAITS[tfi].passif==='defBoost'&&typeof tt==='number'&&tt>=6) defTV+=1;
      const isArtEq2=CLAN_TRAITS[f.id]&&CLAN_TRAITS[f.id].passif==='equalAttack'&&typeof tile==='number'&&tile<=5;
      if(effTV<defTV+(isArtEq2?0:1)){
        const need=defTV+(isArtEq2?0:1);
        if(CLAN_TRAITS[tfi]&&CLAN_TRAITS[tfi].passif==='defBoost'&&!isBat(tt)&&typeof tt==='number'&&tt>=6)
          return {ico:'🛡️',msg:`Tuile trop faible — ${F_NAME[tfi]} défense +1 sur les 6-10 (résiste ${defTV}) · besoin de ${need}`};
        return {ico:'⚔️',msg:`Tuile trop faible — il faut ≥${need}, vous avez ${effTV}`};
      }
    }
    if(!f.hasPlaced){
      const sp=this.getStartPos&&this.getStartPos(f.id);
      if(sp&&(sp[0]!==row||sp[1]!==col))
        return {ico:'🏁',msg:`1er tour : posez sur votre case de départ [${sp[0]},${sp[1]}]`};
    } else {
      const k=this.evk();
      if(k!=='no_adj'&&k!=='extended_adj'&&k!=='adj_enemy'){
        if(!this.adjTopOwned(row,col,f.id))
          return {ico:'🔗',msg:"Pas adjacent à l'une de vos tuiles au sommet d'une pile"};
      }
    }
    return null;
  }

  validMoves(fi){
    const f=this.factions[fi]; const k=this.evk();
    const moves=[];
    for(let ti=0;ti<f.hand.length;ti++) for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++)
      if(this.canPlace(r,c,ti,fi)) moves.push([ti,r,c]);
    if(k==='force_attack'&&fi===this.cur){
      const atk=moves.filter(([ti,r,c])=>this.board[r][c].length&&this.board[r][c][this.board[r][c].length-1][0]!==f.id);
      // Frénésie ignorée si aucun joueur ne peut attaquer
      const anyCanAtk=this.factions.some((fx,fxi)=>fx.hand.some((_,ti)=>{
        for(let rr=0;rr<GRID_SIZE;rr++) for(let cc=0;cc<GRID_SIZE;cc++){
          const st2=this.board[rr][cc];
          if(st2.length&&st2[st2.length-1][0]!==fxi&&typeof fx.hand[ti]==='number'&&fx.hand[ti]>tval(st2[st2.length-1][1])) return true;
        } return false;
      }));
      if(anyCanAtk&&atk.length) return atk;
    }
    return moves;
  }

  place(row,col,ti=null){
    if(ti===null) ti=this.sel; if(ti===null) return false;
    const f=this.cf(); if(ti>=f.hand.length) return false;
    const tile=f.hand[ti]; if(isPower(tile)) return false;
    if(!this.canPlace(row,col,ti)) return false;
    this.lastMove={row,col,fid:f.id}; this.lastMoveAt=performance.now();
    const stack=this.board[row][col];
    if(stack.length){ const [ef,et]=stack[stack.length-1];
      if(ef!==f.id){ const enemy=this.ff(ef);
        const _isAlly=this.teamMap&&enemy&&this.teamMap.get(f.id)===this.teamMap.get(enemy.id);
        if(_isAlly){ this.event=`🤝 ${f.name} s'empile sur ${et} de ${enemy.name} !`;
        } else if(isBat(et)){ delete enemy.batOnBoard[`${row},${col}`];
          this.event=`💥 ${f.name} détruit ${BAT_LABEL[ef][et]}(${BAT_VAL[et]}) de ${enemy.name} !`;
        } else this.event=`⚔️ ${f.name} recouvre ${et} de ${enemy.name}`;
      }
    }
    // ── RÈGLE SPÉCIALE : tuile 1 sur pile avec sommet=10 ennemi → tout détruire ──
    if(tile===1 && stack.length && stack[stack.length-1][0]!==f.id && stack[stack.length-1][1]===10){
      // Effacer tous les bâtiments de la pile des registres
      for(const [ef2,et2] of stack){ const ef2fac=this.ff(ef2); if(ef2fac&&isBat(et2)) delete ef2fac.batOnBoard[`${row},${col}`]; }
      this.board[row][col]=[];
      this._syncBonusOwner(row,col);
      f.hand.splice(ti,1); f.hasPlaced=true; f.drawFill(this); this.sel=null;
      this.event=`💥 ${f.name} joue 1 sur un 10 ennemi — le 10 ET toutes les tuiles dessous anéanties !`;
      this._endTurn(); return true;
    }
    stack.push([f.id,tile]); f.hand.splice(ti,1); f.hasPlaced=true; f.drawFill(this); this.sel=null;
    if(isBat(tile)){
      if(!f.batPlaced.includes(tile)) f.batPlaced.push(tile); // pas de doublon
      f.batOnBoard[`${row},${col}`]=tile;
      if(tile==='B4'){
        this.lastRoundTrigger=f.id;
        this.lastRoundLeft=this.np-1;
        this.event=`👑 ${F_EMO[f.id]} ${f.name} pose ${BAT_LABEL[f.id].B4} — DERNIER TOUR pour tous !`;
      }
    }
    this._syncBonusOwner(row,col);
    // Sanctuaire : pioche 1 carte pouvoir au premier contrôle
    if(this.getTerrain(row,col)==='special'){
      const sanctKey=`${row},${col}`;
      if(!this.sanctuUsed) this.sanctuUsed=new Set();
      if(!this.sanctuUsed.has(sanctKey)){
        this.sanctuUsed.add(sanctKey);
        // Piocher une carte pouvoir non encore en main
        const availPow=POWER_POOL.filter(p=>!f.hand.some(h=>h&&h.id===p.id));
        if(availPow.length){ f.hand.push(availPow[Math.floor(Math.random()*availPow.length)]); }
        this.event=`⚡ ${F_EMO[f.id]} ${f.name} contrôle le Sanctuaire — carte pouvoir obtenue !`;
      }
    }
    this._endTurn(); return true;
  }

  resolveFireChoice(r,c){
    if(!this._fireTgts) return false;
    const tgt=this._fireTgts.find(([tr,tc])=>tr===r&&tc===c);
    if(!tgt) return false;
    const [,,ef,et]=tgt; const fef=this.ff(ef);
    if(fef) delete fef.batOnBoard[`${r},${c}`]; this.board[r][c].pop();
    this._syncBonusOwner(r,c);
    this.event=`🔥 ${F_NAME[this._fireChooser]} brûle ${BAT_LABEL[ef][et]} de ${F_NAME[ef]} !`;
    this._fireTgts=null; this._fireChooser=null; return true;
  }

  usePower(handIdx,targetRow=null,targetCol=null){
    const f=this.cf(); if(handIdx>=f.hand.length) return false;
    const pc=f.hand[handIdx]; if(!isPower(pc)) return false;
    if(f.powUsedThisTurn) return false; // 1 pouvoir max par tour
    const tgt=pc.target; let used=false;
    if(tgt==='auto_dump'){
      if(f._handDumpUsed){ this.event=`🗑️ ${f.name} — Jeter sa main déjà utilisé !`; return false; }
      f._handDumpUsed=true;
      const _numCards=f.hand.filter(t=>!isPower(t)).length;
      const _keptPow=f.hand.filter(t=>isPower(t)&&t.id!=='P_DUMP');
      f.deck.push(...f.hand.filter(t=>!isPower(t))); shuffle(f.deck);
      f.hand=_keptPow;
      for(let i=0;i<_numCards&&f.deck.length;i++) f.drawOne();
      f.doubleTurn=true; f.hasPlaced=false;
      this.event=`🗑️ ${f.name} jette sa main — repioche ${_numCards} cartes et rejoue !`;
      used=true;
    } else if(tgt==='auto_freeze_villages'){
      // P4 Blizzard des villages : gèle tous les villages 1 tour
      let cnt=0;
      for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++){
        const terr=this.getTerrain(r,c);
        if(terr==='village'){ this.powFreeze.set(`${r},${c}`,2); cnt++; } // 2 car _endTurn décrémente immédiatement
      }
      this.event=`❄️ ${f.name} — Villages gelés ! ${cnt} villages inaccessibles ce tour.`; used=true;
    } else if(tgt==='auto'){
      const ecs=[]; for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++)
        if(this.board[r][c].length&&this.board[r][c][this.board[r][c].length-1][0]!==f.id&&!this.isBlocked(r,c))
          ecs.push([r,c]);
      shuffle(ecs); const chosen=ecs.slice(0,5);
      for(const [r,c] of chosen) this.powFreeze.set(`${r},${c}`,2);
      this.event=`🧊 ${f.name} gèle ${chosen.length} cases ennemies pour 2 tours !`; used=true;
    } else if(targetRow!==null&&targetCol!==null){
      const r=targetRow,c=targetCol; const stack=this.board[r][c];
      if(tgt==='bomb_enemy'){
        // Bombardement de baguette : détruit et rend la case inutilisable
        if(!stack.length||stack[stack.length-1][0]===f.id) return false;
        const [ef_b,et_b]=stack[stack.length-1];
        if(et_b==='B4') return false; // B4 indestructible
        // Détruire toute la pile
        for(const [efx,etx] of stack){ const fx=this.ff(efx); if(fx&&isBat(etx)) delete fx.batOnBoard[`${r},${c}`]; }
        this.board[r][c]=[];
        this.bombedCells.add(`${r},${c}`);
        this._syncBonusOwner(r,c);
        this.event=`🥖 ${f.name} — Bombardement de baguette ! Case (${c},${r}) détruite définitivement.`; used=true;
      } else if(tgt==='cell_empty'){
        // Barricade de fromage : bloque une case vide
        if(stack.length) return false; // doit être vide
        if(this.isBlocked(r,c)) return false; // déjà bloquée
        this.bombedCells.add(`${r},${c}`);
        this.event=`🧀 ${f.name} — Barricade de fromage ! Case (${c},${r}) bloquée définitivement.`; used=true;
      } else if(tgt==='bat_enemy'){
        // P1 Destruction : retire uniquement le bâtiment ennemi visible, pile reste
        if(!stack.length||stack[stack.length-1][0]===f.id) return false;
        const [ef,et]=stack[stack.length-1];
        if(!isBat(et)) return false; // cible doit être un bâtiment
        if(et==='B4') return false;  // B4 indestructible
        const fef2=this.ff(ef); if(fef2){ delete fef2.batOnBoard[`${r},${c}`]; }
        stack.pop(); // retire seulement le bâtiment
        // Tuile du dessous : si bâtiment allié, le réenregistrer
        if(stack.length){ const [nf,nt]=stack[stack.length-1]; const fnf=this.ff(nf); if(isBat(nt)&&fnf) fnf.batOnBoard[`${r},${c}`]=nt; }
        this._syncBonusOwner(r,c);
        this.event=`🔨 ${f.name} détruit ${BAT_LABEL[ef][et]} de ${F_NAME[ef]} — la pile reste !`; used=true;
      } else if(tgt==='own_fortify'){
        // P2 Fortification : une case alliée inattaquable 1 tour
        if(!stack.length||stack[stack.length-1][0]!==f.id) return false;
        this.powFreeze.set(`fortify_${r},${c}`,1); // marqueur spécial fortification
        this.fortifiedCells=(this.fortifiedCells||new Set()); this.fortifiedCells.add(`${r},${c}`);
        this.event=`🪨 ${f.name} fortifie (${c},${r}) — inattaquable ce tour !`; used=true;
      } else if(tgt==='cell_freeze'){
        // ancien gel ciblé — ne devrait plus être appelé
        used=false;
      } else if(tgt==='cell_enemy_top'){
        if(!stack.length||stack[stack.length-1][0]===f.id) return false;
        const [ef,et]=stack[stack.length-1];
        if(et==='B4') return false;
        if(isBat(et)){ const fef3=this.ff(ef); if(fef3) delete fef3.batOnBoard[`${r},${c}`]; }
        stack.pop();
        // Si une tuile reste au sommet et c'est un bâtiment, elle redevient active
        if(stack.length){ const [nf2,nt2]=stack[stack.length-1]; const fnf2=this.ff(nf2); if(isBat(nt2)&&fnf2) fnf2.batOnBoard[`${r},${c}`]=nt2; }
        this.event=`🖌️ ${f.name} — Pluie de pinceaux ! Tuile retirée de (${c},${r}).`; used=true;
      }
    }
    // P5 — Rivière de vin : own_tile → clic sur case propre, déplace vers voisin vide
    if(!used&&pc.target==='own_tile'&&targetRow!==null){
      const r=targetRow,c=targetCol; const st=this.board[r][c];
      if(!st.length||st[st.length-1][0]!==f.id||isBat(st[st.length-1][1])) return false;
      const voids=neighbors(r,c).filter(([r2,c2])=>!this.board[r2][c2].length&&!this.isBlocked(r2,c2)&&!this.isFrozen(r2,c2));
      if(!voids.length) return false;
      const [nr,nc]=voids[0];
      this.board[nr][nc].push(st[st.length-1]); st.pop();
      this._syncBonusOwner(r,c); this._syncBonusOwner(nr,nc);
      this.event=`🍷 ${f.name} — Rivière de vin ! Tuile déplacée.`; used=true;
    }
    // P6 — Tous pour le croissant : pioche 3 cartes
    if(!used&&pc.target==='auto_rally'){
      for(let i=0;i<3;i++) f.drawOne();
      this.event=`🥐 ${f.name} — Tous pour le croissant ! Pioche 3 cartes.`; used=true;
    }
    // P7 — Toile renforcée : bâtiments inattaquables jusqu'au prochain tour
    if(!used&&pc.target==='auto_shield'){
      f.shielded=true; f.shieldTurns=1; f.shieldBatOnly=true; // 1 tour, bâtiments uniquement
      this.event=`🖼️ ${f.name} — Toile renforcée ! Bâtiments inattaquables ce tour.`; used=true;
    }
    // P8 — Double meule : 2 tuiles ce tour
    if(!used&&pc.target==='auto_double'){
      f.doubleTurn=true;
      this.event=`🫕 ${f.name} — Double meule ! Pose 2 tuiles ce tour.`; used=true;
    }
    // (P9 Rivière de vin supprimé)
    if(!used&&pc.target==='enemy_faction'&&targetRow!==null){
      const efi=targetRow; if(efi<0||efi>=this.np||efi===this.cur) return false;
      const ef=this.ff(efi); if(!ef) return false; const tmp=[...f.hand]; f.hand=[...ef.hand]; ef.hand=tmp;
      this.event=`🌀 ${f.name} échange sa main avec ${ef.name} !`; used=true;
    }
    // P10 — Inspiration : bâtiments +2 en force ce tour
    if(!used&&pc.target==='auto_inspire'){
      f.inspireTurn=true;
      this.event=`⭐ ${f.name} — Inspiration ! Bâtiments +2 en force ce tour.`; used=true;
    }
    if(!used) return false;
    f.hand.splice(handIdx,1); f.drawOne(this); this.sel=null;
    f.powUsedThisTurn=true; // 1 pouvoir par tour max
    // hasPlaced inchangé : le joueur peut encore poser sa tuile ce tour
    return true;
  }

  passTurn(){
    const f=this.cf(); const n=f.passAndRedraw();
    this.event=`⏭️ ${f.name} passe — défausse ${n} tuile(s), repioche !`; this.sel=null;
    this._endTurn();
  }

  _endTurn(){
    this.totalTurns++;
    // Fin par timer : nb_événements × nb_joueurs
    if(this.lastRoundTrigger===null && this.totalTurns>=this.turnLimit){
      this.over=true; this.event='⌛ Temps écoulé — fin de la bataille !'; return;
    }
    // Fin par B4 : dernier tour pour tous
    if(this.lastRoundTrigger!==null){
      this.lastRoundLeft--;
      if(this.lastRoundLeft<=0){
        this.over=true; this.winner=this.lastRoundTrigger; return;
      }
    }
    const pf=this.factions[this.cur];
    // Toile renforcée : décompte bouclier
    if(pf.shieldTurns>0){ pf.shieldTurns--; if(pf.shieldTurns<=0){ pf.shielded=false; pf.shieldBatOnly=false; } }
    // Fortification : nettoyer les cases fortifiées de ce joueur
    if(this.fortifiedCells){ for(const k of [...this.fortifiedCells]){ const [fr,fc]=k.split(',').map(Number); const st2=this.board[fr][fc]; if(!st2.length||st2[st2.length-1][0]!==pf.id) this.fortifiedCells.delete(k); } }
    // Reset flags one-shot
    pf.doubleTurn=false; pf.inspireTurn=false; pf.powUsedThisTurn=false;
    // Décompte durée événement (2 tours complets)
    this.evTurnsLeft = (this.evTurnsLeft ?? 0) - 1;
    const expired=[...this.powFreeze.entries()].filter(([,v])=>v<=1).map(([k])=>k);
    expired.forEach(k=>this.powFreeze.delete(k));
    for(const [k,v] of this.powFreeze) this.powFreeze.set(k,v-1);
    const isRev=this.evk()==='reverse_order';
    const step=isRev?-1:1;
    this.curIdx=(this.curIdx+step+this.np)%this.np;
    if(isRev){ this.evTurnsLeft=0; } // 1 seul tour inversé
    if(this.curIdx===0&&step===1) this.snakeRound++;
    // Tour classique A/B/C/D — pas de rotation snake
    this.cur=this.turnOrder[this.curIdx];
    if(this.evTurnsLeft <= 0) this._newEvent();
    this._check();
  }

  _check(){
    if(this.over) return;
    if(this.factions.every(f=>f.tilesLeft()===0)){this.over=true;return;}
    for(let i=0;i<this.np;i++){
      const f=this.cf();
      if(f.tilesLeft()===0){ const step=this.evk()==='reverse_order'?-1:1; this.curIdx=(this.curIdx+step+this.np)%this.np; this.cur=this.turnOrder[this.curIdx]; continue; }
      if(this.validMoves(this.cur).length) return;
      const n=f.passAndRedraw(); this.event=`🔄 ${f.name} sans coup — repioche !`; return;
    }
    this.over=true;
  }

  scores(){
    const BAT_PTS={B1:1,B2:2,B3:3,B4:4};
    const sc={}; for(let i=0;i<this.np;i++) sc[this.factions[i].id]=0;
    for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++){
      const st=this.board[r][c]; if(!st.length) continue;
      const [owner,tile]=st[st.length-1];
      sc[owner]+=this.cellScore(r,c);
      if(isBat(tile)) sc[owner]+=(BAT_PTS[tile]||0);
    }
    for(const [,b] of this.bonusCells)
      if(b.type.effect==='end_bonus'&&b.owner!==null) sc[b.owner]=(sc[b.owner]||0)+3;
    return sc;
  }

  // Score combiné par équipe (2v2)
  teamScores(){
    if(!this.teamMap) return null;
    const sc=this.scores(); const ts={A:0,B:0};
    for(const f of this.factions){
      const team=this.teamMap.get(f.id);
      if(team) ts[team]+=(sc[f.id]||0);
    }
    return ts;
  }

  // Équipe gagnante (2v2)
  winningTeam(){
    const ts=this.teamScores(); if(!ts) return null;
    if(ts.A>ts.B) return 'A';
    if(ts.B>ts.A) return 'B';
    return 'draw';
  }

  // Savoir si fid est allié avec fid2
  areAllies(fid1, fid2){
    if(!this.teamMap) return false;
    return this.teamMap.get(fid1)===this.teamMap.get(fid2) && fid1!==fid2;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  IA
// ═══════════════════════════════════════════════════════════════════
// IA v1.18 — évalue chaque coup avec 8 critères + lookahead 1 coup
function aiScore(game,fi,ti,r,c){
  const f=game.factions[fi]; const tile=f.hand[ti];
  const stack=game.board[r][c]; const terr=game.getTerrain?game.getTerrain(r,c):'prairie';
  let sc=Math.random()*1.5; // légère variance pour éviter les égalités déterministes

  // ── 1. Valeur terrain ──
  if(terr==='special') sc+=70;
  if(terr==='village') sc+=50; // 3pts + capture stratégique
  if(terr==='sanctu')  sc+=5; // sanctuaire : 1pt comme prairie + bonus accès B4 nearby
  if(terr==='start')   sc+=6;

  // ── 2. Bâtiments ──
  if(isBat(tile)){
    const bIdx=BAT_ORDER.indexOf(tile);
    sc+=35+bIdx*18; // B1=35 B2=53 B3=71 B4=89 base
    if(tile==='B4'){
      sc += terr==='special'?400:-2000; // B4 UNIQUEMENT sur special
    }
    // Bâtiment sur case bonus double la valeur
    if(game.bonusCells&&game.bonusCells.get(r+','+c)) sc+=20;
  }

  // ── 3. Attaque ennemie ──
  const topOwnerIdx=stack.length?stack[stack.length-1][0]:-1;
  const isAlly=game.teamMap&&topOwnerIdx>=0&&game.teamMap.get(game.factions[topOwnerIdx].id)===game.teamMap.get(game.factions[fi].id)&&topOwnerIdx!==fi;
  if(stack.length&&topOwnerIdx!==fi&&!isAlly){
    const [eid,etile]=stack[stack.length-1];
    sc+=20;
    if(isBat(etile)) sc+=60+BAT_ORDER.indexOf(etile)*25; // éliminer bâtiments = très précieux
    // Marge : plus on gagne largement, moins c'est urgent
    const margin=tval(tile)-tval(etile);
    sc+=margin>0?margin*3:0;
  }

  // ── 4. Contrôle de zone (cases alliées voisines) ──
  const nb=neighbors(r,c);
  const allied=nb.filter(([r2,c2])=>{const s=game.board[r2][c2];return s.length&&s[s.length-1][0]===fi;});
  sc+=allied.length*10;

  // ── 5. Pression ennemie (voisins ennemis non-bâtiment qu'on encercle) ──
  const pressEnemy=nb.filter(([r2,c2])=>{
    const s=game.board[r2][c2]; return s.length&&s[s.length-1][0]!==fi&&!isBat(s[s.length-1][1]);
  });
  sc+=pressEnemy.length*5;

  // ── 6. Défense : haute valeur sur case exposée ──
  if(stack.length===0&&typeof tile==='number'){
    const threats=nb.filter(([r2,c2])=>{
      const s=game.board[r2][c2]; return s.length&&s[s.length-1][0]!==fi&&tval(s[s.length-1][1])>tile+1;
    }).length;
    sc+=tile>=7?tile*2.5:tile; // placer hautes valeurs
    sc-=threats*15; // éviter zones menacées
  }

  // ── 7. Contrôle des tuiles spéciales (prépare B4) ──
  if(terr==='special'&&!isBat(tile)) sc+=40; // prendre la case pour préparer B4 plus tard

  // ── 8. Pénalité exposition : case prise par ennemi fort à portée ──
  const exposed=nb.filter(([r2,c2])=>{
    const s=game.board[r2][c2]; return s.length&&s[s.length-1][0]!==fi&&tval(s[s.length-1][1])>=tval(tile)+2;
  }).length;
  sc-=exposed*8;

  return sc;
}

function aiMove(game){
  const fi=game.cur, f=game.factions[fi];
  const powIdx=f.hand.map((c,i)=>[i,c]).filter(([,c])=>isPower(c));
  const moves=game.validMoves(fi);
  const tileMoves=moves.filter(([ti])=>!isPower(f.hand[ti]));

  // IA — pouvoirs FREE : joue le meilleur pouvoir dispo (1 par tour max)
  if(powIdx.length && !f.powUsedThisTurn){
    const sc=game.scores();
    const myScore=sc[f.id]||0;
    const ens=Object.entries(sc).filter(([id])=>Number(id)!==f.id).map(([,v])=>v);
    const bestEnemy=ens.length?Math.max(...ens):0;
    const losing=myScore<bestEnemy-3;
    const tiles=f.hand.filter(t=>!isPower(t)).length;
    const autoPow=['auto','auto_rally','auto_shield','auto_double','auto_inspire'];

    // Scorer chaque pouvoir selon contexte
    let best=null, bestScore=-1;
    for(const [pi,pc] of powIdx){
      if(!autoPow.includes(pc.target)) continue;
      let ps=Math.random()*5;
      if(pc.target==='auto_rally'&&tiles<=2) ps=100;
      else if(pc.target==='auto_inspire'&&losing) ps=85;
      else if(pc.target==='auto_shield'&&losing) ps=80;
      else if(pc.target==='auto_double'&&myScore>=bestEnemy-2) ps=70;

      else if(pc.target==='auto_double') ps=32+Math.random()*15;
      else if(pc.target==='auto_inspire') ps=28+Math.random()*15;
      else ps=12+Math.random()*15;
      if(ps>bestScore){ bestScore=ps; best=[pi,pc]; }
    }
    if(best&&bestScore>=20) return ['power',best[0],null,null];

    // Pouvoirs ciblés — destruction bâtiment ennemi
    for(const [pi,pc] of powIdx){
      if(pc.target==='bomb_enemy'||pc.target==='bat_enemy'||pc.target==='cell_enemy_top'||pc.target==='cell_empty'){
        const ecs=[];
        for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++){
          const st=game.board[r][c]; if(!st.length) continue;
          const [eid,etile]=st[st.length-1];
          if(eid!==fi&&isBat(etile)&&etile!=='B4') ecs.push([r,c,BAT_ORDER.indexOf(etile)]);
        }
        if(ecs.length&&Math.random()<0.6){ ecs.sort((a,b)=>b[2]-a[2]); return ['power',pi,ecs[0][0],ecs[0][1]]; }
      }
    }
  }

  if(!tileMoves.length){
    // Fallback: pouvoir auto si disponible et pas encore joué
    if(!f.powUsedThisTurn) for(const [pi,pc] of powIdx){
      const autos=['auto','auto_rally','auto_shield','auto_double','auto_inspire'];
      if(autos.includes(pc.target)) return ['power',pi,null,null];
    }
    return ['pass',null,null,null];
  }

  const scored=tileMoves.map(([ti,r,c])=>[aiScore(game,fi,ti,r,c),ti,r,c]);
  scored.sort((a,b)=>b[0]-a[0]);
  // Parmi les 3 meilleurs, choisir avec légère variance (évite robotique)
  const top=scored.slice(0,Math.min(3,scored.length));
  const choice=top[Math.floor(Math.random()*top.length)];
  return ['tile',choice[1],choice[2],choice[3]];
}

// ═══════════════════════════════════════════════════════════════════
//  CANVAS RENDERING
// ═══════════════════════════════════════════════════════════════════
const canvas=document.getElementById('board-canvas');
const ctx=canvas.getContext('2d');
// Board dimensions
const BOARD_W=Math.round(PAD_X*2+GRID_SIZE*HEX_R*1.5);
const BOARD_H=Math.round(PAD_Y*2+GRID_SIZE*HEX_H+HEX_H*0.55);
canvas.width=BOARD_W; canvas.height=BOARD_H;

let hoverCell=null, _pulseRAF=0;

function drawBoard(){
  if(!G) return;
  ctx.clearRect(0,0,BOARD_W,BOARD_H);

  // Fond transparent : c'est la zone de plateau (CSS) qui fournit la couleur

  const f=G.cf(), sel=G.sel;
  const hasSel=sel!==null&&!G.over&&!f.isAI&&sel<f.hand.length&&!isPower(f.hand[sel]);

  for(let row=0;row<GRID_SIZE;row++) for(let col=0;col<GRID_SIZE;col++){ try {
    const [cx,cy]=hexCenter(col,row);
    const stack=G.board[row][col];
    const isH=hoverCell&&hoverCell[0]===row&&hoverCell[1]===col;
    const blocked=G.isBlocked(row,col); // lac, montagne, bombée
    const isLake=G.getTerrain?G.getTerrain(row,col)==='lake':false;
    const isMount=G.getTerrain?G.getTerrain(row,col)==='mount':false;
    const isStart=G.getTerrain?G.getTerrain(row,col)==='start':false;
    const frozen=G.frozenCells.has(`${row},${col}`)||G.powFreeze.has(`${row},${col}`);
    const bombed=G.bombedCells.has(`${row},${col}`);

    // Cases bonus
    const bonKey=row+','+col;
    const bonCell=G.bonusCells&&G.bonusCells.get(bonKey);
    const isBonus=!!bonCell&&!blocked&&!bombed;

    // Terrain
    const terrain=G.getTerrain?G.getTerrain(row,col):'prairie';

    // Base color selon terrain
    let base,rim;
    if(bombed){ base='#0b0d11'; rim='#0e0702'; }
    else if(terrain==='lake')   { base='#4f87a8'; rim='#3a6a88'; }
    else if(terrain==='mount')  { base='#7d7889'; rim='#5c5868'; }
    else if(terrain==='village'){ base='#6d9150'; rim='#4d6e36'; }
    else if(terrain==='sanctu') { base='#8a6d2a'; rim='#5e4a18'; }
    else if(terrain==='special') { base='#4b3a6b'; rim='#322748'; }
    else if(terrain==='start')  {
      const _sOwn=G.startOwnerOf?G.startOwnerOf(row,col):null;
      base=(_sOwn!==null&&F_DARK[_sOwn])?F_DARK[_sOwn]:'#56733f';
      rim=(_sOwn!==null&&F_DARK[_sOwn])?F_DARK[_sOwn]:'#3d5530';
    }
    else if(stack.length){ const fi=stack[stack.length-1][0]; base=F_COLOR[fi]; rim=F_DARK[fi]; }
    else if(isH&&(hasSel||pwrMode.active)){ base='#7aa05c'; rim='#4d6e36'; }
    else if(isBonus){ base='#628548'; rim='#4d6e36'; }
    else { base='#6a8f4e'; rim='#4d6e36'; } // prairie

    // Bordure permanente selon terrain (lisibilité)
    let bClr=rim, bW=1, glow=false;
    if(terrain==='village')       { bClr='#d9b44a'; bW=2.5; }  // or épais = village 3pts
    else if(terrain==='special')  { bClr='#9a82c8'; bW=2.5; }    // violet = temple B4
    else if(terrain==='start')    {
      const _sOwnB=G.startOwnerOf?G.startOwnerOf(row,col):null;
      bClr=(_sOwnB!==null&&F_COLOR[_sOwnB])?F_COLOR[_sOwnB]:'#80c060'; bW=2.5;
    }
    if(isH&&!G.over){
      if(pwrMode.active){ bClr='#e84040'; bW=3; glow=true; }
      else if(hasSel&&G.canPlace(row,col,sel)){ bClr='#C8960C'; bW=4; glow=true; }
      else if(hasSel){ bClr='#e84040'; bW=2; }
    }

    // Glow halo
    if(glow){
      ctx.save();
      ctx.shadowColor=bClr; ctx.shadowBlur=12;
      ctx.beginPath(); const gp=hexPts(cx,cy,HEX_R-1);
      ctx.moveTo(gp[0][0],gp[0][1]); for(let i=1;i<6;i++) ctx.lineTo(gp[i][0],gp[i][1]); ctx.closePath();
      ctx.strokeStyle=bClr; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
    }

    // Ombre portée douce, corps en dégradé, liseré lumineux intérieur
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.42)'; ctx.shadowBlur=7; ctx.shadowOffsetY=3;
    drawHex(ctx,cx,cy,HEX_R-2,rim,null,0); ctx.restore();
    drawHex(ctx,cx,cy,HEX_R-3,hexGrad(ctx,cy,HEX_R-3,shade(base,0.14),shade(base,-0.12)),bClr,bW);
    ctx.save(); ctx.globalAlpha=0.16; drawHex(ctx,cx,cy,HEX_R-5.5,null,'#fff',1); ctx.restore();

    // ── Rendu sobre : aplat + un seul symbole par type de case ──
    if(!stack.length&&!bombed){
      ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.textAlign='center'; ctx.textBaseline='middle';
      if(terrain==='lake'){
        ctx.globalAlpha=0.4; ctx.strokeStyle='#d6ecf7'; ctx.lineWidth=1.3;
        for(const dy of [-6,0,6]){
          ctx.beginPath(); ctx.moveTo(cx-10,cy+dy);
          ctx.quadraticCurveTo(cx-5,cy+dy-3,cx,cy+dy); ctx.quadraticCurveTo(cx+5,cy+dy+3,cx+10,cy+dy); ctx.stroke();
        }
      } else if(terrain==='mount'){
        ctx.fillStyle='#4a4558'; ctx.beginPath();
        ctx.moveTo(cx-12,cy+9); ctx.lineTo(cx-3,cy-9); ctx.lineTo(cx+2,cy+1); ctx.lineTo(cx+6,cy-4); ctx.lineTo(cx+12,cy+9); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#eceaf3'; ctx.beginPath();
        ctx.moveTo(cx-3,cy-9); ctx.lineTo(cx-7,cy-1); ctx.lineTo(cx-3,cy-3); ctx.lineTo(cx,cy-1); ctx.closePath(); ctx.fill();
      } else if(terrain==='village'){
        ctx.fillStyle='#efe4c6'; ctx.fillRect(cx-6,cy-3,12,9);
        ctx.fillStyle='#b5503a'; ctx.beginPath(); ctx.moveTo(cx-8,cy-3); ctx.lineTo(cx,cy-10); ctx.lineTo(cx+8,cy-3); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#f5e3a0'; ctx.font='bold 9px Inter,sans-serif'; ctx.fillText('3',cx,cy+14);
      } else if(terrain==='special'){
        ctx.fillStyle='#e6dcf5'; ctx.font='bold 11px Inter,sans-serif'; ctx.fillText('B4',cx,cy+1);
      } else if(terrain==='start'){
        const so=G.startOwnerOf?G.startOwnerOf(row,col):null;
        ctx.fillStyle=(so!==null&&F_COLOR[so])?F_COLOR[so]:'#cfe6b8'; ctx.font='16px serif'; ctx.fillText('★',cx,cy+1);
      } else if(terrain==='sanctu'){
        ctx.fillStyle='#f3d98a'; ctx.beginPath();
        ctx.moveTo(cx,cy-9); ctx.lineTo(cx+7,cy); ctx.lineTo(cx,cy+9); ctx.lineTo(cx-7,cy); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // Zone départ : rendu intégré dans terrain==='start' ci-dessus
    // Contour léger sur cases vides (hors bloquées)
    if(!stack.length&&!bombed&&terrain!=='lake'&&terrain!=='mount'&&terrain!=='sanctu'&&terrain!=='start'){
      ctx.save(); ctx.globalAlpha=0.12;
      ctx.strokeStyle=terrain==='village'?'#90c040':'#6ab030'; ctx.lineWidth=0.5;
      drawHex(ctx,cx,cy,HEX_R-3,null,terrain==='village'?'#90c040':'#6ab030',1);
      ctx.restore();
    }

    // halos d'aura supprimés v1.16
    // Icône et halo case bonus
    if(isBonus){
      const bon=bonCell;
      ctx.save(); ctx.globalAlpha=stack.length?0.28:0.45;
      drawHex(ctx,cx,cy,HEX_R-2,null,bon.type.color,2.5); ctx.restore();
      ctx.font='11px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(bon.type.ico, cx-HEX_R+15, cy-HEX_R+15);
      if(bon.owner!==null){
        ctx.fillStyle=F_COLOR[bon.owner]; ctx.font='bold 7px Inter,sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('★', cx-HEX_R+15, cy-HEX_R+26);
      }
    }

    // Content
    if(blocked&&!isLake&&!isMount){
      // Case bombée seulement
      ctx.font=`${HEX_R}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('💥',cx,cy); continue;
    }
    if(isLake||isMount) continue; // rendu dessin animé déjà fait ci-dessus
    if(bombed){
      ctx.font=`${HEX_R-2}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('💥',cx,cy); continue;
    }

    if(stack.length){
      const n=stack.length, [tfi,tt]=stack[n-1];

      // Bottom pile dots
      if(n>1){
        for(let i=0;i<n-1;i++){
          const [bfi]=stack[i]; const ox=(i-(n-2)/2)*9, oy=HEX_R-10, rr=5;
          ctx.beginPath(); ctx.arc(cx+ox,cy+oy,rr,0,Math.PI*2);
          ctx.fillStyle=F_COLOR[bfi]; ctx.fill();
          ctx.strokeStyle=F_DARK[bfi]; ctx.lineWidth=1; ctx.stroke();
        }
      }

      if(isBat(tt)){
        // Bâtiment : médaillon sombre, anneau de niveau, icône vectorielle du clan
        const bclr=BAT_CLR[tt], cb=F_COLOR[tfi];
        drawHex(ctx,cx,cy,HEX_R-4,hexGrad(ctx,cy,HEX_R-4,shade(F_DARK[tfi],0.12),shade(F_DARK[tfi],-0.3)),null,0);
        drawHex(ctx,cx,cy,HEX_R-4,null,bclr,2.5);
        ctx.save(); ctx.globalAlpha=0.55; drawHex(ctx,cx,cy,HEX_R-8,null,cb,1); ctx.restore();
        drawIcon(ctx,BAT_KEY[tt],cx,cy-5,18,shade(cb,0.1));
        ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillStyle='#f4cf5a'; ctx.font='bold 9px Inter,sans-serif'; ctx.fillText(BAT_VAL[tt],cx,cy+7);
        ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='7px Inter,sans-serif';
        const lbl=BAT_LABEL[tfi][tt]; ctx.fillText(lbl.length>9?lbl.slice(0,8)+'…':lbl,cx,cy+17);
      } else {
        // Tuile numérique : dégradé du clan, icône vectorielle, valeur en grand
        const c0=F_COLOR[tfi];
        drawHex(ctx,cx,cy,HEX_R-4,hexGrad(ctx,cy,HEX_R-4,shade(c0,-0.18),shade(c0,-0.55)),null,0);
        drawHex(ctx,cx,cy,HEX_R-4,null,shade(c0,0.15),2);
        drawIcon(ctx,CLAN_ICON_KEY[tfi],cx,cy-12,11,shade(c0,0.2));
        ctx.save(); ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=3; ctx.shadowOffsetY=1;
        ctx.fillStyle='#fff'; ctx.font='bold 18px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(tt,cx,cy+5); ctx.restore();
      }

      // Pile badge — hauteur de la pile
      if(n>1){
        const bx=cx+HEX_R-12, by=cy-HEX_R+12;
        ctx.beginPath(); ctx.arc(bx,by,9,0,Math.PI*2);
        ctx.fillStyle='#1a0a02'; ctx.fill(); ctx.strokeStyle='#C8960C'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='#C8960C'; ctx.font='bold 8px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(n,bx,by+1);
      }
    }

    // Frozen overlay — rouge vif pour lisibilité physique
    if(frozen){
      ctx.save(); ctx.globalAlpha=0.55;
      drawHex(ctx,cx,cy,HEX_R,'rgba(220,40,40,0.45)',null,0); ctx.restore();
      ctx.save(); ctx.globalAlpha=0.85;
      drawHex(ctx,cx,cy,HEX_R,null,'#ff2020',2.5); ctx.restore();
      ctx.font='11px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🚫',cx,cy-HEX_R+16);
    }
  } catch(hexErr){ ctx.globalAlpha=1; ctx.restore && ctx.restore(); }
  }
  // Dernier coup joué : double anneau (blanc + couleur du clan) pour suivre le jeu de l'IA
  const lm=G.lastMove;
  if(lm&&G.board[lm.row][lm.col].length>0){
    const [lx,ly]=hexCenter(lm.col,lm.row);
    ctx.save();
    drawHex(ctx,lx,ly,HEX_R-1,null,'rgba(255,255,255,0.9)',3);
    drawHex(ctx,lx,ly,HEX_R-4,null,F_COLOR[lm.fid]||'#fff',2);
    // Onde de pose : un anneau qui s'étend et s'efface (700 ms)
    const t=Math.min(1,(performance.now()-(G.lastMoveAt||0))/700);
    if(t<1){
      ctx.globalAlpha=1-t; drawHex(ctx,lx,ly,HEX_R+t*12,null,F_COLOR[lm.fid]||'#fff',2.5);
      if(!_pulseRAF) _pulseRAF=requestAnimationFrame(()=>{ _pulseRAF=0; drawBoard(); });
    }
    ctx.restore();
  }
}

// Éclaircit (amt>0) ou assombrit (amt<0) une couleur #rrggbb
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16); let r=n>>16,g=(n>>8)&255,b=n&255;
  const t=amt<0?0:255, k=Math.abs(amt);
  r=Math.round(r+(t-r)*k); g=Math.round(g+(t-g)*k); b=Math.round(b+(t-b)*k);
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}
// Dégradé vertical sur la hauteur d'un hexagone
function hexGrad(ctx,cy,r,top,bottom){
  const g=ctx.createLinearGradient(0,cy-r,0,cy+r); g.addColorStop(0,top); g.addColorStop(1,bottom); return g;
}
function drawHex(ctx,cx,cy,r,fill,stroke,lw){
  const pts=hexPts(cx,cy,r);
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<6;i++) ctx.lineTo(pts[i][0],pts[i][1]); ctx.closePath();
  if(fill){ ctx.fillStyle=fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=lw; ctx.stroke(); }
}

// Simple seeded RNG
function mulberry32(seed){
  return ()=>{ seed|=0;seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)%256; };
}

// ═══════════════════════════════════════════════════════════════════
//  MENU LOGIC
// ═══════════════════════════════════════════════════════════════════
let playerTypes=[false,true,true,true]; // false=human, true=AI
let humanCount=1, aiCount=3;

// factionStatus[i] : 'human' | 'ai' | 'off'
let factionStatus = ['human','ai','ai','ai'];

function buildFactionGrid(){
  const grid = document.getElementById('faction-grid');
  grid.innerHTML = '';
  for(let i=0;i<4;i++){
    const t = CLAN_TRAITS[i];
    const st = factionStatus[i];
    const card = document.createElement('div');
    card.className = `faction-card status-${st}`;
    card.dataset.fid = i;
    const team2v2 = gameMode==='2v2' ? (teamOf[i]===0?'A':'B') : null;
    card.innerHTML = `
      <div class="f-ico">${F_ICO[i]}</div>
      <div class="f-name">${F_NAME[i]}${team2v2?`<span class="team-badge team-${team2v2.toLowerCase()}-badge">ÉQ. ${team2v2}</span>`:''}</div>
      <div class="f-passif">${t.passifIco} <span>${t.passifLabel}</span></div>
      <div class="f-bats">${BAT_LABEL[i].B1} → ${BAT_LABEL[i].B4}</div>
      <div class="f-status-row">
        ${gameMode==='2v2' ? `
          <button class="f-status-btn ${st==='human'?'active-human':''}"
            onclick="setFactionStatus(${i},'human',event)">👤</button>
          <button class="f-status-btn ${st==='ai'?'active-ai':''}"
            onclick="setFactionStatus(${i},'ai',event)">🤖</button>
          <button class="team-btn team-btn-a ${teamOf[i]===0?'sel':''}"
            onclick="cycleTeam(${i},event)">ÉQ.A</button>
          <button class="team-btn team-btn-b ${teamOf[i]===1?'sel':''}"
            onclick="cycleTeam(${i},event)">ÉQ.B</button>
        ` : `
          <button class="f-status-btn ${st==='human'?'active-human':''}"
            onclick="setFactionStatus(${i},'human',event)">👤 Joueur</button>
          <button class="f-status-btn ${st==='ai'?'active-ai':''}"
            onclick="setFactionStatus(${i},'ai',event)">🤖 IA</button>
          <button class="f-status-btn ${st==='off'?'active-off':''}"
            onclick="setFactionStatus(${i},'off',event)">✕ Absent</button>
        `}
      </div>
    `;
    if(gameMode==='2v2') card.className+=teamOf[i]===0?' team-a':' team-b';
    grid.appendChild(card);
  }
  syncCountsFromStatus();
  if(gameMode==='2v2') updateTeamAssign(); else updateConfig();
}

function setFactionStatus(fid, status, e){
  if(e) e.stopPropagation();
  // Au moins 2 actifs toujours
  const active = factionStatus.filter(s=>s!=='off').length;
  if(status==='off' && active<=2) return; // refus
  factionStatus[fid] = status;
  buildFactionGrid();
}

function syncCountsFromStatus(){
  humanCount = factionStatus.filter(s=>s==='human').length;
  aiCount    = factionStatus.filter(s=>s==='ai').length;
  playerTypes = factionStatus.map(s=>s==='ai');
  document.getElementById('cnt-human').textContent = humanCount;
  document.getElementById('cnt-ai').textContent    = aiCount;
}

function toggleType(fid,e){
  if(e) e.stopPropagation();
  const cur = factionStatus[fid];
  const next = cur==='human'?'ai':cur==='ai'?'off':'human';
  setFactionStatus(fid, next, null);
}

// ── Changelog ──
function toggleCL(el){
  const wrap = el.querySelector('.cl-items-wrap');
  const open = el.classList.toggle('open');
  wrap.style.display = open ? 'block' : 'none';
}
function openChangelog(){
  document.getElementById('changelog-overlay').classList.add('active');
}
function closeChangelog(){
  document.getElementById('changelog-overlay').classList.remove('active');
}

function changeCount(type,delta){
  // Les compteurs +/- synchronisent factionStatus
  if(type==='human'){
    if(delta>0){
      // Convertir un 'ai' ou 'off' en 'human'
      const idx = factionStatus.findIndex(s=>s==='ai');
      if(idx>=0) factionStatus[idx]='human';
      else { const idx2=factionStatus.findIndex(s=>s==='off'); if(idx2>=0) factionStatus[idx2]='human'; }
    } else {
      // Convertir un 'human' en 'ai' si total>2, sinon refus
      const active=factionStatus.filter(s=>s!=='off').length;
      const idx=factionStatus.findIndex(s=>s==='human');
      if(idx>=0 && active>2) factionStatus[idx]='ai';
    }
  } else {
    if(delta>0){
      const idx=factionStatus.findIndex(s=>s==='human');
      if(idx>=0) factionStatus[idx]='ai';
      else { const idx2=factionStatus.findIndex(s=>s==='off'); if(idx2>=0) factionStatus[idx2]='ai'; }
    } else {
      const active=factionStatus.filter(s=>s!=='off').length;
      const idx=factionStatus.findIndex(s=>s==='ai');
      if(idx>=0 && active>2) factionStatus[idx]='off';
    }
  }
  buildFactionGrid();
}

function updateConfig(){
  const total=humanCount+aiCount;
  const ok=total>=2&&total<=4;
  const info=document.getElementById('config-info');
  const names=factionStatus.map((s,i)=>s!=='off'?`${F_ICO[i]} ${F_NAME[i]}`:'').filter(Boolean);
  info.innerHTML=`<span style="color:${ok?'var(--green)':'var(--red)'}">${humanCount} humain${humanCount>1?'s':''} + ${aiCount} IA · ${total} joueur${total>1?'s':''}</span><br><span style="font-size:0.75rem;color:var(--dim)">${names.join(' · ')}</span>`;
  document.getElementById('btn-start').disabled=!ok;
}

// ═══════════════════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════════════════
let G=null, pwrMode={active:false,handIdx:null,pc:null};
// ── Niveau de complexité (1/2/3) ──
let gameLevel=1;
const LEVEL_DESCS=[
  '<b>Niveau 1 — Découverte :</b> pas de passifs clan, pas de cases bonus, pas de cartes pouvoir. Idéal pour apprendre les règles de base.',
  '<b>Niveau 2 — Stratégique :</b> cartes pouvoir actives + cases bonus. Les clans restent identiques en termes de passifs.',
  '<b>Niveau 3 — Expert :</b> passifs asymétriques de chaque clan activés + pouvoirs + cases bonus. Mode complet.'
];
function setLevel(n){
  gameLevel=n;
  document.querySelectorAll('.level-tab').forEach((b,i)=>b.classList.toggle('active',i+1===n));
  document.getElementById('level-desc').innerHTML=LEVEL_DESCS[n-1];
}
// ── Mode de jeu ──
let gameMode='ffa'; // 'ffa' | 'duel' | '2v2'
// teamOf[fid] = 'A' | 'B' | null (2v2 only)
let teamOf=[null,null,null,null];

// ── Gestion du mode de jeu ──
function setGameMode(mode){
  gameMode=mode;
  document.querySelectorAll('.mode-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+mode).classList.add('active');
  const ta=document.getElementById('team-assign');
  const lbl=document.getElementById('menu-section-label');
  if(mode==='2v2'){
    ta.classList.add('visible');
    lbl.textContent='⬡ Assignez les équipes';
    // Forcer 4 joueurs actifs
    factionStatus=['human','ai','human','ai'];
    teamOf=[0,1,0,1]; // A=0, B=1
    buildFactionGrid();
  } else if(mode==='duel'){
    ta.classList.remove('visible');
    lbl.textContent='⬡ Choisissez vos joueurs';
    // Forcer 2 joueurs
    factionStatus=['human','ai','off','off'];
    teamOf=[null,null,null,null];
    buildFactionGrid();
  } else {
    ta.classList.remove('visible');
    lbl.textContent='⬡ Choisissez vos joueurs';
    teamOf=[null,null,null,null];
    buildFactionGrid();
  }
}

function updateTeamAssign(){
  if(gameMode!=='2v2') return;
  const aFids=[], bFids=[];
  for(let i=0;i<4;i++) if(factionStatus[i]!=='off'){
    if(teamOf[i]===0) aFids.push(i);
    else if(teamOf[i]===1) bFids.push(i);
  }
  document.getElementById('team-assign-a').innerHTML=aFids.map(i=>F_ICO[i]+' '+F_NAME[i]).join(' + ')||'—';
  document.getElementById('team-assign-b').innerHTML=bFids.map(i=>F_ICO[i]+' '+F_NAME[i]).join(' + ')||'—';
  // Bouton start actif si 2 dans chaque équipe
  const ok=aFids.length===2&&bFids.length===2;
  document.getElementById('btn-start').disabled=!ok;
}

function cycleTeam(fid, e){
  if(e) e.stopPropagation();
  if(gameMode!=='2v2') return;
  teamOf[fid] = teamOf[fid]===0 ? 1 : 0;
  buildFactionGrid();
}

function startGame(){
  const activeFids = factionStatus.map((s,i)=>s!=='off'?i:-1).filter(i=>i>=0);
  const total = activeFids.length;
  if(total<2||total>4) return;
  // Niveau 1 : pas de pouvoirs / Niveau 2-3 : pouvoirs actifs
  const withPowers = gameLevel >= 2;
  const poolShuffled=shuffle([...POWER_POOL]);
  const factions=[];
  for(let j=0;j<total;j++){
    const fid=activeFids[j];
    const isAI=factionStatus[fid]==='ai';
    const powers = withPowers
      ? [poolShuffled[(j*2)%POWER_POOL.length], poolShuffled[(j*2+1)%POWER_POOL.length]]
      : [];
    factions.push(new Faction(fid, isAI, powers));
  }
  // Construire la map équipe si 2v2
  const teamMap = gameMode==='2v2' ? new Map(activeFids.map(fid=>[fid, teamOf[fid]===0?'A':'B'])) : null;
  G=new Game(factions, {noSnake:false, teamMap, gameLevel});
  pwrMode={active:false,handIdx:null,pc:null};
  clearAITimer(); _aiStuckCount=0; _aiTurnLimit=0; _aiLastCur=-1;
  document.getElementById('screen-menu').style.display='none';
  const sg=document.getElementById('screen-game'); sg.style.display='flex'; sg.classList.add('active');
  buildScoreCards(); renderAll();
  // Draft de départ : IA choisit aléatoirement, humains voient l'overlay
  _runDraft(0);
}

// ── Draft de départ ──
function _runDraft(idx){
  if(idx>=G.np){ renderAll(); if(G.cf().isAI) _aiTimer=setTimeout(doAI,600); return; }
  const f=G.factions[idx];
  const avail=G.getAvailableStarts();
  if(!avail.length){ _runDraft(idx+1); return; }
  if(f.isAI){
    // IA choisit aléatoirement
    const choice=avail[Math.floor(Math.random()*avail.length)];
    G.assignStart(f.id, choice.q);
    renderAll();
    setTimeout(()=>_runDraft(idx+1), 300);
  } else {
    // Afficher overlay draft pour joueur humain
    showDraftOverlay(f, avail, (q)=>{
      G.assignStart(f.id, q);
      hideDraftOverlay();
      renderAll();
      setTimeout(()=>_runDraft(idx+1), 200);
    });
  }
}

function showDraftOverlay(f, avail, onPick){
  let ov=document.getElementById('draft-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='draft-overlay';
    document.body.appendChild(ov);
  }
  const DIR={NW:['↖','Nord-ouest'],NE:['↗','Nord-est'],SW:['↙','Sud-ouest'],SE:['↘','Sud-est']};
  ov.innerHTML=`
    <div class="draft-card">
      <div class="draft-clan">${F_ICO[f.id]}</div>
      <div class="draft-title">${f.name}</div>
      <div class="draft-sub">Choisissez votre case de départ</div>
      <div class="draft-grid">
        ${avail.map(({q})=>`
          <button class="draft-btn" onclick="window._draftPick('${q}')">
            <span class="draft-arrow">${DIR[q]?DIR[q][0]:'★'}</span>
            <span>${DIR[q]?DIR[q][1]:q}</span>
          </button>`).join('')}
      </div>
      <div class="draft-hint">Les adversaires choisissent ensuite</div>
    </div>
  `;
  window._draftPick=(q)=>onPick(q);
  ov.style.display='flex';
}
function hideDraftOverlay(){
  const ov=document.getElementById('draft-overlay');
  if(ov) ov.style.display='none';
}

function showMenu(){
  clearAITimer();
  _aiStuckCount=0; _aiTurnLimit=0; _aiLastCur=-1;
  document.getElementById('screen-game').classList.remove('active');
  document.getElementById('screen-game').style.display='none';
  document.getElementById('screen-menu').style.display='flex';
  document.getElementById('victory-overlay').classList.remove('active');
  G=null;
}

// ═══════════════════════════════════════════════════════════════════
//  UI RENDER
// ═══════════════════════════════════════════════════════════════════
function buildScoreCards(){
  const lvlEl=document.getElementById('topbar-level');
  if(lvlEl&&G) lvlEl.textContent=['','Niv.1 Découverte','Niv.2 Stratégique','Niv.3 Expert'][G.gameLevel]||'';
  const sc=document.getElementById('score-cards'); sc.innerHTML='';
  for(let i=0;i<G.np;i++){
    const f=G.factions[i]; const fid=f.id;
    const card=document.createElement('div');
    card.className='score-card'; card.id=`sc-${i}`;
    const tm=G.teamMap?G.teamMap.get(fid):null;
    const tbadge=tm?`<span class="team-badge team-${tm.toLowerCase()}-badge">ÉQ.${tm}</span>`:'';
    card.innerHTML=`<div class="sc-ico">${F_ICO[fid]}</div>
      <div><div class="sc-name" style="color:${F_COLOR[fid]}">${f.name}${f.isAI?' 🤖':''}${tbadge}</div>
      <div class="sc-pts" id="sc-pts-${i}" style="color:${F_COLOR[fid]}">0</div></div>
      <div class="sc-bats" id="sc-bats-${i}"></div>`;
    sc.appendChild(card);
  }
}

function renderAll(){
  if(!G) return;
  drawBoard();
  renderScores();
  renderHand();
  renderRightPanel();
  renderEventBar();
  renderPowerModeBar();
}

function renderScores(){
  if(!G) return;
  const sc=G.scores();
  for(let i=0;i<G.np;i++){
    const f=G.factions[i]; const fid=f.id;
    const card=document.getElementById(`sc-${i}`);
    if(card){ card.classList.toggle('active',i===G.cur&&!G.over); }
    const pts=document.getElementById(`sc-pts-${i}`);
    if(pts) pts.textContent=`${sc[fid]||0} pt${(sc[fid]||0)>1?'s':''}`;
    const bats=document.getElementById(`sc-bats-${i}`);
    if(bats) bats.innerHTML=f.batPlaced.map(b=>BAT_ICO[fid][b]).join('');
  }
  // Barre score équipe 2v2
  const tsBar=document.getElementById('team-score-bar');
  if(tsBar){
    const ts=G.teamScores();
    if(ts){
      tsBar.classList.add('visible');
      document.getElementById('tsb-pts-a').textContent=ts.A;
      document.getElementById('tsb-pts-b').textContent=ts.B;
    } else { tsBar.classList.remove('visible'); }
  }
}

function renderEventBar(){
  if(!G) return;
  const lrBanner=document.getElementById('last-round-banner');
  if(lrBanner){
    if(G.lastRoundTrigger!==null&&!G.over){
      lrBanner.style.display='block';
      lrBanner.textContent=`⚔️ DERNIER TOUR — ${F_EMO[G.lastRoundTrigger]} ${F_NAME[G.lastRoundTrigger]} a posé son ${BAT_LABEL[G.lastRoundTrigger].B4} · encore ${G.lastRoundLeft} tour${G.lastRoundLeft>1?'s':''}`;
    } else { lrBanner.style.display='none'; }
  }
  // Timer de partie
  const timerEl=document.getElementById('turn-timer');
  if(timerEl&&G.turnLimit){
    const pct=Math.min(100,G.totalTurns/G.turnLimit*100);
    const left=Math.max(0,G.turnLimit-G.totalTurns);
    timerEl.innerHTML=`<span style="color:${pct>80?'#e84040':pct>60?'#f0a020':'var(--or)'}">⌛ ${left} tours</span>`;
    const totalEl=document.getElementById('turn-timer-total');
    if(totalEl) totalEl.textContent=`/ ${G.turnLimit}`;
    const bar=document.getElementById('turn-timer-bar');
    if(bar){ bar.style.width=pct+'%'; bar.style.background=pct>80?'#e84040':pct>60?'#f0a020':'var(--or)'; }
  }
  const ev=G.evCard;
  document.getElementById('ev-ico').textContent=ev?ev.ico:'🎴';
  const tl=G.evTurnsLeft??0;
  const tlStr=tl>0?` · ❶ encore ${tl} action${tl>1?'s':''}`:' · fin du tour';
  document.getElementById('ev-text').textContent=ev?`${ev.name} — ${ev.desc}${tlStr}`:'';
  document.getElementById('ev-msg').textContent=G.event;
}

function renderPowerModeBar(){
  const bar=document.getElementById('power-mode-bar');
  if(pwrMode.active&&pwrMode.pc){
    bar.classList.add('active');
    bar.innerHTML=`✦ ${pwrMode.pc.ico} <b>${pwrMode.pc.name}</b> — Cliquez sur la case cible ✦ &nbsp;
      <span style="font-size:0.75rem;cursor:pointer;text-decoration:underline" onclick="cancelPower()">Annuler</span>`;
  } else { bar.classList.remove('active'); }
}

function renderHand(){
  if(!G) return;
  const f=G.cf();
  const container=document.getElementById('hand-cards');
  const aiThink=document.getElementById('ai-thinking');
  container.innerHTML=''; container.appendChild(aiThink);
  aiThink.style.display=f.isAI?'flex':'none';
  const pass=document.getElementById('btn-pass');
  pass.disabled=f.isAI||G.over;
  const lbl=document.getElementById('hand-label');
  lbl.innerHTML=`MAIN — ${F_ICO[f.id]} ${f.name}`;
  lbl.style.color=F_COLOR[f.id];
  if(f.isAI) return;
  f.hand.forEach((tile,i)=>{
    const card=document.createElement('div');
    card.className='hand-card';
    const isSel=i===G.sel;
    if(isPower(tile)){
      const pc=tile;
      card.classList.add('power-card');
      card.style.background=`linear-gradient(160deg,${pc.color},${pc.dark})`;
      card.style.borderColor=isSel?'#C8960C':pc.color;
      if(isSel) card.classList.add('selected');
      const targetLabels={
        'auto':           '⚡ Effet automatique — aucune cible à choisir',
        'auto_rally':     '🥐 Effet automatique — aucune cible',
        'auto_shield':    '🖼️ Effet automatique — aucune cible',
        'auto_double':    '🫕 Effet automatique — aucune cible',
        'auto_inspire':   '⭐ Effet automatique — aucune cible',
        'bomb_enemy':     '🥖 Cliquez sur une case ennemie (détruite définitivement)',
        'cell_empty':     '🧀 Cliquez sur une case vide (bloquée définitivement)',
        'cell_enemy_top': '🖌️ Cliquez sur une case ennemie (retire le sommet)',
        'own_tile':       '🍷 Cliquez sur l\'une de vos tuiles (non-bâtiment)',
        'bat_enemy':      '🔨 Cliquez sur un bâtiment ennemi visible',
        'own_fortify':    '🪨 Cliquez sur l\'une de vos cases',
      };
      card.innerHTML=`
        <div class="card-badge" style="background:${pc.color}88;border-bottom:1px solid ${pc.color}">✦ POUVOIR ✦</div>
        <div class="card-ico" style="margin-top:16px;font-size:1.6rem">${pc.ico}</div>
        <div class="card-name" style="color:#fff;font-weight:700;margin-top:4px;font-size:0.6rem;letter-spacing:0.04em;font-family:var(--font-ui)">${pc.name}</div>`;
      card.addEventListener('click',()=>selectPower(i));
      card.addEventListener('mouseenter', e=>showPowerTooltip(pc, e));
      card.addEventListener('mousemove',  e=>movePowerTooltip(e));
      card.addEventListener('mouseleave', ()=>hidePowerTooltip());
    } else if(isBat(tile)){
      const ok=f.canPlayBat(tile); const evk=G.evk();
      const disabled=!ok||(evk==='no_bat');
      card.classList.add('bat-card'); if(disabled) card.classList.add('disabled');
      if(isSel) card.classList.add('selected');
      card.style.borderColor=isSel?'#C8960C':(ok?BAT_CLR[tile]:'#333');
      card.innerHTML=`
        <div class="card-badge" style="background:${BAT_CLR[tile]}">BÂTIMENT</div>
        <div class="card-ico" style="margin-top:18px">${BAT_ICO[f.id][tile]}</div>
        <div class="card-name" style="margin-top:2px">${BAT_LABEL[f.id][tile]}</div>
        <div class="card-sub">val. ${BAT_VAL[tile]}</div>`;
      if(!disabled) card.addEventListener('click',()=>selectTile(i));
    } else {
      const evk=G.evk();
      const numOk=!((evk==='only_even'&&tile%2!==0)||(evk==='only_odd'&&tile%2===0));
      if(!numOk) card.classList.add('disabled');
      if(isSel) card.classList.add('selected');
      card.style.background=isSel?`linear-gradient(160deg,${f.color},${f.dark})`:'linear-gradient(160deg,#14181e,#0c0e12)';
      card.style.borderColor=isSel?'#C8960C':f.color;
      card.innerHTML=`
        <div class="card-ico" style="margin-top:4px;font-size:1.2rem">${F_ICO[f.id]}</div>
        <div class="card-val" style="color:${isSel?'#0c0e12':f.color}">${tile}</div>`;
      if(numOk) card.addEventListener('click',()=>selectTile(i));
    }
    container.appendChild(card);
  });
}

function renderRightPanel(){
  if(!G) return;
  const f=G.cf();
  // Current player
  document.getElementById('panel-cur-name').innerHTML=`${F_ICO[f.id]} ${f.name}${f.isAI?' 🤖':''}`;
  document.getElementById('panel-cur-name').style.color=F_COLOR[f.id];
  document.getElementById('panel-cur-sub').textContent=`${f.tilesLeft()} cartes restantes · tour ${Math.floor((G.totalTurns||0)/G.np)+1}/${Math.round(G.turnLimit/G.np)}`;

  // Bat progression
  const bp=document.getElementById('bat-progress'); bp.innerHTML='';
  for(const b of BAT_ORDER){
    const done=f.batPlaced.includes(b);
    const next=!done&&f.canPlayBat(b);
    const div=document.createElement('div');
    div.className=`bat-level ${done?'done':next?'next':'locked'}`;
    div.innerHTML=`<span class="blvl-ico">${BAT_ICO[f.id][b]}</span>
      <span class="blvl-name">${BAT_LABEL[f.id][b]}</span>
      <span class="blvl-val">${done?'✅':next?'⏳':'🔒'} ${BAT_VAL[b]}</span>`;
    bp.appendChild(div);
  }

  // Score detail
  const sd=document.getElementById('score-detail'); sd.innerHTML='';
  const sc=G.scores();
  for(let i=0;i<G.np;i++){
    const f2=G.factions[i];
    const d=document.createElement('div');
    d.style.cssText=`display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:4px;background:rgba(255,255,255,0.03)`;
    d.innerHTML=`<span style="color:${F_COLOR[f2.id]}">${F_ICO[f2.id]}</span>
      <span style="flex:1;font-size:0.8rem;color:${F_COLOR[f2.id]}">${f2.name}</span>
      <span style="font-family:var(--font-ui);font-size:0.9rem;color:${F_COLOR[f2.id]}">${sc[f2.id]||0} pts</span>`;
    sd.appendChild(d);
  }

  // Deck info
  document.getElementById('deck-info').textContent=`${f.deck.length} en deck · ${f.hand.length} en main`;

  // Pouvoirs du joueur (tirés en début de partie)
  let pwrDiv=document.getElementById('player-powers');
  if(!pwrDiv){ pwrDiv=document.createElement('div'); pwrDiv.id='player-powers';
    pwrDiv.style.cssText='margin-top:6px';
    document.getElementById('deck-info').after(pwrDiv); }
  if(f.myPowers&&f.myPowers.length){
    const pwrHtml=f.myPowers.map(p=>`<div style="display:flex;align-items:center;gap:4px;font-size:0.75rem;margin-top:2px;opacity:${f.hand.includes(p)||f.deck.includes(p)?1:0.35}"><span>${p.ico}</span><span style="color:#c084fc">${p.name}</span></div>`).join('');
    pwrDiv.innerHTML=`<div style="font-family:var(--font-ui);font-size:0.62rem;color:var(--or);letter-spacing:0.08em;margin-bottom:2px">MES POUVOIRS</div>${pwrHtml}`;
  } else pwrDiv.innerHTML='';

  // Bonus de cases actifs
  let bonDiv=document.getElementById('active-bonuses');
  if(!bonDiv){ bonDiv=document.createElement('div'); bonDiv.id='active-bonuses';
    bonDiv.style.cssText='margin-top:4px';
    pwrDiv.after(bonDiv); }
  let bonHtml='';
  if(G.bonusCells) for(const [,b] of G.bonusCells)
    if(b.owner===f.id) bonHtml+=`<div style="display:flex;align-items:center;gap:4px;font-size:0.75rem;margin-top:2px"><span>${b.type.ico}</span><span style="color:${b.type.color}">${b.type.name}</span></div>`;
  bonDiv.innerHTML=bonHtml?`<div style="font-family:var(--font-ui);font-size:0.62rem;color:var(--or);letter-spacing:0.08em;margin-top:4px;margin-bottom:2px">BONUS ACTIFS</div>${bonHtml}`:'';
}

// ═══════════════════════════════════════════════════════════════════
//  INTERACTIONS
// ═══════════════════════════════════════════════════════════════════
function selectTile(idx){
  if(!G||G.over||G.cf().isAI) return;
  G.sel = G.sel===idx ? null : idx;
  renderHand(); drawBoard();
}

function selectPower(idx){
  if(!G||G.over||G.cf().isAI) return;
  const f=G.cf(); const pc=f.hand[idx];
  if(!isPower(pc)) return;
  const autoTgts=['auto','auto_rally','auto_shield','auto_double','auto_inspire'];
  if(autoTgts.includes(pc.target)){
    const ok=G.usePower(idx); if(!ok){ flashError(); return; }
    renderAll();
    if(G.over) showVictory();
    else if(G.cf().isAI){ clearAITimer(); _aiTimer=setTimeout(doAI,700); }
    // humain : powUsedThisTurn=true, peut encore jouer sa tuile
  } else {
    G.sel=idx; pwrMode={active:true,handIdx:idx,pc};
    renderHand(); drawBoard(); renderPowerModeBar();
  }
}

function cancelPower(){
  pwrMode={active:false,handIdx:null,pc:null};
  G.sel=null; renderHand(); drawBoard(); renderPowerModeBar();
}

function passTurn(){
  if(!G||G.over||G.cf().isAI) return;
  G.passTurn(); pwrMode={active:false,handIdx:null,pc:null};
  renderAll();
  if(G.over) showVictory();
  else if(G.cf().isAI){ clearAITimer(); _aiTimer=setTimeout(doAI,700); }
}

canvas.addEventListener('click', e=>{
  if(!G||G.over||G.cf().isAI) return;
  if(_isPanning||_justDragged) return; // pas de clic pendant/juste après un glissé
  const [px,py]=canvasEventCoords(e);
  const cell=pixelToHex(px,py); if(!cell) return;
  const [row,col]=cell;

  if(pwrMode.active&&pwrMode.pc){
    const ok=G.usePower(pwrMode.handIdx,row,col);
    if(ok){ pwrMode={active:false,handIdx:null,pc:null}; renderAll();
      if(G.over) showVictory();
      else if(!G.cf().isAI){ /* humain rejoue — rien à faire */ }
      else { clearAITimer(); _aiTimer=setTimeout(doAI,700); } }
    else { flashError(); }
  } else if(G.sel!==null){
    const ok=G.place(row,col);
    if(ok){ hideCtxHint(); renderAll();
      if(G.over) showVictory(); else if(G.cf().isAI){ clearAITimer(); _aiTimer=setTimeout(doAI,700); } }
    else {
      const reason=G.getPlaceRefusalReason(row,col,G.sel);
      if(reason) showCtxHint(reason, e.clientX, e.clientY);
      else flashError();
    }
  }
});

canvas.addEventListener('mousemove', e=>{
  if(_isPanning) return;
  const [px,py]=canvasEventCoords(e);
  const cell=pixelToHex(px,py);
  if(!cell){ hoverCell=null; drawBoard(); hideBonusTooltip(); document.getElementById('tooltip').style.display='none'; return; }

  // Déplacer le tooltip bonus si on reste sur la même case bonus
  if(G&&hoverCell&&hoverCell[0]===cell[0]&&hoverCell[1]===cell[1]){
    const bon=G.bonusCells&&G.bonusCells.get(cell[0]+','+cell[1]);
    if(bon) moveBonusTooltip(e);
    return;
  }

  hoverCell=cell; drawBoard();
  hideBonusTooltip();
  document.getElementById('tooltip').style.display='none';

  if(!G) return;
  const [r,cc]=cell;

  // Priorité 1 : case bonus → tooltip bonus riche
  const bon=G.bonusCells&&G.bonusCells.get(r+','+cc);
  if(bon&&!G.isBlocked(r,cc)&&!G.bombedCells.has(r+','+cc)){
    showBonusTooltip(bon, bon.owner, e);
    return;
  }

  // Priorité 2 : case occupée → tooltip simple
  const stack=G.board[r][cc];
  if(stack.length){
    const [fi,tt]=stack[stack.length-1];
    const tip=document.getElementById('tooltip');
    const name=isBat(tt)?BAT_LABEL[fi][tt]:tt;
    // Valeur défensive réelle de cette tuile
    let defVal=isBat(tt)?tval(tt):tt;
    if(isBat(tt)&&CLAN_TRAITS[fi]&&CLAN_TRAITS[fi].passif==='batBoost') defVal+=1;
    if(!isBat(tt)&&CLAN_TRAITS[fi]&&CLAN_TRAITS[fi].passif==='defBoost'&&typeof tt==='number'&&tt>=6) defVal+=1;
    const defDebuffHere=0; // auras supprimées v1.16
    // Bonus offensif (aura sur cette case si elle était attaquante)
    const ptsB=0; // auraPtsBonus supprimé v1.16
    let infoStr=defVal!==(isBat(tt)?tval(tt):tt)?` 🛡val.réelle:${defVal+defDebuffHere}`:'';
    if(ptsB>0) infoStr+=` ★+${ptsB}`;
    tip.textContent=`${F_EMO[fi]} ${F_NAME[fi]} · ${isBat(tt)?'Bâtiment ':'Valeur '}${name} · Pile: ${stack.length}${infoStr}`;
    tip.style.display='block'; tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY-30)+'px';
  }
});

canvas.addEventListener('mouseleave',()=>{
  hoverCell=null; drawBoard();
  hideBonusTooltip(); hideCtxHint();
  document.getElementById('tooltip').style.display='none';
});

let _ctxTimer=null;
function showCtxHint(reason, cx, cy){
  if(!reason) return;
  const el=document.getElementById('ctx-hint'); if(!el) return;
  el.querySelector('.ctx-ico').textContent=reason.ico;
  el.querySelector('.ctx-msg').textContent=reason.msg;
  const mx=Math.min(cx+16, window.innerWidth-250);
  const my=Math.max(cy-56, 8);
  el.style.left=mx+'px'; el.style.top=my+'px'; el.style.display='flex';
  if(_ctxTimer) clearTimeout(_ctxTimer);
  _ctxTimer=setTimeout(()=>{ el.style.display='none'; },3200);
}
function hideCtxHint(){
  const el=document.getElementById('ctx-hint'); if(el) el.style.display='none';
  if(_ctxTimer){ clearTimeout(_ctxTimer); _ctxTimer=null; }
}

function flashError(){
  canvas.style.outline='2px solid #e84040';
  setTimeout(()=>canvas.style.outline='',400);
}


// ── BONUS CELL TOOLTIP ──────────────────────────────────────
function showBonusTooltip(bon, owner, e){
  const tt = document.getElementById('bonus-tooltip');
  document.getElementById('btt-ico').textContent  = bon.type.ico;
  document.getElementById('btt-name').textContent = bon.type.name;
  document.getElementById('btt-desc').textContent = bon.type.desc;
  // Statut : contrôlée par qui ?
  const statusEl = document.getElementById('btt-status');
  if(owner !== null){
    statusEl.innerHTML = `Contrôlée par <b style="color:${F_COLOR[owner]}">${F_ICO[owner]} ${F_NAME[owner]}</b> — bonus actif`;
  } else {
    statusEl.innerHTML = `<b>Non contrôlée</b> — posez une tuile ici pour activer le bonus`;
  }
  moveBonusTooltip(e);
  tt.classList.add('visible');
}
function moveBonusTooltip(e){
  const tt = document.getElementById('bonus-tooltip');
  const W = window.innerWidth, H = window.innerHeight;
  const tw = tt.offsetWidth||260, th = tt.offsetHeight||130;
  let x = e.clientX + 14, y = e.clientY - th/2;
  if(x + tw > W - 8) x = e.clientX - tw - 14;
  if(y < 8) y = 8;
  if(y + th > H - 8) y = H - th - 8;
  tt.style.left = x+'px'; tt.style.top = y+'px';
}
function hideBonusTooltip(){
  document.getElementById('bonus-tooltip').classList.remove('visible');
}

// ── POWER TOOLTIP ──────────────────────────────────────────────
const _TARGET_LABELS = {
  'auto':           {ico:'⚡', txt:'Effet automatique — aucune cible à sélectionner'},
  'bomb_enemy':     {ico:'🥖', txt:'Cliquez sur une case ennemie — détruite définitivement'},
  'cell_empty':     {ico:'🧀', txt:'Cliquez sur une case vide — bloquée définitivement'},
  'auto_rally':     {ico:'🥐', txt:'Effet automatique — pioche 3 cartes immédiatement'},
  'auto_shield':    {ico:'⚡', txt:'Effet automatique — toutes vos cases inattaquables 2 tours'},
  'auto_double':    {ico:'⚡', txt:'Effet automatique — posez 2 tuiles ce tour'},
  'auto_inspire':   {ico:'⚡', txt:'Effet automatique — vos bâtiments +2 en force ce tour'},
  'cell_enemy':     {ico:'💥', txt:'Cliquez sur une case ennemie occupée'},

  'cell_enemy_top': {ico:'🔝', txt:'Cliquez sur une case ennemie — retire la tuile du dessus'},
  'own_tile':       {ico:'🍷', txt:"Cliquez sur l'une de vos tuiles pour la déplacer (Rivière de vin)"},

};
function showPowerTooltip(pc, e){
  const tt=document.getElementById('power-tooltip');
  document.getElementById('ptt-name').innerHTML=`<span style="font-size:1.3rem">${pc.ico}</span> ${pc.name}`;
  document.getElementById('ptt-desc').textContent=pc.desc;
  const tl=_TARGET_LABELS[pc.target]||{ico:'?',txt:''};
  document.getElementById('ptt-target').innerHTML=`${tl.ico} <b>Utilisation :</b> ${tl.txt}`;
  movePowerTooltip(e);
  tt.classList.add('visible');
}
function movePowerTooltip(e){
  const tt=document.getElementById('power-tooltip');
  const W=window.innerWidth, H=window.innerHeight;
  const tw=tt.offsetWidth||260, th=tt.offsetHeight||120;
  let x=e.clientX+14, y=e.clientY-th/2;
  if(x+tw>W-8) x=e.clientX-tw-14;
  if(y<8) y=8;
  if(y+th>H-8) y=H-th-8;
  tt.style.left=x+'px'; tt.style.top=y+'px';
}
function hidePowerTooltip(){
  document.getElementById('power-tooltip').classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════════
//  AI TURN — avec watchdog anti-blocage
// ═══════════════════════════════════════════════════════════════════
let _aiTimer=null, _aiStuckCount=0, _aiLastCur=-1, _aiTurnLimit=0;

function clearAITimer(){ if(_aiTimer){clearTimeout(_aiTimer);_aiTimer=null;} }

function doAI(){
  clearAITimer();
  if(!G||G.over){ document.getElementById('ai-thinking').style.display='none'; return; }
  if(!G.cf().isAI){ document.getElementById('ai-thinking').style.display='none'; return; }

  // Watchdog : si le même joueur IA reste actif trop longtemps → force passTurn
  if(G.cur===_aiLastCur){ _aiStuckCount++; } else { _aiStuckCount=0; _aiLastCur=G.cur; _aiTurnLimit=0; }
  _aiTurnLimit++;
  if(_aiStuckCount>8 || _aiTurnLimit>40){
    console.warn(`IA watchdog: force pass for player ${G.cur}`);
    _aiStuckCount=0; _aiTurnLimit=0;
    try{ G.passTurn(); } catch(e){ console.error('watchdog passTurn failed:', e); }
    renderAll();
    if(G.over){ showVictory(); return; }
    _aiTimer=setTimeout(doAI,400); return;
  }

  let moved=false;
  try {
    const [type,ti,r,c]=aiMove(G);
    if(type==='tile')       moved=!!G.place(r,c,ti);
    else if(type==='power'){
      moved=!!G.usePower(ti,r,c);
      // Pouvoir FREE : jouer aussi une tuile dans le même tour
      if(moved&&!G.over&&G.cf().isAI){
        const tilePow=G.validMoves(G.cur).filter(([ti2])=>!isPower(G.cf().hand[ti2]));
        if(tilePow.length){
          const scored2=tilePow.map(([ti2,r2,c2])=>[aiScore(G,G.cur,ti2,r2,c2),ti2,r2,c2]);
          scored2.sort((a,b)=>b[0]-a[0]);
          const top=scored2.slice(0,3), ch=top[Math.floor(Math.random()*top.length)];
          G.place(ch[2],ch[3],ch[1]);
        }
      }
    }
    if(!moved){ G.passTurn(); moved=true; }
  } catch(e){
    console.warn('IA exception, force pass:', e);
    try{ G.passTurn(); } catch(e2){ console.error('passTurn failed:', e2); }
    // Ne JAMAIS forcer G.over=true ici — laisser _check() en décider
  }

  renderAll();
  if(G.over){ showVictory(); return; }
  if(G.cf().isAI) _aiTimer=setTimeout(doAI,480);
  else document.getElementById('ai-thinking').style.display='none';
}

// ═══════════════════════════════════════════════════════════════════
//  VICTORY
// ═══════════════════════════════════════════════════════════════════
function showVictory(){
  if(!G) return;
  const sc=G.scores();
  const BAT_PTS={B1:1,B2:2,B3:3,B4:4};

  // ── Calculer le détail des scores par joueur ──
  const detail={}; // fid → {cases, bats, bonus, total}
  for(let i=0;i<G.np;i++){
    const fid=G.factions[i].id;
    let casePts=0, batPts=0, bonusPts=0;
    for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++){
      const st=G.board[r][c]; if(!st.length) continue;
      const [owner,tile]=st[st.length-1]; if(owner!==fid) continue;
      casePts+=G.cellScore(r,c);
      if(isBat(tile)) batPts+=(BAT_PTS[tile]||0);
    }
    // Bonus monument
    for(const [,b] of G.bonusCells)
      if(b.type.effect==='end_bonus'&&b.owner===fid) bonusPts+=3;
    detail[fid]={cases:casePts, bats:batPts, bonus:bonusPts, total:casePts+batPts+bonusPts};
  }

  // ── Déterminer gagnant ──
  let winners, reason, triggerName='';

  if(G.teamMap){
    // Mode 2v2 : victoire par score d'équipe
    const ts=G.teamScores();
    const wt=G.winningTeam();
    const teamColors={A:'#f5c87a',B:'#52b788'};
    const teamFactions={A:G.factions.filter(f=>G.teamMap.get(f.id)==='A'),
                        B:G.factions.filter(f=>G.teamMap.get(f.id)==='B')};
    winners=wt==='draw'
      ? G.factions.map(f=>f.id)
      : teamFactions[wt].map(f=>f.id);
    const wLabel = wt==='draw' ? 'Égalité !'
      : `<span style="color:${teamColors[wt]}">⚔ Équipe ${wt}</span> — ${teamFactions[wt].map(f=>F_ICO[f.id]+' '+f.name).join(' & ')}`;
    document.getElementById('victory-winner').innerHTML=wLabel;
    document.getElementById('victory-winner').style.color=wt!=='draw'?teamColors[wt]:'var(--or)';
    reason = wt==='draw'
      ? `⬡ Égalité parfaite · Éq.A ${ts.A}pts = Éq.B ${ts.B}pts`
      : `🏆 Score combiné · Éq.A ${ts.A}pts · Éq.B ${ts.B}pts`;
  } else {
    const mx=Math.max(...G.factions.map(f=>detail[f.id].total));
    winners=G.factions.filter(f=>detail[f.id].total===mx).map(f=>f.id);
    if(G.lastRoundTrigger!==null){
      triggerName=F_NAME[G.lastRoundTrigger];
      reason=`👑 ${triggerName} a posé ${BAT_LABEL[G.lastRoundTrigger].B4} — Dernier Tour terminé, victoire au score !`;
    } else {
      reason=`⬡ Timer / decks épuisés — victoire au score !`;
    }
    const wf=G.ff(winners[0])||G.factions[0];
    document.getElementById('victory-winner').innerHTML=
      winners.length>1
        ? winners.map(fid=>`${F_ICO[fid]} ${F_NAME[fid]}`).join(' · ') + ' — Égalité !'
        : `${F_ICO[wf.id]} ${wf.name}`;
    document.getElementById('victory-winner').style.color=F_COLOR[wf.id];
  }
  document.getElementById('victory-reason').textContent=reason;

  // ── Tableau des scores ──
  const vs=document.getElementById('victory-scores'); vs.innerHTML='';
  // Trier par score décroissant
  const sorted=[...G.factions].sort((a,b)=>detail[b.id].total-detail[a.id].total);
  sorted.forEach((f,rank)=>{
    const fid=f.id; const d=detail[fid]; const isWinner=winners.includes(fid);
    const div=document.createElement('div');
    div.className='victory-score-item';
    div.style.cssText=`background:linear-gradient(135deg,${F_DARK[fid]},${F_DARK[fid]}aa);border:${isWinner?'2px':'1px'} solid ${F_COLOR[fid]};position:relative;padding:10px 12px;border-radius:8px;`;
    // Médaille
    const medal=rank===0?'🥇':rank===1?'🥈':rank===2?'🥉':'';
    div.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="color:${F_COLOR[fid]};font-family:var(--font-ui);font-weight:700;font-size:0.95rem">${F_ICO[fid]} ${f.name}${isWinner?' 🏆':''}</div>
        <div style="font-size:1.1rem">${medal}</div>
      </div>
      <div style="font-size:1.6rem;font-weight:800;color:${F_COLOR[fid]};text-align:center;margin:4px 0">${d.total} pts</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:0.72rem;opacity:0.85;margin-top:4px">
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:4px;padding:3px">
          <div style="font-size:0.65rem;opacity:0.7">Cases</div>
          <div style="font-weight:700">${d.cases} pts</div>
        </div>
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:4px;padding:3px">
          <div style="font-size:0.65rem;opacity:0.7">Bâtiments</div>
          <div style="font-weight:700">${d.bats} pts</div>
        </div>
        <div style="text-align:center;background:rgba(0,0,0,0.3);border-radius:4px;padding:3px">
          <div style="font-size:0.65rem;opacity:0.7">Bonus</div>
          <div style="font-weight:700">${d.bonus} pts</div>
        </div>
      </div>
      <div style="font-size:0.72rem;opacity:0.6;margin-top:5px;text-align:center">${f.batPlaced.map(b=>BAT_ICO[fid][b]+' '+b).join(' · ')||'Aucun bâtiment'}</div>
    `;
    vs.appendChild(div);
  });

  document.getElementById('victory-overlay').classList.add('active');
}

// ═══════════════════════════════════════════════════════════════════
//  CANVAS RESIZE
// ═══════════════════════════════════════════════════════════════════
// ── Système de zoom ──
let _zoom=1, _panX=0, _panY=0, _isPanning=false, _justDragged=false;
const ZOOM_MIN=0.4, ZOOM_MAX=3.0, ZOOM_STEP=0.25, DRAG_THRESHOLD=6;

// Échelle de base : le plateau tient entièrement dans la zone visible
function _baseScale(wrap){
  return Math.min(wrap.clientWidth/BOARD_W, wrap.clientHeight/BOARD_H, 1);
}
// Empêche de perdre le plateau hors de l'écran
function _clampPan(wrap, cw, ch){
  const mx=Math.abs(cw-wrap.clientWidth)/2+60, my=Math.abs(ch-wrap.clientHeight)/2+60;
  _panX=Math.max(-mx,Math.min(mx,_panX));
  _panY=Math.max(-my,Math.min(my,_panY));
}
function applyZoom(){
  const _h=document.getElementById('zoom-hint'); if(_h&&(_zoom!==1||_panX||_panY)) _h.classList.add('gone');
  const wrap=document.getElementById('board-wrap');
  if(!wrap||!wrap.clientWidth||!wrap.clientHeight) return; // écran caché : on réessaiera au ResizeObserver
  const s=_baseScale(wrap)*_zoom;
  const cw=BOARD_W*s, ch=BOARD_H*s;
  _clampPan(wrap,cw,ch);
  canvas.style.width=cw+'px';
  canvas.style.height=ch+'px';
  canvas.style.position='relative';
  canvas.style.left=_panX+'px';
  canvas.style.top=_panY+'px';
  canvas.style.transition='none';
}
// Zoom autour d'un point (coordonnées écran) : le point sous le curseur/les doigts reste fixe
function zoomAt(newZoom, clientX, clientY){
  const wrap=document.getElementById('board-wrap'); if(!wrap) return;
  newZoom=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,newZoom));
  if(newZoom===_zoom) return;
  const r=wrap.getBoundingClientRect();
  const px=(clientX===undefined?r.left+r.width/2:clientX)-(r.left+r.width/2);
  const py=(clientY===undefined?r.top+r.height/2:clientY)-(r.top+r.height/2);
  const k=newZoom/_zoom;
  _panX=px-(px-_panX)*k; _panY=py-(py-_panY)*k;
  _zoom=newZoom; applyZoom();
}
function fitCanvas(){ _zoom=1; _panX=0; _panY=0; applyZoom(); }
function zoomIn(){ zoomAt(_zoom+ZOOM_STEP); }
function zoomOut(){ zoomAt(_zoom-ZOOM_STEP); }
function zoomReset(){ fitCanvas(); }
function panBy(dx,dy){ _panX+=dx; _panY+=dy; applyZoom(); }

// Clavier : actif uniquement pendant la partie, sans overlay ouvert
function _gameKeysActive(){
  if(!document.getElementById('screen-game').classList.contains('active')) return false;
  const tag=document.activeElement&&document.activeElement.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return false;
  return !document.querySelector('.rules-overlay.active, #victory-overlay.active, #changelog-overlay.active');
}
window.addEventListener('keydown', e=>{
  if(!_gameKeysActive()||e.ctrlKey||e.metaKey||e.altKey) return;
  const S=e.shiftKey?120:40;
  switch(e.key){
    case 'ArrowLeft':  panBy(S,0); break;
    case 'ArrowRight': panBy(-S,0); break;
    case 'ArrowUp':    panBy(0,S); break;
    case 'ArrowDown':  panBy(0,-S); break;
    case '+': case '=': zoomIn(); break;
    case '-': case '_': zoomOut(); break;
    case '0': zoomReset(); break;
    case 'Escape': if(pwrMode.active) cancelPower(); else if(G&&G.sel!==null){ G.sel=null; renderAll(); } return;
    default: return;
  }
  e.preventDefault();
});

// Zoom molette (centré sur le curseur)
const boardWrap=document.getElementById('board-wrap');
boardWrap.addEventListener('wheel', e=>{
  e.preventDefault();
  zoomAt(_zoom*(e.deltaY<0?1.15:1/1.15), e.clientX, e.clientY);
},{passive:false});

// Pan souris : glisser avec le clic gauche (au-delà de 6 px) ; clic milieu/droit/Alt = pan immédiat
let _mDown=null;
canvas.addEventListener('mousedown', e=>{
  const instant=e.button===1||e.button===2||(e.button===0&&e.altKey);
  if(e.button!==0&&!instant) return;
  _mDown={x:e.clientX,y:e.clientY,instant};
  if(instant){ _isPanning=true; canvas.classList.add('panning'); e.preventDefault(); }
});
window.addEventListener('mousemove', e=>{
  if(!_mDown) return;
  if(!_isPanning){
    if(Math.hypot(e.clientX-_mDown.x,e.clientY-_mDown.y)<DRAG_THRESHOLD) return;
    _isPanning=true; canvas.classList.add('panning');
  }
  _panX+=e.clientX-_mDown.x; _panY+=e.clientY-_mDown.y;
  _mDown.x=e.clientX; _mDown.y=e.clientY; applyZoom();
});
window.addEventListener('mouseup', ()=>{
  if(_isPanning){ _justDragged=true; setTimeout(()=>{_justDragged=false;},0); } // évite le clic fantôme après un glissé
  _isPanning=false; _mDown=null; canvas.classList.remove('panning');
});
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// Tactile : 1 doigt = pan (après seuil, sinon c'est un tap), 2 doigts = pinch centré sur les doigts
let _tPrev=null, _tMoved=false, _pinch=null;
canvas.addEventListener('touchstart', e=>{
  _tMoved=false;
  if(e.touches.length===1){ _tPrev={x:e.touches[0].clientX,y:e.touches[0].clientY,sx:e.touches[0].clientX,sy:e.touches[0].clientY}; _pinch=null; }
  else if(e.touches.length===2){ _tMoved=true; _tPrev=null; _pinch=_pinchInfo(e.touches); }
},{passive:true});
function _pinchInfo(ts){
  return {d:Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY),
          x:(ts[0].clientX+ts[1].clientX)/2, y:(ts[0].clientY+ts[1].clientY)/2};
}
canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(e.touches.length===2&&_pinch){
    const cur=_pinchInfo(e.touches);
    _panX+=cur.x-_pinch.x; _panY+=cur.y-_pinch.y; // le centre des doigts entraîne aussi le plateau
    zoomAt(_zoom*cur.d/_pinch.d, cur.x, cur.y);
    applyZoom();
    _pinch=cur;
  } else if(e.touches.length===1&&_tPrev){
    const t=e.touches[0];
    if(!_tMoved&&Math.hypot(t.clientX-_tPrev.sx,t.clientY-_tPrev.sy)<DRAG_THRESHOLD) return;
    _tMoved=true;
    _panX+=t.clientX-_tPrev.x; _panY+=t.clientY-_tPrev.y; applyZoom();
    _tPrev.x=t.clientX; _tPrev.y=t.clientY;
  }
},{passive:false});
canvas.addEventListener('touchend', e=>{
  if(_tMoved){ _justDragged=true; setTimeout(()=>{_justDragged=false;},350); } // bloque le clic synthétisé
  if(e.touches.length===1){ _tPrev={x:e.touches[0].clientX,y:e.touches[0].clientY,sx:e.touches[0].clientX,sy:e.touches[0].clientY}; _pinch=null; }
  else if(e.touches.length===0){ _tPrev=null; _pinch=null; }
},{passive:true});

// pixelToHex tient compte du zoom et du pan
function canvasEventCoords(e){
  const rect=canvas.getBoundingClientRect();
  const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
  return [(e.clientX-rect.left)*scaleX, (e.clientY-rect.top)*scaleY];
}

window.addEventListener('resize',()=>{ fitCanvas(); drawBoard(); });
// L'écran de jeu est caché au chargement (taille 0) : on recadre dès que la zone devient visible ou change de taille
if(window.ResizeObserver) new ResizeObserver(()=>{ applyZoom(); }).observe(boardWrap);


// ══════════════════════════════════════════════════════════════════════
//  SÉLECTEUR DE CARTE ⬡ v1.22
// ══════════════════════════════════════════════════════════════════════

// ── Données 8 cartes standard (même validées côté Python) ──
// Bonus positions : 1 case par quadrant (coords NW), miroir × 4 = 4 cases bonus
// Types bonus : arsenal/citadelle/carrefour/biblio/entrepot/monument (cyclent par carte)
const STD_MAP_BONUS = [
  {pos:[[3,3],[2,4],[4,2],[1,3]], types:['citadelle','carrefour','monument','arsenal']},
  {pos:[[3,2],[4,3],[2,3],[3,4]], types:['biblio','entrepot','arsenal','carrefour']},
  {pos:[[1,4],[3,3],[4,1],[2,2]], types:['monument','citadelle','carrefour','biblio']},
  {pos:[[4,2],[1,3],[3,4],[2,1]], types:['arsenal','monument','entrepot','citadelle']},
  {pos:[[2,3],[4,4],[3,1],[1,2]], types:['carrefour','biblio','monument','entrepot']},
  {pos:[[3,4],[2,1],[4,3],[1,4]], types:['entrepot','arsenal','citadelle','monument']},
  {pos:[[1,1],[4,3],[3,2],[2,4]], types:['biblio','carrefour','arsenal','citadelle']},
  {pos:[[4,1],[3,3],[2,2],[1,4]], types:['citadelle','entrepot','biblio','arsenal']},
];

const STD_MAPS = [
  {name:'Carte 1 — Plaines ouvertes',   desc:'Espaces dégagés, accès rapide au centre. Idéale pour débuter.',   diff:'⭐ Débutant',
   lakes:[[0,0],[1,3],[3,1]], mounts:[[0,3],[4,0]], villages:[[0,2],[2,4],[4,3]]},
  {name:'Carte 2 — Côtes et falaises',  desc:'Lacs en bordure, corridors naturels sur les axes.',                diff:'⭐ Débutant',
   lakes:[[0,1],[0,4],[3,3]], mounts:[[1,0],[2,4]], villages:[[1,2],[3,0],[4,3]]},
  {name:'Carte 3 — Couloirs centraux',  desc:'Lacs intérieurs créent des axes de passage étroits.',             diff:'⭐⭐ Standard',
   lakes:[[1,1],[2,3],[4,1]], mounts:[[0,2],[3,4]], villages:[[0,4],[2,0],[4,3]]},
  {name:'Carte 4 — Diagonale brisée',   desc:'Asymétrie diagonale, positions avancées disputées.',              diff:'⭐⭐ Standard',
   lakes:[[0,2],[2,0],[3,4]], mounts:[[1,4],[4,1]], villages:[[0,1],[3,2],[4,0]]},
  {name:'Carte 5 — Archipel',           desc:'Cluster de lacs en coin, villages éloignés du centre.',           diff:'⭐⭐ Standard',
   lakes:[[0,0],[0,3],[1,1]], mounts:[[2,4],[4,2]], villages:[[1,4],[3,0],[4,3]]},
  {name:'Carte 6 — Col de montagne',    desc:'Montagnes centrales forment un col — passage obligé.',            diff:'⭐⭐⭐ Avancé',
   lakes:[[0,1],[2,3],[4,0]], mounts:[[1,2],[3,4]], villages:[[0,4],[1,0],[4,3]]},
  {name:'Carte 7 — Villages épars',     desc:'Villages dispersés sur tout le plateau, zones multiples.',        diff:'⭐⭐⭐ Avancé',
   lakes:[[0,2],[1,4],[3,0]], mounts:[[0,0],[4,3]], villages:[[1,1],[2,4],[4,0]]},
  {name:'Carte 8 — Grande bataille',    desc:'Configuration dense, chaque case compte. Pour experts.',          diff:'⭐⭐⭐⭐ Expert',
   lakes:[[0,3],[2,1],[4,2]], mounts:[[1,0],[3,3]], villages:[[0,0],[1,4],[3,1]]},
];

const MAP_STARTS  = new Set(['2,2','2,7','7,2','7,7']);
const MAP_TEMPLES = new Set(['4,5','5,4']);

function mapMirror4(r,c){ return [[r,c],[r,9-c],[9-r,c],[9-r,9-c]]; }
function mapExpand(cells){
  const s=new Set();
  cells.forEach(([r,c])=>mapMirror4(r,c).forEach(([mr,mc])=>s.add(mr+','+mc)));
  return s;
}

// Construit la Map terrain complète pour une carte standard
function buildStdTerrain(m){
  const t = new Map();
  MAP_STARTS.forEach(k=>t.set(k,'start'));
  MAP_TEMPLES.forEach(k=>t.set(k,'special')); // 'special' = temple B4 dans le jeu
  mapExpand(m.lakes).forEach(k=>t.set(k,'lake'));
  mapExpand(m.mounts).forEach(k=>t.set(k,'mount'));
  mapExpand(m.villages).forEach(k=>t.set(k,'village'));
  return t;
}

// ── Moteur de rendu mini-hex ──
function _mRng(a){ return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}; }

function _mHexPts(cx,cy,r){
  const p=[];for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
  return p;
}
function _mHex(ctx,cx,cy,r,fill,stroke,lw){
  const p=_mHexPts(cx,cy,r);
  ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);
  for(let i=1;i<6;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke();}
}
function _mLayout(W,H,G=10,pad=14){
  const Rw=W/((G-.5)*Math.sqrt(3)); const Rh=H/((G-1)*1.5+2);
  const R=Math.floor(Math.min(Rw,Rh))-1;
  const HW=R*Math.sqrt(3);
  const tw=(G-.5)*HW, th=(G-1)*R*1.5+2*R;
  return {R,ox:pad+(W-2*pad-tw)/2+HW/2, oy:pad+(H-2*pad-th)/2+R};
}
function _mCenter(row,col,lay){
  const HW=lay.R*Math.sqrt(3);
  return [lay.ox+col*HW+(row%2)*HW/2, lay.oy+row*lay.R*1.5];
}

const MAP_COLORS = {
  prairie:{b:'#6a8f4e',r:'#4d6e36',bd:null,bw:1},
  lake:   {b:'#4f87a8',r:'#3a6a88',bd:null,bw:1},
  mount:  {b:'#7d7889',r:'#5c5868',bd:null,bw:1},
  village:{b:'#6d9150',r:'#4d6e36',bd:'#d9b44a',bw:2},
  special:{b:'#4b3a6b',r:'#322748',bd:'#9a82c8',bw:2},
  start:  {b:'#56733f',r:'#3d5530',bd:'#cfe6b8',bw:2},
};

// Mini-rendu sobre (même langage visuel que le plateau principal)
function _mRenderTerrain(ctx,cx,cy,R,terrain,row,col){
  cx=Math.round(cx); cy=Math.round(cy);
  ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const u=R/16; // unité relative à la taille de l'hexagone
  if(terrain==='lake'){
    ctx.globalAlpha=.4; ctx.strokeStyle='#d6ecf7'; ctx.lineWidth=Math.max(.8,u*1.1);
    for(const dy of [-5,0,5]){
      ctx.beginPath(); ctx.moveTo(cx-8*u,cy+dy*u);
      ctx.quadraticCurveTo(cx-4*u,cy+(dy-3)*u,cx,cy+dy*u); ctx.quadraticCurveTo(cx+4*u,cy+(dy+3)*u,cx+8*u,cy+dy*u); ctx.stroke();
    }
  } else if(terrain==='mount'){
    ctx.fillStyle='#4a4558'; ctx.beginPath();
    ctx.moveTo(cx-10*u,cy+7*u); ctx.lineTo(cx-2.5*u,cy-8*u); ctx.lineTo(cx+1.5*u,cy+1*u); ctx.lineTo(cx+5*u,cy-3.5*u); ctx.lineTo(cx+10*u,cy+7*u); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#eceaf3'; ctx.beginPath();
    ctx.moveTo(cx-2.5*u,cy-8*u); ctx.lineTo(cx-6*u,cy-1*u); ctx.lineTo(cx-2.5*u,cy-3*u); ctx.lineTo(cx,cy-1*u); ctx.closePath(); ctx.fill();
  } else if(terrain==='village'){
    ctx.fillStyle='#efe4c6'; ctx.fillRect(cx-5*u,cy-2*u,10*u,8*u);
    ctx.fillStyle='#b5503a'; ctx.beginPath(); ctx.moveTo(cx-7*u,cy-2*u); ctx.lineTo(cx,cy-9*u); ctx.lineTo(cx+7*u,cy-2*u); ctx.closePath(); ctx.fill();
  } else if(terrain==='special'){
    ctx.fillStyle='#e6dcf5'; ctx.font=`bold ${Math.max(8,10*u)}px Inter,sans-serif`; ctx.fillText('B4',cx,cy+u*.5);
  } else if(terrain==='start'){
    ctx.fillStyle='#cfe6b8'; ctx.font=`${Math.max(9,14*u)}px serif`; ctx.fillText('★',cx,cy+u);
  } else if(terrain==='sanctu'){
    ctx.fillStyle='#f3d98a'; ctx.beginPath();
    ctx.moveTo(cx,cy-8*u); ctx.lineTo(cx+6*u,cy); ctx.lineTo(cx,cy+8*u); ctx.lineTo(cx-6*u,cy); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function renderMapCanvas(ctx, terrain, W, H, hoverKey=null){
  ctx.clearRect(0,0,W,H);
  // fond bois
  ctx.fillStyle='#161b22';ctx.fillRect(0,0,W,H);
  const rng2=_mRng(42);
  for(let y=0;y<H;y+=4){if(rng2()%1>.7)continue;
    ctx.strokeStyle=['#1e232c','#281405','#272e3b','#101217'][Math.floor(rng2()*4)];
    ctx.lineWidth=.7;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.globalAlpha=1;
  const lay=_mLayout(W,H);
  for(let row=0;row<10;row++) for(let col=0;col<10;col++){
    const key=row+','+col;
    const ter=terrain.get(key)||'prairie';
    const [cx,cy]=_mCenter(row,col,lay);
    const mc=MAP_COLORS[ter]||MAP_COLORS.prairie;
    // Ombre
    ctx.save();ctx.globalAlpha=.42;_mHex(ctx,cx,cy+3,lay.R-1,'#050607');ctx.restore();
    // Fond
    _mHex(ctx,cx,cy,lay.R-1,mc.r);
    _mHex(ctx,cx,cy,lay.R-3,mc.b);
    // Rendu graphique
    _mRenderTerrain(ctx,cx,cy,lay.R,ter,row,col);
    // Bordure
    if(mc.bd){
      ctx.save();if(hoverKey===key){ctx.shadowColor=mc.bd;ctx.shadowBlur=6;}
      ctx.strokeStyle=mc.bd;ctx.lineWidth=mc.bw;
      const bp=_mHexPts(cx,cy,lay.R-3);ctx.beginPath();ctx.moveTo(bp[0][0],bp[0][1]);
      for(let i=1;i<6;i++)ctx.lineTo(bp[i][0],bp[i][1]);ctx.closePath();ctx.stroke();ctx.restore();
    } else {
      ctx.strokeStyle=mc.r;ctx.lineWidth=.7;
      const bp=_mHexPts(cx,cy,lay.R-3);ctx.beginPath();ctx.moveTo(bp[0][0],bp[0][1]);
      for(let i=1;i<6;i++)ctx.lineTo(bp[i][0],bp[i][1]);ctx.closePath();ctx.stroke();
    }
    // Hover éditeur
    if(hoverKey===key){
      ctx.save();ctx.globalAlpha=.3;_mHex(ctx,cx,cy,lay.R-3,'#ffffff');ctx.restore();
    }
  }
}

// ── Carte sélectionnée ──
let _selectedMapTerrain = null; // Map à passer au Game
let _selectedBonusPositions = null; // Positions bonus fixes pour carte standard
let _selectedMapName    = '';
let _selectedMapSub     = '';

// ── Navigation écrans ──
function openMapScreen(){
  const activeFids = factionStatus.map((s,i)=>s!=='off'?i:-1).filter(i=>i>=0);
  if(activeFids.length<2) return;
  document.getElementById('screen-menu').style.display='none';
  const sm=document.getElementById('screen-map');
  sm.style.display='flex'; sm.classList.add('active');
  _selectedMapTerrain=null;
  document.getElementById('mc-bar').classList.remove('vis');
  // Construire les cartes si pas encore fait
  if(!document.getElementById('sm-grid').children.length) _buildSmGrid();
  document.querySelectorAll('.sm-card').forEach(c=>c.classList.remove('sel'));
}

function mapScreenBack(){
  document.getElementById('screen-map').style.display='none';
  document.getElementById('screen-map').classList.remove('active');
  document.getElementById('screen-menu').style.display='flex';
  document.getElementById('mc-bar').classList.remove('vis');
}

function switchMapTab(tab){
  document.querySelectorAll('.msm-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.msm-body').forEach(b=>b.classList.remove('active'));
  document.getElementById('maptab-'+tab).classList.add('active');
  document.getElementById('mapbody-'+tab).classList.add('active');
  if(tab==='custom') setTimeout(_initCmeCanvas, 60);
  // Cacher la barre si on change d'onglet
  if(tab!=='std'){
    document.querySelectorAll('.sm-card').forEach(c=>c.classList.remove('sel'));
    if(_activeTab!=='custom') document.getElementById('mc-bar').classList.remove('vis');
  }
  _activeTab=tab;
}
let _activeTab='std';

function mcBarCancel(){
  document.getElementById('mc-bar').classList.remove('vis');
  _selectedMapTerrain=null;
  document.querySelectorAll('.sm-card').forEach(c=>c.classList.remove('sel'));
}

function mcBarGo(){
  if(!_selectedMapTerrain) return;
  window._customTerrainMap = _selectedMapTerrain;
  window._customBonusPositions = _selectedBonusPositions || null;
  // Fermer écran map, lancer le jeu
  document.getElementById('screen-map').style.display='none';
  document.getElementById('screen-map').classList.remove('active');
  document.getElementById('mc-bar').classList.remove('vis');
  startGame();
}

function _showMcBar(name, sub){
  document.getElementById('mc-bar-name').textContent=name;
  document.getElementById('mc-bar-sub').textContent=sub;
  document.getElementById('mc-bar').classList.add('vis');
}

// ── Grille cartes standard ──
function _buildSmGrid(){
  const grid=document.getElementById('sm-grid');
  STD_MAPS.forEach((m,i)=>{
    const card=document.createElement('div');
    card.className='sm-card';
    card.style.animationDelay=(i*.04)+'s';
    card.innerHTML=`
      <div class="sm-diff">${m.diff}</div>
      <div class="sm-check">✓</div>
      <div class="sm-title">${m.name}</div>
      <div class="sm-desc">${m.desc}</div>
      <div class="sm-cvs" id="sm-cvs-${i}"></div>
      <div class="sm-tags">
        <span class="sm-tag">🌊 ${m.lakes.length*4}</span>
        <span class="sm-tag">⛰ ${m.mounts.length*4}</span>
        <span class="sm-tag">🏡 ${m.villages.length*4}</span>
        <span class="sm-tag">⬡×2 temples</span>
      </div>`;
    card.addEventListener('click',()=>_selectStdMap(i,card));
    grid.appendChild(card);
    // Mini canvas (rendu différé pour ne pas bloquer)
    requestAnimationFrame(()=>{
      const wrap=document.getElementById(`sm-cvs-${i}`);
      if(!wrap) return;
      const W=wrap.clientWidth||260, H=Math.round(W*.72);
      const cvs=document.createElement('canvas');
      cvs.width=W*2; cvs.height=H*2;
      cvs.style.width=W+'px'; cvs.style.height=H+'px';
      wrap.appendChild(cvs);
      renderMapCanvas(cvs.getContext('2d'), buildStdTerrain(m), cvs.width, cvs.height);
    });
  });
}

function _selectStdMap(idx, cardEl){
  document.querySelectorAll('.sm-card').forEach(c=>c.classList.remove('sel'));
  cardEl.classList.add('sel');
  const m=STD_MAPS[idx];
  _selectedMapTerrain=buildStdTerrain(m);
  _selectedMapName=m.name;
  _selectedMapSub=`${m.diff} · 12 lacs · 8 montagnes · 12 villages · ✓ symétrie miroir parfaite`;
  // Stocker les positions bonus fixes pour cette carte
  const bonDef=STD_MAP_BONUS[idx];
  if(bonDef){
    // Étaler les 4 positions NW en miroir 4 quadrants
    const QUADS=[[0,0],[0,5],[5,0],[5,5]];
    _selectedBonusPositions=bonDef.pos.map(([lr,lc],i)=>{
      const [or,oc]=QUADS[i];
      return {r:or+lr,c:oc+lc,typeId:bonDef.types[i]};
    });
  } else { _selectedBonusPositions=null; }
  _showMcBar(_selectedMapName, _selectedMapSub);
}

// ── Éditeur custom ──
let _cmeTerrain = new Map();
let _cmeTool    = 'prairie';
let _cmeHover   = null;
let _cmePainting= false;
let _cmeLayout  = null;

function _initCmeTerrain(){
  _cmeTerrain=new Map();
  MAP_STARTS.forEach(k=>_cmeTerrain.set(k,'start'));
  MAP_TEMPLES.forEach(k=>_cmeTerrain.set(k,'special'));
}

function _initCmeCanvas(){
  const cvs=document.getElementById('cme-canvas');
  if(!cvs) return;
  const wrap=cvs.parentElement;
  const W=Math.max(300,(wrap.clientWidth||400)-32);
  const H=Math.round(W*.72);
  cvs.width=W*2; cvs.height=H*2;
  cvs.style.width=W+'px'; cvs.style.height=H+'px';
  _cmeLayout=_mLayout(cvs.width, cvs.height, 10, 20);
  _cmeRedraw();
}

function _cmeRedraw(){
  const cvs=document.getElementById('cme-canvas');
  if(!cvs||!_cmeLayout) return;
  renderMapCanvas(cvs.getContext('2d'), _cmeTerrain, cvs.width, cvs.height, _cmeHover);
}

function _cmeFindHex(e){
  const cvs=document.getElementById('cme-canvas');
  if(!cvs||!_cmeLayout) return null;
  const rect=cvs.getBoundingClientRect();
  const scX=cvs.width/rect.width, scY=cvs.height/rect.height;
  const mx=(e.clientX-rect.left)*scX, my=(e.clientY-rect.top)*scY;
  let best=null,bd=Infinity;
  for(let row=0;row<10;row++) for(let col=0;col<10;col++){
    const [cx,cy]=_mCenter(row,col,_cmeLayout);
    const d=Math.hypot(mx-cx,my-cy);
    if(d<bd){bd=d;best=[row,col];}
  }
  return bd<_cmeLayout.R+3?best:null;
}

function _cmePaint(row,col,erase=false){
  const key=row+','+col;
  if(MAP_STARTS.has(key)||MAP_TEMPLES.has(key)) return;
  if(erase||_cmeTool==='prairie') _cmeTerrain.delete(key);
  else _cmeTerrain.set(key,_cmeTool);
  _cmeUpdateStats();
  _cmeRedraw();
}

// Événements souris sur l'éditeur
(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const cvs=document.getElementById('cme-canvas');
    if(!cvs) return;
    cvs.addEventListener('mousedown',e=>{
      _cmePainting=true;
      const rc=_cmeFindHex(e);
      if(rc) _cmePaint(rc[0],rc[1],e.button===2);
    });
    cvs.addEventListener('mousemove',e=>{
      const rc=_cmeFindHex(e);
      const nk=rc?rc[0]+','+rc[1]:null;
      if(nk!==_cmeHover){_cmeHover=nk;_cmeRedraw();}
      if(_cmePainting&&e.buttons===1&&rc) _cmePaint(rc[0],rc[1]);
    });
    cvs.addEventListener('mouseup',()=>{_cmePainting=false;});
    cvs.addEventListener('mouseleave',()=>{_cmePainting=false;_cmeHover=null;_cmeRedraw();});
    cvs.addEventListener('contextmenu',e=>{
      e.preventDefault();
      const rc=_cmeFindHex(e);
      if(rc) _cmePaint(rc[0],rc[1],true);
    });
    // Touch
    cvs.addEventListener('touchstart',e=>{
      e.preventDefault();
      const rc=_cmeFindHex(e.touches[0]);
      if(rc) _cmePaint(rc[0],rc[1]);
    },{passive:false});
    cvs.addEventListener('touchmove',e=>{
      e.preventDefault();
      const rc=_cmeFindHex(e.touches[0]);
      if(rc) _cmePaint(rc[0],rc[1]);
    },{passive:false});
    // Resize
    window.addEventListener('resize',()=>{
      if(document.getElementById('mapbody-custom').classList.contains('active'))
        _initCmeCanvas();
    });
    // Init terrain
    _initCmeTerrain();
    _cmeUpdateStats();
  });
})();

function setCmeTool(t){
  if(t==='temple'||t==='start') return;
  _cmeTool=t;
  document.querySelectorAll('.cme-tool[data-t]').forEach(b=>b.classList.toggle('active',b.dataset.t===t));
  const hints={
    prairie:'Prairie : cliquez pour effacer',
    lake:'Lac 🌊 : cliquez pour placer',
    mount:'Montagne ⛰ : cliquez pour placer',
    village:'Village 🏡 : cliquez pour placer (3pts)',
  };
  document.getElementById('cme-hint').textContent=(hints[t]||'Cliquez')+'  ·  Maintenez pour peindre  ·  Clic droit pour effacer';
}

function _cmeCount(t){ let n=0; _cmeTerrain.forEach(v=>{if(v===t)n++;}); return n; }

function _cmeIsSymmetric(){
  for(const t of ['lake','mount','village']){
    const cells=[];
    _cmeTerrain.forEach((v,k)=>{if(v===t)cells.push(k.split(',').map(Number));});
    if(!cells.length) continue;
    if(cells.length%4!==0) return false;
    const ks=new Set(cells.map(([r,c])=>r+','+c));
    for(const [r,c] of cells){
      for(const [mr,mc] of mapMirror4(r,c)){
        if(!ks.has(mr+','+mc)) return false;
      }
    }
  }
  return true;
}

function _cmeUpdateStats(){
  const targets={lake:12,mount:8,village:12};
  ['lake','mount','village'].forEach(t=>{
    const n=_cmeCount(t), tgt=targets[t];
    document.getElementById('cme-s-'+t).textContent=n;
    document.getElementById('cme-cnt-'+t).textContent=n;
    const sym=document.getElementById('cme-sym-'+t);
    const cnt=document.getElementById('cme-cnt-'+t);
    if(n===0){sym.textContent='';cnt.className='ct-cnt';}
    else if(n===tgt){sym.textContent=' ✓';sym.className='cs-sym cs-ok';cnt.className='ct-cnt';}
    else{sym.textContent=n>tgt?` +${n-tgt}`:` ${n-tgt}`;sym.className='cs-sym cs-warn';cnt.className=n>tgt?'ct-cnt over':'ct-cnt';}
  });
  const sym=_cmeIsSymmetric();
  const box=document.getElementById('cme-symbox');
  box.className='cme-symbox '+(sym?'ok':'warn');
  document.getElementById('cme-symtext').textContent=sym
    ?'✓ Carte symétrique — équitable pour tous'
    :'Asymétrique — certains joueurs avantagés';
}

function cmeApplySym(){
  const nw={};
  _cmeTerrain.forEach((v,k)=>{
    if(v==='start'||v==='special') return;
    const [r,c]=k.split(',').map(Number);
    if(r<=4&&c<=4) nw[k]=v;
  });
  _initCmeTerrain();
  Object.entries(nw).forEach(([k,v])=>{
    const [r,c]=k.split(',').map(Number);
    mapMirror4(r,c).forEach(([mr,mc])=>{
      const mk=mr+','+mc;
      if(!MAP_STARTS.has(mk)&&!MAP_TEMPLES.has(mk)) _cmeTerrain.set(mk,v);
    });
  });
  _cmeUpdateStats(); _cmeRedraw();
}

function cmeRandomMap(){
  // Génère une carte aléatoire symétrique avec les bonnes proportions
  _initCmeTerrain();
  const terrains=[...Array(3).fill('lake'),...Array(2).fill('mount'),...Array(3).fill('village')];
  // Cases NW disponibles (pas starts ni temples)
  const nwCands=[];
  for(let r=0;r<5;r++) for(let c=0;c<5;c++){
    const k=r+','+c;
    if(!MAP_STARTS.has(k)&&!MAP_TEMPLES.has(k)) nwCands.push([r,c]);
  }
  // Shuffle des candidats
  for(let i=nwCands.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));[nwCands[i],nwCands[j]]=[nwCands[j],nwCands[i]];}
  terrains.forEach((t,i)=>{
    if(i>=nwCands.length) return;
    const [r,c]=nwCands[i];
    mapMirror4(r,c).forEach(([mr,mc])=>{
      const mk=mr+','+mc;
      if(!MAP_STARTS.has(mk)&&!MAP_TEMPLES.has(mk)) _cmeTerrain.set(mk,t);
    });
  });
  _cmeUpdateStats(); _cmeRedraw();
}

function cmeClear(){
  _initCmeTerrain();
  _cmeUpdateStats(); _cmeRedraw();
  document.getElementById('mc-bar').classList.remove('vis');
}

function cmeConfirm(){
  const sym=_cmeIsSymmetric();
  if(!sym&&!confirm('La carte n\'est pas symétrique — certains joueurs pourraient être avantagés.\n\nUtiliser quand même cette carte ?')) return;
  // Construire la Map finale (ajouter 'village' sans style → le jeu gère)
  const finalT=new Map(_cmeTerrain);
  // Remplacer 'special' → 'special' déjà bon, 'start' → 'start' déjà bon
  _selectedMapTerrain=finalT;
  _selectedMapName='Carte personnalisée';
  _selectedMapSub=`${_cmeCount('lake')} lacs · ${_cmeCount('mount')} montagnes · ${_cmeCount('village')} villages${sym?' · ✓ symétrique':' · ⚠ asymétrique'}`;
  _showMcBar(_selectedMapName, _selectedMapSub);
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
buildFactionGrid();
fitCanvas();
// Fermer changelog en cliquant en dehors
document.getElementById('changelog-overlay').addEventListener('click',function(e){
  if(e.target===this) closeChangelog();
});

// ── Tiroir d'infos (mobile) ──
function togglePanel(open){
  document.body.classList.toggle('panel-open', open===undefined ? !document.body.classList.contains('panel-open') : open);
}
window.addEventListener('keydown', e=>{ if(e.key==='Escape') togglePanel(false); });
