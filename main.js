import { 
    hide_solution,
    clear_all_inputs,
    import_sudoku_from_string,
    export_sudoku_to_string,
    restore_original_board,
    save_sudoku_as_image,
    change_candidates_mode,
    show_generating_timer,
    hide_generating_timer,
    show_result
} from './solver/core.js';

import { 
    create_sudoku_grid, check_uniqueness
} from './solver/classic.js';

import { 
    check_candidates_uniqueness
} from './modules/candidates.js';

import {
    generate_puzzle, fill_puzzle_to_grid
} from './solver/generate.js'
import { state } from './solver/state.js';
import { generate_multi_diagonal_puzzle } from './modules/multi_diagonal.js';
import { generate_vx_puzzle } from './modules/vx.js';
import { generate_extra_region_puzzle } from './modules/extra_region.js';
import { generate_renban_puzzle } from './modules/renban.js';
import { generate_exclusion_puzzle } from './modules/exclusion.js';
import { generate_quadruple_puzzle } from './modules/quadruple.js';
import { generate_ratio_puzzle } from './modules/ratio.js';
import { generate_inequality_puzzle } from './modules/inequality.js';
import { generate_thermo_puzzle } from './modules/thermo.js';
import { generate_odd_puzzle } from './modules/odd.js';
import { generate_odd_even_puzzle } from './modules/odd_even.js';
import { create_ratio_sudoku } from './modules/ratio.js';
import { generate_fortress_puzzle } from './modules/fortress.js';
import { generate_product_puzzle } from './modules/product.js';
import { generate_five_six_puzzle } from './modules/five_six.js';


const MODE_EXPORT_META = {
    add: { type: '加法', rule: '除标准数独规则外，带标记区域内数字之和等于标记数字' },
    classic: { type: '标准', rule: '每行、每列、每宫数字均不重复' },
    anti_king: { type: '无缘', rule: '除标准数独规则外，对角相邻位置的数字也均不重复' },
    anti_knight: { type: '无马', rule: '除标准数独规则外，象棋马步位置的数字也均不重复' },
    anti_elephant: { type: '无象', rule: '除标准数独规则外，中国象棋象步位置的数字也均不重复' },
    diagonal: { type: '对角线', rule: '除标准数独规则外，每条对角线上的数字也均不重复' },
    anti_diagonal: { type: '反对角', rule: (size) => `除标准数独规则外，每条对角线上只能出现${size / 3}个数字` },
    multi_diagonal: { type: '斜线', rule: '除标准数独规则外，每条斜线上的数字也均不重复' },
    hashtag: { type: '斜井', rule: '除标准数独规则外，每条井字线上的数字也均不重复' },
    extra_region: { type: '额外区域', rule: '除标准数独规则外，每个额外区域内的数字也均不重复' },
    window: { type: '窗口', rule: '除标准数独规则外，每个灰色窗口区域内的数字也均不重复' },
    pyramid: { type: '金字塔', rule: '除标准数独规则外，每个灰色金字塔区域内的数字也均不重复' },
    isomorphic: { type: '同位', rule: '除标准数独规则外，各宫相同位置上的数字也均不重复' },
    clone: { type: '克隆', rule: '除标准数独规则外，形状相同的灰色区域中相同位置的数字必须一致' },
    renban: { type: '灰格连续', rule: '除标准数独规则外，每个灰色额外区域内的数字连续' },
    palindrome: { type: '回文', rule: '除标准数独规则外，每条灰线关于中心对称位置上的数字必须相同' },
    fortress: { type: '堡垒', rule: '除标准数独规则外，灰格数字大于相邻的白格数字' },
    VX: { type: 'VX', rule: '除标准数独规则外，V(X)标记表示两侧格内数字和为5(10)，满足条件的V(X)标记均已标出' },
    five_six: { type: '五六', rule: '除标准数独规则外，5(6)标记表示两侧格内数字和为5(6)，满足条件的5(6)标记均已标出' },
    exclusion: { type: '排除', rule: '除标准数独规则外，带标记的周围四格内不包含标记中的数字' },
    quadruple: { type: '四格提示', rule: '除标准数独规则外，带标记的周围四格内包含标记中的数字' },
    ratio: { type: '比例', rule: '除标准数独规则外，带比例标记的相邻格满足比例关系' },
    thermo: { type: '温度计', rule: '除标准数独规则外，温度计上的数字从圆泡处到尾部严格递增' },
    odd: { type: '奇数', rule: '除标准数独规则外，灰色圆圈内只能填奇数' },
    odd_even: { type: '奇偶', rule: '除标准数独规则外，灰色圆圈内只能填奇数，灰色方框内只能填偶数' },
    product: { type: '乘积', rule: '除标准数独规则外，带乘积标记的相邻格满足乘积约束' },
    missing: { type: '缺一门', rule: '除标准数独规则外，黑格不填数字' },
    X_sums: { type: 'X和', rule: '除标准数独规则外，外提示数等于该方向前X格数字之和，其中X为该方向第一格数字' },
    sandwich: { type: '三明治', rule: (size) => `除标准数独规则外，外提示数等于该行或列中数字1和${size}之间所有数字之和` },
    skyscraper: { type: '摩天楼', rule: '除标准数独规则外，外提示数表示从该方向能看到的楼房数，数字越大代表楼越高' }
};

