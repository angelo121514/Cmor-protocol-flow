import {it,expect} from "vitest";
import {anonymous,fixture} from "../integration/fixtures";
it("S-01 public direct order insertion and internal pricing are denied",async()=>{
 expect((await anonymous().from("orders").insert({restaurant_id:fixture.restaurants.A,total:1})).error).not.toBeNull();
 expect((await anonymous().rpc("price_order_items",{p_restaurant_id:fixture.restaurants.A,p_items:[{menu_item_id:fixture.menu.A,quantity:1}]})).error).not.toBeNull();
});
