import type {AuthController} from '../../hooks/useAuth';
import type {Profile} from '../../config/authClient';
import type {Restaurant} from '../../config/supabase';

type AuthFixtureInput=Omit<Partial<AuthController>,'profile'|'restaurant'|'restaurants'> & {
  profile?:Partial<Profile>;restaurant?:Partial<Restaurant>;restaurants?:Partial<Restaurant>[];
};
function restaurantRow(overrides:Partial<Restaurant>):Restaurant {
  return {id:'fixture',name:'Synthetic',slug:'synthetic',phone:'+56900000000',email:'synthetic@fixture.example.test',
    subscription_plan:'pro',status:'active',is_active:true,created_at:'2026-10-06',updated_at:'2026-10-06',...overrides};
}
/** UI fixture only; authorization is tested separately through PostgreSQL/PostgREST. */
export function authFixture(input:AuthFixtureInput):AuthController {
  return {user:{id:'fixture',email:'synthetic@fixture.example.test'},loading:false,refresh:async()=>{},switchRestaurant:async()=>{},
    ...input,profile:input.profile?{id:'fixture',role:'owner',restaurant_id:'fixture',display_name:'Synthetic',created_at:'2026-10-06',...input.profile}:null,
    restaurant:input.restaurant?restaurantRow(input.restaurant):null,restaurants:(input.restaurants||[]).map(restaurantRow)};
}
