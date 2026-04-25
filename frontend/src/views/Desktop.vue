<script setup lang="ts">
import { t } from "@/lang/i18n";
import { logoutUser } from "@/services/apis/index";
import { getDesktopLayoutConfig, setDesktopLayoutConfig } from "@/services/apis/layout";
import { useAppConfigStore } from "@/stores/useAppConfigStore";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { useLayoutConfigStore } from "@/stores/useLayoutConfig";
import type { ContextMenuItem } from "@/widgets/desktop/DesktopContextMenu.vue";
import DesktopContextMenu from "@/widgets/desktop/DesktopContextMenu.vue";
import DesktopEventConfig from "@/widgets/desktop/DesktopEventConfig.vue";
import DesktopFileEditor from "@/widgets/desktop/DesktopFileEditor.vue";
import DesktopFileManager from "@/widgets/desktop/DesktopFileManager.vue";
import DesktopIcon from "@/widgets/desktop/DesktopIcon.vue";
import DesktopInstanceConsole from "@/widgets/desktop/DesktopInstanceConsole.vue";
import DesktopInstanceManager from "@/widgets/desktop/DesktopInstanceManager.vue";
import DesktopLoginWindow from "@/widgets/desktop/DesktopLoginWindow.vue";
import DesktopMarket from "@/widgets/desktop/DesktopMarket.vue";
import DesktopMyApps from "@/widgets/desktop/DesktopMyApps.vue";
import DesktopNewInstance from "@/widgets/desktop/DesktopNewInstance.vue";
import DesktopNodeManager from "@/widgets/desktop/DesktopNodeManager.vue";
import DesktopOverview from "@/widgets/desktop/DesktopOverview.vue";
import DesktopSchedule from "@/widgets/desktop/DesktopSchedule.vue";
import DesktopServerConfig from "@/widgets/desktop/DesktopServerConfig.vue";
import DesktopSettings from "@/widgets/desktop/DesktopSettings.vue";
import type { TaskbarWindow } from "@/widgets/desktop/DesktopTaskbar.vue";
import DesktopTaskbar from "@/widgets/desktop/DesktopTaskbar.vue";
import DesktopTermConfig from "@/widgets/desktop/DesktopTermConfig.vue";
import DesktopTerminalSelector from "@/widgets/desktop/DesktopTerminalSelector.vue";
import DesktopUserInfo from "@/widgets/desktop/DesktopUserInfo.vue";
import DesktopUsers from "@/widgets/desktop/DesktopUsers.vue";
import DesktopWindow from "@/widgets/desktop/DesktopWindow.vue";
import {
    AppstoreOutlined,
    ClusterOutlined,
    CodeOutlined,
    ControlOutlined,
    DashboardOutlined,
    DesktopOutlined,
    EditOutlined,
    FieldTimeOutlined,
    FolderOpenOutlined,
    SettingOutlined,
    ShoppingOutlined,
    SyncOutlined,
    TeamOutlined,
    UserOutlined
} from "@ant-design/icons-vue";
import { computed, markRaw, onMounted, reactive, ref, watch, type Component, type CSSProperties } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { state: appState, isAdmin, isLogged } = useAppStateStore();
const { execute: executeLogout } = logoutUser();
const { getSettingsConfig } = useLayoutConfigStore();
const { isDarkTheme } = useAppConfigStore();

//─── Wallpaper Background ───
const backgroundImageUrl = ref<string>("");

