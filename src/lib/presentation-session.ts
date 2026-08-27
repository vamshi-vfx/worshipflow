export interface PresentationSession {
  sessionId: string;
  serviceId?: string;
  currentItemId?: string;
  currentSongId?: string;
  currentSlideIndex: number;
  mode: string;
  language: string;
  themeId: string;
  isLive: boolean;
  startedAt: string;
  lastUpdatedAt: string;
}

const STORAGE_KEY = "church-lyrics-presentation-session";
const OFFLINE_QUEUE_KEY = "church-lyrics-presentation-offline-queue";

export interface OfflineQueueItem {
  id: string;
  type: "slide-change" | "black-screen" | "blank-screen" | "theme-change" | "service-item-change";
  payload: any;
  timestamp: string;
}

export function createSessionId(): string {
  return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getSession(): PresentationSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PresentationSession;
  } catch {
    return null;
  }
}

export function saveSession(session: PresentationSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function createSession(partial?: Partial<PresentationSession>): PresentationSession {
  const now = new Date().toISOString();
  return {
    sessionId: createSessionId(),
    currentSlideIndex: 0,
    mode: "smart-fit",
    language: "telugu",
    themeId: "default",
    isLive: false,
    startedAt: now,
    lastUpdatedAt: now,
    ...partial,
  };
}

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineQueueItem[];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item: Omit<OfflineQueueItem, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const queue = getOfflineQueue();
    const newItem: OfflineQueueItem = {
      ...item,
      id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    queue.push(newItem);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
}

export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // ignore storage errors
  }
}
