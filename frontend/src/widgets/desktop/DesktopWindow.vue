<script setup lang="ts">
import {
    CloseOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    MinusOutlined
} from "@ant-design/icons-vue";
import { computed, onMounted, onUnmounted, ref, type Component } from "vue";

export interface DesktopWindowProps {
    id: string;
    title: string;
    icon: Component | string;
    visible: boolean;
    minimized: boolean;
    maximized: boolean;
    active: boolean;
    initialX?: number;
    initialY?: number;
    initialWidth?: number;
    initialHeight?: number;
    zIndex?: number;
    showMinimize?: boolean;
    showMaximize?: boolean;
    resizable?: boolean;
}

const props = withDefaults(defineProps<DesktopWindowProps>(), {
    initialX: 100,
    initialY: 60,
    initialWidth: 800,
    initialHeight: 500,
    zIndex: 100,
    showMinimize: true,
    showMaximize: true,
    resizable: true
});

const emit = defineEmits<{
    (e: "close", id: string): void;
    (e: "minimize", id: string): void;
    (e: "maximize", id: string): void;
    (e: "focus", id: string): void;
    (e: "moved", id: string, x: number, y: number): void;
    (e: "resized", id: string, x: number, y: number, width: number, height: number): void;
}>();

const x = ref(props.initialX);
const y = ref(props.initialY);
const width = ref(props.initialWidth);
const height = ref(props.initialHeight);

const isDragging = ref(false);
const isResizing = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const resizeStart = ref({ x: 0, y: 0, w: 0, h: 0 });

const savedPos = ref({ x: props.initialX, y: props.initialY, w: props.initialWidth, h: props.initialHeight });

const isComponentIcon = computed(() => typeof props.icon !== "string");

const windowStyle = computed(() => {
    if (props.maximized) {
        return {
            left: "0px",
            top: "0px",
            width: "100vw",
            height: "calc(100vh - 48px)",
            zIndex: props.zIndex,
            borderRadius: "0px"
        };
    }
    return {
        left: `${x.value}px`,
        top: `${y.value}px`,
        width: `${width.value}px`,
        height: `${height.value}px`,
        zIndex: props.zIndex,
        borderRadius: "10px"
    };
});

const onMouseDownTitlebar = (e: MouseEvent) => {
    if (props.maximized) return;
    isDragging.value = true;
    dragOffset.value = {
        x: e.clientX - x.value,
        y: e.clientY - y.value
    };
    emit("focus", props.id);
    e.preventDefault();
};

const onMouseMove = (e: MouseEvent) => {
    if (isDragging.value) {
        x.value = Math.max(0, e.clientX - dragOffset.value.x);
        y.value = Math.max(0, e.clientY - dragOffset.value.y);
    }
    if (isResizing.value && props.resizable) {
        width.value = Math.max(400, resizeStart.value.w + (e.clientX - resizeStart.value.x));
        height.value = Math.max(300, resizeStart.value.h + (e.clientY - resizeStart.value.y));
    }
};

const onMouseUp = () => {
    if (isDragging.value) {
        isDragging.value = false;
        emit("moved", props.id, x.value, y.value);
    }
    if (isResizing.value) {
        isResizing.value = false;
        emit("resized", props.id, x.value, y.value, width.value, height.value);
    }
};

const onResizeStart = (e: MouseEvent) => {
    if (props.maximized || !props.resizable) return;
    isResizing.value = true;
    resizeStart.value = {
        x: e.clientX,
        y: e.clientY,
        w: width.value,
        h: height.value
    };
    emit("focus", props.id);
    e.preventDefault();
    e.stopPropagation();
};

const handleMaximize = () => {
    if (!props.showMaximize) return;
    if (!props.maximized) {
        savedPos.value = { x: x.value, y: y.value, w: width.value, h: height.value };
    } else {
        x.value = savedPos.value.x;
        y.value = savedPos.value.y;
        width.value = savedPos.value.w;
        height.value = savedPos.value.h;
    }
    emit("maximize", props.id);
};

const handleFocus = () => {
    emit("focus", props.id);
};

onMounted(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
});

onUnmounted(() => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
    <div v-show="visible && !minimized" class="desktop-window" :class="{
        'desktop-window--active': active,
        'desktop-window--maximized': maximized,
        'desktop-window--dragging': isDragging
    }" :style="windowStyle" @mousedown="handleFocus">
        <!-- Title Bar -->
        <div class="window__titlebar" @mousedown="onMouseDownTitlebar" @dblclick="handleMaximize">
            <div class="window__titlebar-left">
                <span class="window__icon">
                    <component :is="icon" v-if="isComponentIcon" />
                    <img v-else :src="icon as string" alt="icon" />
                </span>
                <span class="window__title">{{ title }}</span>
            </div>
            <div class="window__controls">
                <div v-if="showMinimize" class="window__control window__control--minimize"
                    @click.stop="emit('minimize', id)">
                    <MinusOutlined />
                </div>
                <div v-if="showMaximize" class="window__control window__control--maximize" @click.stop="handleMaximize">
                    <FullscreenExitOutlined v-if="maximized" />
                    <FullscreenOutlined v-else />
                </div>
                <div class="window__control window__control--close" @click.stop="emit('close', id)">
                    <CloseOutlined />
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="window__content" @contextmenu.stop>
            <slot></slot>
        </div>

        <!-- Resize Handle -->
        <div v-if="!maximized && resizable" class="window__resize-handle" @mousedown="onResizeStart"></div>
    </div>
</template>

<style lang="scss" scoped>
.desktop-window {
    position: fixed;
    background: rgba(32, 32, 40, 0.92);
    backdrop-filter: saturate(180%) blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: left 0.25s ease,
        top 0.25s ease,
        width 0.25s ease,
        height 0.25s ease,
        border-radius 0.25s ease,
        box-shadow 0.25s ease;

    &--active {
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.45);
    }

    &--dragging {
        transition: none;
    }

    &--maximized {
        border: none;
    }
}

.window__titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 38px;
    padding: 0 8px 0 12px;
    background: rgba(0, 0, 0, 0.2);
    cursor: default;
    user-select: none;
    flex-shrink: 0;

    &-left {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow: hidden;
    }
}

.window__icon {
    font-size: 14px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.85);

    img {
        width: 14px;
        height: 14px;
    }
}

.window__title {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.window__controls {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
}

.window__control {
    width: 32px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    transition: background-color 0.12s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    &--close:hover {
        background-color: #e81123;
        color: #fff;
    }
}

.window__content {
    flex: 1;
    overflow: auto;
    color: rgba(255, 255, 255, 0.9);
}

.window__resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    z-index: 10;

    &::after {
        content: "";
        position: absolute;
        bottom: 3px;
        right: 3px;
        width: 8px;
        height: 8px;
        border-right: 2px solid rgba(255, 255, 255, 0.2);
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    }
}
</style>
