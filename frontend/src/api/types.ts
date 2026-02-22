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

export interface SavedSequenceItem {
  sampleId: string;
}

export interface Sequence {
  id: string;
  group_id: string;
  name: string;
  sequence_data: SavedSequenceItem[];
  created_at: string;
}

