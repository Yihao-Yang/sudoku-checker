import { 
    hide_solution,
    clear_all_inputs,
    import_sudoku_from_string,
    export_sudoku_to_string,
    backup_original_board,
    restore_original_board,
    save_sudoku_as_image,
    change_candidates_mode,
    show_generating_timer,
    hide_generating_timer,
    show_result
} from './solver/core.js';

import { 
    create_sudoku_grid, check_uniqueness, check_minimal_next_step, check_minimal_uniqueness
} from './solver/classic.js';

import { 
    check_candidates_uniqueness
} from './modules/candidates.js';

import {
    generate_puzzle, fill_puzzle_to_grid, generate_exterior_puzzle, generate_chokepoint_puzzle, generate_real_chokepoint_puzzle
} from './solver/generate.js'
import { state } from './solver/state.js';

const exterior_mode_set = new Set(['X_sums', 'skyscraper', 'sandwich', 'rossini']);
const mode_generator_cache = new Map();

// 根据当前题型动态定位对应生成函数，并将解析结果缓存。
async function resolve_mode_specific_generator(mode) {
    if (!mode) {
        return null;
    }

    const mode_text = String(mode).trim();
    const normalized_mode = mode_text.replace(/[\s-]+/g, '_');
    const lower_mode_text = mode_text.toLowerCase();
    const lower_normalized_mode = normalized_mode.toLowerCase();

    if (exterior_mode_set.has(mode)) {
        return generate_exterior_puzzle;
    }

    if (mode_generator_cache.has(mode)) {
        return mode_generator_cache.get(mode);
    }

    let loaded_module = null;
    const module_path_candidates = [...new Set([
        `./modules/${mode_text}.js`,
        `./modules/${normalized_mode}.js`,
        `./modules/${lower_mode_text}.js`,
        `./modules/${lower_normalized_mode}.js`
    ])];

    for (const module_path of module_path_candidates) {
        try {
            loaded_module = await import(module_path);
            break;
        } catch (error) {
            // Continue trying other candidate module paths.
        }
    }

    let generator = null;
    if (loaded_module) {
        const generator_name_candidates = [...new Set([
            `generate_${mode_text}_puzzle`,
            `generate_${normalized_mode}_puzzle`,
            `generate_${lower_mode_text}_puzzle`,
            `generate_${lower_normalized_mode}_puzzle`
        ])];

        for (const generator_name of generator_name_candidates) {
            if (typeof loaded_module[generator_name] === 'function') {
                generator = loaded_module[generator_name];
                break;
            }
        }

        if (!generator) {
            const fallback_entry = Object.entries(loaded_module).find(
                ([export_name, exported_value]) =>
                    export_name.startsWith('generate_') &&
                    export_name.endsWith('_puzzle') &&
                    typeof exported_value === 'function'
            );

            if (fallback_entry) {
                generator = fallback_entry[1];
            }
        }
    }

    mode_generator_cache.set(mode, generator);
    return generator;
}


