import { state, set_current_mode } from './state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button } from './core.js';
import { create_technique_panel } from './classic.js';
import { get_all_regions, solve } from '../solver/solver_tool.js';
import { generate_puzzle } from '../solver/generate.js';

// 新数独主入口
export function create_ratio_sudoku(size) {
    set_current_mode('ratio');
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
        Special_Combination_Region_Block: true,
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
    add_ratio_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('自动出题', () => generate_ratio_puzzle(size), '#2196F3');
    // 可添加唯一性验证等按钮
}

// 自动生成比例数独题目（生成圆圈并调用generate_puzzle）
export function generate_ratio_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    // 清除已有圆圈
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    // 生成圆圈数量
    let min_marks = 2, max_marks = 4;
    if (size === 6) { min_marks = 6; max_marks = 12; }
    if (size === 9) { min_marks = 10; max_marks = 28; }
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
    function get_symmetric(row, col, size, symmetry, type) {
        // type: 'v' 竖线，'h' 横线
        switch (symmetry) {
            case 'central':
                if (type === 'v') {
                    return [size - 1 - row, size - 2 - col, 'v'];
                } else {
                    return [size - 2 - row, size - 1 - col, 'h'];
                }
            case 'diagonal':
                if (type === 'v') {
                    return [col, row, 'h'];
                } else {
                    return [col, row, 'v'];
                }
            case 'anti-diagonal':
                if (type === 'v') {
                    return [size - 2 - col, size - 1 - row, 'h'];
                } else {
                    return [size - 1 - col, size - 2 - row, 'v'];
                }
            case 'horizontal':
                if (type === 'v') {
                    return [size - 1 - row, col, 'v'];
                } else {
                    return [size - row - 2, col, 'h'];
                }
            case 'vertical':
                if (type === 'v') {
                    return [row, size - col - 2, 'v'];
                } else {
                    return [row, size - 1 - col, 'h'];
                }
            default:
                return [row, col, type];
        }
    }
    // log_process(`即将生成比例数独，圆圈数量：${num_marks}，对称类型：${symmetry}`);

    // 随机生成圆圈位置和数字（不贴边线，带对称）
    const positions_set = new Set();
    let marks_added = 0;
    let try_count = 0;
    const MAX_TRY = 1000;
    while (marks_added < num_marks && try_count < MAX_TRY) {
        try_count++;
        // 随机决定横线还是竖线
        let type = Math.random() < 0.5 ? 'v' : 'h';
        let row, col;
        if (type === 'v') {
            row = Math.floor(Math.random() * size);
            col = Math.floor(Math.random() * (size - 1));
        } else {
            row = Math.floor(Math.random() * (size - 1));
            col = Math.floor(Math.random() * size);
        }
        const key = `${type}-${row}-${col}`;
        if (positions_set.has(key)) continue;

        // 计算对称点
        const [sym_row, sym_col, sym_type] = get_symmetric(row, col, size, symmetry, type);
        const sym_key = `${sym_type}-${sym_row}-${sym_col}`;

        // 两个点都不能重复且都不能贴右/下边线
        if (
            sym_row >= 0 && sym_row < size && sym_col >= 0 && sym_col < size &&
            ((type === 'v' && col < size - 1) || (type === 'h' && row < size - 1)) &&
            ((sym_type === 'v' && sym_col < size - 1) || (sym_type === 'h' && sym_row < size - 1)) &&
            !positions_set.has(key) && !positions_set.has(sym_key)
        ) {
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
            const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_ratio, true);
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
                continue;
            }
            if (result.solution_count === 1) {
                marks_added += 2;
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
            const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_ratio, true);
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
                continue;
            }
            if (result.solution_count === 1) {
                marks_added += 1;
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

// ...existing code...

// 辅助函数：添加比例标记（与add_ratio_mark一致）
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
    } else {
        return;
    }

    const grid_offset_left = grid.offsetLeft;
    const grid_offset_top = grid.offsetTop;

    // 防止重复添加
    const marks = Array.from(container.querySelectorAll('.vx-mark'));
    if (marks.some(m => m.dataset.key === key)) {
        return;
    }

    const mark = document.createElement('div');
    mark.className = 'vx-mark';
    mark.dataset.key = key;
    mark.style.position = 'absolute';
    mark.style.left = `${grid_offset_left + mark_x - 18}px`;
    mark.style.top = `${grid_offset_top + mark_y - 10}px`;
    mark.style.width = '36px';
    mark.style.height = '20px';

    // 创建只显示斜杠的输入框
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

    // 随机生成比例
    let left, right;
    do {
        left = Math.floor(Math.random() * size) + 1;
        right = Math.floor(Math.random() * size) + 1;
    } while (left === right);
    if (left > right) {
        [left, right] = [right, left];
    }
    // 求最大公约数
    function gcd(a, b) {
        while (b !== 0) {
            [a, b] = [b, a % b];
        }
        return a;
    }
    const divisor = gcd(left, right);
    left = left / divisor;
    right = right / divisor;
    input.value = `${left}/${right}`;

    // 输入时自动格式化为 左/右
    input.addEventListener('input', function() {
        const max_value = size;
        const regex = new RegExp(`[^1-${max_value}]`, 'g');
        const digits = this.value.replace(regex, '');
        let l = '', r = '';
        if (digits.length === 1) {
            l = '';
            r = digits[0];
        } else if (digits.length >= 2) {
            l = digits[0];
            r = digits[1];
        }
        this.value = l + '/' + r;
    });

    // 保证光标不能移到/前面
    input.addEventListener('keydown', function(e) {
        if ((e.key === 'Backspace' && this.selectionStart === 1) ||
            (e.key === 'Delete' && this.selectionStart === 0)) {
            e.preventDefault();
        }
        if (e.key.length === 1 && /[0-9]/.test(e.key)) {
            if (this.selectionStart === 1) {
                this.setSelectionRange(2, 2);
            }
        }
    });

    input.addEventListener('focus', function() {
        if (this.value.length <= 1) {
            this.setSelectionRange(2, 2);
        } else {
            this.setSelectionRange(this.value.length, this.value.length);
        }
    });

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

