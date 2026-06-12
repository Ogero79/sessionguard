import type {
  BehaviourEventEntry,
  BehaviourEventType,
  BehaviourPacket,
  FeatureSummary,
  KeystrokeMetrics,
  MouseMetrics,
  NavigationMetrics,
  KeystrokeEvent,
  MouseMoveEvent,
  MouseClickEvent,
  ScrollEvent,
  NavigationEvent,
  FocusChangeEvent,
} from "@sessionguard/shared-types";

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

const TYPING_BURST_GAP_MS = 2000;
const IDLE_THRESHOLD_MS = 3000;

export class PacketBatcher {
  private sessionId: string;
  private events: BehaviourEventEntry[] = [];
  private packetCounter = 0;
  private windowStart = 0;
  private currentRoute = "/";
  private sessionStartTime: number;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.sessionStartTime = Date.now();
    this.windowStart = Date.now();
  }

  addEvent(event: BehaviourEventEntry): void {
    this.events.push(event);
  }

  setCurrentRoute(route: string): void {
    this.currentRoute = route;
  }

  peekLastOfType(type: BehaviourEventType): BehaviourEventEntry | null {
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].type === type) return this.events[i];
    }
    return null;
  }

  flush(): BehaviourPacket | null {
    if (this.events.length === 0) return null;

    this.packetCounter++;
    const now = Date.now();
    const features = this.aggregate();

    const packet: BehaviourPacket = {
      sessionId: this.sessionId,
      packetId: `${this.sessionId}-pkt-${this.packetCounter}`,
      packetSequence: this.packetCounter,
      windowStart: this.windowStart,
      windowEnd: now,
      currentRoute: this.currentRoute,
      features,
    };

    this.events = [];
    this.windowStart = now;
    return packet;
  }

  get pendingCount(): number {
    return this.events.length;
  }

  // ──────────────────── Aggregation logic ────────────────────

  private aggregate(): FeatureSummary {
    return {
      keystroke: this.aggregateKeystroke(),
      mouse: this.aggregateMouse(),
      navigation: this.aggregateNavigation(),
    };
  }

  private aggregateKeystroke(): KeystrokeMetrics {
    const keyEvents = this.events
      .filter((e) => e.type === "keystroke")
      .map((e) => e.data as KeystrokeEvent);

    const holdDurations = keyEvents
      .map((k) => k.duration)
      .filter((d) => d > 0);
    const interKeyIntervals = keyEvents
      .map((k) => k.interval)
      .filter((i) => i > 0);

    // Burst detection: consecutive keystrokes within BURST_GAP
    const burstLengths: number[] = [];
    let currentBurst = 0;
    for (let i = 0; i < keyEvents.length; i++) {
      if (i === 0 || keyEvents[i].interval < TYPING_BURST_GAP_MS) {
        currentBurst++;
      } else {
        if (currentBurst > 1) burstLengths.push(currentBurst);
        currentBurst = 1;
      }
    }
    if (currentBurst > 1) burstLengths.push(currentBurst);

    // Idle gaps: intervals > IDLE_THRESHOLD
    const idleGapsMs = interKeyIntervals.filter(
      (i) => i >= IDLE_THRESHOLD_MS
    );

    return {
      totalKeystrokes: keyEvents.length,
      holdDurations,
      interKeyIntervals,
      burstLengths,
      idleGapsMs,
      avgHoldDurationMs: avg(holdDurations),
      avgInterKeyIntervalMs: avg(interKeyIntervals),
    };
  }

  private aggregateMouse(): MouseMetrics {
    const moves = this.events
      .filter((e) => e.type === "mouse_move")
      .map((e) => e.data as MouseMoveEvent);
    const clicks = this.events
      .filter((e) => e.type === "mouse_click")
      .map((e) => e.data as MouseClickEvent);
    const scrolls = this.events
      .filter((e) => e.type === "scroll")
      .map((e) => e.data as ScrollEvent);

    // Distance & velocity
    let totalDistance = 0;
    const velocities: number[] = [];
    const accelerations: number[] = [];
    for (let i = 1; i < moves.length; i++) {
      const dx = moves[i].x - moves[i - 1].x;
      const dy = moves[i].y - moves[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
      const v = Math.sqrt(
        moves[i].velocityX ** 2 + moves[i].velocityY ** 2
      );
      velocities.push(v);
      if (i >= 2) {
        const prevV = Math.sqrt(
          moves[i - 1].velocityX ** 2 + moves[i - 1].velocityY ** 2
        );
        const dt = moves[i].timestamp - moves[i - 1].timestamp;
        if (dt > 0) accelerations.push(Math.abs(v - prevV) / dt);
      }
    }

    // Click intervals
    const clickIntervals: number[] = [];
    for (let i = 1; i < clicks.length; i++) {
      clickIntervals.push(clicks[i].timestamp - clicks[i - 1].timestamp);
    }

    // Mouse idle pauses (gaps between move events)
    const idlePausesMs: number[] = [];
    for (let i = 1; i < moves.length; i++) {
      const gap = moves[i].timestamp - moves[i - 1].timestamp;
      if (gap >= IDLE_THRESHOLD_MS) idlePausesMs.push(gap);
    }

    return {
      totalMoveEvents: moves.length,
      totalDistance,
      avgVelocity: avg(velocities),
      avgAcceleration: avg(accelerations),
      totalClicks: clicks.length,
      clickIntervals,
      scrollCount: scrolls.length,
      idlePausesMs,
    };
  }

  private aggregateNavigation(): NavigationMetrics {
    const navEvents = this.events
      .filter((e) => e.type === "navigation")
      .map((e) => e.data as NavigationEvent);
    const focusEvents = this.events
      .filter((e) => e.type === "focus_change")
      .map((e) => e.data as FocusChangeEvent);

    // Route dwell times
    const routes: { path: string; dwellMs: number }[] = [];
    for (let i = 0; i < navEvents.length; i++) {
      const endTime =
        i + 1 < navEvents.length
          ? navEvents[i + 1].timestamp
          : Date.now();
      routes.push({
        path: navEvents[i].to,
        dwellMs: endTime - navEvents[i].timestamp,
      });
    }

    // Tab inactive time
    let totalInactiveMs = 0;
    let lastBlurAt: number | null = null;
    for (const fe of focusEvents) {
      if (!fe.focused) {
        lastBlurAt = fe.timestamp;
      } else if (lastBlurAt !== null) {
        totalInactiveMs += fe.timestamp - lastBlurAt;
        lastBlurAt = null;
      }
    }

    return {
      routeChanges: navEvents.length,
      routes,
      tabFocusChanges: focusEvents.length,
      totalInactiveMs,
      totalSessionElapsedMs: Date.now() - this.sessionStartTime,
    };
  }
}
