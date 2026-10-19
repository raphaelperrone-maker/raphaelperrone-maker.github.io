// Tests des règles (1 sur 10, Passer) — lance le jeu dans Chromium et interroge G directement.
// Usage : npm i playwright && node tests/regles.js   (sortie ≠ 0 si un test échoue)
const { chromium } = require('playwright');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
(async()=>{
  const b = await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})});
  const p = await (await b.newContext({viewport:{width:1200,height:800}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+require('path').resolve(__dirname,'..','bataille_traditions.html')+''); await p.waitForTimeout(400);
  // Partie niveau 3, 2 joueurs : humain Vignerons (id1) vs IA Boulangers (id0)
  await p.evaluate(()=>{ setGameMode('duel'); factionStatus=['ai','human','off','off']; setLevel(3); startGame(); });
  await p.waitForTimeout(300);
  // draft : le premier humain choisit, puis on arrête l'IA
  await p.evaluate(()=>{ clearAITimer(); });
  await p.locator('.draft-btn').first().click().catch(()=>{});
  await p.waitForTimeout(600);
  await p.evaluate(()=>{ clearAITimer(); });
  const setup=await p.evaluate(()=>{
    G.over=false;
    const vig=G.factions.find(f=>f.id===1), foe=G.factions.find(f=>f.id===0);
    G.cur=1; G.curIdx=G.turnOrder.indexOf(1);
    G.board.forEach(r=>r.forEach(s=>s.length=0));
    // cherche 2 prairies voisines (A,B) et une prairie C loin de tout
    const prairie=(r,c)=>G.getTerrain(r,c)==='prairie';
    let A=null,B=null,C=null;
    for(let r=1;r<9&&!B;r++)for(let c=1;c<9&&!B;c++){
      if(!prairie(r,c)) continue;
      const nb=neighbors(r,c).filter(([r2,c2])=>prairie(r2,c2));
      if(nb.length>=2){ A=[r,c]; B=nb[0]; }
    }
    for(let r=9;r>=0&&!C;r--)for(let c=9;c>=0&&!C;c--){ if(prairie(r,c)&&Math.hypot(r-A[0],c-A[1])>5) C=[r,c]; }
    vig.hasPlaced=true;
    G.board[A[0]][A[1]].push([vig.id,5]);
    G.board[B[0]][B[1]].push([foe.id,10]);
    G.board[C[0]][C[1]].push([foe.id,10]);
    vig.hand=[1,2,3,4,5,6]; vig.hand.push({id:'P_DUMP',target:'auto_dump',name:'x',ico:'x',desc:''});
    window._B=B; window._C=C; window._A=A;
    return {A,B,C};
  });
  const [br,bc]=await p.evaluate(()=>window._B), [cr,cc]=await p.evaluate(()=>window._C);
  const can=(r,c,evk)=>p.evaluate(([r,c,evk])=>{ const old=G.evk; if(evk) G.evk=()=>evk; const v=G.canPlace(r,c,0); G.evk=old; return v; },[r,c,evk]);
  ok(await can(br,bc,'calme')===true,'1 sur 10 adjacent, calme plat : autorisé');
  ok(await can(br,bc,'no_attack')===false,'Trêve sacrée : 1 sur 10 refusé');
  ok(await can(br,bc,'only_no1')===false,'Marée montante (pas de 1) : refusé');
  ok(await can(br,bc,'only_even')===false,'Éclipse (pairs seulement) : refusé');
  ok(await can(cr,cc,'calme')===false,'1 sur 10 NON adjacent : refusé (adjacence requise)');
  ok(await can(br,bc,'extended_adj')===true,'Tir longue portée : autorisé si à portée');
  const f1=await p.evaluate(()=>{ const [r,c]=window._B; G.fortifiedCells=new Set([r+','+c]); const v=G.canPlace(r,c,0); G.fortifiedCells=new Set(); return v; });
  ok(f1===false,'Barricade (case fortifiée) : refusé');
  const f2=await p.evaluate(()=>{ const foe=G.factions.find(f=>f.id!==G.cf().id); const [r,c]=window._B; G.bonusCells.set(r+','+c,{type:{effect:'shield',id:'citadelle'},owner:foe.id}); const v=G.canPlace(r,c,0); G.bonusCells.delete(r+','+c); return v; });
  ok(f2===false,'Citadelle : refusé');
  const des=await p.evaluate(()=>{ const [r,c]=window._B; G.cur=1; G.curIdx=G.turnOrder.indexOf(1); const me=G.cf(); me.hand=[1,2,3]; G.sel=null;
    G.evk=()=>'calme'; const v=G.place(r,c,0); return {v,empty:G.board[r][c].length===0}; });
  ok(des.v&&des.empty,'1 sur 10 autorisé : la pile est bien détruite');
  // Passer : toute la main (pouvoir compris) est remélangée dans la pioche, main complète redistribuée
  const pass=await p.evaluate(()=>{
    const me=G.cf(); me.hand=[1,2,3,4,5,6,{id:'P_DUMP',target:'auto_dump',name:'x',ico:'x',desc:''}]; const before=me.hand.length+me.deck.length; const hadPower=true;
    const expect=me.handSize(G);
    me.passAndRedraw(G);
    const powerKept=[...me.hand,...me.deck].some(t=>t&&t.id==='P_DUMP'); return {powerKept,before,after:me.hand.length+me.deck.length,hadPower,handNow:me.hand.length,expect,name:me.name};
  });
  ok(pass.powerKept,'Passer : le pouvoir est remélangé (jamais perdu)');
  ok(pass.before===pass.after,'Passer : aucune carte perdue ('+pass.before+'→'+pass.after+')');
  ok(pass.handNow===pass.expect,'Passer : main complète ('+pass.handNow+' / attendu '+pass.expect+', '+pass.name+')');
  console.log(errs.join('|')||'aucune erreur JS'); await b.close();
})();
