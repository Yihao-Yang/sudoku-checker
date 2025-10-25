import { state, set_current_mode } from './state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_inner_numbers, clear_outer_clues } from './core.js';
import { create_technique_panel } from './classic.js';
import { get_all_regions, isValid, solve } from '../solver/solver_tool.js';

// 新数独主入口
export function create_sandwich_sudoku(size) {
    set_current_mode('sandwich');
    state.current_grid_size = size;

    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');

    // 技巧设置（可根据需要调整）
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
        Special_Combination_Region_Elimination: true,
        Special_Combination_Region_Block: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

    const { container, grid } = create_base_grid(size, true);
    const inputs = Array.from({ length: size + 2 }, () => new Array(size + 2));

    for (let row = 0; row < size + 2; row++) {
        for (let col = 0; col < size + 2; col++) {
            const { cell, main_input, candidates_grid } = create_base_cell(row, col, size, true);
            cell.appendChild(main_input);
            cell.appendChild(candidates_grid);
            grid.appendChild(cell);
            inputs[row][col] = main_input;

            // 内部格子添加候选数网格
            if (row >= 1 && row <= size && col >= 1 && col <= size) {
                cell.appendChild(candidates_grid);
            } else {
                // 外部格子：调整数字尺寸
                main_input.style.fontSize = '36px'; // 将字体大小改为16px
            }

            main_input.addEventListener('input', function() {
                let regex;
                if (row >= 1 && row <= size && col >= 1 && col <= size) {
                    // 内部格子：只允许1~size
                    regex = new RegExp(`[^1-${size}]`, 'g');
                    this.value = this.value.replace(regex, '');
                    if (this.value.length > 1) {
                        this.value = this.value[this.value.length - 1];
                    }
                } else {
                    // 外部格子：只允许数字，最大为size的阶乘
                    const max_sum = (size * (size + 1)) / 2;
                    regex = /[^\d]/g;
                    this.value = this.value.replace(regex, '');
                    if (parseInt(this.value) > max_sum) {
                        this.value = max_sum.toString();
                    }
                }
            });

            // 键盘导航
            main_input.addEventListener('keydown', function(e) {
                handle_key_navigation(e, row, col, size + 2, inputs);
            });

            // 点击全选
            main_input.addEventListener('click', function() {
                this.select();
            });
        }
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 摩天楼专属按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';
    add_Extra_Button('清除内部数字', clear_inner_numbers, '#2196F3'); // 添加清除内部数字按钮
    add_Extra_Button('清除外部提示数', clear_outer_clues, '#2196F3'); // 清除外部提示数
    add_Extra_Button('标记外部提示数', () => mark_outer_clues(size), '#2196F3'); // 添加标记外部提示数按钮
    add_Extra_Button('自动出题', () => generate_sandwich_puzzle(size), '#2196F3');
    // add_Extra_Button('一键标记', auto_mark_skyscraper_clues, '#2196F3');
    // add_Extra_Button('验证摩天楼唯一性', check_skyscraper_uniqueness, '#2196F3');
    // add_Extra_Button('清除标记', clear_outer_clues, '#2196F3');
}

// 生成三明治数独题目
export function generate_sandwich_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    size = size + 2;
    clear_inner_numbers();
    clear_outer_clues();
    log_process('', true);
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    // 初始化空盘面
    let board = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0)
    );

    // 添加提示数
    const add_clue = (row, col, value) => {
        const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
        if (input) {
            input.value = value;
            board[row][col] = value; // 同步更新到 board
        }
    };


    // 随机生成提示数，只在首行、首列
    const positions_set = new Set();
    let marks_added = 0;
    let try_limit = 1000; // 防止死循环
    while (try_limit-- > 0) {
        let row, col;

        // 随机选择提示数位置：首行、首列
        const edge = Math.floor(Math.random() * 2);
        if (edge === 0) {
            // 首行，跳过左上角和右上角
            row = 0;
            col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
        } else if (edge === 1) {
            // 首列，跳过左上角和左下角
            row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
            col = 0;
        }

        // 根据 size 设置半排除数组
        let semi_excluded_values = [];
        if (size === 6) {
            semi_excluded_values = [2, 3];
        } else if (size === 8) {
            semi_excluded_values = [0, 2, 3, 4, 6, 8, 10, 11, 12, 14];
        } else if (size === 11) {
            semi_excluded_values = [];
        }
        let excluded_values = []; // 要排除的值
        if (size === 6) {
            excluded_values = [1, 4];
        } else if (size === 8) {
            excluded_values = [1, 13];
        } else if (size === 11) {
            excluded_values = [];
        }
        // const excluded_values = [1]; // 要排除的值
        let value1;
        do {
            const min_sum = 0;
            const max_sum = Math.floor((size - 2) * (size - 3) / 2 - 1);
            value1 = Math.floor(Math.random() * (max_sum - min_sum + 1)) + min_sum;
            // log_process(`尝试生成提示数 at (${row},${col}) = ${value1}`);
            // 完全排除
            if (excluded_values.includes(value1)) continue;
            // 半排除
            if (semi_excluded_values.includes(value1) && Math.random() < 0.5) continue;
            break;
        } while (true);

        if (positions_set.has(`${row},${col}`)) continue;

        // 添加标记
        add_clue(row, col, value1);
        log_process(`尝试添加提示数 at (${row},${col}) = ${value1}`);

        backup_original_board();
        const result = solve(board, size - 2, isValid, true);

        if (result.solution_count === 0 || result.solution_count === -2) {
            log_process(`添加提示数 (${row},${col})=${value1} 后无解，撤销标记`);
            restore_original_board();
            // 无解，撤销标记
            const input1 = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (input1) input1.value = '';
            continue;
        }
        if (result.solution_count === 1) {
            positions_set.add(`${row},${col}`);
            marks_added += 1;
            break;
        }
        positions_set.add(`${row},${col}`);
        marks_added += 1;
    }

    // generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
}

