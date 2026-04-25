<script setup lang="ts">
import { useInstanceInfo } from "@/hooks/useInstance";
import { t } from "@/lang/i18n";
import {
    LoadingOutlined,
    ReloadOutlined,
    SearchOutlined,
    UploadOutlined
} from "@ant-design/icons-vue";
import { Flex, message } from "ant-design-vue";
import { computed, onMounted, ref, watch } from "vue";
import FileEditor from "../instance/dialogs/FileEditor.vue";
import LocalModTable from "../instance/mod-manager/LocalModTable.vue";
import ModConfigModal from "../instance/mod-manager/ModConfigModal.vue";
import ModFloatingTools from "../instance/mod-manager/ModFloatingTools.vue";
import ModVersionModal from "../instance/mod-manager/ModVersionModal.vue";
import SearchModTable from "../instance/mod-manager/SearchModTable.vue";
import { useDeferredTasks } from "../instance/mod-manager/useDeferredTasks";
import { useLocalMods } from "../instance/mod-manager/useLocalMods";
import { useModConfig } from "../instance/mod-manager/useModConfig";
import { useModSearch } from "../instance/mod-manager/useModSearch";
import { useModUpload } from "../instance/mod-manager/useModUpload";

const TAB_KEY_MODS = "TAB_KEY_MODS";
const TAB_KEY_PLUGINS = "TAB_KEY_PLUGINS";
const TAB_KEY_DOWNLOAD = "TAB_KEY_DOWNLOAD";

