import { state, set_current_mode } from './state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs } from './core.js';
import { create_technique_panel } from './classic.js';
import { get_all_regions, solve } from '../solver/solver_tool.js';
import { generate_puzzle } from '../solver/generate.js';

// 新数独主入口
export function create_add_sudoku(size) {
    set_current_mode('add');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

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
        Multi_Special_Combination_Region_Elimination: true,
        Special_Combination_Region_Block: true,
        Multi_Special_Combination_Region_Block: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

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

        bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加标记功能
    add_add_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('自动出题', () => generate_add_puzzle(size), '#2196F3');
    // 可添加唯一性验证等按钮
}

// 自动生成加法数独题目（生成圆圈并调用generate_puzzle）
export function generate_add_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    clear_all_inputs();
    // 清除已有圆圈
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    // 生成圆圈数量
    let min_marks = 2, max_marks = 4;
    if (size === 6) { min_marks = 10; max_marks = 12; }
    if (size === 9) { min_marks = 26; max_marks = 28; }
    const num_marks = Math.floor(Math.random() * (max_marks - min_marks + 1)) + min_marks;
    // log_process(`计划生成圆圈数量：${num_marks}`);

    // 选取对称类型
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
        // 'none'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    // 获取对称点
    function get_symmetric(row, col, size, symmetry, type) {
        // type: 'v' 竖线，'h' 横线，'x' 交点（四格）
        switch (symmetry) {
            case 'central':
                if (type === 'v') {
                    return [size - 1 - row, size - 2 - col, 'v'];
                } else if (type === 'h') {
                    return [size - 2 - row, size - 1 - col, 'h'];
                } else { // x
                    return [size - 2 - row, size - 2 - col, 'x'];
                }
            case 'diagonal':
                if (type === 'v') {
                    return [col, row, 'h'];
                } else if (type === 'h') {
                    return [col, row, 'v'];
                } else { // x
                    return [col, row, 'x'];
                }
            case 'anti-diagonal':
                if (type === 'v') {
                    return [size - 2 - col, size - 1 - row, 'h'];
                } else if (type === 'h') {
                    return [size - 1 - col, size - 2 - row, 'v'];
                } else { // x
                    return [size - 2 - col, size - 2 - row, 'x'];
                }
            case 'horizontal':
                if (type === 'v') {
                    return [size - 1 - row, col, 'v'];
                } else if (type === 'h') {
                    return [size - 2 - row, col, 'h'];
                } else { // x
                    return [size - 2 - row, col, 'x'];
                }
            case 'vertical':
                if (type === 'v') {
                    return [row, size - 2 - col, 'v'];
                } else if (type === 'h') {
                    return [row, size - 1 - col, 'h'];
                } else { // x
                    return [row, size - 2 - col, 'x'];
                }
            default:
                return [row, col, type];
        }
    }
    // log_process(`即将生成加法数独，圆圈数量：${num_marks}，对称类型：${symmetry}`);

    // 随机生成圆圈位置和数字（不贴边线，带对称）
    const positions_set = new Set();
    let marks_added = 0;
    let try_count = 0;
    const MAX_TRY = 1000;
    while (marks_added < num_marks && try_count < MAX_TRY) {
        try_count++;
        // 随机决定横线、竖线或交点
        const rand = Math.random();
        let type;
        if (rand < 0.2) type = 'v';
        else if (rand < 0.4) type = 'h';
        else type = 'x';
        
        let row, col;
        if (type === 'v') {
            row = Math.floor(Math.random() * size);
            col = Math.floor(Math.random() * (size - 1));
        } else if (type === 'h') {
            row = Math.floor(Math.random() * (size - 1));
            col = Math.floor(Math.random() * size);
        } else { // 'x' 交点，行列必须在 1..size-1
            row = Math.floor(Math.random() * (size - 1));
            col = Math.floor(Math.random() * (size - 1));
         }
        const key = `${type}-${row}-${col}`;
        if (positions_set.has(key)) continue;

        // 计算对称点
        const [sym_row, sym_col, sym_type] = get_symmetric(row, col, size, symmetry, type);
        const sym_key = `${sym_type}-${sym_row}-${sym_col}`;

        // 两个点都不能重复且都不能贴右/下边线
// -        if (
// -            sym_row >= 0 && sym_row < size && sym_col >= 0 && sym_col < size &&
// -            ((type === 'v' && col < size - 1) || (type === 'h' && row < size - 1)) &&
// -            ((sym_type === 'v' && sym_col < size - 1) || (sym_type === 'h' && sym_row < size - 1)) &&
// -            !positions_set.has(key) && !positions_set.has(sym_key)
// -        ) {
        const valid_primary = (
            type === 'v' ? (row >= 0 && row < size && col >= 0 && col < size - 1) :
            type === 'h' ? (row >= 0 && row < size - 1 && col >= 0 && col < size) :
            (row >= 0 && row < size - 1 && col >= 0 && col < size - 1)
        );
        const valid_sym = (
            sym_type === 'v' ? (sym_row >= 0 && sym_row < size && sym_col >= 0 && sym_col < size - 1) :
            sym_type === 'h' ? (sym_row >= 0 && sym_row < size - 1 && sym_col >= 0 && sym_col < size) :
            (sym_row >= 0 && sym_row < size - 1 && sym_col >= 0 && sym_col < size - 1)
        );

        if (valid_primary && valid_sym && !positions_set.has(key) && !positions_set.has(sym_key)) {
            positions_set.add(key);
            positions_set.add(sym_key);
            add_circle(row, col, size, container, type);
            add_circle(sym_row, sym_col, size, container, sym_type);
            // 检查是否有解
            // 构造当前盘面
            const grid = container.querySelector('.sudoku-grid');
            let board = [];
            for (let r = 0; r < size; r++) {
                board[r] = [];
                for (let c = 0; c < size; c++) {
                    board[r][c] = 0;
                }
            }
            // 调用solve
            backup_original_board();
            const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_add, true);
            log_process(`尝试添加圆圈位置：${type}(${row},${col}) 和 ${type}(${sym_row},${sym_col})，解的数量：${result.solution_count}`);
            if (result.solution_count === 0 || result.solution_count === -2) {
                log_process('当前圆圈位置无解，重新生成');
                restore_original_board();
                // // 无解，撤销圆圈
                // positions_set.delete(`${row},${col}`);
                // positions_set.delete(`${sym_row},${sym_col}`);
                // 无解，从positions_set中移除对应的键值
                positions_set.delete(key);
                positions_set.delete(sym_key);
                // 移除最后两个圆圈
                const marks = container.querySelectorAll('.vx-mark');
                if (marks.length >= 2) {
                    marks[marks.length - 1].remove();
                    marks[marks.length - 2].remove();
                }
                // marks_added -= 2; // 同步减少计数
                continue;
            }
            if (result.solution_count === 1) {
                marks_added += 2;
                return;
                break;
            }
            marks_added += 2;
        }
        // 如果对称点和主点重合，只添加一次
