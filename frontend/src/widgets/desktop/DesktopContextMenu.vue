<script setup lang="ts">
import { onMounted, onUnmounted, type Component } from "vue";

export interface ContextMenuItem {
    label: string;
    icon?: Component | string | null;
    action: () => void;
    divider?: boolean;
}

const props = defineProps<{
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

const handleClick = (item: ContextMenuItem) => {
    item.action();
    emit("close");
};

const handleClickOutside = () => {
    if (props.visible) {
        emit("close");
    }
};

const isComponent = (icon: unknown): icon is Component => {
    return icon !== null && icon !== undefined && typeof icon !== "string";
};

onMounted(() => {
    document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
    <Transition name="ctx-menu">
        <div v-if="visible" class="desktop-context-menu" :style="{ left: `${x}px`, top: `${y}px` }" @click.stop>
            <div v-for="(item, index) in items" :key="index">
                <div v-if="item.divider" class="ctx-menu__divider"></div>
                <div v-else class="ctx-menu__item" @click="handleClick(item)">
                    <span v-if="item.icon" class="ctx-menu__icon">
                        <component :is="item.icon" v-if="isComponent(item.icon)" />
                        <template v-else>{{ item.icon }}</template>
                    </span>
                    <span class="ctx-menu__label">{{ item.label }}</span>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
.desktop-context-menu {
    position: fixed;
    min-width: 180px;
    background: rgba(32, 32, 40, 0.95);
    backdrop-filter: saturate(180%) blur(24px);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 2000;
    padding: 4px 0;
    overflow: hidden;
}

.ctx-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    transition: background-color 0.12s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.08);
    }
}

.ctx-menu__icon {
    font-size: 14px;
    width: 20px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ctx-menu__divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 4px 12px;
}

.ctx-menu-enter-active {
    transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ctx-menu-leave-active {
    transition: all 0.1s ease-in;
}

.ctx-menu-enter-from {
    opacity: 0;
    transform: scale(0.92);
}

.ctx-menu-leave-to {
    opacity: 0;
    transform: scale(0.92);
}
</style>
