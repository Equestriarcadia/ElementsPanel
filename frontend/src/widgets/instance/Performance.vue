<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import TerminalTopTags from "@/components/TerminalTopTags.vue";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { useInstanceInfo } from "@/hooks/useInstance";
import { t } from "@/lang/i18n";
import type { LayoutCard } from "@/types";
import { onMounted } from "vue";

const props = defineProps<{
    card: LayoutCard;
}>();

const { getMetaOrRouteValue } = useLayoutCardTools(props.card);

const instanceId = getMetaOrRouteValue("instanceId");
const daemonId = getMetaOrRouteValue("daemonId");

const { isStopped, instanceInfo, execute } = useInstanceInfo({
    instanceId,
    daemonId,
    autoRefresh: true
});

onMounted(async () => {
    if (instanceId && daemonId) {
        await execute({
            params: {
                uuid: instanceId,
                daemonId: daemonId
            }
        });
    }
});
</script>

<template>
    <CardPanel class="containerWrapper" style="height: 100%">
        <template #title>
            {{ card.title }}
        </template>
        <template #body>
            <TerminalTopTags v-if="!isStopped && instanceInfo?.info" :info="instanceInfo?.info"
                :is-stopped="isStopped" />
            <div v-else style="text-align: center; color: var(--color-gray-6); padding: 10px 0;">
                {{ t("TXT_CODE_NO_DATA") }}
            </div>
        </template>
    </CardPanel>
</template>
