import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({aal:vi.fn(),list:vi.fn(),enroll:vi.fn(),verify:vi.fn(),permission:vi.fn()}));
vi.mock('../../config/supabase',()=>({supabase:{rpc:mocks.permission,auth:{mfa:{getAuthenticatorAssuranceLevel:mocks.aal,listFactors:mocks.list,enroll:mocks.enroll,challengeAndVerify:mocks.verify}}}}));
import {MfaGate} from '../../components/MfaGate';
beforeEach(()=>{vi.clearAllMocks();mocks.permission.mockResolvedValue({data:true,error:null});mocks.aal.mockResolvedValue({data:{currentLevel:'aal1'},error:null});mocks.list.mockResolvedValue({data:{totp:[]},error:null});});
describe('Actual MFA enrollment component',()=>{
 it('enrolls, challenges, keeps invalid codes blocked and unlocks only on verification success',async()=>{
  mocks.enroll.mockResolvedValue({data:{id:'factor',totp:{secret:'fixture-only',qr_code:'<svg/>'}},error:null});mocks.verify.mockResolvedValueOnce({error:'invalid'}).mockResolvedValueOnce({error:null});
  render(<MfaGate><p>Protected administration</p></MfaGate>);
  fireEvent.click(await screen.findByText('Configurar autenticador'));await screen.findByText('fixture-only');
  fireEvent.change(screen.getByLabelText('Código de seis dígitos'),{target:{value:'123456'}});fireEvent.click(screen.getByText('Verificar'));await screen.findByRole('alert');expect(screen.queryByText('Protected administration')).toBeNull();
  fireEvent.change(screen.getByLabelText('Código de seis dígitos'),{target:{value:'654321'}});fireEvent.click(screen.getByText('Verificar'));await screen.findByText('Protected administration');expect(mocks.verify).toHaveBeenLastCalledWith({factorId:'factor',code:'654321'});
 });
 it('failed assurance lookup does not render privileged children',async()=>{
  mocks.aal.mockResolvedValue({data:null,error:'unavailable'});render(<MfaGate><p>Protected administration</p></MfaGate>);await waitFor(()=>expect(screen.getByRole('alert')).toBeDefined());expect(screen.queryByText('Protected administration')).toBeNull();
 });
 it('an AAL2 JWT cannot bypass a blocked profile or revoked factor',async()=>{
  mocks.aal.mockResolvedValue({data:{currentLevel:'aal2'},error:null});mocks.permission.mockResolvedValue({data:false,error:null});render(<MfaGate><p>Protected administration</p></MfaGate>);await screen.findByRole('alert');expect(screen.queryByText('Protected administration')).toBeNull();
 });
});
