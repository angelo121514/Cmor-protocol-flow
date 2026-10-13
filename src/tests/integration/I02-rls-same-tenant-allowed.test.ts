import {describe,it,expect} from "vitest";
import {actor,fixture} from "./fixtures";
describe("I-02 actual own tenant",()=>{
 it("authenticated owner reads a real own dish",async()=>{const client=await actor("ownerA");const {data,error}=await client.from("menu_items").select("id,name").eq("id",fixture.menu.A).single();expect(error).toBeNull();expect(data?.id).toBe(fixture.menu.A);});
 it("POS reprices and returns a complete persisted accepted/paid order",async()=>{
  const client=await actor("ownerA"),key=crypto.randomUUID();const input={p_restaurant_id:fixture.restaurants.A,p_key:key,p_order:{items:[{menu_item_id:fixture.menu.A,quantity:1,base_price:1}],payment_method:"cash",payment_status:"paid",customer_name:"Synthetic guest",customer_phone:"fixture-pos"}};
  const first=await client.rpc("write_pos_order",input);expect(first.error).toBeNull();expect(first.data).toMatchObject({total:1000,status:"accepted",payment_status:"paid"});expect(first.data.id).toBeTruthy();expect(first.data.access_token).toBeUndefined();
  const replay=await client.rpc("write_pos_order",input);expect(replay.error).toBeNull();expect(replay.data.id).toBe(first.data.id);
  const conflict=await client.rpc("write_pos_order",{...input,p_order:{...input.p_order,customer_name:"Changed"}});expect(conflict.error).not.toBeNull();
 });
});
