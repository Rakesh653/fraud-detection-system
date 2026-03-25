class CircuitBreaker {
  constructor({ failureThreshold, resetTimeoutMs }) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttemptAt = 0;
  }

  canRequest() {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttemptAt) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failures += 1;

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
    }
  }
}

function joinUrl(baseUrl, path) {
  if (!path) return baseUrl;
  if (baseUrl.endsWith('/') && path.startsWith('/')) {
    return `${baseUrl}${path.slice(1)}`;
  }
  if (!baseUrl.endsWith('/') && !path.startsWith('/')) {
    return `${baseUrl}/${path}`;
  }
  return `${baseUrl}${path}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class HttpAdapter {
  constructor({ name, baseUrl, timeoutMs, retries, backoffMs, circuitBreaker }) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.backoffMs = backoffMs;
    this.breaker = new CircuitBreaker(circuitBreaker);
  }

  async request(method, path, body, headers = {}) {
    if (!this.baseUrl) {
      throw new Error(`${this.name} adapter is missing baseUrl`);
    }

    if (!this.breaker.canRequest()) {
      throw new Error(`${this.name} circuit breaker is open`);
    }

    const url = joinUrl(this.baseUrl, path);
    const maxAttempts = this.retries + 1;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'content-type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`${this.name} ${method} failed with status ${response.status}`);
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        this.breaker.recordSuccess();
        return data;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err;
        this.breaker.recordFailure();

        if (attempt < maxAttempts) {
          await sleep(this.backoffMs * attempt);
        }
      }
    }

    throw lastError;
  }

  post(path, body, headers = {}) {
    return this.request('POST', path, body, headers);
  }
}

module.exports = {
  HttpAdapter
};
