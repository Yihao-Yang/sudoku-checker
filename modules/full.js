import { state, set_current_mode } from '../solver/state.js';
import { create_base_grid, create_base_cell, add_Extra_Button, log_process, backup_original_board, restore_original_board, handle_key_navigation, show_result, clear_all_inputs, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { generate_puzzle, generate_solved_board_brute_force } from '../solver/generate.js';
import { get_all_regions, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { create_technique_panel } from '../solver/classic.js';

let full_allowed_numbers = new Set();

function get_default_full_numbers(size) {
    const defaults = [];
    for (let n = 1; n <= size; n++) {
        if (n % 2 === 1) {
            defaults.push(n);
        }
    }
    return defaults;
}

function normalize_full_numbers(numbers, size) {
    const unique = new Set();
    for (const value of numbers) {
        const num = Number(value);
        if (Number.isInteger(num) && num >= 1 && num <= size) {
            unique.add(num);
        }
    }
    return Array.from(unique).sort((a, b) => a - b);
}

function ensure_full_allowed_numbers(size) {
    const normalized = normalize_full_numbers(Array.from(full_allowed_numbers), size);
    const next = normalized.length > 0 ? normalized : get_default_full_numbers(size);
    full_allowed_numbers = new Set(next);
    return next;
}

function get_full_allowed_numbers(size) {
    ensure_full_allowed_numbers(size);
    return full_allowed_numbers;
}

function update_full_number_button_text(btn, size) {
    if (!btn) return;
    const numbers = ensure_full_allowed_numbers(size);
    btn.textContent = `全标数字:${numbers.join('/')}`;
}

function normalize_full_cell_value(value, size) {
    const num = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isInteger(num) && num >= 1 && num <= size ? num : 0;
}

function build_full_board_from_dom(size, container = document.querySelector('.sudoku-container')) {
    return Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => {
            const input = container?.querySelector(`.sudoku-grid input[data-row="${row}"][data-col="${col}"]`);
            return normalize_full_cell_value(input?.value, size);
        })
    );
}

function show_full_number_picker(size, current) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '2000';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#fff';
        dialog.style.borderRadius = '10px';
        dialog.style.padding = '16px';
        dialog.style.minWidth = '280px';
        dialog.style.maxWidth = '420px';
        dialog.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';

        const title = document.createElement('div');
        title.textContent = `选择全标数字 (1-${size})`;
        title.style.fontSize = '16px';
        title.style.fontWeight = '600';
        title.style.marginBottom = '12px';

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
        grid.style.gap = '8px';
        grid.style.marginBottom = '12px';

        for (let n = 1; n <= size; n++) {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '6px';
            label.style.fontSize = '14px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = String(n);
            checkbox.checked = current.includes(n);

            const text = document.createElement('span');
            text.textContent = String(n);

            label.appendChild(checkbox);
            label.appendChild(text);
            grid.appendChild(label);
        }

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '8px';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.backgroundColor = '#9E9E9E';

        const okBtn = document.createElement('button');
        okBtn.textContent = '确定';
        okBtn.style.backgroundColor = '#1976D2';

        const close = (result) => {
            overlay.remove();
            resolve(result);
        };

        cancelBtn.addEventListener('click', () => close(null));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close(null);
            }
        });

        okBtn.addEventListener('click', () => {
            const selected = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => Number(checkbox.value));
            close(selected);
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);

        dialog.appendChild(title);
        dialog.appendChild(grid);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}

async function pick_full_numbers(size) {
    const current = ensure_full_allowed_numbers(size);
    const values = await show_full_number_picker(size, current);
    if (values === null) {
        return false;
    }

    const normalized = normalize_full_numbers(values, size);
    if (normalized.length === 0) {
        show_result('请至少选择一个全标数字', 'error');
        return false;
    }

    full_allowed_numbers = new Set(normalized);
    return true;
}

