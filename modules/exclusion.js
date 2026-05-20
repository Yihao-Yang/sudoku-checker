import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { solve, isValid, get_all_regions, invalidate_regions_cache, sync_marks_board_from_dom } from '../solver/solver_tool.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_puzzle, generate_solved_board_brute_force } from '../solver/generate.js';

// 排除数独主入口
export function create_exclusion_sudoku(size) {
    set_current_mode('exclusion');
    show_result(`当前模式为排除数独`);
    log_process('', true);
    log_process('规则：');
    log_process('标记：周围四格内不包含的数字');
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
    state.marks_board = [];
    invalidate_regions_cache();

    // 技巧设置（可根据具体规则调整）
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
        Lookup_Table: true,
    };
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

    // 创建基础数独盘面
    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        // cell.classList.add('exclusion-mode');

        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        // 输入事件处理
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

        // 可根据排除数独规则高亮或标记
        // TODO: exclusion-specific cell marking
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加标记功能
    add_exclusion_mark(size);

    // 排除数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('排除', () => {create_exclusion_sudoku(size)}, '#2196F3');
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_exclusion_puzzle(size, score_lower_limit, holes_count)) || (() => generate_exclusion_puzzle(size)), '#2196F3');
    // add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
}

// // 自动生成排除数独题目（生成圆圈并调用generate_puzzle）
// export function generate_exclusion_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
//     const start_time = performance.now();
//     clear_all_inputs();
//     clear_marks();
//     log_process('', true);

//     // 清除已有圆圈
//     const container = document.querySelector('.sudoku-container');
//     if (!container) return;
//     Array.from(container.querySelectorAll('.vx-mark')).forEach(mark => mark.remove());
//     invalidate_regions_cache();

//     // 生成圆圈数量
//     let min_marks = 2, max_marks = 4;
//     if (size === 6) { min_marks = 10; max_marks = 12; }
//     if (size === 9) { min_marks = 26; max_marks = 28; }
//     const num_marks = Math.floor(Math.random() * (max_marks - min_marks + 1)) + min_marks;

//     // 选取对称类型
//     const SYMMETRY_TYPES = [
//         'central','central','central','central','central',
//         'diagonal','diagonal',
//         'anti-diagonal','anti-diagonal',
//         'horizontal',
//         'vertical',
//         // 'none'
//     ];
//     const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

//     // 获取对称点
//     function get_symmetric(row, col, size, symmetry) {
//         switch (symmetry) {
//             case 'central':
//                 return [size - 2 - row, size - 2 - col];
//             case 'diagonal':
//                 return [col, row];
//             case 'anti-diagonal':
//                 return [size - 2 - col, size - 2 - row];
//             case 'horizontal':
//                 return [size - 2 - row, col];
//             case 'vertical':
//                 return [row, size - 2 - col];
//             default:
//                 return null;
//         }
//     }
//     // log_process(`即将生成排除数独，圆圈数量：${num_marks}，对称类型：${symmetry}`);

//     // 随机生成圆圈位置和数字（不贴边线，带对称）
//     const positions_set = new Set();
//     let marks_added = 0;
//     while (marks_added < num_marks) {
//         let row, col;
//         // 保证不重复且不贴边线
//         do {
//             row = Math.floor(Math.random() * (size - 1)); // 1 ~ size-2
//             col = Math.floor(Math.random() * (size - 1)); // 1 ~ size-2
//         } while (positions_set.has(`${row},${col}`));

//         const key = `${row}-${col}`;
//         // 计算对称点
//         const [sym_row, sym_col] = get_symmetric(row, col, size, symmetry);
//         const sym_key = `${sym_row}-${sym_col}`;

