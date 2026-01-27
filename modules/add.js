import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_all_inputs, clear_marks, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, solve, invalidate_regions_cache, sync_marks_board_from_dom } from '../solver/solver_tool.js';
import { generate_puzzle, generate_solution, generate_solution_old, generate_solved_board_brute_force } from '../solver/generate.js';

// 新数独主入口
export function create_add_sudoku(size) {
    set_current_mode('add');
    show_result(`当前模式为加法数独`);
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
    add_add_mark(size);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('加法', () => {create_add_sudoku(size)}, '#2196F3');
    // add_Extra_Button('清除标记', clear_add_marks, '#FF5722');
    add_Extra_Button('清除标记', clear_marks);
    add_Extra_Button('自动出题', () => generate_add_puzzle(size));
    // 可添加唯一性验证等按钮
}

// 自动生成加法数独题目（生成圆圈并调用generate_puzzle）
export function generate_add_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
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
    log_process("第一步：生成加法数独终盘...");
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

    // 第二步开始：逐步添加对称的提示标记（仅写入 state.marks_board）
    log_process("第二步：开始添加对称提示标记...");
    
    // const SYMMETRY_TYPES = [
    //     'central'
    // ];
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
    log_process(`使用对称类型: ${symmetry}`);

    let marks_added = 0;
    const MAX_MARKS = (size-0) * (size-1); // 最大尝试标记数量
    // let MAX_MARKS;
    // if (size === 4) MAX_MARKS = 4;
    // else if (size === 6) MAX_MARKS = 12;
    // else if (size === 9) MAX_MARKS = 28;
    // else MAX_MARKS = (size-2) * (size-1); // 其它尺寸保持原有策略
    let try_count = 0;
    const MAX_TRY = 50;

    log_process(`正在生成题目，请稍候...`);
    log_process('九宫：1分钟，超时请重启页面或调整限制条件');
    show_result(`正在生成题目，请稍候...`);
    show_generating_timer();

    // 构建候选池（蛇形命名）
    function build_candidate_pool(size, symmetry) {
        const candidate_pool = [];
        const add_candidate = (row, col, type) => {
            if (!is_valid_position(row, col, size, type)) return;
            if (is_mark_exists_state(row, col, type)) return;

            const [sym_row, sym_col, sym_type] = get_symmetric(row, col, size, symmetry, type);
            if (!is_valid_position(sym_row, sym_col, size, sym_type)) return;
            if (!(row === sym_row && col === sym_col && type === sym_type) && is_mark_exists_state(sym_row, sym_col, sym_type)) return;

            // 相邻冲突：
            // v/h 不允许与 x 相邻；x 不允许与 v/h 相邻，同时也校验对称位
            if (type === 'v' || type === 'h') {
                if (has_adjacent_x_state(row, col, type)) return;
                if ((sym_type === 'v' || sym_type === 'h') && has_adjacent_x_state(sym_row, sym_col, sym_type)) return;
            } else if (type === 'x') {
                if (has_adjacent_vh_state(row, col)) return;
                if (sym_type === 'x' && has_adjacent_vh_state(sym_row, sym_col)) return;
            }

            candidate_pool.push({ row, col, type, sym_row, sym_col, sym_type });
        };

        // v 候选：row ∈ [0,size-1], col ∈ [0,size-2]
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size - 1; c++) {
                add_candidate(r, c, 'v');
            }
        }

        // h 候选：row ∈ [0,size-2], col ∈ [0,size-1]
        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size; c++) {
                add_candidate(r, c, 'h');
            }
        }

        // x 候选：row ∈ [0,size-2], col ∈ [0,size-2]
        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size - 1; c++) {
                add_candidate(r, c, 'x');
            }
        }

        return candidate_pool;
    }

    setTimeout(() => {
        // try {
            while (try_count < MAX_TRY && marks_added < MAX_MARKS) {
                try_count++;
                
                const candidate_pool = build_candidate_pool(size, symmetry);
                if (!candidate_pool || candidate_pool.length === 0) {
                    break;
                }
                const pick_index = Math.floor(Math.random() * candidate_pool.length);
                const picked = candidate_pool[pick_index];
                const { row, col, type, sym_row, sym_col, sym_type } = picked;

                // 计算主标记的和（基于终盘）
                const main_sum = calculate_sum_from_solved(row, col, type, solvedBoard, size);
                if (main_sum === null) continue;

                // 计算对称标记的和
                const sym_sum = calculate_sum_from_solved(sym_row, sym_col, sym_type, solvedBoard, size);
                if (sym_sum === null) continue;

                // 添加主标记与对称标记（写入 state）
                const samePosSym = (row === sym_row && col === sym_col && type === sym_type);
                const addedMain = add_mark_to_state(row, col, type, main_sum);
                let addedSym = false;
                if (!samePosSym) {
                    addedSym = add_mark_to_state(sym_row, sym_col, sym_type, sym_sum);
                }

                if (!addedMain || (!samePosSym && !addedSym)) {
                    // 若因重复或无效未成功添加，跳过本次
                    continue;
                }
                marks_added += samePosSym ? 1 : 2;

                // log_process(`添加标记: ${type}(${row},${col})=${main_sum}, ${sym_type}(${sym_row},${sym_col})=${sym_sum}`);

                // 第四步：验证唯一性
                // log_process("验证唯一性...");
                // const currentBoard = get_current_board_state(size);
                // backup_original_board();
                
                // const result = solve(
                //     currentBoard.map(row => row.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), 
                //     size, 
                //     is_valid_add, 
                //     true
                // );

                // 使用完全空白的盘面进行验证
                const emptyBoard = Array(size).fill().map(() => Array(size).fill(0));
                backup_original_board();
                
                const result = solve(
                    emptyBoard.map(row => row.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), 
                    size, 
                    is_valid_add, 
                    true
                );

                if (result.solution_count === 1) {
                    log_process(`✓ 找到唯一解！共添加 ${marks_added} 个标记`);
                    // 第五步：优化标记（基于 state），删除无用条件
                    optimize_marks_state(size, symmetry);
                    // 唯一解后渲染到界面
                    render_marks_from_state(size, container);
                    // 生成最终题目（挖空）
                    const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
                    generate_puzzle(size, score_lower_limit, holes_count, board);
                    // generate_puzzle(size, score_lower_limit, holes_count);
                    hide_generating_timer();
                    const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
                    show_result(`加法数独生成成功，耗时${elapsed}秒`);
                    return;
                } else if (result.solution_count === 0) {
                    log_process("✗ 无解，移除最后添加的标记");
                    // 移除最后添加的标记（基于 state）
                    const removeCount = (row === sym_row && col === sym_col && type === sym_type) ? 1 : 2;
                    remove_last_marks_from_state(removeCount);
                    marks_added = Math.max(0, marks_added - removeCount);
                } else {
                    // log_process(`多个解（${result.solution_count}），继续添加标记...`);
                }

                restore_original_board();
            }
        // } finally {
            // log_process('', true)
            // log_process(`比例数独生成完成`);
            // log_process(`点击检查唯一性查看技巧和分值`);
            // const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
            // generate_puzzle(size, score_lower_limit, holes_count, board);
        hide_generating_timer();
        const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
        show_result(`加法数独生成失败，耗时${elapsed}秒）`);
            
        if (try_count >= MAX_TRY) {
            log_process("自动出题失败：达到最大尝试次数");
            render_marks_from_state(size, container);
        } else {
            log_process("自动出题完成（可能非唯一解）");
            render_marks_from_state(size, container);
            // generate_puzzle(size, score_lower_limit, holes_count);
        }
            // // 记录结束时间
            // const end_time = performance.now();
            // const elapsed = ((end_time - start_time) / 1000).toFixed(3); // 秒，保留三位小数
            // show_result(`已生成${size}宫格数独题目（用时${elapsed}秒）`);
        // }
    }, 0);


    // 基于 state 的标记辅助函数
    function mark_key_from_state(m) {
        return get_mark_key(m.r, m.c, m.kind);
    }

    function is_mark_exists_state(row, col, type) {
        return Array.isArray(state.marks_board) &&
               state.marks_board.some(m => m.kind === type && m.r === row && m.c === col);
    }

    function add_mark_to_state(row, col, type, sum) {
        if (!is_valid_position(row, col, size, type)) return false;
        if (is_mark_exists_state(row, col, type)) return false;
        state.marks_board.push({ kind: type, r: row, c: col, sum });
        return true;
    }

    function remove_last_marks_from_state(count) {
        if (!Array.isArray(state.marks_board)) return;
        if (count <= 0) return;
        state.marks_board.splice(Math.max(0, state.marks_board.length - count), count);
    }

    function render_marks_from_state(size, container) {
        // 清理旧 DOM
        Array.from(container.querySelectorAll('.vx-mark')).forEach(m => m.remove());
        // 从 state 渲染
        for (const m of state.marks_board || []) {
            add_circle_with_sum(m.r, m.c, size, container, m.kind, m.sum);
        }
    }

    // 检测 v/h 是否与 x 相邻（基于 state）
    function has_adjacent_x_state(row, col, type) {
        if (!(type === 'v' || type === 'h')) return false;
        const marks = Array.isArray(state.marks_board) ? state.marks_board : [];
        for (const m of marks) {
            if (m.kind !== 'x') continue;
            const rx = m.r, cx = m.c; // x 的原始坐标（2x2 的左上角）
            if (type === 'v') {
                // v(row,col) 的两个端点对应 x(row-1,col) 与 x(row,col)
                if ((rx === row - 1 && cx === col) || (rx === row && cx === col)) {
                    return true;
                }
            } else {
                // h(row,col) 的两个端点对应 x(row,col-1) 与 x(row,col)
                if ((rx === row && cx === col - 1) || (rx === row && cx === col)) {
                    return true;
                }
            }
        }
        return false;
    }

    // 检测 x 是否与 v/h 相邻（基于 state）
    function has_adjacent_vh_state(row, col) {
        const marks = Array.isArray(state.marks_board) ? state.marks_board : [];
        for (const m of marks) {
            if (m.kind === 'v') {
                // 与 x(row,col) 相邻的 v 为 v(row,col) 与 v(row+1,col)
                if ((m.r === row && m.c === col) || (m.r === row + 1 && m.c === col)) {
                    return true;
                }
            } else if (m.kind === 'h') {
                // 与 x(row,col) 相邻的 h 为 h(row,col) 与 h(row,col+1)
                if ((m.r === row && m.c === col) || (m.r === row && m.c === col + 1)) {
                    return true;
                }
            }
        }
        return false;
    }

    function group_marks_by_symmetry_state(size, symmetry) {
        const marks = Array.isArray(state.marks_board) ? state.marks_board.slice() : [];
        const groups = [];
        const processed = new Set();

        for (const m of marks) {
            const key = mark_key_from_state(m);
            if (processed.has(key)) continue;

            const [sr, sc, st] = get_symmetric(m.r, m.c, size, symmetry, m.kind);
            const symKey = get_mark_key(sr, sc, st);
            const symMark = marks.find(x => mark_key_from_state(x) === symKey);

            if (symMark && !processed.has(symKey)) {
                groups.push({ mainKey: key, symKey: symKey });
                processed.add(key);
                processed.add(symKey);
            } else {
                groups.push({ mainKey: key, symKey: null });
                processed.add(key);
            }
        }
        return groups;
    }

    function temporarily_remove_marks_state(keys) {
        const removed = [];
        const keySet = new Set((keys || []).filter(Boolean));
        const next = [];
        for (const m of state.marks_board || []) {
            const k = mark_key_from_state(m);
            if (keySet.has(k)) {
                removed.push(m);
            } else {
                next.push(m);
            }
        }
        state.marks_board = next;
        return removed;
    }

    function restore_marks_state(removedMarks) {
        for (const m of removedMarks || []) {
            if (!is_mark_exists_state(m.r, m.c, m.kind)) {
                state.marks_board.push(m);
            }
        }
    }

    function permanently_remove_marks_state(/* removedMarks */) {
        // 已在 temporarily_remove_marks_state 中删除，无需额外处理
    }

    function optimize_marks_state(size, symmetry) {
        log_process("开始优化标记（基于 state），删除无用条件...");
        const groups = group_marks_by_symmetry_state(size, symmetry);
        // log_process(`共找到 ${groups.length} 组对称标记`);

        let removed_count = 0;

        for (let i = 0; i < groups.length; i++) {
            const g = groups[i];
            // log_process(`尝试删除第 ${i + 1} 组标记: ${g.mainKey}${g.symKey ? ' 和 ' + g.symKey : ''}`);

            const removedMarks = temporarily_remove_marks_state([g.mainKey, g.symKey].filter(Boolean));

            const emptyBoard = Array(size).fill().map(() => Array(size).fill(0));
            backup_original_board();

            const result = solve(
                emptyBoard.map(row => row.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)),
                size,
                is_valid_add,
                true
            );

            if (result.solution_count === 1) {
                // log_process(`✓ 删除第 ${i + 1} 组后仍唯一解，永久删除`);
                permanently_remove_marks_state(removedMarks);
                removed_count += removedMarks.length;
            } else {
                // log_process(`✗ 删除第 ${i + 1} 组后解不唯一，恢复`);
                restore_marks_state(removedMarks);
            }

            restore_original_board();
        }

        log_process(`优化完成，共删除了 ${removed_count} 个无用标记`);
    }

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

    function is_valid_position(row, col, size, type) {
        if (type === 'v') return row >= 0 && row < size && col >= 0 && col < size - 1;
        if (type === 'h') return row >= 0 && row < size - 1 && col >= 0 && col < size;
        if (type === 'x') return row >= 0 && row < size - 1 && col >= 0 && col < size - 1;
        return false;
    }

    function is_mark_exists(row, col, type, container) {
        const key = get_mark_key(row, col, type);
        const existingMarks = Array.from(container.querySelectorAll('.vx-mark'));
        return existingMarks.some(m => m.dataset.key === key);
    }

    function get_mark_key(row, col, type) {
        if (type === 'v') return `v-${row}-${col + 1}`;
        if (type === 'h') return `h-${row + 1}-${col}`;
        if (type === 'x') return `x-${row + 1}-${col + 1}`;
        return null;
    }

    function calculate_sum_from_solved(row, col, type, solvedBoard, size) {
        try {
            if (type === 'v') {
                // 竖线：连接 [row, col] 和 [row, col+1]
                const val1 = solvedBoard[row][col];
                const val2 = solvedBoard[row][col + 1];
                return val1 && val2 ? val1 + val2 : null;
            } else if (type === 'h') {
                // 横线：连接 [row, col] 和 [row+1, col]
                const val1 = solvedBoard[row][col];
                const val2 = solvedBoard[row + 1][col];
                return val1 && val2 ? val1 + val2 : null;
            } else if (type === 'x') {
                // 交点四格
                const cells = [
                    [row, col], [row, col + 1],
                    [row + 1, col], [row + 1, col + 1]
                ];
                let sum = 0;
                for (const [r, c] of cells) {
                    if (r >= size || c >= size || !solvedBoard[r][c]) return null;
                    sum += solvedBoard[r][c];
                }
                return sum;
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    function add_circle_with_sum(row, col, size, container, type, sum) {
        // [使用你原有的 add_circle 逻辑，但直接设置数字为计算出的 sum]
        const grid = container.querySelector('.sudoku-grid');
        if (!grid) return;

        const cell_width = grid.offsetWidth / size;
        const cell_height = grid.offsetHeight / size;

        let mark_x, mark_y, key;
        if (type === 'v') {
            mark_x = (col + 1) * cell_width;
            mark_y = row * cell_height + cell_height / 2;
            key = `v-${row}-${col + 1}`;
        } else if (type === 'h') {
            mark_x = col * cell_width + cell_width / 2;
            mark_y = (row + 1) * cell_height;
            key = `h-${row + 1}-${col}`;
        } else { // 'x'
            mark_x = (col + 1) * cell_width;
            mark_y = (row + 1) * cell_height;
            key = `x-${row + 1}-${col + 1}`;
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

    function remove_last_marks(container, count) {
        const marks = Array.from(container.querySelectorAll('.vx-mark'));
        for (let i = 0; i < count && marks.length > 0; i++) {
            marks[marks.length - 1 - i].remove();
        }
    }

    function get_current_board_state(size) {
        const inputs = document.querySelectorAll('.sudoku-grid input[type="text"]');
        const board = [];
        for (let i = 0; i < size; i++) {
            board[i] = [];
            for (let j = 0; j < size; j++) {
                const index = i * size + j;
                const value = inputs[index].value;
                board[i][j] = value ? parseInt(value, 10) : 0;
            }
        }
        return board;
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
    //     // mark.style.left/top 是基于 container 的绝对像素位置（add_add_mark 中设置）
    //     const grid = container ? container.querySelector('.sudoku-grid') : null;
    //     if (!grid) continue;

    //     const grid_offset_left = grid.offsetLeft;
    //     const grid_offset_top = grid.offsetTop;
    //     const cell_width = grid.offsetWidth / size;
    //     const cell_height = grid.offsetHeight / size;

    //     const left = parseInt(mark.style.left, 10);
    //     const top = parseInt(mark.style.top, 10);
    //     if (isNaN(left) || isNaN(top)) continue;

    //     // 还原 add_add_mark 中设置时使用的偏移 (+15, +10 或 +15)
    //     // 这里采用与 add_add_mark/ add_circle 中相同的逆向计算方式
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
