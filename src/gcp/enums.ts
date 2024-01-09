/**
 * Enum representing the available GCP roles.
 */
export enum GcpRoles {
  /** Full access to all resources and administration functions. */
  EDITOR = 'editor',
  /** Can create and manage service accounts, keys, and IAM policies. */
  IAM_SECURITY_ADMIN = 'iam.securityAdmin',
  /** Can create and manage IAM policies for the project and all resources within the project. */
  PROJECT_IAM_ADMIN = 'resourcemanager.projectIamAdmin',
  /** Can create and manage service accounts. */
  SERVICE_ACCOUNT_ADMIN = 'iam.serviceAccountAdmin',
  /** Can use service accounts to call Google APIs. */
  SERVICE_ACCOUNT_USER = 'iam.serviceAccountUser',
  /** Can manage certificates. */
  CERTIFICATE_MANAGER_EDITOR = 'certificatemanager.editor',
  /** Can create and manage Compute Engine resources. */
  COMPUTE_ADMIN = 'compute.admin',
  /** Can create and manage load balancers. */
  COMPUTE_LOAD_BALANCER_ADMIN = 'compute.loadBalancerAdmin',
  /** Can create and manage networks and subnets. */
  COMPUTE_NETWORK_ADMIN = 'compute.networkAdmin',
  /** Can create and manage Cloud Scheduler jobs. */
  CLOUD_SCHEDULER_ADMIN = 'cloudscheduler.admin',
  /** Can create and manage Cloud Run services. */
  CLOUD_RUN_ADMIN = 'run.admin',
  /** Can deploy new revisions of a Cloud Run service. */
  CLOUD_RUN_DEVELOPER = 'run.developer',
  /** Can view Cloud Run services. */
  CLOUD_RUN_VIEWER = 'run.viewer',
  /** Can read and write Cloud SQL data. */
  CLOUDSQL_CLIENT = 'cloudsql.client',
  /** Can create and manage Cloud Functions. */
  CLOUDFUNCTIONS_DEVELOPER = 'cloudfunctions.developer',
  /** Can read and write objects in a Cloud Storage bucket. */
  STORAGE_OBJECT_ADMIN = 'storage.objectAdmin',
  /** Can read objects in a Cloud Storage bucket. */
  STORAGE_OBJECT_VIEWER = 'storage.objectViewer',
  /** Can create and manage BigQuery resources. */
  BIGQUERY_ADMIN = 'bigquery.admin',
  /** Can write log entries to a Cloud Logging log. */
  LOGGING_LOG_WRITER = 'logging.logWriter',
  /** Can view logs in a Cloud Logging log. */
  LOGGING_VIEWER = 'logging.viewer',
  /** Can view monitoring data for all resources in a project. */
  MONITORING_VIEWER = 'monitoring.viewer',
  /** Can send trace data to Cloud Trace. */
  CLOUDTRACE_AGENT = 'cloudtrace.agent',
  /** Can view error reports in the Error Reporting console. */
  ERROR_REPORTING_USER = 'errorreporting.user',
  /** Can read artifacts from Artifact Registry repositories. */
  ARTIFACT_REGISTRY_READER = 'artifactregistry.reader',
  /** Can read and write artifacts to Artifact Registry repositories. */
  ARTIFACT_REGISTRY_WRITER = 'artifactregistry.writer',
  /** Can edit build configurations and trigger builds. */
  CLOUDBUILD_BUILDS_EDITOR = 'cloudbuild.builds.editor',
  /** Can view data in BigQuery tables. */
  BIGQUERY_DATA_VIEWER = 'bigquery.dataViewer',
  /** Can run BigQuery jobs. */
  BIGQUERY_USER = 'bigquery.user',
  /** Can register and provide the profiling data */
  CLOUDPROFILER_AGENT = 'cloudprofiler.agent',
}

/**
 * Enum representing the available GCP services.
 */
export enum GcpServices {
  /** Compute Engine */
  COMPUTE = 'compute',
  /** Cloud Run */
  RUN = 'run',
  /** Identity and Access Management */
  IAM = 'iam',
  /** Cloud SQL Admin */
  SQL_ADMIN = 'sqladmin',
  /** Certificate Manager */
  CERTIFICATE_MANAGER = 'certificatemanager',
  /** Cloud Resource Manager */
  CLOUDRESOURCE_MANAGER = 'cloudresourcemanager',
  /** Cloud Build */
  CLOUDBUILD = 'cloudbuild',
  /** Cloud Scheduler */
  CLOUDSCHEDULER = 'cloudscheduler',
  /** Artifact Registry */
  ARTIFACT_REGISTRY = 'artifactregistry',
  /** Kubernetes Engine */
  CONTAINER = 'container',
  /** Cloud Speech-to-Text */
  SPEECH = 'speech',
  /** YouTube Data API */
  YOUTUBE = 'youtube',
  /** Google Drive API */
  DRIVE = 'drive',
  /** Cloud Functions */
  CLOUDFUNCTIONS = 'cloudfunctions',
  /** Filestore (NFS) */
  FILE = 'file',
  /** VPC Access */
  VPC_ACCESS = 'vpcaccess',
  /** Cloud Profiler */
  CLOUD_PROFILER = 'cloudprofiler',
}
