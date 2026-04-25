<script setup lang="ts">
import { useFileManager } from "@/hooks/useFileManager";
import { useRightClickMenu } from "@/hooks/useRightClickMenu";
import { useScreen } from "@/hooks/useScreen";
import { t } from "@/lang/i18n";
import uploadService from "@/services/uploadService";
import { arrayFilter } from "@/tools/array";
import { filterFileName, getFileExtName, getFileIcon, isCompressFile } from "@/tools/fileManager";
import { convertFileSize } from "@/tools/fileSize";
import type { AntColumnsType } from "@/types/ant";
import type { DataType } from "@/types/fileManager";
import {
    CaretRightOutlined,
    CloseOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownOutlined,
    DownloadOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    FileOutlined,
    FileZipOutlined,
    FolderOutlined,
    FormOutlined,
    KeyOutlined,
    PauseOutlined,
    PlusOutlined,
    ScissorOutlined,
    SearchOutlined,
    UploadOutlined
} from "@ant-design/icons-vue";
import { Modal, type ItemType, type UploadChangeParam, type UploadProps } from "ant-design-vue";
import dayjs from "dayjs";
import { computed, h, onMounted, onUnmounted, ref, watch, type CSSProperties } from "vue";

const props = defineProps<{
    instanceId: string;
    daemonId: string;
    sessionId?: string;
}>();

const emit = defineEmits<{
    (e: "open-file-editor", filePath: string, fileName: string): void;
}>();

const { isPhone } = useScreen();

const {
    dialog,
    spinning,
    fileStatus,
    permission,
    selectedRowKeys,
    operationForm,
    dataSource,
    breadcrumbs,
    currentPath,
    clipboard,
    currentDisk,
    isMultiple,
    activeTab,
    currentTabs,
    onEditTabs,
    handleChangeTab,
    selectChanged,
    getFileList,
    touchFile,
    reloadList,
    setClipBoard,
    paste,
    resetName,
    deleteFile,
    zipFile,
    unzipFile,
    downloadFile,
    downloadFromUrl,
    handleChangeDir,
    handleSearchChange,
    selectedFiles,
    rowClickTable,
    handleTableChange,
    getFileStatus,
    changePermission,
    toDisk,
    oneSelected,
    isImage,
    showImage,
    pushSelected,
    selectionData
} = useFileManager(props.instanceId, props.daemonId, props.sessionId || "");

const { openRightClickMenu } = useRightClickMenu();

const isShowDiskList = computed(
    () =>
        fileStatus.value?.disks.length &&
        fileStatus.value?.platform === "win32" &&
        fileStatus.value?.isGlobalInstance
);

const columns = computed(() => {
    return arrayFilter<AntColumnsType>([
        {
            align: "left",
            title: t("TXT_CODE_94c193de"),
            dataIndex: "name",
            key: "name",
            minWidth: 200
        },
        {
            align: "center",
            title: t("TXT_CODE_67d68dd1"),
            dataIndex: "type",
            key: "type",
            customRender: (e: { text: number; record: { name: string } }) => {
                return e.text == 1 ? filterFileName(e.record.name) : t("TXT_CODE_e5f949c");
            },
            condition: () => !isPhone.value,
            minWidth: 200
        },
        {
            align: "center",
            title: t("TXT_CODE_94bb113a"),
            dataIndex: "size",
            key: "size",
            customRender: (e: { text: number }) =>
                e.text == 0 ? "--" : convertFileSize(e.text.toString()),
            minWidth: 200,
            condition: () => !isPhone.value
        },
        {
            align: "center",
            title: t("TXT_CODE_d3b29478"),
            dataIndex: "time",
            key: "time",
            customRender: (e: { text: string }) => {
                return dayjs(e.text).format("YYYY-MM-DD HH:mm:ss");
            },
            minWidth: 200,
            condition: () => !isPhone.value
        },
        {
            align: "center",
            title: t("TXT_CODE_511aea70"),
            dataIndex: "mode",
            key: "mode",
            minWidth: 200,
            condition: () => !isPhone.value && fileStatus.value?.platform !== "win32"
        },
        {
            align: isPhone.value ? "center" : "right",
            title: t("TXT_CODE_fe731dfc"),
            dataIndex: "action",
            key: "action",
            minWidth: 200,
            condition: () => !isMultiple.value
        }
    ]);
});