const props = defineProps<{
    instanceId: string;
    daemonId: string;
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

const { instanceInfo, isRunning: isInstanceRunning } = useInstanceInfo({
    instanceId: props.instanceId,
    daemonId: props.daemonId,
    autoRefresh: true
});

const activeKey = ref(TAB_KEY_MODS);
const headerSearchQuery = ref("");

const isWindows = computed(() => {
    const config = instanceInfo.value?.config;
    if (config?.crlf === 2) return true;
    const cwd = config?.cwd || "";
    if (/^[a-zA-Z]:\\/.test(cwd) || cwd.includes("\\")) return true;
    return false;
});

const isRunning = computed(() => {
    const s = instanceInfo.value?.status;
    return s === 2 || s === 3;
});

const checkAndConfirm = async (
    type: string,
    name: string,
    data: any,
    immediateFn: () => Promise<void>
) => {
    if (isWindows.value && isRunning.value) {
        const { createVNode } = await import("vue");
        const { Modal, Button } = await import("ant-design-vue");
        const { ExclamationCircleOutlined } = await import("@ant-design/icons-vue");
        Modal.confirm({
            title: t("TXT_CODE_MOD_WIN_FILE_LOCK_TITLE"),
            icon: createVNode(ExclamationCircleOutlined),
            content: t("TXT_CODE_MOD_WIN_FILE_LOCK_DESC"),
            okText: t("TXT_CODE_MOD_ADD_TO_QUEUE"),
            cancelText: t("TXT_CODE_MOD_TRY_IMMEDIATELY"),
            closable: true,
            maskClosable: true,
            footer: createVNode(
                "div",
                {
                    style: {
                        marginTop: "24px",
                        textAlign: "right",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px"
                    }
                },
                [
                    createVNode(
                        Button,
                        {
                            onClick: () => {
                                Modal.destroyAll();
                            }
                        },
                        { default: () => t("TXT_CODE_a0451c97") }
                    ),
                    createVNode(
                        Button,
                        {
                            danger: true,
                            onClick: () => {
                                Modal.destroyAll();
                                immediateFn();
                            }
                        },
                        { default: () => t("TXT_CODE_MOD_TRY_IMMEDIATELY") }
                    ),
                    createVNode(
                        Button,
                        {
                            type: "primary",
                            onClick: () => {
                                Modal.destroyAll();
                                addDeferredTask(type, name, data);
                            }
                        },
                        { default: () => t("TXT_CODE_MOD_ADD_TO_QUEUE") }
                    )
                ]
            )
        });
    } else {
        await immediateFn();
    }
};

const {
    deferredTasks,
    autoExecute,
    isExecuting,
    addDeferredTask,
    removeDeferredTask,
    executeDeferredTask,
    executeAllDeferredTasks
} = useDeferredTasks(props.instanceId, props.daemonId, async () => {
    await loadMods();
});

watch(
    () => isInstanceRunning.value,
    (running) => {
        if (!running) {
            loadMods();
        }
    }
);

const {
    loading,
    loadingExtra,
    mods,
    folders,
    loadMods: originalLoadMods,
    onToggle,
    onDelete,
    fileStatus,
    tablePagination
} = useLocalMods(props.instanceId, props.daemonId, checkAndConfirm, addDeferredTask);

const getCurrentFolder = () => {
    if (activeKey.value === TAB_KEY_MODS) return "mods";
    if (activeKey.value === TAB_KEY_PLUGINS) return "plugins";
    return undefined;
};

const loadMods = async (folder?: string) => {
    const targetFolder = folder !== undefined ? folder : getCurrentFolder();
    await originalLoadMods(targetFolder);
};

const {
    searchFilters,
    searchLoading,
    searched,
    searchResults,
    searchTotal,
    searchPage,
    searchLimit,
    mcVersions,
    loaderOptions,
    loadMcVersions,
    onSearch,
    resetSearch,
    showVersions,
    onDownload,
    showVersionModal,
    selectedMod,
    versions,
    versionsLoading,
    formatDate
} = useModSearch(props.instanceId, props.daemonId, () => mods.value, loadMods, folders);

const openExternal = (mod: any) => {
    const { source, id, slug, name } = mod;
    const baseUrlMap: Record<string, string> = {
        Modrinth: `https://modrinth.com/project/${slug || id}`,
        CurseForge: `https://www.curseforge.com/projects/${id}`,
        SpigotMC: `https://www.spigotmc.org/resources/${id}`,
        MCMod: `https://www.mcmod.cn/class/${id}.html`
    };
    const url = baseUrlMap[source];
    if (!url) {
        message.error(t("TXT_CODE_8d2a42a2"));
    } else {
        window.open(url, "_blank");
    }
};

const handleDownload = async (version: any) => {
    const task = await onDownload(version);
    if (task) {
        await checkAndConfirm(task.type, task.name, task.data, task.immediateFn);
    }
};

const {
    opacity,
    handleDragover,
    handleDragleave,
    handleDrop,
    onUploadClick,
    onFileChange,
    fileInput
} = useModUpload(props.instanceId, props.daemonId, activeKey, loadMods);

const FileEditorDialog = ref();

const { showConfigModal, currentMod, configFiles, configLoading, openConfig, editFile } =
    useModConfig(props.instanceId, props.daemonId, FileEditorDialog);

const hasModsFolder = computed(() => folders.value.includes("mods"));
const hasPluginsFolder = computed(() => folders.value.includes("plugins"));

watch(
    [hasModsFolder, hasPluginsFolder, loading],
    ([hasMods, hasPlugins, isLoading]) => {
        if (isLoading) return;
        if (hasMods && activeKey.value === TAB_KEY_MODS) return;
        if (hasPlugins && activeKey.value === TAB_KEY_PLUGINS) return;
        if (activeKey.value === TAB_KEY_DOWNLOAD) return;

        if (hasMods) {
            activeKey.value = TAB_KEY_MODS;
        } else if (hasPlugins) {
            activeKey.value = TAB_KEY_PLUGINS;
        } else {
            activeKey.value = TAB_KEY_DOWNLOAD;
        }
    },
    { immediate: true }
);

const filterBySearch = (list: any[]) => {
    if (!headerSearchQuery.value) return list;
    const query = headerSearchQuery.value.toLowerCase();
    return list.filter(
        (m: any) =>
            (m.name || "").toLowerCase().includes(query) || (m.file || "").toLowerCase().includes(query)
    );
};

const filteredMods = computed(() => filterBySearch(mods.value));
const filteredPlugins = computed(() => filterBySearch(mods.value));

const columns = computed(() => {
    const cols: any[] = [
        {
            title: "",
            key: "icon",
            dataIndex: "icon",
            width: 50,
            align: "center"
        },
        {
            title: t("TXT_CODE_NAME"),
            key: "name",
            dataIndex: "name",
            sorter: (a: any, b: any) => (a.name || "").localeCompare(b.name || "")
        },
        {
            title: t("TXT_CODE_VERSION"),
            key: "version",
            dataIndex: "version",
            width: 120
        },
        {
            title: t("TXT_CODE_STATUS"),
            key: "enabled",
            dataIndex: "enabled",
            width: 80,
            align: "center",
            sorter: (a: any, b: any) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1)
        },
        {
            title: t("TXT_CODE_OPERATE"),
            key: "action",
            dataIndex: "action",
            width: 140,
            align: "center"
        }
    ];
    return cols;
});