function format_export_date(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function format_export_hour(date = new Date()) {
    return String(date.getHours()).padStart(2, '0');
}

function normalize_export_time_value(value) {
    if (!value) {
        return '';
    }
    const hour = String(value).split(':')[0] || '';
    if (!hour) {
        return '';
    }
    return `${hour.padStart(2, '0')}:00`;
}

function get_size_prefix(size) {
    const map = { 4: '四宫', 6: '六宫', 9: '九宫' };
    return map[size] || `${size}宫`;
}

function get_mode_meta() {
    const size = state.current_grid_size;
    const mode = state.current_mode || 'classic';
    const meta = MODE_EXPORT_META[mode] || MODE_EXPORT_META.classic;
    return {
        type: `${get_size_prefix(size)}${meta.type}`,
        rule: typeof meta.rule === 'function' ? meta.rule(size) : meta.rule
    };
}

function extract_grid_string_from_dom(size, useSolutionOffset = false) {
    const container = document.querySelector('.sudoku-container');
    if (!container || !size) return '';

    let result = '';
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const row = useSolutionOffset ? i + 1 : i;
            const col = useSolutionOffset ? j + 1 : j;
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            const value = input?.value?.trim() || '';
            result += value === '' || value === '0' ? '.' : value[0];
        }
    }
    return result;
}

function extract_puzzle_string(size) {
    if (state.originalBoard && state.originalBoard.length === size) {
        let result = '';
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const value = `${state.originalBoard[i][j]?.value || ''}`.trim();
                result += value === '' || value === '0' ? '.' : value[0];
            }
        }
        return result;
    }

    const needsOffset = ['X_sums', 'sandwich', 'skyscraper'].includes(state.current_mode);
    return extract_grid_string_from_dom(size, needsOffset);
}

function extract_solution_string(size) {
    const needsOffset = ['X_sums', 'sandwich', 'skyscraper'].includes(state.current_mode);
    return extract_grid_string_from_dom(size, needsOffset);
}

function get_save_image_preferences() {
    const watermarkCheckbox = document.getElementById('saveWithWatermark');
    const axisCheckbox = document.getElementById('saveWithAxisLabels');

    return {
        withWatermark: watermarkCheckbox ? !!watermarkCheckbox.checked : false,
        withAxisLabels: axisCheckbox ? !!axisCheckbox.checked : true
    };
}

function get_batch_image_preferences() {
    const watermarkCheckbox = document.getElementById('batchWithWatermark');
    const axisCheckbox = document.getElementById('batchWithAxisLabels');

    return {
        withWatermark: watermarkCheckbox ? !!watermarkCheckbox.checked : true,
        withAxisLabels: axisCheckbox ? !!axisCheckbox.checked : true
    };
}

