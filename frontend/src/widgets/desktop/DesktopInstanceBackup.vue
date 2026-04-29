<script setup lang="ts">
import { t } from "@/lang/i18n";
import {
    createAsyncTask,
    deleteBackup,
    getBackupList,
    queryAsyncTask,
    restoreBackup
} from "@/services/apis/instance";
import {
    CheckCircleOutlined,
    CloudDownloadOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    HistoryOutlined,
    LoadingOutlined,
    PlusCircleOutlined,
    RollbackOutlined,
    SyncOutlined
} from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
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
const backupList = ref<{ name: string; size: number; time: string }[]>([]);
const listLoading = ref(false);

let timer: any = null;

const fetchBackupList = async () => {
    listLoading.value = true;
    try {
        const { execute } = getBackupList();
        const res = await execute({
            params: {
                daemonId: props.daemonId,
                uuid: props.instanceUuid
            }
        });
        if (res.value) {
            backupList.value = res.value;
        }
    } catch (error: any) {
        message.error(error.message || t("TXT_CODE_INSTANCE_BACKUP_FAILED_FETCH"));
    } finally {
        listLoading.value = false;
    }
};

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
                    fetchBackupList();
                }
            }
        } catch (error) {
            clearInterval(timer);
            timer = null;
        }
    }, 2000);
};

const handleDelete = (backupName: string) => {
    Modal.confirm({
        title: t("TXT_CODE_INSTANCE_BACKUP_DELETE"),
        content: t("TXT_CODE_INSTANCE_BACKUP_DELETE_CONFIRM", { name: backupName }),
        onOk: async () => {
            try {
                const { execute } = deleteBackup();
                await execute({
                    params: {
                        daemonId: props.daemonId,
                        uuid: props.instanceUuid,
                        backupName
                    }
                });
                message.success(t("TXT_CODE_28190dbc"));
                fetchBackupList();
            } catch (error: any) {
                message.error(error.message || t("TXT_CODE_INSTANCE_BACKUP_FAILED_DELETE"));
            }
        }
    });
};