const searchColumns = computed(() => {
    const cols: any[] = [
        { title: "", key: "icon", dataIndex: "icon", width: 50, align: "center" },
        {
            title: t("TXT_CODE_NAME"),
            key: "name",
            dataIndex: "name"
        },
        {
            title: t("TXT_CODE_VERSION"),
            key: "version",
            dataIndex: "version",
            width: 140,
            align: "left"
        },
        {
            title: t("TXT_CODE_TYPE"),
            key: "type",
            dataIndex: "type",
            width: 80,
            align: "center"
        },
        {
            title: t("TXT_CODE_SOURCE"),
            key: "source",
            dataIndex: "source",
            width: 100,
            align: "center"
        },
        {
            title: t("TXT_CODE_OPERATE"),
            key: "action",
            dataIndex: "action",
            width: 100,
            align: "center"
        }
    ];
    return cols;
});

const handleTableChange = (pagination: any) => {
    if (
        tablePagination.current !== pagination.current ||
        tablePagination.pageSize !== pagination.pageSize
    ) {
        tablePagination.current = pagination.current;
        tablePagination.pageSize = pagination.pageSize;
        loadMods(getCurrentFolder());
    }
};

const handleTabChange = (newKey: string | number) => {
    tablePagination.current = 1;
    if (newKey === TAB_KEY_MODS || newKey === TAB_KEY_PLUGINS) {
        loadMods(newKey === TAB_KEY_MODS ? "mods" : "plugins");
    }
};

onMounted(async () => {
    loadMcVersions();
    await loadMods(getCurrentFolder());
    setTimeout(() => {
        loadMods(getCurrentFolder());
    }, 500);
});
</script>

