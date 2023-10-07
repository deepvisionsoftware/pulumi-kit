import { v1 as CloudScheduler } from '@pulumi/google-native/cloudscheduler';

import { BaseContext, ContextWithGcp } from '@/context';
import { Env } from '@/env';
import { useManagedByDescription } from '@/helpers/description';

interface Context extends BaseContext, ContextWithGcp {}

export interface CloudSchedulerJob {
  name: string;
  schedule?: string;
  env?: Env;
  url?: string;
}
interface CloudSchedulerJobTargetHeaders {
  [key: string]: string;
}

interface UseCloudSchedulerArgs {
  jobs: Array<CloudSchedulerJob>;
  timeZone?: string;
  authToken?: string;
  serviceEndpoint: string;
  serviceName: string;
}

export const useCloudScheduler = (args: UseCloudSchedulerArgs, ctx: Context) => {
  const {
    jobs: scheduledJobs,
    serviceEndpoint,
    serviceName,
    timeZone = 'America/New_York',
    authToken = null,
  } = args;
  const {
    env,
    rn,
    gcp: { project, region },
  } = ctx;

  const jobTargetHeaders: CloudSchedulerJobTargetHeaders = {
  };
  if (authToken) {
    jobTargetHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  for (const scheduledJob of scheduledJobs) {
    if (scheduledJob.env && env !== scheduledJob.env) {
      continue;
    }

    new CloudScheduler.Job(rn(['service', serviceName, 'gcp', 'scheduled', scheduledJob.name]), {
      name: `projects/${project}/locations/${region}/jobs/${scheduledJob.name}`,
      timeZone,
      schedule: scheduledJob.schedule ?? '* * * * *',
      description: useManagedByDescription(ctx),
      httpTarget: {
        httpMethod: 'POST',
        uri: scheduledJob.url ? `https://${serviceEndpoint}${scheduledJob.url}` : `https://${serviceEndpoint}/workers/${scheduledJob.name}`,
        headers: jobTargetHeaders,
      },
    });
  }
};

interface UseScheduledCloudRunJobArgs {
  jobs: Array<CloudSchedulerJob>;
  timeZone?: string;
  serviceName: string;
  serviceAccountEmail: string;
}

export const useScheduledCloudRunJobs = (args: UseScheduledCloudRunJobArgs, ctx: Context) => {
  const {
    jobs: scheduledJobs,
    timeZone = 'America/New_York',
    serviceName,
    serviceAccountEmail,
  } = args;

  const {
    env,
    rn,
    gcp: { project, region },
  } = ctx;

  for (const scheduledJob of scheduledJobs) {
    if (scheduledJob.env && env !== scheduledJob.env) {
      continue;
    }
    const jobName = `${serviceName}-${scheduledJob.name}`;

    new CloudScheduler.Job(rn(['service', serviceName, 'gcp', 'scheduled', scheduledJob.name]), {
      name: `projects/${project}/locations/${region}/jobs/${jobName}`,
      timeZone,
      schedule: scheduledJob.schedule ?? '* * * * *',
      description: useManagedByDescription(ctx),
      httpTarget: {
        httpMethod: 'POST',
        uri: `https://${region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${project}/jobs/${jobName}:run`,
        oauthToken: {
          serviceAccountEmail,
        },
      },
    });
  }
};
