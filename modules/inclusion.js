// inclusion.js
import { state, set_current_mode } from '../solver/state.js';
import { show_result, create_base_grid, create_base_cell, add_Extra_Button, log_process, backup_original_board, restore_original_board, handle_key_navigation, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { generate_solved_board_brute_force, generate_puzzle } from '../solver/generate.js';
import { get_all_regions, solve, invalidate_regions_cache, sync_marks_board_from_dom } from '../solver/solver_tool.js';
import { create_technique_panel } from '../solver/classic.js';

// 四数独主入口
export function create_inclusion_sudoku(size) {
    set_current_mode('inclusion');
    show_result(`当前模式为包含数独`);
    log_process('', true);
    log_process('规则：');
    log_process('标记：周围四格内至少包含的数字（提示可少于4个）');
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

    // 修改技巧开关
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        // 区块技巧全部打开
        Box_Block: true,
        Variant_Box_Block: true,
        Box_Pair_Block: true,
        // Extra_Region_Pair_Block: true,
        Row_Col_Block: true,
        Variant_Row_Col_Block: true,
        // Extra_Region_Block: true,
        // Variant_Extra_Region_Block: true,
        // 数对技巧
        Box_Naked_Pair: true,
        Row_Col_Naked_Pair: true,
        Box_Hidden_Pair: true,
        Row_Col_Hidden_Pair: true,
        // 数组技巧
        Box_Naked_Triple: true,
        Row_Col_Naked_Triple: true,
        Box_Hidden_Triple: true,
        Row_Col_Hidden_Triple: true,
        All_Quad: false,
        Cell_Elimination: true,
        Brute_Force: false,
        // 额外区域技巧
        // Extra_Region_Elimination: true,
        // Extra_Region_Naked_Pair: true,
        // Extra_Region_Hidden_Pair: true,
        // Extra_Region_Naked_Triple: true,
        // Extra_Region_Hidden_Triple: true,
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        Special_Combination_Region_Most_Not_Contain_3: true,
        Special_Combination_Region_Most_Not_Contain_4: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_4: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Most_Contain_4: true,
        // Multi_Special_Combination_Region_Most_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Contain_4: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        Special_Combination_Region_Cell_Elimination_4: true,
        // Multi_Special_Combination_Region_Cell_Elimination_1: true,
        // Multi_Special_Combination_Region_Cell_Elimination_2: true,
        // Multi_Special_Combination_Region_Cell_Elimination_3: true,
        // Multi_Special_Combination_Region_Cell_Elimination_4: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Elimination_4: true,
        // Multi_Special_Combination_Region_Elimination_1: true,
        // Multi_Special_Combination_Region_Elimination_2: true,
        // Multi_Special_Combination_Region_Elimination_3: true,
        // Multi_Special_Combination_Region_Elimination_4: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Special_Combination_Region_Block_4: true,
        // Multi_Special_Combination_Region_Block_1: true,
        // Multi_Special_Combination_Region_Block_2: true,
        // Multi_Special_Combination_Region_Block_3: true,
        // Multi_Special_Combination_Region_Block_4: true,
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

    // 添加四数独圆圈功能
    add_inclusion_mark(size);

    // 四数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('包含', () => {create_inclusion_sudoku(size)}, '#2196F3');
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_inclusion_puzzle(size, score_lower_limit, holes_count)) || (() => generate_inclusion_puzzle(size)), '#2196F3');
}