let uploading = false;
const progress = computed(() => {
    if (uploadService.uiData.value.current) {
        return (uploadService.uiData.value.current[0] * 100) / uploadService.uiData.value.current[1];
    }
    return 0;
});
const uploadData = uploadService.uiData;
const uploadInstanceTag = computed(() => {
    if (
        !uploadData.value.instanceInfo ||
        uploadData.value.instanceInfo.instanceId != props.instanceId ||
        uploadData.value.instanceInfo.daemonId != props.daemonId
    ) {
        return `(${t("TXT_CODE_59c0c994")})`;
    }
    return "";
});
watch(
    () => uploadService.uiData.value,
    (newValue) => {
        if (newValue.current) {
            uploading = true;
        } else if (uploading) {
            uploading = false;
            getFileList();
        }
    },
    { immediate: true }
);

let task: NodeJS.Timer | undefined;
task = setInterval(async () => {
    await getFileStatus();
}, 3000);

const opacity = ref(false);
const handleDragover = (e: DragEvent) => {
    e.preventDefault();
    opacity.value = true;
};

const handleDragleave = (e: DragEvent) => {
    e.preventDefault();
    opacity.value = false;
};

const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    opacity.value = false;
    if (!files) return;
    if (files.length === 0) return;
    let name = "";
    if (files.length === 1) {
        name = files[0].name;
    } else {
        for (const file of files) {
            name += file.name + ", ";
        }
        name = name.slice(0, -2);
    }
    if (name.length > 30) {
        name = name.slice(0, 27) + "...";
    }
    if (files.length > 1) {
        name += ` (${files.length})`;
    }
    Modal.confirm({
        title: t("TXT_CODE_52bc24ec"),
        icon: h(ExclamationCircleOutlined),
        content: t("TXT_CODE_52bc24ec") + ` ${name} ?`,
        onOk() {
            selectedFiles([...files]);
        }
    });
};
const fileList = ref<UploadProps["fileList"]>([]);
const onFileSelect = (info: UploadChangeParam) => {
    if (!info.fileList) return;
    if (info.fileList[info.fileList.length - 1].uid != info.file.uid) return;
    if (!fileList.value) return;
    const files = [...fileList.value].map((v) => v.originFileObj as File);
    fileList.value = [];
    selectedFiles(files);
};

const editFile = (fileName: string) => {
    const path = currentPath.value + fileName;
    emit("open-file-editor", path, fileName);
};

const handleClickFile = async (file: DataType) => {
    if (file.type === 0) return rowClickTable(file.name, file.type);
    const fileExtName = getFileExtName(file.name);
    if (isImage(fileExtName)) return showImage(file);
    return editFile(file.name);
};

