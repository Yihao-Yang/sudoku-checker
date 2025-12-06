import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_inner_numbers, clear_outer_clues } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, isValid, solve } from '../solver/solver_tool.js';
import { generate_solution, shuffle } from '../solver/generate.js';

// 新数独主入口
export function create_X_sums_sudoku(size) {
    set_current_mode('X_sums');
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
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Elimination_4: true,
        // Multi_Special_Combination_Region_Elimination_1: true,
        // Multi_Special_Combination_Region_Elimination_2: true,
        // Multi_Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Special_Combination_Region_Block_4: true,
        // Multi_Special_Combination_Region_Block_1: true,
        // Multi_Special_Combination_Region_Block_2: true,
        // Multi_Special_Combination_Region_Block_3: true,
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
                    // 外部格子：只允许数字，范围 1 ~ 最大和(1+...+size)
                    const max_sum = (size * (size + 1)) / 2;
                    regex = /[^\d]/g;
                    this.value = this.value.replace(regex, '');
                    // 去除前导零
                    if (this.value.startsWith('0')) {
                        this.value = this.value.replace(/^0+/, '');
                    }
                    if (this.value !== '' && parseInt(this.value) > max_sum) {
                        this.value = max_sum.toString();
                    }
                    if (this.value !== '' && parseInt(this.value) < 1) {
                        this.value = '1';
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
    add_Extra_Button('自动出题(老)', () => generate_X_sums_puzzle_old(size), '#2196F3');
    add_Extra_Button('自动出题(新)', () => generate_X_sums_puzzle_new(size), '#2196F3');
    // add_Extra_Button('一键标记', auto_mark_skyscraper_clues, '#2196F3');
    // add_Extra_Button('验证摩天楼唯一性', check_skyscraper_uniqueness, '#2196F3');
    // add_Extra_Button('清除标记', clear_outer_clues, '#2196F3');
}

// 生成X和数独题目
export function generate_X_sums_puzzle_old(size, score_lower_limit = 0, holes_count = undefined) {
    size = size + 2;
    clear_inner_numbers();
    clear_outer_clues();
    log_process('', true);
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

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

    // // 添加提示数
    // const add_clue = (row, col, value) => {
    //     const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
    //     if (input) {
    //         input.value = value;
    //     }
    // };
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


    // 获取对称位置
    const get_symmetric_position = (row, col, size, symmetry) => {
        switch (symmetry) {
            case 'central':
                return [size - 1 - row, size - 1 - col];
            case 'diagonal':
                return [col, row];
            case 'anti-diagonal':
                return [size - 1 - col, size - 1 - row];
            case 'horizontal':
                return [size - 1 - row, col];
            case 'vertical':
                return [row, size - 1 - col];
            default:
                return [row, col];
        }
    };


    // 随机生成提示数，只在首行、首列、尾行、尾列
    const positions_set = new Set();
    let marks_added = 0;
    let try_limit = 1000; // 防止死循环
    while (try_limit-- > 0) {
        let row, col;

        // 随机选择提示数位置：首行、首列、尾行、尾列
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
            // 首行，跳过左上角和右上角
            row = 0;
            col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
        } else if (edge === 1) {
            // 尾行，跳过左下角和右下角
            row = size - 1;
            col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
        } else if (edge === 2) {
            // 首列，跳过左上角和左下角
            row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
            col = 0;
        } else {
            // 尾列，跳过右上角和右下角
            row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
            col = size - 1;
        }

        // 根据 size 设置半排除数组
        let semi_excluded_values = [];
        if (size === 6) {
            semi_excluded_values = [1, 3, 5, 8, 9, 10];
        } else if (size === 8) {
            semi_excluded_values = [1, 3, 5, 7, 9, 11, 16, 19, 20, 21];
        } else if (size === 11) {
            semi_excluded_values = [1, 3, 5, 7, 43, 44, 45];
        }
        const excluded_values = [2, 4]; // 要排除的值
        let value1, value2;
        
        do {
            value1 = Math.floor(Math.random() * ((size - 2) * (size - 1) / 2)) + 1;
            // 完全排除
            if (excluded_values.includes(value1)) continue;
            // 半排除
            if (semi_excluded_values.includes(value1) && Math.random() < 0.5) continue;
            break;
        } while (true);

        do {
            value2 = Math.floor(Math.random() * ((size - 2) * (size - 1) / 2)) + 1;
            if (excluded_values.includes(value2)) continue;
            if (semi_excluded_values.includes(value2) && Math.random() < 0.5) continue;
            break;
        } while (true);
        const [sym_row, sym_col] = get_symmetric_position(row, col, size, symmetry);

        if (positions_set.has(`${row},${col}`) || positions_set.has(`${sym_row},${sym_col}`)) continue;

        // 添加标记
        add_clue(row, col, value1);
        add_clue(sym_row, sym_col, value2);

        // // 检查是否有解
        // let board = [];

        log_process(`尝试添加提示数 (${row},${col})=${value1} 和 (${sym_row},${sym_col})=${value2}，当前已添加 ${marks_added} 个提示数`);
        backup_original_board();
        // const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, isValid, true);
        const result = solve(board, size - 2, isValid, true);

        if (result.solution_count === 0 || result.solution_count === -2) {
            log_process(`添加提示数 (${row},${col})=${value1} 和 (${sym_row},${sym_col})=${value2} 后无解，撤销标记`);
            restore_original_board();
            // 无解，撤销标记
            const input1 = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            const input2 = grid.querySelector(`input[data-row="${sym_row}"][data-col="${sym_col}"]`);
            if (input1) input1.value = '';
            if (input2) input2.value = '';
            continue;
        }
        if (result.solution_count === 1) {
            positions_set.add(`${row},${col}`);
            positions_set.add(`${sym_row},${sym_col}`);
            marks_added += (row === sym_row && col === sym_col) ? 1 : 2;
            break;
        }
        positions_set.add(`${row},${col}`);
        positions_set.add(`${sym_row},${sym_col}`);
        marks_added += (row === sym_row && col === sym_col) ? 1 : 2;
    }

    // generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
}


