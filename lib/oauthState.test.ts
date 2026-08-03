import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createOAuthState,secureEqual,verifyOAuthState} from './oauthState';

describe('OAuth state protection',()=>{
  beforeEach(()=>vi.stubEnv('OAUTH_STATE_SECRET','test-secret-that-is-long-and-random-enough'));

  it('round-trips a signed state bound to provider and user',()=>{
    const state=createOAuthState('upstox','user-123');
    expect(verifyOAuthState(state,'upstox').userId).toBe('user-123');
  });

  it('rejects tampered, missing, and cross-provider state',()=>{
    const state=createOAuthState('upstox','user-123');
    expect(()=>verifyOAuthState(`${state.slice(0,-1)}x`,'upstox')).toThrow();
    expect(()=>verifyOAuthState('','upstox')).toThrow();
    expect(()=>verifyOAuthState(state,'google-drive')).toThrow();
  });

  it('compares state values without permissive missing-value behavior',()=>{
    expect(secureEqual('same','same')).toBe(true);
    expect(secureEqual('','')).toBe(false);
    expect(secureEqual('same','different')).toBe(false);
  });
});
