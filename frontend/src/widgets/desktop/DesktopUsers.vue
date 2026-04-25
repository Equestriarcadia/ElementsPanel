<script setup lang="ts">
import { t } from "@/lang/i18n";
import { addUser as addUserApi, deleteUser as deleteUserApi, editUserInfo as editUserInfoApi, getUserInfo as getUserInfoApi, remoteInstances, remoteNodeList, updateUserInstance } from "@/services/apis";
import { computeNodeName } from "@/tools/nodes";
import type { NodeStatus } from "@/types";
import { INSTANCE_STATUS } from "@/types/const";
import type { BaseUserInfo, EditUserInfo, UserInstance } from "@/types/user";
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    EditOutlined,
    KeyOutlined,
    LinkOutlined,
    PlusOutlined,
    SafetyOutlined,
    SearchOutlined,
    UserOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { computed, onMounted, reactive, ref } from "vue";
import DesktopWindow from "./DesktopWindow.vue";

const { execute: fetchUsersApi, isLoading: loading } = getUserInfoApi();
const { execute: addUserApiExec } = addUserApi();
const { execute: editUserApiExec } = editUserInfoApi();
const { execute: deleteUserApiExec } = deleteUserApi();
const { execute: updateUserInstanceExec } = updateUserInstance();

const users = ref<BaseUserInfo[]>([]);
const total = ref(0);
const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = 20;

const showDialog = ref(false);
const dialogMode = ref<"add" | "edit">("add");
const editingUser = ref<BaseUserInfo | null>(null);
const form = reactive({
    username: "",
    password: "",
    permission: 1
});
const formError = ref("");
const saving = ref(false);

const showDeleteConfirm = ref(false);
const deletingUser = ref<BaseUserInfo | null>(null);

// Assign instance dialog state
const showAssignDialog = ref(false);
const assignTargetUser = ref<BaseUserInfo | null>(null);
const assignedInstances = ref<UserInstance[]>([]);
const assignSaving = ref(false);

// Remote node/instance selection for assign dialog
const { execute: getNodes, state: nodes } = remoteNodeList();
const { execute: getInstances, state: instances, isLoading: instancesLoading } = remoteInstances();
const currentRemoteNode = ref<NodeStatus>();
const assignForm = reactive({
    instanceName: "",
    currentPage: 1,
    pageSize: 10,
    status: ""
});

const windowWidth = ref(window.innerWidth);
const windowHeight = ref(window.innerHeight);

onMounted(() => {
    const updateWindowSize = () => {
        windowWidth.value = window.innerWidth;
        windowHeight.value = window.innerHeight;
    };
    window.addEventListener('resize', updateWindowSize);
    fetchUsers();
});

const fetchUsers = async () => {
    try {
        const res = await fetchUsersApi({
            params: {
                userName: searchQuery.value || "",
                page: currentPage.value,
                page_size: pageSize,
                role: ""
            }
        });
        if (res?.value) {
            users.value = res.value.data || [];
            total.value = res.value.total || 0;
        }
    } catch {
        users.value = [];
        total.value = 0;
    }
};

let searchTimer: ReturnType<typeof setTimeout> | undefined;
const onSearchInput = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        currentPage.value = 1;
        fetchUsers();
    }, 300);
};

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
        fetchUsers();
    }
};

const nextPage = () => {
    if (currentPage.value < maxPage.value) {
        currentPage.value++;
        fetchUsers();
    }
};

const openAddDialog = () => {
    dialogMode.value = "add";
    editingUser.value = null;
    form.username = "";
    form.password = "";
    form.permission = 1;
    formError.value = "";
    showDialog.value = true;
};

const openEditDialog = (user: BaseUserInfo) => {
    dialogMode.value = "edit";
    editingUser.value = user;
    form.username = user.userName;
    form.password = "";
    form.permission = user.permission;
    formError.value = "";
    showDialog.value = true;
};

const closeDialog = () => {
    showDialog.value = false;
    formError.value = "";
};

