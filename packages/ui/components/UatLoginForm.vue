<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppButton from './AppButton.vue'
const props = defineProps<{apiBaseUrl:string;domain:'buyer'|'store';busy:boolean}>()
const emit = defineEmits<{login:[input:{username:string;password:string;uuid:string}]}>()
const username=ref(''),password=ref(''),uuid=ref(''),challenge=ref<any>(null),x=ref(0),verified=ref(false),loading=ref(false),error=ref('')
let generation=0
const max=computed(()=>challenge.value?challenge.value.originalWidth-challenge.value.sliderWidth:0)
const imageStyle=computed(()=>challenge.value?{height:(challenge.value.originalHeight/challenge.value.originalWidth*280)+'px'}:{})
const pieceStyle=computed(()=>challenge.value?{left:(x.value/challenge.value.originalWidth*100)+'%',top:(challenge.value.randomY/challenge.value.originalHeight*100)+'%',width:(challenge.value.sliderWidth/challenge.value.originalWidth*100)+'%',height:(challenge.value.sliderHeight/challenge.value.originalHeight*100)+'%'}:{})
function allowed(){return props.apiBaseUrl==='https://127.0.0.1:'+(props.domain==='buyer'?'19794':'19793')+'/api'}
function request(method:'GET'|'POST',body?:Record<string,unknown>):Promise<any>{
  if(!allowed())return Promise.reject(new Error('当前环境不能使用本机测试登录。'))
  return new Promise((resolve,reject)=>uni.request({url:props.apiBaseUrl+'/'+props.domain+'/common/slider/LOGIN',method,data:body,header:{uuid:uuid.value,'Content-Type':'application/x-www-form-urlencoded'},timeout:15000,
    success:r=>{const data=r.data as any;if(r.statusCode===200&&data?.success===true&&data.code===200)resolve(data.result);else reject(new Error('验证码服务暂不可用，请重试。'))},fail:()=>reject(new Error('验证码请求失败，请检查连接。'))}))
}
async function refresh(){
  if(props.busy||loading.value)return
  const current=++generation;verified.value=false;challenge.value=null;x.value=0;error.value='';loading.value=true
  uuid.value='uat-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2)
  try{const data=await request('GET');if(current!==generation)return
    if(!data||![data.originalWidth,data.originalHeight,data.sliderWidth,data.sliderHeight,data.randomY].every(Number.isFinite)||data.originalWidth<=data.sliderWidth||data.originalHeight<=data.sliderHeight||!String(data.backImage).startsWith('data:image/')||!String(data.slidingImage).startsWith('data:image/'))throw new Error('验证码图片无效，请刷新。')
    challenge.value=data
  }catch(e){if(current===generation)error.value=e instanceof Error?e.message:'无法读取验证码。'}finally{if(current===generation)loading.value=false}
}
function slide(e:{detail:{value:number}}){if(!loading.value&&!verified.value)x.value=e.detail.value}
async function check(e:{detail:{value:number}}){
  if(loading.value||verified.value||!challenge.value)return
  x.value=e.detail.value;const current=generation;loading.value=true;error.value=''
  try{const ok=await request('POST',{xPos:x.value});if(current!==generation)return
    verified.value=ok===true;if(!verified.value){challenge.value=null;error.value='拼图位置未通过，请刷新后重新拖动。'}
  }catch(e){if(current===generation){challenge.value=null;error.value=e instanceof Error?e.message:'验证码校验失败。'}}finally{if(current===generation)loading.value=false}
}
function submit(){
  if(props.busy||loading.value||!verified.value)return
  if(!/^[A-Za-z0-9_-]{3,64}$/.test(username.value)||password.value.length<8){error.value='请填写有效测试账号和密码。';return}
  const input={username:username.value,password:password.value,uuid:uuid.value};password.value='';verified.value=false;challenge.value=null;emit('login',input)
}
onBeforeUnmount(()=>{generation++;password.value='';challenge.value=null})
</script>
<template>
  <view class="uat-login">
    <text class="uat-login__title">本机测试身份 · Mock</text>
    <text class="uat-login__hint">仅用于本次本机验收。身份由服务端核实，不代表真实微信登录。</text>
    <view class="uat-login__field"><text>测试账号</text><input v-model="username" aria-label="测试账号" placeholder="输入受控测试账号" :disabled="busy" maxlength="64" /></view>
    <view class="uat-login__field"><text>密码</text><input v-model="password" aria-label="测试密码" password placeholder="输入密码" :disabled="busy" maxlength="128" /></view>
    <AppButton variant="secondary" :disabled="busy||loading" @click="refresh">{{challenge?'更换验证码':'获取验证码'}}</AppButton>
    <view v-if="challenge" class="uat-login__captcha">
      <view class="uat-login__image" :style="imageStyle"><image class="uat-login__background" :src="challenge.backImage" mode="scaleToFill"/><image class="uat-login__piece" :src="challenge.slidingImage" :style="pieceStyle" mode="scaleToFill"/></view>
      <text class="uat-login__hint">拖动下方滑块，将拼图移到缺口后松开。</text>
      <slider :value="x" :min="0" :max="max" :step="1" :disabled="busy||loading||verified" @changing="slide" @change="check" />
    </view>
    <text v-if="verified" class="uat-login__hint">验证码已通过，请登录。</text>
    <text v-if="error" class="uat-login__error" role="alert">{{error}}</text>
    <AppButton :disabled="busy||loading||!verified" :loading="busy" @click="submit">使用本机测试身份登录</AppButton>
  </view>
</template>
<style scoped lang="scss">
.uat-login{display:flex;flex-direction:column;gap:$space-3;margin-top:$space-4;padding-top:$space-4;border-top:1px solid $color-border;min-width:0}
.uat-login__title{font-size:16px;font-weight:700;color:$color-text-primary}
.uat-login__hint{font-size:14px;line-height:1.7;color:$color-text-secondary}
.uat-login__field{display:flex;flex-direction:column;gap:$space-2;font-size:14px;color:$color-text-primary}
.uat-login__field input{box-sizing:border-box;height:44px;padding:0 $space-3;border:1px solid $color-border;border-radius:$radius-sm;background:$color-card-bg}
.uat-login__image{position:relative;width:280px;max-width:100%;overflow:hidden}
.uat-login__background{width:100%;height:100%}.uat-login__piece{position:absolute}
.uat-login__error{font-size:14px;color:$color-error;line-height:1.7}
</style>