function download_json_file(payload, fileName) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.download = fileName;
    link.href = url;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function export_sudoku_as_text() {
    if (!state.current_grid_size) {
        return;
    }

    const output = document.getElementById('exportedTextString');
    if (!output) {
        return;
    }

    const size = state.current_grid_size;
    const { type, rule } = get_mode_meta();
    const diff = get_export_diff();
    const selectedDate = document.getElementById('exportDatePicker')?.value;
    const selectedTime = document.getElementById('exportTimePicker')?.value;
    const exportDate = selectedDate || format_export_date();
    const exportTimeValue = normalize_export_time_value(selectedTime);
    const exportHour = exportTimeValue.split(':')[0];
    const date = exportHour ? `${exportDate}-${exportHour}` : exportDate;
    const dateCompact = `${exportDate.replace(/-/g, '')}${exportHour}`;
    const imageFolder = state.current_mode === 'classic' ? 'classic-' : '';
    const imagePathFolder = exportHour ? 'hourly-puzzles' : `daily-${imageFolder}puzzles`;
    const exportBaseFileName = exportHour
        ? `star${diff}-${dateCompact}`
        : `star${diff}-${imageFolder}${dateCompact}`;
    const imageFileName = exportHour
        ? `${exportBaseFileName}.png`
        : `${exportBaseFileName}.png`;

    const payload = {
        diff,
        date,
        type,
        rule,
        puzzle: extract_puzzle_string(size),
        solution: extract_solution_string(size),
        image: `cloud://cloudbase-5gdz784z4b8109d4.636c-cloudbase-5gdz784z4b8109d4-1410842983/${imagePathFolder}/${imageFileName}`,
        size
    };

    output.value = JSON.stringify(payload);

    const fileName = `${exportBaseFileName}.json`;
    download_json_file(payload, fileName);
    const { withWatermark, withAxisLabels } = get_save_image_preferences();
    save_sudoku_as_image(true, withWatermark, './potato_sudoku.png', {
        fileName: `${exportBaseFileName}.png`,
        exportSolution: false,
        withAxisLabels
    });
}

function open_export_date_picker() {
    const picker = document.getElementById('exportDatePicker');
    if (!picker) return;

    if (!picker.value) {
        picker.value = format_export_date();
    }

    if (typeof picker.showPicker === 'function') {
        picker.showPicker();
    } else {
        picker.focus();
        picker.click();
    }
}

function open_export_time_picker() {
    const picker = document.getElementById('exportTimePicker');
    if (!picker) return;

    if (picker.value) {
        picker.value = '';
        sync_export_time_button_text();
        return;
    }

    if (typeof picker.showPicker === 'function') {
        picker.showPicker();
    } else {
        picker.focus();
        picker.click();
    }
}

function sync_export_date_button_text() {
    const picker = document.getElementById('exportDatePicker');
    const btn = document.getElementById('selectExportDate');
    if (!picker || !btn) return;

    btn.textContent = picker.value ? `选择日期：${picker.value}` : '选择日期';
}

function sync_export_time_button_text() {
    const picker = document.getElementById('exportTimePicker');
    const btn = document.getElementById('selectExportTime');
    if (!picker || !btn) return;

    const hour = picker.value ? normalize_export_time_value(picker.value).split(':')[0] : '';
    btn.textContent = hour ? `选择时间：${hour}点（点击可取消）` : '选择时间(可选)';
}

function get_export_diff() {
    const starPicker = document.getElementById('exportStarPicker');
    const parsed = parseInt(starPicker?.value || '', 10);
    if ([1, 2, 3, 4, 5].includes(parsed)) {
        return parsed;
    }
    return 1;
}



// 初始化事件处理程序

