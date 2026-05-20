import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, solve, invalidate_regions_cache, sync_marks_board_from_dom } from '../solver/solver_tool.js';
import { generate_solved_board_brute_force, generate_puzzle } from '../solver/generate.js';

// 新数独主入口
export function create_ratio_sudoku(size) {
    set_current_mode('ratio');
    show_result(`当前模式为比例数独`);
    log_process('', true);
    log_process('规则：');
    log_process('标记：两侧格内数字比例关系');
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
    state.marks_board = [];
    invalidate_regions_cache();

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
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        Special_Combination_Region_Most_Not_Contain_3: true,
        Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        Multi_Special_Combination_Region_Most_Contain_1: true,
        Multi_Special_Combination_Region_Most_Contain_2: true,
        Multi_Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        Multi_Special_Combination_Region_Cell_Elimination_1: true,
        Multi_Special_Combination_Region_Cell_Elimination_2: true,
        Multi_Special_Combination_Region_Cell_Elimination_3: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Multi_Special_Combination_Region_Elimination_1: true,
        Multi_Special_Combination_Region_Elimination_2: true,
        Multi_Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Multi_Special_Combination_Region_Block_1: true,
        Multi_Special_Combination_Region_Block_2: true,
        Multi_Special_Combination_Region_Block_3: true,
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
    add_Extra_Button('比例', () => {create_ratio_sudoku(size)}, '#2196F3');
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_ratio_puzzle(size, score_lower_limit, holes_count)) || (() => generate_ratio_puzzle(size)), '#2196F3');
    // 可添加唯一性验证等按钮
}

