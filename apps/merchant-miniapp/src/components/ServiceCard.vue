<script setup lang="ts">
import { ref } from 'vue'
import type { ServiceSummary } from '../../common/types/app'
import { openPage } from '../../common/utils/navigation'
import IconContainer from './IconContainer.vue'
import FeatureUnavailable from './FeatureUnavailable.vue'
import BaseCard from './BaseCard.vue'

const props = defineProps<{ service: ServiceSummary }>()
const showUnavailable = ref(false)

const handleClick = () => {
  if (!props.service.available || !props.service.path) {
    showUnavailable.value = true
    return
  }
  openPage(props.service.path)
}
</script>

<template>
  <BaseCard class="service-card-shell" :padded="false">
    <view class="service-card" hover-class="service-card--pressed" @click="handleClick">
      <image v-if="props.service.image" class="service-card__image" :src="props.service.image" mode="aspectFill" />
      <IconContainer v-else :icon="props.service.icon || 'services'" size="lg" />
      <view class="service-card__copy">
        <view class="service-card__headline">
          <text class="service-card__name">{{ props.service.name }}</text>
          <text v-if="props.service.tag" class="service-card__tag">{{ props.service.tag }}</text>
        </view>
        <text class="service-card__description">{{ props.service.description }}</text>
        <view class="service-card__foot">
          <text class="service-card__price">{{ props.service.priceLabel || '可预约' }}</text>
        </view>
      </view>
    </view>
  </BaseCard>
  <FeatureUnavailable v-show="showUnavailable" @close="showUnavailable = false" />
</template>

<style scoped lang="scss">
.service-card-shell {
  border-color: rgba(225, 228, 230, 0.72);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(27, 77, 83, 0.04);
}

.service-card {
  display: flex;
  min-height: 80px;
  align-items: center;
  gap: $space-3;
  padding: 12px 14px;
}

.service-card--pressed { opacity: 0.78; }

.service-card__image {
  width: 80px;
  height: 80px;
  flex: none;
  border-radius: 10px;
  background: $color-group-bg;
}

.service-card__copy { min-width: 0; flex: 1; }
.service-card__headline { display: flex; min-width: 0; align-items: center; gap: $space-2; }
.service-card__name { min-width: 0; overflow: hidden; color: $color-text-primary; font-size: 16px; font-weight: 600; line-height: 22px; text-overflow: ellipsis; white-space: nowrap; }
.service-card__tag { flex: none; padding: 3px 7px; border-radius: 999px; background: $color-primary-light; color: $color-primary; font-size: 12px; font-weight: 400; line-height: 18px; }
.service-card__description { display: -webkit-box; overflow: hidden; margin-top: 4px; color: $color-text-secondary; font-size: 14px; font-weight: 400; line-height: 20px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.service-card__foot { display: flex; align-items: center; margin-top: 5px; }
.service-card__price { color: $color-primary; font-size: 16px; font-weight: 600; line-height: 22px; }
</style>
