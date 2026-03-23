// ✅ extensions.js에서는 extension_settings, getContext만
import { extension_settings, getContext } from '../../../extensions.js';
// ✅ script.js에서 setExtensionPrompt, extension_prompt_types, saveSettingsDebounced
import { saveSettingsDebounced, setExtensionPrompt, extension_prompt_types } from '../../../../script.js';

const EXTENSION_NAME = 'ascde';
const extensionUrl = new URL('.', import.meta.url).pathname.replace(/\/$/, '');

let styleData = { axes: [], rules: {}, recommendations: [], styles: [] };
let activeStyles = new Set();
let activePresetTab = '로맨스';

// =====================================================================
// § 1. 하드코딩 문체 설명 데이터
// =====================================================================
const STYLE_DESCRIPTIONS = {
    // ① 서술 (Narration)
    K:  { name: '2인칭',          axisName: '서술',        desc: '"당신은 ~했다" 형식. 독자를 주인공으로 끌어들이는 몰입형 서술.' },
    L:  { name: '디지털 네이티브', axisName: '서술',        desc: '채팅+서술 하이브리드. SNS·메신저·이모지가 섞인 현대적 텍스트.' },
    M:  { name: '메타픽션',        axisName: '서술',        desc: '서술이 서술을 의심. 화자가 독자와 대화하거나 장르를 해체.' },
    N:  { name: '미니멀리즘 극단', axisName: '서술',        desc: '빠진 것이 더 많다. 침묵과 공백이 의미를 만드는 서술.' },
    O:  { name: '의식의 흐름 극단', axisName: '서술',       desc: '쉼표로만 이어지는 문단. 내면의 흐름을 끊김 없이 서술.' },
    P:  { name: '다큐/르포',       axisName: '서술',        desc: '논픽션으로 픽션을. 객관적 보고서 형식으로 이야기를 전달.' },
    R:  { name: '서간체/일기체',   axisName: '서술',        desc: '편지·일기·메모 형식. 사적인 언어가 서사를 이끈다.' },
    S:  { name: '각본체',          axisName: '서술',        desc: '지문과 대사만. 연극·영화 스크립트 형식의 서술.' },
    // ② 톤 (Tone)
    A:  { name: '외부 관찰형',     axisName: '톤',          desc: '행동과 간극. 인물의 행동만 서술하고 내면은 독자가 추론.' },
    B:  { name: '내면 밀착형',     axisName: '톤',          desc: '의식=서술. 인물의 내면이 곧 텍스트. 극도의 주관성.' },
    C:  { name: '웜 코미디형',     axisName: '톤',          desc: '자각 지연, 따뜻한 유머. 어설픈 상황을 온기로 바라본다.' },
    D:  { name: '임상 건조형',     axisName: '톤',          desc: '해리적 정밀함. 감정 없는 언어로 쓰는 더 날카로운 감정.' },
    E:  { name: '감각 리얼리즘형', axisName: '톤',          desc: '감각의 편집. 촉각·후각·미각이 장면을 지배.' },
    F:  { name: '하드보일드',      axisName: '톤',          desc: '행동이 유일한 언어. 감정은 동사로만, 설명하지 않는다.' },
    G:  { name: '무드 피스',       axisName: '톤',          desc: '분위기가 주인공. 사건보다 감각과 정서가 이야기를 이끈다.' },
    J:  { name: '데카당스',        axisName: '톤',          desc: '탐미와 허무. 아름다움과 몰락이 공존하는 퇴폐적 서술.' },
    T:  { name: '고딕',            axisName: '톤',          desc: '공간이 인물. 장소가 심리를 반영하는 고딕 전통.' },
    AD: { name: '코미디 극단',     axisName: '톤',          desc: '건조한 슬랩스틱. 상황의 불합리성을 직접적으로 밀어붙인다.' },
    AH: { name: '부조리극',        axisName: '톤',          desc: '카프카적 비논리. 세계의 규칙이 이상하고 아무도 의문을 품지 않는다.' },
    AL: { name: '몽환/환상',       axisName: '톤',          desc: '꿈의 논리. 이미지가 과잉, 현실과 환상의 경계가 흐릿.' },
    AR: { name: '일상물',          axisName: '톤',          desc: '사건 없는 서사. 평범한 하루의 질감을 정밀하게 포착.' },
    // ③ 서사/관계 (Narrative — Relation)
    U:  { name: '감성 멜로',       axisName: '서사/관계',   desc: '예쁜 문장, 직접 감정. 감정이 표면에 드러나는 로맨스.' },
    X:  { name: '빌런 로맨스',     axisName: '서사/관계',   desc: '위험+매혹, 권력 비대칭. 선악의 경계에서 벌어지는 사랑.' },
    AA: { name: '치유물/힐링',     axisName: '서사/관계',   desc: '공존이 치유. 함께 있는 것만으로 상처가 아문다.' },
    AB: { name: '관능 문학',       axisName: '서사/관계',   desc: '신체가 감정을 말한다. 관능성으로 심리를 표현.' },
    // ③ 서사/장르 (Narrative — Genre)
    H:  { name: '심리 스릴러',     axisName: '서사/장르',   desc: '신뢰할 수 없는 서술. 무엇이 진실인지 알 수 없다.' },
    AE: { name: '호러',            axisName: '서사/장르',   desc: '이상의 축적. 작은 균열들이 쌓여 공포가 된다.' },
    AJ: { name: '추리/미스터리',   axisName: '서사/장르',   desc: '단서, 유저 주도 추론. 독자가 직접 수수께끼를 푼다.' },
    AN: { name: '동화/우화',       axisName: '서사/장르',   desc: '"옛날 옛적에". 동화 문법으로 쓰는 어른의 이야기.' },
    AT: { name: '성장물',          axisName: '서사/장르',   desc: '"처음"의 서사. 시작과 변화, 첫 경험의 기록.' },
    // ④ 세계/배경 (World — Background)
    V:  { name: '판타지/사극',     axisName: '세계/배경',   desc: '의전, 전투, 정치. 다른 세계와 다른 시대의 규칙.' },
    AF: { name: '하드 SF',         axisName: '세계/배경',   desc: '과학이 플롯. 과학적 원리가 서사의 중심.' },
    AI: { name: '무협',            axisName: '세계/배경',   desc: '강호, 내공, 초식. 무협 세계의 언어와 미학.' },
    AM: { name: '포스트 아포칼립스', axisName: '세계/배경', desc: '폐허, 생존, 자원. 문명 이후의 세계.' },
    AP: { name: '직장물',          axisName: '세계/배경',   desc: '조직 정치, 메일의 전쟁. 직장 생존의 서사.' },
    // ④ 세계/구조 (World — Structure)
    I:  { name: '군상극',          axisName: '세계/구조',   desc: '교차 편집. 여러 인물의 시선이 하나의 사건을 다각도로 조명.' },
    Q:  { name: '시간 루프',       axisName: '세계/구조',   desc: '반복과 변주. 같은 시간을 다르게 살며 변화를 기록.' },
    W:  { name: '게임 서사',       axisName: '세계/구조',   desc: '스킬=내면, 판정. 게임 시스템이 이야기의 언어.' },
    AC: { name: '세계관 빌딩',     axisName: '세계/구조',   desc: '세계가 주인공. 디테일한 설정이 이야기를 만든다.' },
    AG: { name: '회귀/빙의물',     axisName: '세계/구조',   desc: '정보 비대칭, 정체성. 과거로 돌아가거나 다른 몸에 들어간다.' },
    AO: { name: '스포츠/경쟁',     axisName: '세계/구조',   desc: '신체의 한계, 경기 리듬. 승부의 언어.' },
    AQ: { name: '먼치킨/역행자',   axisName: '세계/구조',   desc: '압도의 쾌감과 이면. 강한 주인공의 서사.' },
    AU: { name: '로드무비/여행',   axisName: '세계/구조',   desc: '이동이 서사. 여정 자체가 이야기.' },
    // ⑤ 모드 (Mode)
    AK: { name: '아이돌/팬픽',     axisName: '모드',        desc: '윤리 레이어 + 베이스 조합. 아이돌 세계관의 특수한 감각.' },
    AS: { name: '크리처/인외 존재', axisName: '모드',        desc: '비인간 감각 체계. 인간이 아닌 존재의 시선.' },
};