// 自动生成比例数独题目（生成圆圈并调用generate_puzzle）
export function generate_ratio_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    clear_marks();
    state.marks_board = [];
    log_process('', true);
    invalidate_regions_cache();

    const container = document.querySelector('.sudoku-container');
    if (!container) return;

    log_process('第一步：生成比例数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    log_process('第二步：开始添加对称提示标记...');
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
    log_process(`使用对称类型: ${symmetry}`);

    const MAX_MARKS = size * (size - 1);
    const MAX_TRY = 200;

    let marks_added = 0;
    let try_count = 0;
    let unique_found = false;

    log_process(`正在生成题目，请稍候...`);
    log_process('九宫：1分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
    show_generating_timer();

    const has_ratio_mark = (row, col, type) =>
        Array.isArray(state.marks_board) &&
        state.marks_board.some((m) =>
            m && m.kind === type && m.r === row && m.c === col
        );

    const upsert_ratio_mark = (row, col, type, clue = '/') => {
        if (!Array.isArray(state.marks_board)) {
            state.marks_board = [];
        }
        const index = state.marks_board.findIndex((m) =>
            m && m.kind === type && m.r === row && m.c === col
        );
        const next = { kind: type, r: row, c: col, clue: String(clue ?? '/') };
        if (index === -1) {
            state.marks_board.push(next);
            return;
        }
        state.marks_board[index] = { ...state.marks_board[index], ...next };
    };

    const remove_ratio_marks_by_keys = (keys = []) => {
        if (!Array.isArray(state.marks_board) || keys.length === 0) return;
        const keySet = new Set(keys.filter(Boolean));
        state.marks_board = state.marks_board.filter((m) => {
            if (!m || (m.kind !== 'v' && m.kind !== 'h') || !Number.isInteger(m.r) || !Number.isInteger(m.c)) return true;
            return !keySet.has(get_ratio_mark_key(m.r, m.c, m.kind));
        });
    };

    setTimeout(() => {
        while (try_count < MAX_TRY && marks_added < MAX_MARKS && !unique_found) {
            try_count++;

            const type = Math.random() < 0.5 ? 'v' : 'h';
            const row = type === 'v' ? Math.floor(Math.random() * size) : Math.floor(Math.random() * (size - 1));
            const col = type === 'v' ? Math.floor(Math.random() * (size - 1)) : Math.floor(Math.random() * size);

            if (!is_valid_position(row, col, size, type)) continue;

            const [sym_row, sym_col, sym_type] = get_symmetric(row, col, size, symmetry, type);
            if (!is_valid_position(sym_row, sym_col, size, sym_type)) continue;

            if (has_ratio_mark(row, col, type) || has_ratio_mark(sym_row, sym_col, sym_type)) {
                continue;
            }

            const addedKeys = [];
            const mainRatio = calculate_ratio_from_solved(row, col, type, solvedBoard);
            if (!mainRatio) continue;

            upsert_ratio_mark(row, col, type, mainRatio);
            addedKeys.push(get_ratio_mark_key(row, col, type));

            const symmetric_is_same = row === sym_row && col === sym_col && type === sym_type;
            if (!symmetric_is_same) {
                const symRatio = calculate_ratio_from_solved(sym_row, sym_col, sym_type, solvedBoard);
                if (!symRatio) {
                    remove_ratio_marks_by_keys(addedKeys);
                    continue;
                }
                upsert_ratio_mark(sym_row, sym_col, sym_type, symRatio);
                addedKeys.push(get_ratio_mark_key(sym_row, sym_col, sym_type));
            }

            marks_added += addedKeys.length;

            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_ratio, true);
            restore_original_board();

            if (result.solution_count === 1) {
                unique_found = true;
                log_process(`✓ 找到唯一解！共添加 ${marks_added} 个标记`);
                optimize_marks_state(size, symmetry);
                break;
            }

            if (result.solution_count === 0 || result.solution_count === -2) {
                log_process('✗ 无解，移除最后添加的标记');
                remove_ratio_marks_by_keys(addedKeys);
                marks_added -= addedKeys.length;
            } else {
                log_process(`当前解数：${result.solution_count}，继续添加标记...`);
            }
        }

        render_ratio_marks_from_state(size, container);

        log_process('', true);
        log_process(`比例数独生成完成`);
        log_process(`点击检查唯一性查看技巧和分值`);
        const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
        generate_puzzle(size, score_lower_limit, holes_count, board);
        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`比例数独生成完成，耗时${elapsed}秒`);

        if (!unique_found) {
            if (try_count >= MAX_TRY) {
                log_process('自动出题失败：达到最大尝试次数');
            } else {
                log_process('自动出题完成（可能非唯一解）');
            }
        }
    }, 0);

    function create_solver_board(size) {
        return Array.from({ length: size }, () =>
            Array.from({ length: size }, () => [...Array(size)].map((_, n) => n + 1))
        );
    }

    function is_valid_position(row, col, size, type) {
        if (type === 'v') {
            return row >= 0 && row < size && col >= 0 && col < size - 1;
        }
        return row >= 0 && row < size - 1 && col >= 0 && col < size;
    }

    function get_symmetric(row, col, size, symmetry, type) {
        switch (symmetry) {
            case 'central':
                return type === 'v'
                    ? [size - 1 - row, size - 2 - col, 'v']
                    : [size - 2 - row, size - 1 - col, 'h'];
            case 'diagonal':
                return type === 'v'
                    ? [col, row, 'h']
                    : [col, row, 'v'];
            case 'anti-diagonal':
                return type === 'v'
                    ? [size - 2 - col, size - 1 - row, 'h']
                    : [size - 1 - col, size - 2 - row, 'v'];
            case 'horizontal':
                return type === 'v'
                    ? [size - 1 - row, col, 'v']
                    : [size - 2 - row, col, 'h'];
            case 'vertical':
                return type === 'v'
                    ? [row, size - 2 - col, 'v']
                    : [row, size - 1 - col, 'h'];
            default:
                return [row, col, type];
        }
    }

    function calculate_ratio_from_solved(row, col, type, solvedBoard) {
        let a, b;
        if (type === 'v') {
            a = solvedBoard[row]?.[col];
            b = solvedBoard[row]?.[col + 1];
        } else {
            a = solvedBoard[row]?.[col];
            b = solvedBoard[row + 1]?.[col];
        }
        if (!a || !b) return null;

        const small = Math.min(a, b);
        const big = Math.max(a, b);
        if (small === big) return null;

        const divisor = gcd(small, big);
        const numerator = small / divisor;
        const denominator = big / divisor;
        if (numerator >= denominator) return null;

        return `${numerator}/${denominator}`;
    }

    function gcd(a, b) {
        while (b !== 0) {
            [a, b] = [b, a % b];
        }
        return a;
    }

    function optimize_marks_state(size, symmetry) {
        log_process('开始优化标记，删除无用条件...');
        const groups = group_mark_keys_by_symmetry(size, symmetry);
        let removed = 0;
        for (const group of groups) {
            const removedMarks = temporarily_remove_marks_state(group.keys);
            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_ratio, true);
            restore_original_board();
            if (result.solution_count === 1) {
                removed += removedMarks.length;
            } else {
                restore_marks_state(removedMarks);
            }
        }
        log_process(`优化完成，共删除 ${removed} 个标记`);
    }

    function group_mark_keys_by_symmetry(size, symmetry) {
        const marks = Array.isArray(state.marks_board)
            ? state.marks_board.filter((m) =>
                m && (m.kind === 'v' || m.kind === 'h') && Number.isInteger(m.r) && Number.isInteger(m.c)
            )
            : [];
        const groups = [];
        const visited = new Set();
        const keySet = new Set(marks.map((m) => get_ratio_mark_key(m.r, m.c, m.kind)));
        for (const mark of marks) {
            const key = get_ratio_mark_key(mark.r, mark.c, mark.kind);
            if (visited.has(key)) continue;
            const [symRow, symCol, symType] = get_symmetric(mark.r, mark.c, size, symmetry, mark.kind);
            if (!is_valid_position(symRow, symCol, size, symType)) {
                groups.push({ keys: [key] });
                visited.add(key);
                continue;
            }
            const symKey = get_ratio_mark_key(symRow, symCol, symType);
            if (symKey && symKey !== key && keySet.has(symKey) && !visited.has(symKey)) {
                groups.push({ keys: [key, symKey] });
                visited.add(symKey);
            } else {
                groups.push({ keys: [key] });
            }
            visited.add(key);
        }
        return groups;
    }

    function temporarily_remove_marks_state(keys = []) {
        if (!Array.isArray(state.marks_board)) {
            state.marks_board = [];
        }
        const keySet = new Set(keys.filter(Boolean));
        const removed = [];
        const next = [];
        for (const m of state.marks_board) {
            if (m && (m.kind === 'v' || m.kind === 'h') && Number.isInteger(m.r) && Number.isInteger(m.c)) {
                const key = get_ratio_mark_key(m.r, m.c, m.kind);
                if (keySet.has(key)) {
                    removed.push(m);
                    continue;
                }
            }
            next.push(m);
        }
        state.marks_board = next;
        return removed;
    }

    function restore_marks_state(removedMarks) {
        for (const m of removedMarks || []) {
            if (!m || (m.kind !== 'v' && m.kind !== 'h') || !Number.isInteger(m.r) || !Number.isInteger(m.c)) continue;
            const clue = typeof m.clue === 'string' ? m.clue : '/';
            upsert_ratio_mark(m.r, m.c, m.kind, clue);
        }
    }
}

