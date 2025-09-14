import * as fs from 'fs-extra';
import * as path from 'path';
import { FileProcessor } from '../../src/lib/fileProcessor';
// import { FileType } from '../../src/types'; // 사용하지 않음

describe('FileProcessor', () => {
  let processor: FileProcessor;
  let testDir: string;

  beforeEach(() => {
    processor = new FileProcessor();
    testDir = (global as any).getTestDir();
  });

  describe('detectFileType', () => {
    test('지원되지 않는 파일 형식을 감지해야 함', async () => {
      const testFile = await (global as any).createTestFile('test.txt');
      
      await expect(processor.detectFileType(testFile))
        .rejects.toThrow('지원되지 않는 파일 형식입니다');
    });

    test('존재하지 않는 파일에 대해 오류를 발생시켜야 함', async () => {
      const nonExistentFile = path.join(testDir, 'nonexistent.hwpx');
      
      await expect(processor.detectFileType(nonExistentFile))
        .rejects.toThrow('파일에 접근할 수 없습니다');
    });
  });

  describe('isSupportedFile', () => {
    test('HWPX 파일을 지원 파일로 인식해야 함', () => {
      expect(processor.isSupportedFile('test.hwpx')).toBe(true);
    });

    test('DOCX 파일을 지원 파일로 인식해야 함', () => {
      expect(processor.isSupportedFile('test.docx')).toBe(true);
    });

    test('지원되지 않는 파일을 비지원으로 인식해야 함', () => {
      expect(processor.isSupportedFile('test.txt')).toBe(false);
      expect(processor.isSupportedFile('test.pdf')).toBe(false);
    });
  });

  describe('isExtractedDirectory', () => {
    test('메타데이터가 없는 디렉토리를 추출된 디렉토리가 아니라고 판단해야 함', async () => {
      const dir = path.join(testDir, 'testdir');
      await fs.ensureDir(dir);
      
      const result = await processor.isExtractedDirectory(dir);
      expect(result).toBe(false);
    });

    test('메타데이터가 있는 디렉토리를 추출된 디렉토리라고 판단해야 함', async () => {
      const dir = path.join(testDir, 'testdir');
      await fs.ensureDir(dir);
      
      // 메타데이터 파일 생성
      const metadataPath = path.join(dir, '.gitument.json');
      await fs.writeJson(metadataPath, { version: '1.0.0' });
      
      const result = await processor.isExtractedDirectory(dir);
      expect(result).toBe(true);
    });
  });
});
