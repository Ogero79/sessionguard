import type {
  BehaviourEventEntry,
  KeystrokeEvent,
  MouseMoveEvent,
  MouseClickEvent,
  ScrollEvent,
  FocusChangeEvent,
} from "@sessionguard/shared-types";
import { PacketBatcher } from "./batcher";
import { BehaviourSender } from "./sender";

export interface TrackerConfig {
  sessionId: string;
  apiUrl: string;
  authToken: string;
  batchIntervalMs?: number;
  enabled?: boolean;
}

const DEFAULT_BATCH_INTERVAL = 10_000;
const MOUSE_THROTTLE_MS = 50;

export class BehaviouralTracker {
  private config: Required<TrackerConfig>;
  private batcher: PacketBatcher;
  private sender: BehaviourSender;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private lastKeyDownTime = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastMouseTime = 0;
  private lastScrollY = 0;
  private lastScrollTime = 0;

  private handlers: [string, EventListener, EventTarget][] = [];

  constructor(config: TrackerConfig) {
    this.config = {
      batchIntervalMs: DEFAULT_BATCH_INTERVAL,
      enabled: true,
      ...config,
    };
    this.sender = new BehaviourSender(
      this.config.apiUrl,
      this.config.authToken
    );
    this.batcher = new PacketBatcher(this.config.sessionId);
  }

  start(): void {
    if (this.running || !this.config.enabled) return;
    this.running = true;

    this.listen(document, "keydown", this.onKeyDown);
    this.listen(document, "keyup", this.onKeyUp);
    this.listen(document, "mousemove", this.onMouseMove);
    this.listen(document, "click", this.onClick);
    this.listen(document, "scroll", this.onScroll);
    this.listen(window, "focus", this.onFocus);
    this.listen(window, "blur", this.onBlur);

    this.intervalId = setInterval(() => {
      this.flush();
    }, this.config.batchIntervalMs);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const [event, handler, target] of this.handlers) {
      target.removeEventListener(event, handler);
    }
    this.handlers = [];

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.flush();
  }

  async flush(): Promise<void> {
    const packet = this.batcher.flush();
    if (!packet) return;
    await this.sender.send(packet);
  }

  recordNavigation(
    from: string,
    to: string,
    method: "push" | "replace" | "pop"
  ): void {
    this.batcher.setCurrentRoute(to);
    this.batcher.addEvent({
      type: "navigation",
      data: { from, to, method, timestamp: Date.now() },
    });
  }

  setCurrentRoute(route: string): void {
    this.batcher.setCurrentRoute(route);
  }

  updateToken(token: string): void {
    this.sender.updateToken(token);
  }

  // ──────────────────── Private helpers ────────────────────

  private listen(
    target: EventTarget,
    event: string,
    handler: (e: Event) => void
  ): void {
    const bound = handler.bind(this) as EventListener;
    target.addEventListener(event, bound, { passive: true });
    this.handlers.push([event, bound, target]);
  }

  // ──────────────────── Keyboard ────────────────────

  private onKeyDown(e: Event): void {
    const ke = e as KeyboardEvent;
    const now = Date.now();
    const interval =
      this.lastKeyDownTime > 0 ? now - this.lastKeyDownTime : 0;
    this.lastKeyDownTime = now;

    const entry: BehaviourEventEntry = {
      type: "keystroke",
      data: {
        key: ke.key.length === 1 ? "char" : ke.key,
        keyCode: ke.keyCode,
        duration: 0,
        interval,
        timestamp: now,
      } satisfies KeystrokeEvent,
    };
    this.batcher.addEvent(entry);
  }

  private onKeyUp(_e: Event): void {
    const now = Date.now();
    const duration =
      this.lastKeyDownTime > 0 ? now - this.lastKeyDownTime : 0;

    const last = this.batcher.peekLastOfType("keystroke");
    if (last) {
      (last.data as KeystrokeEvent).duration = duration;
    }
  }

  // ──────────────────── Mouse ────────────────────

  private onMouseMove(e: Event): void {
    const me = e as MouseEvent;
    const now = Date.now();

    // Throttle high-frequency moves
    if (now - this.lastMouseTime < MOUSE_THROTTLE_MS) return;

    const dt = this.lastMouseTime > 0 ? now - this.lastMouseTime : 1;
    const velocityX = (me.clientX - this.lastMouseX) / dt;
    const velocityY = (me.clientY - this.lastMouseY) / dt;

    this.lastMouseX = me.clientX;
    this.lastMouseY = me.clientY;
    this.lastMouseTime = now;

    const entry: BehaviourEventEntry = {
      type: "mouse_move",
      data: {
        x: me.clientX,
        y: me.clientY,
        velocityX,
        velocityY,
        timestamp: now,
      } satisfies MouseMoveEvent,
    };
    this.batcher.addEvent(entry);
  }

  private onClick(e: Event): void {
    const me = e as MouseEvent;
    const target = me.target as HTMLElement;
    const entry: BehaviourEventEntry = {
      type: "mouse_click",
      data: {
        x: me.clientX,
        y: me.clientY,
        button: me.button,
        target:
          target.tagName.toLowerCase() +
          (target.id ? `#${target.id}` : ""),
        timestamp: Date.now(),
      } satisfies MouseClickEvent,
    };
    this.batcher.addEvent(entry);
  }

  private onScroll(_e: Event): void {
    const now = Date.now();
    const scrollY = window.scrollY;
    const direction = scrollY > this.lastScrollY ? "down" : "up";
    const dt =
      this.lastScrollTime > 0 ? now - this.lastScrollTime : 1;
    const velocity = Math.abs(scrollY - this.lastScrollY) / dt;
    this.lastScrollY = scrollY;
    this.lastScrollTime = now;

    const entry: BehaviourEventEntry = {
      type: "scroll",
      data: {
        scrollX: window.scrollX,
        scrollY,
        direction,
        velocity,
        timestamp: now,
      } satisfies ScrollEvent,
    };
    this.batcher.addEvent(entry);
  }

  // ──────────────────── Focus / Blur ────────────────────

  private onFocus(_e: Event): void {
    this.batcher.addEvent({
      type: "focus_change",
      data: { focused: true, timestamp: Date.now() } satisfies FocusChangeEvent,
    });
  }

  private onBlur(_e: Event): void {
    this.batcher.addEvent({
      type: "focus_change",
      data: { focused: false, timestamp: Date.now() } satisfies FocusChangeEvent,
    });
  }
}