const saveUser = async () => {
    formError.value = "";

    if (!form.username.trim()) {
        formError.value = t("TXT_CODE_DESKTOP_USERS_USERNAME_REQUIRED");
        return;
    }

    if (dialogMode.value === "add" && !form.password) {
        formError.value = t("TXT_CODE_DESKTOP_USERS_PASSWORD_REQUIRED");
        return;
    }

    saving.value = true;
    try {
        if (dialogMode.value === "add") {
            await addUserApiExec({
                data: {
                    username: form.username.trim(),
                    password: form.password,
                    permission: form.permission
                }
            });
        } else if (editingUser.value) {
            const editData: EditUserInfo = {
                uuid: editingUser.value.uuid,
                userName: form.username.trim(),
                passWord: form.password || undefined,
                permission: form.permission,
                loginTime: editingUser.value.loginTime,
                registerTime: editingUser.value.registerTime,
                instances: editingUser.value.instances || [],
                apiKey: editingUser.value.apiKey || "",
                isInit: editingUser.value.isInit || false,
                secret: editingUser.value.secret || "",
                open2FA: editingUser.value.open2FA || false,
                ssoSub: editingUser.value.ssoSub || "",
                ssoBound: editingUser.value.ssoBound || false
            };
            await editUserApiExec({
                data: {
                    config: editData,
                    uuid: editingUser.value.uuid
                }
            });
        }
        showDialog.value = false;
        fetchUsers();
    } catch (e: any) {
        formError.value = e?.message || "Error";
    } finally {
        saving.value = false;
    }
};

const confirmDelete = (user: BaseUserInfo) => {
    deletingUser.value = user;
    showDeleteConfirm.value = true;
};

const executeDelete = async () => {
    if (!deletingUser.value) return;
    saving.value = true;
    try {
        await deleteUserApiExec({
            data: [deletingUser.value.uuid]
        });
        showDeleteConfirm.value = false;
        deletingUser.value = null;
        fetchUsers();
    } catch {
        // ignore
    } finally {
        saving.value = false;
    }
};

const cancelDelete = () => {
    showDeleteConfirm.value = false;
    deletingUser.value = null;
};

const openAssignDialog = async (user: BaseUserInfo) => {
    assignTargetUser.value = user;
    assignedInstances.value = user.instances ? [...user.instances] : [];
    assignForm.instanceName = "";
    assignForm.currentPage = 1;
    assignForm.status = "";
    showAssignDialog.value = true;

    await initAssignNodes();
};

const closeAssignDialog = () => {
    showAssignDialog.value = false;
    assignTargetUser.value = null;
    assignedInstances.value = [];
};

const initAssignNodes = async () => {
    await getNodes();
    if (nodes?.value?.length) {
        nodes.value.sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1));
        currentRemoteNode.value = nodes.value[0];
        await loadRemoteInstances();
    }
};

const loadRemoteInstances = async () => {
    if (!currentRemoteNode.value) return;
    try {
        await getInstances({
            params: {
                daemonId: currentRemoteNode.value.uuid,
                page: assignForm.currentPage,
                page_size: assignForm.pageSize,
                instance_name: assignForm.instanceName.trim(),
                status: assignForm.status
            }
        });
    } catch {
        // ignore
    }
};

const handleAssignNodeChange = async (node: NodeStatus) => {
    currentRemoteNode.value = node;
    assignForm.currentPage = 1;
    await loadRemoteInstances();
};

const handleAssignSearch = async () => {
    assignForm.currentPage = 1;
    await loadRemoteInstances();
};

const isInstanceAssigned = (instanceUuid: string): boolean => {
    return assignedInstances.value.some(i => i.instanceUuid === instanceUuid);
};

const addAssignedInstance = (instance: UserInstance) => {
    if (!isInstanceAssigned(instance.instanceUuid)) {
        assignedInstances.value.push(instance);
    }
};

const removeAssignedInstance = (instanceUuid: string) => {
    assignedInstances.value = assignedInstances.value.filter(i => i.instanceUuid !== instanceUuid);
};

