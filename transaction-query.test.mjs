import test from 'node:test';import assert from 'node:assert/strict';import {amountView} from './public/transaction-query.js';
const rows=[{id:'1',amount:-12.5,date:'2026-09-01'},{id:'2',amount:1000,date:'2026-09-03'},{id:'3',amount:-350,date:'2026-09-02'},{id:'4',amount:-50,date:'2026-09-04'}];
test('most expensive expenses first, incoming last, without mutating source',()=>{assert.deepEqual(amountView(rows).map(t=>t.id),['3','4','1','2']);assert.equal(rows[0].id,'1')});
test('inclusive magnitude filters use positive values for negative debits',()=>{assert.deepEqual(amountView(rows,{min:'12.50',max:'50'}).map(t=>t.id),['4','1']);assert.equal(amountView(rows,{min:'60',max:'50'}).length,0);assert.equal(amountView(rows,{min:'0',max:'0'}).length,0)});
test('ascending amount and newest-first options',()=>{assert.deepEqual(amountView(rows,{sort:'cheapest'}).map(t=>t.id),['1','4','3','2']);assert.deepEqual(amountView(rows,{sort:'newest'}).map(t=>t.id),['4','2','3','1'])});
