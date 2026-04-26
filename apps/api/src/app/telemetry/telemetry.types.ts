export interface TelemetryRecord {
  backendRequestId: string;
  action: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  success: boolean;
  request: {
    body: unknown;
    params: unknown;
    query: unknown;
  };
  response: unknown;
  user: {
    id: number | null;
    email: string | null;
    name: string | null;
  };
  domain: {
    pollId: string | null;
  };
  metadata: {
    timestamp: string;
    ip: string | null;
    userAgent: string | null;
    requestId: string | null;
    referer: string | null;
  };
}