// -        else if (
// -            sym_row === row && sym_col === col &&
// -            !positions_set.has(key)
// -        ) {
        else if (valid_primary && sym_row === row && sym_col === col && !positions_set.has(key)) {
            positions_set.add(key);
            add_circle(row, col, size, container, type);
            // 检查是否有解
            // 构造当前盘面
            const grid = container.querySelector('.sudoku-grid');
            let board = [];
            for (let r = 0; r < size; r++) {
                board[r] = [];
                for (let c = 0; c < size; c++) {
                    board[r][c] = 0;
                }
            }
            // 调用solve
            backup_original_board();
            const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_add, true);
            log_process(`尝试添加圆圈 at (${row},${col})，解数：${result.solution_count}`);
            if (result.solution_count === 0 || result.solution_count === -2) {
                log_process('当前圆圈位置无解，重新生成');
                restore_original_board();
                // // 无解，撤销圆圈
                // positions_set.delete(`${row},${col}`);
                // positions_set.delete(`${sym_row},${sym_col}`);
                // 无解，从positions_set中移除对应的键值
                positions_set.delete(key);
                // positions_set.delete(sym_key);
                // 移除最后两个圆圈
                const marks = container.querySelectorAll('.vx-mark');
                if (marks.length >= 1) {
                    marks[marks.length - 1].remove();
                }
                // marks_added -= 1; // 同步减少计数
                continue;
            }
            if (result.solution_count === 1) {
                marks_added += 1;
                return;
                break;
            }
            marks_added += 1;
        }
    }
    if (try_count >= MAX_TRY) {
        log_process('自动出题失败，请重试或减少圆圈数量！');
    }

    // 生成题目
    generate_puzzle(size, score_lower_limit, holes_count);

    // 辅助函数:添加加法标记（与add_add_mark一致）
    function add_circle(row, col, size, container, type) {
        const grid = container.querySelector('.sudoku-grid');
        if (!grid) return;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        let mark_x, mark_y, key;
        if (type === 'v') {
            // 竖线：连接[row, col]和[row, col+1]
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${col + 1}`;
        } else if (type === 'h') {
            // 横线：连接[row, col]和[row+1, col]
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = `h-${row + 1}-${col}`;
        } else if (type === 'x') {
            // 交点（四格）：位于行/列交叉处 (row, col) 表示位于第 row 行与第 col 列的交点
            mark_x = (col + 1) * cell_width;
            mark_y = (row + 1) * cell_height;
            // key = null; // 交点不设置 v-/h- key，solver 会按位置解析为四格提示
            key = `x-${row + 1}-${col + 1}`;
        } else {
            return;
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        // 防止重复添加 v/h 的重复；对于交点使用位置判重
        const existingMarks = Array.from(container.querySelectorAll('.vx-mark'));
        if (key) {
            if (existingMarks.some(m => m.dataset.key === key)) return;
        } else {
            // 对于交点，避免同一位置重复（使用左右/上下偏移 2px 判断）
            if (existingMarks.some(m => {
                const l = parseInt(m.style.left || '0', 10);
                const t = parseInt(m.style.top || '0', 10);
                return Math.abs(l - (grid_offset_left + mark_x - 15)) <= 2 && Math.abs(t - (grid_offset_top + mark_y - 15)) <= 2;
            })) return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        if (key) mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 15}px`;
        mark.style.top = `${grid_offset_top + mark_y - 15}px`;
        mark.style.width = '30px';
        mark.style.height = '30px';
        // 黑色边框
        mark.style.border = '1px solid #000';
        mark.style.boxSizing = 'border-box';

        // 创建只显示数字的输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 2;
        input.style.width = '38px';
        input.style.height = '28px';
        input.style.fontSize = '22px';
        input.style.textAlign = 'center';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.outline = 'none';
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.color = '#333';

        // 根据 size 设置半排除数组
        let semi_excluded_values = [];
        if (size === 6) {
            semi_excluded_values = [3, 4, 10, 11];
        } else if (size === 9) {
            semi_excluded_values = [3, 4, 16, 17];
        }
        
        if (type === 'x') {
            // 四格提示：根据 size 在指定范围内随机取值
            let sum;
            if (size === 4) {
                // 四宫：6-14
                sum = Math.floor(Math.random() * (14 - 6 + 1)) + 6;
            } else if (size === 6) {
                // 六宫：6-22
                sum = Math.floor(Math.random() * (22 - 6 + 1)) + 6;
            } else if (size === 9) {
                // 九宫：可根据需要调整范围，这里暂定 10-30
                sum = Math.floor(Math.random() * (34 - 6 + 1)) + 6;
            } else {
                // 其他尺寸：使用 4*size 的上下浮动
                sum = Math.floor(Math.random() * (size * 2)) + size * 2;
            }
            input.value = `${sum}`;
        } else {
            // 两格提示：生成两个不同数字的和
            let left, right, add;
            do {
                left = Math.floor(Math.random() * size) + 1;
                right = Math.floor(Math.random() * size) + 1;
                if (left === right) continue;
                add = left + right;
                // 半排除
                if (semi_excluded_values.includes(add) && Math.random() < 0.5) continue;
                break;
            } while (true);
            input.value = `${add}`;
        }

        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        input.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };

        mark.appendChild(input);
        container.appendChild(mark);
        input.focus();
    }

}

