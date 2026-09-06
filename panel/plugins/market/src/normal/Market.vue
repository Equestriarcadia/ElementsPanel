<script setup lang="ts">
import { router } from "@/config/router";
import { t } from "@/lang/i18n";
import type { LayoutCard } from "@/types";
import McPreset from "./McPreset.vue";
import { DatabaseOutlined } from "@ant-design/icons-vue";
import { Divider, Flex } from "ant-design-vue";
import Link from "ant-design-vue/es/typography/Link";

defineProps<{
  card: LayoutCard;
}>();

const openEditor = () => {
  router.push("/market/editor");
};
</script>

<template>
  <div class="market-page" style="height: 100%">
    <div>
      <a-typography-title :level="4" style="margin-bottom: 8px">
        <DatabaseOutlined />
        {{ t("TXT_CODE_88249aee") }}
      </a-typography-title>
      <a-typography-paragraph>
        <Flex justify="space-between" align="flex-start">
          <p style="opacity: 0.6">
            <span>{{ t("TXT_CODE_c9ce7427") }}</span>
          </p>
          <p style="opacity: 0.6">
            <Link target="_blank" @click="openEditor">
              {{ t("TXT_CODE_85c10fde") }}
            </Link>
            <Divider type="vertical" />
            <Link href="https://github.com/MCSManager/Script/issues/77" target="_blank">
              {{ t("TXT_CODE_709c2db4") }}
            </Link>
          </p>
        </Flex>
      </a-typography-paragraph>
      <McPreset :card="card" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.market-page {
  width: 100%;
  min-width: 0;
  margin: 0 auto;
  box-sizing: border-box;
}
</style>