//         // 两个点都不能重复且都不能贴右/下边线
//         if (
//             sym_row >= 0 && sym_row < size - 1 &&
//             sym_col >= 0 && sym_col < size - 1 &&
//             !positions_set.has(key) &&
//             !positions_set.has(sym_key) &&
//             !(sym_row === row && sym_col === col)
//         ) {
//             positions_set.add(key);
//             positions_set.add(sym_key);
//             add_circle(row, col, size, container);
//             add_circle(sym_row, sym_col, size, container);
//             // 检查是否有解
//             // 构造当前盘面
//             const grid = container.querySelector('.sudoku-grid');
//             let board = [];
//             for (let r = 0; r < size; r++) {
//                 board[r] = [];
//                 for (let c = 0; c < size; c++) {
//                     board[r][c] = 0;
//                 }
//             }
//             // 调用solve
//             backup_original_board();
//             const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_exclusion, true);
//             log_process(`尝试添加圆圈位置：(${row},${col}) 和 (${sym_row},${sym_col})，解的数量：${result.solution_count}`);
//             if (result.solution_count === 0 || result.solution_count === -2) {
//                 log_process('当前圆圈位置无解，重新生成');
//                 restore_original_board();
//                 // 无解，撤销圆圈
//                 positions_set.delete(key);
//                 positions_set.delete(sym_key);
//                 // 移除最后两个圆圈
//                 const marks = container.querySelectorAll('.vx-mark');
//                 if (marks.length >= 2) {
//                     marks[marks.length - 1].remove();
//                     marks[marks.length - 2].remove();
//                 }
//                 // marks_added -= 2; // 同步减少计数
//                 continue;
//             }
//             if (result.solution_count === 1) {
//                 marks_added += 2;
//                 break;
//             }
//             marks_added += 2;
//         }
//         // 如果对称点和主点重合，只添加一次
//         else if (
//             sym_row === row && sym_col === col &&
//             !positions_set.has(key)
//         ) {
//             positions_set.add(key);
//             add_circle(row, col, size, container);
//             // 检查是否有解
//             // 构造当前盘面
//             const grid = container.querySelector('.sudoku-grid');
//             let board = [];
//             for (let r = 0; r < size; r++) {
//                 board[r] = [];
//                 for (let c = 0; c < size; c++) {
//                     board[r][c] = 0;
//                 }
//             }
//             // 调用solve
//             backup_original_board();
//             const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, is_valid_exclusion, true);
//             log_process(`尝试添加圆圈 at (${row},${col})，解数：${result.solution_count}`);
//             if (result.solution_count === 0 || result.solution_count === -2) {
//                 log_process('当前圆圈位置无解，重新生成');
//                 restore_original_board();
//                 // 无解，撤销圆圈
//                 positions_set.delete(key);
//                 positions_set.delete(sym_key);
//                 // 移除最后两个圆圈
//                 const marks = container.querySelectorAll('.vx-mark');
//                 if (marks.length >= 1) {
//                     marks[marks.length - 1].remove();
//                 }
//                 // marks_added -= 1; // 同步减少计数
//                 continue;
//             }
//             if (result.solution_count === 1) {
//                 marks_added += 1;
//                 break;
//             }
//             marks_added += 1;
//         }
//     }

//     // 生成题目
//     generate_puzzle(size, score_lower_limit, holes_count);

//     // 辅助函数：添加圆圈
//     function add_circle(row, col, size, container) {
//         const grid = container.querySelector('.sudoku-grid');
//         if (!grid) return;
//         const cellWidth = grid.offsetWidth / size;
//         const cellHeight = grid.offsetHeight / size;
//         const gridOffsetLeft = grid.offsetLeft;
//         const gridOffsetTop = grid.offsetTop;
//         const crossX = (col + 1) * cellWidth;
//         const crossY = (row + 1) * cellHeight;

//         const mark = document.createElement('div');
//         mark.className = 'vx-mark';
//         mark.style.position = 'absolute';
//         mark.style.left = `${gridOffsetLeft + crossX - 15}px`;
//         mark.style.top = `${gridOffsetTop + crossY - 15}px`;

