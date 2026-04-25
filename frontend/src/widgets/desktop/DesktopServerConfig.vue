<script setup lang="ts">
import InstanceConfigEditor from "@/components/InstanceConfigEditor.vue";
import { getInstanceConfigByType, type InstanceConfigs } from "@/hooks/useInstance";
import { t } from "@/lang/i18n";
import { getConfigFile, getConfigFileList, updateConfigFile } from "@/services/apis/instance";
import { toUnicode } from "@/tools/common";
import { reportErrorMsg } from "@/tools/validator";
import { ArrowLeftOutlined, EditOutlined, FileExclamationOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { onMounted, ref } from "vue";

const props = defineProps<{
    instanceId: string;
    daemonId: string;
    type: string;
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

// ─── State ───
const configFiles = ref<InstanceConfigs[]>([]);
const isLoading = ref(false);
const selectedFile = ref<InstanceConfigs | null>(null);
const configData = ref<any>(null);
const isSaving = ref(false);
const isEditing = ref(false);

// ─── Load config files ───
const { execute: requestConfigFileList, state: configFileListState } = getConfigFileList();

const loadConfigFiles = async () => {
    isLoading.value = true;
    try {
        const files: InstanceConfigs[] = getInstanceConfigByType(props.type ?? "");
        const paths: string[] = files.map((v) => v.path);

        await requestConfigFileList({
            params: {
                uuid: props.instanceId ?? "",
                daemonId: props.daemonId ?? ""
            },
            data: { files: paths }
        });

        // Mark which files exist based on API response
        const realFiles = configFileListState.value;
        files.forEach((file) => {
            file.check = false;
            file.conflict = false;
        });
        if (realFiles) {
            realFiles.forEach((v: { check: boolean; file: string }) => {
                files.forEach((z) => {
                    if (z.path === v.file) {
                        files.forEach((p) => {
                            if (p.path === z.path && p.check) z.conflict = true;
                        });
                        z.check = true;
                    }
                });
            });
        }

        // Only show files that exist on the server
        configFiles.value = files.filter((f) => f.check);
    } catch (err: any) {
        console.error(err);
        reportErrorMsg(err.message);
    } finally {
        isLoading.value = false;
    }
};

// ─── Select & load a config file ───
const { execute: requestConfigFile, state: configFileState, isLoading: isFileLoading } = getConfigFile();

const selectFile = async (file: InstanceConfigs) => {
    selectedFile.value = file;
    isEditing.value = false;
    try {
        const result = await requestConfigFile({
            params: {
                uuid: props.instanceId ?? "",
                daemonId: props.daemonId ?? "",
                fileName: file.path ?? "",
                type: file.type ?? ""
            }
        });
        configData.value = result ? { ...result } : null;
    } catch (err: any) {
        reportErrorMsg(err.message);
        configData.value = null;
    }
};

const goBack = () => {
    selectedFile.value = null;
    configData.value = null;
    isEditing.value = false;
};

// ─── Save config file ───
const { execute: execUpdateConfigFile } = updateConfigFile();

const saveFile = async () => {
    if (!selectedFile.value || !configData.value) return;
    isSaving.value = true;
    try {
        const config = { ...configData.value };
        if (selectedFile.value.path === "server.properties" && props.type?.startsWith("minecraft/java")) {
            for (const key in config) {
                const value = config[key];
                if (value && typeof value === "string") {
                    config[key] = toUnicode(value);
                }
            }
        }

        await execUpdateConfigFile({
            params: {
                uuid: props.instanceId ?? "",
                daemonId: props.daemonId ?? "",
                fileName: selectedFile.value.path ?? "",
                type: selectedFile.value.type ?? ""
            },
            data: config
        });
        message.success(t("TXT_CODE_a7907771"));
    } catch (err: any) {
        reportErrorMsg(err.message);
    } finally {
        isSaving.value = false;
    }
};

// ─── Init ───
onMounted(async () => {
    await loadConfigFiles();
});
</script>

<template>
    <div class="dsc">
        <!-- Header -->
        <div class="dsc__header">
            <button v-if="selectedFile" class="dsc-btn dsc-btn--icon" @click="goBack" :title="t('TXT_CODE_c14b2ea3')">
                <ArrowLeftOutlined />
            </button>
            <span class="dsc__title">
                {{ selectedFile ? selectedFile.fileName : t("TXT_CODE_d07742fe") }}
            </span>
            <div class="dsc__actions">
                <button v-if="!selectedFile" class="dsc-btn dsc-btn--sm" @click="loadConfigFiles" :disabled="isLoading">
                    <ReloadOutlined /> {{ t("TXT_CODE_b76d94e0") }}
                </button>
                <template v-if="selectedFile">
                    <button class="dsc-btn dsc-btn--sm dsc-btn--primary" @click="saveFile" :disabled="isSaving">
                        <SaveOutlined /> {{ t("TXT_CODE_abfe9512") }}
                    </button>
                    <button class="dsc-btn dsc-btn--sm" @click="loadConfigFiles" :disabled="isFileLoading">
                        <ReloadOutlined /> {{ t("TXT_CODE_b76d94e0") }}
                    </button>
                </template>
            </div>
        </div>

        <!-- Body -->
        <div class="dsc__body">
            <!-- File List View -->
            <div v-if="!selectedFile" class="dsc-list">
                <div v-if="configFiles.length === 0 && !isLoading" class="dsc-empty">
                    <FileExclamationOutlined class="dsc-empty__icon" />
                    <p class="dsc-empty__text">{{ t("TXT_CODE_37a4c14a") }}</p>
                    <p class="dsc-empty__hint">{{ t("TXT_CODE_4c0fda9") }}</p>
                </div>
                <div v-else class="dsc-list__items">
                    <div v-for="file in configFiles" :key="file.path" class="dsc-file-item" @click="selectFile(file)">
                        <div class="dsc-file-item__info">
                            <span class="dsc-file-item__name">{{ file.fileName }}</span>
                            <span class="dsc-file-item__desc">{{ file.info }}</span>
                        </div>
                        <div class="dsc-file-item__action">
                            <EditOutlined />
                        </div>
                    </div>
                </div>
            </div>

            <!-- File Editor View -->
            <div v-else class="dsc-editor">
                <div v-if="configData" class="dsc-editor__content">
                    <InstanceConfigEditor :config="configData" :config-name="selectedFile.fileName" />
                </div>
                <div v-else class="dsc-empty">
                    <p class="dsc-empty__text">{{ t("TXT_CODE_f859eac") }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.dsc {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;

    &__header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        flex-shrink: 0;
    }

    &__title {
        font-size: 14px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.85);
        flex: 1;
    }

    &__actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
    }

    &__body {
        flex: 1;
        overflow: auto;
        padding: 12px;
    }
}

.dsc-btn {
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

    &--icon {
        padding: 4px 8px;
        font-size: 14px;
    }

    &--primary {
        color: #1677ff;
        border-color: rgba(22, 119, 255, 0.3);
        background: rgba(22, 119, 255, 0.1);

        &:hover:not(:disabled) {
            background: rgba(22, 119, 255, 0.2);
        }
    }
}

// ─── File List ───
.dsc-list {
    height: 100%;

    &__items {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
}

.dsc-file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.12);
    }

    &__info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }

    &__name {
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.85);
    }

    &__desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &__action {
        color: rgba(255, 255, 255, 0.35);
        font-size: 14px;
        flex-shrink: 0;
        margin-left: 12px;
    }
}

// ─── Editor ───
.dsc-editor {
    height: 100%;

    &__content {
        height: 100%;
    }
}

// ─── Empty State ───
.dsc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: rgba(255, 255, 255, 0.3);

    &__icon {
        font-size: 48px;
        opacity: 0.4;
    }

    &__text {
        font-size: 16px;
        font-weight: 500;
        margin: 0;
    }

    &__hint {
        font-size: 12px;
        margin: 0;
        opacity: 0.6;
    }
}
</style>