const saveAssignedInstances = async () => {
    if (!assignTargetUser.value) return;
    assignSaving.value = true;
    try {
        await updateUserInstanceExec({
            data: {
                config: {
                    instances: assignedInstances.value
                },
                uuid: assignTargetUser.value.uuid
            }
        });
        message.success(t("TXT_CODE_DESKTOP_USERS_ASSIGN_SUCCESS"));
        showAssignDialog.value = false;
        assignTargetUser.value = null;
        assignedInstances.value = [];
        fetchUsers();
    } catch (e: any) {
        message.error(e?.message || "Error");
    } finally {
        assignSaving.value = false;
    }
};

const permissionLabel = (perm: number): string => {
    if (perm >= 10) return t("TXT_CODE_DESKTOP_USERS_ADMIN");
    if (perm >= 1) return t("TXT_CODE_DESKTOP_USERS_USER");
    return "--";
};

const formatTime = (time: string): string => {
    if (!time) return "--";
    try {
        return new Date(time).toLocaleString();
    } catch {
        return time;
    }
};

const getInstanceStatusLabel = (status: number): string => {
    return INSTANCE_STATUS[status as keyof typeof INSTANCE_STATUS] || t("TXT_CODE_DESKTOP_IM_UNKNOWN");
};
</script>

<template>
    <div class="desktop-users">
        <div class="du-toolbar">
            <div class="du-search">
                <SearchOutlined class="du-search__icon" />
                <input v-model="searchQuery" class="du-search__input" :placeholder="t('TXT_CODE_DESKTOP_USERS_SEARCH')"
                    autocomplete="off" spellcheck="false" @input="onSearchInput" />
            </div>
            <button class="du-btn du-btn--primary" @click="openAddDialog">
                <PlusOutlined />
                {{ t("TXT_CODE_DESKTOP_USERS_ADD") }}
            </button>
        </div>

        <div class="du-table-wrap">
            <table class="du-table">
                <thead>
                    <tr>
                        <th class="du-table__col--name">{{ t("TXT_CODE_DESKTOP_USERS_USERNAME") }}</th>
                        <th class="du-table__col--perm">{{ t("TXT_CODE_DESKTOP_USERS_PERMISSION") }}</th>
                        <th class="du-table__col--time">{{ t("TXT_CODE_DESKTOP_USERS_REGISTER_TIME") }}</th>
                        <th class="du-table__col--time">{{ t("TXT_CODE_DESKTOP_USERS_LOGIN_TIME") }}</th>
                        <th class="du-table__col--inst">{{ t("TXT_CODE_DESKTOP_USERS_INSTANCES") }}</th>
                        <th class="du-table__col--badge">2FA</th>
                        <th class="du-table__col--badge">SSO</th>
                        <th class="du-table__col--actions">{{ t("TXT_CODE_OPERATE") }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading">
                        <td colspan="8" class="du-table__empty">
                            <div class="du-loading">{{ t("TXT_CODE_DESKTOP_IM_LOADING") }}</div>
                        </td>
                    </tr>
                    <tr v-else-if="users.length === 0">
                        <td colspan="8" class="du-table__empty">
                            <div class="du-empty">{{ t("TXT_CODE_DESKTOP_USERS_NO_RESULTS") }}</div>
                        </td>
                    </tr>
                    <tr v-for="user in users" :key="user.uuid" class="du-table__row">
                        <td class="du-table__col--name">
                            <div class="du-user-name">
                                <UserOutlined class="du-user-name__icon" />
                                <span>{{ user.userName }}</span>
                            </div>
                        </td>
                        <td class="du-table__col--perm">
                            <span
                                :class="['du-perm-badge', user.permission >= 10 ? 'du-perm-badge--admin' : 'du-perm-badge--user']">
                                {{ permissionLabel(user.permission) }}
                            </span>
                        </td>
                        <td class="du-table__col--time">{{ formatTime(user.registerTime) }}</td>
                        <td class="du-table__col--time">{{ formatTime(user.loginTime) }}</td>
                        <td class="du-table__col--inst">{{ user.instances?.length ?? 0 }}</td>
                        <td class="du-table__col--badge">
                            <CheckCircleOutlined v-if="user.open2FA" class="du-badge-icon du-badge-icon--yes" />
                            <CloseCircleOutlined v-else class="du-badge-icon du-badge-icon--no" />
                        </td>
                        <td class="du-table__col--badge">
                            <CheckCircleOutlined v-if="user.ssoBound" class="du-badge-icon du-badge-icon--yes" />
                            <CloseCircleOutlined v-else class="du-badge-icon du-badge-icon--no" />
                        </td>
                        <td class="du-table__col--actions">
                            <div class="du-action-btns">
                                <button class="du-action-btn du-action-btn--assign"
                                    :title="t('TXT_CODE_DESKTOP_USERS_ASSIGN_INSTANCE')"
                                    @click="openAssignDialog(user)">
                                    <LinkOutlined />
                                </button>
                                <button class="du-action-btn du-action-btn--edit"
                                    :title="t('TXT_CODE_DESKTOP_USERS_EDIT')" @click="openEditDialog(user)">
                                    <EditOutlined />
                                </button>
                                <button class="du-action-btn du-action-btn--delete"
                                    :title="t('TXT_CODE_DESKTOP_USERS_DELETE')" @click="confirmDelete(user)">
                                    <DeleteOutlined />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="total > pageSize" class="du-pagination">
            <button class="du-page-btn" :disabled="currentPage <= 1" @click="prevPage">
                {{ t("TXT_CODE_DESKTOP_IM_PREV") }}
            </button>
            <span class="du-page-info">{{ currentPage }} / {{ maxPage }}</span>
            <button class="du-page-btn" :disabled="currentPage >= maxPage" @click="nextPage">
                {{ t("TXT_CODE_DESKTOP_IM_NEXT") }}
            </button>
        </div>

        <Teleport to="body">
            <Transition name="du-dialog-fade">
                <DesktopWindow v-if="showDialog" id="user-edit-dialog"
                    :title="dialogMode === 'add' ? t('TXT_CODE_DESKTOP_USERS_ADD') : t('TXT_CODE_DESKTOP_USERS_EDIT')"
                    :icon="dialogMode === 'add' ? PlusOutlined : EditOutlined" :visible="showDialog" :minimized="false"
                    :maximized="false" :active="true" :initial-width="420" :initial-height="380"
                    :initial-x="windowWidth / 2 - 210" :initial-y="windowHeight / 2 - 190" :z-index="10001"
                    :show-minimize="false" :show-maximize="false" :resizable="false" @close="closeDialog">
                    <div class="du-dialog-content">
                        <div class="du-dialog__body">
                            <div class="du-form-group">
                                <label class="du-form-label">
                                    <UserOutlined /> {{ t("TXT_CODE_DESKTOP_USERS_USERNAME") }}
                                </label>
                                <input v-model="form.username" class="du-form-input" autocomplete="new-password"
                                    :placeholder="t('TXT_CODE_DESKTOP_USERS_USERNAME')"
                                    :disabled="dialogMode === 'edit'" />
                            </div>
                            <div class="du-form-group">
                                <label class="du-form-label">
                                    <KeyOutlined /> {{ t("TXT_CODE_DESKTOP_USERS_PASSWORD") }}
                                </label>
                                <input v-model="form.password" type="password" class="du-form-input"
                                    autocomplete="new-password"
                                    :placeholder="dialogMode === 'edit' ? t('TXT_CODE_DESKTOP_USERS_PASSWORD_HELP') : ''" />
                                <span v-if="dialogMode === 'edit'" class="du-form-hint">
                                    {{ t("TXT_CODE_DESKTOP_USERS_PASSWORD_HELP") }}
                                </span>
                            </div>
                            <div class="du-form-group">
                                <label class="du-form-label">
                                    <SafetyOutlined /> {{ t("TXT_CODE_DESKTOP_USERS_PERMISSION") }}
                                </label>
                                <div class="du-radio-group">
                                    <label class="du-radio" :class="{ 'du-radio--active': form.permission >= 10 }">
                                        <input v-model="form.permission" type="radio" name="perm" :value="10" />
                                        <span>{{ t("TXT_CODE_DESKTOP_USERS_ADMIN") }}</span>
                                    </label>
                                    <label class="du-radio"
                                        :class="{ 'du-radio--active': form.permission >= 1 && form.permission < 10 }">
                                        <input v-model="form.permission" type="radio" name="perm" :value="1" />
                                        <span>{{ t("TXT_CODE_DESKTOP_USERS_USER") }}</span>
                                    </label>
                                </div>
                            </div>
                            <div v-if="formError" class="du-form-error">{{ formError }}</div>
                        </div>
                        <div class="du-dialog__footer">
                            <button class="du-btn du-btn--default" @click="closeDialog">
                                {{ t("TXT_CODE_DESKTOP_USERS_CANCEL") }}
                            </button>
                            <button class="du-btn du-btn--primary" :disabled="saving" @click="saveUser">
                                {{ t("TXT_CODE_DESKTOP_USERS_SAVE") }}
                            </button>
                        </div>
                    </div>
                </DesktopWindow>
            </Transition>
        </Teleport>

        <Teleport to="body">
            <Transition name="du-dialog-fade">
                <DesktopWindow v-if="showDeleteConfirm" id="user-delete-dialog"
                    :title="t('TXT_CODE_DESKTOP_USERS_DELETE')" :icon="DeleteOutlined" :visible="showDeleteConfirm"
                    :minimized="false" :maximized="false" :active="true" :initial-width="360" :initial-height="180"
                    :initial-x="windowWidth / 2 - 180" :initial-y="windowHeight / 2 - 90" :z-index="10002"
                    :show-minimize="false" :show-maximize="false" :resizable="false" @close="cancelDelete">
                    <div class="du-dialog-content">
                        <div class="du-dialog__body">
                            <p class="du-delete-text">
                                {{ t("TXT_CODE_DESKTOP_USERS_DELETE_CONFIRM", { name: deletingUser?.userName }) }}
                            </p>
                        </div>
                        <div class="du-dialog__footer">
                            <button class="du-btn du-btn--default" @click="cancelDelete">
                                {{ t("TXT_CODE_DESKTOP_USERS_CANCEL") }}
                            </button>
                            <button class="du-btn du-btn--danger" :disabled="saving" @click="executeDelete">
                                {{ t("TXT_CODE_DESKTOP_USERS_DELETE") }}
                            </button>
                        </div>
                    </div>
                </DesktopWindow>
            </Transition>
        </Teleport>

        <Teleport to="body">
            <Transition name="du-dialog-fade">
                <DesktopWindow v-if="showAssignDialog" id="user-assign-dialog"
                    :title="t('TXT_CODE_DESKTOP_USERS_ASSIGN_INSTANCE')" :icon="LinkOutlined"
                    :visible="showAssignDialog" :minimized="false" :maximized="false" :active="true"
                    :initial-width="780" :initial-height="560" :initial-x="windowWidth / 2 - 390"
                    :initial-y="windowHeight / 2 - 280" :z-index="10003" :show-minimize="false" :show-maximize="false"
                    :resizable="false" @close="closeAssignDialog">
                    <div class="du-assign-content">
                        <div class="du-assign-layout">
                            <div class="du-assign-panel du-assign-panel--assigned">
                                <div class="du-assign-panel__header">
                                    <DatabaseOutlined />
                                    {{ t("TXT_CODE_DESKTOP_USERS_ASSIGNED") }}
                                    <span class="du-assign-count">{{ assignedInstances.length }}</span>
                                </div>
                                <div class="du-assign-panel__body">
                                    <div v-if="assignedInstances.length === 0" class="du-assign-empty">
                                        {{ t("TXT_CODE_DESKTOP_USERS_NO_ASSIGNED") }}
                                    </div>
                                    <div v-for="inst in assignedInstances" :key="inst.instanceUuid"
                                        class="du-assign-item">
                                        <div class="du-assign-item__info">
                                            <span class="du-assign-item__name">{{ inst.nickname ||
                                                t("TXT_CODE_DESKTOP_IM_UNNAMED") }}</span>
                                            <span class="du-assign-item__node">{{ inst.hostIp }}</span>
                                        </div>
                                        <button class="du-assign-item__remove"
                                            @click="removeAssignedInstance(inst.instanceUuid)">
                                            <CloseCircleOutlined />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="du-assign-panel du-assign-panel--browse">
                                <div class="du-assign-panel__header">
                                    {{ t("TXT_CODE_DESKTOP_USERS_BROWSE_INSTANCES") }}
                                </div>
                                <div class="du-assign-browse-toolbar">
                                    <div class="du-assign-node-select">
                                        <select v-if="nodes?.length" v-model="currentRemoteNode"
                                            class="du-assign-select"
                                            @change="handleAssignNodeChange(currentRemoteNode!)">
                                            <option v-for="node in nodes" :key="node.uuid" :value="node"
                                                :disabled="!node.available">
                                                {{ computeNodeName(node.ip, node.available, node.remarks) }}
                                            </option>
                                        </select>
                                    </div>
                                    <div class="du-assign-search">
                                        <input v-model="assignForm.instanceName" class="du-assign-search__input"
                                            :placeholder="t('TXT_CODE_DESKTOP_IM_SEARCH')"
                                            @input="handleAssignSearch" />
                                    </div>
                                </div>
                                <div class="du-assign-panel__body">
                                    <div v-if="instancesLoading" class="du-assign-empty">
                                        {{ t("TXT_CODE_DESKTOP_IM_LOADING") }}
                                    </div>
                                    <div v-else-if="!instances?.data?.length" class="du-assign-empty">
                                        {{ t("TXT_CODE_DESKTOP_IM_NO_INSTANCES") }}
                                    </div>
                                    <div v-for="inst in instances?.data || []" :key="inst.instanceUuid"
                                        class="du-assign-item"
                                        :class="{ 'du-assign-item--selected': isInstanceAssigned(inst.instanceUuid) }">
                                        <div class="du-assign-item__info">
                                            <span class="du-assign-item__name">{{ inst.config.nickname ||
                                                t("TXT_CODE_DESKTOP_IM_UNNAMED") }}</span>
                                            <span class="du-assign-item__status"
                                                :class="'du-assign-item__status--' + inst.status">
                                                {{ getInstanceStatusLabel(inst.status) }}
                                            </span>
                                        </div>
                                        <button v-if="!isInstanceAssigned(inst.instanceUuid)"
                                            class="du-assign-item__add" @click="addAssignedInstance({
                                                instanceUuid: inst.instanceUuid,
                                                daemonId: currentRemoteNode?.uuid ?? '',
                                                nickname: inst.config.nickname,
                                                status: inst.status,
                                                hostIp: currentRemoteNode ? `${currentRemoteNode.ip}:${currentRemoteNode.port}` : ''
                                            })">
                                            <PlusOutlined />
                                        </button>
                                        <span v-else class="du-assign-item__check">
                                            <CheckCircleOutlined />
                                        </span>
                                    </div>
                                </div>
                                <div v-if="instances" class="du-assign-pagination">
                                    <button class="du-page-btn" :disabled="assignForm.currentPage <= 1"
                                        @click="assignForm.currentPage--; loadRemoteInstances()">
                                        {{ t("TXT_CODE_DESKTOP_IM_PREV") }}
                                    </button>
                                    <span class="du-page-info">{{ assignForm.currentPage }} / {{ instances.maxPage
                                        }}</span>
                                    <button class="du-page-btn" :disabled="assignForm.currentPage >= instances.maxPage"
                                        @click="assignForm.currentPage++; loadRemoteInstances()">
                                        {{ t("TXT_CODE_DESKTOP_IM_NEXT") }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="du-assign-footer">
                            <button class="du-btn du-btn--default" @click="closeAssignDialog">
                                {{ t("TXT_CODE_DESKTOP_USERS_CANCEL") }}
                            </button>
                            <button class="du-btn du-btn--primary" :disabled="assignSaving"
                                @click="saveAssignedInstances">
                                {{ t("TXT_CODE_DESKTOP_USERS_SAVE") }}
                            </button>
                        </div>
                    </div>
                </DesktopWindow>
            </Transition>
        </Teleport>
    </div>
</template>

<style lang="scss" scoped>
.desktop-users {
    height: 100%;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
}

.du-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.du-search {
    flex: 1;
    position: relative;
    max-width: 320px;

    &__icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.3);
        font-size: 14px;
        pointer-events: none;
    }

    &__input {
        width: 100%;
        padding: 7px 10px 7px 30px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;

        &::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }

        &:focus {
            border-color: rgba(255, 255, 255, 0.2);
        }
    }
}

