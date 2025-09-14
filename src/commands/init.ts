// import * as path from 'path'; // 사용하지 않음
import * as chalk from 'chalk';
import { GitIntegration } from '../lib/gitIntegration';
import { InitOptions } from '../types';

/**
 * Git 훅 초기화 명령어
 * @param options - 명령어 옵션
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const { force } = options;
  
  try {
    // 현재 디렉토리를 Git 저장소로 사용
    const repoPath = process.cwd();
    
    console.log(chalk.blue('Git 훅을 초기화하는 중...'));
    console.log(`저장소 경로: ${chalk.cyan(repoPath)}`);
    
    // Git 통합 객체 생성
    const gitIntegration = new GitIntegration();
    
    // 훅 설치
    await gitIntegration.installHooks(repoPath, { force: force || false });
    
    console.log(chalk.green('초기화 완료!'));
    console.log(chalk.yellow('설치된 훅:'));
    console.log('  - pre-commit: HWPX/DOCX 파일을 자동으로 추출합니다');
    console.log('  - post-merge: 추출된 디렉토리를 자동으로 압축합니다');
    
    console.log(chalk.blue('\n사용법:'));
    console.log('  git add . && git commit  # 자동으로 HWPX/DOCX 파일이 추출됩니다');
    console.log('  git pull                # 자동으로 추출된 디렉토리가 압축됩니다');
    
  } catch (error) {
    console.error(chalk.red('오류:'), error instanceof Error ? error.message : '알 수 없는 오류');
    process.exit(1);
  }
}
