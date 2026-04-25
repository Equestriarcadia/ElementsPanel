<script setup lang="ts">
import { useAppRouters } from "@/hooks/useAppRouters";
import {
    TYPE_MINECRAFT_JAVA,
    TYPE_STEAM_SERVER_UNIVERSAL,
    useInstanceInfo
} from "@/hooks/useInstance";
import { useServerConfig } from "@/hooks/useServerConfig";
import { t } from "@/lang/i18n";
import { modListApi } from "@/services/apis/modManager";
import { useAppStateStore } from "@/stores/useAppStateStore";
import {
    AppstoreAddOutlined,
    BuildOutlined,
    CodeOutlined,
    ControlOutlined,
    DashboardOutlined,
    FieldTimeOutlined,
    FolderOpenOutlined,
    UsbOutlined,
    UsergroupDeleteOutlined
} from "@ant-design/icons-vue";
import { computed, ref, watch } from "vue";
import { arrayFilter } from "../../tools/array";
import EventConfig from "../instance/dialogs/EventConfig.vue";
import InstanceDetail from "../instance/dialogs/InstanceDetail.vue";
import InstanceFundamentalDetail from "../instance/dialogs/InstanceFundamentalDetail.vue";
import JavaManager from "../instance/dialogs/JavaManager.vue";
import McPingSettings from "../instance/dialogs/McPingSettings.vue";
import PingConfig from "../instance/dialogs/PingConfig.vue";
import RconSettings from "../instance/dialogs/RconSettings.vue";
import TermConfig from "../instance/dialogs/TermConfig.vue";

const props = defineProps<{
    instanceId: string;
    daemonId: string;
}>();

const emit = defineEmits<{
    (e: "open-server-config", type: string): void;
    (e: "open-file-manager"): void;
    (e: "open-mod-manager"): void;
    (e: "open-schedule"): void;
}>();

const { isAdmin, state } = useAppStateStore();
const { toPage: toOtherPager } = useAppRouters();

const terminalConfigDialog = ref<InstanceType<typeof TermConfig>>();
const rconSettingsDialog = ref<InstanceType<typeof RconSettings>>();
const mcSettingsDialog = ref<InstanceType<typeof McPingSettings>>();
const javaManagerDialog = ref<InstanceType<typeof JavaManager>>();
const eventConfigDialog = ref<InstanceType<typeof EventConfig>>();
const pingConfigDialog = ref<InstanceType<typeof PingConfig>>();
const instanceDetailsDialog = ref<InstanceType<typeof InstanceDetail>>();
const instanceFundamentalDetailDialog = ref<InstanceType<typeof InstanceFundamentalDetail>>();

const { instanceInfo, execute, isGlobalTerminal } = useInstanceInfo({
    instanceId: props.instanceId,
    daemonId: props.daemonId,
    autoRefresh: true
});

const { serverConfigFiles, refresh: refreshServerConfig } = useServerConfig();

const folders = ref<string[]>([]);
const foldersLoaded = ref(false);

const loadFolders = async () => {
    if (!props.instanceId || !props.daemonId) return;
    try {
        const { execute } = modListApi();
        const res = await execute({
            params: {
                uuid: props.instanceId,
                daemonId: props.daemonId
            }
        });
        folders.value = res.value?.folders || [];
    } catch (err) {
        console.error("Failed to load folders:", err);
    } finally {
        foldersLoaded.value = true;
    }
};

watch(
    () => [props.instanceId, props.daemonId],
    () => {
        loadFolders();
    },
    { immediate: true }
);

const refreshInstanceInfo = async () => {
    await execute({
        params: {
            uuid: props.instanceId ?? "",
            daemonId: props.daemonId ?? ""
        },
        forceRequest: true
    });
};