// 生成X和数独题目
export function generate_X_sums_puzzle_new(size, score_lower_limit = 0, holes_count = undefined) {
    size = size + 2;
    clear_inner_numbers();
    clear_outer_clues();
    log_process('', true);
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    const interior_size = size - 2;

    // 1) 生成完整终盘（内盘）
    const solved_interior = generate_solution(interior_size);
    if (!solved_interior) {
        log_process('生成终盘失败，无法出题。');
        show_result('生成失败，请重试。');
        return;
    }

    // 2) 填入内部以便标记外侧提示（利用现有 mark 函数）
    const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
    for (let r = 1; r <= interior_size; r++) {
        for (let c = 1; c <= interior_size; c++) {
            const val = solved_interior[r - 1][c - 1];
            const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            if (input) input.value = val;
            board[r][c] = val;
        }
    }

    // 调用现有标记函数生成外部提示
    mark_outer_clues(interior_size);

    // 清除内部数字，保留外部提示
    clear_inner_numbers();
    for (let r = 1; r <= interior_size; r++) {
        for (let c = 1; c <= interior_size; c++) {
            board[r][c] = 0;
        }
    }

    // 3) 尝试按对称位置删除外提示，删除后在内盘为空的情形下做唯一性检测
    const SYMMETRY_TYPES = ['central','central','central','diagonal','diagonal','anti-diagonal','anti-diagonal','horizontal','vertical'];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    const get_interior_symmetric = (row, col, n, symmetry) => {
        switch (symmetry) {
            case 'central': return [n + 1 - row, n + 1 - col];
            case 'diagonal': return [col, row];
            case 'anti-diagonal': return [n + 1 - col, n + 1 - row];
            case 'horizontal': return [n + 1 - row, col];
            case 'vertical': return [row, n + 1 - col];
            default: return [row, col];
        }
    };
    const get_symmetric_position = (row, col, size, symmetry) => {
        switch (symmetry) {
            case 'central': return [size - 1 - row, size - 1 - col];
            case 'diagonal': return [col, row];
            case 'anti-diagonal': return [size - 1 - col, size - 1 - row];
            case 'horizontal': return [size - 1 - row, col];
            case 'vertical': return [row, size - 1 - col];
            default: return [row, col];
        }
    };

    // 若仅靠外提示不唯一：只填充那些逻辑上仍不确定的格（ambiguous），并且以对称对方式填入终盘值直到唯一
    let test_board_for_uniqueness = board.map(row => row.slice());
    backup_original_board();
    let res = solve(test_board_for_uniqueness, interior_size, isValid, true);
    restore_original_board();

    if (res.solution_count !== 1) {
        log_process('外部提示下内盘为空时非唯一，按终盘仅填充不确定格（对称成对）以尝试达到唯一性...');
        const ambiguous = [];
        if (state.logical_solution) {
            for (let r = 0; r < interior_size; r++) {
                for (let c = 0; c < interior_size; c++) {
                    if (Array.isArray(state.logical_solution[r][c])) ambiguous.push([r + 1, c + 1]);
                }
            }
        } else {
            for (let r = 1; r <= interior_size; r++) {
                for (let c = 1; c <= interior_size; c++) ambiguous.push([r, c]);
            }
        }

        shuffle(ambiguous);

        // 记录实际填充过的对（用于后续最小化）
        const filled_pairs = [];

        for (const [ir, ic] of ambiguous) {
            const inp = grid.querySelector(`input[data-row="${ir}"][data-col="${ic}"]`);
            if (inp && inp.value) continue;

            const [sr, sc] = get_interior_symmetric(ir, ic, interior_size, symmetry);
            const sinp = grid.querySelector(`input[data-row="${sr}"][data-col="${sc}"]`);
            if ((sinp && sinp.value) && !(ir === sr && ic === sc)) continue;

            const v1 = solved_interior[ir - 1][ic - 1];
            const v2 = solved_interior[sr - 1][sc - 1];

            const old1 = inp ? inp.value : '';
            const old2 = sinp ? sinp.value : '';

            if (inp) inp.value = v1;
            if (sinp) sinp.value = v2;
            board[ir][ic] = v1;
            board[sr][sc] = v2;

            // 记录此对为已填充
            filled_pairs.push({ a: [ir, ic], b: [sr, sc], v1, v2, old1, old2 });

            test_board_for_uniqueness = board.map(row => row.slice());
            backup_original_board();
            res = solve(test_board_for_uniqueness, interior_size, isValid, true);
            restore_original_board();

            if (res.solution_count === 1) {
                log_process(`对称填充 (${ir},${ic})=${v1}` + (ir===sr&&ic===sc? '' : ` 与 (${sr},${sc})=${v2}`) + ` 后达到唯一，保留填充。`);
                break;
            } else {
                log_process(`对称填充 (${ir},${ic})=${v1}` + (ir===sr&&ic===sc? '' : ` 与 (${sr},${sc})=${v2}`) + ` 仍非唯一，继续尝试更多填充。`);
            }
        }

        test_board_for_uniqueness = board.map(row => row.slice());
        backup_original_board();
        res = solve(test_board_for_uniqueness, interior_size, isValid, true);
        restore_original_board();
        if (res.solution_count === 1 && filled_pairs.length > 0) {
            log_process('已达到唯一，开始最小化已填充的对（尝试移除多余填充）...');
            // 逆序或任意顺序都可；逆序通常能更快发现可删项
            for (let idx = filled_pairs.length - 1; idx >= 0; idx--) {
                const pair = filled_pairs[idx];
                const [r1, c1] = pair.a;
                const [r2, c2] = pair.b;

                // 临时移除这对（DOM 与 board）
                const inp1 = grid.querySelector(`input[data-row="${r1}"][data-col="${c1}"]`);
                const inp2 = grid.querySelector(`input[data-row="${r2}"][data-col="${c2}"]`);
                const saved1 = inp1 ? inp1.value : '';
                const saved2 = inp2 ? inp2.value : '';

                if (inp1) inp1.value = '';
                if (inp2) inp2.value = '';
                board[r1][c1] = 0;
                board[r2][c2] = 0;

                // 检查在移除后的唯一性（仍在已填其它必要格的基础上）
                test_board_for_uniqueness = board.map(row => row.slice());
                backup_original_board();
                const tempRes = solve(test_board_for_uniqueness, interior_size, isValid, true);
                restore_original_board();

                if (tempRes.solution_count === 1) {
                    // 移除后仍唯一：说明该对是冗余，保持移除
                    log_process(`移除已填对 (${r1},${c1}) / (${r2},${c2}) 后仍唯一，移除该对。`);
                    // 从 filledPairs 中移除（已遍历，后续不会再操作）
                } else {
                    // 必要，恢复该对
                    if (inp1) inp1.value = saved1;
                    if (inp2) inp2.value = saved2;
                    board[r1][c1] = pair.v1;
                    board[r2][c2] = pair.v2;
                    log_process(`移除已填对 (${r1},${c1}) / (${r2},${c2}) 会破坏唯一性，恢复该对。`);
                }
            }
            log_process('最小化完成。');
        } else if (res.solution_count !== 1) {
            log_process('尝试一轮对称填充后仍未达到唯一解：将继续以现有提示进行后续删减（可能无法完全保证唯一）。');
        }
    }

    const borderPositions = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const isBorder = r === 0 || r === size - 1 || c === 0 || c === size - 1;
            const isCorner = (r === 0 || r === size - 1) && (c === 0 || c === size - 1);
            if (isBorder && !isCorner) borderPositions.push([r, c]);
        }
    }

    // --- 新增：按提示值优先级排序（借鉴旧逻辑的半排除/排除集合） ---
    function buildPrioritySets_for_Xsums(n) {
        const interior = n - 2;
        if (interior === 4) return { semi: [1,3,5,8,9,10], excl: [2,4] };
        if (interior === 6) return { semi: [1,3,5,7,9,11,16,19,20,21], excl: [2,4] };
        if (interior === 9) return { semi: [1, 3, 5, 7, 43, 44, 45], excl: [2,4] };
        return { semi: [], excl: [] };
    }
    const { semi: semi_excluded, excl: excluded_values } = buildPrioritySets_for_Xsums(size);

    const orderedBorderPositions = borderPositions
        .map(([r,c]) => {
            const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            const val = input && input.value ? parseInt(input.value, 10) : 0;
            let score = Math.random();
            if (!val) score -= 2;
            if (excluded_values.includes(val)) score += 100;
            else if (semi_excluded.includes(val)) score += 50;
            return { pos: [r,c], score };
        })
        // .sort((a,b) => a.score - b.score)
        .sort((a,b) => b.score - a.score)
        .map(x => x.pos);

    const removedSet = new Set();
    for (const [r, c] of orderedBorderPositions) {
        const key = `${r},${c}`;
        if (removedSet.has(key)) continue;
        const [sr, sc] = get_symmetric_position(r, c, size, symmetry);
        const skey = `${sr},${sc}`;
        if (removedSet.has(skey)) continue;

        const input1 = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
        const input2 = grid.querySelector(`input[data-row="${sr}"][data-col="${sc}"]`);
        const old1 = input1 ? input1.value : '';
        const old2 = input2 ? input2.value : '';

        if ((!old1 || old1 === '') && (!old2 || old2 === '')) {
            removedSet.add(key);
            removedSet.add(skey);
            continue;
        }

        if (input1) input1.value = '';
        if (input2) input2.value = '';
        board[r][c] = 0;
        board[sr][sc] = 0;

        backup_original_board();
        const result = solve(board, interior_size, isValid, true);
        if (result.solution_count === 1) {
            removedSet.add(key);
            removedSet.add(skey);
            log_process(`删除外部提示 (${r},${c}) 与 (${sr},${sc})：仍唯一，保留删除。`);
        } else {
            restore_original_board();
            if (input1) input1.value = old1;
            if (input2) input2.value = old2;
            board[r][c] = old1 ? parseInt(old1, 10) : 0;
            board[sr][sc] = old2 ? parseInt(old2, 10) : 0;
            log_process(`删除外部提示 (${r},${c}) 与 (${sr},${sc})：导致非唯一/无解，恢复提示。`);
        }
    }

    backup_original_board();
    show_result(`已生成 X-sums 数独题目（由终盘标记外提示并尽量删减以保持唯一性）`);
}
// ...existing code...