// =====================================================================
// § 2. 조합 데이터
// =====================================================================
const NON_RECOMMENDED = [
    { ids: ['S',  'O'],  reason: '각본은 외부만, 의식흐름은 내면만. 근본 충돌.' },
    { ids: ['S',  'AB'], reason: '감각 밀도가 필요한데 각본은 행동만.' },
    { ids: ['N',  'AL'], reason: '미니멀은 삭제, 몽환은 이미지 과잉.' },
    { ids: ['AR', 'AE'], reason: '사건이 없는데 공포가 필요. — 단, 의도적 마찰 가능.' },
    { ids: ['L',  'AI'], reason: '채팅 UI와 강호가 충돌.' },
    { ids: ['AN', 'AP'], reason: '"옛날 옛적에 한 회사원이 있었다" — 부조리극 아니면 어색.' },
];

const FRICTION_COMBOS = [
    { ids: ['AR', 'AE'], effect: '완벽한 일상이 미세하게 이상하다. 「조용한 가족」의 톤.' },
    { ids: ['AD', 'AE'], effect: '코미디 호러. 웃다가 소름.' },
    { ids: ['N',  'AB'], effect: '극도로 절제된 관능. "손이 닿았다." 상상이 텍스트를 초과.' },
    { ids: ['D',  'U'],  effect: '사랑을 임상적으로 기록. 건조한데 아프다.' },
    { ids: ['AN', 'X'],  effect: '잔혹 동화. 늑대는 진짜로 먹는다.' },
    { ids: ['S',  'AL'], effect: '데이비드 린치. 지문에 불가능한 이미지.' },
    { ids: ['P',  'AL'], effect: '보르헤스. 다큐멘터리 형식으로 기록된 초현실.' },
    { ids: ['AR', 'AG'], effect: '회귀했는데 평범한 일상을 다시 사는 것.' },
    { ids: ['AD', 'AQ'], effect: '원펀맨. 강한데 웃긴다.' },
];

const SYNERGY_COMBOS = [
    { ids: ['C',  'U'],  description: '웜코미디 멜로' },
    { ids: ['F',  'X'],  description: '하드보일드 빌런 로맨스' },
    { ids: ['F',  'H'],  description: '하드보일드 심리스릴러' },
    { ids: ['F',  'AJ'], description: '하드보일드 추리' },
    { ids: ['G',  'U'],  description: '무드피스 멜로' },
    { ids: ['G',  'AA'], description: '무드피스 치유물' },
    { ids: ['T',  'AE'], description: '고딕 호러' },
    { ids: ['AL', 'AE'], description: '몽환 호러' },
    { ids: ['AR', 'AA'], description: '일상 치유물' },
    { ids: ['B',  'AF'], description: '내면밀착 하드SF' },
    { ids: ['B',  'AG'], description: '내면밀착 회귀물' },
    { ids: ['B',  'AT'], description: '내면밀착 성장물' },
    { ids: ['C',  'AP'], description: '웜코미디 직장물' },
    { ids: ['C',  'AT'], description: '웜코미디 성장물' },
    { ids: ['AD', 'AG'], description: '코미디 회귀물' },
    { ids: ['AD', 'AP'], description: '코미디 직장물' },
    { ids: ['AD', 'AQ'], description: '코미디 먼치킨' },
    { ids: ['F',  'AI'], description: '하드보일드 무협' },
    { ids: ['G',  'V'],  description: '무드피스 판타지' },
    { ids: ['G',  'AU'], description: '무드피스 여행물' },
];

const PRESET_RECOMMENDATIONS = {
    '로맨스': [
        { ids: ['G', 'U'],       label: 'G+U',     desc: '예쁘고 설레는 무드 로맨스' },
        { ids: ['C', 'U'],       label: 'C+U',     desc: '따뜻하고 웃기는 웜코미디 멜로' },
        { ids: ['F', 'X'],       label: 'F+X',     desc: '어둡고 위험한 빌런 로맨스' },
        { ids: ['E', 'AB'],      label: 'E+AB',    desc: '야하고 문학적인 감각 로맨스' },
        { ids: ['G', 'AA'],      label: 'G+AA',    desc: '아프고 치유되는 힐링 로맨스' },
        { ids: ['B', 'U', 'AG'], label: 'B+U+AG',  desc: '회귀 로맨스. 그 사람만 기억한다.' },
    ],
    '장르': [
        { ids: ['F', 'V', 'I'],    label: 'F+V+I',    desc: '판타지 정치극. 강하고 냉정한 군상.' },
        { ids: ['F', 'AI'],        label: 'F+AI',     desc: '무협 강호. 하드보일드 협객.' },
        { ids: ['D', 'AF'],        label: 'D+AF',     desc: 'SF 생존. 임상적 정밀함으로 쓰는 우주.' },
        { ids: ['T', 'AE', 'D'],   label: 'T+AE+D',   desc: '호러. 고딕 공간, 이상의 축적, 건조한 공포.' },
        { ids: ['F', 'AJ', 'A'],   label: 'F+AJ+A',   desc: '추리. 하드보일드 탐정, 행동으로 단서를 모은다.' },
        { ids: ['AD', 'AQ', 'AG'], label: 'AD+AQ+AG', desc: '먼치킨 코미디. 다 알고 다 이기는데 웃기다.' },
        { ids: ['W', 'V'],         label: 'W+V',      desc: '게임 판타지. 스킬이 곧 마법.' },
        { ids: ['D', 'AM'],        label: 'D+AM',     desc: '포스트 아포칼립스. 건조하게 살아남는다.' },
    ],
    '분위기': [
        { ids: ['AR', 'AA'],      label: 'AR+AA',   desc: '일상 힐링. 아무 일도 없지만 치유된다.' },
        { ids: ['AL', 'U'],       label: 'AL+U',    desc: '몽환적 아름다움. 꿈처럼 아름다운 사랑.' },
        { ids: ['AH', 'AD'],      label: 'AH+AD',   desc: '부조리 코미디. 세계가 이상하고 웃기다.' },
        { ids: ['AN', 'X'],       label: 'AN+X',    desc: '동화적 잔혹. 동화 문법의 위험한 로맨스.' },
        { ids: ['AU', 'G'],       label: 'AU+G',    desc: '여행 서사. 풍경이 이야기.' },
        { ids: ['AP', 'C'],       label: 'AP+C',    desc: '직장 생존기. 웃으며 버티는 직장물.' },
        { ids: ['AT', 'C', 'U'],  label: 'AT+C+U',  desc: '성장 드라마. 첫 경험과 따뜻한 감정.' },
        { ids: ['AO', 'F'],       label: 'AO+F',    desc: '스포츠 열혈. 행동만으로 쓰는 승부.' },
    ],
    '실험': [
        { ids: ['M',  'AH'],       label: 'M+AH',   desc: '형식 파괴. 서술이 스스로를 해체하는 부조리.' },
        { ids: ['O',  'AL'],       label: 'O+AL',   desc: '의식의 강. 끝없이 흐르는 꿈의 언어.' },
        { ids: ['R',  'U', 'AU'], label: 'R+U+AU',  desc: '편지로 쓰는 이야기. 여행 중 보내는 사랑.' },
        { ids: ['P',  'AJ'],       label: 'P+AJ',   desc: '다큐멘터리 픽션. 논픽션 형식의 추리.' },
        { ids: ['S',  'F'],        label: 'S+F',    desc: '각본으로만. 대사와 지문만으로 하드보일드.' },
    ],
};

