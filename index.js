import { extension_settings, getContext, loadExtensionSettings, setExtensionPrompt, extension_prompt_types } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const EXTENSION_NAME = 'ascde';
const extensionFolderPath = `scripts/extensions/third-party/${EXTENSION_NAME}`;
let styleData = { axes: [], rules: {}, recommendations: [], styles: [] };
let activeStyles = new Set();

// 데이터 로드 (설정 또는 data.json에서)
async function loadData() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
    }
    const settings = extension_settings[EXTENSION_NAME];

    if (settings.customData) {
        styleData = settings.customData;
    } else {
        try {
            const response = await fetch(`/${extensionFolderPath}/data.json`);
            if (!response.ok) throw new Error('Network response was not ok');
            styleData = await response.json();

            if (!extension_settings[EXTENSION_NAME]) {
                extension_settings[EXTENSION_NAME] = {};
            }
            extension_settings[EXTENSION_NAME].customData = styleData;
            saveSettingsDebounced();
        } catch (error) {
            console.error(`[Style Combinator] 데이터 로드 실패:`, error);
        }
    }

    // 저장된 activeStyles 복원
    if (Array.isArray(settings.activeStyles)) {
        activeStyles = new Set(settings.activeStyles);
    }
}

// 모달 열기
function openModal() {
    if ($('#style-combinator-modal-overlay').length > 0) return;

    const overlay = $('<div id="style-combinator-modal-overlay"></div>');
    const modal = $('<div id="style-combinator-modal"></div>');
    const closeBtn = $('<button id="style-combinator-modal-close">&times;</button>');

    closeBtn.on('click', closeModal);
    overlay.on('click', (e) => {
        if (e.target === overlay[0]) closeModal();
    });

    modal.append(closeBtn);
    renderModalContent(modal);
    overlay.append(modal);
    $('body').append(overlay);
}

// 모달 닫기
function closeModal() {
    $('#style-combinator-modal-overlay').remove();
    updateActiveSummary();
}

// 모달 내용 렌더링
function renderModalContent(modal) {
    const container = $(`<div id="style-combinator-container" class="style-combinator-ui"></div>`);
    container.append(`<h3>문체 교차 조합 매뉴얼 (45 버전)</h3>`);

    // 추천 조합 패널
    renderRecommendationsUI(container);

    // 상태 패널 (경고/시너지)
    container.append(`<div id="style-status-panel" style="margin-bottom:10px; padding:8px; display:none;"></div>`);

    // 축별 버튼 렌더링
    styleData.axes.forEach(axis => {
        const axisDiv = $(`<div class="style-axis" data-axis="${axis.id}"></div>`);
        axisDiv.append(`<h4>[${axis.name}]</h4>`);

        const btnContainer = $(`<div class="style-buttons"></div>`);
        const stylesInAxis = styleData.styles.filter(s => s.axis === axis.id);

        stylesInAxis.forEach(style => {
            const btn = $(`
                <button class="style-toggle menu_button" data-id="${style.id}" title="${style.description || ''}">
                    ${style.id}. ${style.name}
                </button>
            `);

            btn.on('click', () => toggleStyle(style, axis.type, btn));
            btn.on('contextmenu', (e) => {
                e.preventDefault();
                loadToEditor(style);
            });

            if (activeStyles.has(style.id)) btn.addClass('active_style');
            btnContainer.append(btn);
        });

        axisDiv.append(btnContainer);
        container.append(axisDiv);
    });

    modal.append(container);

    renderPreviewUI(modal);
    renderEditorUI(modal);
    checkCombinationRules();
    updatePromptInjection();
}

// 패널 요약 업데이트
function updateActiveSummary() {
    const names = Array.from(activeStyles)
        .map(id => styleData.styles.find(s => s.id === id))
        .filter(Boolean)
        .map(s => `${s.id}(${s.name})`);
    const text = names.length > 0 ? `선택된 문체: ${names.join(', ')}` : '선택된 문체: 없음';
    $('#style-combinator-active-summary').text(text);
}

// 추천 조합 패널 렌더링
function renderRecommendationsUI(parent) {
    if (!styleData.recommendations || styleData.recommendations.length === 0) return;

    const recContainer = $(`<div class="style-recommendations"></div>`);
    recContainer.append(`<h4>💡 유저 취향별 추천 조합 (클릭 전 참고)</h4>`);

    styleData.recommendations.forEach(category => {
        let html = `<div style="margin-bottom:5px;"><strong>[${category.category}]</strong><ul>`;
        category.items.forEach(item => {
            html += `<li>${item.name}: <span class="formula">${item.formula}</span> <span class="variant">(변주: ${item.variant})</span></li>`;
        });
        html += `</ul></div>`;
        recContainer.append(html);
    });

    parent.append(recContainer);
}

