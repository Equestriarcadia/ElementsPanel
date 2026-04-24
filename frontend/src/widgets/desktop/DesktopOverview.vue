<script setup lang="ts">
import { useOverviewInfo } from "@/hooks/useOverviewInfo";
import { t } from "@/lang/i18n";
import {
    ApiOutlined,
    ArrowDownOutlined,
    ArrowUpOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CloudServerOutlined,
    HddOutlined
} from "@ant-design/icons-vue";
import { computed } from "vue";

const { state: overviewData } = useOverviewInfo();

const panelCpu = computed(() => overviewData.value?.cpu ?? 0);
const panelMem = computed(() => overviewData.value?.mem ?? 0);
const totalInstances = computed(() => overviewData.value?.totalInstance ?? 0);
const runningInstances = computed(() => overviewData.value?.runningInstance ?? 0);
const stoppedInstances = computed(() => totalInstances.value - runningInstances.value);

const remoteCount = computed(() => overviewData.value?.remoteCount ?? { available: 0, total: 0 });
const remoteNodes = computed(() => overviewData.value?.remote ?? []);

const panelVersion = computed(() => overviewData.value?.version ?? "--");
const daemonVersion = computed(() => overviewData.value?.specifiedDaemonVersion ?? "--");

const systemInfo = computed(() => overviewData.value?.system);
const panelProcess = computed(() => overviewData.value?.process);

const record = computed(() => overviewData.value?.record);

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(" ");
};

const formatLoadAvg = (load: number[]): string => {
    return load.map((v) => v.toFixed(2)).join(", ");
};

const cpuColor = computed(() => {
    const v = panelCpu.value;
    if (v < 50) return "var(--color-green-5)";
    if (v < 80) return "var(--color-orange-5)";
    return "var(--color-red-5)";
});

const memColor = computed(() => {
    const v = panelMem.value;
    if (v < 50) return "var(--color-green-5)";
    if (v < 80) return "var(--color-orange-5)";
    return "var(--color-red-5)";
});
</script>

