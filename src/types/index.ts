export enum FileType {
  HWPX = 'hwpx',
  DOCX = 'docx',
  UNKNOWN = 'unknown'
}

export interface FileStats {
  size: number;
  mtime: Date;
  ctime: Date;
  mode: number;
}

export interface Metadata {
  originalFile: string;
  fileType: FileType;
  extractedAt: string;
  originalStats: FileStats;
  version: string;
}

export interface GitumentConfig {
  version: string;
  extractDirPattern: string;
  autoCleanup: boolean;
  supportedTypes: string[];
}

export interface ExtractOptions {
  output?: string;
  force?: boolean;
}

export interface PackOptions {
  output?: string;
  type?: FileType;
}

export interface InitOptions {
  force?: boolean;
}

export interface StatusOptions {
  verbose?: boolean;
}

export interface GitHookOptions {
  force?: boolean;
}