// 조합 규칙 체크 (비추/시너지/축 중복)
function checkCombinationRules() {
    const statusPanel = $('#style-status-panel');
    const activeArr = Array.from(activeStyles);

    if (activeArr.length < 2) {
        statusPanel.hide();
        return;
    }

    let warningMsg = [];
    let synergyMsg = [];

    // 같은 축 2개 이상 선택 경고
    styleData.axes.forEach(axis => {
        if (axis.id === 'V') return; // 모드 축은 다중 허용
        const stylesInAxis = activeArr.filter(id => {
            const found = styleData.styles.find(s => s.id === id);
            return found && found.axis === axis.id;
        });
        if (stylesInAxis.length > 1) {
            warningMsg.push(`🟡 주의: [${axis.name}] 축에서 ${stylesInAxis.length}개 선택됨 (${stylesInAxis.join(', ')}). 하나를 기본, 하나를 보조로 설계해야 합니다.`);
        }
    });

    // 비추 / 시너지 쌍 체크
    if (styleData.rules && styleData.rules.incompatible_pairs) {
        for (let i = 0; i < activeArr.length; i++) {
            for (let j = i + 1; j < activeArr.length; j++) {
                const pair = [activeArr[i], activeArr[j]];

                const incompat = styleData.rules.incompatible_pairs.find(p =>
                    p.pair.includes(pair[0]) && p.pair.includes(pair[1])
                );
                if (incompat) {
                    warningMsg.push(`🔴 비추 조합 (${pair.join('+')}): ${incompat.reason}`);
                }
            }
        }
    }

    if (styleData.rules && styleData.rules.synergy_pairs) {
        for (let i = 0; i < activeArr.length; i++) {
            for (let j = i + 1; j < activeArr.length; j++) {
                const pair = [activeArr[i], activeArr[j]];

                const synergy = styleData.rules.synergy_pairs.find(p =>
                    p.pair.includes(pair[0]) && p.pair.includes(pair[1])
                );
                if (synergy) {
                    synergyMsg.push(`🟢 시너지 (${pair.join('+')}): ${synergy.effect}`);
                }
            }
        }
    }

    if (warningMsg.length > 0 || synergyMsg.length > 0) {
        let html = '';
        if (warningMsg.length > 0) html += `<div class="warnings">${warningMsg.join('<br>')}</div>`;
        if (synergyMsg.length > 0) html += `<div class="synergies">${synergyMsg.join('<br>')}</div>`;
        statusPanel.html(html).show();
    } else {
        statusPanel.hide();
    }
}

// 스타일 토글
function toggleStyle(style, axisType, btnElement) {
    if (activeStyles.has(style.id)) {
        activeStyles.delete(style.id);
        btnElement.removeClass('active_style');
    } else {
        activeStyles.add(style.id);
        btnElement.addClass('active_style');
    }
    saveActiveStyles();
    checkCombinationRules();
    updatePromptInjection();
    updateActiveSummary();
}

// activeStyles를 extension_settings에 저장
function saveActiveStyles() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
    }
    extension_settings[EXTENSION_NAME].activeStyles = Array.from(activeStyles);
    saveSettingsDebounced();
}

// 프롬프트 조합 및 SillyTavern 파이프라인에 주입
function updatePromptInjection() {
    const selected = Array.from(activeStyles)
        .map(id => styleData.styles.find(s => s.id === id))
        .filter(Boolean); // undefined 방어

    // 우선순위 정렬: 모드(V) > 관계/장르(III) > 톤(II) > 형식(I) > 세계관(IV)
    selected.sort((a, b) => {
        const axisA = styleData.axes.find(ax => ax.id === a.axis);
        const axisB = styleData.axes.find(ax => ax.id === b.axis);
        const weightA = axisA ? axisA.weight : 0;
        const weightB = axisB ? axisB.weight : 0;
        return weightB - weightA;
    });

    let finalPrompt = '';
    if (selected.length > 0) {
        finalPrompt = '### [COMBINED LITERARY ROLEPLAY ENGINE]\n';

        // 2개 이상일 때 충돌 해결 규칙 삽입
        if (selected.length > 1 && styleData.rules && styleData.rules.conflict_resolution) {
            finalPrompt += '\n<CONFLICT_RESOLUTION_OVERRIDE>\n';
            finalPrompt += styleData.rules.conflict_resolution.map(rule => `- ${rule}`).join('\n');
            finalPrompt += '\n</CONFLICT_RESOLUTION_OVERRIDE>\n';
        }

        // 각 모듈 오버레이 삽입
        selected.forEach(s => {
            finalPrompt += `\n<MODULE_OVERLAY: AXIS_${s.axis} | STYLE_${s.id}>\n`;
            finalPrompt += `${s.prompt_payload}\n`;
            finalPrompt += `</MODULE_OVERLAY>\n`;
        });
    }

    // SillyTavern 프롬프트 파이프라인에 실제 주입
    if (typeof setExtensionPrompt === 'function') {
        const position = extension_prompt_types ? extension_prompt_types.IN_PROMPT : 0;
        setExtensionPrompt(EXTENSION_NAME, finalPrompt, position, 0);
    }

    // 설정에도 저장 (백업)
    if (extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME].injectedPrompt = finalPrompt;
    }

    // 프리뷰 업데이트
    $('#style-combinator-preview').text(finalPrompt || '선택된 문체가 없습니다.');
}

