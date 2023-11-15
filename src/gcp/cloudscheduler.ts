import { v1 as CloudScheduler } from '@pulumi/google-native/cloudscheduler';

import { BaseContext, ContextWithGcp } from '@/context';
import { Env } from '@/env';
import { useManagedByDescription } from '@/helpers/description';

interface Context extends BaseContext, ContextWithGcp {}

/**
 * Represents a Cloud Scheduler job.
 */
export interface CloudSchedulerJob {
  /**
   * The name of the job.
   * @example jobs-sync
   */
  name: string;
  /**
   * The schedule for the job in cron format.
   * @example * * * * *
   */
  schedule?: string;
  /**
   * The environment variables to set for the job.
   * @example { env: Env.DEV }
   */
  env?: Env;
  /**
   * The URL to call when the job is triggered.
   * @example /jobs/sync
   */
  url?: string;
}

interface CloudSchedulerJobTargetHeaders {
  [key: string]: string;
}

/**
 * Arguments for the `useCloudScheduler` function.
 */
interface UseCloudSchedulerArgs {
  /**
   * An array of Cloud Scheduler jobs to create or update.
   */
  jobs: Array<CloudSchedulerJob>;
  /**
   * The time zone to use for the Cloud Scheduler jobs. Defaults to UTC.
   */
  timeZone?: string;
  /**
   * An optional authentication JWT token to use when making requests to the Cloud Scheduler API.
   */
  authToken?: string;
  /**
   * The service endpoint for the Cloud Scheduler API.
   * @example app-api.jetstream.studio
   */
  serviceEndpoint: string;
  /**
   * The name of the service using the Cloud Scheduler jobs.
   * @example jetstream-core
   */
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