.du-btn {
    padding: 7px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    color: #fff;
    white-space: nowrap;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &--primary {
        background: var(--color-blue-5, #1677ff);

        &:hover:not(:disabled) {
            background: var(--color-blue-6, #4096ff);
        }
    }

    &--default {
        background: rgba(255, 255, 255, 0.08);

        &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.12);
        }
    }

    &--danger {
        background: var(--color-red-5, #ff4d4f);

        &:hover:not(:disabled) {
            background: var(--color-red-6, #ff7875);
        }
    }
}

.du-table-wrap {
    flex: 1;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
}

.du-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
        text-align: left;
        padding: 10px 12px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        white-space: nowrap;
    }

    td {
        padding: 10px 12px;
        color: rgba(255, 255, 255, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    &__row {
        transition: background 0.15s;

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }
    }

    &__empty {
        text-align: center;
        padding: 40px 12px;
    }

    &__col--name {
        min-width: 140px;
    }

    &__col--perm {
        min-width: 80px;
    }

    &__col--time {
        min-width: 140px;
        white-space: nowrap;
    }

    &__col--inst {
        text-align: center;
        min-width: 60px;
    }

    &__col--badge {
        text-align: center;
        min-width: 50px;
    }

    &__col--actions {
        min-width: 120px;
        text-align: right;
    }
}

.du-user-name {
    display: flex;
    align-items: center;
    gap: 6px;

    &__icon {
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
    }
}

.du-perm-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;

    &--admin {
        background: rgba(255, 193, 7, 0.15);
        color: #ffc107;
    }

    &--user {
        background: rgba(22, 119, 255, 0.15);
        color: #1677ff;
    }
}