function get_ratio_mark_key(row, col, type) {
    return type === 'v' ? `v-${row}-${col + 1}` : `h-${row + 1}-${col}`;
}

function parse_ratio_clue(clue) {
    const value = typeof clue === 'string' ? clue.trim() : '';
    if (!/^\d*\/\d*$/.test(value)) return null;
    const match = value.match(/^(\d*)\/(\d*)$/);
    if (!match) return null;
    const left_num = match[1] ? parseInt(match[1], 10) : null;
    const right_num = match[2] ? parseInt(match[2], 10) : null;
    if (!left_num || !right_num) return null;
    return { left_num, right_num };
}

function get_ratio_marks(size) {
    const marksFromState = Array.isArray(state.marks_board)
        ? state.marks_board.filter((m) =>
            m && (m.kind === 'v' || m.kind === 'h') && Number.isInteger(m.r) && Number.isInteger(m.c)
        )
        : [];
    if (marksFromState.length > 0) {
        return marksFromState;
    }

    const container = document.querySelector('.sudoku-container');
    return sync_marks_board_from_dom(size, container).filter((m) =>
        m && (m.kind === 'v' || m.kind === 'h') && Number.isInteger(m.r) && Number.isInteger(m.c)
    );
}

function render_ratio_marks_from_state(size, container = document.querySelector('.sudoku-container')) {
    if (!container) return;

    if (!Array.isArray(state.marks_board)) {
        state.marks_board = [];
    }

    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    Array.from(container.querySelectorAll('.vx-mark')).forEach((m) => m.remove());
    const marks = state.marks_board.filter((m) =>
        m && (m.kind === 'v' || m.kind === 'h') && Number.isInteger(m.r) && Number.isInteger(m.c)
    );

    const cell_width = grid.offsetWidth / size;
    const cell_height = grid.offsetHeight / size;
    const grid_offset_left = grid.offsetLeft;
    const grid_offset_top = grid.offsetTop;

    for (const markData of marks) {
        const type = markData.kind;
        const row = markData.r;
        const col = markData.c;
        const key = get_ratio_mark_key(row, col, type);

        let mark_x;
        let mark_y;
        if (type === 'v') {
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
        } else {
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
        }

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${grid_offset_left + mark_x - 18}px`;
        mark.style.top = `${grid_offset_top + mark_y - 10}px`;
        mark.style.width = '36px';
        mark.style.height = '20px';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 3;
        input.value = typeof markData.clue === 'string' && markData.clue.length > 0 ? markData.clue : '/';
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

        input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            const digits = this.value.replace(regex, '');

            let left = '';
            let right = '';

            if (digits.length === 1) {
                right = digits[0];
            } else if (digits.length >= 2) {
                const first = parseInt(digits[0], 10);
                const second = parseInt(digits[1], 10);
                if (first !== second) {
                    const minVal = Math.min(first, second);
                    const maxVal = Math.max(first, second);
                    left = String(minVal);
                    right = String(maxVal);
                }
            }

            if (left && right) {
                this.value = `${left}/${right}`;
            } else if (left) {
                this.value = `${left}/`;
            } else if (right) {
                this.value = `/${right}`;
            } else {
                this.value = '/';
            }

            const index = state.marks_board.findIndex((m) =>
                m && m.kind === type && m.r === row && m.c === col
            );
            if (index !== -1) {
                state.marks_board[index].clue = this.value;
                invalidate_regions_cache();
            }
        });

        input.addEventListener('keydown', function(e) {
            if ((e.key === 'Backspace' && this.selectionStart === 1) ||
                (e.key === 'Delete' && this.selectionStart === 0)) {
                e.preventDefault();
            }
            if (e.key.length === 1 && /[0-9]/.test(e.key) && this.selectionStart === 1) {
                this.setSelectionRange(2, 2);
            }
        });

        input.addEventListener('focus', function() {
            if (this.value.length <= 1) {
                this.setSelectionRange(2, 2);
            } else {
                this.setSelectionRange(this.value.length, this.value.length);
            }
        });

        const removeCurrentMark = (e) => {
            e.stopPropagation();
            state.marks_board = state.marks_board.filter((m) =>
                !(m && m.kind === type && m.r === row && m.c === col)
            );
            render_ratio_marks_from_state(size, container);
            invalidate_regions_cache();
        };
        mark.ondblclick = removeCurrentMark;
        input.ondblclick = removeCurrentMark;

        mark.appendChild(input);
        container.appendChild(mark);
    }
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

        let row_index;
        let col_index;
        let mark_type;
        if (dist_to_v_line < dist_to_h_line && dist_to_v_line < threshold && col < size - 1) {
            row_index = row;
            col_index = col;
            mark_type = 'v';
        } else if (dist_to_h_line <= dist_to_v_line && dist_to_h_line < threshold && row < size - 1) {
            row_index = row;
            col_index = col;
            mark_type = 'h';
        } else {
            return;
        }

        if (!Array.isArray(state.marks_board)) {
            state.marks_board = [];
        }
        const exists = state.marks_board.some((m) =>
            m && m.kind === mark_type && m.r === row_index && m.c === col_index
        );
        if (exists) {
            return;
        }

        state.marks_board.push({ kind: mark_type, r: row_index, c: col_index, clue: '/' });
        render_ratio_marks_from_state(size, container);
        invalidate_regions_cache();

        const key = get_ratio_mark_key(row_index, col_index, mark_type);
        const input = container.querySelector(`.vx-mark[data-key="${key}"] input`);
        input?.focus();
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
    const marks = get_ratio_marks(size);
    for (const mark of marks) {
        const parsed = parse_ratio_clue(mark.clue);
        if (!parsed) continue;

        let cell_a;
        let cell_b;
        if (mark.kind === 'v') {
            cell_a = [mark.r, mark.c];
            cell_b = [mark.r, mark.c + 1];
        } else if (mark.kind === 'h') {
            cell_a = [mark.r, mark.c];
            cell_b = [mark.r + 1, mark.c];
        } else {
            continue;
        }

        let other_cell;
        if (row === cell_a[0] && col === cell_a[1]) {
            other_cell = cell_b;
        } else if (row === cell_b[0] && col === cell_b[1]) {
            other_cell = cell_a;
        } else {
            continue;
        }

        const this_value = num;
        const other_value = board[other_cell[0]] && board[other_cell[0]][other_cell[1]];
        if (typeof other_value !== 'number' || other_value <= 0 || Array.isArray(other_value)) {
            continue;
        }

        const left_num = parsed.left_num;
        const right_num = parsed.right_num;
        if (
            !(
                (this_value * right_num === other_value * left_num) ||
                (other_value * right_num === this_value * left_num)
            )
        ) {
            return false;
        }
    }

    return true;
}