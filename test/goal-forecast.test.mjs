import test from 'node:test';import assert from 'node:assert/strict';
import {projectGoalSavings,projectWishSavings} from '../analysis.js';
function fixture(){return {book:{settings:{allocations:{debt:0,sinking:0,goals:100,wishes:0,flex:0}},goals:[{id:'goal',name:'Reserve',cost:2000,saved:0,style:'Automatic'}],sinking:[],wishes:[]},data:{asOf:'2026-09-19',ready:true,cash:{balance:200,bufferTarget:400},protectedSavings:0,accounts:[],upcoming:[],nextPaychecks:[{date:'2026-09-20',amount:500},{date:'2026-09-27',amount:500}],plan:{forecast:[{date:'2026-09-19',cash:200},{date:'2026-09-20',cash:700},{date:'2026-09-21',cash:500},{date:'2026-09-27',cash:1000},{date:'2026-09-28',cash:1000}]}}};}
test('later paychecks can save after a past shortfall, with future bills and earlier savings reserved',()=>{
 const {book,data}=fixture(),before=JSON.stringify({book,data});const r=projectGoalSavings(book,data);
 assert.equal(r.rows[0].contribution,100);assert.equal(r.rows[1].contribution,500);assert.equal(r.projectedSaved,600);assert.ok(r.rows.every(p=>p.lowestAfter>=400));assert.equal(JSON.stringify({book,data}),before);
});
test('same-day bill shortfall blocks savings until a later paycheck recovers',()=>{
 const {book,data}=fixture();data.plan.forecast[1].cash=350;data.plan.forecast[2].cash=350;const r=projectGoalSavings(book,data);assert.equal(r.rows[0].contribution,0);assert.equal(r.rows[1].contribution,500);
});
test('empty, paused and completed goals receive zero and target limits prevent overfunding',()=>{
 const {book,data}=fixture();book.goals[0].cost=150;assert.equal(projectGoalSavings(book,data).projectedContributions,150);
 book.goals[0].style='Pause';assert.equal(projectGoalSavings(book,data).projectedContributions,0);
 book.goals[0].style='Automatic';book.goals[0].saved=150;assert.equal(projectGoalSavings(book,data).projectedContributions,0);
 book.goals=[];assert.equal(projectGoalSavings(book,data).projectedContributions,0);
});

test('forecast goal contributions follow paycheck allocation percentages',()=>{const {book,data}=fixture();const before=JSON.stringify(book);book.settings.allocations={debt:0,sinking:0,goals:0,wishes:0,flex:100};assert.equal(projectGoalSavings(book,data).projectedContributions,0);book.settings.allocations.goals=50;book.settings.allocations.flex=50;assert.equal(projectGoalSavings(book,data).projectedContributions,300);book.goals[0].cost=120;assert.equal(projectGoalSavings(book,data).projectedContributions,120);book.goals[0].cost=2000;assert.equal(JSON.stringify(book.goals),JSON.stringify(JSON.parse(before).goals));});
test('each future paycheck contributes when its own window has room after earlier reservations',()=>{
 const {book,data}=fixture();data.plan.forecast.push({date:'2026-09-29',cash:400});
 const result=projectGoalSavings(book,data);
 assert.equal(result.rows[0].contribution,100);
 assert.equal(result.rows[1].contribution,0);
 assert.equal(result.goals[0].projected,100);
});
test('wish projection follows the Wish List paycheck share and respects the cash buffer',()=>{
 const {book,data}=fixture();book.settings.allocations={debt:0,sinking:0,goals:0,wishes:100,flex:0};book.goals=[];book.wishes=[{id:'wish',name:'Headphones',cost:2000,saved:0,style:'Automatic'}];
 const result=projectWishSavings(book,data);assert.equal(result.rows[0].contribution,100);assert.equal(result.rows[1].contribution,500);assert.equal(result.projectedSaved,600);assert.ok(result.rows.every(p=>p.lowestAfter>=400));
 book.wishes[0].style='Pause';assert.equal(projectWishSavings(book,data).projectedContributions,0);
});
