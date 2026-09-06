<script setup lang="ts">
import { useHeaderMenus } from "@/hooks/useHeaderMenus";
import { useScreen } from "@/hooks/useScreen";
import { useAppConfigStore } from "@/stores/useAppConfigStore";
import { useLayoutContainerStore } from "@/stores/useLayoutContainerStore";
import {
  VBtn,
  VDialog,
  VList,
  VListItem,
  VMenu,
  VToolbar,
  VTooltip
} from "vuetify/lib/components/index.mjs";
import { useRoute } from "vue-router";

defineProps<{
  /** One-shot entrance animation after a successful login */
  loginEnter?: boolean;
}>();

const route = useRoute();
const { containerState } = useLayoutContainerStore();
const { logoImage } = useAppConfigStore();

const { menus, headerMenus, appMenus, headerAppMenus, handleToPage } = useHeaderMenus();

/** Whether route menu item is active (current path equals or is child of this path) */
const isRouteActive = (path: string): boolean => {
  if (route.path === path) return true;
  if (path === "/") return false;
  return route.path.startsWith(path + "/");
};

const { isPhone } = useScreen();

const openPhoneMenu = (b = false) => {
  containerState.showPhoneMenu = b;
};
</script>

<template>
  <VToolbar
    v-if="!isPhone"
    tag="header"
    class="app-header-wrapper"
    :class="{ 'login-enter-header': loginEnter }"
    color="transparent"
    flat
    elevation="0"
    height="64"
  >
    <div class="app-header-content">
      <nav class="btns">
        <a href="." class="logo-link" aria-label="ElementsPanel">
          <div class="logo">
            <img :src="logoImage" alt="ElementsPanel" />
          </div>
        </a>

        <div
          v-for="item in headerMenus"
          :key="item.path"
          class="nav-item"
        >
          <VBtn
            variant="text"
            class="nav-button"
            :class="[item.customClass, { 'nav-button-active': isRouteActive(item.path) }]"
            @click="handleToPage(item.path)"
          >
            {{ item.name }}
          </VBtn>
        </div>
      </nav>
      <div class="btns">
        <div v-for="(item, index) in headerAppMenus as any" :key="index">
          <VMenu v-if="item.menus && item.conditions" location="bottom" :offset="6">
            <template #activator="{ props: menuProps }">
              <VBtn
                v-bind="menuProps"
                :class="[item.customClass, 'nav-button', 'right-nav-button']"
                icon
                variant="text"
                :aria-label="item.title"
              >
                <component :is="item.icon" v-if="item.icon" />
              </VBtn>
            </template>
            <VList density="compact">
              <VListItem
                v-for="menuItem in item.menus"
                :key="menuItem.value"
                :title="menuItem.title"
                @click="item.click(String(menuItem.value))"
              />
            </VList>
          </VMenu>
          <VTooltip v-else-if="item.conditions" location="bottom">
            <template #activator="{ props: tooltipProps }">
              <VBtn
                v-bind="tooltipProps"
                :class="[item.customClass, 'nav-button', 'right-nav-button']"
                :aria-label="item.title"
                :title="item.title"
                :icon="!item?.iconText"
                variant="text"
                @click="item.click()"
              >
                <component :is="item.icon" v-if="item.icon" />
                <span v-if="item?.iconText" class="nav-button-text">
                  {{ item.iconText }}
                </span>
              </VBtn>
            </template>
            <span>{{ item.title }}</span>
          </VTooltip>
        </div>
      </div>
    </div>
  </VToolbar>

  <!-- Menus for phone -->
  <VToolbar
    v-if="isPhone"
    tag="header"
    class="app-header-content-for-phone"
    :class="{ 'login-enter-header': loginEnter }"
    color="transparent"
    flat
    elevation="0"
    height="60"
  >
    <div class="phone-toolbar-content">
      <div class="phone-toolbar-side phone-toolbar-side-start">
        <VBtn
          icon
          variant="text"
          aria-label="MENU"
          title="MENU"
          @click="openPhoneMenu(true)"
        >
          <span class="mdi mdi-menu" aria-hidden="true"></span>
        </VBtn>
        <div v-for="(item, index) in appMenus" :key="index">
          <VMenu
            v-if="item.menus && item.conditions && !item.onlyPC"
            location="bottom"
            :offset="6"
          >
            <template #activator="{ props: menuProps }">
              <VBtn
                v-bind="menuProps"
                class="phone-nav-button"
                icon
                variant="text"
                :aria-label="item.title"
              >
                <component :is="item.icon" v-if="item.icon" />
              </VBtn>
            </template>
            <VList density="compact">
              <VListItem
                v-for="menuItem in item.menus"
                :key="menuItem.value"
                :title="menuItem.title"
                @click="item.click(String(menuItem.value))"
              />
            </VList>
          </VMenu>
        </div>
      </div>
      <div class="phone-toolbar-side phone-toolbar-side-end">
        <div v-for="(item, index) in appMenus" :key="index">
          <VBtn
            v-if="item.conditions && !item.onlyPC && !item.menus"
            class="phone-nav-button"
            icon
            variant="text"
            :aria-label="item.title"
            :title="item.title"
            @click="item.click()"
          >
            <component :is="item.icon" v-if="item.icon" />
          </VBtn>
        </div>
      </div>
    </div>
  </VToolbar>

  <VDialog
    v-model="containerState.showPhoneMenu"
    class="phone-menu-dialog"
    max-width="500"
    location="top"
    transition="dialog-top-transition"
  >
    <VList class="phone-menu" density="comfortable">
      <VListItem
        v-for="item in menus"
        :key="item.path"
        :title="String(item.name)"
        :active="isRouteActive(item.path)"
        @click="handleToPage(item.path)"
      />
    </VList>
  </VDialog>
