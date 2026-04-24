<script setup lang="ts">
import { t } from "@/lang/i18n";
import { logoutUser } from "@/services/apis/index";
import { useAppStateStore } from "@/stores/useAppStateStore";
import type { ContextMenuItem } from "@/widgets/desktop/DesktopContextMenu.vue";
import DesktopContextMenu from "@/widgets/desktop/DesktopContextMenu.vue";
import DesktopIcon from "@/widgets/desktop/DesktopIcon.vue";
import DesktopInstanceConsole from "@/widgets/desktop/DesktopInstanceConsole.vue";
import DesktopInstanceManager from "@/widgets/desktop/DesktopInstanceManager.vue";
import DesktopLoginWindow from "@/widgets/desktop/DesktopLoginWindow.vue";
import DesktopOverview from "@/widgets/desktop/DesktopOverview.vue";
import type { TaskbarWindow } from "@/widgets/desktop/DesktopTaskbar.vue";
import DesktopTaskbar from "@/widgets/desktop/DesktopTaskbar.vue";
import DesktopUsers from "@/widgets/desktop/DesktopUsers.vue";
import DesktopWindow from "@/widgets/desktop/DesktopWindow.vue";
import {
    ClusterOutlined,
    CodeOutlined,
    DashboardOutlined,
    DesktopOutlined,
    InfoCircleOutlined,
    SettingOutlined,
    ShoppingOutlined,
    SyncOutlined,
    TeamOutlined
} from "@ant-design/icons-vue";
import { computed, markRaw, reactive, ref, type Component } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { state: appState, isAdmin, isLogged } = useAppStateStore();
const { execute: executeLogout } = logoutUser();

//─── Login Overlay ───
const showLoginOverlay = computed(() => !isLogged.value);

const handleLoginSuccess = () => {
    // Login overlay will auto-hide via isLogged becoming true
};

//─── Desktop Icons ───
interface DesktopApp {
    id: string;
    label: string;
    icon: Component | string;
    color: string;
    route?: string;
    windowContent?: string;
}

const desktopApps = computed<DesktopApp[]>(() => {
    const apps: DesktopApp[] = [
        {
            id: "instances",
            label: t("TXT_CODE_DESKTOP_INSTANCES"),
            icon: markRaw(DesktopOutlined),
            color: "#1677ff",
            route: "/instances", windowContent: "instances"
        },
        {
            id: "overview",
            label: t("TXT_CODE_DESKTOP_OVERVIEW"),
            icon: markRaw(DashboardOutlined),
            color: "#52c41a",
            route: "/overview",
            windowContent: "overview"
        },
        {
            id: "users",
            label: t("TXT_CODE_DESKTOP_USERS"),
            icon: markRaw(TeamOutlined),
            color: "#722ed1",
            route: "/users",
            windowContent: "users"
        },
        {
            id: "nodes",
            label: t("TXT_CODE_DESKTOP_NODES"),
            icon: markRaw(ClusterOutlined),
            color: "#fa8c16",
            route: "/node",
            windowContent: "nodes"
        },
        {
            id: "market",
            label: t("TXT_CODE_DESKTOP_MARKET"),
            icon: markRaw(ShoppingOutlined),
            color: "#eb2f96",
            route: "/market",
            windowContent: "market"
        },
        {
            id: "settings",
            label: t("TXT_CODE_DESKTOP_SETTINGS"),
            icon: markRaw(SettingOutlined),
            color: "#13c2c2",
            route: "/settings",
            windowContent: "settings"
        },
        {
            id: "terminal",
            label: t("TXT_CODE_DESKTOP_TERMINAL"),
            icon: markRaw(CodeOutlined),
            color: "#434343",
            windowContent: "terminal"
        },
        {
            id: "about",
            label: t("TXT_CODE_DESKTOP_ABOUT"),
            icon: markRaw(InfoCircleOutlined),
            color: "#597ef7",
            windowContent: "about"
        }
    ];

    if (!isAdmin.value) {
        return apps.filter((a) => ["instances", "settings", "about"].includes(a.id));
    }
    return apps;
});

const selectedIconId = ref<string | null>(null);

const selectIcon = (id: string) => {
    selectedIconId.value = id;
};