function add_add_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._add_mark_mode) return;
    grid._add_mark_mode = true;

    const container = grid.parentElement;
    container.style.position = 'relative';

    grid.addEventListener('click', function handler(e) {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col = Math.floor(x / cell_width);
        const row = Math.floor(y / cell_height);

        // 到最近垂直线、水平线、交点的距离
        const v_line_x = (col + 1) * cell_width;
        const h_line_y = (row + 1) * cell_height;
        const dist_to_v_line = Math.abs(x - v_line_x);
        const dist_to_h_line = Math.abs(y - h_line_y);

        // 最近交点（四格中心）索引及距离
        const v_idx = Math.round(x / cell_width);
        const h_idx = Math.round(y / cell_height);
        const corner_x = v_idx * cell_width;
        const corner_y = h_idx * cell_height;
        const dist_corner = Math.hypot(x - corner_x, y - corner_y);

        // 阈值（可调整）：线段检测阈值小一些，交点阈值稍大一些
        const LINE_THRESHOLD = 4;
        const CORNER_THRESHOLD = 10;

        // 计算权重（距离越近权重越大），并对交点做归一化以与线段权重可比
        let weight_v = Math.max(0, LINE_THRESHOLD - dist_to_v_line);
        let weight_h = Math.max(0, LINE_THRESHOLD - dist_to_h_line);
        let weight_x = Math.max(0, CORNER_THRESHOLD - dist_corner) * (LINE_THRESHOLD / CORNER_THRESHOLD);

        // 如果当前点不在有效范围，则对应权重置0
        if (!(col >= 0 && col < size - 1)) weight_v = 0;
        if (!(row >= 0 && row < size - 1)) weight_h = 0;
        if (!(v_idx >= 1 && v_idx <= size - 1 && h_idx >= 1 && h_idx <= size - 1)) weight_x = 0;

        const total = weight_v + weight_h + weight_x;
        if (total <= 0) return; // 三者都不在可点击范围

        // 按权重随机选择类型（v/h/x），这样在等距离时线与交点被触发概率接近统一
        const r = Math.random() * total;
        let cumulative = 0;
        let chosenType = null;
        if (weight_v > 0) {
            cumulative += weight_v;
            if (r < cumulative) chosenType = 'v';
        }
        if (chosenType === null && weight_h > 0) {
            cumulative += weight_h;
            if (r < cumulative) chosenType = 'h';
        }
        if (chosenType === null && weight_x > 0) {
            chosenType = 'x';
        }
        if (!chosenType) return;

        // 根据选择计算位置与 key
        let mark_x, mark_y, key, type = chosenType;
        if (type === 'v') {
            // 使用最近的垂直线对应的格（col 可能需要修正）
            const target_col = Math.min(Math.max(col, 0), size - 2);
            mark_x = (target_col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${target_col + 1}`;
        } else if (type === 'h') {
            const target_row = Math.min(Math.max(row, 0), size - 2);
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (target_row + 1) * cell_height;
            key = `h-${target_row + 1}-${col}`;
        } else { // x
            mark_x = corner_x;
            mark_y = corner_y;
            // key = null; // 交点不设置 key
            key = `x-${row + 1}-${col + 1}`;
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        if (key) {
            if (marks.some(m => m.dataset.key === key)) {
                return;
            }
        } else {
            if (marks.some(m => {
                const l = parseInt(m.style.left || '0', 10);
                const t = parseInt(m.style.top || '0', 10);
                return Math.abs(l - (grid_offset_left + mark_x - 15)) <= 2 && Math.abs(t - (grid_offset_top + mark_y - 10)) <= 2;
            })) return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        if (key) mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 15}px`;
        mark.style.top = `${grid_offset_top + mark_y - 15}px`;
        mark.style.width = '30px';
        mark.style.height = '30px';
        // 黑色边框
        mark.style.border = '1px solid #000';
        mark.style.boxSizing = 'border-box';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 3;
        input.style.width = '38px';
        input.style.height = '28px';
        input.style.fontSize = '22px';
        input.style.textAlign = 'center';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.outline = 'none';
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.color = '#333';

        mark.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };
        input.ondblclick = function(e) {
            e.stopPropagation();
            mark.remove();
        };

        mark.appendChild(input);
        container.appendChild(mark);
        input.focus();
    });
}