function initializeEventHandlers() {
    const fourGridBtn = document.getElementById('fourGrid');
    const sixGridBtn = document.getElementById('sixGrid');
    const nineGridBtn = document.getElementById('nineGrid');
    const checkSolutionBtn = document.getElementById('checkSolution');
    const check_nextBtn = document.getElementById('check_next');
    const check_uniquenessBtn = document.getElementById('check_uniqueness');
    const hide_solutionBtn = document.getElementById('hide_solution');
    const generatepuzzleBtn = document.getElementById('generate_puzzle');
    const clearAllBtn = document.getElementById('clearAll');

    fourGridBtn.addEventListener('click', () => create_sudoku_grid(4));
    sixGridBtn.addEventListener('click', () => create_sudoku_grid(6));
    nineGridBtn.addEventListener('click', () => create_sudoku_grid(9));
    // checkSolutionBtn.addEventListener('click', check_solution);
    check_uniquenessBtn.addEventListener('click', () => check_uniqueness(false));
    check_nextBtn.addEventListener('click', () => check_uniqueness(true));
    hide_solutionBtn.addEventListener('click', hide_solution);
    clearAllBtn.addEventListener('click', clear_all_inputs);
    
    document.getElementById('importSudokuFromString').addEventListener('click', import_sudoku_from_string);
    document.getElementById('exportSudokuToString').addEventListener('click', export_sudoku_to_string);
    document.getElementById('exportSudokuAsText').addEventListener('click', () => {
        hide_solution();
        check_uniqueness(false);
        export_sudoku_as_text();
    });
    document.getElementById('selectExportDate').addEventListener('click', open_export_date_picker);
    document.getElementById('selectExportTime').addEventListener('click', open_export_time_picker);
    document.getElementById('saveAsImage').addEventListener('click', () => {
        const { withWatermark, withAxisLabels } = get_save_image_preferences();
        save_sudoku_as_image(true, withWatermark, './potato_sudoku.png', { withAxisLabels });
    });

    const exportDatePicker = document.getElementById('exportDatePicker');
    if (exportDatePicker) {
        if (!exportDatePicker.value) {
            exportDatePicker.value = format_export_date();
        }
        exportDatePicker.addEventListener('change', sync_export_date_button_text);
        sync_export_date_button_text();
    }

    const exportTimePicker = document.getElementById('exportTimePicker');
    if (exportTimePicker) {
        if (exportTimePicker.value) {
            exportTimePicker.value = normalize_export_time_value(exportTimePicker.value);
        }
        exportTimePicker.addEventListener('change', sync_export_time_button_text);
        sync_export_time_button_text();
    }

    // ...existing code...
    document.getElementById('toggleCandidatesMode').addEventListener('click', function() {
        state.is_candidates_mode = !state.is_candidates_mode;
        this.textContent = state.is_candidates_mode ? '退出候选数模式' : '进入候选数模式';
        // 重新获取当前输入框引用
        const size = state.current_grid_size;
        const inputs = Array.from({ length: size }, (_, row) =>
            Array.from({ length: size }, (_, col) =>
                document.querySelector(`.sudoku-cell input[data-row="${row}"][data-col="${col}"]`)
            )
        );
        change_candidates_mode(inputs, size, false);
    });
    // ...existing code...

    document.getElementById('toggleSolveMode').addEventListener('click', function() {
        state.is_solve_mode = !state.is_solve_mode;
        this.textContent = state.is_solve_mode ? '退出解题模式' : '进入解题模式';

        // 切换所有输入框颜色
        document.querySelectorAll('.sudoku-cell input').forEach(input => {
            if (state.is_solve_mode) {
                // 进入解题模式：空格加 solve-mode
                if (!input.value) {
                    input.classList.add('solve-mode');
                }
            } else {
                // 退出解题模式：移除所有 solve-mode
                input.classList.remove('solve-mode');
                // 如果是空格，移除 solution-cell（让空格变回黑色）
                if (!input.value) {
                    input.classList.remove('solution-cell');
                }
                // input.classList.remove('solution-cell');
            }
            // if (state.is_solve_mode) {
            //     input.classList.add('solution-cell');
            // } else {
            //     input.classList.remove('solution-cell');
            // }
        });
    });

    // 监听所有输入框的输入事件（只需加一次即可）
    document.addEventListener('input', function(e) {
        if (e.target.matches('.sudoku-cell input')) {
            if (state.is_solve_mode) {
                // 只有 solve-mode 的空格才变蓝
                if (e.target.classList.contains('solve-mode')) {
                    if (e.target.value) {
                        e.target.classList.add('solution-cell');
                    } else {
                        e.target.classList.remove('solution-cell');
                    }
                }
            } else {
                // 非解题模式全部恢复黑色
                e.target.classList.remove('solution-cell');
            }
        }
    });

    // 分值下限输入框
    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.id = 'scoreLowerLimit';
    scoreInput.placeholder = '分值下限';
    scoreInput.value = '';
    scoreInput.style.width = '80px';
    scoreInput.style.marginLeft = '10px';

    const generateRow1 = document.getElementById('generateRow1');
    const generateRow2 = document.getElementById('generateRow2');
    const generateRow3 = document.getElementById('generateRow3');

    generateRow1.appendChild(scoreInput);

    // 分值上限输入框
    const scoreUpperInput = document.createElement('input');
    scoreUpperInput.type = 'number';
    scoreUpperInput.id = 'scoreUpperLimit';
    scoreUpperInput.placeholder = '分值上限';
    scoreUpperInput.value = '';
    scoreUpperInput.style.width = '80px';
    scoreUpperInput.style.marginLeft = '5px';

    generateRow1.appendChild(scoreUpperInput);

    const cluesLowerInput = document.createElement('input');
    cluesLowerInput.type = 'number';
    cluesLowerInput.id = 'cluesLowerLimit';
    cluesLowerInput.placeholder = '已知数下限';
    cluesLowerInput.value = '';
    cluesLowerInput.style.width = '100px';
    cluesLowerInput.style.marginLeft = '5px';

    generateRow1.appendChild(cluesLowerInput);

    const cluesUpperInput = document.createElement('input');
    cluesUpperInput.type = 'number';
    cluesUpperInput.id = 'cluesUpperLimit';
    cluesUpperInput.placeholder = '已知数上限';
    cluesUpperInput.value = '';
    cluesUpperInput.style.width = '100px';
    cluesUpperInput.style.marginLeft = '5px';

    generateRow1.appendChild(cluesUpperInput);

    const attemptsInput = document.createElement('input');
    attemptsInput.type = 'number';
    attemptsInput.id = 'maxAttemptsInput';
    attemptsInput.placeholder = '尝试终盘次数';
    attemptsInput.value = '10000';
    attemptsInput.style.width = '100px';
    attemptsInput.style.marginLeft = '5px';
    
    generateRow1.appendChild(attemptsInput);

    // 新增：批量自动出题和保存图片
    const batchBtn = document.createElement('button');
    batchBtn.id = 'batchGenerateSave';
    batchBtn.textContent = '自动批量';
    batchBtn.style.marginLeft = '0px';

    const batchOptions = document.createElement('div');
    batchOptions.id = 'batchImageOptions';
    batchOptions.className = 'save-image-options';

    const batchWatermarkLabel = document.createElement('label');
    batchWatermarkLabel.className = 'save-image-option';
    const batchWatermarkCheckbox = document.createElement('input');
    batchWatermarkCheckbox.type = 'checkbox';
    batchWatermarkCheckbox.id = 'batchWithWatermark';
    batchWatermarkCheckbox.checked = true;
    batchWatermarkLabel.appendChild(batchWatermarkCheckbox);
    batchWatermarkLabel.append('带水印');

    const batchAxisLabel = document.createElement('label');
    batchAxisLabel.className = 'save-image-option';
    const batchAxisCheckbox = document.createElement('input');
    batchAxisCheckbox.type = 'checkbox';
    batchAxisCheckbox.id = 'batchWithAxisLabels';
    batchAxisCheckbox.checked = false;
    batchAxisLabel.appendChild(batchAxisCheckbox);
    batchAxisLabel.append('带坐标轴');

    batchOptions.appendChild(batchWatermarkLabel);
    batchOptions.appendChild(batchAxisLabel);

    const batchInput = document.createElement('input');
    batchInput.type = 'number';
    batchInput.id = 'batchCount';
    batchInput.placeholder = '题数';
    batchInput.min = '1';
    batchInput.value = '';
    batchInput.style.width = '50px';
    batchInput.style.marginLeft = '10px';

    generateRow2.appendChild(batchBtn);
    generateRow2.appendChild(batchOptions);
    generateRow2.appendChild(batchInput);

    // 移动保存按钮。
    const saveAsImageBtn = document.getElementById('saveAsImage');
    const saveImageOptions = document.getElementById('saveImageOptions');

    saveAsImageBtn.style.marginLeft = '0px';

    generateRow3.appendChild(saveAsImageBtn);
    if (saveImageOptions) {
        generateRow3.appendChild(saveImageOptions);
    }

    // 添加跳转卡点按钮
    const jumpBtn = document.createElement('button');
    jumpBtn.id = 'jumpScoreBtn';
    jumpBtn.textContent = '跳转卡点';
    jumpBtn.style.marginLeft = '5px';

    // 插入到分值下限输入框后面
    check_nextBtn.parentNode.insertBefore(jumpBtn, check_uniquenessBtn);

    jumpBtn.addEventListener('click', async () => {
        let maxLoop = 100; // 防止死循环
        while (maxLoop-- > 0) {
            check_uniqueness(true);
            // 等待异步渲染（如有），可适当延时
            await new Promise(resolve => setTimeout(resolve, 200));
            if (state.solve_stats.total_score > 29 || state.solve_stats.total_score === 0) break;
        }
    });

    function generate_once_by_mode(score_lower_limit, holes_count, use_mode_specific_generator) {
        if (!use_mode_specific_generator) {
            return generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        }

        if (state.current_mode === 'multi_diagonal') {
            return generate_multi_diagonal_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'product') {
            return generate_product_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'VX') {
            return generate_VX_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'fortress') {
            return generate_fortress_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'extra_region') {
            return generate_extra_region_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'renban') {
            return generate_renban_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'exclusion') {
            return generate_exclusion_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'quadruple') {
            return generate_quadruple_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'ratio') {
            return generate_ratio_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'inequality') {
            return generate_inequality_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'thermo') {
            return generate_thermo_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'five_six') {
            return generate_five_six_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'odd') {
            return generate_odd_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else if (state.current_mode === 'odd_even') {
            return generate_odd_even_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        } else {
            return generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        }
    }

    function get_current_clues_count() {
        const size = state.current_grid_size;
        const container = document.querySelector('.sudoku-container');
        const isBorderedMode = ['X_sums', 'sandwich', 'skyscraper'].includes(state.current_mode);
        let cluesCount = 0;

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const actualRow = isBorderedMode ? row + 1 : row;
                const actualCol = isBorderedMode ? col + 1 : col;
                const input = container?.querySelector(`input[data-row="${actualRow}"][data-col="${actualCol}"]`);
                if (input && input.value.trim() !== '') {
                    cluesCount++;
                }
            }
        }

        return cluesCount;
    }

    function get_generation_options() {
        const scoreLowerLimit = parseInt(scoreInput.value, 10) || 0;
        const parsedScoreUpperLimit = parseInt(scoreUpperInput.value, 10);
        const scoreUpperLimit = Number.isNaN(parsedScoreUpperLimit) ? Number.POSITIVE_INFINITY : parsedScoreUpperLimit;
        if (scoreUpperLimit < scoreLowerLimit) {
            alert('分值上限不能小于分值下限');
            return null;
        }

        const size = state.current_grid_size;
        const totalCellCount = size * size;
        const parsedCluesLowerLimit = parseInt(cluesLowerInput.value, 10);
        const cluesLowerLimit = Number.isNaN(parsedCluesLowerLimit) ? 0 : parsedCluesLowerLimit;
        const parsedCluesUpperLimit = parseInt(cluesUpperInput.value, 10);
        const cluesUpperLimit = Number.isNaN(parsedCluesUpperLimit) ? Number.POSITIVE_INFINITY : parsedCluesUpperLimit;

        if (cluesLowerLimit < 0 || cluesLowerLimit > totalCellCount) {
            alert(`已知数下限必须介于0和${totalCellCount}之间`);
            return null;
        }

        if (Number.isFinite(cluesUpperLimit) && (cluesUpperLimit < 0 || cluesUpperLimit > totalCellCount)) {
            alert(`已知数上限必须介于0和${totalCellCount}之间`);
            return null;
        }

        if (cluesUpperLimit < cluesLowerLimit) {
            alert('已知数上限不能小于已知数下限');
            return null;
        }

        const holesCount = totalCellCount - cluesLowerLimit;

        return {
            scoreLowerLimit,
            scoreUpperLimit,
            cluesLowerLimit,
            cluesUpperLimit,
            holesCount
        };
    }

    async function generate_with_constraints(generate_once, options, max_try = 30) {
        const {
            scoreLowerLimit,
            scoreUpperLimit,
            cluesLowerLimit,
            cluesUpperLimit
        } = options;
        const hasScoreLowerLimit = Number.isFinite(scoreLowerLimit) && scoreLowerLimit > 0;
        const hasScoreUpperLimit = Number.isFinite(scoreUpperLimit);
        const hasCluesLowerLimit = Number.isFinite(cluesLowerLimit) && cluesLowerLimit > 0;
        const hasCluesUpperLimit = Number.isFinite(cluesUpperLimit);
        const total_try = (hasScoreLowerLimit || hasScoreUpperLimit || hasCluesLowerLimit || hasCluesUpperLimit) ? max_try : 1;

        for (let i = 0; i < total_try; i++) {
            await Promise.resolve(generate_once(scoreLowerLimit));
            await new Promise(resolve => setTimeout(resolve, 0));

            const current_score = Number(state.solve_stats && state.solve_stats.total_score);
            const currentCluesCount = get_current_clues_count();

            if (hasScoreLowerLimit || hasScoreUpperLimit) {
                if (!Number.isFinite(current_score)) {
                    continue;
                }

                if (current_score < scoreLowerLimit) {
                    continue;
                }

                if (hasScoreUpperLimit && current_score > scoreUpperLimit) {
                    continue;
                }
            }

            if (hasCluesLowerLimit && currentCluesCount < cluesLowerLimit) {
                continue;
            }

            if (hasCluesUpperLimit && currentCluesCount > cluesUpperLimit) {
                continue;
            }

            return true;
        }
        return false;
    }

    async function generate_with_score_range(generate_once, score_lower_limit, score_upper_limit, max_try = 30) {
        return generate_with_constraints(
            generate_once,
            {
                scoreLowerLimit: score_lower_limit,
                scoreUpperLimit: score_upper_limit,
                cluesLowerLimit: 0,
                cluesUpperLimit: Number.POSITIVE_INFINITY
            },
            max_try
        );
    }

    async function generate_in_constraints(options, use_mode_specific_generator, max_try = 100) {
        return generate_with_constraints(
            (current_score_lower_limit) => generate_once_by_mode(current_score_lower_limit, options.holesCount, use_mode_specific_generator),
            options,
            max_try
        );
    }

    function get_generation_failure_message(options) {
        const conditions = [];
        const {
            scoreLowerLimit,
            scoreUpperLimit,
            cluesLowerLimit,
            cluesUpperLimit
        } = options;

        if (Number.isFinite(scoreUpperLimit)) {
            conditions.push(`分值介于${scoreLowerLimit}和${scoreUpperLimit}之间`);
        } else if (scoreLowerLimit > 0) {
            conditions.push(`分值不低于${scoreLowerLimit}`);
        }

        if (Number.isFinite(cluesUpperLimit)) {
            if (cluesLowerLimit > 0) {
                conditions.push(`已知数介于${cluesLowerLimit}和${cluesUpperLimit}之间`);
            } else {
                conditions.push(`已知数不高于${cluesUpperLimit}`);
            }
        } else if (cluesLowerLimit > 0) {
            conditions.push(`已知数不低于${cluesLowerLimit}`);
        }

        if (conditions.length === 0) {
            return '未能在限定次数内生成符合条件的题目，请调整参数后重试。';
        }

        return `未能在限定次数内生成${conditions.join('，且')}的题目，请调整参数后重试。`;
    }

    function get_score_range_failure_message(score_lower_limit, score_upper_limit) {
        return get_generation_failure_message({
            scoreLowerLimit: score_lower_limit,
            scoreUpperLimit: score_upper_limit,
            cluesLowerLimit: 0,
            cluesUpperLimit: Number.POSITIVE_INFINITY
        });
    }

    function create_mode_specific_generate_handler(generate_once) {
        return async () => {
            const options = get_generation_options();
            if (!options) {
                return;
            }

            const generated = await generate_with_constraints(
                (current_score_lower_limit) => generate_once(current_score_lower_limit, options.holesCount),
                options
            );

            if (!generated) {
                show_result(get_generation_failure_message(options));
            }
        };
    }

    state.get_generation_options = get_generation_options;
    state.generate_with_constraints = generate_with_constraints;
    state.generate_with_score_range = generate_with_score_range;
    state.get_generation_failure_message = get_generation_failure_message;
    state.get_score_range_failure_message = get_score_range_failure_message;
    state.create_mode_specific_generate_handler = create_mode_specific_generate_handler;

    generatepuzzleBtn.addEventListener('click', async () => {
        const options = get_generation_options();
        if (!options) {
            return;
        }

        show_generating_timer();

        setTimeout(async () => {
            const generated = await generate_in_constraints(options, false);
            if (!generated) {
                show_result(get_generation_failure_message(options));
            }
            hide_generating_timer();
        }, 0);
    });

    async function runBatchGenerateAndSave(count, options, withWatermark, withAxisLabels) {
        if (isNaN(count) || count < 1) return;

        for (let i = 0; i < count; i++) {
            const generated = await generate_in_constraints(options, true);
            if (!generated) continue;

            await new Promise(resolve => setTimeout(resolve, 800));
            save_sudoku_as_image(true, withWatermark, './potato_sudoku.png', { withAxisLabels });
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
    }

    batchBtn.addEventListener('click', async () => {
        const options = get_generation_options();
        if (!options) {
            return;
        }

        const count = parseInt(batchInput.value, 10) || 1;
        const { withWatermark, withAxisLabels } = get_batch_image_preferences();
        await runBatchGenerateAndSave(count, options, withWatermark, withAxisLabels);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventHandlers();
    // 默认创建4宫格
    create_sudoku_grid(4);
});