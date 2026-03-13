<template>
  <TransitionGroup tag="aside" id="notifications"
    class="notificationWrapper"
    :class="{ pwaMode: settingsStore.isLaunchedAsApp, ios: settingsStore.isIosStandalone }"
  >
    <div
      v-for="notification in infoStore.getNotifications"
      :key="notification.uuid"
      class="notification"
      :class="notification.state, notification.result"
    >
      <div class="notificationContent">
        <div class="icon">
          <template v-if="notification.state === 'done'">
            <template v-if="notification.result === 'info'">
              <IconSyncFail v-if="['sync', 'update'].indexOf(notification.type) > -1" style="transform: rotate(180deg);" />
              <IconCircleInfo v-else />
            </template>
            <template v-else-if="notification.result === 'success'">
              <IconSyncCheck v-if="['sync', 'update'].indexOf(notification.type) > -1" />
              <IconCircleCheck v-else />
            </template>
            <template v-else-if="notification.result === 'error'">
              <IconSyncFail v-if="['sync', 'update'].indexOf(notification.type) > -1" />
              <IconShieldFail v-else />
            </template>
          </template>
          <template v-else-if="notification.state === 'running'">
            <IconLoader />
          </template>
        </div>
        <div class="message" style="margin-top: .5rem;">
          {{ notification.msg }}
        </div>
        <IconCircleX  @click="infoStore.removeNotification(notification.uuid)" class="closeIcon" />
      </div>
      <div class="time">
        <div v-if="notification.time" class="bar" :class="{ active: notification.animate }" :style="'transition-duration:' + notification.time + 'ms;'"></div>
      </div>
    </div>
  </TransitionGroup>
</template>

<script setup>
import IconCircleX from '@/components/icons/IconCircleX.vue'
import IconSyncCheck from '@/components/icons/IconSyncCheck.vue'
import IconSyncFail from '@/components/icons/IconSyncFail.vue'
import IconCircleCheck from '@/components/icons/IconCircleCheck.vue'
import IconCircleInfo from '@/components/icons/IconCircleInfo.vue'
import IconShieldFail from '@/components/icons/IconShieldFail.vue'
import IconLoader from '@/components/icons/IconLoader.vue'

// Stores
import { useSettingsStore } from '@/stores/settings'
const settingsStore = useSettingsStore()
import { useInfoStore } from '@/stores/info'
const infoStore = useInfoStore()
</script>

<style scoped>
/* PWA Overwrites */
.pwaMode .notification {
  --icon-size: 2.6rem;
  --icon-padding: 1.2rem;
}
/* PWA Overwrites end */

.notificationWrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  font-size: 1.6rem;
  z-index: 8;
}
.notification {
  --icon-type-size: 3rem;
  --icon-size: 2.4rem;
  --icon-padding: 1.4rem;
  --timer-height: .5rem;
  background-color: rgba(0,0,0,.85);
  backdrop-filter: blur(.8rem);
  border-bottom: .1rem solid rgba(255, 255, 255, .15);
  position: relative;
}
.notification.success {
  background-color: var(--green);
  color: #000;
}
.notification.error {
  background-color: var(--red);
  color: #fff;
}
.notification .closeIcon {
  width: calc(var(--icon-size) + var(--icon-padding) + var(--icon-padding));
  height: calc(var(--icon-size) + var(--icon-padding) + var(--icon-padding));
  position: absolute;
  top: 0;
  right: 0;
  cursor: pointer;
  padding: var(--icon-padding);
}
.notification .icon,
.notification .icon svg {
  width: var(--icon-type-size);
  height: var(--icon-type-size);
}
.notificationContent {
  padding: var(--icon-padding) calc(var(--icon-size) + var(--icon-padding) + var(--icon-padding)) calc(var(--icon-padding) - var(--timer-height)) var(--icon-padding);
  display: grid;
  grid-template-columns: var(--icon-type-size) auto;
  gap: 1rem;
}
.notification .time {
  width: 100%;
  height: var(--timer-height);
}
.notification .time .bar {
  width: 100%;
  height: var(--timer-height);
  background-color: var(--purple);
  background-color: #fff;
  transition-property: width;
  transition-timing-function: linear;
}
.notification.error .time .bar,
.notification.success .time .bar {
  background-color: #fff;
}
.time .bar.active {
  width: 0%;
}

@media (width >= 1280px) {
  .notificationWrapper {
    top: 1rem;
    right: unset;
    left: 50%;
    width: 50rem;
    border-radius: var(--borderRadius);
    transform: translateX(-50%);

    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .notificationWrapper .notification {
    width: 50rem;
    border: 0;
    border-radius: var(--borderRadius);
    -webkit-box-shadow: var(--boxShadow);
    box-shadow: var(--boxShadow);
    overflow: hidden;
  }
  .notificationWrapper .notificationContent {
    padding-left: var(--icon-padding);
  }
}
</style>