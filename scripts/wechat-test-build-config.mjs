/** Configuration for a developer-only WeChat build. No secret belongs in a client build. */
export function wechatTestConfig(app, env) {
  if (!['resident', 'merchant'].includes(app)) throw new Error('指定 resident 或 merchant');
  const appId=env.WX_TEST_APPID || '';
  if (!/^wx[0-9a-f]{16}$/.test(appId)) throw new Error('请通过 WX_TEST_APPID 指定对应小程序 AppID');
  const name=app==='resident'?'VITE_RESIDENT_API_BASE_URL':'VITE_MERCHANT_API_BASE_URL';
  const api=(env[name] || '').replace(/\/$/,'');
  let url;try{url=new URL(api)}catch{throw new Error(`请通过 ${name} 指定测试 API 的 HTTPS 地址`)}
  if(!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~-]+)*$/.test(api) || url.protocol!=='https:' || url.username || url.password || url.search || url.hash || !url.hostname ||
      ['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(url.hostname.toLowerCase()) || url.hostname.endsWith('.invalid'))
    throw new Error(`${name} 必须是测试设备可访问的 HTTPS 地址，不得使用本机回环或占位地址`);
  return {appId,apiName:name,api};
}
