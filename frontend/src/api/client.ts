/**
 * API client for Parkinson's Disease Voice Screening Platform.
 *
 * Implements typed HTTP communication with the FastAPI backend service
 * mirroring backend Pydantic data models exactly.
 */

export type PredictionType = 'parkinsons_risk_indicated' | 'low_risk_indicated';
export type SourceType = 'recording' | 'upload';

export interface AttentionHeatmapData {
  timestamps_sec: number[];
  attention: number[];
  peak_timestamp_sec?: number;
  [key: string]: unknown;
}

export interface PredictResponse {
  test_record_id: string;
  prediction: PredictionType;
  probability: number;
  threshold_used: number;
  attention: AttentionHeatmapData;
}

export interface ModelPredictionSummary {
  prediction: string;
  probability: number;
  threshold_used: number;
}

export interface EvidenceChunk {
  text: string;
  source_name: string;
  source_url: string | null;
  similarity_score?: number;
}

export interface GeneratedExplanation {
  screening_summary: string;
  explanation: string;
}

export interface Report {
  model_prediction: ModelPredictionSummary;
  retrieved_evidence: EvidenceChunk[];
  generated_explanation: GeneratedExplanation;
  clinical_disclaimer: string;
}

export interface TestRecordListItem {
  id: string;
  created_at: string;
  test_id: string | null;
  source: SourceType;
  prediction: PredictionType;
  probability: number;
  threshold_used: number;
  audio_duration_sec: number;
  model_version: string;
  has_report: boolean;
}

export interface TestRecordResponse extends TestRecordListItem {
  attention_heatmap_json: string | null;
  report_json: string | null;
}

export interface HealthStatus {
  status: string;
  model_artifact_found: boolean;
  timestamp: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`API Error ${status}: ${detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

const API_BASE_URL: string = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000'
).replace(/\/+$/, '');

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errorJson = await response.json();
      detail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      // response body was not JSON
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

/**
 * Submit an audio recording or file upload for acoustic ML screening.
 */
export async function predict(
  file: File | Blob,
  testId?: string,
  source: SourceType = 'recording'
): Promise<PredictResponse> {
  const formData = new FormData();

  let filename = `${source}_sample.wav`;
  if (file instanceof File && file.name) {
    filename = file.name;
  } else if (file.type) {
    if (file.type.includes('webm')) {
      filename = `${source}_sample.webm`;
    } else if (file.type.includes('mp4') || file.type.includes('m4a') || file.type.includes('aac')) {
      filename = `${source}_sample.m4a`;
    } else if (file.type.includes('ogg')) {
      filename = `${source}_sample.ogg`;
    } else if (file.type.includes('mp3') || file.type.includes('mpeg')) {
      filename = `${source}_sample.mp3`;
    } else if (file.type.includes('wav')) {
      filename = `${source}_sample.wav`;
    }
  }

  formData.append('file', file, filename);

  if (testId && testId.trim()) {
    formData.append('test_id', testId.trim());
  }
  formData.append('source', source);

  const response = await fetch(`${API_BASE_URL}/api/v1/predict`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<PredictResponse>(response);
}

/**
 * Generate a clinical decision support report synthesizing prediction with RAG and LLM.
 */
export async function generateReport(testRecordId: string): Promise<Report> {
  const response = await fetch(`${API_BASE_URL}/api/v1/report/${testRecordId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse<Report>(response);
}

/**
 * Retrieve a previously cached clinical decision support report.
 */
export async function getReport(testRecordId: string): Promise<Report> {
  const response = await fetch(`${API_BASE_URL}/api/v1/report/${testRecordId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  return handleResponse<Report>(response);
}

/**
 * Fetch chronological list of historical screening records.
 */
export async function listHistory(
  limit: number = 50,
  offset: number = 0
): Promise<TestRecordListItem[]> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/history?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  return handleResponse<TestRecordListItem[]>(response);
}

/**
 * Fetch complete details for a specific historical screening record.
 */
export async function getHistoryItem(id: string): Promise<TestRecordResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/history/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  return handleResponse<TestRecordResponse>(response);
}

/**
 * Check backend service health status.
 */
export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  return handleResponse<HealthStatus>(response);
}
