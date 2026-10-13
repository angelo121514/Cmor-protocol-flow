import {it,expect} from "vitest";
import {anonymous,actor} from "../integration/fixtures";
it("S-02 browser cannot invoke paid automation",async()=>{for(const client of [anonymous(),await actor("ownerA"),await actor("admin")])expect((await client.rpc("auto_approve_registration_v2",{p_request_id:crypto.randomUUID(),p_plan:"pro"})).error).not.toBeNull();});
