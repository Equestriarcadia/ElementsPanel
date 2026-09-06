<script setup lang="ts">
import BetweenMenus from "@/components/BetweenMenus.vue";
import FadeUpAnimation from "@/components/FadeUpAnimation.vue";
import { useScreen } from "@/hooks/useScreen";
import { t } from "@/lang/i18n";
import { reportErrorMsg } from "@/tools/validator";
import type { LayoutCard } from "@/types/index";
import { computed, ref } from "vue";
import {
  VBtn,
  VCol,
  VIcon,
  VPagination,
  VRow,
  VSelect,
  VTextField
} from "vuetify/lib/components/index.mjs";
import { useRemoteNode } from "../hooks/useRemoteNode";
import NodeDetailDialog from "./node/NodeDetailDialog.vue";
import NodeItem from "./node/NodeItem.vue";

const props = defineProps<{
  card?: LayoutCard;
}>();

const pageTitle = computed(() => props.card?.title ?? t("TXT_CODE_20509fa0"));

const { isPhone } = useScreen();
const nodeDetailDialog = ref<InstanceType<typeof NodeDetailDialog>>();

const {
  operationForm,
  remoteNodes: remotes,
  refreshLoading,
  currentStatus,
  refresh: refreshOverviewInfo
} = useRemoteNode();

const refresh = async () => {
  try {
    refreshLoading.value = true;
    await refreshOverviewInfo();
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    refreshLoading.value = false;
  }
};

const handleOpenDetailDialog = async () => {
  nodeDetailDialog.value?.openDialog();
};
</script>

<template>
  <main class="node-page">
    <VRow dense class="node-list-row">
      <VCol cols="12">
        <BetweenMenus>
          <template v-if="!isPhone" #left>
            <div class="node-list-title">
              <VIcon icon="mdi-server-network-outline" />
              {{ pageTitle }}
            </div>
          </template>
          <template #right>
            <VBtn :disabled="refreshLoading" :loading="refreshLoading" variant="text" @click="refresh">
              {{ t("TXT_CODE_b76d94e0") }}
            </VBtn>
            <VBtn color="primary" @click="handleOpenDetailDialog">
              {{ t("TXT_CODE_15a381d5") }}
            </VBtn>
            <VBtn href="https://docs.mcsmanager.com/" target="_blank" variant="text">
              {{ t("TXT_CODE_3a302f23") }}
            </VBtn>
          </template>
          <template #center>
            <div class="search-input">
              <VSelect
                v-model="currentStatus"
                :items="[
                  { title: t('TXT_CODE_c48f6f64'), value: 'all' },
                  { title: t('TXT_CODE_823bfe63'), value: true },
                  { title: t('TXT_CODE_66ce073e'), value: false }
                ]"
                class="status-select"
                density="compact"
                hide-details
                variant="solo-filled"
              />
              <VTextField
                v-model.trim="operationForm.name"
                :placeholder="t('TXT_CODE_461d1a01')"
                class="node-search-field"
                density="compact"
                hide-details
                variant="solo-filled"
                @change="operationForm.current = 1"
              >
                <template #append-inner><VIcon icon="mdi-magnify" /></template>
              </VTextField>
            </div>
          </template>
        </BetweenMenus>
      </VCol>

      <VCol cols="12">
        <div class="desc">
          <div class="desc-text">
            {{ t("TXT_CODE_f9a92e38") }}
            <br />
            {{ t("TXT_CODE_a65c65c2") }}
          </div>
          <div class="pagination">
            <VPagination
              v-model="operationForm.current"
              :length="Math.max(1, Math.ceil(operationForm.total / operationForm.pageSize))"
              density="compact"
              total-visible="5"
            />
            <VSelect
              v-model="operationForm.pageSize"
              :items="[8, 16, 24, 48]"
              class="page-size-select"
              density="compact"
              hide-details
              variant="solo-filled"
            />
          </div>
        </div>
      </VCol>
      <fade-up-animation v-if="!refreshLoading" :delay="3000">
        <VCol
          v-for="(item, index) in remotes"
          :key="item.uuid + item.available + item.ip"
          :data-index="index"
          cols="12"
          lg="6"
        >
          <NodeItem :item="item" />
        </VCol>
      </fade-up-animation>
    </VRow>
    <NodeDetailDialog ref="nodeDetailDialog" />
  </main>
</template>

<style lang="scss" scoped>
.search-input {
  display: flex;
  width: 80%;
  gap: 8px;
}

.node-page {
  width: 100%;
  max-width: var(--app-max-width);
  min-height: 100%;
  margin: 0 auto;
  padding: 20px 24px 32px;
  box-sizing: border-box;
}

.status-select { flex: 0 0 100px; }
.node-search-field { flex: 1; }
.node-list-title { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 600; }
.node-list-row { width: 100%; height: 100%; margin: 0; }
.desc-text { color: var(--color-gray-7); font-size: 13px; }
.pagination { display: flex; align-items: center; gap: 8px; }
.page-size-select { width: 96px; }

.desc {
  display: flex;
  justify-content: space-between;
}

@media (max-width: 992px) {
  .node-page {
    padding: 16px 12px 28px;
  }

  .search-input {
    width: 100% !important;
  }

  .desc {
    flex-direction: column;
    .pagination {
      margin-top: 10px;
    }
  }
}
</style>
