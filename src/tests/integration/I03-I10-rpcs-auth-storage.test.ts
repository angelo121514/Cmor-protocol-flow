import {describe,it,expect} from "vitest";
import {anonymous,actor,fixture} from "./fixtures";
describe("I-03..I-10 local contracts",()=>{
 it("public catalog contains the seeded published dish",async()=>{const {data,error}=await anonymous().from("menu_items").select("id").eq("id",fixture.menu.A);expect(error).toBeNull();expect(data?.[0]?.id).toBe(fixture.menu.A);});
 it("UUID alone cannot open a table session",async()=>expect((await anonymous().rpc("start_table_session",{p_table_id:fixture.restaurants.A})).error).not.toBeNull());
 it("admin AAL1 is not an SQL administrator",async()=>{const admin=await actor("admin");const {data,error}=await admin.rpc("is_admin");expect(error).toBeNull();expect(data).toBe(false);});
 it("anonymous and owner cannot upload arbitrary content or access another tenant path",async()=>{
  const blob=new Blob(["not-an-image"],{type:"image/jpeg"});expect((await anonymous().storage.from("menu-images").upload(`${fixture.restaurants.A}/test.jpg`,blob)).error).not.toBeNull();
  const owner=await actor("ownerA");expect((await owner.storage.from("menu-images").createSignedUrl(`${fixture.restaurants.B}/test.jpg`,60)).error).not.toBeNull();
 });
 it("quantity100 and lines50 succeed through authenticated PostgREST without trusting client prices",async()=>{
  const owner=await actor("ownerA");
  for(const [items,total] of [
   [[{menu_item_id:fixture.menu.A,quantity:100,base_price:1}],100000],
   [Array.from({length:50},()=>({menu_item_id:fixture.menu.A,quantity:1,base_price:1})),50000],
  ] as const){
   const result=await owner.rpc("write_pos_order",{p_restaurant_id:fixture.restaurants.A,p_key:crypto.randomUUID(),p_order:{items}});
   expect(result.error).toBeNull();expect(result.data?.total).toBe(total);expect(result.data?.status).toBe("accepted");
  }
 });
 it("quantity 101 and 51 lines are denied by the trusted pricing operation",async()=>{
  const owner=await actor("ownerA");for(const items of [[{menu_item_id:fixture.menu.A,quantity:101}],Array.from({length:51},()=>({menu_item_id:fixture.menu.A,quantity:1}))])expect((await owner.rpc("write_pos_order",{p_restaurant_id:fixture.restaurants.A,p_key:crypto.randomUUID(),p_order:{items}})).error).not.toBeNull();
 });
});
