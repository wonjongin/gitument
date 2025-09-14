import { 
  detectFileTypeByExtension, 
  FileType, 
  sanitizeFilename,
  getMetadataPath 
} from '../../src/lib/utils';

describe('Utils', () => {
  describe('detectFileTypeByExtension', () => {
    test('HWPX 파일 확장자를 올바르게 감지해야 함', () => {
      expect(detectFileTypeByExtension('test.hwpx')).toBe(FileType.HWPX);
      expect(detectFileTypeByExtension('test.HWPX')).toBe(FileType.HWPX);
    });

    test('DOCX 파일 확장자를 올바르게 감지해야 함', () => {
      expect(detectFileTypeByExtension('test.docx')).toBe(FileType.DOCX);
      expect(detectFileTypeByExtension('test.DOCX')).toBe(FileType.DOCX);
    });

    test('지원되지 않는 확장자를 UNKNOWN으로 반환해야 함', () => {
      expect(detectFileTypeByExtension('test.txt')).toBe(FileType.UNKNOWN);
      expect(detectFileTypeByExtension('test.pdf')).toBe(FileType.UNKNOWN);
      expect(detectFileTypeByExtension('test')).toBe(FileType.UNKNOWN);
    });
  });

  describe('sanitizeFilename', () => {
    test('안전하지 않은 문자를 언더스코어로 대체해야 함', () => {
      expect(sanitizeFilename('test<file>.txt')).toBe('test_file_.txt');
      expect(sanitizeFilename('test:file.txt')).toBe('test_file.txt');
      expect(sanitizeFilename('test/file.txt')).toBe('test_file.txt');
    });

    test('한글 파일명을 그대로 유지해야 함', () => {
      expect(sanitizeFilename('한글파일.hwpx')).toBe('한글파일.hwpx');
    });

    test('정상적인 파일명은 그대로 유지해야 함', () => {
      expect(sanitizeFilename('normal-file.txt')).toBe('normal-file.txt');
    });
  });

  describe('getMetadataPath', () => {
    test('메타데이터 파일 경로를 올바르게 생성해야 함', () => {
      const basePath = '/test/path';
      const expected = '/test/path/.gitument.json';
      expect(getMetadataPath(basePath)).toBe(expected);
    });
  });
});