// ─── Window Management ───
interface WindowState {
    id: string;
    title: string;
    icon: Component | string;
    visible: boolean;
    minimized: boolean;
    maximized: boolean;
    zIndex: number;
    content: string;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    instanceId?: string;
    daemonId?: string;
}

const windows = reactive<Map<string, WindowState>>(new Map());
let nextZIndex = 100;
let windowOffset = 0;

const openWindow = (appId: string) => {
    const app = desktopApps.value.find((a) => a.id === appId);
    if (!app) return;

    const existing = windows.get(appId);
    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(appId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 80 + windowOffset * 30;
    const offsetY = 40 + windowOffset * 30;

    windows.set(appId, {
        id: appId,
        title: app.label,
        icon: app.icon,
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: app.windowContent || "default",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 850,
        initialHeight: 520
    });
};

const openInstanceConsole = (instance: any, daemonId: string) => {
    const windowId = `console-${instance.instanceUuid}`;
    const existing = windows.get(windowId);

    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(windowId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 100 + windowOffset * 30;
    const offsetY = 60 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: instance.config.nickname || "Console",
        icon: markRaw(CodeOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "instance-console",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 800,
        initialHeight: 500,
        instanceId: instance.instanceUuid,
        daemonId: daemonId
    });
};

const closeWindow = (id: string) => {
    windows.delete(id);
};

const minimizeWindow = (id: string) => {
    const win = windows.get(id);
    if (win) win.minimized = true;
};

const maximizeWindow = (id: string) => {
    const win = windows.get(id);
    if (win) win.maximized = !win.maximized;
};

const focusWindow = (id: string) => {
    const win = windows.get(id);
    if (win) {
        win.zIndex = ++nextZIndex;
    }
};

const toggleWindow = (id: string) => {
    const win = windows.get(id);
    if (!win) return;
    if (win.minimized) {
        win.minimized = false;
        focusWindow(id);
    } else if (win.zIndex === nextZIndex) {
        win.minimized = true;
    } else {
        focusWindow(id);
    }
};

const activeWindowId = computed(() => {
    let maxZ = -1;
    let activeId = "";
    windows.forEach((win) => {
        if (!win.minimized && win.visible && win.zIndex > maxZ) {
            maxZ = win.zIndex;
            activeId = win.id;
        }
    });
    return activeId;
});

const taskbarWindows = computed<TaskbarWindow[]>(() => {
    const list: TaskbarWindow[] = [];
    windows.forEach((win) => {
        list.push({
            id: win.id,
            title: win.title,
            icon: win.icon,
            minimized: win.minimized,
            active: win.id === activeWindowId.value
        });
    });
    return list;
});

// ─── Navigate to Route ───
const navigateToRoute = (appId: string) => {
    const app = desktopApps.value.find((a) => a.id === appId);
    if (app?.route) {
        router.push(app.route);
    }
};

// ─── Context Menu ───
const ctxMenu = reactive({
    visible: false,
    x: 0,
    y: 0
});

const ctxMenuItems = computed<ContextMenuItem[]>(() => [
    {
        label: t("TXT_CODE_DESKTOP_REFRESH"),
        icon: markRaw(SyncOutlined),
        action: () => window.location.reload()
    }
]);

const onDesktopContextMenu = (e: MouseEvent) => {
    if (showLoginOverlay.value) return;
    e.preventDefault();
    ctxMenu.x = e.clientX;
    ctxMenu.y = e.clientY;
    ctxMenu.visible = true;
};

const closeContextMenu = () => {
    ctxMenu.visible = false;
};

const onDesktopClick = () => {
    selectedIconId.value = null;
    ctxMenu.visible = false;
};

// ─── Exit Desktop ───
const exitDesktop = async () => {
    await executeLogout();
    window.location.reload();
};

const username = computed(() => appState.userInfo?.userName || "User");
</script>

<template>
    <div class="desktop-container" @click="onDesktopClick" @contextmenu="onDesktopContextMenu">
        <div class="desktop-wallpaper"></div>

        <Transition name="desktop-fade">
            <template v-if="!showLoginOverlay">
                <div class="desktop-content-wrapper">
                    <div class="desktop-icons">
                        <DesktopIcon v-for="app in desktopApps" :key="app.id" :id="app.id" :label="app.label"
                            :icon="app.icon" :color="app.color" :selected="selectedIconId === app.id"
                            @select="selectIcon" @open="openWindow" />
                    </div>

                    <TransitionGroup name="desktop-window-group">
                        <DesktopWindow v-for="[id, win] in windows" :key="id" :id="win.id" :title="win.title"
                            :icon="win.icon" :visible="win.visible" :minimized="win.minimized"
                            :maximized="win.maximized" :active="win.id === activeWindowId" :initial-x="win.initialX"
                            :initial-y="win.initialY" :initial-width="win.initialWidth"
                            :initial-height="win.initialHeight" :z-index="win.zIndex" @close="closeWindow"
                            @minimize="minimizeWindow" @maximize="maximizeWindow" @focus="focusWindow">
                            <div class="window-inner-content">
                                <DesktopInstanceManager v-if="win.content === 'instances'"
                                    @open-console="openInstanceConsole" />

                                <DesktopInstanceConsole
                                    v-else-if="win.content === 'instance-console' && win.instanceId && win.daemonId"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId" />

                                <DesktopOverview v-else-if="win.content === 'overview'" />

                                <DesktopUsers v-else-if="win.content === 'users'" />

                                <div v-else-if="win.content === 'nodes'" class="window-page">
                                    <div class="window-page__header">
                                        <h3>
                                            <ClusterOutlined /> {{ t("TXT_CODE_DESKTOP_NODES") }}
                                        </h3>
                                        <p>{{ t("TXT_CODE_DESKTOP_NODES_DESC") }}</p>
                                    </div>
                                    <div class="window-page__actions">
                                        <button class="window-btn window-btn--primary"
                                            @click="navigateToRoute('nodes')">
                                            {{ t("TXT_CODE_DESKTOP_OPEN_FULL") }}
                                        </button>
                                    </div>
                                </div>

                                <div v-else-if="win.content === 'market'" class="window-page">
                                    <div class="window-page__header">
                                        <h3>
                                            <ShoppingOutlined /> {{ t("TXT_CODE_DESKTOP_MARKET") }}
                                        </h3>
                                        <p>{{ t("TXT_CODE_DESKTOP_MARKET_DESC") }}</p>
                                    </div>
                                    <div class="window-page__actions">
                                        <button class="window-btn window-btn--primary"
                                            @click="navigateToRoute('market')">
                                            {{ t("TXT_CODE_DESKTOP_OPEN_FULL") }}
                                        </button>
                                    </div>
                                </div>

                                <div v-else-if="win.content === 'settings'" class="window-page">
                                    <div class="window-page__header">
                                        <h3>
                                            <SettingOutlined /> {{ t("TXT_CODE_DESKTOP_SETTINGS") }}
                                        </h3>
                                        <p>{{ t("TXT_CODE_DESKTOP_SETTINGS_DESC") }}</p>
                                    </div>
                                    <div class="window-page__actions">
                                        <button class="window-btn window-btn--primary"
                                            @click="navigateToRoute('settings')">
                                            {{ t("TXT_CODE_DESKTOP_OPEN_FULL") }}
                                        </button>
                                    </div>
                                </div>

                                <div v-else-if="win.content === 'terminal'" class="window-page">
                                    <div class="window-page__header">
                                        <h3>
                                            <CodeOutlined /> {{ t("TXT_CODE_DESKTOP_TERMINAL") }}
                                        </h3>
                                        <p>{{ t("TXT_CODE_DESKTOP_TERMINAL_DESC") }}</p>
                                    </div>
                                    <div class="window-terminal-placeholder">
                                        <div class="terminal-mock">
                                            <div class="terminal-line">
                                                <span class="terminal-prompt">$</span>
                                                <span class="terminal-cursor">_</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div v-else-if="win.content === 'about'" class="window-page window-page--about">
                                    <div class="about-content">
                                        <div class="about-logo">
                                            <img src="/desktop-icon.svg" alt="ElementsPanel" />
                                        </div>
                                        <h2>ElementsPanel</h2>
                                        <p class="about-desc">{{ t("TXT_CODE_DESKTOP_ABOUT_DESC") }}</p>
                                        <div class="about-info">
                                            <div class="about-row">
                                                <span class="about-label">{{
                                                    t("TXT_CODE_DESKTOP_ABOUT_USER")
                                                }}</span>
                                                <span class="about-value">{{ username }}</span>
                                            </div>
                                            <div class="about-row">
                                                <span class="about-label">{{
                                                    t("TXT_CODE_DESKTOP_ABOUT_ROLE")
                                                }}</span>
                                                <span class="about-value">{{
                                                    isAdmin ? "Admin" : "User"
                                                }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div v-else class="window-page">
                                    <p>{{ win.title }}</p>
                                </div>
                            </div>
                        </DesktopWindow>
                    </TransitionGroup>

                    <DesktopTaskbar :windows="taskbarWindows" :username="username" @toggle-window="toggleWindow"
                        @exit-desktop="exitDesktop" />

                    <DesktopContextMenu :visible="ctxMenu.visible" :x="ctxMenu.x" :y="ctxMenu.y" :items="ctxMenuItems"
                        @close="closeContextMenu" />
                </div>
            </template>
        </Transition>


        <DesktopLoginWindow v-if="showLoginOverlay" @login-success="handleLoginSuccess" />
    </div>
</template>

<style lang="scss" scoped>
.desktop-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 100;
}

.desktop-wallpaper {
    position: absolute;
    inset: 0;
    z-index: 0;
}

/* When body has background image, make wallpaper transparent to show it */
:global(body.app-light-extend-theme) .desktop-wallpaper,
:global(body.app-dark-extend-theme) .desktop-wallpaper {
    background-color: transparent;
}

.desktop-icons {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, 90px);
    grid-auto-rows: 100px;
    gap: 4px;
    padding: 16px;
    align-content: start;
    height: calc(100vh - 48px);
    overflow-y: auto;
}

