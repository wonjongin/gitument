import * as fs from 'fs-extra';
import * as path from 'path';
import ora from 'ora';
import * as chalk from 'chalk';
import { FileProcessor } from '../lib/fileProcessor';
import { detectFileTypeByExtension, FileType } from '../lib/utils';
import { ExtractOptions } from '../types';

/**
 * 파일 추출 명령어
 * @param file - 추출할 파일 경로
 * @param options - 명령어 옵션
 */
export async function extractCommand(file: string, options: ExtractOptions): Promise<void> {
  const { output, force } = options;
  
  try {
    // 입력 파일 검증
    if (!(await fs.pathExists(file))) {
      throw new Error(`파일이 존재하지 않습니다: ${file}`);
    }

    // 출력 디렉토리 결정
    let outputDir = output;
    if (!outputDir) {
      const fileType = detectFileTypeByExtension(file);
      if (fileType === FileType.UNKNOWN) {
        throw new Error('지원되지 않는 파일 형식입니다. HWPX 또는 DOCX 파일을 사용하세요.');
      }
      const baseName = path.basename(file, path.extname(file));
      outputDir = path.join(path.dirname(file), `${baseName}_extracted`);
    }

    // 출력 디렉토리 존재 확인
    if (await fs.pathExists(outputDir)) {
      if (!force) {
        throw new Error(`출력 디렉토리가 이미 존재합니다: ${outputDir}\n--force 옵션을 사용하여 덮어쓰세요.`);
      }
      await fs.remove(outputDir);
    }

    // 파일 처리기 생성
    const processor = new FileProcessor();

    // 스피너 시작
    const spinner = ora('파일을 추출하는 중...').start();

    try {
      // 파일 추출
      const result = await processor.extractFile(file, outputDir);
      
      spinner.succeed(chalk.green('파일 추출 완료!'));
      
      console.log(chalk.blue('추출 정보:'));
      console.log(`  원본 파일: ${chalk.cyan(file)}`);
      console.log(`  추출 위치: ${chalk.cyan(result)}`);
      
      // 파일 통계 표시
      const stats = await fs.stat(file);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  파일 크기: ${chalk.yellow(sizeInMB)} MB`);
      
    } catch (error) {
      spinner.fail(chalk.red('파일 추출 실패'));
      throw error;
    }

  } catch (error) {
    console.error(chalk.red('오류:'), error instanceof Error ? error.message : '알 수 없는 오류');
    process.exit(1);
  }
}