.du-badge-icon {
    font-size: 14px;

    &--yes {
        color: var(--color-green-5, #52c41a);
    }

    &--no {
        color: rgba(255, 255, 255, 0.25);
    }
}

.du-action-btns {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
}

.du-action-btn {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
    color: rgba(255, 255, 255, 0.5);
    background: transparent;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
    }

    &--delete:hover {
        background: rgba(255, 77, 79, 0.15);
        color: #ff4d4f;
    }

    &--assign:hover {
        background: rgba(22, 119, 255, 0.15);
        color: #1677ff;
    }
}

.du-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-shrink: 0;
    padding: 4px 0;
}

.du-page-btn {
    padding: 4px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover:not(:disabled) {
        border-color: rgba(255, 255, 255, 0.2);
        color: #fff;
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
}

.du-page-info {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
}

.du-loading,
.du-empty {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.35);
}

.du-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}

.du-dialog {
    background: #1a1a2e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    width: 420px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    overflow: hidden;

    &--small {
        width: 360px;
    }

    &__header {
        padding: 16px 20px 0;

        h3 {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
    }

    &__body {
        padding: 16px 20px;
    }

    &__footer {
        padding: 12px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
}

.du-dialog-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: transparent;
}

.du-form-group {
    margin-bottom: 14px;

    &:last-child {
        margin-bottom: 0;
    }
}

.du-form-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 6px;
    font-weight: 500;
}