// =====================================================================
// § 2-b. 시너지 점수 테이블 (문제 명세 §시너지 조합표)
// =====================================================================
// Ⅱ×Ⅲ: 톤 × 서사/관계+장르  (1~5점)
const SYNERGY_TABLE_II_III = {
    C:  { U: 5, X: 2, AA: 4, AB: 2, H: 1, AE: 1, AJ: 2, AN: 3, AT: 5 },
    F:  { U: 4, X: 5, AA: 2, AB: 3, H: 5, AE: 3, AJ: 5, AN: 1, AT: 2 },
    G:  { U: 5, X: 3, AA: 5, AB: 4, H: 3, AE: 4, AJ: 3, AN: 4, AT: 4 },
    T:  { U: 3, X: 4, AA: 2, AB: 3, H: 4, AE: 5, AJ: 4, AN: 4, AT: 3 },
    AD: { U: 3, X: 2, AA: 3, AB: 1, H: 2, AE: 2, AJ: 3, AN: 3, AT: 3 },
    AL: { U: 4, X: 3, AA: 3, AB: 4, H: 3, AE: 5, AJ: 2, AN: 5, AT: 3 },
    AR: { U: 3, X: 1, AA: 5, AB: 2, H: 1, AE: 2, AJ: 1, AN: 2, AT: 3 },
};

// Ⅱ×Ⅳ: 톤 × 세계/배경+구조  (1~5점)
const SYNERGY_TABLE_II_IV = {
    B:  { V: 4, AI: 3, AF: 5, AG: 5, AP: 4, AQ: 3, AU: 4 },
    C:  { V: 3, AI: 2, AF: 3, AG: 4, AP: 5, AQ: 4, AU: 4 },
    F:  { V: 4, AI: 5, AF: 4, AG: 4, AP: 3, AQ: 4, AU: 4 },
    G:  { V: 5, AI: 4, AF: 3, AG: 3, AP: 4, AQ: 2, AU: 5 },
    AD: { V: 4, AI: 3, AF: 4, AG: 5, AP: 5, AQ: 5, AU: 3 },
};

// 같은 축 다중 선택 규칙 (경고만, 차단하지 않음)
const SAME_AXIS_RULES = {
    'narration': { possible: true, icon: '🔴', note: '서술은 1개를 추천합니다. (M은 보조 레이어로 추가 가능)', recommended: 1, softException: 'M' },
    'tone':      { possible: true, icon: '🟡', note: '3개까지를 추천합니다. 그 이상은 품질을 보장할 수 없습니다.', recommended: 3 },
    'narrative': { possible: true, icon: '🟡', note: '관계 2 + 장르 2까지를 추천합니다. 그 이상은 품질을 보장할 수 없습니다.', recommended: 4 },
    'world':     { possible: true, icon: '🟡', note: '배경 2 + 구조 2까지를 추천합니다.', recommended: 4 },
    'mode':      { possible: true, icon: '✅', note: '모드는 자유롭게 겹침 가능.' },
};

// ── 축 ID 분류 (조합 분석용) ──
const AXIS_NARRATION     = ['K', 'L', 'M', 'N', 'O', 'P', 'R', 'S'];
const AXIS_TONE          = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'J', 'T', 'AD', 'AH', 'AL', 'AR'];
// AN은 톤에서 서사/장르로 이동
const AXIS_NARRATIVE_REL = ['U', 'X', 'AA', 'AB'];
const AXIS_NARRATIVE_GEN = ['H', 'AE', 'AJ', 'AT', 'AN'];
const AXIS_WORLD_BG      = ['V', 'AF', 'AI', 'AM', 'AP'];
const AXIS_WORLD_ST      = ['I', 'Q', 'AG', 'AQ', 'AU', 'W', 'AC', 'AO'];
// AT, AJ는 세계관에서 서사로 이동
const AXIS_MODE          = ['AK', 'AS'];

const AXIS_MAP = {
    '서술':     AXIS_NARRATION,
    '톤':       AXIS_TONE,
    '서사/관계': AXIS_NARRATIVE_REL,
    '서사/장르': AXIS_NARRATIVE_GEN,
    '세계/배경': AXIS_WORLD_BG,
    '세계/구조': AXIS_WORLD_ST,
    '모드':     AXIS_MODE,
};

// backward compat (used in updatePromptInjection etc.)
const AXIS_FORMAT = AXIS_NARRATION;
const AXIS_GENRE  = [...AXIS_NARRATIVE_REL, ...AXIS_NARRATIVE_GEN];
const AXIS_WORLD  = [...AXIS_WORLD_BG, ...AXIS_WORLD_ST];

// 마찰 조합을 빠르게 확인하기 위한 시그니처 Set
const FRICTION_SIGNATURES = new Set(
    FRICTION_COMBOS.map(f => [...f.ids].sort().join('|'))
);

// 스타일 이름 조회 헬퍼
function getStyleName(id) {
    const info = STYLE_DESCRIPTIONS[id];
    return info ? info.name : id;
}

// =====================================================================
// § 3. 데이터 로드 & 저장
// =====================================================================
async function loadData() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
    }
    const settings = extension_settings[EXTENSION_NAME];
    try {
        const response = await fetch(`${extensionUrl}/data.json`);
        if (response.ok) {
            styleData = await response.json();
        }
    } catch (error) {
        console.error(`[ascde] data.json 로드 실패:`, error);
    }
    if (Array.isArray(settings.activeStyles)) {
        activeStyles = new Set(settings.activeStyles);
    }
}

function saveActiveStyles() {
    extension_settings[EXTENSION_NAME].activeStyles = Array.from(activeStyles);
    saveSettingsDebounced();
}