// 添加标记外部提示数的功能
function mark_outer_clues(size) {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    log_process(`标记外部提示数: ${size}`);

    // 上下两行
    for (let col = 1; col <= size; col++) {
        let nums = [];
        for (let row = 1; row <= size; row++) {
            const cell = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            const val = cell && cell.value ? parseInt(cell.value) : 0;
            nums.push(val);
        }
        const idx1 = nums.indexOf(1);
        const idxSize = nums.indexOf(size);
        const top_input = grid.querySelector(`input[data-row="0"][data-col="${col}"]`);
        if (idx1 !== -1 && idxSize !== -1 && Math.abs(idx1 - idxSize) >= 1) {
            const start = Math.min(idx1, idxSize) + 1;
            const end = Math.max(idx1, idxSize);
            let sum_top = 0;
            if (end > start) {
                sum_top = nums.slice(start, end).reduce((acc, v) => acc + v, 0);
            }
            if (top_input) top_input.value = sum_top;
        } else {
            if (top_input) top_input.value = '';
        }
    }

    // 左右两列
    for (let row = 1; row <= size; row++) {
        let nums = [];
        for (let col = 1; col <= size; col++) {
            const cell = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            const val = cell && cell.value ? parseInt(cell.value) : 0;
            nums.push(val);
        }
        const idx1 = nums.indexOf(1);
        const idxSize = nums.indexOf(size);
        const left_input = grid.querySelector(`input[data-row="${row}"][data-col="0"]`);
        if (idx1 !== -1 && idxSize !== -1 && Math.abs(idx1 - idxSize) >= 1) {
            const start = Math.min(idx1, idxSize) + 1;
            const end = Math.max(idx1, idxSize);
            let sum_left = 0;
            if (end > start) {
                sum_left = nums.slice(start, end).reduce((acc, v) => acc + v, 0);
            }
            if (left_input) left_input.value = sum_left;
        } else {
            if (left_input) left_input.value = '';
        }
    }
}

/**
 * 验证 三明治数独的有效性
 * @param {Array} board - 数独盘面（不包含提示数）
 * @param {number} size - 数独大小
 * @param {number} row - 当前行
 * @param {number} col - 当前列
 * @param {number} num - 当前填入的数字
 * @returns {boolean} 是否有效
 */
export function is_valid_sandwich(board, size, row, col, num) {
    const container = document.querySelector('.sudoku-container');

    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'sandwich';
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

    // 2. 检查行的三明治规则
    const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));
    const row_values = temp_board[row];
    // log_process(`检查行 ${row} 的三明治规则: ${row_values}`);
    const idx1_row = row_values.indexOf(1);
    const idxSize_row = row_values.indexOf(size);

    if (idx1_row !== -1 && idxSize_row !== -1) {
        const start = Math.min(idx1_row, idxSize_row) + 1;
        const end = Math.max(idx1_row, idxSize_row);

        // 检查是否存在数组状态的格子
        const has_array_in_row = row_values.slice(start, end).some(cell => Array.isArray(cell));
        if (has_array_in_row) {
            // log_process(`行 ${row} 存在数组状态的格子，跳过三明治规则检查`);
        } else {
            const sum = row_values.slice(start, end).reduce((acc, val) => acc + (val || 0), 0);
            // log_process(`行 ${row} 三明治部分的和为 ${sum}`);
            const left_clue = container.querySelector(`input[data-row="${row + 1}"][data-col="0"]`);
            if (left_clue && left_clue.value !== '') {
                const clue = parseInt(left_clue.value);
                if (clue !== sum) {
                    return false;
                }
            }
        }
    }

    // 3. 检查列的三明治规则
    const col_values = temp_board.map(r => r[col]);
    const idx1_col = col_values.indexOf(1);
    const idxSize_col = col_values.indexOf(size);

    if (idx1_col !== -1 && idxSize_col !== -1) {
        const start = Math.min(idx1_col, idxSize_col) + 1;
        const end = Math.max(idx1_col, idxSize_col);

        // 检查是否存在数组状态的格子
        const has_array_in_col = col_values.slice(start, end).some(cell => Array.isArray(cell));
        if (has_array_in_col) {
            // log_process(`列 ${col} 存在数组状态的格子，跳过三明治规则检查`);
        } else {
            const sum = col_values.slice(start, end).reduce((acc, val) => acc + (val || 0), 0);
            const top_clue = container.querySelector(`input[data-row="0"][data-col="${col + 1}"]`);
            if (top_clue && top_clue.value !== '') {
                const clue = parseInt(top_clue.value);
                if (clue !== sum) {
                    return false;
                }
            }
        }
    }

    return true;
}