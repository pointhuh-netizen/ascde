import { extension_settings, setExtensionPrompt, extension_prompt_types, saveSettingsExtension } from '../../../extensions.js';

const EXTENSION_NAME = 'ascde';

// 💡 핵심 마법: 확장이 어디에 설치되든 자기 자신의 경로를 자동으로 찾아냅니다!
const extensionUrl = new URL('.', import.meta.url).pathname.replace(/\/$/, '');

let styleData = { axes: [], rules: {}, recommendations: [], styles: [] };
let activeStyles = new Set();

async function loadData() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
    }
    const settings = extension_settings[EXTENSION_NAME];

    if (settings.customData) {
        styleData = settings.customData;
    } else {
        try {
            // 하드코딩된 경로 대신 자동 탐색 경로 사용
            const response = await fetch(`${extensionUrl}/data.json`);
            if (response.ok) {
                styleData = await response.json();
                extension_settings[EXTENSION_NAME].customData = styleData;
                saveSettingsExtension();
            }
        } catch (error) {
            console.error(`[Style Combinator] data.json 로드 실패:`, error);
        }
    }

    if (Array.isArray(settings.activeStyles)) {
        activeStyles = new Set(settings.activeStyles);
    }
}

function saveActiveStyles() {
    extension_settings[EXTENSION_NAME].activeStyles = Array.from(activeStyles);
    saveSettingsExtension();
}

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

function closeModal() {
    $('#style-combinator-modal-overlay').remove();
    updateActiveSummary();
}

function renderModalContent(modal) {
    const container = $(`<div id="style-combinator-container"></div>`);
    container.append(`<h2 style="margin-top:0; color:#ffcc00;">📚 문체 교차 조합 매뉴얼</h2>`);
    container.append(`<p style="color:#aaa; font-size:0.9em; margin-bottom:20px;">원하는 분위기와 장르를 클릭하여 활성화하세요. (우클릭 시 데이터 편집 가능)</p>`);

    const statusPanel = $(`<div id="style-status-panel" style="margin-bottom:15px; padding:10px; background:rgba(0,0,0,0.5); border-radius:5px; display:none;"></div>`);
    container.append(statusPanel);

    if (styleData.axes && styleData.axes.length > 0) {
        styleData.axes.forEach(axis => {
            const axisDiv = $(`<div class="style-axis" data-axis="${axis.id}"></div>`);
            axisDiv.append(`<h4 style="margin:0;">[${axis.name}]</h4>`);

            const btnContainer = $(`<div class="style-buttons"></div>`);
            const stylesInAxis = styleData.styles.filter(s => s.axis === axis.id);

            stylesInAxis.forEach(style => {
                const isActive = activeStyles.has(style.id) ? 'active_style' : '';
                const btn = $(`
                    <button class="style-toggle ${isActive}" data-id="${style.id}" title="${style.description || ''}">
                        ${style.id}. ${style.name}
                    </button>
                `);

                btn.on('click', () => toggleStyle(style, axis.type, btn));
                btn.on('contextmenu', (e) => { e.preventDefault(); alert(`[우클릭 감지됨]\n현재 "${style.name}" 데이터가 선택되었습니다. 에디터 기능은 추후 확장 가능합니다.`); });
                btnContainer.append(btn);
            });

            axisDiv.append(btnContainer);
            container.append(axisDiv);
        });
    } else {
        container.append(`<p style="color:#ff6666;">데이터를 불러오지 못했습니다. data.json 파일을 확인해주세요.</p>`);
    }

    modal.append(container);

    // 실시간 프리뷰 영역
    const previewContainer = $(`<div id="style-preview-container" style="margin-top:20px; padding:15px; background:rgba(0,0,0,0.4); border:1px dashed #777; border-radius:8px;">
        <h4 style="margin-top:0; color:#88ccff;">🔍 실시간 프롬프트 프리뷰</h4>
        <div id="style-combinator-preview" style="max-height:150px; overflow-y:auto; white-space:pre-wrap; font-family:monospace; color:#00ffcc; font-size:0.85em;">선택된 문체가 없습니다.</div>
    </div>`);
    modal.append(previewContainer);

    checkCombinationRules();
    updatePromptInjection();
}

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

function checkCombinationRules() {
    const statusPanel = $('#style-status-panel');
    if (activeStyles.size < 2) {
        statusPanel.hide();
        return;
    }

    let warningMsg = [];
    const activeArr = Array.from(activeStyles);

    if (styleData.axes) {
        styleData.axes.forEach(axis => {
            if (axis.id === 'V') return; 
            const stylesInAxis = activeArr.filter(id => {
                const found = styleData.styles.find(s => s.id === id);
                return found && found.axis === axis.id;
            });
            if (stylesInAxis.length > 1) {
                warningMsg.push(`🟡 주의: [${axis.name}] 축에서 ${stylesInAxis.length}개가 선택되었습니다. 하나를 메인으로 설계하세요.`);
            }
        });
    }

    if (warningMsg.length > 0) {
        statusPanel.html(`<div style="color:#ffcc00; font-weight:bold;">${warningMsg.join('<br>')}</div>`).show();
    } else {
        statusPanel.hide();
    }
}

function updatePromptInjection() {
    const selected = Array.from(activeStyles)
        .map(id => styleData.styles.find(s => s.id === id))
        .filter(Boolean);

    let finalPrompt = '';
    if (selected.length > 0) {
        finalPrompt = '### [COMBINED LITERARY ROLEPLAY ENGINE]\n';
        selected.forEach(s => {
            finalPrompt += `\n<MODULE_OVERLAY: AXIS_${s.axis} | STYLE_${s.id}>\n${s.prompt_payload}\n</MODULE_OVERLAY>\n`;
        });
    }

    if (typeof setExtensionPrompt === 'function') {
        const position = extension_prompt_types ? extension_prompt_types.IN_PROMPT : 0;
        setExtensionPrompt(EXTENSION_NAME, finalPrompt, position, 0);
    }

    $('#style-combinator-preview').text(finalPrompt || '선택된 문체가 없습니다.');
}

function updateActiveSummary() {
    const names = Array.from(activeStyles)
        .map(id => {
            const s = styleData.styles.find(x => x.id === id);
            return s ? `${s.id}(${s.name})` : id;
        });
    const text = names.length > 0 ? `활성화됨: ${names.join(', ')}` : '선택된 문체: 없음';
    $('#style-combinator-active-summary').text(text);
}

// 초기화 시작
jQuery(async () => {
    // 1. CSS 파일 동적 적용 (자동 경로)
    if ($(`link[href="${extensionUrl}/style.css"]`).length === 0) {
        $('head').append(`<link rel="stylesheet" href="${extensionUrl}/style.css">`);
    }

    // 2. HTML 로드해서 확장 패널에 붙이기 (자동 경로)
    try {
        const html = await $.get(`${extensionUrl}/index.html`);
        $('#extensions_settings').append(html);
    } catch (e) {
        console.error('[Style Combinator] index.html 로드 실패', e);
        return;
    }

    $('#btn-open-style-combinator').on('click', openModal);

    await loadData();
    updatePromptInjection();
    updateActiveSummary();
});
