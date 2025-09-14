import AdmZip from 'adm-zip';
import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  FileType, 
  detectFileTypeByExtension, 
  isZipFile, 
  isAccessibleFile,
  // isWritableDirectory, // 사용하지 않음
  // sanitizeFilename, // 사용하지 않음
  getMetadataPath,
  saveMetadata,
  loadMetadata,
  getFileStats,
  safePathJoin
} from './utils';
import { Metadata } from '../types';

/**
 * HWPX/DOCX 파일 처리 클래스
 */
export class FileProcessor {
  private readonly supportedTypes: FileType[] = [FileType.HWPX, FileType.DOCX];

  /**
   * 파일 타입을 감지합니다.
   * @param filePath - 파일 경로
   * @returns 파일 타입
   */
  async detectFileType(filePath: string): Promise<FileType> {
    // 파일 존재 및 접근 가능성 확인
    if (!(await isAccessibleFile(filePath))) {
      throw new Error(`파일에 접근할 수 없습니다: ${filePath}`);
    }

    // ZIP 파일인지 확인
    if (!(await isZipFile(filePath))) {
      throw new Error(`지원되지 않는 파일 형식입니다: ${filePath}`);
    }

    // 확장자로 파일 타입 감지
    const fileType = detectFileTypeByExtension(filePath);
    if (fileType === FileType.UNKNOWN) {
      throw new Error(`지원되지 않는 파일 확장자입니다: ${filePath}`);
    }

    // 내부 구조 검증
    await this.validateFileStructure(filePath, fileType);

    return fileType;
  }