// 加法数独有效性检测函数
export function is_valid_add(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'add';
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

    // 2. 加法标记判断
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        const add = parseInt(value, 10);
        if (isNaN(add)) continue;

        // 解析标记的唯一key
        const key = mark.dataset.key;

        if (key) {
            let cell_a, cell_b;
            if (key.startsWith('v-')) {
                const [_, row_str, col_str] = key.split('-');
                const r = parseInt(row_str, 10);
                const c = parseInt(col_str, 10);
                cell_a = [r, c - 1];
                cell_b = [r, c];
            } else if (key.startsWith('h-')) {
                const [_, row_str, col_str] = key.split('-');
                const r = parseInt(row_str, 10);
                const c = parseInt(col_str, 10);
                cell_a = [r - 1, c];
                cell_b = [r, c];
            } else if (key.startsWith('x-')) {
                const [_, row_str, col_str] = key.split('-');
                const row_mark = parseInt(row_str, 10);
                const col_mark = parseInt(col_str, 10);
                if (!Number.isInteger(row_mark) || !Number.isInteger(col_mark)) continue;

                const cells = [
                    [row_mark - 1, col_mark - 1],
                    [row_mark - 1, col_mark],
                    [row_mark, col_mark - 1],
                    [row_mark, col_mark]
                ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
                if (cells.length !== 4) continue;

                const values = [];
                let allNumbers = true;
                for (const [r, c] of cells) {
                    const v = (r === row && c === col) ? num : board[r][c];
                    if (typeof v !== 'number' || v <= 0 || Array.isArray(v)) {
                        allNumbers = false;
                        break;
                    }
                    values.push(v);
                }
                if (!allNumbers) continue;

                const sumVal = values.reduce((s, x) => s + x, 0);
                if (sumVal !== add) return false;
                continue;
            } else {
                continue;
            }

            // 判断当前格是否在标记两格之一
            let other_cell;
            if (row === cell_a[0] && col === cell_a[1]) {
                other_cell = cell_b;
            } else if (row === cell_b[0] && col === cell_b[1]) {
                other_cell = cell_a;
            } else {
                continue; // 当前格与此标记无关
            }

            // 获取当前格和另一格的值
            const this_value = num;
            const other_value = board[other_cell[0]] && board[other_cell[0]][other_cell[1]];

            // 只有两个格子都填了确定数字才检查合法性，否则跳过
            if (typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)) continue;

            // 判断加法关系
            if (this_value + other_value !== add) {
                return false;
            }

            continue;
        }

        // ----- 四格交点提示（新增逻辑：mark 无 key 时） -----
        // mark.style.left/top 是基于 container 的绝对像素位置（add_add_mark 中设置）
        const grid = container ? container.querySelector('.sudoku-grid') : null;
        if (!grid) continue;

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;
        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const left = parseInt(mark.style.left, 10);
        const top = parseInt(mark.style.top, 10);
        if (isNaN(left) || isNaN(top)) continue;

        // 还原 add_add_mark 中设置时使用的偏移 (+15, +10 或 +15)
        // 这里采用与 add_add_mark/ add_circle 中相同的逆向计算方式
        const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
        const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

        const cells = [
            [row_mark - 1, col_mark - 1],
            [row_mark - 1, col_mark],
            [row_mark, col_mark - 1],
            [row_mark, col_mark]
        ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);

        // 只有完整四格才作为四格提示处理
        if (cells.length !== 4) continue;

        // 收集四格的值（将当前正在尝试放入的 num 视为该格的值）
        const values = [];
        let allNumbers = true;
        for (const [r, c] of cells) {
            const v = (r === row && c === col) ? num : board[r][c];
            if (typeof v !== 'number' || v <= 0 || Array.isArray(v)) {
                allNumbers = false;
                break;
            }
            values.push(v);
        }

        // 只有在四格都为确定数字时才进行和校验；部分填入时跳过
        if (!allNumbers) continue;

        const sum = values.reduce((s, x) => s + x, 0);
        if (sum !== add) {
            return false;
        }
    }

    return true;
}