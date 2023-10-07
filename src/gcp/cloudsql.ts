import { v1 as CloudSqlAdmin } from '@pulumi/google-native/sqladmin';
import {
  BackupRetentionSettingsRetentionUnit,
  SettingsActivationPolicy,
  SettingsAvailabilityType,
  SettingsDataDiskType,
  SettingsPricingPlan,
} from '@pulumi/google-native/types/enums/sqladmin/v1';

import { BaseContext, ContextWithGcp } from '@/context';
import { Env } from '@/env';

export enum CloudSqlPostgresVersion {
  POSTGRES_14 = 'POSTGRES_14',
  POSTGRES_15 = 'POSTGRES_15',
}
export enum CloudSqlTier {
  F1_MICRO = 'db-f1-micro',
  CUSTOM_2_3840 = 'db-custom-2-3840',
}

interface UseCloudSqlArgs {
  name: string;
  userName?: string;
  password: string;
  version?: CloudSqlPostgresVersion;
  tier?: string;
}

interface Context extends BaseContext, ContextWithGcp {}
export const useCloudSql = (args: UseCloudSqlArgs, ctx: Context) => {
  const {
    rn,
    srn,
    env,
  } = ctx;

  const {
    name,
    userName = 'app',
    password,
    version = CloudSqlPostgresVersion.POSTGRES_15,
    tier = env === Env.DEV ? CloudSqlTier.F1_MICRO : CloudSqlTier.CUSTOM_2_3840,
  } = args;

  const dbInstance = new CloudSqlAdmin.Instance(rn(['service', name, 'gcp', 'sql']), {
    name: srn(name),
    databaseVersion: version,
    region: ctx.gcp.region,
    settings: {
      tier,
      databaseFlags: [
        {
          name: 'max_connections',
          value: '200',
        },
      ],
      insightsConfig: {
        queryInsightsEnabled: true,
        queryStringLength: 1024,
        recordApplicationTags: true,
        recordClientAddress: true,
      },
      backupConfiguration: {
        enabled: env === Env.PROD,
        pointInTimeRecoveryEnabled: env === Env.PROD,
        backupRetentionSettings: {
          retentionUnit: BackupRetentionSettingsRetentionUnit.Count,
          retainedBackups: 7,
        },
        startTime: '01:00',
        transactionLogRetentionDays: 7,
      },

      // Disk
      dataDiskType: SettingsDataDiskType.PdSsd,
      dataDiskSizeGb: '10',
      storageAutoResize: true,
      storageAutoResizeLimit: '0',

      // Other
      deletionProtectionEnabled: env === Env.PROD,
      pricingPlan: SettingsPricingPlan.PerUse,
      activationPolicy: SettingsActivationPolicy.Always,
      availabilityType: SettingsAvailabilityType.Zonal,
    },
  }, {
    ignoreChanges: ['etag'],
  });
  new CloudSqlAdmin.Database(rn(['service', name, 'gcp', 'sql', 'db']), {
    name: name.replaceAll('-', '_'),
    instance: dbInstance.name,
  });
  new CloudSqlAdmin.User(rn(['service', name, 'gcp', 'sql', 'user']), {
    instance: dbInstance.name,
    name: userName,
    password,
  });
};
