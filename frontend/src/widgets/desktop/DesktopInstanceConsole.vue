<script setup lang="ts">
import { openMarketDialog, openRenewalDialog } from "@/components/fc";
import TerminalCore from "@/components/TerminalCore.vue";
import { INSTANCE_TYPE_TRANSLATION, verifyEULA } from "@/hooks/useInstance";
import { useTerminal, type UseTerminalHook } from "@/hooks/useTerminal";
import { t } from "@/lang/i18n";
import {
    killInstance,
    openInstance,
    restartInstance,
    stopInstance,
    updateInstance
} from "@/services/apis/instance";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { sleep } from "@/tools/common";
import { reportErrorMsg } from "@/tools/validator";
import { INSTANCE_CRASH_TIMEOUT, INSTANCE_STATUS } from "@/types/const";
import {
    CheckCircleOutlined,
    CloseOutlined,
    CloudDownloadOutlined,
    InfoCircleOutlined,
    InteractionOutlined,
    LaptopOutlined,
    LoadingOutlined,
    MoneyCollectOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    RedoOutlined
} from "@ant-design/icons-vue";
import { Modal } from "ant-design-vue";
import { computed, h, onUnmounted } from "vue";
import { GLOBAL_INSTANCE_NAME } from "../../config/const";
import { arrayFilter } from "../../tools/array";

const props = defineProps<{
    instanceId: string;
    daemonId: string;
}>();

const { state, isAdmin } = useAppStateStore();

const terminalHook: UseTerminalHook = useTerminal();
const {
    state: instanceInfo,
    isStopped,
    isRunning,
    isBuys,
    isGlobalTerminal,
    isDockerMode,
    clearTerminal
} = terminalHook;

const instanceTypeText = computed(
    () => INSTANCE_TYPE_TRANSLATION[instanceInfo.value?.config.type ?? -1]
);

const { execute: requestOpenInstance, isLoading: isOpenInstanceLoading } = openInstance();

let checkRunningTimer: NodeJS.Timeout;
const toOpenInstance = async () => {
    if (checkRunningTimer) clearTimeout(checkRunningTimer);
    clearTerminal();
    try {
        if (instanceInfo.value?.config?.type?.startsWith("minecraft/java")) {
            const flag = await verifyEULA(props.instanceId, props.daemonId);
            if (!flag) return;
            await sleep(1000);
        }

        await requestOpenInstance({
            params: {
                uuid: props.instanceId,
                daemonId: props.daemonId
            }
        });

        checkRunningTimer = setTimeout(() => {
            if (terminalHook.isStopped.value) {
                Modal.error({
                    title: t("TXT_CODE_ac405b50"),
                    content: h("div", [
                        h("p", t("TXT_CODE_3409258a")),
                        h("p", `${t("TXT_CODE_973414e1")}：${instanceInfo.value?.config.startCommand || ""}`),
                        isDockerMode.value &&
                        h("p", `${t("TXT_CODE_44b585c7")}：${instanceInfo.value?.config.docker.image || ""}`)
                    ])
                });
            }
        }, INSTANCE_CRASH_TIMEOUT);
    } catch (error: any) {
        reportErrorMsg(error);
    }
};

const updateCmd = computed(() => (instanceInfo.value?.config.updateCommand ? true : false));
const instanceStatusText = computed(() => INSTANCE_STATUS[instanceInfo.value?.status ?? -1]);

const quickOperations = computed(() =>
    arrayFilter([
        {
            title: t("TXT_CODE_57245e94"),
            icon: PlayCircleOutlined,
            noConfirm: false,
            type: "default",
            class: "button-color-success",
            click: toOpenInstance,
            props: {},
            condition: () => isStopped.value
        },
        {
            title: t("TXT_CODE_b1dedda3"),
            icon: PauseCircleOutlined,
            type: "default",
            click: async () => {
                try {
                    await stopInstance().execute({
                        params: {
                            uuid: props.instanceId,
                            daemonId: props.daemonId
                        }
                    });
                } catch (error: any) {
                    reportErrorMsg(error);
                }
            },
            props: {
                danger: true
            },
            condition: () => isRunning.value
        }
    ])
);

const instanceOperations = computed(() =>
    arrayFilter([
        {
            title: t("TXT_CODE_47dcfa5"),
            icon: RedoOutlined,
            type: "default",
            noConfirm: false,
            click: async () => {
                try {
                    await restartInstance().execute({
                        params: {
                            uuid: props.instanceId,
                            daemonId: props.daemonId
                        }
                    });
                } catch (error: any) {
                    reportErrorMsg(error);
                }
            },
            condition: () => isRunning.value
        },
        {
            title: t("TXT_CODE_7b67813a"),
            icon: CloseOutlined,
            type: "danger",
            class: "color-warning",
            click: async () => {
                try {
                    await killInstance().execute({
                        params: {
                            uuid: props.instanceId,
                            daemonId: props.daemonId
                        }
                    });
                } catch (error: any) {
                    reportErrorMsg(error);
                }
            },
            condition: () => !isStopped.value
        },
        {
            title: t("TXT_CODE_40ca4f2"),
            type: "default",
            icon: CloudDownloadOutlined,
            click: async () => {
                try {
                    clearTerminal();
                    await updateInstance().execute({
                        params: {
                            uuid: props.instanceId,
                            daemonId: props.daemonId,
                            task_name: "update"
                        },
                        data: {
                            time: new Date().getTime()
                        }
                    });
                } catch (error: any) {
                    reportErrorMsg(error);
                }
            },
            condition: () => isStopped.value && updateCmd.value
        },
        {
            title: t("TXT_CODE_b19ed1dd"),
            icon: InteractionOutlined,
            noConfirm: true,
            click: async () => {
                try {
                    clearTerminal();
                    await openMarketDialog(props.daemonId, props.instanceId, {
                        autoInstall: true,
                        onlyDockerTemplate: isDockerMode.value
                    });
                } catch (error: any) {
                    // ignore
                }
            },
            props: {},
            condition: () =>
                isStopped.value &&
                (state.settings.allowUsePreset || isAdmin.value) &&
                !isGlobalTerminal.value
        },
        {
            title: t("TXT_CODE_f77093c8"),
            icon: MoneyCollectOutlined,
            noConfirm: true,
            click: async () => {
                await openRenewalDialog(
                    instanceInfo.value?.instanceUuid ?? "",
                    props.daemonId,
                    instanceInfo.value?.config.category ?? 0
                );
            },
            props: {},
            condition: () => !!instanceInfo.value?.config?.category
        }
    ])
);

