import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import simpleGit, { SimpleGit } from 'simple-git';
import { GitIntegration } from '../lib/gitIntegration';
// import { FileProcessor } from '../lib/fileProcessor'; // 사용하지 않음
import { detectFileTypeByExtension, FileType } from '../lib/utils';
import { StatusOptions } from '../types';

/**
 * 파일 상태 확인 명령어
 * @param options - 명령어 옵션
 */
export async function statusCommand(options: StatusOptions): Promise<void> {
  const { verbose } = options;
  
  try {
    const repoPath = process.cwd();
    const gitIntegration = new GitIntegration();
    // const fileProcessor = new FileProcessor(); // 사용하지 않음
    
    console.log(chalk.blue('Gitument 상태 확인\n'));
    
    // Git 저장소 확인
    const git: SimpleGit = simpleGit(repoPath);
    if (!(await git.checkIsRepo())) {
      throw new Error('Git 저장소가 아닙니다.');
    }
    
    // 설정 로드
    const config = await gitIntegration.loadConfig(repoPath);
    console.log(chalk.green('설정:'));
    console.log(`  추출 패턴: ${config.extractDirPattern}`);
    console.log(`  자동 정리: ${config.autoCleanup ? '활성화' : '비활성화'}`);
    console.log(`  지원 형식: ${config.supportedTypes.join(', ')}\n`);
    
    // 추적 중인 파일 목록
    const modifiedFiles = await gitIntegration.getModifiedFiles(repoPath);
    const extractDirs = await gitIntegration.findExtractDirectories(repoPath, config);
    
    console.log(chalk.green('추적 중인 HWPX/DOCX 파일:'));
    if (modifiedFiles.length === 0) {
      console.log('  없음');
    } else {
      for (const file of modifiedFiles) {
        const fileType = detectFileTypeByExtension(file);
        const typeColor = fileType === FileType.HWPX ? chalk.red : chalk.blue;
        console.log(`  ${typeColor(fileType.toUpperCase())} ${file}`);
        
        if (verbose) {
          try {
            const stats = await fs.stat(file);
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`    크기: ${sizeInMB} MB`);
            console.log(`    수정일: ${stats.mtime.toLocaleString()}`);
          } catch (error) {
            console.log(`    ${chalk.red('정보를 가져올 수 없습니다')}`);
          }
        }
      }
    }
    
    console.log(chalk.green('\n추출된 디렉토리:'));
    if (extractDirs.length === 0) {
      console.log('  없음');
    } else {
      for (const dir of extractDirs) {
        console.log(`  ${chalk.cyan(dir)}`);
        
        if (verbose) {
          try {
            const metadataPath = path.join(dir, '.gitument.json');
            const metadata = await fs.readJson(metadataPath);
            console.log(`    원본 파일: ${metadata.originalFile}`);
            console.log(`    파일 형식: ${metadata.fileType}`);
            console.log(`    추출일: ${new Date(metadata.extractedAt).toLocaleString()}`);
          } catch (error) {
            console.log(`    ${chalk.red('메타데이터를 읽을 수 없습니다')}`);
          }
        }
      }
    }
    
    // Git 상태 요약
    const status = await git.status();
    console.log(chalk.green('\nGit 상태:'));
    console.log(`  수정됨: ${status.modified.length}개 파일`);
    console.log(`  추가됨: ${status.created.length}개 파일`);
    console.log(`  삭제됨: ${status.deleted.length}개 파일`);
    console.log(`  이름변경: ${status.renamed.length}개 파일`);
    
    if (verbose) {
      console.log(chalk.green('\n상세 Git 상태:'));
      if (status.modified.length > 0) {
        console.log('  수정된 파일:');
        status.modified.forEach(file => console.log(`    ${file}`));
      }
      if (status.created.length > 0) {
        console.log('  추가된 파일:');
        status.created.forEach(file => console.log(`    ${file}`));
      }
      if (status.deleted.length > 0) {
        console.log('  삭제된 파일:');
        status.deleted.forEach(file => console.log(`    ${file}`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('오류:'), error instanceof Error ? error.message : '알 수 없는 오류');
    process.exit(1);
  }
}
