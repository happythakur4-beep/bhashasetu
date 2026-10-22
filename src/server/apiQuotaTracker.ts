export interface EndpointQuotaStats {
  requests: number;
  errors: number;
  quota429s: number;
  lastUsed: string | null;
  model: string;
}

export interface ApiQuotaSummary {
  hasGeminiKey: boolean;
  totalRequests: number;
  requestsToday: number;
  lastResetDate: string;
  quotaStatus: 'normal' | 'warning' | 'quota_exceeded';
  quota429Count: number;
  lastQuotaExceededTime: string | null;
  offlineFallbackCount: number;
  estimatedDailyLimit: number;
  estimatedRpmLimit: number;
  consumptionPercent: number;
  resetWindow: string;
  nextResetIso: string;
  endpoints: {
    translate: EndpointQuotaStats;
    transcribe: EndpointQuotaStats;
    tts: EndpointQuotaStats;
    live: EndpointQuotaStats;
  };
}

class ApiQuotaTracker {
  private totalRequests = 0;
  private requestsToday = 0;
  private lastResetDate = '';
  private quotaStatus: 'normal' | 'warning' | 'quota_exceeded' = 'normal';
  private quota429Count = 0;
  private lastQuotaExceededTime: string | null = null;
  private offlineFallbackCount = 0;

  private endpoints: Record<'translate' | 'transcribe' | 'tts' | 'live', EndpointQuotaStats> = {
    translate: { requests: 0, errors: 0, quota429s: 0, lastUsed: null, model: 'gemini-3.8-flash' },
    transcribe: { requests: 0, errors: 0, quota429s: 0, lastUsed: null, model: 'gemini-3.5-transcribe' },
    tts: { requests: 0, errors: 0, quota429s: 0, lastUsed: null, model: 'gemini-3.8-flash-lite-tts' },
    live: { requests: 0, errors: 0, quota429s: 0, lastUsed: null, model: 'gemini-3.8-live' },
  };

  constructor() {
    this.checkDailyReset();
  }

  private getTodayUtcString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private checkDailyReset() {
    const today = this.getTodayUtcString();
    if (this.lastResetDate !== today) {
      this.lastResetDate = today;
      this.requestsToday = 0;
      // Reset quota status to normal on new day unless 429 occurred today
      if (this.lastQuotaExceededTime && !this.lastQuotaExceededTime.startsWith(today)) {
        this.quotaStatus = 'normal';
      }
    }
  }

  public setModels(models: { translate?: string; transcribe?: string; tts?: string; live?: string }) {
    if (models.translate) this.endpoints.translate.model = models.translate;
    if (models.transcribe) this.endpoints.transcribe.model = models.transcribe;
    if (models.tts) this.endpoints.tts.model = models.tts;
    if (models.live) this.endpoints.live.model = models.live;
  }

  public recordRequest(
    endpoint: 'translate' | 'transcribe' | 'tts' | 'live',
    success: boolean,
    isQuota429: boolean = false
  ) {
    this.checkDailyReset();
    this.totalRequests++;
    this.requestsToday++;

    const ep = this.endpoints[endpoint];
    if (ep) {
      ep.requests++;
      ep.lastUsed = new Date().toISOString();
      if (!success) {
        ep.errors++;
      }
      if (isQuota429) {
        ep.quota429s++;
        this.quota429Count++;
        this.quotaStatus = 'quota_exceeded';
        this.lastQuotaExceededTime = new Date().toISOString();
      }
    }

    if (!isQuota429 && this.quotaStatus !== 'quota_exceeded') {
      const consumption = (this.requestsToday / 1500) * 100;
      if (consumption >= 80) {
        this.quotaStatus = 'warning';
      }
    }
  }

  public recordOfflineFallback() {
    this.offlineFallbackCount++;
  }

  public getSummary(hasApiKey: boolean = true): ApiQuotaSummary {
    this.checkDailyReset();
    const estimatedDailyLimit = 1500; // Gemini Flash standard free tier RPD
    const estimatedRpmLimit = 15;     // Free tier RPM
    const consumptionPercent = Math.min(100, Math.round((this.requestsToday / estimatedDailyLimit) * 1000) / 10);

    // Calculate next UTC midnight
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

    return {
      hasGeminiKey: hasApiKey,
      totalRequests: this.totalRequests,
      requestsToday: this.requestsToday,
      lastResetDate: this.lastResetDate,
      quotaStatus: this.quotaStatus,
      quota429Count: this.quota429Count,
      lastQuotaExceededTime: this.lastQuotaExceededTime,
      offlineFallbackCount: this.offlineFallbackCount,
      estimatedDailyLimit,
      estimatedRpmLimit,
      consumptionPercent,
      resetWindow: 'Daily 24h cycle (00:00 UTC)',
      nextResetIso: nextMidnight.toISOString(),
      endpoints: {
        translate: { ...this.endpoints.translate },
        transcribe: { ...this.endpoints.transcribe },
        tts: { ...this.endpoints.tts },
        live: { ...this.endpoints.live },
      },
    };
  }
}

export const apiQuotaTracker = new ApiQuotaTracker();