const menuList = (record: DataType) =>
    arrayFilter<ItemType & { style?: CSSProperties }>([
        {
            label: t("TXT_CODE_b147fabc"),
            key: "new",
            icon: h(PlusOutlined),
            children: [
                {
                    label: t("TXT_CODE_cfc657db"),
                    key: "newFolder",
                    icon: h(FolderOutlined),
                    onClick: () => touchFile(true)
                },
                {
                    label: t("TXT_CODE_1e0b63b6"),
                    key: "newFile",
                    icon: h(FileOutlined),
                    onClick: () => touchFile()
                }
            ],
            condition: () => !isMultiple.value
        },
        {
            label: t("TXT_CODE_a64f3007"),
            key: "unzip",
            icon: h(FileZipOutlined),
            onClick: () => unzipFile(record.name),
            condition: () => record.type === 1 && isCompressFile(record.name)
        },
        {
            label: t("TXT_CODE_ad207008"),
            key: "edit",
            icon: h(EditOutlined),
            onClick: () => editFile(record.name),
            condition: () => !isMultiple.value && record.type === 1
        },
        {
            label: t("TXT_CODE_65b21404"),
            key: "download",
            icon: h(DownloadOutlined),
            onClick: () => downloadFile(record.name),
            condition: () => !isMultiple.value && record.type === 1
        },
        {
            label: t("TXT_CODE_46c4169b"),
            key: "cut",
            icon: h(ScissorOutlined),
            onClick: () => setClipBoard("move")
        },
        {
            label: t("TXT_CODE_13ae6a93"),
            key: "copy",
            icon: h(CopyOutlined),
            onClick: () => setClipBoard("copy")
        },
        {
            label: t("TXT_CODE_c83551f5"),
            key: "rename",
            icon: h(FormOutlined),
            onClick: () => resetName(record.name),
            condition: () => !isMultiple.value
        },
        {
            label: t("TXT_CODE_16853efe"),
            key: "changePermission",
            icon: h(KeyOutlined),
            onClick: () => changePermission(record.name, record.mode),
            condition: () => fileStatus.value?.platform !== "win32"
        },
        {
            label: t("TXT_CODE_88122886"),
            key: "zip",
            icon: h(FileZipOutlined),
            onClick: () => zipFile()
        },
        {
            label: t("TXT_CODE_ecbd7449"),
            key: "delete",
            icon: h(DeleteOutlined),
            style: {
                color: "var(--color-red-5)"
            },
            onClick: () => deleteFile(record.name)
        }
    ]);

const handleRightClickRow = (e: MouseEvent, record: DataType) => {
    e.preventDefault();
    e.stopPropagation();
    oneSelected(record.name, record);
    openRightClickMenu(e.clientX, e.clientY, menuList(record));
    return false;
};

const downloadFromURLFile = async () => {
    const { useDownloadFileDialog } = await import("@/components/fc");
    const data = await useDownloadFileDialog();
    if (!data) return;
    await downloadFromUrl(data);
};

const tableBodyRef = ref<HTMLElement | null>(null);
const isDragSelecting = ref(false);
const dragSelectStart = ref({ x: 0, y: 0 });
const dragSelectRect = ref({ x: 0, y: 0, w: 0, h: 0 });
const dragSelectVisible = ref(false);

const getTableBodyEl = (): HTMLElement | null => {
    return document.querySelector('.dfm .ant-table-tbody');
};

const getRowEls = (): NodeListOf<HTMLElement> => {
    return document.querySelectorAll('.dfm .ant-table-tbody tr.ant-table-row');
};

const getRowDataKey = (rowEl: HTMLElement): string | null => {
    return rowEl.getAttribute('data-row-key');
};

const getTableWrapperEl = (): HTMLElement | null => {
    return document.querySelector('.dfm-table-wrapper');
};

const onTableMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.ant-table-cell-fix-right') ||
        target.closest('.ant-checkbox') ||
        target.closest('.ant-btn') ||
        target.closest('.ant-dropdown-trigger') ||
        target.closest('.ant-input') ||
        target.closest('.ant-select') ||
        target.closest('.ant-pagination') ||
        target.closest('.ant-tabs') ||
        target.closest('.ant-breadcrumb') ||
        target.closest('.dfm-toolbar') ||
        target.closest('.dfm-nav') ||
        target.closest('.dfm-upload-progress') ||
        target.closest('.dfm-task-info')) {
        return;
    }

    const tableBody = getTableBodyEl();
    if (!tableBody || !tableBody.contains(target)) return;

    const wrapper = getTableWrapperEl();
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    isDragSelecting.value = true;
    dragSelectStart.value = { x: e.clientX, y: e.clientY };
    dragSelectRect.value = {
        x: e.clientX - wrapperRect.left,
        y: e.clientY - wrapperRect.top,
        w: 0,
        h: 0
    };
    dragSelectVisible.value = true;

    selectChanged([], []);

    e.preventDefault();
    e.stopPropagation();
};

