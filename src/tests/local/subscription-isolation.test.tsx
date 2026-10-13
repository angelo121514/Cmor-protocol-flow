import {renderHook,waitFor,act} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({restaurant:{id:'A'},status:vi.fn(),card:vi.fn()}));
vi.mock('../../hooks/useAuth',()=>({useAuth:()=>({restaurant:mocks.restaurant})}));
vi.mock('../../services/flowService',()=>({getSubscriptionStatus:mocks.status}));
vi.mock('../../config/supabase',()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:mocks.card})})})}}));
import {useFlowSubscription} from '../../hooks/useFlowSubscription';
const status=(id:string)=>({success:true,subscription:{id,status:1,subscription_start:'2026-01-01',trial_ends_at:null,current_period_start:'2026-01-01',current_period_end:null,flow_plans:null}});
beforeEach(()=>{vi.clearAllMocks();mocks.restaurant={id:'A'};mocks.card.mockResolvedValue({data:{credit_card_type:'Visa',last4_card_digits:'1234'},error:null});});
describe('Subscription data stays scoped across restaurant changes',()=>{
 it('ignores an old restaurant response after the new restaurant has loaded',async()=>{
  let oldResolve!:(value:ReturnType<typeof status>)=>void;
  mocks.status.mockImplementationOnce(()=>new Promise(resolve=>{oldResolve=resolve;})).mockResolvedValueOnce(status('B'));
  const {result,rerender}=renderHook(()=>useFlowSubscription());
  mocks.restaurant={id:'B'};rerender();await waitFor(()=>expect(result.current.subscription?.id).toBe('B'));
  await act(async()=>{oldResolve(status('A'));});expect(result.current.subscription?.id).toBe('B');expect(mocks.card).toHaveBeenCalledOnce();
 });
 it('clears previous subscription and card data when refreshing fails',async()=>{
  mocks.status.mockResolvedValueOnce(status('A')).mockResolvedValueOnce({success:false,error:'Synthetic failure'});
  const {result}=renderHook(()=>useFlowSubscription());await waitFor(()=>expect(result.current.hasCardLinked).toBe(true));
  await act(async()=>{await result.current.refresh();});expect(result.current.subscription).toBeNull();expect(result.current.hasCardLinked).toBe(false);expect(result.current.error).toBe('Synthetic failure');
 });
});