export function apply_X_sums_marks(board, size) {
    // X sums提示数对应候选数映射
    // 根据 size 动态生成 X sums 提示数对应候选数映射
    const X_SUMS_CANDIDATES_MAP = (() => {
        if (size === 9) {
            return {
                1: [1],
                3: [2],
                5: [2],
                6: [2, 3],
                7: [2],
                8: [2, 3],
                9: [2, 3],
                10: [2, 3, 4],
                11: [2, 3],
                12: [3, 4],
                13: [3, 4],
                14: [3, 4],
                15: [3, 4, 5],
                16: [3, 4],
                17: [3, 4, 5],
                18: [3, 4, 5],
                19: [3, 4, 5],
                20: [3, 4, 5],
                21: [4, 5, 6],
                22: [4, 5],
                23: [4, 5, 6],
                24: [4, 5, 6],
                25: [4, 5, 6],
                26: [4, 5, 6],
                27: [4, 5, 6],
                28: [4, 5, 6, 7],
                29: [5, 6],
                30: [5, 6, 7],
                31: [5, 6, 7],
                32: [5, 6, 7],
                33: [5, 6, 7],
                34: [6, 7],
                35: [5, 6, 7],
                36: [6, 7, 8],
                37: [6, 7],
                38: [6, 7, 8],
                39: [6, 7, 8],
                40: [7, 8],
                41: [7, 8],
                42: [7, 8],
                43: [8],
                44: [8],
                45: [9],
            };
        } else if (size === 6) {
            return {
                1: [1],
                3: [2],
                5: [2],
                6: [2, 3],
                7: [2],
                8: [2, 3],
                9: [3],
                10: [3, 4],
                11: [3],
                12: [3, 4],
                13: [3, 4],
                14: [3, 4],
                15: [4, 5],
                16: [4],
                17: [4, 5],
                18: [4, 5],
                19: [5],
                20: [5],
                21: [6],
            };
        } else if (size === 4) {
            return {
                1: [1],
                3: [2],
                5: [2],
                6: [2, 3],
                8: [3],
                9: [3],
                10: [4],
            };
        } else {
            return {}; // 默认返回空映射
        }
    })();

    // 第一行提示，作用于第二行
    for (let col = 1; col <= size; col++) {
        let clue = board[0][col];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[1][col])) {
                board[1][col] = board[1][col].filter(n => candidates.includes(n));
                log_process(`根据顶部提示 ${clue}，更新 (2,${col + 1}) 的候选数为 [${board[1][col].join(',')}]`);
            }
        }
    }
    // 最后一行提示，作用于倒数第二行
    for (let col = 1; col <= size; col++) {
        let clue = board[size + 1][col];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[size][col])) {
                board[size][col] = board[size][col].filter(n => candidates.includes(n));
                log_process(`根据底部提示 ${clue}，更新 (${size},${col + 1}) 的候选数为 [${board[size][col].join(',')}]`);
            }
        }
    }
    // 第一列提示，作用于第二列
    for (let row = 1; row <= size; row++) {
        let clue = board[row][0];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[row][1])) {
                board[row][1] = board[row][1].filter(n => candidates.includes(n));
                log_process(`根据左侧提示 ${clue}，更新 (${row + 1},2) 的候选数为 [${board[row][1].join(',')}]`);
            }
        }
    }
    // 最后一列提示，作用于倒数第二列
    for (let row = 1; row <= size; row++) {
        let clue = board[row][size + 1];
        if (Array.isArray(clue)) {
            if (clue.length !== 1) continue;
            clue = clue[0];
        }
        clue = parseInt(clue);
        if (clue && X_SUMS_CANDIDATES_MAP[clue]) {
            const candidates = X_SUMS_CANDIDATES_MAP[clue];
            if (Array.isArray(board[row][size])) {
                board[row][size] = board[row][size].filter(n => candidates.includes(n));
                log_process(`根据右侧提示 ${clue}，更新 (${row + 1},${size}) 的候选数为 [${board[row][size].join(',')}]`);
            }
        }
    }
}

