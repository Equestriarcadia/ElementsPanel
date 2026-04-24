<script setup lang="ts">
import { t } from "@/lang/i18n";
import { loginUser } from "@/services/apis";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { sleep } from "@/tools/common";
import { reportErrorMsg } from "@/tools/validator";
import {
    CheckCircleOutlined,
    LoadingOutlined,
    LockOutlined,
    UserOutlined
} from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";

const emit = defineEmits<{
    (e: "login-success"): void;
}>();

const formData = reactive({
    username: "",
    password: "",
    code: ""
});

const { execute: login } = loginUser();
const { updateUserInfo } = useAppStateStore();

const loginStep = ref(0);
const is2Fa = ref(false);

//─── Drag Logic ───
const windowRef = ref<HTMLElement | null>(null);
const pos = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });

const centerWindow = () => {
    const w = 380;
    const h = 460;
    pos.x = Math.round((window.innerWidth - w) / 2);
    pos.y = Math.round((window.innerHeight - h) / 2);
};

const onMouseDown = (e: MouseEvent) => {
    // Only drag from header area
    const target = e.target as HTMLElement;
    if (target.closest("input") || target.closest("button") || target.closest("a")) return;
    isDragging.value = true;
    dragStart.x = e.clientX - pos.x;
    dragStart.y = e.clientY - pos.y;
    e.preventDefault();
};

const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return;
    pos.x = e.clientX - dragStart.x;
    pos.y = e.clientY - dragStart.y;
};

const onMouseUp = () => {
    isDragging.value = false;
};

onMounted(() => {
    centerWindow();
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
});

onBeforeUnmount(() => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
});

// ─── Login Logic ───
const handleLogin = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
        return message.error(t("TXT_CODE_c846074d"));
    }
    try {
        loginStep.value = 1;
        await sleep(600);
        const result = await login({ data: formData });
        if (result.value === "NEED_2FA") {
            loginStep.value = 0;
            is2Fa.value = true;
            return;
        }
        is2Fa.value = false;
        await sleep(600);
        await handleNext();
    } catch (error: any) {
        loginStep.value = 0;
        reportErrorMsg(error);
    }
};

const handleNext = async () => {
    try {
        await updateUserInfo();
        loginStep.value = 2;
        await sleep(1000);
        loginStep.value = 3;
        emit("login-success");
    } catch (error: any) {
        console.error(error);
        loginStep.value = 0;
        Modal.error({
            title: t("TXT_CODE_da2fb99a"),
            content: t("TXT_CODE_6e718abe")
        });
    }
};
</script>

<template>
    <div class="desktop-login-overlay">
        <div ref="windowRef" class="desktop-login-window"
            :class="{ 'is-logging': loginStep === 1, 'is-dragging': isDragging }"
            :style="{ left: pos.x + 'px', top: pos.y + 'px' }">
            <!-- Drag handle header -->
            <div class="desktop-login-drag-handle" @mousedown="onMouseDown">
                <div class="drag-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <div class="desktop-login-header">
                <h2>ElementsPanel</h2>
            </div>

            <!-- Login form -->
            <div v-show="loginStep === 0" class="desktop-login-body">
                <p class="desktop-login-subtitle">{{ t("TXT_CODE_5b60ad00") }}</p>
                <form class="desktop-login-form" @submit.prevent="handleLogin">
                    <div v-if="!is2Fa">
                        <div class="desktop-login-field">
                            <UserOutlined class="field-icon" />
                            <input v-model="formData.username" type="text" :placeholder="t('TXT_CODE_80a560a1')"
                                autocomplete="username" />
                        </div>
                        <div class="desktop-login-field">
                            <LockOutlined class="field-icon" />
                            <input v-model="formData.password" type="password" :placeholder="t('TXT_CODE_551b0348')"
                                autocomplete="current-password" @keydown.enter="handleLogin" />
                        </div>
                    </div>
                    <div v-else>
                        <div class="desktop-login-field">
                            <LockOutlined class="field-icon" />
                            <input v-model="formData.code" type="text" :placeholder="t('TXT_CODE_7ac8b1d3')"
                                autocomplete="off" @keydown.enter="handleLogin" />
                        </div>
                    </div>
                    <button type="submit" class="desktop-login-btn">
                        {{ t("TXT_CODE_d2c1a316") }}
                    </button>
                </form>
                <div class="desktop-login-footer">
                    Powered by
                    <a href="https://mcsmanager.com" target="_blank" rel="noopener noreferrer">ElementsPanel</a>
                </div>
            </div>

            <!-- Loading -->
            <div v-show="loginStep === 1" class="desktop-login-body desktop-login-center">
                <LoadingOutlined class="login-state-icon spinning" />
                <p>{{ t("TXT_CODE_DESKTOP_LOGGING_IN") }}</p>
            </div>

            <!-- Success -->
            <div v-show="loginStep >= 2" class="desktop-login-body desktop-login-center">
                <CheckCircleOutlined class="login-state-icon success" />
                <p>{{ t("TXT_CODE_DESKTOP_LOGIN_SUCCESS") }}</p>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.desktop-login-overlay {
    position: absolute;
    inset: 0;
    z-index: 500;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(2px);
}

