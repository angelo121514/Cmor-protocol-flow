import {describe,it,expect} from 'vitest';
import {toMinorUnits,distributeMoney,percentageAmount,currencyDecimals,sumMoney,multiplyMoney,splitGrossTax} from '../../../shared/money';
import {readAllPages} from '../../services/pagination';
import {detectImage} from '../../../shared/image-validation';
describe('Money invariants',()=>{
 it.each(['CLP','USD','BRL','BOB','PEN'])('split conserves every minimum unit in %s',currency=>{
  const decimals=currencyDecimals(currency),total=decimals?10.01:10001;
  for(let n=1;n<=100;n++)expect(distributeMoney(total,n,decimals).reduce((s,v)=>s+toMinorUnits(v,decimals),0)).toBe(toMinorUnits(total,decimals));
 });
 it('rounds half up consistently, including cents',()=>{
  expect(toMinorUnits(1.005,2)).toBe(101);expect(toMinorUnits(0.5)).toBe(1);expect(percentageAmount(5,10)).toBe(1);expect(percentageAmount(0.05,10,2)).toBe(0.01);expect(percentageAmount(1.15,10,2)).toBe(0.12);
 });
 it('adds catalog cents and multiplies quantities without floating point accumulation',()=>{
  expect(sumMoney([0.1,0.2],2)).toBe(0.3);expect(multiplyMoney(sumMoney([0.1,0.2],2),3,2)).toBe(0.9);
  expect(sumMoney(Array.from({length:50},()=>multiplyMoney(0.29,100,2)),2)).toBe(1450);
  expect(splitGrossTax(1000,0.19,0)).toEqual({subtotal:840,tax:160,total:1000});
  expect(()=>sumMoney([Number.MAX_SAFE_INTEGER,1],0)).toThrow();expect(()=>multiplyMoney(100,1.5,0)).toThrow();
 });
 it.each([NaN,Infinity,-Infinity])('rejects nonfinite %s',value=>expect(()=>toMinorUnits(value)).toThrow());
});
describe('Pagination and uploads',()=>{
 it('reads more than max_rows without truncation',async()=>{
  const fixture=Array.from({length:1251},(_,id)=>({id}));
  expect((await readAllPages(async(from,to)=>({data:fixture.slice(from,to+1),error:null}))).length).toBe(1251);
 });
 it('does not return partial data on a subsequent failure',async()=>{
  await expect(readAllPages(async from=>from?{data:null,error:'db'}:{data:[1,2],error:null},2)).rejects.toThrow();
 });
 it('rejects unsupported content, spoofed SVG and oversized files',()=>{
  expect(detectImage(new TextEncoder().encode('<svg>abcdefghij</svg>'))).toBeNull();expect(detectImage(new Uint8Array(2097153))).toBeNull();
  expect(detectImage(new Uint8Array([255,216,255,...Array(9).fill(0)]))).toBe('image/jpeg');
 });
});
