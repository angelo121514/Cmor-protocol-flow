import {describe,it,expect,beforeAll} from "vitest";
import {actor,fixture} from "./fixtures";
let owner:Awaited<ReturnType<typeof actor>>;
beforeAll(async()=>{owner=await actor("ownerA");});
describe("I-01 actual authenticated tenant isolation",()=>{
 it("owner A cannot mutate the known existing dish in B",async()=>{
  const {data,error}=await owner.from("menu_items").update({base_price:1}).eq("id",fixture.menu.B).select("id");
  expect(error===null?data?.length===0:true).toBe(true);
  const other=await actor("ownerB");const result=await other.from("menu_items").select("base_price").eq("id",fixture.menu.B).single();
  expect(result.error).toBeNull();expect(result.data?.base_price).toBe(1000);
 });
 it("cannot switch to an unrelated restaurant",async()=>expect((await owner.rpc("switch_restaurant",{p_restaurant_id:fixture.restaurants.B})).error).not.toBeNull());
 it("cannot create an authenticated POS order in B",async()=>{
  expect((await owner.rpc("write_pos_order",{p_restaurant_id:fixture.restaurants.B,p_key:crypto.randomUUID(),p_order:{items:[{menu_item_id:fixture.menu.B,quantity:1}]}})).error).not.toBeNull();
 });
 it("cannot forge audit or consent identity",async()=>{
  expect((await owner.from("audit_log").insert({action:"payment_confirmed",actor_id:fixture.actors.admin.id})).error).not.toBeNull();
  expect((await owner.from("consents").insert({subject_id:fixture.actors.ownerB.id,scope:"marketing",purpose:"test",legal_basis:"consent",granted:true})).error).not.toBeNull();
 });
});
