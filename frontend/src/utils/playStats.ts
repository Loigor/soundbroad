// Play statistics manager using localStorage

interface PlayStats {
  count: number;
  timestamps: number[];
}

const STORAGE_KEY = 'soundbroad_play_stats';

export function getPlayStats(sampleId: string): PlayStats {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const stats = data ? JSON.parse(data) : {};
    return stats[sampleId] || { count: 0, timestamps: [] };
  } catch (error) {
    console.error('Failed to load play stats:', error);
    return { count: 0, timestamps: [] };
  }
}

export function recordPlay(sampleId: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const stats = data ? JSON.parse(data) : {};
    
    if (!stats[sampleId]) {
      stats[sampleId] = { count: 0, timestamps: [] };
    }
    
    stats[sampleId].count += 1;
    stats[sampleId].timestamps.push(Date.now());
    
    // Keep only last 100 timestamps to prevent storage bloat
    if (stats[sampleId].timestamps.length > 100) {
      stats[sampleId].timestamps = stats[sampleId].timestamps.slice(-100);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to record play:', error);
  }
}

export function clearAllPlayStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear play stats:', error);
  }
}

export function clearPlayStats(sampleId: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const stats = data ? JSON.parse(data) : {};
    delete stats[sampleId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to clear play stats:', error);
  }
}

export function getLastPlayedTime(sampleId: string): number | null {
  const stats = getPlayStats(sampleId);
  if (stats.timestamps.length === 0) return null;
  return stats.timestamps[stats.timestamps.length - 1];
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) {
    return `${diffSecs}s ago`;
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  }
}
