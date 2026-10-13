import {it,expect} from "vitest";
import {anonymous} from "../integration/fixtures";
it("S-04 legacy password RPCs remain unavailable",async()=>{expect((await anonymous().rpc("admin_login",{p_email:"admin@fixture.example.test",p_password_hash:"invalid"})).error).not.toBeNull();expect((await anonymous().rpc("restaurant_login",{p_email:"owner@fixture.example.test",p_password_hash:"invalid"})).error).not.toBeNull();});