  /**
   * 파일 구조를 검증합니다.
   * @param filePath - 파일 경로
   * @param fileType - 파일 타입
   */
  private async validateFileStructure(filePath: string, fileType: FileType): Promise<void> {
    try {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();

      // 파일 구조 검증

      if (fileType === FileType.HWPX) {
        // HWPX 필수 파일 확인 (실제 구조에 맞게)
        const requiredFiles = ['META-INF/manifest.xml'];
        const contentFiles = ['Contents/content.hpf', 'content.hpf', 'Contents/content.xml', 'content.xml'];
        
        // 필수 파일 확인
        for (const requiredFile of requiredFiles) {
          if (!entries.find((entry: any) => entry.entryName === requiredFile)) {
            throw new Error(`HWPX 파일에 필수 파일이 없습니다: ${requiredFile}`);
          }
        }
        
        // 콘텐츠 파일 확인 (Contents/ 디렉토리 내부도 확인)
        const hasContentFile = contentFiles.some(file => 
          entries.find((entry: any) => entry.entryName === file)
        );
        
        if (!hasContentFile) {
          console.log(`경고: HWPX 파일에 콘텐츠 파일이 없습니다. 계속 진행합니다.`);
        }
      } else if (fileType === FileType.DOCX) {
        // DOCX 필수 파일 확인
        const requiredFiles = ['[Content_Types].xml', 'word/document.xml'];
        for (const requiredFile of requiredFiles) {
          if (!entries.find((entry: any) => entry.entryName === requiredFile)) {
            throw new Error(`DOCX 파일에 필수 파일이 없습니다: ${requiredFile}`);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('필수 파일이 없습니다')) {
        throw error;
      }
      throw new Error(`파일 구조 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * HWPX/DOCX 파일을 디렉토리로 추출합니다.
   * @param filePath - 추출할 파일 경로
   * @param outputDir - 출력 디렉토리 경로
   * @returns 추출된 디렉토리 경로
   */
  async extractFile(filePath: string, outputDir: string): Promise<string> {
    // 입력 검증
    if (!(await isAccessibleFile(filePath))) {
      throw new Error(`파일에 접근할 수 없습니다: ${filePath}`);
    }

    // 출력 디렉토리 생성
    await fs.ensureDir(outputDir);

    // 파일 타입 감지
    const fileType = await this.detectFileType(filePath);
    
    // ZIP 파일 추출
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    // 각 엔트리를 안전하게 추출
    for (const entry of entries) {
      if (entry.isDirectory) {
        const dirPath = safePathJoin(outputDir, entry.entryName);
        await fs.ensureDir(dirPath);
      } else {
        const filePath = safePathJoin(outputDir, entry.entryName);
        const dirPath = path.dirname(filePath);
        await fs.ensureDir(dirPath);
        
        const data = entry.getData();
        await fs.writeFile(filePath, data);
      }
    }

    // 메타데이터 저장
    const metadata: Metadata = {
      originalFile: path.basename(filePath),
      fileType: fileType,
      extractedAt: new Date().toISOString(),
      originalStats: await getFileStats(filePath),
      version: '1.0.0'
    };

    const metadataPath = getMetadataPath(outputDir);
    await saveMetadata(metadataPath, metadata);

    return outputDir;
  }

  /**
   * 디렉토리를 HWPX/DOCX 파일로 압축합니다.
   * @param dirPath - 압축할 디렉토리 경로
   * @param outputFile - 출력 파일 경로
   * @returns 생성된 파일 경로
   */
  async packDirectory(dirPath: string, outputFile: string): Promise<string> {
    // 입력 검증
    if (!(await fs.pathExists(dirPath))) {
      throw new Error(`디렉토리가 존재하지 않습니다: ${dirPath}`);
    }

    // 메타데이터 로드
    const metadataPath = getMetadataPath(dirPath);
    const metadata = await loadMetadata(metadataPath);
    
    if (!metadata) {
      throw new Error(`메타데이터 파일을 찾을 수 없습니다: ${metadataPath}`);
    }

    // 출력 디렉토리 생성
    await fs.ensureDir(path.dirname(outputFile));

    // ZIP 파일 생성
    const zip = new AdmZip();
    
    // 디렉토리 내용을 재귀적으로 추가
    await this.addDirectoryToZip(zip, dirPath, '');

    // ZIP 파일 저장
    const zipBuffer = zip.toBuffer();
    await fs.writeFile(outputFile, zipBuffer);

    // 파일 무결성 검증
    await this.validateFile(outputFile);

    return outputFile;
  }

  /**
   * 디렉토리를 ZIP에 재귀적으로 추가합니다.
   * @param zip - ZIP 객체
   * @param dirPath - 디렉토리 경로
   * @param zipPath - ZIP 내부 경로
   */
  private async addDirectoryToZip(zip: AdmZip, dirPath: string, zipPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath);
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const relativePath = path.join(zipPath, entry);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        // 메타데이터 파일은 제외
        if (entry === '.gitument.json') {
          continue;
        }
        await this.addDirectoryToZip(zip, fullPath, relativePath);
      } else {
        const data = await fs.readFile(fullPath);
        zip.addFile(relativePath, data);
      }
    }
  }

  /**
   * 파일 무결성을 검증합니다.
   * @param filePath - 검증할 파일 경로
   * @returns 검증 성공 여부
   */
  async validateFile(filePath: string): Promise<boolean> {
    try {
      // 파일 존재 확인
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
      }

      // ZIP 파일인지 확인
      if (!(await isZipFile(filePath))) {
        throw new Error(`유효하지 않은 ZIP 파일입니다: ${filePath}`);
      }

      // ZIP 파일 열기 및 검증
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();

      if (entries.length === 0) {
        throw new Error(`빈 ZIP 파일입니다: ${filePath}`);
      }

      // 각 엔트리 검증
      for (const entry of entries) {
        try {
          entry.getData();
        } catch (error) {
          throw new Error(`손상된 ZIP 엔트리: ${entry.entryName}`);
        }
      }

      return true;
    } catch (error) {
      throw new Error(`파일 검증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 지원되는 파일 타입인지 확인합니다.
   * @param filePath - 파일 경로
   * @returns 지원 여부
   */
  isSupportedFile(filePath: string): boolean {
    const fileType = detectFileTypeByExtension(filePath);
    return this.supportedTypes.includes(fileType);
  }

  /**
   * 추출된 디렉토리인지 확인합니다.
   * @param dirPath - 디렉토리 경로
   * @returns 추출된 디렉토리 여부
   */
  async isExtractedDirectory(dirPath: string): Promise<boolean> {
    const metadataPath = getMetadataPath(dirPath);
    return await fs.pathExists(metadataPath);
  }
}
