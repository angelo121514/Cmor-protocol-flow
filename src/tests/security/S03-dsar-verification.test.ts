import {it,expect} from "vitest";
import {anonymous,actor} from "../integration/fixtures";
it("S-03 DSAR executor and token columns are not browser accessible",async()=>{for(const client of [anonymous(),await actor("ownerA")]){expect((await client.rpc("execute_dsar",{p_id:crypto.randomUUID(),p_hash:null})).error).not.toBeNull();expect((await client.from("data_subject_requests").select("token_hash")).error).not.toBeNull();}});