.window-inner-content {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.window-page {
    padding: 24px;
    height: 100%;
    display: flex;
    flex-direction: column;

    &__header {
        margin-bottom: 20px;

        h3 {
            font-size: 20px;
            font-weight: 600;
            color: #fff;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        p {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            margin: 0;
        }
    }

    &__actions {
        margin-top: auto;
        padding-top: 16px;
    }

    &--about {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

.window-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    color: #fff;

    &--primary {
        background: var(--color-blue-5);

        &:hover {
            background: var(--color-blue-6);
            transform: translateY(-1px);
        }
    }
}

.window-terminal-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.terminal-mock {
    flex: 1;
    background: #0d1117;
    border-radius: 8px;
    padding: 16px;
    font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
    font-size: 13px;
}

.terminal-line {
    display: flex;
    align-items: center;
    gap: 8px;
}

.terminal-prompt {
    color: #58a6ff;
}

.terminal-cursor {
    color: #c9d1d9;
    animation: blink 1s infinite;
}

@keyframes blink {

    0%,
    50% {
        opacity: 1;
    }

    51%,
    100% {
        opacity: 0;
    }
}

.about-content {
    text-align: center;
    padding: 32px;

    .about-logo {
        margin-bottom: 16px;

        img {
            width: 64px;
            height: 64px;
        }
    }

    h2 {
        font-size: 24px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 8px 0;
    }

    .about-desc {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 24px;
    }

    .about-info {
        text-align: left;
        max-width: 280px;
        margin: 0 auto;
    }

    .about-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .about-label {
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
    }

    .about-value {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        font-weight: 500;
    }
}

.desktop-window-group-enter-active {
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.desktop-window-group-leave-active {
    transition: all 0.2s ease-in;
}

.desktop-window-group-enter-from {
    opacity: 0;
    transform: scale(0.9);
}

.desktop-window-group-leave-to {
    opacity: 0;
    transform: scale(0.9);
}

.desktop-fade-enter-active,
.desktop-fade-leave-active {
    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.desktop-fade-enter-from,
.desktop-fade-leave-to {
    opacity: 0;
    transform: scale(1.02);
}

.desktop-content-wrapper {
    position: absolute;
    inset: 0;
    z-index: 1;
}
</style>
