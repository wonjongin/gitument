#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as packageJson from '../../package.json';

// 명령어 모듈들
import { extractCommand } from '../commands/extract';
import { packCommand } from '../commands/pack';
import { initCommand } from '../commands/init';
import { statusCommand } from '../commands/status';
import { processPreCommitCommand } from '../commands/processPreCommit';
import { processPostMergeCommand } from '../commands/processPostMerge';

const program = new Command();

// 프로그램 기본 정보 설정
program
  .name('gitument')
  .description('HWPX와 DOCX 파일을 위한 Git 버전 관리 도구')
  .version(packageJson.version)
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name()
  });

// extract 명령어
program
  .command('extract <file>')
  .alias('x')
  .description('HWPX/DOCX 파일을 디렉토리로 추출')
  .option('-o, --output <dir>', '출력 디렉토리 경로')
  .option('-f, --force', '기존 디렉토리 덮어쓰기')
  .action(extractCommand);

// pack 명령어
program
  .command('pack <directory>')
  .alias('p')
  .description('디렉토리를 HWPX/DOCX 파일로 압축')
  .option('-o, --output <file>', '출력 파일 경로')
  .option('-t, --type <type>', '파일 형식 강제 지정 (hwpx|docx)')
  .action(packCommand);

// init 명령어
program
  .command('init')
  .alias('i')
  .description('현재 Git 저장소에 훅 초기화')
  .option('--force', '기존 훅 덮어쓰기')
  .action(initCommand);

// status 명령어
program
  .command('status')
  .alias('s')
  .description('추적 중인 파일 상태 확인')
  .option('-v, --verbose', '상세 정보 표시')
  .action(statusCommand);

// Git 훅 처리 명령어들 (내부용)
program
  .command('process-pre-commit <repoPath>')
  .description('Pre-commit 처리 (Git 훅용)')
  .action(processPreCommitCommand);

program
  .command('process-post-merge <repoPath>')
  .description('Post-merge 처리 (Git 훅용)')
  .action(processPostMergeCommand);

// 전역 옵션
program
  .option('--verbose', '상세 로그 출력')
  .option('--quiet', '조용한 모드');

// 에러 처리
program.on('command:*', (operands: string[]) => {
  console.error(chalk.red(`알 수 없는 명령어: ${operands[0]}`));
  console.error(chalk.yellow('사용 가능한 명령어를 보려면 --help를 사용하세요.'));
  process.exit(1);
});

// 예외 처리
process.on('uncaughtException', (error: Error) => {
  console.error(chalk.red('예상치 못한 오류가 발생했습니다:'));
  console.error(error.message);
  if (program.opts()['verbose']) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  console.error(chalk.red('처리되지 않은 Promise 거부:'));
  console.error(reason);
  process.exit(1);
});

// 프로그램 실행
program.parse();

// 명령어가 제공되지 않은 경우 도움말 표시
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
