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
    // Ⅰ. 형식/시점
    K:  { name: '2인칭',          axisName: '형식/시점',   desc: '"당신은 ~했다" 형식. 독자를 주인공으로 끌어들이는 몰입형 서술.' },
    L:  { name: '디지털 네이티브', axisName: '형식/시점',   desc: '채팅+서술 하이브리드. SNS·메신저·이모지가 섞인 현대적 텍스트.' },
    M:  { name: '메타픽션',        axisName: '형식/시점',   desc: '서술이 서술을 의심. 화자가 독자와 대화하거나 장르를 해체.' },
    N:  { name: '미니멀리즘 극단', axisName: '형식/시점',   desc: '빠진 것이 더 많다. 침묵과 공백이 의미를 만드는 서술.' },
    O:  { name: '의식의 흐름 극단', axisName: '형식/시점',  desc: '쉼표로만 이어지는 문단. 내면의 흐름을 끊김 없이 서술.' },
    P:  { name: '다큐/르포',       axisName: '형식/시점',   desc: '논픽션으로 픽션을. 객관적 보고서 형식으로 이야기를 전달.' },
    R:  { name: '서간체/일기체',   axisName: '형식/시점',   desc: '편지·일기·메모 형식. 사적인 언어가 서사를 이끈다.' },
    S:  { name: '각본체',          axisName: '형식/시점',   desc: '지문과 대사만. 연극·영화 스크립트 형식의 서술.' },
    // Ⅱ. 톤/분위기
    A:  { name: '외부 관찰형',     axisName: '톤/분위기',   desc: '행동과 간극. 인물의 행동만 서술하고 내면은 독자가 추론.' },
    B:  { name: '내면 밀착형',     axisName: '톤/분위기',   desc: '의식=서술. 인물의 내면이 곧 텍스트. 극도의 주관성.' },
    C:  { name: '웜 코미디형',     axisName: '톤/분위기',   desc: '자각 지연, 따뜻한 유머. 어설픈 상황을 온기로 바라본다.' },
    D:  { name: '임상 건조형',     axisName: '톤/분위기',   desc: '해리적 정밀함. 감정 없는 언어로 쓰는 더 날카로운 감정.' },
    E:  { name: '감각 리얼리즘형', axisName: '톤/분위기',   desc: '감각의 편집. 촉각·후각·미각이 장면을 지배.' },
    F:  { name: '하드보일드',      axisName: '톤/분위기',   desc: '행동이 유일한 언어. 감정은 동사로만, 설명하지 않는다.' },
    G:  { name: '무드 피스',       axisName: '톤/분위기',   desc: '분위기가 주인공. 사건보다 감각과 정서가 이야기를 이끈다.' },
    J:  { name: '데카당스',        axisName: '톤/분위기',   desc: '탐미와 허무. 아름다움과 몰락이 공존하는 퇴폐적 서술.' },
    T:  { name: '고딕',            axisName: '톤/분위기',   desc: '공간이 인물. 장소가 심리를 반영하는 고딕 전통.' },
    AD: { name: '코미디 극단',     axisName: '톤/분위기',   desc: '건조한 슬랩스틱. 상황의 불합리성을 직접적으로 밀어붙인다.' },
    AH: { name: '부조리극',        axisName: '톤/분위기',   desc: '카프카적 비논리. 세계의 규칙이 이상하고 아무도 의문을 품지 않는다.' },
    AL: { name: '몽환/환상',       axisName: '톤/분위기',   desc: '꿈의 논리. 이미지가 과잉, 현실과 환상의 경계가 흐릿.' },
    AN: { name: '동화/우화',       axisName: '톤/분위기',   desc: '"옛날 옛적에". 동화 문법으로 쓰는 어른의 이야기.' },
    AR: { name: '일상물',          axisName: '톤/분위기',   desc: '사건 없는 서사. 평범한 하루의 질감을 정밀하게 포착.' },
    // Ⅲ. 관계/장르
    U:  { name: '감성 멜로',       axisName: '관계/장르',   desc: '예쁜 문장, 직접 감정. 감정이 표면에 드러나는 로맨스.' },
    X:  { name: '빌런 로맨스',     axisName: '관계/장르',   desc: '위험+매혹, 권력 비대칭. 선악의 경계에서 벌어지는 사랑.' },
    AA: { name: '치유물/힐링',     axisName: '관계/장르',   desc: '공존이 치유. 함께 있는 것만으로 상처가 아문다.' },
    AB: { name: '관능 문학',       axisName: '관계/장르',   desc: '신체가 감정을 말한다. 관능성으로 심리를 표현.' },
    H:  { name: '심리 스릴러',     axisName: '관계/장르',   desc: '신뢰할 수 없는 서술. 무엇이 진실인지 알 수 없다.' },
    AE: { name: '호러',            axisName: '관계/장르',   desc: '이상의 축적. 작은 균열들이 쌓여 공포가 된다.' },
    AJ: { name: '추리/미스터리',   axisName: '관계/장르',   desc: '단서, 유저 주도 추론. 독자가 직접 수수께끼를 푼다.' },
    // Ⅳ. 세계관/구조
    I:  { name: '군상극',          axisName: '세계관/구조', desc: '교차 편집. 여러 인물의 시선이 하나의 사건을 다각도로 조명.' },
    Q:  { name: '시간 루프',       axisName: '세계관/구조', desc: '반복과 변주. 같은 시간을 다르게 살며 변화를 기록.' },
    V:  { name: '판타지/사극',     axisName: '세계관/구조', desc: '의전, 전투, 정치. 다른 세계와 다른 시대의 규칙.' },
    W:  { name: '게임 서사',       axisName: '세계관/구조', desc: '스킬=내면, 판정. 게임 시스템이 이야기의 언어.' },
    AC: { name: '세계관 빌딩',     axisName: '세계관/구조', desc: '세계가 주인공. 디테일한 설정이 이야기를 만든다.' },
    AF: { name: '하드 SF',         axisName: '세계관/구조', desc: '과학이 플롯. 과학적 원리가 서사의 중심.' },
    AG: { name: '회귀/빙의물',     axisName: '세계관/구조', desc: '정보 비대칭, 정체성. 과거로 돌아가거나 다른 몸에 들어간다.' },
    AI: { name: '무협',            axisName: '세계관/구조', desc: '강호, 내공, 초식. 무협 세계의 언어와 미학.' },
    AM: { name: '포스트 아포칼립스', axisName: '세계관/구조', desc: '폐허, 생존, 자원. 문명 이후의 세계.' },
    AO: { name: '스포츠/경쟁',     axisName: '세계관/구조', desc: '신체의 한계, 경기 리듬. 승부의 언어.' },
    AP: { name: '직장물',          axisName: '세계관/구조', desc: '조직 정치, 메일의 전쟁. 직장 생존의 서사.' },
    AQ: { name: '먼치킨/역행자',   axisName: '세계관/구조', desc: '압도의 쾌감과 이면. 강한 주인공의 서사.' },
    AT: { name: '성장물',          axisName: '세계관/구조', desc: '"처음"의 서사. 시작과 변화, 첫 경험의 기록.' },
    AU: { name: '로드무비/여행',   axisName: '세계관/구조', desc: '이동이 서사. 여정 자체가 이야기.' },
    // Ⅴ. 모드
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

