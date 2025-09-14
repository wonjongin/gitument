import chalk from 'chalk';
import { GitIntegration } from '../lib/gitIntegration';

/**
 * Pre-commit 처리 명령어 (Git 훅용)
 * @param repoPath - Git 저장소 경로
 */
export async function processPreCommitCommand(repoPath: string): Promise<void> {
  try {
    const gitIntegration = new GitIntegration();
    await gitIntegration.processPreCommit(repoPath);
  } catch (error) {
    console.error(chalk.red('Pre-commit 처리 실패:'), error instanceof Error ? error.message : '알 수 없는 오류');
    process.exit(1);
  }
}
