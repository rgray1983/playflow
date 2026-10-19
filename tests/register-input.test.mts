import assert from "node:assert/strict";
import {test} from "node:test";
import {registerKey} from "../src/lib/counter/register-input";
test("first touch digit replaces the exact balance, then accepts dollars and cents",()=>{
 let amount=registerKey("20.00","1",true);for(const key of ["2",".","5","0"])amount=registerKey(amount,key);assert.equal(amount,"12.50");assert.equal(registerKey(amount,"9"),"12.50");
});
test("touch pad handles decimal-only starts, backspace, clear and duplicate decimal",()=>{
 assert.equal(registerKey("20.00",".",true),"0.");assert.equal(registerKey("12.50","Backspace"),"12.5");assert.equal(registerKey("12.50","Clear"),"");assert.equal(registerKey("12.50","."),"12.50");assert.equal(registerKey("","Backspace"),"");
});
test("touch amount entry rejects signs, exponent notation and excess precision/length",()=>{
 assert.equal(registerKey("12","-"),"12");assert.equal(registerKey("12","e"),"12");assert.equal(registerKey("9999999","9"),"9999999");assert.equal(registerKey("12.50","0"),"12.50");
});