// 添加标记外部提示数的功能
function mark_outer_clues(size) {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    // 遍历外部提示格子
    for (let row = 0; row < size + 2; row++) {
        for (let col = 0; col < size + 2; col++) {
            // 跳过第一行和最后一行的第一格和最后一格
            if ((row === 0 || row === size + 1) && (col === 0 || col === size + 1)) {
                continue;
            }

            if (row === 0 || row === size + 1 || col === 0 || col === size + 1) {
                const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
                if (input && !input.value) {
                    let x; // X 表示外部提示对应的格子数
                    let sum = 0;
                    let allFilled = true;

                    if (row === 0) {
                        // 上方提示
                        const firstCell = grid.querySelector(`input[data-row="1"][data-col="${col}"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 1; i <= x; i++) {
                                const cell = grid.querySelector(`input[data-row="${i}"][data-col="${col}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    } else if (row === size + 1) {
                        // 下方提示
                        const firstCell = grid.querySelector(`input[data-row="${size}"][data-col="${col}"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 0; i < x; i++) {
                                const cell = grid.querySelector(`input[data-row="${size - i}"][data-col="${col}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    } else if (col === 0) {
                        // 左侧提示
                        const firstCell = grid.querySelector(`input[data-row="${row}"][data-col="1"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 1; i <= x; i++) {
                                const cell = grid.querySelector(`input[data-row="${row}"][data-col="${i}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    } else if (col === size + 1) {
                        // 右侧提示
                        const firstCell = grid.querySelector(`input[data-row="${row}"][data-col="${size}"]`);
                        if (firstCell && firstCell.value) {
                            x = parseInt(firstCell.value);
                            for (let i = 0; i < x; i++) {
                                const cell = grid.querySelector(`input[data-row="${row}"][data-col="${size - i}"]`);
                                if (cell && cell.value) {
                                    sum += parseInt(cell.value);
                                } else {
                                    allFilled = false;
                                    break;
                                }
                            }
                        }
                    }

                    // 如果所有格子都已填满，标记提示数
                    if (allFilled && x) {
                        input.value = sum;
                    }
                }
            }
        }
    }
}

/**
 * 验证 X 和数独的有效性
 * @param {Array} board - 数独盘面（不包含提示数）
 * @param {number} size - 数独大小
 * @param {number} row - 当前行
 * @param {number} col - 当前列
 * @param {number} num - 当前填入的数字
 * @returns {boolean} 是否有效
 */
export function is_valid_X_sums(board, size, row, col, num) {
    const container = document.querySelector('.sudoku-container');

    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'X_sums';
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

    // 2. 检查外提示规则
    const left_cell = board[row][0]; // 该行的第一格
    const right_cell = board[row][size - 1]; // 该行的最后一格
    if ((typeof left_cell === 'number' && left_cell > 0) || col === 0) {
        let x = left_cell; // x = 第一格的数字
        if (col === 0) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查 x 个格子是否都已填入数字
        const row_values = temp_board[row].slice(0, x); // 获取前 x 个格子
        if (row_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果前 x 个格子未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在前 x 个格子范围内
        else if (col >= x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="${row + 1}"][data-col="0"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = row_values.reduce((acc, val) => acc + val, 0); // 计算前 x 个格子的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }
    // 检查最后一格是否为数字并大于 0
    if ((typeof right_cell === 'number' && right_cell > 0) || col === size - 1) {
        let x = right_cell; // x = 最后一格的数字
        if (col === size - 1) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查最后 x 个格子是否都已填入数字
        const row_values = temp_board[row].slice(size - x); // 获取最后 x 个格子
        if (row_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果最后 x 个格子未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在最后 x 个格子范围内
        else if (col < size - x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {         
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="${row + 1}"][data-col="${size + 1}"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = row_values.reduce((acc, val) => acc + val, 0); // 计算最后 x 个格子的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }
    // 检查上方提示规则
    const top_cell = board[0][col]; // 该列的第一格
    const bottom_cell = board[size - 1][col]; // 该列的最后一格
    if ((typeof top_cell === 'number' && top_cell > 0) || row === 0) {
        let x = top_cell; // x = 第一格的数字
        if (row === 0) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查前 x 行是否都已填入数字
        const col_values = temp_board.slice(0, x).map(r => r[col]); // 获取前 x 行的该列值
        if (col_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果前 x 行未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在前 x 行范围内
        else if (row >= x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="0"][data-col="${col + 1}"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = col_values.reduce((acc, val) => acc + val, 0); // 计算前 x 行的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }
    // 检查下方提示规则
    if ((typeof bottom_cell === 'number' && bottom_cell > 0) || row === size - 1) {
        let x = bottom_cell; // x = 最后一格的数字
        if (row === size - 1) {
            // 如果是左侧提示，使用第一格的数字
            x = num;
        }

        // 临时将当前格子视为已填入 num
        const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

        // 检查最后 x 行是否都已填入数字
        const col_values = temp_board.slice(size - x).map(r => r[col]); // 获取最后 x 行的该列值
        if (col_values.some(val => typeof val !== 'number' || val <= 0)) {
            // return true; // 如果最后 x 行未填满，跳过外提示规则判断
        }

        // 检查当前位置是否在最后 x 行范围内
        else if (row < size - x) {
            // return true; // 如果当前位置不在范围内，跳过外提示规则判断
        }

        else {
            // 获取外提示数字（从 container 中获取）
            const clue_input = container.querySelector(`input[data-row="${size + 1}"][data-col="${col + 1}"]`);
            const clue = clue_input ? parseInt(clue_input.value) : null;

            if (clue && typeof clue === 'number') {
                const sum = col_values.reduce((acc, val) => acc + val, 0); // 计算最后 x 行的和
                if (sum !== clue) {
                    return false; // 外提示规则不满足
                }
            }
        }
    }

    return true; // 所有规则均满足
}