// 自动生成四数独题目
export function generate_inclusion_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    clear_marks();
    state.marks_board = [];
    log_process('', true);
    invalidate_regions_cache();

    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());

    log_process('第一步：生成包含数独终盘...');
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

    let min_marks = 2, max_marks = 4;
    if (size === 6) { min_marks = 4; max_marks = 8; }
    if (size === 9) { min_marks = 10; max_marks = 14; }
    const num_marks = Math.floor(Math.random() * (max_marks - min_marks + 1)) + min_marks;
    const MAX_TRY = 200;

    let marks_added = 0;
    let try_count = 0;
    let unique_found = false;

    log_process(`正在生成题目，请稍候...`);
    log_process('九宫：1分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
    show_generating_timer();

    const has_inclusion_mark = (row, col) =>
        Array.isArray(state.marks_board) &&
        state.marks_board.some((m) => m && m.kind === 'x' && m.r === row && m.c === col);

    const upsert_inclusion_mark = (row, col, clue = '') => {
        if (!Array.isArray(state.marks_board)) {
            state.marks_board = [];
        }
        const index = state.marks_board.findIndex((m) =>
            m && m.kind === 'x' && m.r === row && m.c === col
        );
        const next = { kind: 'x', r: row, c: col, clue: String(clue ?? '') };
        if (index === -1) {
            state.marks_board.push(next);
            return;
        }
        state.marks_board[index] = { ...state.marks_board[index], ...next };
    };

    const remove_inclusion_marks_by_keys = (keys = []) => {
        if (!Array.isArray(state.marks_board) || keys.length === 0) return;
        const keySet = new Set(keys.filter(Boolean));
        state.marks_board = state.marks_board.filter((m) => {
            if (!m || m.kind !== 'x' || !Number.isInteger(m.r) || !Number.isInteger(m.c)) return true;
            return !keySet.has(get_inclusion_mark_key(m.r, m.c));
        });
    };

    setTimeout(() => {
        while (try_count < MAX_TRY && marks_added < num_marks && !unique_found) {
            try_count++;

            const row = Math.floor(Math.random() * (size - 1));
            const col = Math.floor(Math.random() * (size - 1));

            const [sym_row, sym_col] = get_symmetric(row, col, size, symmetry);

            if (
                !is_valid_position(row, col, size) ||
                !is_valid_position(sym_row, sym_col, size) ||
                has_inclusion_mark(row, col) ||
                has_inclusion_mark(sym_row, sym_col)
            ) {
                continue;
            }

            const addedKeys = [];
            const mark_digit_count = pick_mark_digit_count();
            const mainDigits = calculate_inclusion_from_solved(row, col, solvedBoard, mark_digit_count);
            if (!mainDigits) continue;

            upsert_inclusion_mark(row, col, mainDigits.join(''));
            addedKeys.push(get_inclusion_mark_key(row, col));

            const symmetric_is_same = row === sym_row && col === sym_col;
            if (!symmetric_is_same) {
                const symDigits = calculate_inclusion_from_solved(sym_row, sym_col, solvedBoard, mark_digit_count);
                if (!symDigits) {
                    remove_inclusion_marks_by_keys(addedKeys);
                    continue;
                }
                upsert_inclusion_mark(sym_row, sym_col, symDigits.join(''));
                addedKeys.push(get_inclusion_mark_key(sym_row, sym_col));
            }

            marks_added += addedKeys.length;

            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_inclusion, true);
            restore_original_board();

            if (result.solution_count === 1) {
                unique_found = true;
                log_process(`✓ 找到唯一解！共添加 ${marks_added} 个标记`);
                optimize_marks_state(size, symmetry);
                break;
            }

            if (result.solution_count === 0 || result.solution_count === -2) {
                log_process('✗ 无解，移除最后添加的标记');
                remove_inclusion_marks_by_keys(addedKeys);
                marks_added -= addedKeys.length;
            } else {
                log_process(`当前解数：${result.solution_count}，继续添加标记...`);
            }
        }

        render_inclusion_marks_from_state(size, container);

        log_process('', true)
        log_process(`包含数独生成完成`);
        log_process(`点击检查唯一性查看技巧和分值`);
        const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
        // log_process(board);
        generate_puzzle(size, score_lower_limit, holes_count, solvedBoard);
        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`包含数独生成完成，耗时${elapsed}秒）`);

        if (!unique_found) {
            if (try_count >= MAX_TRY) {
                log_process('自动出题失败：达到最大尝试次数');
            } else {
                log_process('自动出题完成（可能非唯一解）');
                show_result(`包含数独生成完成（可能非唯一解），耗时${elapsed}秒）`);
            }
        }
    }, 0);

    function create_solver_board(size) {
        return Array.from({ length: size }, () =>
            Array.from({ length: size }, () => [...Array(size)].map((_, n) => n + 1))
        );
    }

    function is_valid_position(row, col, size) {
        return row >= 0 && row < size - 1 && col >= 0 && col < size - 1;
    }

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
                return [row, col];
        }
    }

    function pick_mark_digit_count() {
        const roll = Math.random();
        if (roll < 0.3) return 1;
        if (roll < 0.6) return 2;
        if (roll < 0.99) return 3;
        return 4;
    }

    function calculate_inclusion_from_solved(row, col, solvedBoard, forced_count = null) {
        const cells = [
            [row, col],
            [row, col + 1],
            [row + 1, col],
            [row + 1, col + 1]
        ];
        const values = [];
        for (const [r, c] of cells) {
            const val = solvedBoard[r]?.[c];
            if (!val) return null;
            values.push(val);
        }

        const count = Number.isInteger(forced_count) && forced_count >= 1 && forced_count <= 4
            ? forced_count
            : pick_mark_digit_count();
        const pool = [...values];
        const selected = [];
        for (let i = 0; i < count && pool.length > 0; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            selected.push(pool[idx]);
            pool.splice(idx, 1);
        }

        return selected.sort((a, b) => a - b);
    }

    function optimize_marks_state(size, symmetry) {
        log_process('开始优化标记，删除无用条件...');
        const groups = group_mark_keys_by_symmetry(size, symmetry);
        let removed = 0;
        for (const group of groups) {
            const removedMarks = temporarily_remove_marks_state(group.keys);
            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_inclusion, true);
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
                m && m.kind === 'x' && Number.isInteger(m.r) && Number.isInteger(m.c)
            )
            : [];
        const groups = [];
        const visited = new Set();
        const keySet = new Set(marks.map((m) => get_inclusion_mark_key(m.r, m.c)));
        for (const mark of marks) {
            const key = get_inclusion_mark_key(mark.r, mark.c);
            if (visited.has(key)) continue;
            const baseRow = mark.r;
            const baseCol = mark.c;
            const [symRow, symCol] = get_symmetric(baseRow, baseCol, size, symmetry);
            if (symRow < 0 || symRow >= size - 1 || symCol < 0 || symCol >= size - 1) {
                groups.push({ keys: [key] });
                visited.add(key);
                continue;
            }
            const symKey = get_inclusion_mark_key(symRow, symCol);
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
            if (m && m.kind === 'x' && Number.isInteger(m.r) && Number.isInteger(m.c)) {
                const key = get_inclusion_mark_key(m.r, m.c);
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
            if (!m || m.kind !== 'x' || !Number.isInteger(m.r) || !Number.isInteger(m.c)) continue;
            const clue = typeof m.clue === 'string' ? m.clue : '';
            upsert_inclusion_mark(m.r, m.c, clue);
        }
    }
}

