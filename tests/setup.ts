// Jest 설정 파일
import * as fs from 'fs-extra';
import * as path from 'path';

// 테스트용 임시 디렉토리 설정
const testDir = path.join(__dirname, 'temp');

beforeAll(async () => {
  // 테스트용 임시 디렉토리 생성
  await fs.ensureDir(testDir);
});

afterAll(async () => {
  // 테스트용 임시 디렉토리 정리
  await fs.remove(testDir);
});

beforeEach(async () => {
  // 각 테스트 전에 임시 디렉토리 정리
  await fs.emptyDir(testDir);
});

// 전역 테스트 유틸리티
declare global {
  function getTestDir(): string;
  function createTestFile(filename: string, content?: string): Promise<string>;
}

global.getTestDir = () => testDir;
global.createTestFile = async (filename: string, content = 'test content'): Promise<string> => {
  const filePath = path.join(testDir, filename);
  await fs.writeFile(filePath, content);
  return filePath;
};