const handleRestore = (backupName: string) => {
    Modal.confirm({
        title: t("TXT_CODE_INSTANCE_BACKUP_RESTORE"),
        content: t("TXT_CODE_INSTANCE_BACKUP_RESTORE_CONFIRM", { name: backupName }),
        onOk: async () => {
            try {
                const { execute } = restoreBackup();
                await execute({
                    params: {
                        daemonId: props.daemonId,
                        uuid: props.instanceUuid,
                        backupName
                    }
                });
                message.success(t("TXT_CODE_INSTANCE_BACKUP_RESTORE_SUCCESS"));
            } catch (error: any) {
                message.error(error.message || t("TXT_CODE_INSTANCE_BACKUP_FAILED_RESTORE"));
            }
        }
    });
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

onMounted(() => {
    fetchBackupList();
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<template>
    <div class="ds-backup">
        <div class="ds-backup-body">
            <div v-if="taskStatus === 1 || (taskStatus !== 0 && backupInfo)" class="ds-backup-content">
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
                    <button class="ds-btn ds-btn--primary ds-btn--lg" @click="backupInfo = null">
                        {{ t("TXT_CODE_c14b2ea3") }}
                    </button>
                </div>
                <div v-else-if="taskStatus === -1" class="ds-backup-status">
                    <ExclamationCircleOutlined class="status-icon status-icon--error" />
                    <p class="status-text">{{ t("TXT_CODE_INSTANCE_BACKUP_FAILED_TITLE") }}</p>
                    <p class="status-hint">{{ t("TXT_CODE_INSTANCE_BACKUP_FAILED_HINT") }}</p>
                    <button class="ds-btn ds-btn--primary ds-btn--lg" @click="backupInfo = null">
                        {{ t("TXT_CODE_c14b2ea3") }}
                    </button>
                </div>
            </div>

            <div v-else class="ds-backup-list-container">
                <div class="list-header">
                    <HistoryOutlined />
                    {{ t("TXT_CODE_INSTANCE_BACKUP_LIST") }}
                    <SyncOutlined :spin="listLoading" class="refresh-btn" @click="fetchBackupList" />
                </div>
                <div v-if="backupList.length > 0" class="backup-list">
                    <div v-for="item in backupList" :key="item.name" class="backup-item">
                        <div class="backup-item__info">
                            <div class="backup-item__name" :title="item.name">{{ item.name }}</div>
                            <div class="backup-item__meta">
                                <span>{{ formatSize(item.size) }}</span>
                                <span class="separator">|</span>
                                <span>{{ item.time }}</span>
                            </div>
                        </div>
                        <div class="backup-item__actions">
                            <button class="action-btn action-btn--restore"
                                :title="t('TXT_CODE_INSTANCE_BACKUP_RESTORE')" @click="handleRestore(item.name)">
                                <RollbackOutlined />
                            </button>
                            <button class="action-btn action-btn--delete" :title="t('TXT_CODE_INSTANCE_BACKUP_DELETE')"
                                @click="handleDelete(item.name)">
                                <DeleteOutlined />
                            </button>
                        </div>
                    </div>
                </div>
                <div v-else-if="!listLoading" class="ds-backup-intro">
                    <CloudDownloadOutlined class="intro-icon" />
                    <p>{{ t("TXT_CODE_INSTANCE_BACKUP_INTRO") }}</p>
                </div>
                <div v-else class="list-loading">
                    <LoadingOutlined />
                </div>
            </div>
        </div>
        <div v-if="taskStatus !== 1 && !backupInfo" class="ds-backup-footer">
            <button class="ds-dialog-btn ds-dialog-btn--primary" :disabled="loading" @click="startBackup">
                <SyncOutlined v-if="loading" spin />
                <PlusCircleOutlined v-else />
                {{ t("TXT_CODE_INSTANCE_BACKUP_START_BTN") }}
            </button>
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
    padding: 16px 20px 0;
}

.ds-backup-footer {
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid var(--desktop-window-border);
    flex-shrink: 0;
}

.ds-dialog-btn {
    padding: 7px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    color: var(--desktop-window-text);
    white-space: nowrap;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &--primary {
        background: var(--color-blue-5, #1677ff);
        color: #fff;
        border-color: var(--color-blue-5, #1677ff);

        &:hover:not(:disabled) {
            background: var(--color-blue-6, #4096ff);
        }
    }
}

.ds-backup-content {
    max-width: 500px;
    width: 100%;
    text-align: center;
    margin: auto;
}

.ds-backup-list-container {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;

    .list-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--desktop-window-text);

        .refresh-btn {
            margin-left: auto;
            cursor: pointer;
            opacity: 0.7;

            &:hover {
                opacity: 1;
            }
        }
    }

    .backup-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-bottom: 20px;
    }

    .backup-item {
        background: var(--desktop-window-titlebar-bg);
        border: 1px solid var(--desktop-window-border);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.2s;

        &:hover {
            border-color: var(--color-blue-5);
        }

        &__info {
            flex: 1;
            min-width: 0;
            margin-right: 16px;
        }

        &__name {
            font-weight: 500;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        &__meta {
            font-size: 12px;
            color: var(--desktop-window-text-muted);
            display: flex;
            align-items: center;
            gap: 8px;

            .separator {
                opacity: 0.3;
            }
        }

        &__actions {
            display: flex;
            gap: 8px;
        }

        .action-btn {
            background: transparent;
            border: none;
            padding: 6px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;

            &--restore {
                color: var(--color-blue-5);

                &:hover {
                    background: rgba(22, 119, 255, 0.1);
                }
            }

            &--delete {
                color: #ff4d4f;

                &:hover {
                    background: rgba(255, 77, 79, 0.1);
                }
            }
        }
    }

    .list-loading {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: var(--color-blue-5);
    }
}

.ds-backup-intro {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;

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
        margin: 0;
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
