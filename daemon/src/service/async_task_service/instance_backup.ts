import fs from "fs-extra";
import path from "path";
import { v4 } from "uuid";
import { compress } from "../../common/compress";
import { globalConfiguration } from "../../entity/config";
import Instance from "../../entity/instance/instance";
import { $t } from "../../i18n";
import logger from "../log";
import { AsyncTask, IAsyncTaskJSON, TaskCenter } from "./index";

export class InstanceBackupTask extends AsyncTask {
    public static TYPE = "InstanceBackupTask";

    private instance: Instance;
    private backupPath: string = "";
    private backupFileName: string = "";

    constructor(instance: Instance) {
        super();
        this.instance = instance;
        this.taskId = `${InstanceBackupTask.TYPE}-${this.instance.instanceUuid}-${v4()}`;
        this.type = InstanceBackupTask.TYPE;
    }

    async onStart() {
        try {
            this.instance.println("INFO", $t("TXT_CODE_INSTANCE_BACKUP_START"));

            let customBackupPath = globalConfiguration.config.instanceBackupPath;
            if (!customBackupPath) {
                customBackupPath = path.join(process.cwd(), "data/backups");
            }
            this.backupPath = path.normalize(customBackupPath);
            await fs.ensureDir(this.backupPath);

            if (this.instance.status() !== Instance.STATUS_STOP) {
                this.instance.println("INFO", $t("TXT_CODE_INSTANCE_BACKUP_STOPPING"));
                await this.instance.execPreset("stop");
                let retry = 0;
                while (this.instance.status() !== Instance.STATUS_STOP && retry < 60) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    retry++;
                }
                if (this.instance.status() !== Instance.STATUS_STOP) {
                    throw new Error($t("TXT_CODE_INSTANCE_BACKUP_STOP_TIMEOUT"));
                }
            }

            this.instance.status(Instance.STATUS_BUSY);
            this.instance.println("INFO", $t("TXT_CODE_INSTANCE_BACKUP_COMPRESSING"));

            const timestamp = new Date().getTime();
            this.backupFileName = `${this.instance.config.nickname}_${this.instance.instanceUuid}_${timestamp}.zip`;
            const targetZipPath = path.join(this.backupPath, this.backupFileName);

            const instanceCwd = this.instance.absoluteCwdPath();
            const files = await fs.readdir(instanceCwd);

            await compress(targetZipPath, files, this.instance.config.fileCode, instanceCwd);

            this.instance.println("INFO", $t("TXT_CODE_INSTANCE_BACKUP_SUCCESS", { name: this.backupFileName }));
            logger.info(`Instance backup success: ${this.instance.config.nickname} -> ${targetZipPath}`);

            this.stop();
        } catch (error: any) {
            this.instance.println("ERROR", $t("TXT_CODE_INSTANCE_BACKUP_FAILED", { err: error.message }));
            this.error(error);
        } finally {
            this.instance.status(Instance.STATUS_STOP);
        }
    }

    async onStop() {
        this.instance.print("\n");
    }

    async onError(err: Error) {
        logger.error(`InstanceBackupTask Error: ${err.message}`);
    }

    toObject(): IAsyncTaskJSON {
        return {
            taskId: this.taskId,
            status: this.status(),
            instanceUuid: this.instance.instanceUuid,
            backupFileName: this.backupFileName,
            backupPath: this.backupPath
        };
    }
}

export function createInstanceBackupTask(instance: Instance) {
    const task = new InstanceBackupTask(instance);
    TaskCenter.addTask(task);
    return task;
}
