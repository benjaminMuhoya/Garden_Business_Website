import test from 'node:test';
import assert from 'node:assert/strict';
import {content} from '../src/content.js';
import {sanitizeCart,cartSummary,stayQuote} from '../src/domain.js';
test('cart trusts only known item identifiers and bounded integer quantities',()=>{
 assert.deepEqual(sanitizeCart({salad:2,soup:-1,chicken:1.5,tea:21,unknown:3},content.menu),{salad:2});
 assert.deepEqual(sanitizeCart(null,content.menu),{});
 const summary=cartSummary({salad:2,tea:1},content.menu);
 assert.equal(summary.total,34);assert.equal(summary.count,3);assert.equal(summary.lines.length,2);
});
const base={room:'garden',guests:'2',arrival:'2030-06-10',departure:'2030-06-12',board:'breakfast',lunch:true,dinner:true};
test('stay prices room occupancy and every selected meal per guest per night',()=>{
 assert.deepEqual(stayQuote(base,content,'2030-06-01'),{room:'Garden Room',guests:2,nights:2,rate:115,roomTotal:230,breakfast:48,lunch:72,dinner:100,total:450});
 assert.equal(stayQuote({...base,room:'terrace',guests:'1',board:'bed',lunch:false,dinner:false},content,'2030-06-01').total,250);
});
test('stay rejects invalid dates, past arrivals, unsupported occupancy and long stays',()=>{
 for(const change of [{arrival:'2030-02-30'},{departure:'2030-06-09'},{departure:'2030-06-10'},{departure:'2030-08-10'},{guests:'3'},{room:'unknown'},{board:'invalid'},{arrival:'2020-06-01'}]) assert.ok(stayQuote({...base,...change},content,'2030-06-01').error,JSON.stringify(change));
});
test('stay nights remain correct across month and daylight-saving boundaries',()=>{
 assert.equal(stayQuote({...base,arrival:'2030-03-09',departure:'2030-03-11'},content,'2030-01-01').nights,2);
 assert.equal(stayQuote({...base,arrival:'2030-12-31',departure:'2031-01-02'},content,'2030-01-01').nights,2);
});