// 全标数独主入口
export function create_full_sudoku(size) {
    set_current_mode('full');
    show_result(`当前模式为全标数独`);
    log_process('', true);
    log_process('规则：');
    const active_numbers = ensure_full_allowed_numbers(size);
    // log_process(`全标数字：${active_numbers.join('、')}`);
    log_process(`灰色格子：只能填全标数字${active_numbers.join('、')}`);
    log_process('');
    log_process('技巧：');
    // log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    // log_process('"额外区域"：附加的不可重复区域');
    // log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('若手动给的标记不合理可能会被代码忽视');
    log_process('');
    log_process('自动出题：');
    log_process('蓝色：自动添加标记出题');
    log_process('绿色：根据给定标记出题');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

    // 修改技巧开关
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Box_Pair_Block: true,
        Row_Col_Block: true,
        Box_Naked_Pair: true,
        Row_Col_Naked_Pair: true,
        Box_Hidden_Pair: true,
        Row_Col_Hidden_Pair: true,
        Box_Naked_Triple: true,
        Row_Col_Naked_Triple: true,
        Box_Hidden_Triple: true,
        Row_Col_Hidden_Triple: true,
        All_Quad: false,
        Cell_Elimination: true,
        Brute_Force: false,
        // Special_Combination_Region_Cell_Elimination_1: true,
        Lookup_Table: true,
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 刷新技巧面板
    create_technique_panel();

    // 创建基础数独盘面
    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        main_input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
            if (this.value.length > 1) {
                this.value = this.value[this.value.length - 1];
            }
        });

        main_input.addEventListener('keydown', function(e) {
            handle_key_navigation(e, row, col, size, inputs);
        });
        
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 标记模式状态
    let is_mark_mode = false;
    let mark_mode_btn = null;

    // 切换标记模式
    function toggle_mark_mode() {
        is_mark_mode = !is_mark_mode;
        if (!mark_mode_btn) {
            mark_mode_btn = Array.from(document.getElementById('extraButtons').children).find(btn => btn.textContent.includes('标记'));
        }
        if (mark_mode_btn) {
            mark_mode_btn.textContent = is_mark_mode ? '退出标记' : '添加标记';
        }
    }

    // 全标数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('全标', () => {create_full_sudoku(size)}, '#2196F3');
    const full_number_btn = add_Extra_Button('全标数字', async () => {
        const changed = await pick_full_numbers(size);
        if (!changed) return;
        update_full_number_button_text(full_number_btn, size);
        const selected = ensure_full_allowed_numbers(size);
        log_process(`全标数字更新为：${selected.join('、')}`);
        show_result(`全标数字已更新：${selected.join('、')}`);
    }, '#2196F3');
    const mark_btn = add_Extra_Button('添加标记', toggle_mark_mode, '#2196F3');
    if (full_number_btn && mark_btn && mark_btn.parentNode === extra_buttons) {
        extra_buttons.insertBefore(full_number_btn, mark_btn);
    }
    update_full_number_button_text(full_number_btn, size);
    add_Extra_Button('清除标记', clear_full_marks, '#2196F3');
    add_Extra_Button('标记全部', () => {
        const count = mark_all_full_marks(size);
        show_result(count > 0 ? `已添加 ${count} 个全标标记` : '未找到可标记的全标数字');
    }, '#4CAF50');
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_full_puzzle(size, score_lower_limit, holes_count)) || (() => generate_full_puzzle(size)), '#2196F3');

    // 交互：点击格子添加/移除全标标记（灰色格子）
    grid.addEventListener('click', function(e) {
        if (!is_mark_mode) return;
        const cell = e.target.closest('.sudoku-cell');
        if (!cell) return;
        const has_mark = cell.classList.contains('full-mark');
        if (has_mark) {
            cell.classList.remove('full-mark');
            cell.classList.remove('extra-region-cell');
            cell.classList.remove('gray-cell');
        } else {
            cell.classList.add('full-mark');
            cell.classList.add('extra-region-cell');
            cell.classList.add('gray-cell');
        }
    });
}

