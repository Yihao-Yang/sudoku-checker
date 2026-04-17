import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, solve, invalidate_regions_cache, sync_marks_board_from_dom } from '../solver/solver_tool.js';
import { generate_puzzle, generate_solution, generate_solution_old, generate_solved_board_brute_force } from '../solver/generate.js';


// 新数独主入口
export function create_five_six_sudoku(size) {
    set_current_mode('five_six');
    show_result(`当前模式为五六数独`);
    log_process('', true);
    log_process('规则：');
    log_process('标记：覆盖格内数字之和');
    log_process('');
    log_process('技巧：');
    // log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    // log_process('"额外区域"：附加的不可重复区域');
    log_process('"特定组合"：受附加条件影响的区域');
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
    // 清空 marks_board
    state.marks_board = [];

    // 技巧设置（可根据需要调整）
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Variant_Box_Block: true,
        Box_Pair_Block: true,
        Row_Col_Block: true,
        Variant_Row_Col_Block: true,
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
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        Special_Combination_Region_Most_Not_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        // Multi_Special_Combination_Region_Cell_Elimination_1: true,
        // Multi_Special_Combination_Region_Cell_Elimination_2: true,
        // Multi_Special_Combination_Region_Cell_Elimination_3: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        // Multi_Special_Combination_Region_Elimination_1: true,
        // Multi_Special_Combination_Region_Elimination_2: true,
        // Multi_Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
        // Special_Combination_Region_Block_2: true,
        // Special_Combination_Region_Block_3: true,
        // Multi_Special_Combination_Region_Block_1: true,
        // Multi_Special_Combination_Region_Block_2: true,
        // Multi_Special_Combination_Region_Block_3: true,
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
    add_five_six_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('五六', () => {create_five_six_sudoku(size)}, '#2196F3');
    // add_Extra_Button('清除标记', clear_five_six_marks, '#FF5722');
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('标记全部', () => {
        const count = mark_all_five_six_marks(size);
        show_result(count > 0 ? `已添加 ${count} 个数字为5/6的五六标记` : '未找到数字为5或6的五六标记');
    }, '#4CAF50');
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_five_six_puzzle(size, score_lower_limit, holes_count)) || (() => generate_five_six_puzzle(size)), '#2196F3');
    // 可添加唯一性验证等按钮
}

// 自动生成加法数独题目（生成圆圈并调用generate_puzzle）
export function generate_five_six_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    // 记录开始时间
    const start_time = performance.now();
    clear_all_inputs();
    clear_marks();
    invalidate_regions_cache();
    log_process('', true);
    // 清空 marks_board
    state.marks_board = [];
    // 清除已有圆圈
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    // 第一步：生成终盘
    log_process("第一步：生成五六数独终盘...");
    const solvedBoard = generate_solution_old(size);
    // const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process("生成终盘失败！");
        return;
    }

    // 在界面上显示终盘（用于验证）
    const inputs = document.querySelectorAll('.sudoku-grid input[type="text"]');
    for (let i = 0; i < size * size; i++) {
        inputs[i].value = '';
    }

    // 第二步：直接标记全部和为5或6的五六标记
    log_process("第二步：标记全部和为5或6的五六标记...");

    let marks_added = 0;

    log_process(`正在生成题目，请稍候...`);
    log_process('九宫：1分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
    show_generating_timer();


    setTimeout(() => {
        marks_added = mark_all_five_six_marks(size, solvedBoard);
        log_process(`已添加 ${marks_added} 个数字为5/6的五六标记`);

        render_five_six_marks_from_state(size, container);
        generate_puzzle(size, score_lower_limit, holes_count, solvedBoard);

        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`五六数独生成成功，耗时${elapsed}秒`);
    }, 0);

    // 辅助函数
    function get_symmetric(row, col, size, symmetry, type) {
        // [保持你原有的对称计算逻辑]
        switch (symmetry) {
            case 'central':
                if (type === 'v') return [size - 1 - row, size - 2 - col, 'v'];
                else if (type === 'h') return [size - 2 - row, size - 1 - col, 'h'];
                else return [size - 2 - row, size - 2 - col, 'x'];
            case 'diagonal':
                if (type === 'v') return [col, row, 'h'];
                else if (type === 'h') return [col, row, 'v'];
                else return [col, row, 'x'];
            case 'anti-diagonal':
                if (type === 'v') return [size - 2 - col, size - 1 - row, 'h'];
                else if (type === 'h') return [size - 1 - col, size - 2 - row, 'v'];
                else return [size - 2 - col, size - 2 - row, 'x'];
            case 'horizontal':
                if (type === 'v') return [size - 1 - row, col, 'v'];
                else if (type === 'h') return [size - 2 - row, col, 'h'];
                else return [size - 2 - row, col, 'x'];
            case 'vertical':
                if (type === 'v') return [row, size - 2 - col, 'v'];
                else if (type === 'h') return [row, size - 1 - col, 'h'];
                else return [row, size - 2 - col, 'x'];
            default:
                return [row, col, type];
        }
    }


}