</template>

<style lang="scss" scoped>
.nav-button-warning:hover {
  background-color: rgba(255, 193, 7, 0.34) !important;
}

.nav-button-success:hover {
  background-color: rgba(64, 156, 216, 0.12) !important;
}

.nav-button-danger:hover {
  background-color: #ff19116f !important;
}

.nav-button-primary:hover {
  background-color: rgba(255, 255, 255, 0.25) !important;
}

.nav-button-success:hover {
  background-color: #48e6635a !important;
}

.phone-menu {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  color: var(--app-header-text-color);

  :deep(.v-list-item) {
    min-height: 44px;
    margin: 4px 0;
    border-radius: 12px;
    color: var(--app-header-text-color);
  }

  :deep(.v-list-item--active) {
    background-color: rgba(64, 156, 216, 0.12);
  }
}

.app-header-content-for-phone {
  height: 60px;
  width: 100%;
  background-color: var(--app-header-bg);
  color: var(--app-header-text-color);
  box-shadow: none;
}

.phone-toolbar-content {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
}

.phone-toolbar-side {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

.phone-toolbar-side-end {
  justify-content: flex-end;
}

.phone-nav-button {
  margin: 0 2px;
  color: var(--app-header-text-color) !important;
}

.phone-menu-dialog :deep(.v-overlay__content) {
  width: calc(100% - 24px);
  margin: 12px;
}

.phone-menu-dialog :deep(.v-list) {
  background-color: var(--app-header-bg);
  color: var(--app-header-text-color);
  border-radius: 24px;
}

.app-header-wrapper {
  position: relative;
  z-index: 20;
  display: flex;
  width: 100%;
  height: 64px;
  min-height: 64px;
  align-items: center;
  justify-content: center;
  background-color: var(--app-header-bg);
  color: var(--app-header-text-color);
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
}

.app-header-wrapper :deep(.v-toolbar__content),
.app-header-content-for-phone :deep(.v-toolbar__content) {
  width: 100%;
  padding: 0;
}

.app-header-content {
  display: flex;
  width: 100%;
  height: 64px;
  max-width: var(--app-max-width);
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 24px;

  .btns {
    display: flex;
    min-width: 0;
    align-items: center;
  }
}

.logo-link {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
}

.nav-button {
  min-width: 40px;
  min-height: 40px;
  margin: 0 4px;
  padding: 8px 12px;
  color: var(--app-header-text-color) !important;
  font-size: 14px;
  text-align: center;
  user-select: none;
}

.right-nav-button {
  margin: 0 2px;
  padding: 8px;
}

.nav-button-text {
  margin-left: 6px;
  font-size: 12px;
}

.icon-button {
  font-size: 16px !important;
}

.nav-button:hover {
  background-color: rgba(215, 215, 215, 0.261);
}

.nav-button-active {
  background-color: rgba(215, 215, 215, 0.35);
}

.logo {
  cursor: pointer;

  img {
    height: 18px;
  }
}

.pro-mode-order-container {
  @extend .nav-button;
  @extend .nav-button-success;
}

@media (max-width: 1470px) {
  .app-header-content {
    padding-right: 25px;
    padding-left: 25px;
  }
}

@media (max-width: 992px) {
  .app-header-content {
    padding-right: 8px;
    padding-left: 8px;
  }
}
</style>