export function mark_all_full_marks(size, board = null) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return 0;

    const source_board = Array.isArray(board) ? board : build_full_board_from_dom(size);
    const allowed_numbers = get_full_allowed_numbers(size);

    let mark_count = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = grid.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
            if (!cell) continue;

            const value = normalize_full_cell_value(source_board[row]?.[col], size);
            if (allowed_numbers.has(value)) {
                if (!cell.classList.contains('full-mark')) {
                    mark_count++;
                }
                cell.classList.add('full-mark');
                cell.classList.add('extra-region-cell');
                cell.classList.add('gray-cell');
            }
        }
    }

    return mark_count;
}

// 自动生成全标数独题目（生成若干全标标记并调用generate_puzzle）
export function generate_full_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    Array.from(grid.querySelectorAll('.sudoku-cell.full-mark')).forEach(cell => {
        cell.classList.remove('full-mark');
        cell.classList.remove('extra-region-cell');
        cell.classList.remove('gray-cell');
    });

    clear_all_inputs();
    log_process('', true);
    invalidate_regions_cache();

    log_process('第一步：生成标准数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        show_result('生成终盘失败', 'error');
        return;
    }

    log_process('第二步：标记全部符合条件的全标数字...');
    log_process('正在生成题目，请稍候...');
    show_result('正在生成题目，请稍候...');
    show_generating_timer();

    setTimeout(() => {
        const marks_added = mark_all_full_marks(size, solvedBoard);
        log_process(`已添加 ${marks_added} 个全标标记`);
        generate_puzzle(state.current_grid_size, score_lower_limit, holes_count, solvedBoard);
        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`全标数独生成成功，耗时${elapsed}秒`);
    }, 0);
}

// 应用所有全标标记：有 full-mark 的格子只能填入全标
export function apply_full_marks(board, size) {
    const allowed_numbers = get_full_allowed_numbers(size);
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;
    const cells = grid.querySelectorAll('.sudoku-cell');
    for (const cell of cells) {
        // 获取该格的坐标
        const row = parseInt(cell.getAttribute('data-row'));
        const col = parseInt(cell.getAttribute('data-col'));
        if (isNaN(row) || isNaN(col)) continue;

        if (Array.isArray(board[row][col])) {
            if (cell.classList.contains('full-mark')) {
                // 灰格：只能填入被选中的全标数字
                board[row][col] = board[row][col].filter(n => allowed_numbers.has(n));
            } else {
                // 白格：不能填入被选中的全标数字
                board[row][col] = board[row][col].filter(n => !allowed_numbers.has(n));
            }
        }
    }
}

// 清除所有全标标记
function clear_full_marks() {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;
    Array.from(grid.querySelectorAll('.sudoku-cell.full-mark')).forEach(cell => {
        cell.classList.remove('full-mark');
        cell.classList.remove('extra-region-cell');
        cell.classList.remove('gray-cell');
    });
}

// 新增：获取所有全标标记对应的区域（每个格子单独成区）
export function get_full_cells() {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return [];
    const cells = Array.from(grid.querySelectorAll('.sudoku-cell'));
    const regions = [];
    for (const cell of cells) {
        if (cell.classList.contains('full-mark')) {
            const row = parseInt(cell.getAttribute('data-row'));
            const col = parseInt(cell.getAttribute('data-col'));
            if (!Number.isNaN(row) && !Number.isNaN(col)) {
                // 每个全标标记格子单独构成一个区域
                regions.push([[row, col]]);
            }
        }
    }
    return regions;
}

// 全标数独有效性检测函数
export function is_valid_full(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'full';
    const regions = get_all_regions(size, mode);
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col)) {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 全标标记判断
    const allowed_numbers = get_full_allowed_numbers(size);
    const grid = document.querySelector('.sudoku-grid');
    if (grid) {
        const cell = grid.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
        if (cell && cell.classList.contains('full-mark')) {
            // 灰格只能填入被选中的全标数字
            if (!allowed_numbers.has(num)) return false;
        } else {
            // 白格不能填入被选中的全标数字
            if (allowed_numbers.has(num)) return false;
        }
    }

    return true;
}