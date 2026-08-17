import { describe,expect,it } from 'vitest';
import { checkoutReturnUrls,parseCheckoutInput } from './checkoutInput';
describe('checkout input boundary',()=>{
  const origins=new Set(['https://visualmelody.netlify.app']);
  it('accepts only catalog keys and exact origins',()=>{ expect(parseCheckoutInput({catalogKey:'creator_pro_annual',returnOrigin:'https://visualmelody.netlify.app',continuationId:null},origins).catalogKey).toBe('creator_pro_annual'); expect(()=>parseCheckoutInput({catalogKey:'price_injected',returnOrigin:'https://visualmelody.netlify.app'},origins)).toThrow('invalid_catalog_key'); expect(()=>parseCheckoutInput({catalogKey:'creator_pro_annual',returnOrigin:'https://evil.test'},origins)).toThrow('invalid_return_origin'); });
  it('returns without Stripe or user identifiers',()=>{ const id='a'.repeat(48); const urls=checkoutReturnUrls(parseCheckoutInput({catalogKey:'creator_pro_annual',returnOrigin:'https://visualmelody.netlify.app',continuationId:id},origins)); expect(urls.successUrl).toContain(`continuation=${id}`); expect(JSON.stringify(urls)).not.toMatch(/price_|cus_|user/); });
});