const getInstanceName = computed(() => {
    if (instanceInfo.value?.config.nickname === GLOBAL_INSTANCE_NAME) {
        return t("TXT_CODE_5bdaf23d");
    } else {
        return instanceInfo.value?.config.nickname;
    }
});

onUnmounted(() => {
    if (checkRunningTimer) clearTimeout(checkRunningTimer);
});
</script>

<template>
    <div class="dim">
        <div class="dim-toolbar">
            <div class="dim-toolbar__left">
                <div class="dim-instance__header">
                    <span class="dim-instance__status" :class="{
                        'status--running': isRunning,
                        'status--busy': isBuys,
                        'status--stopped': isStopped
                    }">
                        <CheckCircleOutlined v-if="isRunning" />
                        <LoadingOutlined v-else-if="isBuys" />
                        <InfoCircleOutlined v-else />
                    </span>
                    <span class="dim-instance__name">{{ getInstanceName }}</span>
                    <span class="dim-instance__badge" :class="{
                        'status--running': isRunning,
                        'status--busy': isBuys,
                        'status--stopped': isStopped
                    }">
                        {{ instanceStatusText }}
                    </span>
                    <span v-if="instanceTypeText" class="dim-instance__type">{{ instanceTypeText }}</span>
                    <span v-if="instanceInfo?.watcher && instanceInfo?.watcher > 1" class="dim-instance__players">
                        <LaptopOutlined /> {{ instanceInfo?.watcher }}
                    </span>
                </div>
            </div>
            <div class="dim-toolbar__right">
                <template v-for="item in [...quickOperations, ...instanceOperations]" :key="item.title">
                    <button v-if="item.noConfirm" class="dim-btn dim-btn--sm" :class="{
                        'dim-btn--primary': item.class === 'button-color-success',
                        'dim-btn--danger': item.type === 'danger'
                    }" :disabled="isOpenInstanceLoading" @click="item.click" :title="item.title">
                        <component :is="item.icon" />
                        {{ item.title }}
                    </button>
                    <a-popconfirm v-else :key="item.title" :title="t('TXT_CODE_276756b2')" @confirm="item.click">
                        <button class="dim-btn dim-btn--sm" :class="{
                            'dim-btn--primary': item.class === 'button-color-success',
                            'dim-btn--danger': item.type === 'danger'
                        }" :title="item.title">
                            <component :is="item.icon" />
                            {{ item.title }}
                        </button>
                    </a-popconfirm>
                </template>
            </div>
        </div>
        <div class="dim-list">
            <TerminalCore :use-terminal-hook="terminalHook" :instance-id="instanceId" :daemon-id="daemonId"
                height="100%" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.dim {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
}

// ─── Toolbar ───
.dim-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-wrap: wrap;

    &__left,
    &__right {
        display: flex;
        align-items: center;
        gap: 8px;
    }
}

.dim-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.8);
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    &--sm {
        padding: 4px 10px;
        font-size: 11px;
    }

    &--primary {
        color: #52c41a;
        border-color: rgba(82, 196, 26, 0.3);
        background: rgba(82, 196, 26, 0.1);

        &:hover:not(:disabled) {
            background: rgba(82, 196, 26, 0.2);
        }
    }

    &--danger {
        color: #ff4d4f;
        border-color: rgba(255, 77, 79, 0.3);
        background: rgba(255, 77, 79, 0.1);

        &:hover:not(:disabled) {
            background: rgba(255, 77, 79, 0.2);
        }
    }
}

// ─── Instance Header Styles ───
.dim-instance__header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.dim-instance__status {
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;

    &.status--running {
        color: #52c41a;
    }

    &.status--stopped {
        color: #8c8c8c;
    }

    &.status--busy {
        color: #ff4d4f;
    }
}

.dim-instance__name {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
}

.dim-instance__badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
    white-space: nowrap;

    &.status--running {
        background: rgba(82, 196, 26, 0.15);
        color: #52c41a;
    }

    &.status--stopped {
        background: rgba(140, 140, 140, 0.15);
        color: #8c8c8c;
    }

    &.status--busy {
        background: rgba(255, 77, 79, 0.15);
        color: #ff4d4f;
    }
}

.dim-instance__type {
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
}

.dim-instance__players {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    gap: 4px;
}

// ─── Content Area ───
.dim-list {
    flex: 1;
    padding: 8px;
    overflow: hidden;
    position: relative;
}

:deep(.console-wrapper) {
    height: 100%;
    display: flex;
    flex-direction: column;
}

:deep(.terminal-wrapper) {
    flex: 1;
    margin-bottom: 12px;
}

:deep(.command-input) {
    flex-shrink: 0;
}
</style>
