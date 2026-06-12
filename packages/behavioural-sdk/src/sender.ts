import type {
  BehaviourPacket,
  BehaviourIngestionResponse,
  APIResponse,
} from "@sessionguard/shared-types";

const MAX_RETRY_QUEUE = 20;
const RETRY_DELAY_MS = 5_000;

export class BehaviourSender {
  private apiUrl: string;
  private authToken: string;
  private retryQueue: BehaviourPacket[] = [];
  private retrying = false;

  constructor(apiUrl: string, authToken: string) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
  }

  async send(
    packet: BehaviourPacket
  ): Promise<BehaviourIngestionResponse | null> {
    const result = await this.transmit(packet);
    if (!result) {
      this.enqueue(packet);
      this.scheduleRetry();
      return null;
    }
    return result;
  }

  updateToken(token: string): void {
    this.authToken = token;
  }

  get queuedCount(): number {
    return this.retryQueue.length;
  }

  private async transmit(
    packet: BehaviourPacket
  ): Promise<BehaviourIngestionResponse | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/session/behaviour`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.authToken}`,
          },
          body: JSON.stringify(packet),
        }
      );

      if (!response.ok) return null;

      const json: APIResponse<BehaviourIngestionResponse> =
        await response.json();
      return json.data ?? null;
    } catch {
      return null;
    }
  }

  private enqueue(packet: BehaviourPacket): void {
    if (this.retryQueue.length >= MAX_RETRY_QUEUE) {
      this.retryQueue.shift();
    }
    this.retryQueue.push(packet);
  }

  private scheduleRetry(): void {
    if (this.retrying || this.retryQueue.length === 0) return;
    this.retrying = true;
    setTimeout(() => this.drainQueue(), RETRY_DELAY_MS);
  }

  private async drainQueue(): Promise<void> {
    const remaining: BehaviourPacket[] = [];
    for (const pkt of this.retryQueue) {
      const ok = await this.transmit(pkt);
      if (!ok) remaining.push(pkt);
    }
    this.retryQueue = remaining;
    this.retrying = false;
    if (this.retryQueue.length > 0) {
      this.scheduleRetry();
    }
  }
}