const btns = computed(() => {
    if (!instanceInfo.value) return [];
    return arrayFilter([
        {
            title: t("TXT_CODE_d07742fe"),
            icon: ControlOutlined,
            condition: () => {
                return (
                    !isGlobalTerminal.value &&
                    !!serverConfigFiles.value &&
                    serverConfigFiles.value?.length > 0
                );
            },
            click: (): void => {
                emit("open-server-config", instanceInfo.value?.config.type ?? "");
            }
        },
        {
            title: t("TXT_CODE_ae533703"),
            icon: FolderOpenOutlined,
            click: () => {
                emit("open-file-manager");
            },
            condition: () => state.settings.canFileManager || isAdmin.value
        },
        {
            title: t("TXT_CODE_MOD_MANAGER"),
            icon: UsbOutlined,
            click: () => {
                emit("open-mod-manager");
            },
            condition: () => {
                const type = instanceInfo.value?.config.type || "";
                const isMC = type.startsWith("minecraft/java") || type.startsWith("minecraft/bedrock");
                if (!isMC) return false;
                const hasPermission = state.settings.canFileManager || isAdmin.value;
                if (!hasPermission) return false;
                if (!foldersLoaded.value) return false;
                return folders.value && folders.value.length > 0;
            }
        },
        {
            title: t("TXT_CODE_3fee13ed"),
            icon: BuildOutlined,
            click: () => {
                javaManagerDialog.value?.openDialog();
            },
            condition: () =>
                (instanceInfo.value?.config.type.includes(TYPE_MINECRAFT_JAVA) &&
                    instanceInfo.value?.config.processType === "general") ??
                false
        },
        {
            title: t("TXT_CODE_656a85d8"),
            icon: BuildOutlined,
            click: () => {
                rconSettingsDialog.value?.openDialog();
            },
            condition: () =>
                instanceInfo.value?.config.type.includes(TYPE_STEAM_SERVER_UNIVERSAL) ?? false
        },
        {
            title: t("TXT_CODE_b7d026f8"),
            icon: FieldTimeOutlined,
            condition: () => !isGlobalTerminal.value,
            click: () => {
                emit("open-schedule");
            }
        },
        {
            title: t("TXT_CODE_d341127b"),
            icon: DashboardOutlined,
            click: () => {
                eventConfigDialog.value?.openDialog();
            }
        },
        {
            title: t("TXT_CODE_d23631cb"),
            icon: CodeOutlined,
            click: () => {
                terminalConfigDialog.value?.openDialog();
            }
        },
        {
            title: t("TXT_CODE_4f34fc28"),
            icon: AppstoreAddOutlined,
            condition: () => isAdmin.value,
            click: () => {
                instanceDetailsDialog.value?.openDialog();
            }
        },
        {
            title: t("TXT_CODE_40241d8e"),
            icon: UsergroupDeleteOutlined,
            click: () => {
                mcSettingsDialog.value?.openDialog();
            },
            condition: () => instanceInfo.value?.config.type.includes(TYPE_MINECRAFT_JAVA) ?? false
        },
        {
            title: t("TXT_CODE_4f34fc28"),
            icon: AppstoreAddOutlined,
            condition: () =>
                !isAdmin.value &&
                instanceInfo.value?.config.processType === "docker" &&
                state.settings.allowChangeCmd,
            click: () => {
                instanceFundamentalDetailDialog.value?.openDialog();
            }
        }
    ]);
});

watch(instanceInfo, (cfg, oldCfg) => {
    if (cfg?.config?.type && props.instanceId && props.daemonId && cfg.config.type !== oldCfg?.config?.type) {
        refreshServerConfig(cfg.config.type, props.instanceId, props.daemonId);
    }
});
</script>

<template>
    <div class="dim-mgr-btns">
        <div class="dim-mgr-btns__title">{{ t("TXT_CODE_efd37c48") }}</div>
        <div class="dim-mgr-btns__row">
            <div v-for="btn in btns" :key="btn.title" class="dim-mgr-btn" :title="btn.title" @click="btn.click">
                <component :is="btn.icon" />
            </div>
        </div>
    </div>

    <TermConfig ref="terminalConfigDialog" :instance-info="instanceInfo" :instance-id="props.instanceId"
        :daemon-id="props.daemonId" @update="refreshInstanceInfo" />

    <EventConfig ref="eventConfigDialog" :instance-info="instanceInfo" :instance-id="props.instanceId"
        :daemon-id="props.daemonId" @update="refreshInstanceInfo" />

    <PingConfig ref="pingConfigDialog" :instance-info="instanceInfo" :instance-id="props.instanceId"
        :daemon-id="props.daemonId" @update="refreshInstanceInfo" />

    <InstanceDetail ref="instanceDetailsDialog" :instance-info="instanceInfo" :instance-id="props.instanceId"
        :daemon-id="props.daemonId" @update="refreshInstanceInfo" />

    <InstanceFundamentalDetail ref="instanceFundamentalDetailDialog" :instance-info="instanceInfo"
        :instance-id="props.instanceId" :daemon-id="props.daemonId" @update="refreshInstanceInfo" />

    <RconSettings ref="rconSettingsDialog" :instance-info="instanceInfo" :instance-id="props.instanceId"
        :daemon-id="props.daemonId" @update="refreshInstanceInfo" />

    <McPingSettings ref="mcSettingsDialog" :instance-info="instanceInfo" :instance-id="props.instanceId"
        :daemon-id="props.daemonId" @update="refreshInstanceInfo" />

    <JavaManager ref="javaManagerDialog" :instance-info="instanceInfo" :daemon-id="props.daemonId"
        :instance-id="props.instanceId" @update="refreshInstanceInfo" />
</template>

<style lang="scss" scoped>
.dim-mgr-btns {
    padding: 8px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    &__title {
        font-size: 10px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.35);
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    &__row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
}

.dim-mgr-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.15);
    }
}
</style>