// ...existing code...
}

function add_ratio_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._ratio_mark_mode) return;
    grid._ratio_mark_mode = true;

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

        const dist_to_v_line = Math.abs(x - (col + 1) * cell_width);
        const dist_to_h_line = Math.abs(y - (row + 1) * cell_height);

        const threshold = 12;

        let mark_x, mark_y, key;
        if (dist_to_v_line < dist_to_h_line && dist_to_v_line < threshold && col < size - 1) {
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${col + 1}`;
        } else if (dist_to_h_line <= dist_to_v_line && dist_to_h_line < threshold && row < size - 1) {
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = `h-${row + 1}-${col}`;
        } else {
            return;
        }

        const grid_offset_left = grid.offsetLeft;
        const grid_offset_top = grid.offsetTop;

        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        if (marks.some(m => m.dataset.key === key)) {
            return;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 18}px`;
        mark.style.top = `${grid_offset_top + mark_y - 10}px`;
        mark.style.width = '36px';
        mark.style.height = '20px';

        // 创建只显示斜杠的输入框
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

        // 初始内容为'/'
        input.value = '/';

        // 输入时自动格式化为 左/右
        input.addEventListener('input', function() {
            // 只保留数字
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            const digits = this.value.replace(regex, '');
            let left = '', right = '';
            if (digits.length === 1) {
                left = '';
                right = digits[0];
            } else if (digits.length >= 2) {
                left = digits[0];
                right = digits[1];
            }
            this.value = left + '/' + right;
        });

        // 保证光标不能移到/前面
        input.addEventListener('keydown', function(e) {
            // 禁止删除斜杠
            if ((e.key === 'Backspace' && this.selectionStart === 1) ||
                (e.key === 'Delete' && this.selectionStart === 0)) {
                e.preventDefault();
            }
            // 输入时自动跳过斜杠
            if (e.key.length === 1 && /[0-9]/.test(e.key)) {
                if (this.selectionStart === 1) {
                    this.setSelectionRange(2, 2);
                }
            }
        });

        // 点击时自动跳到斜杠后
        input.addEventListener('focus', function() {
            // 如果左侧有数字，光标放在右侧，否则放在右侧
            if (this.value.length <= 1) {
                this.setSelectionRange(2, 2);
            } else {
                this.setSelectionRange(this.value.length, this.value.length);
            }
        });

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

// 比例数独有效性检测函数
export function is_valid_ratio(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'ratio';
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

    // 2. 比例标记判断
    const container = document.querySelector('.sudoku-container');
    const marks = container ? container.querySelectorAll('.vx-mark') : [];
    for (const mark of marks) {
        const input = mark.querySelector('input');
        const value = input && input.value.trim();
        // 只处理形如 "a/b" 的比例
        if (!value || !/^(\d*)\/(\d*)$/.test(value)) continue;
        const match = value.match(/^(\d*)\/(\d*)$/);
        const left_num = match[1] ? parseInt(match[1]) : null;
        const right_num = match[2] ? parseInt(match[2]) : null;
        if (!left_num && !right_num) continue;

        // 解析标记的唯一key
        const key = mark.dataset.key;
        if (!key) continue;

        // 解析标记对应的两格
        // 竖线：v-row-col，横线：h-row-col
        let cell_a, cell_b;
        if (key.startsWith('v-')) {
            // 竖线，row、col
            const [_, row_str, col_str] = key.split('-');
            const r = parseInt(row_str);
            const c = parseInt(col_str);
            cell_a = [r, c - 1];
            cell_b = [r, c];
        } else if (key.startsWith('h-')) {
            // 横线，row、col
            const [_, row_str, col_str] = key.split('-');
            const r = parseInt(row_str);
            const c = parseInt(col_str);
            cell_a = [r - 1, c];
            cell_b = [r, c];
        } else {
            continue;
        }

        // 判断当前格是否在标记两格之一
        let other_cell, this_cell_pos;
        if (row === cell_a[0] && col === cell_a[1]) {
            this_cell_pos = 'A';
            other_cell = cell_b;
        } else if (row === cell_b[0] && col === cell_b[1]) {
            this_cell_pos = 'B';
            other_cell = cell_a;
        } else {
            continue; // 当前格与此标记无关
        }

        // 获取当前格和另一格的值
        const this_value = num;
        const other_value = board[other_cell[0]] && board[other_cell[0]][other_cell[1]];

        // 只有两个格子都填了确定数字才检查合法性，否则跳过
        // 判断：必须是数字且大于0，且不是数组（即不是候选数模式）
        if (
            // typeof this_value !== 'number' || this_value <= 0 || Array.isArray(this_value) ||
            typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)
        ) continue;

        // 判断比例关系
        if (left_num && right_num) {
            // 例如 1/2，A格:1，B格:2 或 A格:2，B格:1
            if (
                !(
                    (this_value * right_num === other_value * left_num) ||
                    (other_value * right_num === this_value * left_num)
                )
            ) {
                return false;
            }
        }
    }

    return true;
}