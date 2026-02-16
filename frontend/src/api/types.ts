export interface Sample {
  id: string;
  name: string;
  file_path: string;
  duration_seconds: number | null;
  tags: string[];
  color?: string | null;
}

export interface SampleGroup {
  id: string;
  name: string;
  created_at: string;
}

