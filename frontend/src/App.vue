<script setup lang="ts">
import UploadBubble from "@/components/UploadBubble.vue";
import { useScreen } from "@/hooks/useScreen";
import { useAppConfigStore } from "@/stores/useAppConfigStore";

import { Button, Input, Select, Table } from "ant-design-vue";
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppBottomNav from "./components/AppBottomNav.vue";
import AppConfigProvider from "./components/AppConfigProvider.vue";
import AppHeader from "./components/AppHeader.vue";
import AppSidebarMenu from "./components/AppSidebarMenu.vue";
import Breadcrumbs from "./components/Breadcrumbs.vue";
import InputDialogProvider from "./components/InputDialogProvider.vue";
import MyselfInfoDialog from "./components/MyselfInfoDialog.vue";
import { useAppStateStore } from "./stores/useAppStateStore";
import { useLayoutContainerStore } from "./stores/useLayoutContainerStore";
import { closeAppLoading, setLoadingTitle } from "./tools/dom";

const { hasBgImage, initAppTheme, useSidebarLayout } = useAppConfigStore();
const { containerState } = useLayoutContainerStore();
const { state: appState } = useAppStateStore();
const { isPhone } = useScreen();
const route = useRoute();

const GLOBAL_COMPONENTS = [InputDialogProvider, MyselfInfoDialog, UploadBubble];

[Button, Select, Input, Table].forEach((element) => {
  element.props.size.default = "large";
});

const designModeNavStyle = computed(() => {
  if (!appState.userInfo) return {};
  return {
    zIndex: containerState.isDesignMode ? 997 : 1
  };
});

const isLoginPage = computed(() => route.path === '/login');
const justLoggedIn = ref(false);
const transitionName = ref('page-fade');

watch(() => route.path, (newPath, oldPath) => {
  if (oldPath === '/login' && newPath !== '/login') {
    transitionName.value = 'login-fade';
    justLoggedIn.value = true;
    setTimeout(() => {
      justLoggedIn.value = false;
      transitionName.value = 'page-fade';
    }, 1000);
  } else {
    transitionName.value = 'page-fade';
  }
});

onMounted(async () => {
  setLoadingTitle("Loading application settings...");
  await initAppTheme();
  closeAppLoading();
});
</script>

<template>
  <AppConfigProvider :has-bg-image="hasBgImage">
    <!-- App Container -->
    <div class="global-app-container">
      <AppSidebarMenu v-if="useSidebarLayout && !isLoginPage" :style="designModeNavStyle"
        :class="{ 'app-header-login-anim': justLoggedIn }" />
      <main class="main-content" :class="{ 'app-layout-sidebar-only': useSidebarLayout }">
        <AppHeader v-if="!useSidebarLayout && !isLoginPage" :style="designModeNavStyle"
          :class="{ 'app-header-login-anim': justLoggedIn }" />
        <Breadcrumbs v-if="!isLoginPage" />
        <RouterView v-slot="{ Component, route }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </RouterView>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <AppBottomNav v-if="isPhone && !useSidebarLayout && !isLoginPage" />

    <!-- Global Components -->
    <component :is="component" v-for="(component, index) in GLOBAL_COMPONENTS" :key="index" />
  </AppConfigProvider>
</template>

<style lang="scss">
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.3s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

/* Login specific transitions */
.login-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.login-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.login-fade-enter-active {
  transition: all 2.0s cubic-bezier(0.00, 0.00, 0.00, 1.00);
}

.login-fade-enter-from {
  opacity: 0;
  transform: scale(1.1);
}

.login-fade-enter-to {
  opacity: 1;
  transform: scale(1);
}

/* Header Slide-Down Animation when app loads (after login) */
.app-header-login-anim {
  animation: headerSlideDown 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}

@keyframes headerSlideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
