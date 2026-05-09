export type RulebookScope = "main" | "lobby" | "game";

export type RulebookSectionContent = {
  title: string;
  body: string;
  bullets: string[];
};

export type OnboardingStepContent = {
  step: string;
  title: string;
  body: string;
};

export const RULEBOOK_META: Record<
  RulebookScope,
  {
    title: string;
    intro: string;
    onboardingTitle: string;
    onboardingDescription: string;
  }
> = {
  main: {
    title: "입장 안내",
    intro: "게스트와 계정, 방 종류, 첫 입장 흐름만 먼저 확인하면 바로 시작할 수 있습니다.",
    onboardingTitle: "처음 들어오면",
    onboardingDescription: "첫 화면에서는 이 세 가지만 기억하면 됩니다.",
  },
  lobby: {
    title: "대기실 안내",
    intro: "준비 상태와 방장 진행만 맞추면 팀 배정과 브리핑으로 자연스럽게 이어집니다.",
    onboardingTitle: "대기실에서 할 일",
    onboardingDescription: "대기 구간에서는 아래 세 단계만 따라가면 됩니다.",
  },
  game: {
    title: "진행 안내",
    intro: "사건, 채팅, 조사실 상태만 보면 됩니다. 나머지 정보는 최소한으로 숨겨집니다.",
    onboardingTitle: "진행 중 핵심",
    onboardingDescription: "플레이 중에는 이 세 축만 보면 길을 잃지 않습니다.",
  },
};

export const RULEBOOK_SECTIONS: Record<RulebookScope, RulebookSectionContent[]> = {
  main: [
    {
      title: "입장 방식",
      body: "게스트는 자동으로 정해진 닉네임으로 바로 들어가고, 계정은 전적과 닉네임을 이어받습니다.",
      bullets: ["게스트 닉네임은 이 브라우저에서 고정됩니다.", "계정 로그인 후에는 최근 기록과 승패가 누적됩니다."],
    },
    {
      title: "방 종류",
      body: "공개방, 비밀방, 연습방은 입장 규칙이 다릅니다.",
      bullets: ["공개방은 코드만 있으면 바로 합류합니다.", "비밀방은 코드와 비밀번호가 모두 필요합니다.", "연습방은 1인, 1스테이지, 외부 입장이 닫혀 있습니다."],
    },
    {
      title: "첫 흐름",
      body: "닉네임 확인 후 방을 만들거나 찾고, 입장하면 바로 대기실로 이어집니다.",
      bullets: ["방장 설정에서 제목과 비밀번호를 먼저 정리할 수 있습니다.", "검색 결과가 없으면 검색어를 비우고 최신순으로 다시 확인합니다."],
    },
  ],
  lobby: [
    {
      title: "준비 완료",
      body: "모든 플레이어가 준비를 마쳐야 방장이 다음 단계를 열 수 있습니다.",
      bullets: ["준비 해제는 시작 전까지 다시 바꿀 수 있습니다.", "방장은 인원과 준비 수를 먼저 확인합니다."],
    },
    {
      title: "팀 배정과 브리핑",
      body: "전원 준비 후 팀 배정이 열리고, 이어서 브리핑으로 넘어갑니다.",
      bullets: ["팀은 협력 단위지만 점수는 개인 기준으로 계산됩니다.", "브리핑이 끝나면 바로 추리 진행 화면으로 이동합니다."],
    },
    {
      title: "정보 공개 범위",
      body: "대기실에서는 입장 상태와 배정 결과만 확인하고, 게임 중 민감 정보는 미리 보이지 않습니다.",
      bullets: ["다른 플레이어의 점수는 게임 종료 전까지 숨겨집니다.", "질문 내용과 정답 시도 내역도 진행 중에는 공개되지 않습니다."],
    },
  ],
  game: [
    {
      title: "40 / 40 / 20 구조",
      body: "왼쪽은 사건, 가운데는 채팅, 오른쪽은 내 상태와 조사실 흐름만 모아둔 영역입니다.",
      bullets: ["왼쪽은 공개 사건 정보만 봅니다.", "가운데는 전체 채팅과 팀 채팅의 현재 대화만 따라갑니다.", "오른쪽은 내 점수, 조사실, 1:1 요청 상태만 집중합니다."],
    },
    {
      title: "조사실과 대기열",
      body: "조사실은 한 번에 한 사람만 사용하며, 대기열에 들어가면 비는 즉시 자동 입장합니다.",
      bullets: ["질문과 정답 시도에는 개인 비용이 반영됩니다.", "다른 사람이 사용 중이면 내 차례만 확인하면 됩니다."],
    },
    {
      title: "공개와 비공개",
      body: "진행 중에는 다른 사람의 세부 판단 정보가 보이지 않도록 화면이 제한됩니다.",
      bullets: ["내 점수만 실시간으로 봅니다.", "다른 사람의 질문, 정답 시도, 오답 여부는 가려집니다.", "정답 성공 후에는 개인 관전 상태로 전환됩니다."],
    },
  ],
};

export const RULEBOOK_ONBOARDING: Record<RulebookScope, OnboardingStepContent[]> = {
  main: [
    {
      step: "01",
      title: "닉네임 확인",
      body: "게스트는 자동 닉네임을 그대로 쓰고, 계정은 로그인 후 내 프로필을 이어받습니다.",
    },
    {
      step: "02",
      title: "방 만들기 또는 찾기",
      body: "방 종류를 고른 뒤 설정을 정리하거나, 코드와 검색으로 바로 합류합니다.",
    },
    {
      step: "03",
      title: "대기실 합류",
      body: "입장 후에는 준비 완료를 맞추고 방장의 팀 배정과 브리핑을 기다립니다.",
    },
  ],
  lobby: [
    {
      step: "01",
      title: "준비 상태 맞추기",
      body: "내 준비 상태를 확정하고, 모두가 준비됐는지 먼저 확인합니다.",
    },
    {
      step: "02",
      title: "팀 배정 확인",
      body: "방장이 팀을 나누면 내 팀과 현재 역할만 간결하게 확인합니다.",
    },
    {
      step: "03",
      title: "브리핑 진입",
      body: "사건 공개 설명을 읽고 추리 진행 화면으로 넘어갈 준비를 합니다.",
    },
  ],
  game: [
    {
      step: "01",
      title: "사건 읽기",
      body: "왼쪽 사건 정보에서 지금 공개된 설명과 이미지만 먼저 확인합니다.",
    },
    {
      step: "02",
      title: "채팅 정리",
      body: "가운데 채팅에서 필요한 공유만 짧게 남기고 불필요한 정보는 줄입니다.",
    },
    {
      step: "03",
      title: "조사실 차례 확인",
      body: "오른쪽에서 조사실과 1:1 상태를 보고 지금 바로 행동할지 판단합니다.",
    },
  ],
};
