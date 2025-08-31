import type { AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * Interface for queued request
 */
interface QueuedRequest {
  config: AxiosRequestConfig
  resolve: (value: AxiosResponse) => void
  reject: (error: any) => void
}

/**
 * Request queue service for handling requests during token refresh
 */
class RequestQueueService {
  private queue: QueuedRequest[] = []
  private isRefreshing = false

  /**
   * Add request to queue
   * @param config Axios request config
   * @returns Promise that resolves when request is retried
   */
  enqueue(config: AxiosRequestConfig): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ config, resolve, reject })
    })
  }

  /**
   * Process all queued requests with new token
   * @param axiosInstance Axios instance to use for requests
   */
  async processQueue(axiosInstance: any): Promise<void> {
    const queuedRequests = [...this.queue]
    this.queue = []

    // Process all queued requests concurrently
    const promises = queuedRequests.map(async ({ config, resolve, reject }) => {
      try {
        const response = await axiosInstance(config)
        resolve(response)
      } catch (error) {
        reject(error)
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * Reject all queued requests (when refresh fails)
   * @param error Error to reject with
   */
  rejectQueue(error: any): void {
    const queuedRequests = [...this.queue]
    this.queue = []

    queuedRequests.forEach(({ reject }) => {
      reject(error)
    })
  }

  /**
   * Check if refresh is currently in progress
   */
  get isRefreshInProgress(): boolean {
    return this.isRefreshing
  }

  /**
   * Set refresh status
   */
  setRefreshStatus(status: boolean): void {
    this.isRefreshing = status
  }

  /**
   * Get current queue size
   */
  get queueSize(): number {
    return this.queue.length
  }

  /**
   * Clear all queued requests without processing
   */
  clearQueue(): void {
    this.queue = []
    this.isRefreshing = false
  }
}

// Create singleton instance
export const requestQueueService = new RequestQueueService()
