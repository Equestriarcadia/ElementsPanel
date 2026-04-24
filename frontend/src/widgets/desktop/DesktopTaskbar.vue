<script setup lang="ts">
import { t } from "@/lang/i18n";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons-vue";
import { ref, type Component } from "vue";

export interface TaskbarWindow {
    id: string;
    title: string;
    icon: Component | string;
    minimized: boolean;
    active: boolean;
}

const props = defineProps<{
    windows: TaskbarWindow[];
    username: string;
}>();

const emit = defineEmits<{
    (e: "toggle-window", id: string): void;
    (e: "open-start-menu"): void;
    (e: "exit-desktop"): void;
}>();

const currentTime = ref("");
const currentDate = ref("");

const updateTime = () => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    currentDate.value = now.toLocaleDateString([], { month: "short", day: "numeric" });
};

updateTime();
setInterval(updateTime, 10000);

const startMenuOpen = ref(false);

const toggleStartMenu = () => {
    startMenuOpen.value = !startMenuOpen.value; if (startMenuOpen.value) {
        emit("open-start-menu");
    }
};

const handleExitDesktop = () => {
    startMenuOpen.value = false;
    emit("exit-desktop");
};

const isComponentIcon = (icon: Component | string): boolean => typeof icon !== "string";
</script>

<template>
    <div class="desktop-taskbar">
        <!-- Start Button -->
        <div class="taskbar__start" :class="{ 'taskbar__start--active': startMenuOpen }" @click="toggleStartMenu">
            <span class="taskbar__start-icon">
                <img src="/desktop-icon.svg" alt="Start" />
            </span>
        </div>

        <!-- Start Menu Popup -->
        <Transition name="start-menu">
            <div v-if="startMenuOpen" class="taskbar__start-menu" @click.stop>
                <div class="start-menu__header">
                    <span class="start-menu__user-icon">
                        <UserOutlined />
                    </span>
                    <span class="start-menu__username">{{ username }}</span>
                </div>
                <div class="start-menu__divider"></div>
                <div class="start-menu__item" @click="handleExitDesktop">
                    <span class="start-menu__item-icon">
                        <LogoutOutlined />
                    </span>
                    <span>{{ t("TXT_CODE_2c69ab15") }}</span>
                </div>
            </div>
        </Transition>

        <!-- Window Buttons -->
        <div class="taskbar__windows">
            <div v-for="win in windows" :key="win.id" class="taskbar__window-btn"
                :class="{ 'taskbar__window-btn--active': win.active }" @click="emit('toggle-window', win.id)">
                <span class="taskbar__window-icon">
                    <component :is="win.icon" v-if="isComponentIcon(win.icon)" />
                    <img v-else-if="typeof win.icon === 'string' && win.icon.endsWith('.svg')" :src="win.icon"
                        alt="icon" />
                    <template v-else>{{ win.icon }}</template>
                </span>
                <span class="taskbar__window-title">{{ win.title }}</span>
            </div>
        </div>

        <!-- System Tray -->
        <div class="taskbar__tray">
            <div class="taskbar__time">
                <div class="taskbar__time-text">{{ currentTime }}</div>
                <div class="taskbar__date-text">{{ currentDate }}</div>
            </div>
        </div>
    </div>

    <!-- Click-outside overlay for start menu -->
    <div v-if="startMenuOpen" class="start-menu-overlay" @click="startMenuOpen = false"></div>
</template>

<style lang="scss" scoped>
.desktop-taskbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: rgba(24, 24, 32, 0.88);
    backdrop-filter: saturate(180%) blur(20px);
    display: flex;
    align-items: center;
    z-index: 1000;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 4px;
    user-select: none;
}

.taskbar__start {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;
    color: #fff;
    margin-right: 4px;

    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    &--active {
        background-color: rgba(255, 255, 255, 0.15) !important;
    }

    &-icon {
        display: flex;
        align-items: center;

        img {
            width: 20px;
            height: 20px;
        }
    }
}

.taskbar__start-menu {
    position: fixed;
    bottom: 56px;
    left: 8px;
    width: 280px;
    background: rgba(32, 32, 40, 0.95);
    backdrop-filter: saturate(180%) blur(24px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 1001;
    overflow: hidden;
    color: #fff;

    .start-menu__header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px;
    }

    .start-menu__user-icon {
        font-size: 28px;
        display: flex;
        align-items: center;
    }

    .start-menu__username {
        font-size: 14px;
        font-weight: 500;
    }

    .start-menu__divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 12px;
    }

    .start-menu__item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.15s;

        &:hover {
            background-color: rgba(255, 255, 255, 0.08);
        }

        &-icon {
            font-size: 16px;
            display: flex;
            align-items: center;
        }
    }
}

.start-menu-enter-active {
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.start-menu-leave-active {
    transition: all 0.15s ease-in;
}

.start-menu-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.start-menu-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

.start-menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
}

.taskbar__windows {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 4px;

    &::-webkit-scrollbar {
        height: 0;
    }
}

.taskbar__window-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    max-width: 180px;
    font-size: 12px;

    &:hover {
        background-color: rgba(255, 255, 255, 0.08);
        color: #fff;
    }

    &--active {
        background-color: rgba(255, 255, 255, 0.12);
        color: #fff;
    }
}

.taskbar__window-icon {
    font-size: 14px;
    display: flex;
    align-items: center;

    img {
        width: 14px;
        height: 14px;
    }
}

.taskbar__window-title {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
}

.taskbar__tray {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    margin-left: auto;
}

.taskbar__time {
    text-align: right;
    color: #fff;

    &-text {
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
    }
}

.taskbar__date-text {
    font-size: 10px;
    opacity: 0.7;
    line-height: 1.3;
}
</style>
