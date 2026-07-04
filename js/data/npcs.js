// NPC 데이터 — 위치(px), 대화(순환), 호감도 마일스톤
export const NPCS = {
  batol: {
    name: '밤톨 이장', sprite: 'assets/characters/npc_batol.png', map: 'village', x: 272, y: 960, h: 52,
    lines: [
      '왔구나. …자네 할머니와는 오랜 친구였네.',
      '마을이 많이 낡았지? 망치에게 가보게. 손재주 하나는 확실한 녀석이야.',
      '한때 이 마을은 「맛의 마을」로 불렸지. …다 옛날 얘기네만.',
      '게시판이 고쳐지면 주민들 부탁을 받아줄 수 있을 걸세.',
    ],
  },
  bomi: {
    name: '봄이', sprite: 'assets/characters/npc_bomi.png', map: 'village', x: 628, y: 400, h: 50,
    lines: [
      '어서와! 잡화점은 처음이지? 씨앗은 농장 우편함으로 배달해주고 있어!',
      '계절이 바뀌면 파는 씨앗도 바뀌어. 꼭 확인해!',
      '언니(오빠)네 할머니 얘기, 엄마한테 많이 들었어. 요리 천재였다며?',
      '다회수확 작물은 씨앗값이 비싸도 결국 이득이야. 장사 꿀팁!',
    ],
  },
  mangchi: {
    name: '망치', sprite: 'assets/characters/npc_mangchi.png', map: 'village', x: 1005, y: 1115, h: 52,
    lines: [
      '…수리할 거 있으면 말해.',
      '재료랑 돈만 있으면 뭐든 고친다.',
      '…이 마을, 고칠 데가 많아. 좋은 일이지. 나한텐.',
    ],
    action: 'repairs',
  },
  bori: {
    name: '보리 아주머니', sprite: 'assets/characters/npc_bori.png', map: 'village', x: 952, y: 565, h: 52,
    lines: [
      '아이고, 어서와! 배고프지? 뭐 좀 먹고 다녀~',
      '요리는 조합이 생명이야. 안 해본 조합을 자꾸 시도해봐!',
      '우리 화덕도 곧 고쳐야 할 텐데… 빵 굽던 시절이 그립네.',
    ],
    hint: true, // 미발견 레시피 힌트
  },
  chowon: {
    name: '초원', sprite: 'assets/characters/npc_chowon.png', map: 'village', x: 320, y: 545, h: 52,
    lines: [
      '동물들은 다 알아요. 누가 자기를 아끼는지.',
      '하루에 한 번씩 꼭 쓰다듬어 주세요. 생산도 빨라진답니다.',
      '사료는 간식 같은 거예요. 주면 기운이 나서 일을 빨리 해요.',
      '…방금 저 닭이 뭐라고 했는지 아세요? 아, 아무것도 아니에요.',
    ],
  },
  bandi: {
    name: '반디', sprite: 'assets/characters/npc_bandi.png', map: 'forest', x: 330, y: 855, h: 50,
    lines: [
      '…인간이다. 오랜만이야.',
      '이 숲의 불빛들, 예쁘지? …전부 잠들어 있는 거야.',
      '그 사람이랑 똑같은 냄새가 나. …부엌의, 따뜻한 냄새.',
      '제단은 아직 차가워. …때가 되면, 알려줄게.',
    ],
  },
};

// 호감도 마일스톤: 하트 수 → 보상 골드
export const MILESTONES = { 3: 100, 7: 300, 10: 1000 };