// =====================================================================
// § 4. 모달 열기/닫기
// =====================================================================
function openModal() {
    if ($('#style-combinator-modal-overlay').length > 0) return;

    const overlay = $('<div id="style-combinator-modal-overlay"></div>');
    const modal   = $('<div id="style-combinator-modal"></div>');
    const closeBtn = $('<button id="style-combinator-modal-close" aria-label="닫기">&times;</button>');

    closeBtn.on('click', closeModal);
    overlay.on('click', (e) => { if (e.target === overlay[0]) closeModal(); });

    modal.append(closeBtn);
    renderModalContent(modal);
    overlay.append(modal);
    $('body').append(overlay);
}

function closeModal() {
    $('#style-combinator-modal-overlay').remove();
    updateActiveSummary();
}

// =====================================================================
// § 5. 모달 콘텐츠 렌더링
// =====================================================================
function renderModalContent(modal) {
    modal.append(`<h2 class="sc-modal-title">📚 문체 교차 조합 매뉴얼</h2>`);

    // 탭 바
    const tabBar = $(`<div class="sc-tab-bar">
        <button class="sc-tab active" data-tab="select">문체 선택</button>
        <button class="sc-tab" data-tab="recommend">추천 조합</button>
    </div>`);
    modal.append(tabBar);

    // 탭 1: 문체 선택
    const tabSelect = $('<div class="sc-tab-content" data-tab="select"></div>');
    renderSelectTab(tabSelect);
    modal.append(tabSelect);

    // 탭 2: 추천 조합
    const tabRecommend = $('<div class="sc-tab-content" data-tab="recommend" style="display:none;"></div>');
    renderRecommendTab(tabRecommend);
    modal.append(tabRecommend);

    // 탭 전환 이벤트
    tabBar.find('.sc-tab').on('click', function () {
        const target = $(this).data('tab');
        tabBar.find('.sc-tab').removeClass('active');
        $(this).addClass('active');
        modal.find('.sc-tab-content').hide();
        modal.find(`.sc-tab-content[data-tab="${target}"]`).show();
    });
}

// =====================================================================
// § 6. 탭 1 — 문체 선택
// =====================================================================
function renderSelectTab(container) {
    // 문체 정보 패널 (클릭 시 표시)
    const infoPanel = $('<div id="style-info-panel" class="sc-info-panel" style="display:none;"></div>');
    container.append(infoPanel);

    // 축별 버튼
    if (styleData.axes && styleData.axes.length > 0) {
        styleData.axes.forEach(axis => {
            const axisDiv = $(`<div class="style-axis" data-axis="${axis.id}"></div>`);
            axisDiv.append(`<h4 class="sc-axis-title">${axis.name}</h4>`);

            const btnContainer = $('<div class="style-buttons"></div>');
            const stylesInAxis = styleData.styles.filter(s => s.axis === axis.id);

            stylesInAxis.forEach(style => {
                const isActive = activeStyles.has(style.id) ? 'active_style' : '';
                const info = STYLE_DESCRIPTIONS[style.id];
                const shortDesc = info ? info.desc : (style.description || '');
                const btn = $(`<button class="style-toggle ${isActive}" data-id="${style.id}" title="${shortDesc}">${style.id}. ${style.name}</button>`);
                btn.on('click', () => toggleStyle(style, axis.type, btn));
                btnContainer.append(btn);
            });

            axisDiv.append(btnContainer);
            container.append(axisDiv);
        });
    }

    // 조합 분석 패널
    const analysisPanel = $('<div id="combination-analysis-panel" class="sc-analysis-panel"></div>');
    container.append(analysisPanel);

    // 프롬프트 프리뷰
    const previewPanel = $(`<div class="sc-preview-panel">
        <h4 class="sc-preview-title">🔍 실시간 프롬프트 프리뷰</h4>
        <div id="style-combinator-preview" class="sc-preview-content">선택된 문체가 없습니다.</div>
    </div>`);
    container.append(previewPanel);

    // 초기 상태 업데이트
    analyzeCombination();
    updatePromptInjection();
}

// =====================================================================
// § 7. 탭 2 — 추천 조합
// =====================================================================
function renderRecommendTab(container) {
    container.append('<h3 class="sc-section-title">🎯 취향별 추천 조합</h3>');

    // 카테고리 탭
    const catBar = $('<div class="sc-cat-bar"></div>');
    Object.keys(PRESET_RECOMMENDATIONS).forEach((cat, i) => {
        const btn = $(`<button class="sc-cat-tab${i === 0 ? ' active' : ''}" data-cat="${cat}">${cat}</button>`);
        catBar.append(btn);
    });
    container.append(catBar);

    // 카테고리 콘텐츠
    const catContent = $('<div id="sc-cat-content"></div>');
    container.append(catContent);
    renderPresetCategory(catContent, activePresetTab);

    catBar.find('.sc-cat-tab').on('click', function () {
        catBar.find('.sc-cat-tab').removeClass('active');
        $(this).addClass('active');
        activePresetTab = $(this).data('cat');
        renderPresetCategory(catContent, activePresetTab);
    });

    // 시너지 ★★★★★ 표
    container.append('<h3 class="sc-section-title" style="margin-top:20px;">★★★★★ 시너지 조합</h3>');
    const synergyTable = buildComboTable(
        SYNERGY_COMBOS.map(c => ({ ids: c.ids, note: c.description })),
        'synergy'
    );
    container.append(synergyTable);

    // 의도적 마찰 표
    container.append('<h3 class="sc-section-title" style="margin-top:20px;">⚡ 의도적 마찰</h3>');
    const frictionTable = buildComboTable(
        FRICTION_COMBOS.map(c => ({ ids: c.ids, note: c.effect })),
        'friction'
    );
    container.append(frictionTable);

    // 비추천 표
    container.append('<h3 class="sc-section-title" style="margin-top:20px;">⚠ 비추천 조합</h3>');
    const badTable = buildComboTable(
        NON_RECOMMENDED.map(c => ({ ids: c.ids, note: c.reason })),
        'bad'
    );
    container.append(badTable);
}

function renderPresetCategory(container, cat) {
    container.empty();
    const presets = PRESET_RECOMMENDATIONS[cat] || [];
    const grid = $('<div class="sc-preset-grid"></div>');
    presets.forEach(preset => {
        const card = $(`<div class="sc-preset-card" role="button" tabindex="0">
            <div class="sc-preset-label">${preset.label}</div>
            <div class="sc-preset-desc">${preset.desc}</div>
        </div>`);
        card.on('click', () => applyPreset(preset.ids));
        card.on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyPreset(preset.ids); } });
        grid.append(card);
    });
    container.append(grid);
}

function applyPreset(ids) {
    activeStyles = new Set(ids);
    saveActiveStyles();
    // 버튼 상태 갱신
    $('#style-combinator-modal .style-toggle').each(function () {
        const id = $(this).data('id');
        if (activeStyles.has(id)) {
            $(this).addClass('active_style');
        } else {
            $(this).removeClass('active_style');
        }
    });
    analyzeCombination();
    updatePromptInjection();
    updateActiveSummary();
    // 문체 선택 탭으로 이동
    $('#style-combinator-modal .sc-tab[data-tab="select"]').trigger('click');
}

function buildComboTable(items, type) {
    const table = $('<table class="sc-combo-table"></table>');
    const thead = $('<thead><tr><th>조합</th><th>설명</th></tr></thead>');
    const tbody = $('<tbody></tbody>');
    items.forEach(item => {
        const label = item.ids.join(' + ');
        const tr = $(`<tr class="sc-combo-row sc-combo-${type}">
            <td class="sc-combo-ids">${label}</td>
            <td class="sc-combo-note">${item.note}</td>
        </tr>`);
        tbody.append(tr);
    });
    table.append(thead, tbody);
    return table;
}