.du-form-input {
    width: 100%;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: #fff;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;

    &::placeholder {
        color: rgba(255, 255, 255, 0.25);
    }

    &:focus {
        border-color: rgba(255, 255, 255, 0.2);
    }

    &:disabled {
        opacity: 0.5;
    }
}

.du-form-hint {
    display: block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 4px;
}

.du-form-error {
    padding: 8px 10px;
    background: rgba(255, 77, 79, 0.1);
    border: 1px solid rgba(255, 77, 79, 0.2);
    border-radius: 6px;
    color: #ff4d4f;
    font-size: 12px;
    margin-top: 8px;
}

.du-radio-group {
    display: flex;
    gap: 8px;
}

.du-radio {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);

    input {
        display: none;
    }

    &--active {
        border-color: var(--color-blue-5, #1677ff);
        background: rgba(22, 119, 255, 0.1);
        color: #fff;
    }

    &:hover {
        border-color: rgba(255, 255, 255, 0.15);
    }
}

.du-delete-text {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    margin: 0;
}

.du-assign-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: transparent;
}

.du-assign-layout {
    display: flex;
    flex: 1;
    gap: 12px;
    padding: 16px;
    overflow: hidden;
}

.du-assign-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    overflow: hidden;

    &--assigned {
        max-width: 280px;
        flex: 0 0 280px;
    }

    &--browse {
        flex: 1;
    }

    &__header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }

    &__body {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
    }
}