function get_five_six_mark_key(row, col, type) {
    if (type === 'v') return `v-${row}-${col + 1}`;
    if (type === 'h') return `h-${row + 1}-${col}`;
    if (type === 'x') return `x-${row + 1}-${col + 1}`;
    return null;
}

function add_five_six_circle_with_sum(row, col, size, container, type, sum) {
    const grid = container?.querySelector('.sudoku-grid');
    if (!grid) return;

    const cell_width = grid.offsetWidth / size;
    const cell_height = grid.offsetHeight / size;

    let mark_x, mark_y, key;
    if (type === 'v') {
        mark_x = (col + 1) * cell_width;
        mark_y = row * cell_height + cell_height / 2;
        key = get_five_six_mark_key(row, col, type);
    } else if (type === 'h') {
        mark_x = col * cell_width + cell_width / 2;
        mark_y = (row + 1) * cell_height;
        key = get_five_six_mark_key(row, col, type);
    } else {
        mark_x = (col + 1) * cell_width;
        mark_y = (row + 1) * cell_height;
        key = get_five_six_mark_key(row, col, type);
    }

    const grid_offset_left = grid.offsetLeft;
    const grid_offset_top = grid.offsetTop;

    const mark = document.createElement('div');
    mark.className = 'vx-mark';
    if (key) mark.dataset.key = key;
    mark.style.position = 'absolute';
    mark.style.left = `${grid_offset_left + mark_x - 15}px`;
    mark.style.top = `${grid_offset_top + mark_y - 15}px`;
    mark.style.width = '30px';
    mark.style.height = '30px';
    mark.style.border = '1px solid #000';
    mark.style.boxSizing = 'border-box';

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 3;
    input.value = `${sum}`;
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
}

export function render_five_six_marks_from_state(size, container = document.querySelector('.sudoku-container')) {
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());
    for (const mark of state.marks_board || []) {
        add_five_six_circle_with_sum(mark.r, mark.c, size, container, mark.kind, mark.sum);
    }
}