<template>
    <div class="dmm">
        <!-- Header -->
        <div v-if="activeKey === TAB_KEY_MODS || activeKey === TAB_KEY_PLUGINS" class="dmm-header">
            <div class="dmm-header__right">
                <div class="dmm-search">
                    <a-input v-model:value="headerSearchQuery" :placeholder="t('TXT_CODE_SEARCH_PLACEHOLDER')"
                        allow-clear size="small" style="width: 200px">
                        <template #suffix>
                            <SearchOutlined />
                        </template>
                    </a-input>
                </div>
                <button class="dmm-btn dmm-btn--sm" @click="onUploadClick" :title="t('TXT_CODE_ae09d79d')">
                    <UploadOutlined /> {{ t("TXT_CODE_ae09d79d") }}
                </button>
                <button class="dmm-btn dmm-btn--sm dmm-btn--primary" :disabled="loading" @click="() => loadMods()"
                    :title="t('TXT_CODE_REFRESH')">
                    <ReloadOutlined :spin="loading" /> {{ t("TXT_CODE_REFRESH") }}
                </button>
            </div>
        </div>

        <!-- Body -->
        <div class="dmm-body">
            <div class="dmm-content" @dragover.prevent="handleDragover" @dragleave.prevent="handleDragleave"
                @drop.prevent="handleDrop">
                <!-- Drag upload overlay -->
                <div v-if="opacity" class="dmm-drag-overlay">
                    <div class="dmm-drag-overlay__inner">
                        <UploadOutlined class="dmm-drag-overlay__icon" />
                        <div class="dmm-drag-overlay__text">{{ t("TXT_CODE_DRAG_TO_UPLOAD") }}</div>
                    </div>
                </div>

                <!-- Windows warning -->
                <a-alert v-if="isWindows && isRunning" type="warning" show-icon class="dmm-alert">
                    <template #message>
                        <div class="text-left">
                            <div class="font-bold">{{ t("TXT_CODE_MOD_WIN_FILE_LOCK_TITLE") }}</div>
                            <div class="text-xs opacity-80 font-normal mt-1">
                                {{ t("TXT_CODE_MOD_WIN_RUNNING_ALERT") }}
                            </div>
                        </div>
                    </template>
                </a-alert>

                <!-- Tabs -->
                <a-tabs v-model:activeKey="activeKey" class="dmm-tabs" destroy-inactive-tab-pane
                    @change="handleTabChange">
                    <a-tab-pane v-if="hasModsFolder" :key="TAB_KEY_MODS">
                        <template #tab>
                            <Flex align="center" :gap="6">
                                {{ t("TXT_CODE_MOD_LIST") }}
                                <a-badge v-if="!loading && activeKey === TAB_KEY_MODS" :count="filteredMods.length"
                                    :show-zero="true" :overflow-count="999" :number-style="{
                                        backgroundColor: '#f0f0f0',
                                        color: '#555',
                                        boxShadow: 'none'
                                    }" size="small" />
                                <LoadingOutlined v-if="loading || loadingExtra"
                                    style="font-size: 12px; color: #1890ff" />
                            </Flex>
                        </template>
                        <div class="dmm-table-wrapper">
                            <LocalModTable :key="TAB_KEY_MODS" :loading="loading" :data-source="filteredMods"
                                :columns="columns" :pagination="tablePagination" @change="handleTableChange"
                                @toggle="onToggle" @delete="onDelete" @config="openConfig" @open-external="openExternal"
                                @refresh="loadMods" />
                        </div>
                    </a-tab-pane>

                    <a-tab-pane v-if="hasPluginsFolder" :key="TAB_KEY_PLUGINS">
                        <template #tab>
                            <Flex align="center" :gap="6">
                                {{ t("TXT_CODE_PLUGIN_LIST") }}
                                <a-badge v-if="!loading && activeKey === TAB_KEY_PLUGINS"
                                    :count="filteredPlugins.length" :show-zero="true" :overflow-count="999"
                                    :number-style="{
                                        backgroundColor: '#f0f0f0',
                                        color: '#555',
                                        boxShadow: 'none'
                                    }" size="small" />
                                <LoadingOutlined v-if="loading || loadingExtra"
                                    style="font-size: 12px; color: #1890ff" />
                            </Flex>
                        </template>
                        <div class="dmm-table-wrapper">
                            <LocalModTable :key="TAB_KEY_PLUGINS" :loading="loading" :data-source="filteredPlugins"
                                :columns="columns" :pagination="tablePagination" @change="handleTableChange"
                                @toggle="onToggle" @delete="onDelete" @config="openConfig" @open-external="openExternal"
                                @refresh="loadMods" />
                        </div>
                    </a-tab-pane>

                    <a-tab-pane :key="TAB_KEY_DOWNLOAD" :tab="t('TXT_CODE_25bf0004')">
                        <div class="dmm-download">
                            <a-form layout="horizontal" :model="searchFilters" class="dmm-search-form">
                                <a-row :gutter="[12, 8]">
                                    <a-col :span="6">
                                        <a-form-item>
                                            <a-input v-model:value="searchFilters.query"
                                                :placeholder="t('TXT_CODE_SEARCH_PLACEHOLDER')" size="small"
                                                @press-enter="onSearch" />
                                        </a-form-item>
                                    </a-col>
                                    <a-col :span="4">
                                        <a-form-item>
                                            <a-select v-model:value="searchFilters.source" size="small">
                                                <a-select-option value="all">
                                                    {{ t("TXT_CODE_9693b0e1") }}
                                                </a-select-option>
                                                <a-select-option value="modrinth">Modrinth</a-select-option>
                                                <a-select-option value="curseforge">CurseForge</a-select-option>
                                                <a-select-option value="spigotmc">SpigotMC</a-select-option>
                                            </a-select>
                                        </a-form-item>
                                    </a-col>
                                    <a-col :span="4">
                                        <a-form-item>
                                            <a-select v-model:value="searchFilters.version" show-search allow-clear
                                                size="small" :placeholder="t('TXT_CODE_743b4fe7')">
                                                <a-select-option value="">
                                                    {{ t("TXT_CODE_2af87548") }}
                                                </a-select-option>
                                                <a-select-option v-for="v in mcVersions" :key="v" :value="v">
                                                    {{ v }}
                                                </a-select-option>
                                            </a-select>
                                        </a-form-item>
                                    </a-col>
                                    <a-col :span="3">
                                        <a-form-item>
                                            <a-select v-model:value="searchFilters.type" size="small">
                                                <a-select-option value="all">
                                                    {{ t("TXT_CODE_cc4db8f0") }}
                                                </a-select-option>
                                                <a-select-option value="mod">
                                                    {{ t("TXT_CODE_MOD") }}
                                                </a-select-option>
                                                <a-select-option value="plugin">
                                                    {{ t("TXT_CODE_PLUGIN") }}
                                                </a-select-option>
                                            </a-select>
                                        </a-form-item>
                                    </a-col>
                                    <a-col :span="3">
                                        <a-form-item>
                                            <a-select v-model:value="searchFilters.environment" size="small">
                                                <a-select-option value="all">
                                                    {{ t("TXT_CODE_74e77b4c") }}
                                                </a-select-option>
                                                <a-select-option value="server">
                                                    {{ t("TXT_CODE_SERVER") }}
                                                </a-select-option>
                                                <a-select-option value="client">
                                                    {{ t("TXT_CODE_CLIENT") }}
                                                </a-select-option>
                                            </a-select>
                                        </a-form-item>
                                    </a-col>
                                    <a-col :span="4">
                                        <a-form-item>
                                            <a-select v-model:value="searchFilters.loader" show-search allow-clear
                                                size="small" :options="loaderOptions" option-filter-prop="label"
                                                style="width: 100%" :placeholder="t('TXT_CODE_SELECT_LOADER')" />
                                        </a-form-item>
                                    </a-col>
                                </a-row>
                                <div class="dmm-search-actions">
                                    <a-button type="primary" size="small" :loading="searchLoading" @click="onSearch">
                                        <template #icon>
                                            <SearchOutlined />
                                        </template>
                                        {{ t("TXT_CODE_SEARCH") }}
                                    </a-button>
                                    <a-button size="small" @click="resetSearch">{{ t("TXT_CODE_880fedf7") }}</a-button>
                                </div>
                            </a-form>
                            <SearchModTable :loading="searchLoading" :data-source="searchResults"
                                :columns="searchColumns" :mods="mods" :pagination="{
                                    current: searchPage,
                                    pageSize: searchLimit,
                                    total: searchTotal,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '20', '50'],
                                    showTotal: (total: number) => t('TXT_CODE_TOTAL_ITEMS', { total })
                                }" @change="(p: any) => onSearch(p.current, p.pageSize)" @show-versions="showVersions"
                                @open-external="openExternal" @download="handleDownload" />
                        </div>
                    </a-tab-pane>
                </a-tabs>

                <ModVersionModal v-model:visible="showVersionModal" :selected-mod="selectedMod" :versions="versions"
                    :versions-loading="versionsLoading" :search-filters="searchFilters" :mods="mods"
                    @download="handleDownload" />

                <ModConfigModal v-model:visible="showConfigModal" :current-mod="currentMod" :config-files="configFiles"
                    :config-loading="configLoading" @edit="editFile" />

                <FileEditor ref="FileEditorDialog" :daemon-id="props.daemonId" :instance-id="props.instanceId" />
            </div>
        </div>

        <ModFloatingTools v-model:deferred-tasks="deferredTasks" v-model:auto-execute="autoExecute"
            :instance-id="props.instanceId" :daemon-id="props.daemonId" :file-status="fileStatus"
            :is-executing="isExecuting" @execute-task="executeDeferredTask" @execute-all="executeAllDeferredTasks"
            @remove-task="removeDeferredTask" @refresh="loadMods" />

        <input ref="fileInput" type="file" multiple style="display: none" accept=".jar,.zip" @change="onFileChange" />
    </div>
