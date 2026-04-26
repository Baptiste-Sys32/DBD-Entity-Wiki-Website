const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET'
]);

class FetchRequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'FetchRequestError';
    this.kind = details.kind || 'unknown';
    this.url = details.url || '';
    this.method = details.method || 'GET';
    this.status = details.status || null;
    this.code = details.code || null;
    this.attempt = details.attempt || 0;
    this.maxAttempts = details.maxAttempts || 0;
    this.retryable = Boolean(details.retryable);
    this.cause = details.cause || null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffDelayMs(attempt, baseDelayMs, maxDelayMs) {
  const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * Math.max(50, Math.floor(baseDelayMs * 0.5)));
  return exponential + jitter;
}

function getErrorCode(error) {
  const code = error?.code || error?.cause?.code || '';
  return String(code || '').toUpperCase();
}

function classifyNetworkError(error, context) {
  const code = getErrorCode(error);
  const timedOut = Boolean(context.timedOut) || error?.name === 'AbortError';

  if (timedOut) {
    return new FetchRequestError(
      `Timeout after ${context.timeoutMs}ms while requesting ${context.url}`,
      {
        kind: 'timeout',
        url: context.url,
        method: context.method,
        code: code || 'TIMEOUT',
        attempt: context.attempt,
        maxAttempts: context.maxAttempts,
        retryable: true,
        cause: error
      }
    );
  }

  const retryable = RETRYABLE_NETWORK_CODES.has(code);
  return new FetchRequestError(
    `Network error while requesting ${context.url}: ${error?.message || 'unknown error'}`,
    {
      kind: 'network',
      url: context.url,
      method: context.method,
      code: code || null,
      attempt: context.attempt,
      maxAttempts: context.maxAttempts,
      retryable,
      cause: error
    }
  );
}

function classifyHttpStatusError(response, context) {
  const retryable = RETRYABLE_HTTP_STATUSES.has(Number(response.status));
  return new FetchRequestError(
    `${context.url} returned HTTP ${response.status}`,
    {
      kind: 'http-status',
      url: context.url,
      method: context.method,
      status: response.status,
      attempt: context.attempt,
      maxAttempts: context.maxAttempts,
      retryable
    }
  );
}

function mergeHeaders(defaultHeaders, userHeaders) {
  const merged = {
    ...(defaultHeaders || {}),
    ...(userHeaders || {})
  };

  Object.keys(merged).forEach((key) => {
    if (typeof merged[key] === 'undefined') {
      delete merged[key];
    }
  });

  return merged;
}

async function fetchWithRetry(url, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const retries = Math.max(0, Number.isFinite(Number(options.retries)) ? Number(options.retries) : 2);
  const maxAttempts = retries + 1;
  const timeoutMs = Math.max(1000, Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 12000);
  const baseDelayMs = Math.max(50, Number.isFinite(Number(options.baseDelayMs)) ? Number(options.baseDelayMs) : 350);
  const maxDelayMs = Math.max(baseDelayMs, Number.isFinite(Number(options.maxDelayMs)) ? Number(options.maxDelayMs) : 4000);

  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;

    const controller = new AbortController();
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: mergeHeaders(options.defaultHeaders, options.headers),
        body: options.body,
        signal: controller.signal,
        redirect: options.redirect || 'follow'
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        throw classifyHttpStatusError(response, {
          url,
          method,
          attempt,
          maxAttempts
        });
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutHandle);

      const classified = error instanceof FetchRequestError
        ? error
        : classifyNetworkError(error, {
            timedOut,
            timeoutMs,
            url,
            method,
            attempt,
            maxAttempts
          });

      lastError = classified;
      if (!classified.retryable || attempt >= maxAttempts) {
        throw classified;
      }

      const delayMs = computeBackoffDelayMs(attempt, baseDelayMs, maxDelayMs);
      await sleep(delayMs);
    }
  }

  throw lastError || new FetchRequestError(`Unknown request failure for ${url}`, {
    kind: 'unknown',
    url,
    method,
    attempt,
    maxAttempts,
    retryable: false
  });
}

async function fetchTextWithRetry(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  return response.text();
}

async function fetchBinaryWithRetry(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchJsonWithRetry(url, options = {}) {
  const response = await fetchWithRetry(url, {
    ...options,
    defaultHeaders: mergeHeaders(
      {
        accept: 'application/json,text/plain,*/*'
      },
      options.defaultHeaders
    )
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new FetchRequestError(`Invalid JSON received from ${url}`, {
      kind: 'parse',
      url,
      method: String(options.method || 'GET').toUpperCase(),
      retryable: false,
      cause: error
    });
  }
}

function formatFetchError(error) {
  if (!(error instanceof FetchRequestError)) {
    return error?.message || String(error);
  }

  const bits = [
    `kind=${error.kind}`,
    `url=${error.url || 'unknown'}`,
    `attempt=${error.attempt || 0}/${error.maxAttempts || 0}`
  ];

  if (error.status) bits.push(`status=${error.status}`);
  if (error.code) bits.push(`code=${error.code}`);
  bits.push(`retryable=${error.retryable ? 'yes' : 'no'}`);

  return `${error.message} (${bits.join(' ')})`;
}

module.exports = {
  FetchRequestError,
  fetchWithRetry,
  fetchTextWithRetry,
  fetchJsonWithRetry,
  fetchBinaryWithRetry,
  formatFetchError
};