//         const input = document.createElement('input');
//         input.type = 'text';
//         input.maxLength = 1;
//         input.value = Math.floor(Math.random() * size) + 1;
//         input.style.width = '28px';
//         input.style.height = '28px';
//         input.style.fontSize = '22px';
//         input.style.textAlign = 'center';
//         input.style.border = 'none';
//         input.style.background = 'transparent';
//         input.style.outline = 'none';
//         input.style.position = 'absolute';
//         input.style.left = '50%';
//         input.style.top = '50%';
//         input.style.transform = 'translate(-50%, -50%)';
//         input.style.color = '#333';

//         mark.appendChild(input);
//         container.appendChild(mark);
//     }
// }

// 自动生成排除数独题目（先生成终盘，再按终盘生成提示数）
export function generate_exclusion_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    const start_time = performance.now();
    clear_all_inputs();
    clear_marks();
    state.marks_board = [];
    log_process('', true);

    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    invalidate_regions_cache();

    // 先生成终盘
    log_process('第一步：生成排除数独终盘...');
    const solvedBoard = generate_solved_board_brute_force(size);
    if (!solvedBoard) {
        log_process('生成终盘失败！');
        return;
    }

    // 生成圆圈数量（沿用原标准）
    let min_marks = 4, max_marks = 8;
    if (size === 6) { min_marks = 20; max_marks = 24; }
    if (size === 9) { min_marks = 52; max_marks = 56; }
    const num_marks = Math.floor(Math.random() * (max_marks - min_marks + 1)) + min_marks;

    // 对称类型（沿用原标准）
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    const has_exclusion_mark = (row, col) =>
        Array.isArray(state.marks_board) &&
        state.marks_board.some((m) => m && m.kind === 'x' && m.r === row && m.c === col);

    const upsert_exclusion_mark = (row, col, clue = '') => {
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

    const remove_exclusion_marks_by_keys = (keys = []) => {
        if (!Array.isArray(state.marks_board) || keys.length === 0) return;
        const keySet = new Set(keys.filter(Boolean));
        state.marks_board = state.marks_board.filter((m) => {
            if (!m || m.kind !== 'x' || !Number.isInteger(m.r) || !Number.isInteger(m.c)) return true;
            return !keySet.has(get_exclusion_mark_key(m.r, m.c));
        });
    };

    function get_symmetric(row, col, size, symmetry) {
        switch (symmetry) {
            case 'central': return [size - 2 - row, size - 2 - col];
            case 'diagonal': return [col, row];
            case 'anti-diagonal': return [size - 2 - col, size - 2 - row];
            case 'horizontal': return [size - 2 - row, col];
            case 'vertical': return [row, size - 2 - col];
            default: return [row, col];
        }
    }

    // 计算某交点四格的“未出现数字”集合（排除提示）
    function calculate_excluded_digits(row, col, solved) {
        const cells = [
            [row, col],
            [row, col + 1],
            [row + 1, col],
            [row + 1, col + 1],
        ];
        const present = new Set();
        for (const [r, c] of cells) {
            const val = solved[r]?.[c];
            if (!val) return null;
            present.add(val);
        }
        const res = [];
        for (let n = 1; n <= size; n++) {
            if (!present.has(n)) res.push(n);
        }
        return res;
    }

    function is_valid_position(row, col) {
        return row >= 0 && row < size - 1 && col >= 0 && col < size - 1;
    }

    // 随机生成交点位置（不贴边线，带对称），根据终盘给出“未出现数字”提示
    const positions_set = new Set();
    let marks_added = 0;

    log_process(`正在生成题目，请稍候...`);
    log_process('九宫：1分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
    setTimeout(() => {
        while (marks_added < num_marks) {
            const row = Math.floor(Math.random() * (size - 1));
            const col = Math.floor(Math.random() * (size - 1));
            const [sym_row, sym_col] = get_symmetric(row, col, size, symmetry);

            const key = `${row}-${col}`;
            const sym_key = `${sym_row}-${sym_col}`;

            if (!is_valid_position(row, col) || !is_valid_position(sym_row, sym_col)) continue;
            if (positions_set.has(key) || positions_set.has(sym_key)) continue;
            if (has_exclusion_mark(row, col) || has_exclusion_mark(sym_row, sym_col)) continue;

            const addedKeys = [];
            const mainExcluded = calculate_excluded_digits(row, col, solvedBoard);
            if (!mainExcluded || mainExcluded.length === 0) continue;
            const mainDigit = mainExcluded[Math.floor(Math.random() * mainExcluded.length)];
            upsert_exclusion_mark(row, col, String(mainDigit));
            addedKeys.push(get_exclusion_mark_key(row, col));

            const symmetric_is_same = row === sym_row && col === sym_col;
            if (!symmetric_is_same) {
                const symExcluded = calculate_excluded_digits(sym_row, sym_col, solvedBoard);
                if (!symExcluded || symExcluded.length === 0) {
                    remove_exclusion_marks_by_keys(addedKeys);
                    continue;
                }
                const symDigit = symExcluded[Math.floor(Math.random() * symExcluded.length)];
                upsert_exclusion_mark(sym_row, sym_col, String(symDigit));
                addedKeys.push(get_exclusion_mark_key(sym_row, sym_col));
            }

            backup_original_board();
            const result = solve(create_solver_board(size), size, is_valid_exclusion, true);
            restore_original_board();

            if (result.solution_count === 0 || result.solution_count === -2) {
                remove_exclusion_marks_by_keys(addedKeys);
                continue;
            }

            marks_added += addedKeys.length;
            positions_set.add(key);
            if (!symmetric_is_same) positions_set.add(sym_key);

            if (result.solution_count === 1) {
                break;
            }
        }

        render_exclusion_marks_from_state(size, container);

        log_process('', true)
        log_process(`排除数独生成完成`);
        log_process(`点击检查唯一性查看技巧和分值`);
        const { puzzle: puzzle } = generate_puzzle(size, score_lower_limit, holes_count, solvedBoard);
        optimize_marks_state(size, symmetry);
        render_exclusion_marks_from_state(size, container);
        // generate_puzzle(size, score_lower_limit, holes_count, puzzle);
        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`排除数独生成完成，耗时${elapsed}秒）`);
    }, 0);
    show_generating_timer();

    function create_solver_board(size) {
        return Array.from({ length: size }, () =>
            Array.from({ length: size }, () => [...Array(size)].map((_, n) => n + 1))
        );
    }
    
    function create_current_solver_board(size) {
        const grid = document.querySelector('.sudoku-container .sudoku-grid');
        const board = [];
        let idx = 0;
        for (let r = 0; r < size; r++) {
            board[r] = [];
            for (let c = 0; c < size; c++) {
                const cellEl = grid.children[idx++];
                // 取单元格中的主输入（第一个input）
                const input = cellEl ? cellEl.querySelector('input') : null;
                const val = input && input.value ? parseInt(input.value, 10) : 0;
                if (val >= 1 && val <= size) {
                    board[r][c] = val;
                } else {
                    board[r][c] = [...Array(size)].map((_, n) => n + 1);
                }
            }
        }
        return board;
    }
    
    function optimize_marks_state(size, symmetry) {
        log_process('开始优化标记，删除无用条件...');
        const groups = group_mark_keys_by_symmetry(size, symmetry);
        let removed = 0;

        for (const group of groups) {
            const removedMarks = temporarily_remove_marks_state(group.keys);
            backup_original_board();
            const board = create_current_solver_board(size);
            const result = solve(board, size, is_valid_exclusion, true);
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
        const keySet = new Set(marks.map((m) => get_exclusion_mark_key(m.r, m.c)));

        for (const mark of marks) {
            const key = get_exclusion_mark_key(mark.r, mark.c);
            if (visited.has(key)) continue;

            const baseRow = mark.r;
            const baseCol = mark.c;
            const [symRow, symCol] = get_symmetric(baseRow, baseCol, size, symmetry);
            if (symRow < 0 || symRow >= size - 1 || symCol < 0 || symCol >= size - 1) {
                groups.push({ keys: [key] });
                visited.add(key);
                continue;
            }

            const symKey = get_exclusion_mark_key(symRow, symCol);
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
                const key = get_exclusion_mark_key(m.r, m.c);
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
            upsert_exclusion_mark(m.r, m.c, clue);
        }
    }
}

function get_exclusion_mark_key(row, col) {
    return `x-${row + 1}-${col + 1}`;
}

function get_exclusion_marks(size) {
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

function parse_exclusion_mark_nums(mark, size) {
    const clue = typeof mark?.clue === 'string' ? mark.clue.trim() : '';
    if (!/^\d+$/.test(clue)) return [];

    const nums = [];
    for (const ch of clue) {
        const n = parseInt(ch, 10);
        if (!isNaN(n) && n >= 1 && n <= size) {
            nums.push(n);
        }
    }
    return nums;
}

function render_exclusion_marks_from_state(size, container = document.querySelector('.sudoku-container')) {
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
        const key = get_exclusion_mark_key(row, col);
        const crossX = (col + 1) * cellWidth;
        const crossY = (row + 1) * cellHeight;

        const mark = document.createElement('div');
        mark.className = 'vx-mark';
        mark.dataset.key = key;
        mark.style.position = 'absolute';
        mark.style.left = `${gridOffsetLeft + crossX - 15}px`;
        mark.style.top = `${gridOffsetTop + crossY - 15}px`;

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = size;
        input.value = typeof markData.clue === 'string' ? markData.clue : '';
        input.style.width = '28px';
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
            render_exclusion_marks_from_state(size, container);
            invalidate_regions_cache();
        };
        mark.ondblclick = removeCurrentMark;
        input.ondblclick = removeCurrentMark;

        mark.appendChild(input);
        container.appendChild(mark);
    }
}