<template>
    <div class="desktop-overview">
        <div class="ov-stats-row">
            <div class="ov-stat-card ov-stat-card--instances">
                <div class="ov-stat-card__icon">
                    <CloudServerOutlined />
                </div>
                <div class="ov-stat-card__body">
                    <div class="ov-stat-card__value">{{ totalInstances }}</div>
                    <div class="ov-stat-card__label">{{ t("TXT_CODE_DESKTOP_IM_TOTAL") }}</div>
                </div>
                <div class="ov-stat-card__extra">
                    <span class="ov-stat-card__running">
                        <CheckCircleOutlined /> {{ runningInstances }}
                    </span>
                    <span class="ov-stat-card__stopped">
                        <CloseCircleOutlined /> {{ stoppedInstances }}
                    </span>
                </div>
            </div>

            <div class="ov-stat-card ov-stat-card--nodes">
                <div class="ov-stat-card__icon">
                    <ApiOutlined />
                </div>
                <div class="ov-stat-card__body">
                    <div class="ov-stat-card__value">{{ remoteCount.available }} / {{ remoteCount.total }}</div>
                    <div class="ov-stat-card__label">{{ t("TXT_CODE_DESKTOP_IM_NODE") }}</div>
                </div>
                <div class="ov-stat-card__extra">
                    <span class="ov-stat-card__online">
                        <CheckCircleOutlined /> {{ remoteCount.available }}
                    </span>
                    <span class="ov-stat-card__offline">
                        <CloseCircleOutlined /> {{ remoteCount.total - remoteCount.available }}
                    </span>
                </div>
            </div>

            <div class="ov-stat-card ov-stat-card--cpu">
                <div class="ov-stat-card__icon">
                    <HddOutlined />
                </div>
                <div class="ov-stat-card__body">
                    <div class="ov-stat-card__value">{{ panelCpu }}%</div>
                    <div class="ov-stat-card__label">CPU</div>
                </div>
                <div class="ov-stat-card__bar">
                    <div class="ov-stat-card__bar-fill" :style="{ width: panelCpu + '%', background: cpuColor }"></div>
                </div>
            </div>

            <div class="ov-stat-card ov-stat-card--mem">
                <div class="ov-stat-card__icon">
                    <HddOutlined />
                </div>
                <div class="ov-stat-card__body">
                    <div class="ov-stat-card__value">{{ panelMem }}%</div>
                    <div class="ov-stat-card__label">RAM</div>
                </div>
                <div class="ov-stat-card__bar">
                    <div class="ov-stat-card__bar-fill" :style="{ width: panelMem + '%', background: memColor }"></div>
                </div>
            </div>
        </div>

        <div class="ov-grid">
            <div class="ov-panel ov-panel--system">
                <div class="ov-panel__header">
                    <span class="ov-panel__title">{{ t("TXT_CODE_66056676") }}</span>
                </div>
                <div class="ov-panel__body">
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_81634069") }}</span>
                        <span class="ov-info-row__value">{{ systemInfo?.version ?? "--" }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_3d0885c0") }}</span>
                        <span class="ov-info-row__value">{{ systemInfo?.platform ?? "--" }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_4df7e9bd") }}</span>
                        <span class="ov-info-row__value">{{ systemInfo?.hostname ?? "--" }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_190ecd56") }}</span>
                        <span class="ov-info-row__value">{{ systemInfo?.loadavg ? formatLoadAvg(systemInfo.loadavg) :
                            "--" }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_4ab6a0b5") }}</span>
                        <span class="ov-info-row__value">{{ systemInfo?.time ? new
                            Date(systemInfo.time).toLocaleString() : "--" }}</span>
                    </div>
                </div>
            </div>

            <div class="ov-panel ov-panel--panel">
                <div class="ov-panel__header">
                    <span class="ov-panel__title">{{ t("TXT_CODE_f5b9d58f") }}</span>
                </div>
                <div class="ov-panel__body">
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_af21e6b") }}</span>
                        <span class="ov-info-row__value">{{ panelVersion }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_3f99f17f") }}</span>
                        <span class="ov-info-row__value">{{ daemonVersion }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">CPU</span>
                        <span class="ov-info-row__value">{{ panelProcess?.cpu ? (panelProcess.cpu * 100).toFixed(1) +
                            "%" : "--" }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_593ee330") }}</span>
                        <span class="ov-info-row__value">{{ panelProcess?.memory ? formatBytes(panelProcess.memory) :
                            "--" }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_uptime") }}</span>
                        <span class="ov-info-row__value">{{ systemInfo?.uptime ? formatUptime(systemInfo.uptime) : "--"
                            }}</span>
                    </div>
                </div>
            </div>

            <div class="ov-panel ov-panel--security">
                <div class="ov-panel__header">
                    <span class="ov-panel__title">{{ t("TXT_CODE_9c3ca8f") }}</span>
                </div>
                <div class="ov-panel__body">
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_39994770") }}</span>
                        <span class="ov-info-row__value">{{ record?.logined ?? 0 }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_871fb0d6") }}</span>
                        <span class="ov-info-row__value">{{ record?.loginFailed ?? 0 }} / {{ record?.illegalAccess ?? 0
                            }}</span>
                    </div>
                    <div class="ov-info-row">
                        <span class="ov-info-row__label">{{ t("TXT_CODE_856bd2f3") }}</span>
                        <span class="ov-info-row__value">{{ record?.banips ?? 0 }}</span>
                    </div>
                </div>
            </div>

            <div class="ov-panel ov-panel--nodes">
                <div class="ov-panel__header">
                    <span class="ov-panel__title">{{ t("TXT_CODE_b4a9d04a") }} ({{ remoteNodes.length }})</span>
                </div>
                <div class="ov-panel__body ov-panel__body--nodes">
                    <div v-if="remoteNodes.length === 0" class="ov-empty">
                        {{ t("TXT_CODE_9337bed1") }}
                    </div>
                    <div v-for="node in remoteNodes" :key="node.uuid" class="ov-node-item">
                        <div class="ov-node-item__status">
                            <span v-if="node.available" class="ov-node-status-dot ov-node-status-dot--online"
                                title="Online"></span>
                            <span v-else class="ov-node-status-dot ov-node-status-dot--offline" title="Offline"></span>
                        </div>
                        <div class="ov-node-item__info">
                            <div class="ov-node-item__name">{{ node.remarks || node.ip }}</div>
                            <div class="ov-node-item__meta">
                                <span>{{ node.ip }}:{{ node.port }}</span>
                                <span v-if="node.instance" class="ov-node-item__instances">
                                    {{ node.instance.running }}/{{ node.instance.total }}
                                </span>
                            </div>
                        </div>
                        <div v-if="node.system" class="ov-node-item__stats">
                            <span class="ov-node-item__stat" :title="'CPU'">
                                <ArrowUpOutlined /> {{ (node.system.cpuUsage * 100).toFixed(0) }}%
                            </span>
                            <span class="ov-node-item__stat" :title="'RAM'">
                                <ArrowDownOutlined /> {{ (node.system.memUsage * 100).toFixed(0) }}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.desktop-overview {
    height: 100%;
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ov-stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    flex-shrink: 0;
}

.ov-stat-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: background 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.07);
    }

    &__icon {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.4);
    }

    &__body {
        display: flex;
        align-items: baseline;
        gap: 8px;
    }

    &__value {
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        line-height: 1;
    }

    &__label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.45);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    &__extra {
        display: flex;
        gap: 12px;
        font-size: 12px;

        span {
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }

    &__running,
    &__online {
        color: var(--color-green-5, #52c41a);
    }

    &__stopped,
    &__offline {
        color: rgba(255, 255, 255, 0.4);
    }

    &__bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 2px;
    }

    &__bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.6s ease, background 0.3s;
    }
}

.ov-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    flex: 1;
    min-height: 0;
}

.ov-panel {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    &__header {
        padding: 10px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        flex-shrink: 0;
    }

    &__title {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
    }

    &__body {
        padding: 10px 14px;
        flex: 1;
        overflow-y: auto;

        &--nodes {
            padding: 6px 8px;
        }
    }
}

.ov-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);

    &:last-child {
        border-bottom: none;
    }

    &__label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
    }

    &__value {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
        font-weight: 500;
        text-align: right;
    }
}

.ov-node-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 6px;
    border-radius: 6px;
    transition: background 0.15s;
    cursor: default;

    &:hover {
        background: rgba(255, 255, 255, 0.04);
    }

    &__status {
        flex-shrink: 0;
    }

    &__info {
        flex: 1;
        min-width: 0;
    }

    &__name {
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.85);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &__meta {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        display: flex;
        gap: 8px;
        margin-top: 2px;
    }

    &__instances {
        color: rgba(255, 255, 255, 0.5);
    }

    &__stats {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }

    &__stat {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        display: flex;
        align-items: center;
        gap: 2px;
    }
}

.ov-node-status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &--online {
        background: var(--color-green-5, #52c41a);
        box-shadow: 0 0 6px rgba(82, 196, 26, 0.4);
    }

    &--offline {
        background: rgba(255, 255, 255, 0.2);
    }
}

.ov-empty {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    text-align: center;
    padding: 20px 0;
}

.desktop-overview::-webkit-scrollbar {
    width: 4px;
}

.desktop-overview::-webkit-scrollbar-track {
    background: transparent;
}

.desktop-overview::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
}
</style>
