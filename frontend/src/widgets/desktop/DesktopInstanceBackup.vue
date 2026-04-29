<script setup lang="ts">
import { t } from "@/lang/i18n";
import { createAsyncTask, queryAsyncTask } from "@/services/apis/instance";
import {
    CheckCircleOutlined,
    CloudDownloadOutlined,
    ExclamationCircleOutlined,
    LoadingOutlined,
    PlusCircleOutlined,
    SyncOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
    instanceUuid: string;
    daemonId: string;
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

const loading = ref(false);
const taskId = ref<string | null>(null);
const taskStatus = ref<number>(0);
const backupInfo = ref<any>(null);

let timer: any = null;

const startBackup = async () => {
    loading.value = true;
    try {
        const { execute } = createAsyncTask();
        const res = await execute({
            params: {
                daemonId: props.daemonId,
                uuid: props.instanceUuid,
                task_name: "instance_backup"
            },
            data: {
                time: new Date().getTime(),
                newInstanceName: ""
            }
        });
        if (res.value) {
            taskId.value = res.value.taskId;
            message.success(t("TXT_CODE_INSTANCE_BACKUP_STARTED"));
            startQuery();
        }
    } catch (error: any) {
        message.error(error.message || t("TXT_CODE_INSTANCE_BACKUP_FAILED_START"));
    } finally {
        loading.value = false;
    }
};

const startQuery = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(async () => {
        if (!taskId.value) return;
        try {
            const { execute } = queryAsyncTask();
            const res = await execute({
                params: {
                    daemonId: props.daemonId,
                    uuid: props.instanceUuid,
                    task_name: "instance_backup"
                },
                data: {
                    taskId: taskId.value
                }
            });
            if (res.value) {
                taskStatus.value = res.value.status;
                backupInfo.value = res.value.detail;
                if (taskStatus.value !== 1) {
                    clearInterval(timer);
                    timer = null;
                }
            }
        } catch (error) {
            clearInterval(timer);
            timer = null;
        }
    }, 2000);
};

onMounted(() => {
    // Initial check could be added here if needed
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<template>
    <div class="ds-backup">
        <div class="ds-backup-header">
            <div class="ds-backup-header__left">
                <CloudDownloadOutlined />
                {{ t("TXT_CODE_INSTANCE_BACKUP") }}
            </div>
            <div class="ds-backup-header__right">
                <button class="ds-btn" :disabled="loading || taskStatus === 1" @click="startBackup">
                    <SyncOutlined v-if="loading" spin />
                    <PlusCircleOutlined v-else />
                    {{ t("TXT_CODE_INSTANCE_BACKUP_START_BTN") }}
                </button>
            </div>
        </div>

        <div class="ds-backup-body">
            <div class="ds-backup-content">
                <div v-if="taskStatus === 1" class="ds-backup-status">
                    <LoadingOutlined class="status-icon status-icon--loading" />
                    <p class="status-text">{{ t("TXT_CODE_INSTANCE_BACKUP_IN_PROGRESS") }}</p>
                    <p class="status-hint">{{ t("TXT_CODE_INSTANCE_BACKUP_PROGRESS_HINT") }}</p>
                </div>
                <div v-else-if="taskStatus === 0 && backupInfo" class="ds-backup-status">
                    <CheckCircleOutlined class="status-icon status-icon--success" />
                    <p class="status-text">{{ t("TXT_CODE_INSTANCE_BACKUP_COMPLETED") }}</p>
                    <div class="backup-details">
                        <div class="detail-item">
                            <span class="detail-label">{{ t("TXT_CODE_INSTANCE_BACKUP_FILE") }}:</span>
                            <span class="detail-value">{{ backupInfo.backupFileName }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t("TXT_CODE_INSTANCE_BACKUP_PATH") }}:</span>
                            <span class="detail-value">{{ backupInfo.backupPath }}</span>
                        </div>
                    </div>
                </div>
                <div v-else-if="taskStatus === -1" class="ds-backup-status">
                    <ExclamationCircleOutlined class="status-icon status-icon--error" />
                    <p class="status-text">{{ t("TXT_CODE_INSTANCE_BACKUP_FAILED_TITLE") }}</p>
                    <p class="status-hint">{{ t("TXT_CODE_INSTANCE_BACKUP_FAILED_HINT") }}</p>
                </div>
                <div v-else class="ds-backup-intro">
                    <CloudDownloadOutlined class="intro-icon" />
                    <h3>{{ t("TXT_CODE_INSTANCE_BACKUP") }}</h3>
                    <p>{{ t("TXT_CODE_INSTANCE_BACKUP_INTRO") }}</p>
                    <button class="ds-btn ds-btn--primary ds-btn--lg" :disabled="loading" @click="startBackup">
                        <LoadingOutlined v-if="loading" />
                        {{ t("TXT_CODE_INSTANCE_BACKUP_START_BTN") }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.ds-backup {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--desktop-window-text);
    font-size: 13px;
    overflow: hidden;
}

.ds-backup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--desktop-window-border);
    flex-shrink: 0;

    &__left {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
    }

    &__right {
        display: flex;
        align-items: center;
        gap: 6px;
    }
}

.ds-btn {
    background: var(--desktop-window-titlebar-bg);
    border: 1px solid var(--desktop-window-border);
    border-radius: 6px;
    color: var(--desktop-window-text);
    padding: 4px 12px;
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
        opacity: 0.5;
        cursor: not-allowed;
    }

    &--primary {
        color: #fff;
        background: var(--color-blue-5, #1677ff);
        border-color: var(--color-blue-5, #1677ff);

        &:hover:not(:disabled) {
            background: var(--color-blue-6, #4096ff);
        }
    }

    &--lg {
        padding: 8px 24px;
        font-size: 14px;
        margin-top: 16px;
    }
}

.ds-backup-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.ds-backup-content {
    max-width: 500px;
    width: 100%;
    text-align: center;
}

.ds-backup-intro {
    .intro-icon {
        font-size: 64px;
        color: var(--desktop-window-text-muted);
        margin-bottom: 20px;
        opacity: 0.5;
    }

    h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--desktop-window-text);
    }

    p {
        font-size: 14px;
        color: var(--desktop-window-text-secondary);
        line-height: 1.6;
        margin-bottom: 24px;
    }
}

.ds-backup-status {
    .status-icon {
        font-size: 64px;
        margin-bottom: 20px;

        &--loading {
            color: var(--color-blue-5);
        }

        &--success {
            color: #52c41a;
        }

        &--error {
            color: #ff4d4f;
        }
    }

    .status-text {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--desktop-window-text);
    }

    .status-hint {
        font-size: 14px;
        color: var(--desktop-window-text-muted);
    }

    .backup-details {
        margin-top: 24px;
        padding: 16px;
        background: var(--desktop-window-titlebar-bg);
        border: 1px solid var(--desktop-window-border);
        border-radius: 8px;
        text-align: left;

        .detail-item {
            margin-bottom: 8px;
            display: flex;
            flex-direction: column;

            &:last-child {
                margin-bottom: 0;
            }
        }

        .detail-label {
            font-weight: 600;
            font-size: 12px;
            color: var(--desktop-window-text-muted);
            margin-bottom: 2px;
        }

        .detail-value {
            font-size: 13px;
            word-break: break-all;
            color: var(--desktop-window-text);
        }
    }
}
</style>
