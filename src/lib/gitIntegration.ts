import * as fs from 'fs-extra';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { FileProcessor } from './fileProcessor';
// import { detectFileTypeByExtension, FileType } from './utils'; // 사용하지 않음
import { GitumentConfig, GitHookOptions } from '../types';

/**
 * Git 통합 클래스
 */
export class GitIntegration {
  private readonly fileProcessor: FileProcessor;
  private readonly configFileName = '.gitument.json';

  constructor() {
    this.fileProcessor = new FileProcessor();
  }

  /**
   * Git 훅을 설치합니다.
   * @param repoPath - Git 저장소 경로
   * @param options - 설치 옵션
   */
  async installHooks(repoPath: string, options: GitHookOptions = {}): Promise<void> {
    const { force = false } = options;
    
    // Git 저장소 확인
    const git: SimpleGit = simpleGit(repoPath);
    if (!(await git.checkIsRepo())) {
      throw new Error('Git 저장소가 아닙니다.');
    }

    const hooksDir = path.join(repoPath, '.git', 'hooks');
    await fs.ensureDir(hooksDir);

    // 기존 훅 백업
    await this.backupExistingHooks(hooksDir);

    // 훅 설치
    await this.installPreCommitHook(hooksDir, force);
    await this.installPostMergeHook(hooksDir, force);

    // 설정 파일 생성
    await this.createConfigFile(repoPath);

    console.log('Git 훅이 성공적으로 설치되었습니다.');
  }

  /**
   * Git 훅을 제거합니다.
   * @param repoPath - Git 저장소 경로
   */
  async uninstallHooks(repoPath: string): Promise<void> {
    const hooksDir = path.join(repoPath, '.git', 'hooks');
    
    // 훅 파일 제거
    const hookFiles = ['pre-commit', 'post-merge'];
    for (const hookFile of hookFiles) {
      const hookPath = path.join(hooksDir, hookFile);
      if (await fs.pathExists(hookPath)) {
        await fs.remove(hookPath);
      }
    }

    // 백업 복원
    await this.restoreBackupHooks(hooksDir);

    // 설정 파일 제거
    const configPath = path.join(repoPath, this.configFileName);
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }

    console.log('Git 훅이 제거되었습니다.');
  }

  /**
   * 수정된 HWPX/DOCX 파일 목록을 가져옵니다.
   * @param repoPath - Git 저장소 경로
   * @returns 수정된 파일 목록
   */
  async getModifiedFiles(repoPath: string): Promise<string[]> {
    const git: SimpleGit = simpleGit(repoPath);
    
    try {
      const status = await git.status();
      const allFiles = [
        ...status.modified,
        ...status.created,
        ...status.renamed.map(r => r.to)
      ];

      // HWPX/DOCX 파일만 필터링
      return allFiles.filter(file => this.fileProcessor.isSupportedFile(file));
    } catch (error) {
      throw new Error(`Git 상태 확인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Pre-commit 처리를 수행합니다.
   * @param repoPath - Git 저장소 경로
   */
  async processPreCommit(repoPath: string): Promise<void> {
    console.log('Pre-commit 처리 중...');
    
    const modifiedFiles = await this.getModifiedFiles(repoPath);
    
    if (modifiedFiles.length === 0) {
      console.log('처리할 HWPX/DOCX 파일이 없습니다.');
      return;
    }

    const git: SimpleGit = simpleGit(repoPath);
    const config = await this.loadConfig(repoPath);

    for (const filePath of modifiedFiles) {
      try {
        console.log(`처리 중: ${filePath}`);
        
        // 추출 디렉토리 경로 생성
        const extractDir = this.getExtractDirPath(filePath, config);
        
        // 파일 추출
        await this.fileProcessor.extractFile(filePath, extractDir);
        
        // 원본 파일을 Git에서 제외
        await this.addToGitignore(repoPath, filePath);
        
        // 추출된 디렉토리를 Git에 추가
        await git.add(extractDir);
        
        console.log(`추출 완료: ${extractDir}`);
      } catch (error) {
        console.error(`파일 처리 실패 (${filePath}): ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        throw error;
      }
    }
  }

  /**
   * Post-merge 처리를 수행합니다.
   * @param repoPath - Git 저장소 경로
   */
  async processPostMerge(repoPath: string): Promise<void> {
    console.log('Post-merge 처리 중...');
    
    const config = await this.loadConfig(repoPath);
    const extractDirs = await this.findExtractDirectories(repoPath, config);
    
    if (extractDirs.length === 0) {
      console.log('처리할 추출 디렉토리가 없습니다.');
      return;
    }

    for (const extractDir of extractDirs) {
      try {
        console.log(`압축 중: ${extractDir}`);
        
        // 원본 파일 경로 생성
        const originalFile = this.getOriginalFilePath(extractDir, config);
        
        // 디렉토리를 파일로 압축
        await this.fileProcessor.packDirectory(extractDir, originalFile);
        
        // 추출 디렉토리 제거
        await fs.remove(extractDir);
        
        console.log(`압축 완료: ${originalFile}`);
      } catch (error) {
        console.error(`디렉토리 처리 실패 (${extractDir}): ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        throw error;
      }
    }
  }

  /**
   * 기존 훅을 백업합니다.
   * @param hooksDir - 훅 디렉토리 경로
   */
  private async backupExistingHooks(hooksDir: string): Promise<void> {
    const backupDir = path.join(hooksDir, 'gitument-backup');
    await fs.ensureDir(backupDir);

    const hookFiles = ['pre-commit', 'post-merge'];
    for (const hookFile of hookFiles) {
      const hookPath = path.join(hooksDir, hookFile);
      const backupPath = path.join(backupDir, hookFile);
      
      if (await fs.pathExists(hookPath)) {
        await fs.copy(hookPath, backupPath);
      }
    }
  }

  /**
   * 백업된 훅을 복원합니다.
   * @param hooksDir - 훅 디렉토리 경로
   */
  private async restoreBackupHooks(hooksDir: string): Promise<void> {
    const backupDir = path.join(hooksDir, 'gitument-backup');
    
    if (await fs.pathExists(backupDir)) {
      const hookFiles = ['pre-commit', 'post-merge'];
      for (const hookFile of hookFiles) {
        const backupPath = path.join(backupDir, hookFile);
        const hookPath = path.join(hooksDir, hookFile);
        
        if (await fs.pathExists(backupPath)) {
          await fs.copy(backupPath, hookPath);
        }
      }
      
      // 백업 디렉토리 제거
      await fs.remove(backupDir);
    }
  }

  /**
   * Pre-commit 훅을 설치합니다.
   * @param hooksDir - 훅 디렉토리 경로
   * @param force - 강제 덮어쓰기 여부
   */
  private async installPreCommitHook(hooksDir: string, force: boolean): Promise<void> {
    const hookPath = path.join(hooksDir, 'pre-commit');
    
    if (await fs.pathExists(hookPath) && !force) {
      throw new Error('Pre-commit 훅이 이미 존재합니다. --force 옵션을 사용하세요.');
    }

    const hookContent = `#!/bin/sh
# Gitument Pre-commit Hook
gitument process-pre-commit "$(pwd)"
`;
    
    await fs.writeFile(hookPath, hookContent);
    await fs.chmod(hookPath, '755');
  }

  /**
   * Post-merge 훅을 설치합니다.
   * @param hooksDir - 훅 디렉토리 경로
   * @param force - 강제 덮어쓰기 여부
   */
  private async installPostMergeHook(hooksDir: string, force: boolean): Promise<void> {
    const hookPath = path.join(hooksDir, 'post-merge');
    
    if (await fs.pathExists(hookPath) && !force) {
      throw new Error('Post-merge 훅이 이미 존재합니다. --force 옵션을 사용하세요.');
    }

    const hookContent = `#!/bin/sh
# Gitument Post-merge Hook
gitument process-post-merge "$(pwd)"
`;
    
    await fs.writeFile(hookPath, hookContent);
    await fs.chmod(hookPath, '755');
  }

  /**
   * 설정 파일을 생성합니다.
   * @param repoPath - Git 저장소 경로
   */
  private async createConfigFile(repoPath: string): Promise<void> {
    const configPath = path.join(repoPath, this.configFileName);
    const config: GitumentConfig = {
      version: '1.0.0',
      extractDirPattern: '{filename}_extracted',
      autoCleanup: true,
      supportedTypes: ['hwpx', 'docx']
    };
    
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  /**
   * 설정 파일을 로드합니다.
   * @param repoPath - Git 저장소 경로
   * @returns 설정 객체
   */
  async loadConfig(repoPath: string): Promise<GitumentConfig> {
    const configPath = path.join(repoPath, this.configFileName);
    
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
    
    // 기본 설정 반환
    return {
      version: '1.0.0',
      extractDirPattern: '{filename}_extracted',
      autoCleanup: true,
      supportedTypes: ['hwpx', 'docx']
    };
  }

  /**
   * 추출 디렉토리 경로를 생성합니다.
   * @param filePath - 원본 파일 경로
   * @param config - 설정 객체
   * @returns 추출 디렉토리 경로
   */
  private getExtractDirPath(filePath: string, config: GitumentConfig): string {
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, path.extname(filePath));
    const pattern = config.extractDirPattern || '{filename}_extracted';
    const extractDirName = pattern.replace('{filename}', filename);
    return path.join(dir, extractDirName);
  }

  /**
   * 원본 파일 경로를 생성합니다.
   * @param extractDir - 추출 디렉토리 경로
   * @param config - 설정 객체
   * @returns 원본 파일 경로
   */
  private getOriginalFilePath(extractDir: string, _config: GitumentConfig): string {
    const dir = path.dirname(extractDir);
    const extractDirName = path.basename(extractDir);
    const filename = extractDirName.replace('_extracted', '');
    return path.join(dir, filename);
  }

  /**
   * 추출된 디렉토리들을 찾습니다.
   * @param repoPath - Git 저장소 경로
   * @param config - 설정 객체
   * @returns 추출된 디렉토리 목록
   */
  async findExtractDirectories(repoPath: string, config: GitumentConfig): Promise<string[]> {
    const extractDirs: string[] = [];
    const _pattern = config.extractDirPattern || '{filename}_extracted';
    
    // 재귀적으로 디렉토리 검색
    await this.searchDirectories(repoPath, _pattern, extractDirs);
    
    return extractDirs;
  }

  /**
   * 디렉토리를 재귀적으로 검색합니다.
   * @param dirPath - 검색할 디렉토리 경로
   * @param pattern - 검색 패턴
   * @param results - 결과 배열
   */
  private async searchDirectories(dirPath: string, _pattern: string, results: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          // 추출된 디렉토리인지 확인
          if (await this.fileProcessor.isExtractedDirectory(fullPath)) {
            results.push(fullPath);
          } else {
            // 하위 디렉토리 검색
            await this.searchDirectories(fullPath, _pattern, results);
          }
        }
      }
    } catch (error) {
      // 권한 오류 등은 무시
    }
  }

  /**
   * .gitignore에 파일을 추가합니다.
   * @param repoPath - Git 저장소 경로
   * @param filePath - 추가할 파일 경로
   */
  private async addToGitignore(repoPath: string, filePath: string): Promise<void> {
    const gitignorePath = path.join(repoPath, '.gitignore');
    const relativePath = path.relative(repoPath, filePath);
    
    let gitignoreContent = '';
    if (await fs.pathExists(gitignorePath)) {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    }
    
    // 이미 추가되어 있는지 확인
    if (!gitignoreContent.includes(relativePath)) {
      gitignoreContent += `\n# Gitument managed files\n${relativePath}\n`;
      await fs.writeFile(gitignorePath, gitignoreContent);
    }
  }
}