.desktop-login-window {
    position: absolute;
    width: 380px;
    background: rgba(30, 40, 60, 0.85);
    backdrop-filter: saturate(150%) blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow:
        0 24px 80px rgba(0, 0, 0, 0.5),
        0 0 1px rgba(255, 255, 255, 0.1);
    overflow: hidden;
    animation: loginWindowAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1);

    &.is-dragging {
        transition: none;
        user-select: none;
        box-shadow:
            0 32px 100px rgba(0, 0, 0, 0.6),
            0 0 1px rgba(255, 255, 255, 0.15);
    }

    &:not(.is-dragging) {
        transition: box-shadow 0.3s ease, border-color 0.3s ease;
    }

    &.is-logging {
        border-color: rgba(22, 119, 255, 0.5);
        box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(22, 119, 255, 0.2);
    }
}

@keyframes loginWindowAppear {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.desktop-login-drag-handle {
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);

    &:active {
        cursor: grabbing;
    }

    .drag-dots {
        display: flex;
        gap: 4px;

        span {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
        }
    }
}

.desktop-login-header {
    text-align: center;
    padding: 20px 24px 0;

    .desktop-login-logo {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        background: linear-gradient(135deg, #faad14, #fa8c16);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: #fff;
        margin-bottom: 12px;
    }

    h2 {
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        margin: 0;
        letter-spacing: 0.5px;
    }
}

.desktop-login-body {
    padding: 20px 28px 28px;
}

.desktop-login-subtitle {
    text-align: center;
    color: rgba(255, 255, 255, 0.45);
    font-size: 13px;
    margin: 0 0 20px;
}

.desktop-login-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.desktop-login-field {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0 12px;
    transition: all 0.2s;

    &:focus-within {
        border-color: rgba(22, 119, 255, 0.6);
        background: rgba(255, 255, 255, 0.08);
    }

    .field-icon {
        color: rgba(255, 255, 255, 0.35);
        font-size: 15px;
        flex-shrink: 0;
    }

    input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        padding: 11px 10px;
        color: #fff;
        font-size: 14px;

        &::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }

        &:-webkit-autofill {
            -webkit-text-fill-color: #fff !important;
            -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
            background-color: transparent !important;
            transition: background-color 99999s ease-in-out 0s;
        }
    }
}

.desktop-login-btn {
    margin-top: 4px;
    padding: 10px 0;
    background: linear-gradient(135deg, #1677ff, #4096ff);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: linear-gradient(135deg, #4096ff, #69b1ff);
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(22, 119, 255, 0.3);
    }

    &:active {
        transform: translateY(0);
    }
}

.desktop-login-footer {
    text-align: center;
    margin-top: 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.25);

    a {
        color: rgba(255, 255, 255, 0.4);
        text-decoration: underline;

        &:hover {
            color: rgba(255, 255, 255, 0.6);
        }
    }
}

.desktop-login-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    gap: 16px;

    p {
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        margin: 0;
    }
}

.login-state-icon {
    font-size: 48px;

    &.spinning {
        color: #1677ff;
        animation: spin 1s linear infinite;
    }

    &.success {
        color: #52c41a;
        animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes popIn {
    from {
        transform: scale(0);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