const onTableMouseMove = (e: MouseEvent) => {
    if (!isDragSelecting.value) return;

    const wrapper = getTableWrapperEl();
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const currentX = e.clientX - wrapperRect.left;
    const currentY = e.clientY - wrapperRect.top;

    const startX = dragSelectStart.value.x - wrapperRect.left;
    const startY = dragSelectStart.value.y - wrapperRect.top;

    dragSelectRect.value = {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        w: Math.abs(currentX - startX),
        h: Math.abs(currentY - startY)
    };

    const selRect = {
        left: dragSelectRect.value.x,
        top: dragSelectRect.value.y,
        right: dragSelectRect.value.x + dragSelectRect.value.w,
        bottom: dragSelectRect.value.y + dragSelectRect.value.h
    };

    const rows = getRowEls();
    const newlySelected: string[] = [];
    const newlySelectedRows: DataType[] = [];

    rows.forEach((row) => {
        const rowRect = row.getBoundingClientRect();
        const rowRelTop = rowRect.top - wrapperRect.top;
        const rowRelBottom = rowRect.bottom - wrapperRect.top;

        if (rowRelBottom > selRect.top && rowRelTop < selRect.bottom) {
            const key = getRowDataKey(row);
            if (key && dataSource.value) {
                const found = dataSource.value.find(d => d.name === key);
                if (found) {
                    newlySelected.push(key);
                    newlySelectedRows.push(found);
                }
            }
        }
    });

    selectedRowKeys.value = newlySelected;
    if (selectionData.value) {
        selectionData.value = newlySelectedRows;
    }
};

const onTableMouseUp = () => {
    if (isDragSelecting.value) {
        isDragSelecting.value = false;
        dragSelectVisible.value = false;
    }
};

onMounted(async () => {
    await getFileStatus();
    dialog.value.loading = true;

    if (currentTabs.value.length) {
        const thisTab = currentTabs.value[0];
        activeTab.value = thisTab.key;
        await getFileList(false, thisTab.path);
    } else {
        await getFileList(false);
    }

    dialog.value.loading = false;

    document.addEventListener('mousemove', onTableMouseMove);
    document.addEventListener('mouseup', onTableMouseUp);
});

onUnmounted(() => {
    if (task) clearInterval(task);
    task = undefined;
    document.removeEventListener('mousemove', onTableMouseMove);
    document.removeEventListener('mouseup', onTableMouseUp);
});
</script>