function get_inclusion_mark_key(row, col) {
    return `x-${row + 1}-${col + 1}`;
}

function render_inclusion_marks_from_state(size, container = document.querySelector('.sudoku-container')) {
    if (!container) return;

    if (!Array.isArray(state.marks_board)) {
        state.marks_board = [];
    }

    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    Array.from(container.querySelectorAll('.vx-mark')).forEach((m) => m.remove());
    const marks = state.marks_board.filter((m) =>
        m && m.kind === 'x' && Number.isInteger(m.r) && Number.isInteger(m.c)
    );

    const cellWidth = grid.offsetWidth / size;
    const cellHeight = grid.offsetHeight / size;
    const gridOffsetLeft = grid.offsetLeft;
    const gridOffsetTop = grid.offsetTop;

    for (const markData of marks) {
        const row = markData.r;
        const col = markData.c;
        const key = get_inclusion_mark_key(row, col);
        const crossX = (col + 1) * cellWidth;
        const crossY = (row + 1) * cellHeight;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 30}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;
        mark.style.width = '60px';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.value = typeof markData.clue === 'string' ? markData.clue : '';
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
            const regex = new RegExp(`[^1-${size}]`, 'g');
            this.value = this.value.replace(regex, '');

            const index = state.marks_board.findIndex((m) =>
                m && m.kind === 'x' && m.r === row && m.c === col
            );
            if (index !== -1) {
                state.marks_board[index].clue = this.value;
                invalidate_regions_cache();
            }
        });

        const removeCurrentMark = (e) => {
            e.stopPropagation();
            state.marks_board = state.marks_board.filter((m) =>
                !(m && m.kind === 'x' && m.r === row && m.c === col)
            );
            render_inclusion_marks_from_state(size, container);
            invalidate_regions_cache();
        };
        mark.ondblclick = removeCurrentMark;
        input.ondblclick = removeCurrentMark;

        mark.appendChild(input);
        container.appendChild(mark);
    }
}

function get_inclusion_marks(size) {
    const marksFromState = Array.isArray(state.marks_board)
        ? state.marks_board.filter((m) =>
            m && m.kind === 'x' && Number.isInteger(m.r) && Number.isInteger(m.c)
        )
        : [];
    if (marksFromState.length > 0) {
        return marksFromState;
    }

    const container = document.querySelector('.sudoku-container');
    return sync_marks_board_from_dom(size, container).filter((m) =>
        m && m.kind === 'x' && Number.isInteger(m.r) && Number.isInteger(m.c)
    );
}

