// quadruple.js
import { state, set_current_mode } from './state.js';
import { create_base_grid, create_base_cell, add_Extra_Button, log_process, backup_original_board, restore_original_board, handle_key_navigation, clear_all_inputs } from './core.js';
import { generate_puzzle } from '../solver/generate.js';
import { get_all_regions, solve } from '../solver/solver_tool.js';
import { create_technique_panel } from './classic.js';

// 四数独主入口
export function create_quadruple_sudoku(size) {
    set_current_mode('quadruple');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

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
            Special_Combination_Region_Elimination: true, // 新增特定组合区域排除
            Variant_Elimination: true,
            Variant_Block: true,
            Variant_Pair_Block: true,
            Special_Combination_Region_Block: true, // 新增特定组合区块
            Variant_Hidden_Pair: true,
            Variant_Hidden_Triple: true
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

    // 添加四数独圆圈功能
    add_quadruple_mark(size);

    // 四数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('自动出题', () => generate_quadruple_puzzle(size), '#2196F3');
}

// 自动生成四数独题目
export function generate_quadruple_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
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
    function get_symmetric(row, col, size, symmetry) {
        switch (symmetry) {
            case 'central':
                return [size - 2 - row, size - 2 - col];
            case 'diagonal':
                return [col, row];
            case 'anti-diagonal':
                return [size - 2 - col, size - 2 - row];
            case 'horizontal':
                return [size - 2 - row, col];
            case 'vertical':
                return [row, size - 2 - col];
            default:
                return null;
        }
    }
    log_process(`即将生成排除数独，圆圈数量：${num_marks}，对称类型：${symmetry}`);

    // 随机生成圆圈位置和数字（不贴边线，带对称）
    const positions_set = new Set();
    let marks_added = 0;
    let try_count = 0;
    const MAX_TRY = 1000;
    while (marks_added < num_marks && try_count < MAX_TRY) {
        try_count++;
        let row, col;
        // 保证不重复且不贴边线
        do {
            row = Math.floor(Math.random() * (size - 1)); // 1 ~ size-2
            col = Math.floor(Math.random() * (size - 1)); // 1 ~ size-2
        } while (positions_set.has(`${row},${col}`));

        // 计算对称点
        const [sym_row, sym_col] = get_symmetric(row, col, size, symmetry);

        // 两个点都不能重复且都不能贴右/下边线
        if (
            sym_row >= 0 && sym_row < size - 1 &&
            sym_col >= 0 && sym_col < size - 1 &&
            !positions_set.has(`${row},${col}`) &&
            !positions_set.has(`${sym_row},${sym_col}`) &&
            !(sym_row === row && sym_col === col)
        ) {
            positions_set.add(`${row},${col}`);
            positions_set.add(`${sym_row},${sym_col}`);
            add_circle(row, col, size, container);
            add_circle(sym_row, sym_col, size, container);
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
            const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_quadruple, true);
            log_process(`尝试添加圆圈位置：(${row},${col}) 和 (${sym_row},${sym_col})，解的数量：${result.solution_count}`);
            if (result.solution_count === 0 || result.solution_count === -2) {
                log_process('当前圆圈位置无解，重新生成');
                restore_original_board();
                // 无解，撤销圆圈
                positions_set.delete(`${row},${col}`);
                positions_set.delete(`${sym_row},${sym_col}`);
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
        else if (
            sym_row === row && sym_col === col &&
            !positions_set.has(`${row},${col}`)
        ) {
            positions_set.add(`${row},${col}`);
            add_circle(row, col, size, container);
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
            const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_quadruple, true);
            log_process(`尝试添加圆圈 at (${row},${col})，解数：${result.solution_count}`);
            if (result.solution_count === 0 || result.solution_count === -2) {
                log_process('当前圆圈位置无解，重新生成');
                restore_original_board();
                // 无解，撤销圆圈
                positions_set.delete(`${row},${col}`);
                positions_set.delete(`${sym_row},${sym_col}`);
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

    // 生成题目
    generate_puzzle(size, score_lower_limit, holes_count);

    // 辅助函数：添加圆圈
    function add_circle(row, col, size, container) {
        const grid = container.querySelector('.sudoku-grid');
        if (!grid) return;
        const cellWidth = grid.offsetWidth / size;
        const cellHeight = grid.offsetHeight / size;
        const gridOffsetLeft = grid.offsetLeft;
        const gridOffsetTop = grid.offsetTop;
        const crossX = (col + 1) * cellWidth;
        const crossY = (row + 1) * cellHeight;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 30}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;
        mark.style.width = '60px';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.value = Math.floor(Math.random() * size) + 1;
        input.style.width = '60px';
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

        // 随机生成4个数字，可以重复，但每个数字最多出现两次
        let nums = [];
        let count_map = {};
        for (let i = 0; i < 4; i++) {
            let pool = [];
            for (let n = 1; n <= size; n++) {
                if (!count_map[n] || count_map[n] < 2) {
                    pool.push(n);
                }
            }
            let idx = Math.floor(Math.random() * pool.length);
            let chosen = pool[idx];
            nums.push(chosen);
            count_map[chosen] = (count_map[chosen] || 0) + 1;
        }
        // 新增：排序
        nums.sort((a, b) => a - b);
        input.value = nums.join('');

        mark.appendChild(input);
        container.appendChild(mark);
    }
}

// 添加四数独圆圈标记
function add_quadruple_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    // 防止重复添加监听
    if (grid._exclusionMarkMode) return;
    grid._exclusionMarkMode = true;

    // 获取父容器用于定位
    const container = grid.parentElement;
    container.style.position = 'relative';

    grid.addEventListener('click', function handler(e) {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellWidth = grid.offsetWidth / size;
        const cellHeight = grid.offsetHeight / size;

        const col = Math.round(x / cellWidth);
        const row = Math.round(y / cellHeight);

        if (col === 0 || row === 0 || col === size || row === size) return;

        const crossX = col * cellWidth;
        const crossY = row * cellHeight;
        const dist = Math.sqrt((x - crossX) ** 2 + (y - crossY) ** 2);
        if (dist > 12) return;

        const gridOffsetLeft = grid.offsetLeft;
        const gridOffsetTop = grid.offsetTop;

        // 防止重复添加同一交点标记
        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        if (marks.some(m => Math.abs(parseInt(m.style.left) - (gridOffsetLeft + crossX - 15)) < 2 &&
                            Math.abs(parseInt(m.style.top) - (gridOffsetTop + crossY - 15)) < 2)) {
            return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 30}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;
        mark.style.width = '60px';

        // 创建数字输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.style.width = '60px';
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

        input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
        });

        // 双击圆圈或输入框删除标记
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
        // 新增：自动聚焦输入框
        input.focus();
    });

}