// =====================================================================
// § 8. 스타일 토글 & 정보 패널 표시
// =====================================================================
function toggleStyle(style, axisType, btnElement) {
    if (activeStyles.has(style.id)) {
        activeStyles.delete(style.id);
        btnElement.removeClass('active_style');
    } else {
        activeStyles.add(style.id);
        btnElement.addClass('active_style');
    }
    saveActiveStyles();
    showStyleInfo(style);
    analyzeCombination();
    updatePromptInjection();
    updateActiveSummary();
}

function showStyleInfo(style) {
    const panel = $('#style-info-panel');
    if (!panel.length) return;

    const info = STYLE_DESCRIPTIONS[style.id];
    const name = info ? info.name : style.name;
    const axisName = info ? info.axisName : '';
    const desc = info ? info.desc : (style.description || '');

    let html = `<div class="sc-info-header">
        <span class="sc-info-id">${style.id}</span>
        <span class="sc-info-name">${name}</span>
        <span class="sc-info-axis-badge">${axisName}</span>
        <button class="sc-info-close" aria-label="닫기">&times;</button>
    </div>`;
    html += `<div class="sc-info-desc">${desc}</div>`;

    // 시너지 조합
    const synergies = SYNERGY_COMBOS.filter(c => c.ids.includes(style.id));
    if (synergies.length > 0) {
        html += `<div class="sc-info-row synergy-row"><span class="sc-info-row-label">★ 추천</span>`;
        html += synergies.map(c =>
            `<span class="sc-combo-tag sc-tag-synergy">${c.ids.join('+')} <em>${c.description}</em></span>`
        ).join('');
        html += `</div>`;
    }

    // 의도적 마찰
    const frictions = FRICTION_COMBOS.filter(c => c.ids.includes(style.id));
    if (frictions.length > 0) {
        html += `<div class="sc-info-row friction-row"><span class="sc-info-row-label">⚡ 마찰</span>`;
        html += frictions.map(c =>
            `<span class="sc-combo-tag sc-tag-friction">${c.ids.join('+')} <em>${c.effect}</em></span>`
        ).join('');
        html += `</div>`;
    }

    // 비추천
    const bads = NON_RECOMMENDED.filter(c => c.ids.includes(style.id));
    if (bads.length > 0) {
        html += `<div class="sc-info-row bad-row"><span class="sc-info-row-label">⚠ 비추천</span>`;
        html += bads.map(c =>
            `<span class="sc-combo-tag sc-tag-bad">${c.ids.join('+')} <em>${c.reason}</em></span>`
        ).join('');
        html += `</div>`;
    } else {
        html += `<div class="sc-info-row"><span class="sc-info-row-label">⚠ 비추천</span><span class="sc-no-data">없음</span></div>`;
    }

    panel.html(html).show();
    panel.find('.sc-info-close').on('click', () => panel.hide());
}

// =====================================================================
// § 9. 조합 분석
// =====================================================================
function analyzeCombination() {
    const panel = $('#combination-analysis-panel');
    if (!panel.length) return;

    const active = Array.from(activeStyles);

    if (active.length === 0) {
        panel.html('').hide();
        return;
    }

    if (active.length === 1) {
        const id = active[0];
        const info = STYLE_DESCRIPTIONS[id];
        panel.html(`<div class="sc-analysis-single">💡 <strong>${id}${info ? '. ' + getStyleName(id) : ''}</strong> 선택됨. 다른 문체를 추가하면 조합 분석이 표시됩니다.</div>`).show();
        return;
    }

    // 조합 표기식
    const expression = active.join(' + ');
    const nameExpression = active.map(getStyleName).join(' + ');

    // 축별 분류 (모듈 레벨 상수 사용)
    const axisParts = [];
    Object.entries(AXIS_MAP).forEach(([label, ids]) => {
        const matched = active.filter(id => ids.includes(id)).map(getStyleName);
        if (matched.length > 0) axisParts.push(`${label}: ${matched.join(', ')}`);
    });

    let html = `<div class="sc-analysis-wrap">`;
    html += `<div class="sc-analysis-expr"><strong>${expression}</strong> = ${nameExpression}</div>`;
    if (axisParts.length > 0) {
        html += `<div class="sc-analysis-axes">${axisParts.join(' / ')}</div>`;
    }

    let messages = [];

    // ── 시너지 테이블 점수 표시 (톤×서사, 톤×세계) ──
    const activeTones  = active.filter(id => AXIS_TONE.includes(id));
    const activeGenres = active.filter(id => AXIS_GENRE.includes(id));
    const activeWorlds = active.filter(id => AXIS_WORLD.includes(id));

    const renderStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    activeTones.forEach(tone => {
        activeGenres.forEach(genre => {
            const score = SYNERGY_TABLE_II_III[tone] && SYNERGY_TABLE_II_III[tone][genre];
            if (score !== undefined) {
                const cls = score >= 4 ? 'sc-msg-synergy' : score >= 3 ? 'sc-msg-hint' : 'sc-msg-warn';
                messages.push(`<div class="sc-analysis-msg ${cls}">${renderStars(score)} ${tone}(${getStyleName(tone)}) × ${genre}(${getStyleName(genre)})</div>`);
            }
        });
        activeWorlds.forEach(world => {
            const score = SYNERGY_TABLE_II_IV[tone] && SYNERGY_TABLE_II_IV[tone][world];
            if (score !== undefined) {
                const cls = score >= 4 ? 'sc-msg-synergy' : score >= 3 ? 'sc-msg-hint' : 'sc-msg-warn';
                messages.push(`<div class="sc-analysis-msg ${cls}">${renderStars(score)} ${tone}(${getStyleName(tone)}) × ${world}(${getStyleName(world)})</div>`);
            }
        });
    });

    // ── 알려진 시너지 조합 확인 (테이블 미포함 조합) ──
    SYNERGY_COMBOS.forEach(s => {
        if (s.ids.every(id => active.includes(id))) {
            // 이미 테이블에서 표시된 쌍은 건너뜀
            const alreadyShown = s.ids.length === 2 && (
                (AXIS_TONE.includes(s.ids[0]) && AXIS_GENRE.includes(s.ids[1])) ||
                (AXIS_TONE.includes(s.ids[1]) && AXIS_GENRE.includes(s.ids[0])) ||
                (AXIS_TONE.includes(s.ids[0]) && AXIS_WORLD.includes(s.ids[1])) ||
                (AXIS_TONE.includes(s.ids[1]) && AXIS_WORLD.includes(s.ids[0]))
            );
            if (!alreadyShown) {
                messages.push(`<div class="sc-analysis-msg sc-msg-synergy">★★★★★ 시너지: ${s.ids.join('+')} — ${s.description}</div>`);
            }
        }
    });

    // ── 비추천 확인 (마찰인 경우 마찰 우선 — O(1) 조회) ──
    NON_RECOMMENDED.forEach(b => {
        if (b.ids.every(id => active.includes(id))) {
            const sig = [...b.ids].sort().join('|');
            if (!FRICTION_SIGNATURES.has(sig)) {
                messages.push(`<div class="sc-analysis-msg sc-msg-bad">⚠ 비추천: ${b.ids.join('+')} — ${b.reason}</div>`);
            }
        }
    });

    // ── 의도적 마찰 확인 ──
    FRICTION_COMBOS.forEach(f => {
        if (f.ids.every(id => active.includes(id))) {
            messages.push(`<div class="sc-analysis-msg sc-msg-friction">⚡ 의도적 마찰: ${f.ids.join('+')} — ${f.effect}</div>`);
        }
    });

    // ── 같은 축 중복 경고 (추천 개수 초과 시 경고만, 차단하지 않음) ──
    if (styleData.axes) {
        styleData.axes.forEach(axis => {
            const rule = SAME_AXIS_RULES[axis.id];
            if (!rule || !rule.recommended) return; // 추천 제한 없는 축(모드 등)은 건너뜀
            const inAxis = active.filter(id => {
                const found = styleData.styles.find(s => s.id === id);
                return found && found.axis === axis.id;
            });
            if (inAxis.length <= 1) return;

            // 서술 축 소프트 예외: M(메타픽션)은 보조 레이어로 허용
            if (rule.softException) {
                const nonException = inAxis.filter(id => id !== rule.softException);
                if (nonException.length <= rule.recommended) return;
            }

            if (inAxis.length > rule.recommended) {
                let detail = '';
                if (axis.id === 'narrative') {
                    const relCount = inAxis.filter(id => AXIS_NARRATIVE_REL.includes(id)).length;
                    const genCount = inAxis.filter(id => AXIS_NARRATIVE_GEN.includes(id)).length;
                    detail = ` (관계 ${relCount}개, 장르 ${genCount}개)`;
                }
                messages.push(`<div class="sc-analysis-msg sc-msg-warn">⚠️ [${axis.name}] 축에서 ${inAxis.length}개 선택${detail} — ${rule.note}</div>`);
            }
        });
    }

    // 생략 축 기본값 안내
    const hasFormat = active.some(id => AXIS_NARRATION.includes(id));
    const hasWorld  = active.some(id => AXIS_WORLD.includes(id));
    const hints = [];
    if (!hasFormat) hints.push('서술: 톤(베이스)의 기본 형식 적용');
    if (!hasWorld)  hints.push('세계: 캐릭터 월드인포 기본 적용');
    if (hints.length > 0) {
        messages.push(`<div class="sc-analysis-msg sc-msg-hint">💡 ${hints.join(' / ')}</div>`);
    }

    if (messages.length > 0) html += messages.join('');
    html += `</div>`;

    panel.html(html).show();
}

