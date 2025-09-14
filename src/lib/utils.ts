import * as fs from 'fs-extra';
import * as path from 'path';
import { FileType, FileStats, Metadata } from '../types';

// FileType를 다시 export
export { FileType } from '../types';

/**
 * 파일 확장자로부터 파일 타입을 감지합니다.
 * @param filePath - 파일 경로
 * @returns 파일 타입
 */
export function detectFileTypeByExtension(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.hwpx':
      return FileType.HWPX;
    case '.docx':
      return FileType.DOCX;
    default:
      return FileType.UNKNOWN;
  }
}

/**
 * 파일이 ZIP 기반 형식인지 확인합니다.
 * @param filePath - 파일 경로
 * @returns ZIP 파일 여부
 */
export async function isZipFile(filePath: string): Promise<boolean> {
  try {
    const buffer = await fs.readFile(filePath);
    // ZIP 파일 시그니처 확인 (PK)
    return buffer[0] === 0x50 && buffer[1] === 0x4B;
  } catch (error) {
    return false;
  }
}

/**
 * 파일이 존재하고 읽을 수 있는지 확인합니다.
 * @param filePath - 파일 경로
 * @returns 파일 접근 가능 여부
 */
export async function isAccessibleFile(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 디렉토리가 존재하고 쓰기 가능한지 확인합니다.
 * @param dirPath - 디렉토리 경로
 * @returns 디렉토리 접근 가능 여부
 */
export async function isWritableDirectory(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath, fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 안전한 파일명을 생성합니다 (한글 파일명 지원).
 * @param filename - 원본 파일명
 * @returns 안전한 파일명
 */
export function sanitizeFilename(filename: string): string {
  // 한글과 영문, 숫자, 일부 특수문자만 허용
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * 메타데이터 파일 경로를 생성합니다.
 * @param basePath - 기본 경로
 * @returns 메타데이터 파일 경로
 */
export function getMetadataPath(basePath: string): string {
  return path.join(basePath, '.gitument.json');
}

/**
 * 메타데이터를 저장합니다.
 * @param filePath - 메타데이터 파일 경로
 * @param metadata - 저장할 메타데이터
 */
export async function saveMetadata(filePath: string, metadata: Metadata): Promise<void> {
  await fs.writeJson(filePath, metadata, { spaces: 2 });
}

/**
 * 메타데이터를 읽습니다.
 * @param filePath - 메타데이터 파일 경로
 * @returns 메타데이터 객체
 */
export async function loadMetadata(filePath: string): Promise<Metadata | null> {
  try {
    return await fs.readJson(filePath);
  } catch (error) {
    return null;
  }
}

/**
 * 파일의 통계 정보를 가져옵니다.
 * @param filePath - 파일 경로
 * @returns 파일 통계
 */
export async function getFileStats(filePath: string): Promise<FileStats> {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    mtime: stats.mtime,
    ctime: stats.ctime,
    mode: stats.mode
  };
}

/**
 * 상대 경로를 안전하게 조합합니다.
 * @param base - 기본 경로
 * @param relative - 상대 경로
 * @returns 조합된 경로
 */
export function safePathJoin(base: string, relative: string): string {
  const resolved = path.resolve(base, relative);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
