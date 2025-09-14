# Gitument

HWPX와 DOCX 파일을 위한 Git 버전 관리 도구입니다. ZIP 기반 문서 파일을 자동으로 추출하고 압축하여 Git에서 효율적으로 버전 관리를 할 수 있도록 도와줍니다. Gitument는 git과 document를 합친 단어입니다.

## 주요 기능

- **자동 추출/압축**: HWPX/DOCX 파일을 Git 커밋 전에 자동으로 추출하고, 머지(Pull) 후에 자동으로 압축합니다
- **Git 훅 통합**: Pre-commit과 Post-merge 훅을 자동으로 설정합니다
- **한글 파일명 지원**: HWPX 파일의 한글 파일명을 완벽하게 지원합니다
- **크로스 플랫폼**: Windows, macOS, Linux에서 동작합니다

## 설치

```bash
# npm을 통한 전역 설치
npm install -g gitument

# 또는 yarn 사용
yarn add -g gitument

# 또는 pnpm 사용
pnpm add -g gitument
```

## 사용법

### 1. Git 저장소 초기화

```bash
# Git 저장소에서 실행
gitument init
```

이 명령어는 현재 Git 저장소에 필요한 훅을 설치합니다.

### 2. 파일 추출

```bash
# HWPX 파일 추출
gitument extract document.hwpx

# DOCX 파일 추출 (출력 디렉토리 지정)
gitument extract document.docx -o extracted_doc

# 기존 디렉토리 덮어쓰기
gitument extract document.hwpx --force
```

### 3. 디렉토리 압축

```bash
# 추출된 디렉토리를 원본 파일로 압축
gitument pack document_extracted

# 출력 파일 지정
gitument pack document_extracted -o new_document.docx

# 파일 형식 강제 지정
gitument pack document_extracted --type hwpx
```

### 4. 상태 확인

```bash
# 기본 상태 확인
gitument status

# 상세 정보 표시
gitument status --verbose
```

## 자동화된 워크플로우

Gitument를 초기화한 후에는 다음과 같이 자동으로 동작합니다:

1. **커밋 시**: 수정된 HWPX/DOCX 파일이 자동으로 추출되어 Git에 추가됩니다
2. **머지 시**: 추출된 디렉토리가 자동으로 원본 파일로 압축됩니다

```bash
# 일반적인 Git 워크플로우
git add .
git commit -m "문서 수정"  # HWPX/DOCX 파일이 자동으로 추출됩니다
git push

git pull  # 추출된 디렉토리가 자동으로 압축됩니다
```

## 설정

`.gitument.json` 파일을 통해 동작을 커스터마이징할 수 있습니다:

```json
{
  "version": "1.0.0",
  "extractDirPattern": "{filename}_extracted",
  "autoCleanup": true,
  "supportedTypes": ["hwpx", "docx"]
}
```

## 지원 파일 형식

- **HWPX**: 한글과컴퓨터의 한글 문서 형식
- **DOCX**: Microsoft Word 문서 형식

## 요구사항

- Node.js 14.0.0 이상
- Git 저장소

## 라이선스

MIT License

## 기여하기

버그 리포트나 기능 제안은 GitHub Issues를 통해 해주세요.

## 문제 해결

### 자주 묻는 질문

**Q: Git 훅이 실행되지 않아요**
A: `gitument init --force`를 실행하여 훅을 다시 설치해보세요.

**Q: 한글 파일명이 깨져요**
A: 터미널의 인코딩 설정을 UTF-8로 변경해보세요.

**Q: 대용량 파일 처리 시 오류가 발생해요**
A: Node.js의 메모리 제한을 늘려보세요: `node --max-old-space-size=4096`