function parse_mark_nums(mark) {
    const clue = typeof mark?.clue === 'string' ? mark.clue.trim() : '';
    if (!/^\d+$/.test(clue)) return [];
    return clue.split('').map(Number);
}

// 添加四数独圆圈标记
function add_inclusion_mark(size) {
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

        const markRow = row - 1;
        const markCol = col - 1;
        if (markRow < 0 || markRow >= size - 1 || markCol < 0 || markCol >= size - 1) return;
        if (!Array.isArray(state.marks_board)) {
            state.marks_board = [];
        }
        const exists = state.marks_board.some((m) =>
            m && m.kind === 'x' && m.r === markRow && m.c === markCol
        );
        if (exists) return;

        state.marks_board.push({ kind: 'x', r: markRow, c: markCol, clue: '' });
        render_inclusion_marks_from_state(size, container);
        invalidate_regions_cache();

        const key = get_inclusion_mark_key(markRow, markCol);
        const input = container.querySelector(`.vx-mark[data-key="${key}"] input`);
        input?.focus();
    });

}

// 应用所有包含数独圆圈约束
export function apply_inclusion_marks(board, size) {
    const marks = get_inclusion_marks(size);
    for (const mark of marks) {
        const included_nums = parse_mark_nums(mark);
        if (included_nums.length === 0) continue;

        // 四个相邻格子的坐标
        const positions = [
            [mark.r, mark.c],
            [mark.r, mark.c + 1],
            [mark.r + 1, mark.c],
            [mark.r + 1, mark.c + 1]
        ];

        const required_counts = {};
        for (const n of included_nums) {
            required_counts[n] = (required_counts[n] || 0) + 1;
        }

        // “至少包含”语义下，不应把候选数强行限制为提示集合。
        // 这里只做安全推导：若某提示数字剩余可放位置数恰好等于仍需数量，则这些位置必须放该数字。
        for (const [digit, required] of Object.entries(required_counts)) {
            const n = Number(digit);
            let fixed_count = 0;
            const candidate_cells = [];

            for (const [r, c] of positions) {
                if (r < 0 || r >= size || c < 0 || c >= size) continue;

                const cell_value = board[r][c];
                if (typeof cell_value === 'number' && cell_value !== 0) {
                    if (cell_value === n) {
                        fixed_count++;
                    }
                    continue;
                }

                if (Array.isArray(cell_value) && cell_value.includes(n)) {
                    candidate_cells.push([r, c]);
                }
            }

            const need = required - fixed_count;
            if (need > 0 && candidate_cells.length === need) {
                for (const [r, c] of candidate_cells) {
                    if (Array.isArray(board[r][c])) {
                        board[r][c] = [n];
                    }
                }
            }
        }
    }
}

// 包含数独有效性检测函数
export function is_valid_inclusion(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'inclusion';
    const regions = get_all_regions(size, mode);
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col) && region.type !== '有重复包含') {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 排除标记判断
    const marks = get_inclusion_marks(size);
    for (const mark of marks) {
        const included_nums = parse_mark_nums(mark);
        if (included_nums.length === 0) continue;

        // 四个相邻格子的坐标
        const positions = [
            [mark.r, mark.c],
            [mark.r, mark.c + 1],
            [mark.r + 1, mark.c],
            [mark.r + 1, mark.c + 1]
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

        const required_counts = {};
        for (const n of included_nums) {
            required_counts[n] = (required_counts[n] || 0) + 1;
        }

        // “至少包含”语义：提示数字需至少出现对应次数；未提示数字允许出现。
        for (const [digit, required] of Object.entries(required_counts)) {
            const n = Number(digit);
            let fixed_count = 0;
            let possible_count = 0;

            for (const [r, c] of positions) {
                if (r < 0 || r >= size || c < 0 || c >= size) continue;

                const cell_value = (r === row && c === col) ? num : board[r][c];

                if (typeof cell_value === 'number' && cell_value !== 0) {
                    if (cell_value === n) {
                        fixed_count++;
                    }
                    continue;
                }

                if (Array.isArray(cell_value)) {
                    if (cell_value.includes(n)) {
                        possible_count++;
                    }
                } else {
                    // 对未初始化占位（如0）保守视为可放，避免误判无解。
                    possible_count++;
                }
            }

            if (fixed_count + possible_count < required) {
                return false;
            }
        }
    }

    return true;
}