const MODE_EXPORT_META = {
    classic: { type: '标准', rule: '每行、每列、每宫数字均不重复' },
    full: { type: '全标', rule: '除标准数独规则外，灰格内只能填规定全标数字' },
    anti_king: { type: '无缘', rule: '除标准数独规则外，对角相邻（进一拐一）位置的数字也均不重复' },
    anti_knight: { type: '无马', rule: '除标准数独规则外，象棋马步（进二拐一）位置的数字也均不重复' },
    anti_elephant: { type: '无象', rule: '除标准数独规则外，中国象棋象步（进二拐二）位置的数字也均不重复' },
    isomorphic: { type: '同位', rule: '除标准数独规则外，各宫相同位置上的数字也均不重复' },
    diagonal: { type: '对角线', rule: '除标准数独规则外，每条对角线上的数字也均不重复' },
    anti_diagonal: { type: '反对角', rule: (size) => `除标准数独规则外，每条对角线上只能出现${size / 3}个数字` },
    multi_diagonal: { type: '斜线', rule: '除标准数独规则外，每条斜线上的数字也均不重复' },
    hashtag: { type: '斜井', rule: '除标准数独规则外，每条井字线上的数字也均不重复' },
    palindrome: { type: '回文', rule: '除标准数独规则外，每条灰线关于中心对称位置上的数字必须相同' },
    quadruple: { type: '四格提示', rule: '除标准数独规则外，盘面内标记表示周围四格内包含的数字' },
    inclusion: { type: '包含', rule: '除标准数独规则外，盘面内标记表示周围四格内至少包含的数字（提示可少于4个）' },
    add: { type: '加法', rule: '除标准数独规则外，盘面内标记表示标记区域内数字之和' },
    product: { type: '乘积', rule: '除标准数独规则外，盘面内标记表示两侧格内数字的乘积' },
    ratio: { type: '比例', rule: '除标准数独规则外，盘面内标记表示两侧格内数字的比例关系' },
    inequality: { type: '不等号', rule: '除标准数独规则外，盘面内标记表示两侧格内数字的大小关系' },
    consecutive: { type: '连续', rule: '除标准数独规则外，盘面内标记表示两侧格内数字连续（差为1），满足条件的连续标记均已标出' },
    kropki: { type: '黑白点', rule: '除标准数独规则外，盘面内黑点表示两侧格内数字为2倍关系，白点表示两侧格内数字差为1，没有标记表示两侧格内数字既不是2倍关系，也不是差为1' },
    five_six: { type: '五六', rule: '除标准数独规则外，盘面内标记表示两侧格内数字和为5(6)，满足条件的5(6)标记均已标出' },
    exclusion: { type: '排除', rule: '除标准数独规则外，盘面内标记表示周围四格内不包含标记中的数字' },
    VX: { type: 'VX', rule: '除标准数独规则外，盘面内标记表示两侧格内数字和为5(10)，满足条件的V(X)标记均已标出' },
    extra_region: { type: '额外区域', rule: '除标准数独规则外，每个额外区域内的数字也均不重复' },
    window: { type: '窗口', rule: '除标准数独规则外，每个灰色窗口区域内的数字也均不重复' },
    pyramid: { type: '金字塔', rule: '除标准数独规则外，每个灰色金字塔区域内的数字也均不重复' },
    renban: { type: '灰格连续', rule: '除标准数独规则外，每个灰色区域内的数字由一组差值为 1 的（即连续数）数组组成' },
    clone: { type: '克隆', rule: '除标准数独规则外，两个形状相同的灰色区域中相同位置的数字必须一致' },
    fortress: { type: '堡垒', rule: '除标准数独规则外，灰格数字大于相邻的白格数字' },
    odd: { type: '奇数', rule: '除标准数独规则外，灰色圆圈内只能填奇数' },
    odd_even: { type: '奇偶', rule: '除标准数独规则外，灰色圆圈内只能填奇数，灰色方框内只能填偶数' },
    missing: { type: '缺一门', rule: '除标准数独规则外，黑格不填数字' },
    thermo: { type: '温度计', rule: '除标准数独规则外，温度计上的数字从圆泡处到尾部严格递增（不能相等）' },
    X_sums: { type: 'X和', rule: '除标准数独规则外，外提示数表示该方向前X格数字之和，X为该方向第一格数字' },
    skyscraper: { type: '摩天楼', rule: '除标准数独规则外，外提示数表示从该方向能看到的楼房数，数字越大代表楼越高，高楼会挡住矮楼' },
    sandwich: { type: '三明治', rule: (size) => `除标准数独规则外，外提示数表示该行或列中数字1和${size}所在位置之间的所有数字之和` },
    rossini: { type: '方向', rule: '除标准数独规则外，外提示箭头表示其对应的边缘三格内数字朝着箭头方向依次增大，满足条件的箭头标记均已标出' },
    killer: { type: '杀手', rule: '除标准数独规则外，每个灰色额外区域内数字也均不重复' }
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

function parse_export_date_value(value) {
    if (!value) {
        return null;
    }

    const [yearStr, monthStr, dayStr] = String(value).split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    const parsed = new Date(year, month - 1, day);
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

function normalize_export_hour_value(value) {
    if (!value) {
        return '';
    }

    const parsedHour = parseInt(String(value), 10);
    if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) {
        return '';
    }

    return String(parsedHour).padStart(2, '0');
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

    const needsOffset = ['X_sums', 'sandwich', 'skyscraper', 'rossini'].includes(state.current_mode);
    return extract_grid_string_from_dom(size, needsOffset);
}

function extract_solution_string(size) {
    const needsOffset = ['X_sums', 'sandwich', 'skyscraper', 'rossini'].includes(state.current_mode);
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

function export_sudoku_as_text(export_options = {}) {
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
    const selectedDateValue = document.getElementById('exportDatePicker')?.value;
    const selectedHourValue = document.getElementById('exportTimePicker')?.value;
    const exportDate = export_options.exportDate || selectedDateValue || format_export_date();
    const exportHourSource = Object.prototype.hasOwnProperty.call(export_options, 'exportHour')
        ? export_options.exportHour
        : selectedHourValue;
    const exportHour = normalize_export_hour_value(exportHourSource);
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

    const hour = normalize_export_hour_value(picker.value);
    btn.textContent = hour ? `选择时间：${hour}点` : '选择时间(可选)';
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
    const check_minimal_nextBtn = document.getElementById('check_minimal_next');
    const check_uniquenessBtn = document.getElementById('check_uniqueness');
    const check_minimal_uniquenessBtn = document.getElementById('check_minimal_uniqueness');
    const hide_solutionBtn = document.getElementById('hide_solution');
    const generatepuzzleBtn = document.getElementById('generate_puzzle');
    let generateChokepointBtn = document.getElementById('generate_chokepoint');
    let generateRealChokepointBtn = document.getElementById('generate_real_chokepoint');
    const clearAllBtn = document.getElementById('clearAll');

    if (generateChokepointBtn) {
        generateChokepointBtn.textContent = '自动出示意图';
    }

    if (!generateChokepointBtn && generatepuzzleBtn) {
        generateChokepointBtn = document.createElement('button');
        generateChokepointBtn.id = 'generate_chokepoint';
        generateChokepointBtn.textContent = '自动出示意图';
        generateChokepointBtn.style.marginLeft = '5px';
        generatepuzzleBtn.insertAdjacentElement('afterend', generateChokepointBtn);
    }

    if (!generateRealChokepointBtn && generatepuzzleBtn) {
        generateRealChokepointBtn = document.createElement('button');
        generateRealChokepointBtn.id = 'generate_real_chokepoint';
        generateRealChokepointBtn.textContent = '自动出卡点';
        generateRealChokepointBtn.style.marginLeft = '5px';
        const anchorBtn = generateChokepointBtn || generatepuzzleBtn;
        anchorBtn.insertAdjacentElement('afterend', generateRealChokepointBtn);
    }

    fourGridBtn.addEventListener('click', () => create_sudoku_grid(4));
    sixGridBtn.addEventListener('click', () => create_sudoku_grid(6));
    nineGridBtn.addEventListener('click', () => create_sudoku_grid(9));
    // checkSolutionBtn.addEventListener('click', check_solution);
    check_uniquenessBtn.addEventListener('click', () => check_uniqueness(false));
    check_nextBtn.addEventListener('click', () => check_uniqueness(true));
    check_minimal_nextBtn.addEventListener('click', () => check_minimal_next_step());
    check_minimal_uniquenessBtn.addEventListener('click', () => check_minimal_uniqueness());
    hide_solutionBtn.addEventListener('click', hide_solution);
    clearAllBtn.addEventListener('click', clear_all_inputs);
    
    document.getElementById('importSudokuFromString').addEventListener('click', import_sudoku_from_string);
    document.getElementById('exportSudokuToString').addEventListener('click', export_sudoku_to_string);
    document.getElementById('exportSudokuAsText').addEventListener('click', async () => {
        await handle_export_text_click();
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
            exportTimePicker.value = normalize_export_hour_value(exportTimePicker.value);
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
        const needsOffset = ['X_sums', 'sandwich', 'skyscraper', 'rossini'].includes(state.current_mode);
        const inputSize = needsOffset ? size + 2 : size;
        const rowOffset = needsOffset ? 0 : 0;
        const colOffset = needsOffset ? 0 : 0;
        const inputs = Array.from({ length: inputSize }, (_, row) =>
            Array.from({ length: inputSize }, (_, col) =>
                document.querySelector(`.sudoku-cell input[data-row="${row + rowOffset}"][data-col="${col + colOffset}"]`)
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
    batchBtn.textContent = '批量出题';
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

    // 新增：批量出示意图
    const batchDiagramBtn = document.createElement('button');
    batchDiagramBtn.id = 'batchGenerateDiagram';
    batchDiagramBtn.textContent = '批量示意图';
    batchDiagramBtn.style.marginLeft = '5px';
    generateRow2.appendChild(batchDiagramBtn);

    // 新增：批量出卡点
    const batchChokepointBtn = document.createElement('button');
    batchChokepointBtn.id = 'batchGenerateChokepoint';
    batchChokepointBtn.textContent = '批量卡点';
    batchChokepointBtn.style.marginLeft = '5px';
    generateRow2.appendChild(batchChokepointBtn);

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

    const hardestBtn = document.createElement('button');
    hardestBtn.id = 'hardestScoreBtn';
    hardestBtn.textContent = '最难卡点';
    hardestBtn.style.marginLeft = '5px';

    const clone_board_snapshot = (boardSnapshot) => {
        if (!Array.isArray(boardSnapshot)) {
            return null;
        }

        return boardSnapshot.map((row) =>
            row.map((cell) => ({
                ...cell,
                classList: Array.isArray(cell?.classList) ? [...cell.classList] : []
            }))
        );
    };

    const capture_current_board_snapshot = () => {
        backup_original_board();
        return clone_board_snapshot(state.originalBoard);
    };

    const restore_board_snapshot = (snapshot) => {
        const cloned = clone_board_snapshot(snapshot);
        if (!cloned) {
            return false;
        }

        state.originalBoard = cloned;
        restore_original_board();
        return true;
    };

    // 插入到分值下限输入框后面
    check_nextBtn.parentNode.insertBefore(jumpBtn, check_uniquenessBtn);
    check_nextBtn.parentNode.insertBefore(hardestBtn, check_uniquenessBtn);

    jumpBtn.addEventListener('click', async () => {
        let maxLoop = 100; // 防止死循环
        while (maxLoop-- > 0) {
            check_minimal_next_step();
            // 等待异步渲染（如有），可适当延时
            await new Promise(resolve => setTimeout(resolve, 200));
            if (state.solve_stats.total_score > 29 || state.solve_stats.total_score === 0) {
                // 停止时撤回最后一次“最简下一步”
                restore_original_board();
                break;
            }
        }
    });

    hardestBtn.addEventListener('click', async () => {
        let maxLoop = 100; // 防止死循环
        let currentStep = 0;
        let highestStep = 0;
        let stepBeforeHighest = 0;
        let highestScore = Number.NEGATIVE_INFINITY;
        let snapshotBeforeHighest = capture_current_board_snapshot();
        let previousSnapshot = clone_board_snapshot(snapshotBeforeHighest);
        let previousStep = 0;
        let reachedZero = false;

        while (maxLoop-- > 0) {
            const result = check_minimal_next_step();
            await new Promise(resolve => setTimeout(resolve, 200));

            currentStep++;
            const currentScore = Number(result?.total_score ?? state.solve_stats?.total_score);
            const currentSnapshot = capture_current_board_snapshot();

            if (Number.isFinite(currentScore) && currentScore > highestScore) {
                const prevSnapshotClone = clone_board_snapshot(previousSnapshot);
                if (prevSnapshotClone) {
                    highestScore = currentScore;
                    snapshotBeforeHighest = prevSnapshotClone;
                    highestStep = currentStep;
                    stepBeforeHighest = previousStep;
                }
            }

            if (currentScore === 0) {
                reachedZero = true;
                break;
            }

            if (currentSnapshot) {
                previousSnapshot = currentSnapshot;
                previousStep = currentStep;
            }
        }

        if (snapshotBeforeHighest && restore_board_snapshot(snapshotBeforeHighest) && Number.isFinite(highestScore)) {
            show_result(`已回退到最高分上一步：第${stepBeforeHighest}步（最高分在第${highestStep}步，分值${highestScore}）`);
            return;
        }

        if (!reachedZero) {
            show_result('未在限制步数内到达分值0，无法定位最难卡点');
            return;
        }

        show_result('未找到有效的最高分步骤，无法回退');
    });

    async function generate_once_by_mode(score_lower_limit, holes_count, use_mode_specific_generator) {

        if (!use_mode_specific_generator) {
            return generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        }

        const generator = await resolve_mode_specific_generator(state.current_mode);
        if (typeof generator === 'function') {
            return generator(state.current_grid_size, score_lower_limit, holes_count);
        }

        return generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
    }

    function get_current_clues_count() {
        const size = state.current_grid_size;
        const container = document.querySelector('.sudoku-container');
        const isBorderedMode = ['X_sums', 'sandwich', 'skyscraper', 'rossini'].includes(state.current_mode);
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

    // 普通约束出题入口。
    // 顶部“自动出题”按钮走 use_mode_specific_generator = false，只生成题面。
    // 批量导出文本、批量保存图片等走 true，会按当前题型解析对应的专用生成器，把变型提示一起生成出来。
    // 这里默认给 500 次重试，适合普通题目批量筛分值/已知数范围。
    async function generate_in_constraints(options, use_mode_specific_generator, max_try = 1000) {
        return generate_with_constraints(
            (current_score_lower_limit) => generate_once_by_mode(current_score_lower_limit, options.holesCount, use_mode_specific_generator),
            options,
            max_try
        );
    }

    // “自动出示意图”入口。
    // 底层走 generate_chokepoint_puzzle：挖洞校验改成“最简下一步能否推进”，
    // 目的是保留一个可展示解题切入点的盘面，所以更偏向示意而不是严格卡点。
    async function generate_chokepoint_in_constraints(options, max_try = 100) {
        return generate_with_constraints(
            (current_score_lower_limit) => generate_chokepoint_puzzle(state.current_grid_size, current_score_lower_limit, options.holesCount),
            options,
            max_try
        );
    }

    // “自动出卡点”入口。
    // 底层走 generate_real_chokepoint_puzzle；相比示意图模式，额外启用 stopOnSingleProgress，
    // 挖洞时一旦盘面只剩单步推进就停止，更接近真正的卡点题，因此单独保留一套入口。
    async function generate_real_chokepoint_in_constraints(options, max_try = 100) {
        return generate_with_constraints(
            (current_score_lower_limit) => generate_real_chokepoint_puzzle(state.current_grid_size, current_score_lower_limit, options.holesCount),
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

    function get_export_mode_flags() {
        return {
            dailyChecked: !!document.getElementById('exportModeDaily')?.checked,
            hourlyChecked: !!document.getElementById('exportModeHourly')?.checked
        };
    }

    function get_export_start_date() {
        const selectedDateValue = document.getElementById('exportDatePicker')?.value;
        const parsedDate = parse_export_date_value(selectedDateValue);
        if (parsedDate) {
            return parsedDate;
        }

        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function run_single_export_text(exportOptions = {}) {
        hide_solution();
        check_minimal_uniqueness();
        export_sudoku_as_text(exportOptions);
    }

    async function run_daily_export_text_batch(options) {
        const exportDateCursor = get_export_start_date();

        for (let i = 0; i < 7; i++) {
            const generated = await generate_in_constraints(options, true);
            if (!generated) {
                show_result(`第${i + 1}次导出失败：${get_generation_failure_message(options)}`);
                return false;
            }

            run_single_export_text({
                exportDate: format_export_date(exportDateCursor),
                exportHour: ''
            });
            exportDateCursor.setDate(exportDateCursor.getDate() + 1);
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return true;
    }

    function get_hourly_export_start_datetime() {
        const selectedHourValue = document.getElementById('exportTimePicker')?.value;
        const exportHour = normalize_export_hour_value(selectedHourValue);

        if (!exportHour) {
            alert('勾选“整点”后，请先选择小时。');
            return null;
        }

        const exportDate = get_export_start_date();
        exportDate.setHours(parseInt(exportHour, 10), 0, 0, 0);
        return exportDate;
    }

    async function run_hourly_export_text_batch(options) {
        const exportDateTimeCursor = get_hourly_export_start_datetime();
        if (!exportDateTimeCursor) {
            return false;
        }

        for (let i = 0; i < 4; i++) {
            const generated = await generate_in_constraints(options, true);
            if (!generated) {
                show_result(`第${i + 1}次导出失败：${get_generation_failure_message(options)}`);
                return false;
            }

            run_single_export_text({
                exportDate: format_export_date(exportDateTimeCursor),
                exportHour: format_export_hour(exportDateTimeCursor)
            });
            exportDateTimeCursor.setHours(exportDateTimeCursor.getHours() + 6);
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return true;
    }

    async function run_daily_hourly_export_text_batch(options) {
        const startDateTime = get_hourly_export_start_datetime();
        if (!startDateTime) {
            return false;
        }

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const exportDateTimeCursor = new Date(startDateTime);
            exportDateTimeCursor.setDate(startDateTime.getDate() + dayIndex);
            exportDateTimeCursor.setHours(startDateTime.getHours(), 0, 0, 0);

            for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
                const generated = await generate_in_constraints(options, true);
                if (!generated) {
                    show_result(`第${dayIndex + 1}天第${slotIndex + 1}次导出失败：${get_generation_failure_message(options)}`);
                    return false;
                }

                run_single_export_text({
                    exportDate: format_export_date(exportDateTimeCursor),
                    exportHour: format_export_hour(exportDateTimeCursor)
                });
                exportDateTimeCursor.setHours(exportDateTimeCursor.getHours() + 6);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return true;
    }

    async function handle_export_text_click() {
        const { dailyChecked, hourlyChecked } = get_export_mode_flags();

        if (!dailyChecked && !hourlyChecked) {
            run_single_export_text();
            return;
        }

        const options = get_generation_options();
        if (!options) {
            return;
        }

        show_generating_timer();

        try {
            let exportSuccess = false;
            let successMessage = '';

            if (dailyChecked && hourlyChecked) {
                exportSuccess = await run_daily_hourly_export_text_batch(options);
                successMessage = '每日+整点导出完成，共导出28题。';
            } else if (dailyChecked) {
                exportSuccess = await run_daily_export_text_batch(options);
                successMessage = '每日导出完成，共导出7题。';
            } else {
                exportSuccess = await run_hourly_export_text_batch(options);
                successMessage = '整点导出完成，共导出4题。';
            }

            if (!exportSuccess) {
                return;
            }

            show_result(successMessage);
        } finally {
            hide_generating_timer();
        }
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

    generateChokepointBtn?.addEventListener('click', async () => {
        const options = get_generation_options();
        if (!options) {
            return;
        }

        show_generating_timer();

        setTimeout(async () => {
            const generated = await generate_chokepoint_in_constraints(options);
            if (!generated) {
                show_result(get_generation_failure_message(options));
            }
            hide_generating_timer();
        }, 0);
    });

    generateRealChokepointBtn?.addEventListener('click', async () => {
        const options = get_generation_options();
        if (!options) {
            return;
        }

        show_generating_timer();

        setTimeout(async () => {
            const generated = await generate_real_chokepoint_in_constraints(options);
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

            // 增加延迟以确保页面渲染和图片保存完成，减少错存问题
            await new Promise(resolve => setTimeout(resolve, 2200));
            save_sudoku_as_image(true, withWatermark, './potato_sudoku.png', { withAxisLabels });
            await new Promise(resolve => setTimeout(resolve, 2800));
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

    // 批量示意图：批量生成卡点示意图并保存图片
    async function runBatchGenerateDiagramAndSave(count, options, withWatermark, withAxisLabels) {
        if (isNaN(count) || count < 1) return;

        for (let i = 0; i < count; i++) {
            const generated = await generate_chokepoint_in_constraints(options);
            if (!generated) continue;

            await new Promise(resolve => setTimeout(resolve, 2200));
            save_sudoku_as_image(true, withWatermark, './potato_sudoku.png', { withAxisLabels });
            await new Promise(resolve => setTimeout(resolve, 2800));
        }
    }

    batchDiagramBtn.addEventListener('click', async () => {
        const options = get_generation_options();
        if (!options) {
            return;
        }

        const count = parseInt(batchInput.value, 10) || 1;
        const { withWatermark, withAxisLabels } = get_batch_image_preferences();
        await runBatchGenerateDiagramAndSave(count, options, withWatermark, withAxisLabels);
    });

    // 批量卡点：批量生成真正卡点题并保存图片
    async function runBatchGenerateChokepointAndSave(count, options, withWatermark, withAxisLabels) {
        if (isNaN(count) || count < 1) return;

        for (let i = 0; i < count; i++) {
            const generated = await generate_real_chokepoint_in_constraints(options);
            if (!generated) continue;

            await new Promise(resolve => setTimeout(resolve, 2200));
            save_sudoku_as_image(true, withWatermark, './potato_sudoku.png', { withAxisLabels });
            await new Promise(resolve => setTimeout(resolve, 2800));
        }
    }

    batchChokepointBtn.addEventListener('click', async () => {
        const options = get_generation_options();
        if (!options) {
            return;
        }

        const count = parseInt(batchInput.value, 10) || 1;
        const { withWatermark, withAxisLabels } = get_batch_image_preferences();
        await runBatchGenerateChokepointAndSave(count, options, withWatermark, withAxisLabels);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventHandlers();
    // 默认创建4宫格
    create_sudoku_grid(4);
});