</template>

<style lang="scss" scoped>
.dmm {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--desktop-window-text);
    font-size: 13px;
}

// ─── Header ───
.dmm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--desktop-window-border);
    flex-shrink: 0;

    &__left,
    &__right {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    &__title {
        font-size: 13px;
        font-weight: 500;
        color: var(--desktop-window-text);
        display: flex;
        align-items: center;
        gap: 6px;
    }
}

// ─── Buttons ───
.dmm-btn {
    background: var(--desktop-window-titlebar-bg);
    border: 1px solid var(--desktop-window-border);
    border-radius: 6px;
    color: var(--desktop-window-text);
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover:not(:disabled) {
        background: var(--desktop-window-control-hover);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    &--sm {
        padding: 4px 10px;
        font-size: 11px;
    }

    &--icon {
        padding: 4px 8px;
        font-size: 14px;
    }

    &--primary {
        color: #1890ff;
        border-color: rgba(24, 144, 255, 0.3);
        background: rgba(24, 144, 255, 0.1);

        &:hover:not(:disabled) {
            background: rgba(24, 144, 255, 0.2);
        }
    }
}

// ─── Search ───
.dmm-search {
    :deep(.ant-input) {
        background: var(--desktop-window-titlebar-bg);
        border-color: var(--desktop-window-border);
        color: var(--desktop-window-text);
        font-size: 12px;

        &::placeholder {
            color: var(--desktop-window-text-muted);
        }
    }

    :deep(.ant-input-suffix) {
        color: var(--desktop-window-text-muted);
    }
}

// ─── Body ───
.dmm-body {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.dmm-content {
    height: 100%;
    overflow: auto;
    padding: 8px 12px;
    position: relative;
}

// ─── Drag overlay ───
.dmm-drag-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(128, 128, 128, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 2px dashed var(--ant-primary-color);
    border-radius: 8px;
    pointer-events: none;

    &__inner {
        text-align: center;
    }

    &__icon {
        font-size: 48px;
        color: var(--ant-primary-color);
    }

    &__text {
        margin-top: 8px;
        font-size: 16px;
        font-weight: bold;
        color: var(--ant-primary-color);
    }
}

// ─── Alert ───
.dmm-alert {
    margin-bottom: 12px;
    padding: 8px 14px !important;

    :deep(.ant-alert-content) {
        text-align: left !important;
    }
}

// ─── Tabs ───
.dmm-tabs {
    :deep(.ant-tabs-nav) {
        margin-bottom: 0;
    }

    :deep(.ant-tabs-tab) {
        font-size: 12px;
        padding: 6px 12px;
    }
}

// ─── Table wrapper ───
.dmm-table-wrapper {
    padding: 8px 0;
}

// ─── Download section ───
.dmm-download {
    padding: 8px 0;
}

.dmm-search-form {
    margin-bottom: 12px;

    :deep(.ant-form-item) {
        margin-bottom: 0;
    }

    :deep(.ant-input),
    :deep(.ant-select-selection-item),
    :deep(.ant-select-selection-placeholder) {
        text-align: left !important;
        font-size: 12px;
    }
}

.dmm-search-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px;
}
</style>