// ── 축 ID 분류 (조합 분석용) ──
const AXIS_FORMAT = ['K', 'L', 'M', 'N', 'O', 'P', 'R', 'S'];
const AXIS_TONE   = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'J', 'T', 'AD', 'AH', 'AL', 'AN', 'AR'];
const AXIS_GENRE  = ['U', 'X', 'AA', 'AB', 'H', 'AE', 'AJ'];
const AXIS_WORLD  = ['I', 'Q', 'V', 'W', 'AC', 'AF', 'AG', 'AI', 'AM', 'AO', 'AP', 'AQ', 'AT', 'AU'];
const AXIS_MODE   = ['AK', 'AS'];
const AXIS_MAP    = { '형식': AXIS_FORMAT, '톤': AXIS_TONE, '관계/장르': AXIS_GENRE, '세계관': AXIS_WORLD, '모드': AXIS_MODE };

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

    // 시너지 확인
    SYNERGY_COMBOS.forEach(s => {
        if (s.ids.every(id => active.includes(id))) {
            messages.push(`<div class="sc-analysis-msg sc-msg-synergy">★★★★★ 시너지: ${s.ids.join('+')} — ${s.description}</div>`);
        }
    });

    // 비추천 확인 (마찰인 경우 마찰 우선 — O(1) 조회)
    NON_RECOMMENDED.forEach(b => {
        if (b.ids.every(id => active.includes(id))) {
            const sig = [...b.ids].sort().join('|');
            if (!FRICTION_SIGNATURES.has(sig)) {
                messages.push(`<div class="sc-analysis-msg sc-msg-bad">⚠ 비추천: ${b.ids.join('+')} — ${b.reason}</div>`);
            }
        }
    });

    // 의도적 마찰 확인
    FRICTION_COMBOS.forEach(f => {
        if (f.ids.every(id => active.includes(id))) {
            messages.push(`<div class="sc-analysis-msg sc-msg-friction">⚡ 의도적 마찰: ${f.ids.join('+')} — ${f.effect}</div>`);
        }
    });

    // 같은 축 중복 경고
    if (styleData.axes) {
        styleData.axes.forEach(axis => {
            if (axis.id === 'V') return;
            const inAxis = active.filter(id => {
                const found = styleData.styles.find(s => s.id === id);
                return found && found.axis === axis.id;
            });
            if (inAxis.length > 1) {
                messages.push(`<div class="sc-analysis-msg sc-msg-warn">🟡 [${axis.name}] 축에서 ${inAxis.length}개 선택됨</div>`);
            }
        });
    }

    // 생략 축 기본값 안내
    const hasFormat = active.some(id => AXIS_FORMAT.includes(id));
    const hasWorld  = active.some(id => AXIS_WORLD.includes(id));
    const hints = [];
    if (!hasFormat) hints.push('형식 생략 = 기본 3인칭');
    if (!hasWorld)  hints.push('세계관 생략 = 현대 한국');
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
function updatePromptInjection() {
    const selected = Array.from(activeStyles)
        .map(id => styleData.styles.find(s => s.id === id))
        .filter(Boolean);

    let finalPrompt = '';
    if (selected.length > 0) {
        // 축별로 분류
        const toneStyles   = selected.filter(s => AXIS_TONE.includes(s.id));
        const genreStyles  = selected.filter(s => AXIS_GENRE.includes(s.id));
        const formatStyles = selected.filter(s => AXIS_FORMAT.includes(s.id));
        const worldStyles  = selected.filter(s => AXIS_WORLD.includes(s.id));
        const modeStyles   = selected.filter(s => AXIS_MODE.includes(s.id));

        finalPrompt = '### [COMBINED LITERARY ROLEPLAY ENGINE]\n\n';

        // 빌드 순서 & 우선순위 헤더
        finalPrompt += '## BUILD ORDER & PRIORITY\n';
        finalPrompt += '이 프롬프트는 축별 우선순위에 따라 구성되었습니다.\n';
        finalPrompt += '충돌 시 우선순위: 모드(Ⅴ) > 관계/장르(Ⅲ) > 톤(Ⅱ) > 형식(Ⅰ) > 세계관(Ⅳ)\n';
        finalPrompt += 'Supreme Rule: 캐릭터 진실성이 모든 것 위에 있습니다.\n\n';

        // 충돌 해결 규칙
        finalPrompt += '## CONFLICT RESOLUTION\n';
        finalPrompt += '- 비유 허용/금지 충돌 → 관계/장르 우선\n';
        finalPrompt += '- 감정 명명 충돌 → 관계/장르 우선\n';
        finalPrompt += '- 시제 충돌 → 형식 우선\n';
        finalPrompt += '- FID 비율 충돌 → 높은 쪽 채택\n';
        finalPrompt += '- 감각 우선순위 → 세계관 > 톤 > 기본값\n';
        finalPrompt += '- 문단 길이 → 긴 쪽 상한, 짧은 쪽 하한\n';
        finalPrompt += '- 대사 길이 → 짧은 쪽 채택\n\n';

        // LAYER 1: 톤 (베이스)
        if (toneStyles.length > 0) {
            finalPrompt += '## LAYER 1 — BASE TONE (기본 골격)\n';
            toneStyles.forEach(s => {
                finalPrompt += `<MODULE_OVERLAY: AXIS_II | STYLE_${s.id} | PRIORITY=BASE>\n${s.prompt_payload}\n</MODULE_OVERLAY>\n\n`;
            });
        }

        // LAYER 2: 관계/장르
        if (genreStyles.length > 0) {
            finalPrompt += '## LAYER 2 — GENRE OVERLAY (서사 방향)\n';
            genreStyles.forEach(s => {
                finalPrompt += `<MODULE_OVERLAY: AXIS_III | STYLE_${s.id} | PRIORITY=HIGH>\n${s.prompt_payload}\n</MODULE_OVERLAY>\n\n`;
            });
        }

        // LAYER 3: 형식
        if (formatStyles.length > 0) {
            finalPrompt += '## LAYER 3 — FORMAT OVERLAY (문장 리듬)\n';
            formatStyles.forEach(s => {
                finalPrompt += `<MODULE_OVERLAY: AXIS_I | STYLE_${s.id} | PRIORITY=MEDIUM>\n${s.prompt_payload}\n</MODULE_OVERLAY>\n\n`;
            });
        }

        // LAYER 4: 세계관
        if (worldStyles.length > 0) {
            finalPrompt += '## LAYER 4 — WORLD OVERLAY (세계관)\n';
            worldStyles.forEach(s => {
                finalPrompt += `<MODULE_OVERLAY: AXIS_IV | STYLE_${s.id} | PRIORITY=LOW>\n${s.prompt_payload}\n</MODULE_OVERLAY>\n\n`;
            });
        }

        // LAYER 5: 모드 (최상단)
        if (modeStyles.length > 0) {
            finalPrompt += '## LAYER 5 — MODE (최우선 레이어)\n';
            modeStyles.forEach(s => {
                finalPrompt += `<MODULE_OVERLAY: AXIS_V | STYLE_${s.id} | PRIORITY=SUPREME>\n${s.prompt_payload}\n</MODULE_OVERLAY>\n\n`;
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