<template>
    <div class="dfm">
        <!-- Toolbar -->
        <div class="dfm-toolbar">
            <div class="dfm-toolbar__left">
                <!-- Search -->
                <a-input v-model:value.trim.lazy="operationForm.name" :placeholder="t('TXT_CODE_7cad42a5')" allow-clear
                    size="small" @change="handleSearchChange()">
                    <template #suffix>
                        <SearchOutlined />
                    </template>
                </a-input>
                <a-typography-text v-if="selectedRowKeys.length" class="dfm-selected-count">
                    {{ `${t("TXT_CODE_7b2c5414")} ${String(selectedRowKeys.length)} ${t("TXT_CODE_5cd3b4bd")}` }}
                </a-typography-text>
            </div>
            <div class="dfm-toolbar__right">
                <a-button type="dashed" size="small" @click="downloadFromURLFile">
                    <DownloadOutlined />
                    {{ t("TXT_CODE_5b364aef") }}
                </a-button>
                <a-upload v-model:file-list="fileList" :before-upload="() => false" multiple :on-change="onFileSelect"
                    :show-upload-list="false">
                    <a-button type="dashed" size="small">
                        <UploadOutlined />
                        {{ t("TXT_CODE_e00c858c") }}
                    </a-button>
                </a-upload>
                <a-button v-if="clipboard?.value && clipboard.value.length > 0" type="dashed" size="small" danger
                    @click="paste()">
                    {{ t("TXT_CODE_f0260e51") }}
                </a-button>
                <a-button v-else type="default" size="small" @click="reloadList()">
                    {{ t("TXT_CODE_a53573af") }}
                </a-button>

                <a-dropdown v-if="isMultiple">
                    <template #overlay>
                        <a-menu mode="vertical" :items="menuList({
                            name: '',
                            type: 0,
                            size: 0,
                            time: '',
                            mode: 0
                        })
                            ">
                        </a-menu>
                    </template>
                    <a-button type="primary" size="small">
                        {{ t("TXT_CODE_5cb656b9") }}
                        <DownOutlined />
                    </a-button>
                </a-dropdown>

                <a-dropdown v-else>
                    <template #overlay>
                        <a-menu>
                            <a-menu-item key="newFile" @click="touchFile()">
                                {{ t("TXT_CODE_1e0b63b6") }}
                            </a-menu-item>
                            <a-menu-item key="newFolder" @click="touchFile(true)">
                                {{ t("TXT_CODE_cfc657db") }}
                            </a-menu-item>
                        </a-menu>
                    </template>
                    <a-button type="primary" size="small">
                        {{ t("TXT_CODE_b147fabc") }}
                        <DownOutlined />
                    </a-button>
                </a-dropdown>
            </div>
        </div>

        <!-- Upload Progress -->
        <div v-if="uploadData.current" class="dfm-upload-progress">
            <div class="dfm-upload-progress__info">
                <a-typography-text :ellipsis="true">
                    {{ `${uploadData.currentFile} ${uploadInstanceTag}`.trim() }}
                </a-typography-text>
                <a-typography-text style="padding-left: 5px; white-space: nowrap">
                    ({{ uploadData.files[0] }}/{{ uploadData.files[1] }})
                </a-typography-text>
                <CaretRightOutlined v-if="uploadData.suspending" style="margin-left: 5px; cursor: pointer"
                    @click="uploadService.unsuspend()" />
                <PauseOutlined v-else style="margin-left: 5px; cursor: pointer" @click="uploadService.suspend()" />
                <CloseOutlined style="margin-left: 5px; cursor: pointer" @click="uploadService.stop()" />
            </div>
            <a-progress :stroke-color="{
                '0%': '#49b3ff',
                '100%': '#25f5b9'
            }" :percent="progress" :show-info="false" class="dfm-upload-progress__bar" />
            <a-typography-text style="font-size: 11px">
                {{ convertFileSize(uploadData.current![0].toString()) }} /
                {{ convertFileSize(uploadData.current![1].toString()) }}
            </a-typography-text>
        </div>

        <!-- Body -->
        <div class="dfm-body" :style="opacity ? 'opacity: 0.4' : ''" @dragover="handleDragover"
            @dragleave="handleDragleave" @drop="handleDrop">
            <!-- Tabs -->
            <a-tabs v-model:activeKey="activeTab" type="editable-card" size="small" @edit="onEditTabs"
                @change="(key) => handleChangeTab(key as string)">
                <a-tab-pane v-for="b in currentTabs" :key="b.key" :tab="b.name" :closable="true">
                </a-tab-pane>
            </a-tabs>

            <!-- Disk & Breadcrumbs -->
            <div class="dfm-nav">
                <a-select v-if="isShowDiskList" v-model:value="currentDisk" size="small"
                    style="width: 125px; flex-shrink: 0" @change="toDisk(currentDisk)">
                    <a-select-option value="/">{{ t("TXT_CODE_28124988") }}</a-select-option>
                    <a-select-option v-for="disk in fileStatus?.disks" :key="disk" :value="disk">
                        {{ disk }}
                    </a-select-option>
                </a-select>
                <div class="dfm-breadcrumbs">
                    <a-breadcrumb separator=">">
                        <a-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
                            <span class="dfm-breadcrumbs__item" @click="handleChangeDir(item.path)">
                                {{ item.name }}
                            </span>
                        </a-breadcrumb-item>
                    </a-breadcrumb>
                </div>
            </div>

            <!-- Task Info -->
            <p v-if="fileStatus?.downloadFileFromURLTask && fileStatus.downloadFileFromURLTask > 0"
                class="dfm-task-info">
                <a-spin />
                {{ t("TXT_CODE_8b7fe641", { count: fileStatus?.downloadFileFromURLTask }) }}
            </p>
            <p v-if="fileStatus?.instanceFileTask && fileStatus.instanceFileTask > 0" class="dfm-task-info">
                <a-spin />
                {{ t("TXT_CODE_dd06dea2") + fileStatus?.instanceFileTask + t("TXT_CODE_3e959ce7") }}
            </p>

            <!-- File Table -->
            <a-spin :spinning="spinning">
                <div class="dfm-table-wrapper" @mousedown="onTableMouseDown">
                    <a-table :row-selection="{
                        selectedRowKeys: selectedRowKeys,
                        onChange: selectChanged
                    }" :row-key="(record: DataType) => record.name" :data-source="dataSource" :columns="columns"
                        :scroll="{ x: 'max-content' }" size="small" :pagination="{
                            current: operationForm.current,
                            pageSize: operationForm.pageSize,
                            total: operationForm.total,
                            hideOnSinglePage: false,
                            showSizeChanger: true
                        }" :custom-row="(record: DataType) => {
                            return {
                                onContextmenu: (e: MouseEvent) => handleRightClickRow(e, record as DataType),
                                ondblclick: () => handleClickFile(record as DataType)
                            };
                        }" @change="
                            (e: any) =>
                                handleTableChange({ current: e.current || 0, pageSize: e.pageSize || 0 })
                        ">
                        <template #bodyCell="{ column, record }">
                            <template v-if="column.key === 'name'">
                                <a-button type="link" class="dfm-file-name"
                                    @click="handleClickFile(record as DataType)">
                                    <span class="mr-4">
                                        <component :is="getFileIcon(record.name, record.type)"
                                            style="font-size: 16px" />
                                    </span>
                                    {{ record.name }}
                                </a-button>
                            </template>
                            <template v-if="column.key === 'action'">
                                <a-dropdown>
                                    <template #overlay>
                                        <a-menu mode="vertical" :items="menuList(record as DataType)"></a-menu>
                                    </template>
                                    <a-button size="small" type="text" class="dfm-action-btn">
                                        <DownOutlined />
                                    </a-button>
                                </a-dropdown>
                            </template>
                        </template>
                    </a-table>
                    <div v-if="dragSelectVisible" class="dfm-drag-select-rect" :style="{
                        left: dragSelectRect.x + 'px',
                        top: dragSelectRect.y + 'px',
                        width: dragSelectRect.w + 'px',
                        height: dragSelectRect.h + 'px'
                    }"></div>
                </div>
            </a-spin>
        </div>

        <!-- Dialogs -->
        <a-modal v-model:open="dialog.show" :title="dialog.title" :confirm-loading="dialog.loading"
            :style="dialog.style" @ok="dialog.ok()" @cancel="dialog.cancel()">
            <p>{{ dialog.info }}</p>

            <a-input v-if="dialog.mode == ''" :ref="dialog.ref" v-model:value="dialog.value"
                :placeholder="t('TXT_CODE_4ea93630')" />

            <a-space v-if="dialog.mode == 'unzip'" direction="vertical" class="w-100">
                <a-typography-title :level="5">{{ t("TXT_CODE_a6453188") }}</a-typography-title>
                <a-radio-group v-model:value="dialog.unzipmode">
                    <a-radio-button value="0">{{ t("TXT_CODE_7907c99") }}</a-radio-button>
                    <a-radio-button value="1">{{ t("TXT_CODE_329fb904") }}</a-radio-button>
                </a-radio-group>

                <a-input v-if="dialog.unzipmode == '1'" v-model:value="dialog.value"
                    :placeholder="t('TXT_CODE_377e5535')" />
            </a-space>

            <a-space v-if="dialog.mode == 'zip'" direction="vertical" class="w-100">
                <a-input :ref="dialog.ref" v-model:value="dialog.value" :placeholder="t('TXT_CODE_366bad15')"
                    addon-after=". zip" />
            </a-space>

            <a-space v-if="dialog.mode == 'unzip'" direction="vertical" class="w-100 mt-16">
                <a-typography-title :level="5">{{ t("TXT_CODE_2841f4a") }}</a-typography-title>
                <a-radio-group v-model:value="dialog.code">
                    <a-radio-button value="utf-8">UTF-8</a-radio-button>
                    <a-radio-button value="gbk">GBK</a-radio-button>
                    <a-radio-button value="big5">BIG5</a-radio-button>
                </a-radio-group>
            </a-space>

            <a-space v-if="dialog.mode == 'zip'" direction="vertical" class="w-100 mt-16">
                <a-typography-text>
                    {{ t("TXT_CODE_92ebdc7f") }}
                </a-typography-text>
            </a-space>

            <a-space v-if="dialog.mode == 'permission'" direction="vertical" class="w-100 select-none">
                <a-spin :spinning="permission.loading">
                    <div class="dfm-permission">
                        <a-checkbox-group v-for="item in permission.item" :key="item.key"
                            v-model:value="permission.data[item.role]">
                            <a-row class="direction-column">
                                <a-typography-text class="mb-10">
                                    <strong>{{ item.key }}</strong>
                                </a-typography-text>
                                <a-col class="mb-10">
                                    <a-checkbox value="4">{{ t("TXT_CODE_798f592e") }}</a-checkbox>
                                </a-col>
                                <a-col class="mb-10">
                                    <a-checkbox value="2">{{ t("TXT_CODE_46c4e9ac") }}</a-checkbox>
                                </a-col>
                                <a-col class="mb-10">
                                    <a-checkbox value="1">{{ t("TXT_CODE_e97669d8") }}</a-checkbox>
                                </a-col>
                            </a-row>
                        </a-checkbox-group>
                    </div>
                    <a-checkbox v-model:checked="permission.deep" class="mt-15">
                        {{ t("TXT_CODE_74fd665e") }}
                    </a-checkbox>
                </a-spin>
            </a-space>
        </a-modal>

    </div>
