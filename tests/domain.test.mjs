import test from 'node:test';
import assert from 'node:assert/strict';
import {content} from '../src/content.js';
import {sanitizeCart,cartSummary,stayQuote} from '../src/domain.js';
test('cart trusts only orderable item identifiers and bounded integer quantities',()=>{
 assert.deepEqual(sanitizeCart({beef1:2,soup:-1,kienyeji1:1.5,lemontea:21,'wine-shots':2,customgroup:1,unknown:3},content.menu),{beef1:2});
 assert.deepEqual(sanitizeCart(null,content.menu),{});
 const summary=cartSummary({beef1:2,lemontea:1},content.menu);
 assert.equal(summary.total,2900);assert.equal(summary.count,3);assert.equal(summary.lines.length,2);
});
const base={room:'garden',guests:'2',arrival:'2030-06-10',departure:'2030-06-12',lunch:true,dinner:true};
test('stay includes breakfast and respects the corrected single and double room rates',()=>{
 assert.deepEqual(stayQuote(base,content,'2030-06-01'),{room:'Rooms at the Garden',guests:2,nights:2,rate:2800,roomTotal:5600,breakfastIncluded:true,lunch:72,dinner:100,total:5772});
 assert.equal(stayQuote({...base,room:'terrace',guests:'1',lunch:false,dinner:false},content,'2030-06-01').total,7000);
 assert.equal(content.rooms.find(room=>room.id==='garden').single,1500);
 assert.equal(content.rooms.find(room=>room.id==='terrace').double,5000);
});
test('stay rejects invalid dates, past arrivals, unsupported occupancy and long stays',()=>{
 for(const change of [{arrival:'2030-02-30'},{departure:'2030-06-09'},{departure:'2030-06-10'},{departure:'2030-08-10'},{guests:'3'},{room:'unknown'},{arrival:'2020-06-01'}]) assert.ok(stayQuote({...base,...change},content,'2030-06-01').error,JSON.stringify(change));
});
test('stay nights remain correct across month and daylight-saving boundaries',()=>{
 assert.equal(stayQuote({...base,arrival:'2030-03-09',departure:'2030-03-11'},content,'2030-01-01').nights,2);
 assert.equal(stayQuote({...base,arrival:'2030-12-31',departure:'2031-01-02'},content,'2030-01-01').nights,2);
});