export function mark_all_five_six_marks(size, board = null) {
    const container = document.querySelector('.sudoku-container');
    if (!container) return 0;

    const read_board_from_dom = () => {
        const current_board = Array.from({ length: size }, () => Array(size).fill(0));
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const input = container.querySelector(`.sudoku-grid input[data-row="${row}"][data-col="${col}"]`);
                const value = parseInt(input?.value ?? '', 10);
                current_board[row][col] = Number.isFinite(value) ? value : 0;
            }
        }
        return current_board;
    };

    const is_target_five_six_sum = (sum) => sum === 5 || sum === 6;

    const is_valid_mark_position = (row, col, type) => {
        if (type === 'v') return row >= 0 && row < size && col >= 0 && col < size - 1;
        if (type === 'h') return row >= 0 && row < size - 1 && col >= 0 && col < size;
        return false;
    };

    const calculate_sum_from_board = (row, col, type, source_board) => {
        if (type === 'v') {
            const val_1 = source_board[row]?.[col];
            const val_2 = source_board[row]?.[col + 1];
            return Number.isFinite(val_1) && Number.isFinite(val_2) && val_1 > 0 && val_2 > 0 ? val_1 + val_2 : null;
        }
        if (type === 'h') {
            const val_1 = source_board[row]?.[col];
            const val_2 = source_board[row + 1]?.[col];
            return Number.isFinite(val_1) && Number.isFinite(val_2) && val_1 > 0 && val_2 > 0 ? val_1 + val_2 : null;
        }
        return null;
    };

    const is_mark_exists_in_state = (row, col, type) => {
        return Array.isArray(state.marks_board) && state.marks_board.some(mark => mark.kind === type && mark.r === row && mark.c === col);
    };

    const try_add_mark = (row, col, type, sum) => {
        if (!is_valid_mark_position(row, col, type)) return false;
        if (!is_target_five_six_sum(sum)) return false;
        if (!Number.isFinite(sum)) return false;
        if (is_mark_exists_in_state(row, col, type)) return false;

        state.marks_board.push({ kind: type, r: row, c: col, sum });
        return true;
    };

    const source_board = Array.isArray(board) ? board : read_board_from_dom();
    state.marks_board = [];

    let marks_added = 0;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size - 1; col++) {
            const sum = calculate_sum_from_board(row, col, 'v', source_board);
            if (try_add_mark(row, col, 'v', sum)) marks_added++;
        }
    }

    for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size; col++) {
            const sum = calculate_sum_from_board(row, col, 'h', source_board);
            if (try_add_mark(row, col, 'h', sum)) marks_added++;
        }
    }

    render_five_six_marks_from_state(size, container);
    invalidate_regions_cache();
    return marks_added;
}