</template>

<style lang="scss" scoped>
.dfm {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    overflow: hidden;
}

.dfm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    flex-shrink: 0;
    flex-wrap: wrap;

    &__left,
    &__right {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    &__left {
        flex: 1;
        min-width: 0;
    }
}

.dfm-selected-count {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
}

.dfm-upload-progress {
    padding: 6px 12px;
    flex-shrink: 0;

    &__info {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
    }

    &__bar {
        margin: 4px 0;
    }
}

.dfm-body {
    flex: 1;
    overflow: auto;
    padding: 0 12px 12px;
}

.dfm-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.dfm-breadcrumbs {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    flex: 1;
    min-width: 0;

    &__item {
        padding: 6px 8px;
        cursor: pointer;
        display: inline-block;
        transition: all 0.2s;
        min-width: 32px;
        text-align: center;
        font-size: 12px;

        &:hover {
            background: rgba(255, 255, 255, 0.06);
        }
    }
}

.dfm-task-info {
    color: #1677ff;
    font-size: 12px;
    margin: 4px 0;
}

.dfm-file-name {
    color: inherit;
    font-size: 12px;

    &:hover {
        color: #1677ff;
    }
}

.dfm-permission {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
}

.dfm-table-wrapper {
    position: relative;
    user-select: none;
}