// 添加排除标记功能
function add_exclusion_mark(size) {
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
        render_exclusion_marks_from_state(size, container);
        invalidate_regions_cache();

        const key = get_exclusion_mark_key(markRow, markCol);
        const input = container.querySelector(`.vx-mark[data-key="${key}"] input`);
        input?.focus();
    });

}

// 新增：应用所有排除标记，移除交点四格的候选数
export function apply_exclusion_marks(board, size) {
    const marks = get_exclusion_marks(size);
    for (const mark of marks) {
        const excluded_nums = parse_exclusion_mark_nums(mark, size);
        if (excluded_nums.length === 0) continue;

        // 四个相邻格子的坐标
        const positions = [
            [mark.r, mark.c],
            [mark.r, mark.c + 1],
            [mark.r + 1, mark.c],
            [mark.r + 1, mark.c + 1]
        ];

        for (const [r, c] of positions) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                // 只处理候选数数组
                if (Array.isArray(board[r][c])) {
                    board[r][c] = board[r][c].filter(n => !excluded_nums.includes(n));
                }
            }
        }
    }
}

// 排除数独有效性检测函数
export function is_valid_exclusion(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'exclusion';
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

    // 2. 排除标记判断
    const marks = get_exclusion_marks(size);
    for (const mark of marks) {
        const excluded_nums = parse_exclusion_mark_nums(mark, size);
        if (excluded_nums.length === 0) continue;

        const positions = [
            [mark.r, mark.c],
            [mark.r, mark.c + 1],
            [mark.r + 1, mark.c],
            [mark.r + 1, mark.c + 1]
        ];

        for (const [r, c] of positions) {
            if (r === row && c === col && excluded_nums.includes(num)) {
                return false;
            }
        }
    }

    return true;
}