function add_five_six_mark(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    if (grid._five_six_mark_mode) return;
    grid._five_six_mark_mode = true;

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
export function is_valid_five_six(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'five_six';
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
    let marks;
    if (Array.isArray(state.marks_board) && state.marks_board.length > 0) {
        marks = state.marks_board;
    } else {
        const container = document.querySelector('.sudoku-container');
        marks = sync_marks_board_from_dom(size, container);
    }
    // 2. 加法标记判断
    // const marks = state.marks_board;
    if (Array.isArray(marks)) {
        for (const m of marks) {
            const add = m.sum;

            if (m.kind === 'v') {
                const r = m.r, c = m.c;
                if (!((row === r && col === c) || (row === r && col === c + 1))) continue;

                const other = (row === r && col === c) ? [r, c + 1] : [r, c];
                const other_value = board[other[0]] && board[other[0]][other[1]];
                if (typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)) continue;

                if (num + other_value !== add) return false;
                continue;
            }

            if (m.kind === 'h') {
                const r = m.r, c = m.c;
                if (!((row === r && col === c) || (row === r + 1 && col === c))) continue;

                const other = (row === r && col === c) ? [r + 1, c] : [r, c];
                const other_value = board[other[0]] && board[other[0]][other[1]];
                if (typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)) continue;

                if (num + other_value !== add) return false;
                continue;
            }

            if (m.kind === 'x') {
                const r = m.r, c = m.c;
                const cells = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]];

                if (!cells.some(([rr, cc]) => rr === row && cc === col)) continue;

                const values = [];
                let allNumbers = true;
                for (const [rr, cc] of cells) {
                    const v = (rr === row && cc === col) ? num : board[rr][cc];
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
            }
        }

        return true;
    }
    // const container = document.querySelector('.sudoku-container');
    // const marks = container ? container.querySelectorAll('.vx-mark') : [];
    //     const container = document.querySelector('.sudoku-container');
    // const marks = Array.isArray(state.marks_board)
    //     ? state.marks_board
    //     : sync_marks_board_from_dom(size, container);
    // for (const mark of marks) {
    //     const input = mark.querySelector('input');
    //     const value = input && input.value.trim();
    //     const add = parseInt(value, 10);
    //     if (isNaN(add)) continue;

    //     // 解析标记的唯一key
    //     const key = mark.dataset.key;

    //     if (key) {
    //         let cell_a, cell_b;
    //         if (key.startsWith('v-')) {
    //             const [_, row_str, col_str] = key.split('-');
    //             const r = parseInt(row_str, 10);
    //             const c = parseInt(col_str, 10);
    //             cell_a = [r, c - 1];
    //             cell_b = [r, c];
    //         } else if (key.startsWith('h-')) {
    //             const [_, row_str, col_str] = key.split('-');
    //             const r = parseInt(row_str, 10);
    //             const c = parseInt(col_str, 10);
    //             cell_a = [r - 1, c];
    //             cell_b = [r, c];
    //         } else if (key.startsWith('x-')) {
    //             const [_, row_str, col_str] = key.split('-');
    //             const row_mark = parseInt(row_str, 10);
    //             const col_mark = parseInt(col_str, 10);
    //             if (!Number.isInteger(row_mark) || !Number.isInteger(col_mark)) continue;

    //             const cells = [
    //                 [row_mark - 1, col_mark - 1],
    //                 [row_mark - 1, col_mark],
    //                 [row_mark, col_mark - 1],
    //                 [row_mark, col_mark]
    //             ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
    //             if (cells.length !== 4) continue;

    //             const values = [];
    //             let allNumbers = true;
    //             for (const [r, c] of cells) {
    //                 const v = (r === row && c === col) ? num : board[r][c];
    //                 if (typeof v !== 'number' || v <= 0 || Array.isArray(v)) {
    //                     allNumbers = false;
    //                     break;
    //                 }
    //                 values.push(v);
    //             }
    //             if (!allNumbers) continue;

    //             const sumVal = values.reduce((s, x) => s + x, 0);
    //             if (sumVal !== add) return false;
    //             continue;
    //         } else {
    //             continue;
    //         }

    //         // 判断当前格是否在标记两格之一
    //         let other_cell;
    //         if (row === cell_a[0] && col === cell_a[1]) {
    //             other_cell = cell_b;
    //         } else if (row === cell_b[0] && col === cell_b[1]) {
    //             other_cell = cell_a;
    //         } else {
    //             continue; // 当前格与此标记无关
    //         }

    //         // 获取当前格和另一格的值
    //         const this_value = num;
    //         const other_value = board[other_cell[0]] && board[other_cell[0]][other_cell[1]];

    //         // 只有两个格子都填了确定数字才检查合法性，否则跳过
    //         if (typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)) continue;

    //         // 判断加法关系
    //         if (this_value + other_value !== add) {
    //             return false;
    //         }

    //         continue;
    //     }

    //     // ----- 四格交点提示（新增逻辑：mark 无 key 时） -----
    //     // mark.style.left/top 是基于 container 的绝对像素位置（add_five_six_mark 中设置）
    //     const grid = container ? container.querySelector('.sudoku-grid') : null;
    //     if (!grid) continue;

    //     const grid_offset_left = grid.offsetLeft;
    //     const grid_offset_top = grid.offsetTop;
    //     const cell_width = grid.offsetWidth / size;
    //     const cell_height = grid.offsetHeight / size;

    //     const left = parseInt(mark.style.left, 10);
    //     const top = parseInt(mark.style.top, 10);
    //     if (isNaN(left) || isNaN(top)) continue;

    //     // 还原 add_five_six_mark 中设置时使用的偏移 (+15, +10 或 +15)
    //     // 这里采用与 add_five_six_mark/ add_circle 中相同的逆向计算方式
    //     const col_mark = Math.round((left - grid_offset_left + 15) / cell_width);
    //     const row_mark = Math.round((top - grid_offset_top + 15) / cell_height);

    //     const cells = [
    //         [row_mark - 1, col_mark - 1],
    //         [row_mark - 1, col_mark],
    //         [row_mark, col_mark - 1],
    //         [row_mark, col_mark]
    //     ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);

    //     // 只有完整四格才作为四格提示处理
    //     if (cells.length !== 4) continue;

    //     // 收集四格的值（将当前正在尝试放入的 num 视为该格的值）
    //     const values = [];
    //     let allNumbers = true;
    //     for (const [r, c] of cells) {
    //         const v = (r === row && c === col) ? num : board[r][c];
    //         if (typeof v !== 'number' || v <= 0 || Array.isArray(v)) {
    //             allNumbers = false;
    //             break;
    //         }
    //         values.push(v);
    //     }

    //     // 只有在四格都为确定数字时才进行和校验；部分填入时跳过
    //     if (!allNumbers) continue;

    //     const sum = values.reduce((s, x) => s + x, 0);
    //     if (sum !== add) {
    //         return false;
    //     }
    // }

    // return true;
}