.dfm-drag-select-rect {
    position: absolute;
    background: rgba(22, 119, 255, 0.12);
    border: 1px solid rgba(22, 119, 255, 0.4);
    border-radius: 3px;
    pointer-events: none;
    z-index: 10;
}

.dfm-action-btn {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    padding: 0 4px;
    min-width: 20px;
    height: 20px;

    &:hover {
        color: rgba(255, 255, 255, 0.85);
        background: rgba(255, 255, 255, 0.08);
    }
}

:deep(.ant-tabs-nav) {
    margin-bottom: 8px !important;
}

:deep(.ant-tabs-tab) {
    font-size: 12px !important;
    padding: 4px 12px !important;
}

:deep(.ant-table) {
    font-size: 12px;
}

:deep(.ant-table-thead > tr > th) {
    background: rgba(255, 255, 255, 0.03) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    color: rgba(255, 255, 255, 0.6) !important;
    font-size: 11px !important;
    padding: 6px 10px !important;
}

:deep(.ant-table-tbody > tr > td) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
    padding: 1px 6px !important;
    line-height: 1.1;
}

:deep(.ant-table-tbody > tr:hover > td) {
    background: rgba(255, 255, 255, 0.03) !important;
}

:deep(.ant-pagination) {
    font-size: 12px;
}

:deep(.ant-btn-sm) {
    font-size: 11px;
}
</style>
