import { describe, it, expect } from 'vitest'
import { newGame } from '../../engine/newGame'
import { applyAction, resourceTotalOf, type Action } from '../../engine/actions'
import { planAiActions, liveCenters, freeBuildingSlot, reconcileDeltas } from './aiController'
import type { PlayerId } from '../../types'

function totalRes(p:any){ return p.regions.reduce((n:number,r:any)=>n+(r.empty?0:r.stored),0) }
function roads(p:any){ return p.placed.filter((c:any)=>c.cardId==='base-road').length }
function setl(p:any){ return p.placed.filter((c:any)=>c.cardId==='base-settlement'||c.cardId==='base-city').length }

describe('probe',()=>{
  it('AI build: cost charged vs structures gained', ()=>{
    let s = newGame({seed:3})
    // give p1 a 2nd road (frontier) -> pendingRoads=1 in liveToSim, and full resources
    s = {...s, players:{...s.players, p1:{...s.players.p1, placed:[...s.players.p1.placed, {cardId:'base-road', slot:'road-2'}]}}}
    for(const r of s.players.p1.regions) r.stored = 3 as any
    const before = { res: totalRes(s.players.p1), roads: roads(s.players.p1), setl: setl(s.players.p1) }
    // run the AI build phase exactly like the orchestrator (pay:false + reconcile)
    const ai:PlayerId='p1'
    const plan = planAiActions({...s, activePlayer:'p1', phase:'action'}, 'p1', 'medium', {v:9})
    console.log('PLAN: settlements',plan.settlements,'cities',plan.cities,'extraRoads',plan.extraRoads,'buildings',plan.buildings)
    for(let i=0;i<plan.settlements;i++){ if(s.regionStack.length<2)break; s=applyAction(s,{type:'expandSpine',player:ai}) }
    for(let i=0;i<plan.extraRoads;i++) s=applyAction(s,{type:'buildPiece',player:ai,piece:'road',end:'right',pay:false})
    for(let i=0;i<plan.cities;i++){ const c=liveCenters(s,ai).find(x=>x.kind==='settlement'); if(!c)break; s=applyAction(s,{type:'upgradeCity',player:ai,seat:c.seat,pay:false}) }
    for(const cid of plan.buildings){ if(!s.players[ai].hand.includes(cid))continue; s=applyAction(s,{type:'playCard',player:ai,cardId:cid,slot:freeBuildingSlot(s,ai)??undefined,pay:false}) }
    for(const d of reconcileDeltas(s, ai, plan.totals.p1 as any)) s=applyAction(s,{type:'addResource',player:ai,resource:d.resource,count:d.count})
    const after = { res: totalRes(s.players.p1), roads: roads(s.players.p1), setl: setl(s.players.p1) }
    const spent = before.res - after.res
    const expected = (after.setl-before.setl)*4 /*settlement(net, city adds +1)*/ + (after.roads-before.roads)*3 + plan.cities*1 /*city upgrade extra*/
    console.log('SPENT', spent, '| structures: +settlements/cities', after.setl-before.setl, '+roads', after.roads-before.roads, '+cities', plan.cities)
    console.log('roughly-expected cost for those structures:', expected)
    expect(true).toBe(true)
  })
})