.du-assign-count {
    margin-left: auto;
    background: rgba(22, 119, 255, 0.2);
    color: #1677ff;
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 10px;
    font-weight: 600;
}

.du-assign-empty {
    text-align: center;
    padding: 24px 12px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.35);
}

.du-assign-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    transition: background 0.15s;
    cursor: default;

    &:hover {
        background: rgba(255, 255, 255, 0.04);
    }

    &--selected {
        background: rgba(22, 119, 255, 0.06);
        border: 1px solid rgba(22, 119, 255, 0.15);
    }

    &__info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    &__name {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.85);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &__node {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.35);
        font-family: monospace;
    }

    &__status {
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 3px;
        display: inline-block;
        width: fit-content;

        &--3 {
            background: rgba(82, 196, 26, 0.15);
            color: #52c41a;
        }

        &--0 {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.4);
        }

        &--2 {
            background: rgba(250, 173, 20, 0.15);
            color: #faad14;
        }

        &--1 {
            background: rgba(255, 77, 79, 0.15);
            color: #ff4d4f;
        }

        &---1 {
            background: rgba(255, 77, 79, 0.15);
            color: #ff4d4f;
        }
    }

    &__remove,
    &__add {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s;
        flex-shrink: 0;
        background: transparent;
        color: rgba(255, 255, 255, 0.4);
    }

    &__remove:hover {
        background: rgba(255, 77, 79, 0.15);
        color: #ff4d4f;
    }

    &__add:hover {
        background: rgba(22, 119, 255, 0.15);
        color: #1677ff;
    }

    &__check {
        color: #52c41a;
        font-size: 14px;
        flex-shrink: 0;
    }
}

.du-assign-browse-toolbar {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.du-assign-node-select {
    flex-shrink: 0;
}

.du-assign-select {
    padding: 5px 8px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: #fff;
    font-size: 12px;
    outline: none;
    cursor: pointer;
    max-width: 180px;

    option {
        background: #1a1a2e;
        color: #fff;
    }

    &:focus {
        border-color: rgba(255, 255, 255, 0.2);
    }
}

.du-assign-search {
    flex: 1;

    &__input {
        width: 100%;
        padding: 5px 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;

        &::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }

        &:focus {
            border-color: rgba(255, 255, 255, 0.2);
        }
    }
}

.du-assign-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.du-assign-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.du-dialog-fade-enter-active,
.du-dialog-fade-leave-active {
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.du-dialog-fade-enter-from,
.du-dialog-fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

.du-table-wrap::-webkit-scrollbar {
    width: 4px;
}

.du-table-wrap::-webkit-scrollbar-track {
    background: transparent;
}

.du-table-wrap::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
}

.du-assign-panel__body::-webkit-scrollbar {
    width: 4px;
}

.du-assign-panel__body::-webkit-scrollbar-track {
    background: transparent;
}

.du-assign-panel__body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
}
</style>