// =====================================================================
// § 10. 프롬프트 주입 & 요약 업데이트
// =====================================================================

// 섹션 dedup 유사도 임계값
const SIMILARITY_THRESHOLD_HIGH = 0.7; // 이 이상이면 공통 줄만 남기고 차이점 태그 처리
const SIMILARITY_THRESHOLD_LOW  = 0.3; // 이 이상이면 BASE/OVERLAY 태그 구분, 미만이면 둘 다 그대로

/**
 * prompt_payload 문자열에서 MODULE_1~8 블록을 파싱합니다.
 * 각 블록은 `## <MODULE_N: ...>` 또는 `<MODULE_N: ...>` 으로 시작하고
 * `</MODULE_N>` 으로 끝납니다.
 * @param {string} promptPayload
 * @returns {{ modules: Object.<number, string>, preamble: string }}
 */
function parseModules(promptPayload) {
    const modules = {};
    const regex = /(?:##\s*)?<MODULE_(\d+)[^>]*>[\s\S]*?<\/MODULE_\1>/g;
    let match;
    while ((match = regex.exec(promptPayload)) !== null) {
        const num = parseInt(match[1]);
        modules[num] = match[0];
    }

    // MODULE 태그 이전에 오는 ROLE_AND_PERSONA / CORE_DIRECTIVES 등의 전문(preamble) 추출
    const firstModuleIdx = promptPayload.search(/(?:##\s*)?<MODULE_\d+/);
    const preamble = firstModuleIdx > 0 ? promptPayload.slice(0, firstModuleIdx).trim() : '';

    return { modules, preamble };
}

/**
 * 마크다운 `###` 헤딩으로 텍스트를 섹션 배열로 분리합니다.
 * @param {string} text
 * @returns {Array.<{heading: string, body: string}>}
 */
function parseSections(text) {
    const sections = [];
    const regex = /^###\s+(.+)$/gm;
    let match;
    const positions = [];

    while ((match = regex.exec(text)) !== null) {
        positions.push({ heading: match[1].trim(), start: match.index, headEnd: regex.lastIndex });
    }

    positions.forEach((pos, i) => {
        const bodyStart = pos.headEnd;
        const bodyEnd = i + 1 < positions.length ? positions[i + 1].start : text.length;
        sections.push({
            heading: pos.heading,
            body: text.slice(bodyStart, bodyEnd).trim()
        });
    });

    // ### 헤딩이 없는 텍스트 앞부분도 캡처 (preamble)
    if (positions.length > 0 && positions[0].start > 0) {
        const preamble = text.slice(0, positions[0].start).trim();
        if (preamble) {
            sections.unshift({ heading: '__preamble__', body: preamble });
        }
    } else if (positions.length === 0) {
        // ### 헤딩이 전혀 없으면 전체를 하나의 섹션으로
        sections.push({ heading: '__full__', body: text.trim() });
    }

    return sections;
}

/**
 * 두 섹션 body의 줄 단위 Jaccard 유사도를 반환합니다.
 * @param {string} bodyA
 * @param {string} bodyB
 * @returns {number} 0~1
 */
function sectionSimilarity(bodyA, bodyB) {
    const linesA = new Set(bodyA.split('\n').map(l => l.trim()).filter(Boolean));
    const linesB = new Set(bodyB.split('\n').map(l => l.trim()).filter(Boolean));

    let intersection = 0;
    linesA.forEach(line => { if (linesB.has(line)) intersection++; });

    const union = new Set([...linesA, ...linesB]).size;
    return union === 0 ? 1 : intersection / union;
}

/**
 * 두 섹션 body의 공통 줄과 각각에만 있는 줄을 분리합니다.
 * @param {string} bodyA
 * @param {string} bodyB
 * @returns {{ common: string[], onlyBase: string[], onlyOverlay: string[] }}
 */
function diffLines(bodyA, bodyB) {
    const linesA = bodyA.split('\n').map(l => l.trim()).filter(Boolean);
    const linesB = bodyB.split('\n').map(l => l.trim()).filter(Boolean);
    const setB = new Set(linesB);
    const setA = new Set(linesA);

    return {
        common:      Array.from(new Set(linesA.filter(l => setB.has(l)))),
        onlyBase:    linesA.filter(l => !setB.has(l)),
        onlyOverlay: linesB.filter(l => !setA.has(l)),
    };
}

/**
 * overlay 섹션 배열에서 baseSec과 매칭되는 섹션을 찾습니다.
 * 정확한 헤딩 → 헤딩 번호 순으로 매칭합니다.
 * @param {{heading: string, body: string}} baseSec
 * @param {Array.<{heading: string, body: string}>} overlaySections
 * @returns {{heading: string, body: string}|null}
 */
function findMatchingSection(baseSec, overlaySections) {
    // 1. 정확한 헤딩 매칭
    const exact = overlaySections.find(s => s.heading === baseSec.heading);
    if (exact) return exact;

    // 2. 헤딩 번호 매칭 (예: "1. 시점 구성" vs "1. 시점 설정")
    const baseNum = baseSec.heading.match(/^(\d+)\./);
    if (baseNum) {
        const numMatch = overlaySections.find(s => {
            const m = s.heading.match(/^(\d+)\./);
            return m && m[1] === baseNum[1];
        });
        if (numMatch) return numMatch;
    }

    return null;
}

/**
 * 같은 MODULE에 속하는 복수 entry의 내용을 섹션 단위 Jaccard dedup으로 병합합니다.
 * @param {Array.<{source: string, axis: string, role: string, content: string}>} entries
 * @returns {string}
 */
function deduplicateModuleSections(entries) {
    if (entries.length <= 1) return entries[0]?.content || '';

    // 각 entry를 섹션으로 파싱
    const parsed = entries.map(e => ({
        ...e,
        sections: parseSections(e.content)
    }));

    const base = parsed[0];
    const overlays = parsed.slice(1);
    let result = '';

    // 이미 매칭된 overlay 섹션 추적
    const matchedOverlaySections = new Set();

    base.sections.forEach(baseSec => {
        if (baseSec.heading !== '__preamble__' && baseSec.heading !== '__full__') {
            result += `### ${baseSec.heading}\n`;
        }

        let hasMatch = false;
        overlays.forEach(ov => {
            const match = findMatchingSection(baseSec, ov.sections);
            if (match) {
                hasMatch = true;
                matchedOverlaySections.add(`${ov.source}::${match.heading}`);
                const sim = sectionSimilarity(baseSec.body, match.body);

                if (sim >= SIMILARITY_THRESHOLD_HIGH) {
                    // Case A: 거의 같다 → 공통만 남기고 차이 추가
                    const { common, onlyBase, onlyOverlay } = diffLines(baseSec.body, match.body);
                    result += common.join('\n') + '\n';
                    if (onlyBase.length > 0) {
                        result += onlyBase.map(l => `[+${base.source}] ${l}`).join('\n') + '\n';
                    }
                    if (onlyOverlay.length > 0) {
                        result += onlyOverlay.map(l => `[+${ov.source}] ${l}`).join('\n') + '\n';
                    }
                } else if (sim >= SIMILARITY_THRESHOLD_LOW) {
                    // Case B: 부분 겹침 → 태그 구분
                    result += `[BASE from ${base.source}]\n${baseSec.body}\n\n`;
                    result += `[OVERLAY from ${ov.source}]\n${match.body}\n\n`;
                } else {
                    // Case C: 완전히 다름 → 둘 다
                    result += `[from ${base.source}]\n` + baseSec.body + '\n\n';
                    result += `### ${match.heading} [from ${ov.source}]\n`;
                    result += match.body + '\n\n';
                }
            }
        });

        if (!hasMatch) {
            result += baseSec.body + '\n\n';
        }
    });

    // overlay에만 있는 섹션 추가
    overlays.forEach(ov => {
        ov.sections.forEach(ovSec => {
            const key = `${ov.source}::${ovSec.heading}`;
            if (!matchedOverlaySections.has(key) && ovSec.heading !== '__preamble__' && ovSec.heading !== '__full__') {
                result += `### ${ovSec.heading} [+${ov.source}]\n`;
                result += ovSec.body + '\n\n';
            }
        });
    });

    return result.trim();
}

function updatePromptInjection() {
    const selected = Array.from(activeStyles)
        .map(id => styleData.styles.find(s => s.id === id))
        .filter(Boolean);

    let finalPrompt = '';
    if (selected.length > 0) {
        const toneStyles         = selected.filter(s => AXIS_TONE.includes(s.id));
        const narrativeRelStyles = selected.filter(s => AXIS_NARRATIVE_REL.includes(s.id));
        const narrativeGenStyles = selected.filter(s => AXIS_NARRATIVE_GEN.includes(s.id));
        const narrationStyles    = selected.filter(s => AXIS_NARRATION.includes(s.id));
        const worldBgStyles      = selected.filter(s => AXIS_WORLD_BG.includes(s.id));
        const worldStStyles      = selected.filter(s => AXIS_WORLD_ST.includes(s.id));
        const modeStyles         = selected.filter(s => AXIS_MODE.includes(s.id));

        // 최종 모듈 맵: MODULE 번호 → 배열 of { source, axis, role, content }
        // role: 'base' | 'secondary' | 'overlay'
        let finalModules = {};
        let selfChecks = [];   // MODULE_8 병합용
        let modeBlocks = [];   // 모드 payload를 최상단에 추가
        let basePreamble = ''; // 톤(베이스)의 전문

        // 헬퍼: 모듈 추가
        function addModule(num, source, axis, role, content) {
            if (!finalModules[num]) finalModules[num] = [];
            finalModules[num].push({ source, axis, role, content });
        }

        // STEP 1: 톤 = 베이스 (MODULE_1~7 전부)
        toneStyles.forEach((s, idx) => {
            const { modules, preamble } = parseModules(s.prompt_payload);
            if (preamble && !basePreamble) basePreamble = preamble;
            const role = idx === 0 ? 'base' : 'secondary';
            const hasParsedModules = Object.keys(modules).length > 0;
            if (hasParsedModules) {
                Object.entries(modules).forEach(([num, content]) => {
                    num = parseInt(num);
                    if (num === 8) {
                        selfChecks.push({ source: s.id, content });
                    } else {
                        addModule(num, s.id, 'II', role, content);
                    }
                });
            } else {
                addModule(1, s.id, 'II', role, s.prompt_payload);
            }
        });

        // STEP 2: 서사(관계/장르) → MODULE_1(VOICE) + MODULE_4(CAUSALITY) (overlay)
        [...narrativeRelStyles, ...narrativeGenStyles].forEach(s => {
            const { modules } = parseModules(s.prompt_payload);
            const hasParsedModules = Object.keys(modules).length > 0;
            if (hasParsedModules) {
                if (modules[1]) addModule(1, s.id, 'narrative', 'overlay', modules[1]);
                if (modules[4]) addModule(4, s.id, 'narrative', 'overlay', modules[4]);
                if (modules[8]) selfChecks.push({ source: s.id, content: modules[8] });
            } else {
                addModule(1, s.id, 'narrative', 'overlay', s.prompt_payload);
            }
        });

        // STEP 3: 서술 → MODULE_2(PROSE) + MODULE_7(FORMATTING) (overlay)
        narrationStyles.forEach(s => {
            const { modules } = parseModules(s.prompt_payload);
            const hasParsedModules = Object.keys(modules).length > 0;
            if (hasParsedModules) {
                if (modules[2]) addModule(2, s.id, 'narration', 'overlay', modules[2]);
                if (modules[7]) addModule(7, s.id, 'narration', 'overlay', modules[7]);
                if (modules[8]) selfChecks.push({ source: s.id, content: modules[8] });
            } else {
                addModule(2, s.id, 'narration', 'overlay', s.prompt_payload);
            }
        });

        // STEP 4: 세계(배경/구조) → MODULE_1 + MODULE_3 + MODULE_6 (overlay)
        [...worldBgStyles, ...worldStStyles].forEach(s => {
            const { modules } = parseModules(s.prompt_payload);
            const hasParsedModules = Object.keys(modules).length > 0;
            if (hasParsedModules) {
                if (modules[1]) addModule(1, s.id, 'world', 'overlay', modules[1]);
                if (modules[3]) addModule(3, s.id, 'world', 'overlay', modules[3]);
                if (modules[6]) addModule(6, s.id, 'world', 'overlay', modules[6]);
                if (modules[8]) selfChecks.push({ source: s.id, content: modules[8] });
            } else {
                addModule(3, s.id, 'world', 'overlay', s.prompt_payload);
            }
        });

        // STEP 5: 모드 → 최상단 추가
        modeStyles.forEach(s => {
            const { modules } = parseModules(s.prompt_payload);
            modeBlocks.push(s.prompt_payload);
            if (modules[8]) selfChecks.push({ source: s.id, content: modules[8] });
        });

        // ── 최종 프롬프트 조립 ──
        finalPrompt = '### [COMBINED LITERARY ROLEPLAY ENGINE]\n\n';

        finalPrompt += '## BUILD ORDER & PRIORITY\n';
        finalPrompt += '충돌 시 우선순위: 모드(⑤) > 서사(③) > 톤(②) > 서술(①) > 세계(④)\n';
        finalPrompt += 'Supreme Rule: 캐릭터 진실성이 모든 것 위에 있습니다.\n';
        finalPrompt += '같은 축에서 복수 선택 시: 먼저 선택된 것이 기본(BASE), 나중 것이 보조(SECONDARY).\n';
        finalPrompt += '서로 다른 축의 같은 모듈이 충돌하면, 우선순위가 높은 축의 규칙을 따르되 다른 축의 고유한 규칙도 가능한 한 반영합니다.\n\n';

        finalPrompt += '## CONFLICT RESOLUTION\n';
        finalPrompt += '- 비유 허용/금지 충돌 → 서사 우선\n';
        finalPrompt += '- 감정 명명 충돌 → 서사 우선\n';
        finalPrompt += '- 시제 충돌 → 서술 우선\n';
        finalPrompt += '- FID 비율 충돌 → 높은 쪽 채택\n';
        finalPrompt += '- 감각 우선순위 → 세계 > 톤 > 기본값\n';
        finalPrompt += '- 문단 길이 → 긴 쪽 상한, 짧은 쪽 하한\n';
        finalPrompt += '- 대사 길이 → 짧은 쪽 채택\n\n';

        finalPrompt += '## COMPOSITION METHODS\n';
        finalPrompt += '- 톤 복수 선택: blend (문장 단위에서 섞임. 주 톤이 구조, 부 톤이 변조)\n';
        finalPrompt += '- 서사/관계 복수: layer (주 관계가 공식 역학, 부 관계가 이면)\n';
        finalPrompt += '- 서사/장르 복수: alternate (장면별 교대. 긴장도 변화 기준)\n';
        finalPrompt += '- 서사 관계+장르: layer (장르가 기반, 관계가 위에 얹힘)\n';
        finalPrompt += '- 세계/배경 복수: blend (두 세계관 요소가 자연스럽게 혼합)\n';
        finalPrompt += '- 세계/구조 복수: layer (주 구조가 기본 틀, 부 구조가 추가 규칙)\n';
        finalPrompt += '- 모드: layer (항상 모든 것 위에 얹힘)\n\n';

        // 모드 레이어 (최상단)
        if (modeBlocks.length > 0) {
            finalPrompt += '## SUPREME LAYER — MODE\n';
            modeBlocks.forEach(block => {
                finalPrompt += block + '\n\n';
            });
        }

        // 베이스(톤)의 전문 (ROLE_AND_PERSONA / CORE_DIRECTIVES)
        if (basePreamble) {
            finalPrompt += '## BASE PREAMBLE\n';
            finalPrompt += basePreamble + '\n\n';
        }

        // MODULE_1~7 순서대로 출력 (같은 번호에 복수 출처 있으면 모두 포함)
        const MODULE_NAMES = {
            1: 'VOICE', 2: 'PROSE', 3: 'NPC_COGNITIVE_MODEL',
            4: 'CAUSALITY', 5: 'DIALOGUE', 6: 'SPECIFICITY', 7: 'FORMATTING'
        };

        for (let i = 1; i <= 7; i++) {
            const entries = finalModules[i];
            if (!entries || entries.length === 0) continue;

            finalPrompt += `## MODULE_${i}: ${MODULE_NAMES[i]}\n\n`;

            if (entries.length === 1) {
                // 단일 entry는 그대로
                finalPrompt += entries[0].content + '\n\n';
            } else {
                // 복수 entry → dedup 적용
                finalPrompt += deduplicateModuleSections(entries) + '\n\n';
            }
        }

        // MODULE_8: 모든 선택 버전의 SELF_CHECK 병합
        if (selfChecks.length > 0) {
            finalPrompt += '## MODULE_8: MERGED SELF_CHECK\n';
            selfChecks.forEach(sc => {
                finalPrompt += `<!-- from ${sc.source} -->\n${sc.content}\n\n`;
            });
        }

        // 폴백: 톤도 없고 파싱된 모듈도 없는 경우 기존 레이어 방식으로 출력
        if (toneStyles.length === 0 && Object.keys(finalModules).length === 0 && modeBlocks.length === 0) {
            finalPrompt = '### [COMBINED LITERARY ROLEPLAY ENGINE]\n\n';
            selected.forEach(s => {
                finalPrompt += `<MODULE_OVERLAY: STYLE_${s.id}>\n${s.prompt_payload}\n</MODULE_OVERLAY>\n\n`;
            });
        }
    }

    if (typeof setExtensionPrompt === 'function') {
        const position = extension_prompt_types ? extension_prompt_types.IN_PROMPT : 0;
        setExtensionPrompt(EXTENSION_NAME, finalPrompt, position, 0);
    }

    $('#style-combinator-preview').text(finalPrompt || '선택된 문체가 없습니다.');
}

function updateActiveSummary() {
    const names = Array.from(activeStyles)
        .map(id => styleData.styles.find(s => s.id === id))
        .filter(Boolean)
        .map(s => s.name);
    const text = names.length > 0 ? `선택된 문체: ${names.join(', ')}` : '선택된 문체: 없음';
    $('#style-combinator-active-summary').text(text);
}

// =====================================================================
// § 11. 초기화
// =====================================================================
jQuery(async () => {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};

    try {
        const settingsHtml = await $.get(`${extensionUrl}/index.html`);
        $('#extensions_settings2').append(settingsHtml);
    } catch (error) {
        console.error(`[ascde] UI HTML 로드 실패:`, error);
        return;
    }

    $('#btn-open-style-combinator').on('click', openModal);

    await loadData();

    if (typeof setExtensionPrompt === 'function') {
        setExtensionPrompt(EXTENSION_NAME, '', extension_prompt_types.IN_PROMPT, 0);
    }

    if (activeStyles.size > 0) {
        updatePromptInjection();
    }
    updateActiveSummary();
});

