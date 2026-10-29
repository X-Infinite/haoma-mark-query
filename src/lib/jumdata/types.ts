export interface JumdataPlatformResult {
  platformKey: string;
  platformName: string;
  isMarked: boolean;
  markType?: string;
  markLabel?: string;
  appealUrl: string;
}

export interface JumdataCallbackPayload {
  jobId: string;
  status: "success" | "failed";
  phoneNumber: string;
  results?: JumdataPlatformResult[];
  errorMessage?: string;
  timestamp: string;
}

export interface SubmitQueryResponse {
  externalJobId: string;
}

export interface JumdataProvider {
  submitMultiPlatformQuery(phoneNumber: string): Promise<SubmitQueryResponse>;
}
