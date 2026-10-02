/* Calendar-based grow rhythm. Fixed Europe/Berlin calendar, DST-safe boundaries.
 * Pure functions keep offline replay, action limits and UI on the same rules.
 */
(function(root){
  'use strict';
  const zone='Europe/Berlin',limit=7,wait=3600000,dayMs=86400000;
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
  const boundaries=new Map();
  function dateKey(now){
    const parts=Object.fromEntries(formatter.formatToParts(new Date(now)).map(p=>[p.type,p.value]));
    return parts.year+'-'+parts.month+'-'+parts.day;
  }
  function ordinal(key){const [y,m,d]=key.split('-').map(Number);return Math.round(Date.UTC(y,m-1,d)/dayMs);}
  function keyForOrdinal(n){return new Date(n*dayMs).toISOString().slice(0,10);}
  function nextMidnight(now){
    const key=dateKey(now);if(boundaries.has(key))return boundaries.get(key);
    let lo=Math.floor(now),hi=lo+27*3600000;
    while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(dateKey(mid)===key)lo=mid;else hi=mid;}
    boundaries.clear();boundaries.set(key,hi);return hi;
  }
  function create(now){return {version:1,dateKey:dateKey(now),used:0,lastTurnAt:0,closed:false,lastObservedAt:now};}
  function migrate(state,now){
    if(state.rhythm?.version===1)return state.rhythm;
    const rhythm=create(now);
    // Start today's clock at migration. Never retroactively penalize legacy saves.
    rhythm.used=Math.max(0,Math.min(limit,Number(state.turn?.turnsToday)||0));
    rhythm.lastTurnAt=Math.max(0,Number(state.turn?.lastTurnAt)||0);
    state.rhythm=rhythm;return rhythm;
  }
  function effectiveNow(r,now){return Math.max(Number(now)||0,Number(r.lastObservedAt)||0);}
  function reconcile(r,now,completeDay){
    const current=effectiveNow(r,now),target=dateKey(current);let completed=0;
    let cursor=ordinal(r.dateKey),end=ordinal(target),start=cursor;
    while(cursor<end){
      if(!r.closed){
        if(completeDay(r.used))completed++;
        else{cursor=end;r.dateKey=target;r.used=0;r.closed=false;break;}
      }
      cursor++;r.dateKey=keyForOrdinal(cursor);r.used=0;r.closed=false;
    }
    r.lastObservedAt=current;
    return {completed,dateChanged:end>start,now:current};
  }
  function availability(r,now){
    const current=effectiveNow(r,now),remaining=Math.max(0,limit-r.used);
    const cooldown=r.lastTurnAt?Math.max(0,wait-(current-r.lastTurnAt)):0;
    const dailyWait=r.closed||remaining===0?Math.max(0,nextMidnight(current)-current):0;
    return {ok:!r.closed&&remaining>0&&cooldown===0,used:r.used,remaining,
      wait:Math.max(cooldown,dailyWait),closed:r.closed,reason:r.closed?'closed':remaining===0?'limit':cooldown>0?'cooldown':'ready'};
  }
  function commit(r,now){
    const a=availability(r,now);if(!a.ok)return false;
    r.used++;r.lastTurnAt=effectiveNow(r,now);r.lastObservedAt=r.lastTurnAt;return true;
  }
  function close(r,now,completeDay){
    if(r.closed)return false;
    if(!completeDay(r.used))return false;
    r.closed=true;r.lastObservedAt=effectiveNow(r,now);return true;
  }
  root.GanjariumClock={zone,limit,wait,dateKey,ordinal,nextMidnight,create,migrate,reconcile,availability,commit,close};
})(typeof window==='undefined'?globalThis:window);
