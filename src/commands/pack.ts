import * as fs from 'fs-extra';
import * as path from 'path';
import ora from 'ora';
import * as chalk from 'chalk';
import { FileProcessor } from '../lib/fileProcessor';
import { loadMetadata, FileType } from '../lib/utils';
import { PackOptions } from '../types';

/**
 * 디렉토리 압축 명령어
 * @param directory - 압축할 디렉토리 경로
 * @param options - 명령어 옵션
 */
export async function packCommand(directory: string, options: PackOptions): Promise<void> {
  const { output, type } = options;
  
  try {
    // 입력 디렉토리 검증
    if (!(await fs.pathExists(directory))) {
      throw new Error(`디렉토리가 존재하지 않습니다: ${directory}`);
    }

    if (!(await fs.stat(directory)).isDirectory()) {
      throw new Error(`디렉토리가 아닙니다: ${directory}`);
    }

    // 파일 처리기 생성
    const processor = new FileProcessor();

    // 추출된 디렉토리인지 확인
    if (!(await processor.isExtractedDirectory(directory))) {
      throw new Error('추출된 디렉토리가 아닙니다. .gitument.json 파일이 없습니다.');
    }

    // 메타데이터 로드
    const metadataPath = path.join(directory, '.gitument.json');
    const metadata = await loadMetadata(metadataPath);
    
    if (!metadata) {
      throw new Error('메타데이터를 로드할 수 없습니다.');
    }

    // 출력 파일 경로 결정
    let outputFile = output;
    if (!outputFile) {
      const originalFile = metadata.originalFile;
      const fileType = type || metadata.fileType;
      const ext = fileType === FileType.HWPX ? '.hwpx' : '.docx';
      outputFile = path.join(path.dirname(directory), originalFile || `packed${ext}`);
    }

    // 출력 파일 존재 확인
    if (await fs.pathExists(outputFile)) {
      throw new Error(`출력 파일이 이미 존재합니다: ${outputFile}`);
    }

    // 스피너 시작
    const spinner = ora('디렉토리를 압축하는 중...').start();

    try {
      // 디렉토리 압축
      const result = await processor.packDirectory(directory, outputFile);
      
      spinner.succeed(chalk.green('디렉토리 압축 완료!'));
      
      console.log(chalk.blue('압축 정보:'));
      console.log(`  원본 디렉토리: ${chalk.cyan(directory)}`);
      console.log(`  출력 파일: ${chalk.cyan(result)}`);
      
      // 파일 통계 표시
      const stats = await fs.stat(result);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  파일 크기: ${chalk.yellow(sizeInMB)} MB`);
      
    } catch (error) {
      spinner.fail(chalk.red('디렉토리 압축 실패'));
      throw error;
    }

  } catch (error) {
    console.error(chalk.red('오류:'), error instanceof Error ? error.message : '알 수 없는 오류');
    process.exit(1);
  }
}
