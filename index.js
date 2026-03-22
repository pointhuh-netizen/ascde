import { getContext, saveSettingsExtension } from '../../extensions.js';

const EXTENSION_NAME = 'style-combinator';
let styleData = { axes: [], rules: {}, recommendations: [], styles: [] };
let activeStyles = new Set();

async function loadData() {
    const context = getContext();
    if (context.extension_settings[EXTENSION_NAME] && context.extension_settings[EXTENSION_NAME].customData) {
        styleData = context.extension_settings[EXTENSION_NAME].customData;
    } else {
        try {
            const response = await fetch(`/scripts/extensions/third-party/${EXTENSION_NAME}/data.json`);
            if (!response.ok) throw new Error('Network response was not ok');
            styleData = await response.json();
            
            if (!context.extension_settings[EXTENSION_NAME]) {
                context.extension_settings[EXTENSION_NAME] = {};
            }
            context.extension_settings[EXTENSION_NAME].customData = styleData;
            saveSettingsExtension();
        } catch (error) {
            console.error(`[Style Combinator] 데이터 로드 실패:`, error);
        }
    }
}

function renderUI() {
    $('#style-combinator-wrapper').remove();
    const wrapper = $(`<div id="style-combinator-wrapper"></div>`);
    const container = $(`<div id="style-combinator-container" class="style-combinator-ui"></div>`);
    container.append(`<h3>문체 교차 조합 매뉴얼 (45 버전)</h3>`);

    // **[신규 추가] 기본 추천 조합 UI 렌더링**
    **renderRecommendationsUI(container);**

    container.append(`<div id="style-status-panel" style="margin-bottom:10px; padding:8px; border-radius:4px; font-weight:bold; display:none;"></div>`);

    styleData.axes.forEach(axis => {
        const axisDiv = $(`<div class="style-axis" data-axis="${axis.id}"></div>`);
        axisDiv.append(`<h4>[${axis.name}]</h4>`);
        
        const btnContainer = $(`<div class="style-buttons"></div>`);
        const stylesInAxis = styleData.styles.filter(s => s.axis === axis.id);

        stylesInAxis.forEach(style => {
            const btn = $(`
                <button class="style-toggle menu_button" data-id="${style.id}" title="${style.description}">
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

    wrapper.append(container);
    $('#extensions_settings').append(wrapper);
    
    renderPreviewUI(wrapper);
    renderEditorUI(wrapper);
    checkCombinationRules();
}

// **[신규 보강 내용] 추천 조합 패널 렌더링 로직**
**function renderRecommendationsUI(parent) {**
    **if (!styleData.recommendations || styleData.recommendations.length === 0) return;**
    
    **const recContainer = $(`<div class="style-recommendations" style="margin-bottom:15px; padding:10px; background:rgba(255,204,0,0.1); border:1px solid #ffcc00; border-radius:5px;"></div>`);**
    **recContainer.append(`<h4 style="margin-top:0; color:#ffcc00;">💡 유저 취향별 추천 조합 (클릭 전 참고)</h4>`);**

    **styleData.recommendations.forEach(category => {**
        **let html = `<div style="margin-bottom:5px;"><strong>[${category.category}]</strong><ul style="margin:2px 0 10px 20px; padding:0; list-style-type:circle;">`;**
        **category.items.forEach(item => {**
            **html += `<li style="font-size:0.9em;">${item.name}: <span style="color:#ffcc00;">${item.formula}</span> <span style="color:#aaa;">(변주: ${item.variant})</span></li>`;**
        **});**
        **html += `</ul></div>`;**
        **recContainer.append(html);**
    **});**

    **parent.append(recContainer);**
**}**

function checkCombinationRules() {
    const statusPanel = $('#style-status-panel');
    const activeArr = Array.from(activeStyles);
    
    if (activeArr.length < 2) {
        statusPanel.hide();
        return;
    }

    let warningMsg = [];
    let synergyMsg = [];

    styleData.axes.forEach(axis => {
        if (axis.id === 'V') return;
        const stylesInAxis = activeArr.filter(id => styleData.styles.find(s => s.id === id).axis === axis.id);
        if (stylesInAxis.length > 1) {
            warningMsg.push(`🟡 주의: [${axis.name}] 축에서 2개 이상 선택됨. 하나를 기본, 하나를 보조로 설계해야 합니다.`);
        }
    });

    for (let i = 0; i < activeArr.length; i++) {
        for (let j = i + 1; j < activeArr.length; j++) {
            const pair = [activeArr[i], activeArr[j]];
            
            const incompat = styleData.rules.incompatible_pairs.find(p => 
                (p.pair.includes(pair[0]) && p.pair.includes(pair[1]))
            );
            if (incompat) warningMsg.push(`🔴 비추 조합 (${pair.join('+')}): ${incompat.reason}`);

            const synergy = styleData.rules.synergy_pairs.find(p => 
                (p.pair.includes(pair[0]) && p.pair.includes(pair[1]))
            );
            if (synergy) synergyMsg.push(`🟢 시너지 (${pair.join('+')}): ${synergy.effect}`);
        }
    }

    if (warningMsg.length > 0 || synergyMsg.length > 0) {
        let html = '';
        if (warningMsg.length > 0) html += `<div style="color:#ff6666;">${warningMsg.join('<br>')}</div>`;
        if (synergyMsg.length > 0) html += `<div style="color:#66ff66;">${synergyMsg.join('<br>')}</div>`;
        statusPanel.html(html).show();
    } else {
        statusPanel.hide();
    }
}

function toggleStyle(style, axisType, btnElement) {
    if (activeStyles.has(style.id)) {
        activeStyles.delete(style.id);
        btnElement.removeClass('active_style');
    } else {
        if (axisType === 'single') {
            // 다중 선택 허용 축이 아니면 경고만 출력, 시스템 차단 안 함
        }
        activeStyles.add(style.id);
        btnElement.addClass('active_style');
    }
    checkCombinationRules();
    updatePromptInjection();
}

function updatePromptInjection() {
    const selected = Array.from(activeStyles).map(id => 
        styleData.styles.find(s => s.id === id)
    );

    selected.sort((a, b) => {
        const weightA = styleData.axes.find(ax => ax.id === a.axis).weight;
        const weightB = styleData.axes.find(ax => ax.id === b.axis).weight;
        return weightB - weightA; 
    });

    let finalPrompt = "";
    if (selected.length > 0) {
        finalPrompt = "### [COMBINED LITERARY ROLEPLAY ENGINE]\n";
        
        if (selected.length > 1) {
            finalPrompt += "\n<CONFLICT_RESOLUTION_OVERRIDE>\n";
            finalPrompt += styleData.rules.conflict_resolution.map(rule => `- ${rule}`).join("\n");
            finalPrompt += "\n</CONFLICT_RESOLUTION_OVERRIDE>\n";
        }

        selected.forEach(s => {
            finalPrompt += `\n<MODULE_OVERLAY: AXIS_${s.axis} | STYLE_${s.id}>\n`;
            finalPrompt += `${s.prompt_payload}\n`;
            finalPrompt += `</MODULE_OVERLAY>\n`;
        });
    }

    const context = getContext();
    context.extension_settings[EXTENSION_NAME].injectedPrompt = finalPrompt;
    $('#style-combinator-preview').text(finalPrompt || "선택된 문체가 없습니다.");
}

function renderPreviewUI(parent) {
    const previewContainer = $(`<div id="style-preview-container"><h4>실시간 프롬프트 프리뷰</h4><div id="style-combinator-preview">선택된 문체가 없습니다.</div></div>`);
    parent.append(previewContainer);
}

function renderEditorUI(parent) {
    const editorContainer = $(`<div class="style-editor-ui"></div>`);
    editorContainer.append(`<h4>문체 데이터 에디터 (우클릭으로 로드)</h4>`);
    const formHtml = `<div>
        <input type="text" id="edit-style-id" placeholder="ID (예: K, C)">
        <select id="edit-style-axis">${styleData.axes.map(ax => `<option value="${ax.id}">${ax.name}</option>`).join('')}</select>
        <input type="text" id="edit-style-name" placeholder="이름">
        <input type="text" id="edit-style-desc" placeholder="설명 툴팁">
        <textarea id="edit-style-payload" rows="4" placeholder="[MODULE...] 프롬프트 지침"></textarea>
        <div style="display:flex; gap:10px;">
            <button id="btn-save-style" class="menu_button">저장/업데이트</button>
            <button id="btn-delete-style" class="menu_button" style="background-color:#662222;">삭제</button>
        </div>
    </div>`;
    editorContainer.append(formHtml);
    editorContainer.find('#btn-save-style').on('click', saveOrUpdateStyle);
    editorContainer.find('#btn-delete-style').on('click', deleteStyle);
    parent.append(editorContainer);
}

function loadToEditor(style) {
    $('#edit-style-id').val(style.id); $('#edit-style-axis').val(style.axis); $('#edit-style-name').val(style.name); $('#edit-style-desc').val(style.description); $('#edit-style-payload').val(style.prompt_payload);
}

function saveOrUpdateStyle() {
    const newStyle = {
        id: $('#edit-style-id').val().trim(), axis: $('#edit-style-axis').val(), name: $('#edit-style-name').val().trim(), description: $('#edit-style-desc').val().trim(), prompt_payload: $('#edit-style-payload').val().trim()
    };
    if (!newStyle.id || !newStyle.name) return;
    const existingIndex = styleData.styles.findIndex(s => s.id === newStyle.id);
    if (existingIndex >= 0) { styleData.styles[existingIndex] = newStyle; } else { styleData.styles.push(newStyle); }
    persistDataAndRefresh();
}

function deleteStyle() {
    const targetId = $('#edit-style-id').val().trim();
    if (!targetId) return;
    styleData.styles = styleData.styles.filter(s => s.id !== targetId);
    activeStyles.delete(targetId);
    $('#edit-style-id, #edit-style-name, #edit-style-desc, #edit-style-payload').val('');
    persistDataAndRefresh();
}

function persistDataAndRefresh() {
    const context = getContext();
    context.extension_settings[EXTENSION_NAME].customData = styleData;
    saveSettingsExtension();
    renderUI();
    updatePromptInjection();
}

jQuery(async () => {
    await loadData();
    renderUI();
});