// 프리뷰 UI
function renderPreviewUI(parent) {
    const previewContainer = $(`<div id="style-preview-container"><h4>실시간 프롬프트 프리뷰</h4><div id="style-combinator-preview">선택된 문체가 없습니다.</div></div>`);
    parent.append(previewContainer);
}

// 에디터 UI
function renderEditorUI(parent) {
    const editorContainer = $(`<div class="style-editor-ui"></div>`);
    editorContainer.append(`<h4>문체 데이터 에디터 (우클릭으로 로드)</h4>`);
    const formHtml = `<div>
        <input type="text" id="edit-style-id" placeholder="ID (예: K, C)">
        <select id="edit-style-axis">${styleData.axes.map(ax => `<option value="${ax.id}">${ax.name}</option>`).join('')}</select>
        <input type="text" id="edit-style-name" placeholder="이름">
        <input type="text" id="edit-style-desc" placeholder="설명 툴팁">
        <textarea id="edit-style-payload" rows="8" placeholder="[MODULE...] 프롬프트 지침"></textarea>
        <div style="display:flex; gap:10px;">
            <button id="btn-save-style" class="menu_button">저장/업데이트</button>
            <button id="btn-delete-style" class="menu_button" style="background-color:#662222;">삭제</button>
            <button id="btn-clear-all" class="menu_button" style="background-color:#444;">전체 해제</button>
        </div>
    </div>`;
    editorContainer.append(formHtml);
    editorContainer.find('#btn-save-style').on('click', saveOrUpdateStyle);
    editorContainer.find('#btn-delete-style').on('click', deleteStyle);
    editorContainer.find('#btn-clear-all').on('click', clearAllStyles);
    parent.append(editorContainer);
}

// 에디터에 스타일 로드 (우클릭)
function loadToEditor(style) {
    $('#edit-style-id').val(style.id);
    $('#edit-style-axis').val(style.axis);
    $('#edit-style-name').val(style.name);
    $('#edit-style-desc').val(style.description || '');
    $('#edit-style-payload').val(style.prompt_payload || '');
}

// 스타일 저장/업데이트
function saveOrUpdateStyle() {
    const newStyle = {
        id: $('#edit-style-id').val().trim(),
        axis: $('#edit-style-axis').val(),
        name: $('#edit-style-name').val().trim(),
        description: $('#edit-style-desc').val().trim(),
        prompt_payload: $('#edit-style-payload').val().trim(),
    };
    if (!newStyle.id || !newStyle.name) return;
    const existingIndex = styleData.styles.findIndex(s => s.id === newStyle.id);
    if (existingIndex >= 0) {
        styleData.styles[existingIndex] = newStyle;
    } else {
        styleData.styles.push(newStyle);
    }
    persistDataAndRefresh();
}

// 스타일 삭제
function deleteStyle() {
    const targetId = $('#edit-style-id').val().trim();
    if (!targetId) return;
    if (!confirm(`정말 "${targetId}" 스타일을 삭제하시겠습니까?`)) return;
    styleData.styles = styleData.styles.filter(s => s.id !== targetId);
    activeStyles.delete(targetId);
    $('#edit-style-id, #edit-style-name, #edit-style-desc, #edit-style-payload').val('');
    persistDataAndRefresh();
}

// 전체 선택 해제
function clearAllStyles() {
    activeStyles.clear();
    saveActiveStyles();
    closeModal();
    openModal();
}

// 데이터 저장 및 UI 갱신
function persistDataAndRefresh() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
    }
    extension_settings[EXTENSION_NAME].customData = styleData;
    extension_settings[EXTENSION_NAME].activeStyles = Array.from(activeStyles);
    saveSettingsDebounced();
    closeModal();
    openModal();
}

// 초기화
jQuery(async () => {
    // settings 객체 초기화 (최초 로드 시 undefined 방지)
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};

    try {
        const settingsHtml = await $.get(`/${extensionFolderPath}/index.html`);
        $('#extensions_settings').append(settingsHtml);
    } catch (error) {
        console.error(`[Style Combinator] UI HTML 로드 실패:`, error);
        return;
    }

    // 이벤트 바인딩 (HTML이 DOM에 추가된 직후)
    $('#btn-open-style-combinator').on('click', openModal);

    // 데이터 로드 및 상태 복원
    await loadData();

    // 초기 프롬프트 주입 (빈 문자열로 슬롯 등록)
    if (typeof setExtensionPrompt === 'function') {
        setExtensionPrompt(EXTENSION_NAME, '', extension_prompt_types.IN_PROMPT, 0);
    }

    // 저장된 상태가 있으면 프롬프트 복원
    if (activeStyles.size > 0) {
        updatePromptInjection();
    }

    updateActiveSummary();
});
