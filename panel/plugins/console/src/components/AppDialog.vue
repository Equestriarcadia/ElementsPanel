<script setup lang="ts">
import {
  VBtn,
  VCard,
  VCardActions,
  VCardText,
  VCardTitle,
  VDialog,
  VIcon
} from "vuetify/lib/components/index.mjs";
import { t } from "@/lang/i18n";
import { computed, ref, useAttrs, useSlots, watch } from "vue";

defineOptions({ inheritAttrs: false });

interface Props {
  modelValue?: boolean;
  open?: boolean;
  visible?: boolean;
  title?: string | null;
  width?: string | number;
  maxWidth?: string | number;
  footer?: unknown;
  closable?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  confirmLoading?: boolean;
  okText?: string;
  cancelText?: string;
  showCancel?: boolean;
  okColor?: string;
  okType?: string;
  okButtonProps?: Record<string, unknown>;
  wrapClassName?: string;
  style?: string | Record<string, string | number>;
}

const props = withDefaults(defineProps<Props>(), {
  closable: true,
  maskClosable: true,
  keyboard: true,
  destroyOnClose: false,
  confirmLoading: false,
  showCancel: true
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:open": [value: boolean];
  "update:visible": [value: boolean];
  ok: [];
  cancel: [];
  close: [];
  "after-close": [];
}>();

const attrs = useAttrs();
const slots = useSlots();
const localOpen = ref(false);

const sourceOpen = computed(() => props.open ?? props.visible ?? props.modelValue ?? false);

watch(sourceOpen, (value) => {
  localOpen.value = value;
}, { immediate: true });

const isOpen = computed({
  get: () => localOpen.value,
  set: (value: boolean) => {
    const wasOpen = localOpen.value;
    localOpen.value = value;
    emit("update:modelValue", value);
    emit("update:open", value);
    emit("update:visible", value);
    if (wasOpen && !value) {
      emit("cancel");
      emit("close");
    }
  }
});

const dialogWidth = computed(() => {
  const width = props.width ?? props.maxWidth;
  return typeof width === "number" ? `${width}px` : width;
});

const dialogMaxWidth = computed(() => props.maxWidth ?? props.width ?? "calc(100% - 32px)");
const dialogStyle = computed(() => [attrs.style as any, props.style] as any);

const showTitle = computed(() => Boolean(props.title || slots.title || props.closable));
const showFooter = computed(() => props.footer !== null && props.footer !== false);
const okButtonAttrs = computed(() => {
  const buttonProps = { ...(props.okButtonProps ?? {}) };
  delete buttonProps.danger;
  return {
    ...buttonProps,
    color: props.okColor ?? (props.okType === "danger" ? "error" : "primary")
  };
});

const close = () => {
  isOpen.value = false;
};

const confirm = () => {
  emit("ok");
};

const afterLeave = () => {
  emit("after-close");
};
</script>

<template>
  <VDialog
    v-model="isOpen"
    :class="[attrs.class, props.wrapClassName]"
    :style="dialogStyle"
    :max-width="dialogMaxWidth"
    :persistent="props.maskClosable === false"
    :close-on-back="props.keyboard !== false"
    scrollable
    @after-leave="afterLeave"
  >
    <VCard
      v-if="!props.destroyOnClose || isOpen"
      class="app-dialog-card"
      rounded="xl"
      :style="{ width: dialogWidth }"
    >
      <VCardTitle v-if="showTitle" class="app-dialog-title">
        <slot name="title">{{ props.title }}</slot>
        <VBtn
          v-if="props.closable"
          class="app-dialog-close"
          icon
          variant="text"
          :aria-label="props.cancelText"
          @click="close"
        >
          <VIcon icon="mdi-close" />
        </VBtn>
      </VCardTitle>

      <VCardText class="app-dialog-content">
        <slot />
      </VCardText>

      <VCardActions v-if="showFooter" class="app-dialog-actions">
        <slot name="footer">
          <VBtn v-if="props.showCancel" variant="text" @click="close">
            {{ props.cancelText ?? t("TXT_CODE_a0451c97") }}
          </VBtn>
          <VBtn v-bind="okButtonAttrs" :loading="props.confirmLoading" @click="confirm">
            {{ props.okText ?? t("TXT_CODE_d507abff") }}
          </VBtn>
        </slot>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style lang="scss">
.app-dialog-card {
  max-width: 100%;
  overflow: hidden;
}

.app-dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px 12px;
}

.app-dialog-content {
  padding: 16px 28px 24px;
}

.app-dialog-actions {
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 28px 24px;
}

.app-dialog-close {
  flex: 0 0 auto;
}
</style>
