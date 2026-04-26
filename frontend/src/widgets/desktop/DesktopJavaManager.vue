<script setup lang="ts">
import { useAddJavaDialog, useDownloadJavaDialog } from "@/components/fc";
import { t } from "@/lang/i18n";
import { updateInstanceConfig } from "@/services/apis/instance";
import { addJava, deleteJava, downloadJava, getJavaList, usingJava } from "@/services/apis/javaManager";
import { parseTimestamp } from "@/tools/time";
import type { AntColumnsType } from "@/types/ant";
import type { JavaInfo, JavaRuntime } from "@/types/javaManager";
import {
    DeleteOutlined,
    DownloadOutlined,
    PlusOutlined,
    ReloadOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { h, ref, type Ref } from "vue";

const props = defineProps<{
    instanceId: string;
    daemonId: string;
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

const columns: AntColumnsType[] = [
    {
        align: "center",
        title: t("TXT_CODE_151d2bb7"),
        dataIndex: ["info", "fullname"],
        key: "fullname"
    },
    {
        align: "center",
        title: t("TXT_CODE_a2e79565"),
        dataIndex: ["info", "installTime"],
        key: "installTime",
        customRender: (e: { text: number }) => t(parseTimestamp(e.text))
    },
    {
        align: "center",
        title: t("TXT_CODE_759fb403"),
        key: "status",
        customRender: ({ record }: { record: JavaRuntime }) => {
            if (record.usingInstances.length > 0) return t("TXT_CODE_bdb620b9");
            else if (record.info.downloading) return t("TXT_CODE_d919f7c7");
            else return t("TXT_CODE_15f2e564");
        }
    },
    {
        align: "center",
        title: t("TXT_CODE_fe731dfc"),
        key: "actions",
        width: 250
    }
];

const javaList: Ref<JavaRuntime[] | undefined> = ref([]);
const isLoading = ref(false);

const { isLoading: updateLoading } = updateInstanceConfig();

const refreshJavaList = async (out: boolean = false) => {
    try {
        const list = await getJavaList().execute({
            params: {
                daemonId: props.daemonId ?? "",
                instanceId: props.instanceId ?? ""
            }
        });
        javaList.value = list.value;
        if (out) message.success(t("TXT_CODE_fbde647e"));
    } catch (err: any) {
        message.error(err.message);
    }
};

const handleDownloadJava = async () => {
    const installedList = javaList.value?.map((item) => item.info.fullname) ?? [];
    const data = await useDownloadJavaDialog(installedList);
    if (!data) return;

    try {
        await downloadJava().execute({
            params: {
                daemonId: props.daemonId ?? "",
                instanceId: props.instanceId ?? ""
            },
            data: {
                name: data.name,
                version: data.version
            }
        });
        message.success(t("TXT_CODE_5e7a4c02"));
        await refreshJavaList();
    } catch (err: any) {
        message.error(err.message);
    }
    await refreshJavaList();
};

const handleAddJava = async () => {
    const data = await useAddJavaDialog();
    if (!data) return;

    try {
        await addJava().execute({
            params: {
                daemonId: props.daemonId ?? ""
            },
            data: {
                name: data.name,
                path: data.path
            }
        });
    } catch (err: any) {
        message.error(err.message);
    }
    message.success(t("TXT_CODE_10f0f8d"));
    await refreshJavaList();
};

const handleDeleteJava = async (info: JavaInfo) => {
    try {
        await deleteJava().execute({
            params: {
                daemonId: props.daemonId ?? "",
                instanceId: props.instanceId ?? ""
            },
            data: {
                id: info.fullname
            }
        });
    } catch (err: any) {
        message.error(err.message);
    }
    await refreshJavaList();
};

const handleUsingJava = async (info: JavaInfo) => {
    try {
        await usingJava().execute({
            params: {
                daemonId: props.daemonId ?? "",
                instanceId: props.instanceId ?? ""
            },
            data: {
                id: info.fullname
            }
        });
        message.success(t("TXT_CODE_d3de39b4"));
    } catch (err: any) {
        message.error(err.message);
    }
    await refreshJavaList();
};

// Refresh on mount
refreshJavaList();
</script>

<template>
    <div class="djava-config">
        <div class="djava-config__body">
            <a-typography-paragraph>
                <a-typography-text type="secondary">
                    {{ t("TXT_CODE_ebf01bcc") }}
                    <br />
                    {{ t("TXT_CODE_e1c637bb").replace("<mcsm_java>", "{mcsm_java}") }}
                </a-typography-text>
            </a-typography-paragraph>

            <div class="djava-config__toolbar">
                <a-button type="link" :icon="h(PlusOutlined)" @click="handleAddJava()">
                    {{ t("TXT_CODE_8900e7ee") }}
                </a-button>
                <a-button type="link" :icon="h(DownloadOutlined)" @click="handleDownloadJava()">
                    {{ t("TXT_CODE_9c48100e") }}
                </a-button>
                <a-button :icon="h(ReloadOutlined)" type="text" @click="refreshJavaList(true)">
                    {{ t("TXT_CODE_b76d94e0") }}
                </a-button>
            </div>

            <a-table class="mt-12" :data-source="javaList" :columns="columns" :scroll="{ x: 'max-content' }"
                :pagination="{
                    pageSize: 15
                }">
                <template #bodyCell="{ column, record }">
                    <div v-if="column.key === 'actions'" class="djava-config__actions">
                        <a-button v-if="record.info.fullname == ''" class="mr-8" type="link" :disabled="true">
                            {{ t("TXT_CODE_979520ef") }}
                        </a-button>
                        <a-button v-else class="mr-8" type="link" :disabled="record.info.downloading"
                            @click="handleUsingJava(record.info as JavaInfo)">
                            {{ t("TXT_CODE_f0dcc8bf") }}
                        </a-button>
                        <a-popconfirm :title="t('TXT_CODE_f4f86ba8')" :description="t('TXT_CODE_35631d1d')"
                            @confirm="handleDeleteJava(record.info as JavaInfo)">
                            <a-button danger type="link" :disabled="record.info.downloading">
                                {{ t("TXT_CODE_ecbd7449") }}
                                <DeleteOutlined />
                            </a-button>
                        </a-popconfirm>
                    </div>
                </template>
            </a-table>
        </div>
        <div class="djava-config__footer">
            <button class="djava-btn djava-btn--primary" @click="emit('close')">
                {{ t("TXT_CODE_31e92ef3") }}
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.djava-config {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--desktop-window-text);
    font-size: 13px;
    overflow: hidden;

    &__body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
    }

    &__toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 12px;
    }

    &__actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }

    &__footer {
        display: flex;
        justify-content: flex-end;
        padding: 12px 16px;
        border-top: 1px solid var(--desktop-window-border);
        flex-shrink: 0;
    }
}

.djava-btn {
    background: var(--desktop-window-titlebar-bg);
    border: 1px solid var(--desktop-window-border);
    border-radius: 6px;
    color: var(--desktop-window-text);
    padding: 6px 16px;
    font-size: 13px;
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

    &--primary {
        color: #1677ff;
        border-color: rgba(22, 119, 255, 0.3);
        background: rgba(22, 119, 255, 0.1);

        &:hover:not(:disabled) {
            background: rgba(22, 119, 255, 0.2);
        }
    }
}
</style>
