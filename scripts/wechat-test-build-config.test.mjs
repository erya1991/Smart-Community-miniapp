import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wechatTestConfig} from './wechat-test-build-config.mjs';
const appId='wx1234567890abcdef';
test('real WeChat test builds require explicit AppID and non-loopback HTTPS API',()=>{
  assert.deepEqual(wechatTestConfig('resident',{WX_TEST_APPID:appId,VITE_RESIDENT_API_BASE_URL:'https://192.168.2.30:8443/api/'}),{appId,apiName:'VITE_RESIDENT_API_BASE_URL',api:'https://192.168.2.30:8443/api',profileBasicOnly:true});
  for(const address of ['','http://test.example/api','https://127.0.0.1/api','https://stage45.invalid/api','https://user:secret@test.example/api','https://test.example/api?secret=1'])
    assert.throws(()=>wechatTestConfig('merchant',{WX_TEST_APPID:appId,VITE_MERCHANT_API_BASE_URL:address}));
  assert.throws(()=>wechatTestConfig('resident',{WX_TEST_APPID:'touristappid',VITE_RESIDENT_API_BASE_URL:'https://test.example/api'}));
});
test('company preset keeps unsupported profile actions closed despite inherited environment',()=>{
  assert.equal(wechatTestConfig('resident',{WX_TEST_APPID:appId,VITE_RESIDENT_API_BASE_URL:'https://test.example/api',VITE_RESIDENT_PROFILE_BASIC_ONLY:'false'}).profileBasicOnly,true);
});
