import { t } from "@/lang/i18n";
import type { PanelFrontendPluginContext } from "@/plugin";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { AreaChartOutlined, DashboardOutlined, FileTextOutlined } from "@ant-design/icons-vue";
import DesktopOverview from "./desktop/DesktopOverview.vue";
import DesktopInstanceOperationLog from "./desktop/InstanceOperationLog.vue";
import InstanceLogHost from "./InstanceLogHost.vue";
import { closeInstanceLog } from "./instanceLog";
import { localeMessages } from "./i18n";
import InstanceOperationLogAction from "./normal/InstanceOperationLogAction.vue";
import OverviewPage from "./normal/OverviewPage.vue";

const ROLE_ADMIN = 10;

export const inject = ["console", "i18n", "routes", "ui", "desktop", "actions"];

export function apply(ctx: PanelFrontendPluginContext) {
  ctx.i18n.define(localeMessages);

  ctx.ui.globalComponent(InstanceLogHost);
  ctx.effect(() => () => closeInstanceLog());

  ctx.actions.instance({
    id: "operation-log",
    title: () => t("TXT_CODE_f6a33629"),
    icon: FileTextOutlined,
    normalComponent: InstanceOperationLogAction,
    desktopComponent: DesktopInstanceOperationLog,
    condition: ({ instanceId, daemonId }) => Boolean(instanceId && daemonId),
    desktopInitialWidth: 680,
    desktopInitialHeight: 500
  });

  ctx.routes.add({
    path: "/overview",
    name: t("TXT_CODE_84fbe277"),
    component: OverviewPage,
    meta: {
      mainMenu: true,
      permission: ROLE_ADMIN,
      icon: AreaChartOutlined
    }
  });

  ctx.desktop.app({
    id: "overview",
    label: () => t("TXT_CODE_84fbe277"),
    icon: DashboardOutlined,
    color: "#52c41a",
    route: "/overview",
    component: DesktopOverview,
    condition: () => useAppStateStore().isAdmin.value,
    initialWidth: 1000,
    initialHeight: 640
  });
}