// 应用所有四数独圆圈约束
export function apply_quadruple_marks(board, size) {
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        if (!value || !/^\d+$/.test(value)) continue;
        // 支持多个数字
        const included_nums = value.split('').map(Number);

        const left = parseInt(mark.style.left);
        const top = parseInt(mark.style.top);

        const grid = container.querySelector('.sudoku-grid');
        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;
        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
        const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

        // 四个相邻格子的坐标
        const positions = [
            [row_mark - 1, col_mark - 1],
            [row_mark - 1, col_mark],
            [row_mark, col_mark - 1],
            [row_mark, col_mark]
        ];

        for (const [r, c] of positions) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                // 只处理候选数数组
                if (Array.isArray(board[r][c])) {
                    board[r][c] = board[r][c].filter(n => included_nums.includes(n));
                }
            }
        }
    }
}

// 排除数独有效性检测函数
export function is_valid_quadruple(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'quadruple';
    const regions = get_all_regions(size, mode);
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col) && region.type !== '有重复四格提示') {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 排除标记判断
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        if (!value || !/^\d+$/.test(value)) continue;
        // 支持多个数字
        const included_nums = value.split('').map(Number);

        // 计算交点对应的行列
        const left = parseInt(mark.style.left);
        const top = parseInt(mark.style.top);

        const grid = container.querySelector('.sudoku-grid');
        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;
        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
        const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

        // 四个相邻格子的坐标
        const positions = [
            [row_mark - 1, col_mark - 1],
            [row_mark - 1, col_mark],
            [row_mark, col_mark - 1],
            [row_mark, col_mark]
        ];

        // 判断当前格子是否在交点四格内
        let in_quad = false;
        for (const [r, c] of positions) {
            if (r === row && c === col) {
                in_quad = true;
                break;
            }
        }
        if (!in_quad) continue;

        // 统计交点四格已填入的数字
        let filled_nums = [];
        for (const [r, c] of positions) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                let cell_value = (r === row && c === col) ? num : board[r][c];
                if (typeof cell_value === 'number' && cell_value !== 0) {
                    filled_nums.push(cell_value);
                }
            }
        }

        // 检查所有已填数字都在提示数中
        if (filled_nums.some(n => !included_nums.includes(n))) {
            return false;
        }

        // 检查每个数字填入的数量不能超过提示数中该数字的数量
        for (let n of included_nums) {
            const count_in_hint = included_nums.filter(x => x === n).length;
            const count_in_filled = filled_nums.filter(x => x === n).length;
            if (count_in_filled > count_in_hint) {
                return false;
            }
        }
    }

    return true;
}