const wallpaperStyle = computed<CSSProperties>(() => {
    if (!backgroundImageUrl.value) {
        return { backgroundColor: "#232429" };
    }
    const overlay = isDarkTheme.value
        ? "linear-gradient(135deg, rgba(0,0,0,0.65), rgba(0,0,0,0.65) 100%)"
        : "linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 100%)";
    return {
        backgroundImage: `${overlay}, url(${backgroundImageUrl.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
    };
});

onMounted(async () => {
    try {
        const settings = await getSettingsConfig();
        if (settings?.theme?.backgroundImage) {
            backgroundImageUrl.value = settings.theme.backgroundImage;
        }
    } catch (e) {
        // Silently ignore – fallback to solid color
    }
});

//─── Login Overlay ───
const showLoginOverlay = computed(() => !isLogged.value);

const handleLoginSuccess = () => {
    // Login overlay will auto-hide via isLogged becoming true
};

// Watch for login state changes to load layout after login
watch(isLogged, (logged) => {
    if (logged) {
        loadDesktopLayout();
    }
});

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
        }
    ];

    if (!isAdmin.value) {
        return [
            {
                id: "my-apps",
                label: t("TXT_CODE_DESKTOP_MY_APPS"),
                icon: markRaw(AppstoreOutlined),
                color: "#1677ff",
                windowContent: "my-apps"
            }
        ];
    }
    return apps;
});

const selectedIconId = ref<string | null>(null);

const selectIcon = (id: string) => {
    selectedIconId.value = id;
};

//─── Window Management ───
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
    type?: string;
    filePath?: string;
    fileName?: string;
}

const windows = reactive<Map<string, WindowState>>(new Map());
let nextZIndex = 100;
let windowOffset = 0;

// ─── Desktop Layout Persistence ───
const { execute: executeGetLayout } = getDesktopLayoutConfig();
const { execute: executeSaveLayout } = setDesktopLayoutConfig();

let saveLayoutTimer: ReturnType<typeof setTimeout> | null = null;
let layoutLoaded = false;

const saveDesktopLayout = () => {
    if (!isLogged.value || !layoutLoaded) return;
    if (saveLayoutTimer) clearTimeout(saveLayoutTimer);
    saveLayoutTimer = setTimeout(async () => {
        try {
            const windowList: any[] = [];
            windows.forEach((win) => {
                windowList.push({
                    id: win.id,
                    content: win.content,
                    title: win.title,
                    x: win.initialX,
                    y: win.initialY,
                    width: win.initialWidth,
                    height: win.initialHeight,
                    maximized: win.maximized,
                    zIndex: win.zIndex,
                    instanceId: win.instanceId,
                    daemonId: win.daemonId,
                    type: win.type,
                    filePath: win.filePath,
                    fileName: win.fileName
                });
            });
            await executeSaveLayout({
                data: { windows: windowList, updatedAt: Date.now() }
            });
        } catch (e) {
            // Silently ignore save errors
        }
    }, 500);
};

const ICON_MAP: Record<string, Component> = {
    "instances": markRaw(DesktopOutlined),
    "overview": markRaw(DashboardOutlined),
    "users": markRaw(TeamOutlined),
    "nodes": markRaw(ClusterOutlined),
    "market": markRaw(ShoppingOutlined),
    "settings": markRaw(SettingOutlined),
    "terminal": markRaw(CodeOutlined),
    "my-apps": markRaw(AppstoreOutlined),
    "instance-console": markRaw(CodeOutlined),
    "file-manager": markRaw(FolderOpenOutlined),
    "file-editor": markRaw(EditOutlined),
    "server-config": markRaw(ControlOutlined),
    "schedule": markRaw(FieldTimeOutlined),
    "event-config": markRaw(DashboardOutlined),
    "term-config": markRaw(CodeOutlined),
    "new-instance": markRaw(DesktopOutlined),
    "user-info": markRaw(UserOutlined)
};

const loadDesktopLayout = async () => {
    try {
        const result = await executeGetLayout();
        const layout = result?.value;
        if (layout && Array.isArray(layout.windows) && layout.windows.length > 0) {
            windows.clear();
            for (const win of layout.windows) {
                const icon = ICON_MAP[win.content] || markRaw(DesktopOutlined);
                const zIndex = typeof win.zIndex === "number" ? win.zIndex : ++nextZIndex;
                if (zIndex > nextZIndex) nextZIndex = zIndex;
                windows.set(win.id, {
                    id: win.id,
                    title: win.title || win.id,
                    icon,
                    visible: true,
                    minimized: false,
                    maximized: win.maximized || false,
                    zIndex,
                    content: win.content,
                    initialX: win.x || 100,
                    initialY: win.y || 60,
                    initialWidth: win.width || 800,
                    initialHeight: win.height || 500,
                    instanceId: win.instanceId,
                    daemonId: win.daemonId,
                    type: win.type,
                    filePath: win.filePath,
                    fileName: win.fileName
                });
            }
        }
        layoutLoaded = true;
    } catch (e) {
        layoutLoaded = true;
        // Silently ignore load errors
    }
};

// Load layout on mount if already logged in
onMounted(async () => {
    if (isLogged.value) {
        await loadDesktopLayout();
    }
});

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
        initialWidth: 980,
        initialHeight: 580
    });
    saveDesktopLayout();
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
        initialWidth: 1000,
        initialHeight: 650,
        instanceId: instance.instanceUuid,
        daemonId: daemonId
    });
    saveDesktopLayout();
};

const openFileManagerWindow = (instanceId: string, daemonId: string, instanceName: string) => {
    const windowId = `file-manager-${instanceId}-${Date.now()}`;

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 120 + windowOffset * 30;
    const offsetY = 80 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: `${instanceName} - ${t("TXT_CODE_ae533703")}`,
        icon: markRaw(FolderOpenOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "file-manager",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 900,
        initialHeight: 600,
        instanceId: instanceId,
        daemonId: daemonId
    });
    saveDesktopLayout();
};

const openFileEditorWindow = (instanceId: string, daemonId: string, filePath: string, fileName: string) => {
    const windowId = `file-editor-${instanceId}-${Date.now()}`;

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 140 + windowOffset * 30;
    const offsetY = 100 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: fileName,
        icon: markRaw(EditOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "file-editor",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 900,
        initialHeight: 600,
        instanceId: instanceId,
        daemonId: daemonId,
        filePath: filePath,
        fileName: fileName
    });
    saveDesktopLayout();
};

const openServerConfigWindow = (instanceId: string, daemonId: string, type: string) => {
    const windowId = `server-config-${instanceId}`;
    const existing = windows.get(windowId);

    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(windowId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 120 + windowOffset * 30;
    const offsetY = 80 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: t("TXT_CODE_d07742fe"),
        icon: markRaw(ControlOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "server-config",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 800,
        initialHeight: 600,
        instanceId: instanceId,
        daemonId: daemonId,
        type: type
    });
    saveDesktopLayout();
};

const openScheduleWindow = (instanceId: string, daemonId: string) => {
    const windowId = `schedule-${instanceId}`;
    const existing = windows.get(windowId);

    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(windowId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 120 + windowOffset * 30;
    const offsetY = 80 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: t("TXT_CODE_b7d026f8"),
        icon: markRaw(FieldTimeOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "schedule",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 700,
        initialHeight: 500,
        instanceId: instanceId,
        daemonId: daemonId
    });
    saveDesktopLayout();
};

const openEventConfigWindow = (instanceId: string, daemonId: string) => {
    const windowId = `event-config-${instanceId}`;
    const existing = windows.get(windowId);

    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(windowId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 120 + windowOffset * 30;
    const offsetY = 80 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: t("TXT_CODE_10150756"),
        icon: markRaw(DashboardOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "event-config",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 500,
        initialHeight: 450,
        instanceId: instanceId,
        daemonId: daemonId
    });
    saveDesktopLayout();
};

const openTermConfigWindow = (instanceId: string, daemonId: string) => {
    const windowId = `term-config-${instanceId}`;
    const existing = windows.get(windowId);

    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(windowId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 120 + windowOffset * 30;
    const offsetY = 80 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: t("TXT_CODE_d23631cb"),
        icon: markRaw(CodeOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "term-config",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 700,
        initialHeight: 500,
        instanceId: instanceId,
        daemonId: daemonId
    });
    saveDesktopLayout();
};

const openNewInstanceWindow = () => {
    const windowId = "new-instance";
    const existing = windows.get(windowId);

    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(windowId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 120 + windowOffset * 30;
    const offsetY = 80 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: t("TXT_CODE_DESKTOP_IM_NEW_INSTANCE"),
        icon: markRaw(DesktopOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "new-instance",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 500,
        initialHeight: 400
    });
    saveDesktopLayout();
};

const openUserInfoWindow = () => {
    const windowId = "user-info";
    const existing = windows.get(windowId);

    if (existing) {
        existing.minimized = false;
        existing.visible = true;
        focusWindow(windowId);
        return;
    }

    windowOffset = (windowOffset + 1) % 8;
    const offsetX = 140 + windowOffset * 30;
    const offsetY = 100 + windowOffset * 30;

    windows.set(windowId, {
        id: windowId,
        title: t("TXT_CODE_9bb2f08b"),
        icon: markRaw(UserOutlined),
        visible: true,
        minimized: false,
        maximized: false,
        zIndex: ++nextZIndex,
        content: "user-info",
        initialX: offsetX,
        initialY: offsetY,
        initialWidth: 600,
        initialHeight: 500
    });
    saveDesktopLayout();
};

const closeWindow = (id: string) => {
    windows.delete(id);
    saveDesktopLayout();
};

const minimizeWindow = (id: string) => {
    const win = windows.get(id);
    if (win) win.minimized = true;
};

const maximizeWindow = (id: string) => {
    const win = windows.get(id);
    if (win) {
        win.maximized = !win.maximized;
        saveDesktopLayout();
    }
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

// ─── Handle window moved/resized events fromDesktopWindow ───
const handleWindowMoved = (id: string, newX: number, newY: number) => {
    const win = windows.get(id);
    if (win) {
        win.initialX = newX;
        win.initialY = newY;
        saveDesktopLayout();
    }
};

const handleWindowResized = (id: string, newX: number, newY: number, newWidth: number, newHeight: number) => {
    const win = windows.get(id);
    if (win) {
        win.initialX = newX;
        win.initialY = newY;
        win.initialWidth = newWidth;
        win.initialHeight = newHeight;
        saveDesktopLayout();
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

const handleReorderWindows = (newOrder: string[]) => {
    const newWindowsMap = new Map<string, WindowState>();

    newOrder.forEach(id => {
        const win = windows.get(id);
        if (win) {
            newWindowsMap.set(id, win);
        }
    });

    windows.forEach((win, id) => {
        if (!newWindowsMap.has(id)) {
            newWindowsMap.set(id, win);
        }
    });

    windows.clear();
    newWindowsMap.forEach((win, id) => {
        windows.set(id, win);
    });
};

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
        <div class="desktop-wallpaper" :style="wallpaperStyle"></div>
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
                            @minimize="minimizeWindow" @maximize="maximizeWindow" @focus="focusWindow"
                            @moved="handleWindowMoved" @resized="handleWindowResized">
                            <div class="window-inner-content">
                                <DesktopMyApps v-if="win.content === 'my-apps'" @open-console="openInstanceConsole" />

                                <DesktopInstanceManager v-else-if="win.content === 'instances'"
                                    @open-console="openInstanceConsole" @open-new-instance="openNewInstanceWindow" />

                                <DesktopNewInstance v-else-if="win.content === 'new-instance'"
                                    @close="closeWindow(win.id)" />

                                <DesktopInstanceConsole
                                    v-else-if="win.content === 'instance-console' && win.instanceId && win.daemonId"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId"
                                    @open-server-config="openServerConfigWindow"
                                    @open-file-manager="openFileManagerWindow" @open-schedule="openScheduleWindow"
                                    @open-event-config="openEventConfigWindow"
                                    @open-term-config="openTermConfigWindow" />

                                <DesktopServerConfig
                                    v-else-if="win.content === 'server-config' && win.instanceId && win.daemonId && win.type"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId" :type="win.type" />

                                <DesktopSchedule
                                    v-else-if="win.content === 'schedule' && win.instanceId && win.daemonId"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId" />

                                <DesktopEventConfig
                                    v-else-if="win.content === 'event-config' && win.instanceId && win.daemonId"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId"
                                    @close="closeWindow(win.id)" />

                                <DesktopTermConfig
                                    v-else-if="win.content === 'term-config' && win.instanceId && win.daemonId"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId"
                                    @close="closeWindow(win.id)" />

                                <DesktopFileManager
                                    v-else-if="win.content === 'file-manager' && win.instanceId && win.daemonId"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId" :session-id="win.id"
                                    @open-file-editor="(filePath: string, fileName: string) => openFileEditorWindow(win.instanceId!, win.daemonId!, filePath, fileName)" />

                                <DesktopFileEditor
                                    v-else-if="win.content === 'file-editor' && win.instanceId && win.daemonId && win.filePath && win.fileName"
                                    :instance-id="win.instanceId" :daemon-id="win.daemonId" :file-path="win.filePath"
                                    :file-name="win.fileName" @close="closeWindow(win.id)" />

                                <DesktopOverview v-else-if="win.content === 'overview'" />

                                <DesktopUsers v-else-if="win.content === 'users'" />

                                <DesktopNodeManager v-else-if="win.content === 'nodes'" />

                                <DesktopSettings v-else-if="win.content === 'settings'" />

                                <DesktopMarket v-else-if="win.content === 'market'"
                                    @open-console="openInstanceConsole" />

                                <DesktopTerminalSelector v-else-if="win.content === 'terminal'"
                                    @open-console="openInstanceConsole" />

                                <DesktopUserInfo v-else-if="win.content === 'user-info'" />

                                <div v-else class="window-page">
                                    <p>{{ win.title }}</p>
                                </div>
                            </div>
                        </DesktopWindow>
                    </TransitionGroup>
                    <DesktopTaskbar :windows="taskbarWindows" :username="username" @toggle-window="toggleWindow"
                        @exit-desktop="exitDesktop" @open-user-info="openUserInfoWindow"
                        @reorder-windows="handleReorderWindows" />
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
