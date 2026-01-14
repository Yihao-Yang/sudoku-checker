import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_inner_numbers, clear_outer_clues, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, isValid, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_solution, shuffle, generate_puzzle, generate_exterior_puzzle } from '../solver/generate.js';
// import { generate_puzzle } from '../solver/generate.js';

// 新数独主入口
export function create_sandwich_sudoku(size) {
    set_current_mode('sandwich');
    show_result(`当前模式为三明治数独`);
    log_process('', true);
    log_process('规则：');
    log_process(`外提示数：该行列数字1和${size}之间的数字之和`);
    // log_process('盘内数字：楼房');
    // log_process('数字大小：高度，高楼会挡住矮楼');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    // log_process('"额外区域"：附加的不可重复区域');
    log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('九宫：1-5分钟，超时请重启页面或调整限制条件');
    log_process('');
    log_process('自动出题：');
    log_process('蓝色：自动添加标记出题');
    log_process('绿色：根据给定标记出题');
    state.current_grid_size = size;
    state.clues_board = null;
    invalidate_regions_cache();

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
    add_Extra_Button('三明治', () => {create_sandwich_sudoku(size)}, '#2196F3');
    add_Extra_Button('清除内部', clear_inner_numbers, '#2196F3'); // 添加清除内部数字按钮
    add_Extra_Button('清除提示', clear_outer_clues, '#2196F3'); // 清除外部提示数
    add_Extra_Button('标记提示', () => mark_outer_clues_sandwich(size), '#2196F3'); // 添加标记外部提示数按钮
    add_Extra_Button('自动出题', () => generate_exterior_puzzle(size), '#2196F3');
    // add_Extra_Button('一键标记', auto_mark_skyscraper_clues, '#2196F3');
    // add_Extra_Button('验证摩天楼唯一性', check_skyscraper_uniqueness, '#2196F3');
    // add_Extra_Button('清除标记', clear_outer_clues, '#2196F3');
}

// // 生成三明治数独题目
// export function generate_sandwich_puzzle_old(size, score_lower_limit = 0, holes_count = undefined) {
//     size = size + 2;
//     clear_inner_numbers();
//     clear_outer_clues();
//     log_process('', true);
//     const container = document.querySelector('.sudoku-container');
//     if (!container) return;
//     const grid = container.querySelector('.sudoku-grid');
//     if (!grid) return;
//     invalidate_regions_cache();

//     // 初始化空盘面
//     let board = Array.from({ length: size }, () =>
//         Array.from({ length: size }, () => 0)
//     );

//     // 添加提示数
//     const add_clue = (row, col, value) => {
//         const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//         if (input) {
//             input.value = value;
//             board[row][col] = value; // 同步更新到 board
//         }
//     };


//     // 随机生成提示数，只在首行、首列
//     const positions_set = new Set();
//     let marks_added = 0;
//     let try_limit = 1000; // 防止死循环
//     while (try_limit-- > 0) {
//         let row, col;

//         // 随机选择提示数位置：首行、首列
//         const edge = Math.floor(Math.random() * 2);
//         if (edge === 0) {
//             // 首行，跳过左上角和右上角
//             row = 0;
//             col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
//         } else if (edge === 1) {
//             // 首列，跳过左上角和左下角
//             row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
//             col = 0;
//         }

//         // 根据 size 设置半排除数组
//         let semi_excluded_values = [];
//         if (size === 6) {
//             semi_excluded_values = [2, 3];
//         } else if (size === 8) {
//             semi_excluded_values = [0, 2, 3, 4, 6, 8, 10, 11, 12, 14];
//         } else if (size === 11) {
//             semi_excluded_values = [];
//         }
//         let excluded_values = []; // 要排除的值
//         if (size === 6) {
//             excluded_values = [1, 4];
//         } else if (size === 8) {
//             excluded_values = [1, 13];
//         } else if (size === 11) {
//             excluded_values = [];
//         }
//         // const excluded_values = [1]; // 要排除的值
//         let value1;
//         do {
//             const min_sum = 0;
//             const max_sum = Math.floor((size - 2) * (size - 3) / 2 - 1);
//             value1 = Math.floor(Math.random() * (max_sum - min_sum + 1)) + min_sum;
//             // log_process(`尝试生成提示数 at (${row},${col}) = ${value1}`);
//             // 完全排除
//             if (excluded_values.includes(value1)) continue;
//             // 半排除
//             if (semi_excluded_values.includes(value1) && Math.random() < 0.5) continue;
//             break;
//         } while (true);

//         if (positions_set.has(`${row},${col}`)) continue;

//         // 添加标记
//         add_clue(row, col, value1);
//         log_process(`尝试添加提示数 at (${row},${col}) = ${value1}`);

//         backup_original_board();
//         const result = solve(board, size - 2, isValid, true);

//         if (result.solution_count === 0 || result.solution_count === -2) {
//             log_process(`添加提示数 (${row},${col})=${value1} 后无解，撤销标记`);
//             restore_original_board();
//             // 无解，撤销标记
//             const input1 = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//             if (input1) input1.value = '';
//             continue;
//         }
//         if (result.solution_count === 1) {
//             positions_set.add(`${row},${col}`);
//             marks_added += 1;
//             break;
//         }
//         positions_set.add(`${row},${col}`);
//         marks_added += 1;
//     }

//     generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
// }

// // 生成三明治数独题目
// export function generate_sandwich_puzzle_new(size, score_lower_limit = 0, holes_count = undefined) {
//     const interior_size = size;
//     const total_size = interior_size + 2;

//     state.clues_board = null;
//     clear_inner_numbers();
//     clear_outer_clues();
//     log_process('', true);
//     const container = document.querySelector('.sudoku-container');
//     if (!container) return;
//     const grid = container.querySelector('.sudoku-grid');
//     if (!grid) return;
//     invalidate_regions_cache();

//     // 1) 生成一个完整的终盘（内盘）
//     const solved_interior = generate_solution(interior_size);
//     if (!solved_interior) {
//         log_process('生成终盘失败，无法出题。');
//         show_result('生成失败，请重试。');
//         return;
//     }

//     // // 2) 将终盘填入内部格（为了计算外侧提示），并构造全尺寸 board（包含边界）
//     // const board = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
//     // for (let r = 1; r <= interior_size; r++) {
//     //     for (let c = 1; c <= interior_size; c++) {
//     //         const val = solved_interior[r - 1][c - 1];
//     //         const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//     //         if (input) input.value = val;
//     //         board[r][c] = val;
//     //     }
//     // }
//     // 2) 把终盘临时填入内部以便标记外部提示（可见数）
//     const board_all = Array.from({ length: total_size }, () => Array.from({ length: total_size }, () => 0));
//     for (let r = 1; r <= interior_size; r++) {
//         for (let c = 1; c <= interior_size; c++) {
//             const val = solved_interior[r - 1][c - 1];
//             const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//             // 与DOM同步，填上内部数字
//             if (input) input.value = val;
//             board_all[r][c] = val;
//         }
//     }

//     // 利用已有的标记函数生成完整的外部提示（依赖 DOM 中的内部数字）
//     mark_outer_clues_sandwich(interior_size);

//     // 将 DOM 中标记的外部提示同步回 board_all 的边界位置
//     for (let r = 0; r < total_size; r++) {
//         for (let c = 0; c < total_size; c++) {
//             if (r === 0 || r === total_size - 1 || c === 0 || c === total_size - 1) {
//                 const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//                 const v = parseInt(input?.value ?? '', 10);
//                 board_all[r][c] = Number.isFinite(v) && v > 0 ? v : 0;
//             }
//         }
//     }
    
//     // 初始化 state.clues_board（从 DOM 同步刚才生成的提示）
//     state.clues_board = Array.from({ length: total_size }, (_, r) => 
//         Array.from({ length: total_size }, (_, c) => {
//             const isBorder = r === 0 || r === total_size - 1 || c === 0 || c === total_size - 1;
//             if (isBorder) {
//                 const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//                 const v = parseInt(input?.value ?? '', 10);
//                 return (Number.isFinite(v) && v > 0) ? v : 0;
//             }
//             return 0;
//         })
//     );
//     // log_process(
//     //     board_all
//     //         .map(row => row.map(cell => Array.isArray(cell) ? `[${cell.join(',')}]` : cell).join(' '))
//     //         .join('\n')
//     // );

//     // 清空内部数字（题目需要内盘为空），但保留外部提示
//     clear_inner_numbers();

//     log_process(`正在生成题目，请稍候...`);
//     log_process('九宫：1-5分钟，超时请重启页面或调整限制条件');
//     show_result(`正在生成题目，请稍候...`);
//     show_generating_timer();
    
//     setTimeout(() => {
//         const {puzzle: inner_puzzle} = generate_puzzle(interior_size, score_lower_limit, holes_count, board_all);
//         // 3) 按对称方式随机尝试删去外部提示（成对删除），每次删除后判断在没有内部数字的情况下是否仍保持唯一解
//         const SYMMETRY_TYPES = ['central','central','central','diagonal','diagonal','anti-diagonal','anti-diagonal','horizontal','vertical'];
//         const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

//         const get_symmetric_position = (row, col, size, symmetry) => {
//             symmetry = 'diagonal';
//             switch (symmetry) {
//                 case 'central': return [size - 1 - row, size - 1 - col];
//                 case 'diagonal': return [col, row];
//                 case 'anti-diagonal': return [size - 1 - col, size - 1 - row];
//                 case 'horizontal': return [size - 1 - row, col];
//                 case 'vertical': return [row, size - 1 - col];
//                 default: return [row, col];
//             }
//         };

//         // 收集所有外提示位置（排除四个角落）
//         let clue_positions = [];
//         for (let i = 1; i <= interior_size; i++) {
//             clue_positions.push([0, i]);            // 上边缘
//             clue_positions.push([total_size - 1, i]); // 下边缘
//             clue_positions.push([i, 0]);            // 左边缘
//             clue_positions.push([i, total_size - 1]); // 右边缘
//         }
//         shuffle(clue_positions);

//         const processed = new Set();
//         for (const [r, c] of clue_positions) {
//             if (processed.has(`${r},${c}`)) continue;
//             if (state.clues_board[r][c] === 0) continue;

//             const [sr, sc] = get_symmetric_position(r, c, total_size, symmetry);
            
//             // 确保对称位置也是有效的边界（非角落）
//             const isSymmetricBorder = (sr === 0 || sr === total_size - 1 || sc === 0 || sc === total_size - 1) && 
//                                     !((sr === 0 || sr === total_size - 1) && (sc === 0 || sc === total_size - 1));
            
//             const val1 = state.clues_board[r][c];
//             const val2 = isSymmetricBorder ? state.clues_board[sr][sc] : 0;

//             // 尝试删除
//             state.clues_board[r][c] = 0;
//             if (isSymmetricBorder) state.clues_board[sr][sc] = 0;
            
//             const input1 = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//             const input2 = isSymmetricBorder ? grid.querySelector(`input[data-row="${sr}"][data-col="${sc}"]`) : null;
//             if (input1) input1.value = '';
//             if (input2) input2.value = '';

//             // // 检测唯一解 (传入全空的内盘进行校验)
//             // const puzzle = Array.from({ length: interior_size }, () => Array(interior_size).fill(0));
//             // 检测唯一解 (构造包含当前外提示和空内盘的完整棋盘供求解器使用)
//             const puzzle = state.clues_board.map(row => [...row]);
//             for (let ir = 1; ir <= interior_size; ir++) {
//                 for (let ic = 1; ic <= interior_size; ic++) {
//                     // puzzle[ir][ic] = inner_puzzle[ir - 1][ic - 1];
//                     const val = inner_puzzle[ir - 1][ic - 1];
//                     // 如果是 0，则赋予全部候选数数组，否则赋予固定值
//                     puzzle[ir][ic] = val === 0 
//                         ? Array.from({ length: interior_size }, (_, i) => i + 1) 
//                         : val;
//                 }
//             }
            
//             backup_original_board();
//             const res = solve(puzzle, interior_size, isValid, true);
//             restore_original_board();

//             if (res.solution_count === 1) {
//                 // 唯一解，确认删除
//                 // log_process(`尝试删除提示 (${r},${c}) & (${sr},${sc}): 唯一解`);
//             } else {
//                 // 不是唯一解，还原
//                 state.clues_board[r][c] = val1;
//                 if (input1) input1.value = val1;
//                 if (isSymmetricBorder) {
//                     state.clues_board[sr][sc] = val2;
//                     if (input2) input2.value = val2;
//                 }
//                 // log_process(`尝试删除提示 (${r+1},${c+1}) & (${sr+1},${sc+1}): 非唯一解，已还原`);
//             }
//             processed.add(`${r},${c}`);
//             processed.add(`${sr},${sc}`);
//         }

//         generate_puzzle(interior_size, score_lower_limit, holes_count, inner_puzzle);
//         hide_generating_timer();
//     }, 0);
//     // // 新增：识别仅靠外提示时仍不确定的内格（ambiguous），再按对称成对填入终盘值直到唯一
//     // let test_board_for_uniqueness = board.map(row => row.slice());
//     // backup_original_board();
//     // let res = solve(test_board_for_uniqueness, interior_size, isValid, true);
//     // restore_original_board();

//     // if (res.solution_count !== 1) {
//     //     log_process('外部提示下内盘为空时非唯一，按终盘仅填充不确定格（对称成对）以尝试达到唯一性...');
//     //     const ambiguous = [];
//     //     if (state.logical_solution) {
//     //         for (let r = 0; r < interior_size; r++) {
//     //             for (let c = 0; c < interior_size; c++) {
//     //                 if (Array.isArray(state.logical_solution[r][c])) ambiguous.push([r + 1, c + 1]);
//     //             }
//     //         }
//     //     } else {
//     //         for (let r = 1; r <= interior_size; r++) {
//     //             for (let c = 1; c <= interior_size; c++) ambiguous.push([r, c]);
//     //         }
//     //     }

//     //     shuffle(ambiguous);

//     //     // 记录实际填充过的对（用于后续最小化）
//     //     const filled_pairs = [];

//     //     for (const [ir, ic] of ambiguous) {
//     //         const inp = grid.querySelector(`input[data-row="${ir}"][data-col="${ic}"]`);
//     //         if (inp && inp.value) continue;

//     //         const [sr, sc] = get_interior_symmetric(ir, ic, interior_size, symmetry);
//     //         const sinp = grid.querySelector(`input[data-row="${sr}"][data-col="${sc}"]`);
//     //         if ((sinp && sinp.value) && !(ir === sr && ic === sc)) continue;

//     //         const v1 = solved_interior[ir - 1][ic - 1];
//     //         const v2 = solved_interior[sr - 1][sc - 1];

//     //         const old1 = inp ? inp.value : '';
//     //         const old2 = sinp ? sinp.value : '';

//     //         if (inp) inp.value = v1;
//     //         if (sinp) sinp.value = v2;
//     //         board[ir][ic] = v1;
//     //         board[sr][sc] = v2;

//     //         // 记录此对为已填充
//     //         filled_pairs.push({ a: [ir, ic], b: [sr, sc], v1, v2, old1, old2 });

//     //         test_board_for_uniqueness = board.map(row => row.slice());
//     //         backup_original_board();
//     //         res = solve(test_board_for_uniqueness, interior_size, isValid, true);
//     //         restore_original_board();

//     //         if (res.solution_count === 1) {
//     //             log_process(`对称填充 (${ir},${ic})=${v1}` + (ir===sr&&ic===sc? '' : ` 与 (${sr},${sc})=${v2}`) + ` 后达到唯一，保留填充。`);
//     //             break;
//     //         } else {
//     //             log_process(`对称填充 (${ir},${ic})=${v1}` + (ir===sr&&ic===sc? '' : ` 与 (${sr},${sc})=${v2}`) + ` 仍非唯一，继续尝试更多填充。`);
//     //         }
//     //     }

//     //     test_board_for_uniqueness = board.map(row => row.slice());
//     //     backup_original_board();
//     //     res = solve(test_board_for_uniqueness, interior_size, isValid, true);
//     //     restore_original_board();
//     //     // if (res.solution_count !== 1) {
//     //     //     log_process('一轮对称填充后仍未达到唯一解：将继续以现有提示进行后续删减（可能无法完全保证唯一）。');
//     //     // }
//     //     if (res.solution_count === 1 && filled_pairs.length > 0) {
//     //         log_process('已达到唯一，开始最小化已填充的对（尝试移除多余填充）...');
//     //         // 逆序或任意顺序都可；逆序通常能更快发现可删项
//     //         for (let idx = filled_pairs.length - 1; idx >= 0; idx--) {
//     //             const pair = filled_pairs[idx];
//     //             const [r1, c1] = pair.a;
//     //             const [r2, c2] = pair.b;

//     //             // 临时移除这对（DOM 与 board）
//     //             const inp1 = grid.querySelector(`input[data-row="${r1}"][data-col="${c1}"]`);
//     //             const inp2 = grid.querySelector(`input[data-row="${r2}"][data-col="${c2}"]`);
//     //             const saved1 = inp1 ? inp1.value : '';
//     //             const saved2 = inp2 ? inp2.value : '';

//     //             if (inp1) inp1.value = '';
//     //             if (inp2) inp2.value = '';
//     //             board[r1][c1] = 0;
//     //             board[r2][c2] = 0;

//     //             // 检查在移除后的唯一性（仍在已填其它必要格的基础上）
//     //             test_board_for_uniqueness = board.map(row => row.slice());
//     //             backup_original_board();
//     //             const tempRes = solve(test_board_for_uniqueness, interior_size, isValid, true);
//     //             restore_original_board();

//     //             if (tempRes.solution_count === 1) {
//     //                 // 移除后仍唯一：说明该对是冗余，保持移除
//     //                 log_process(`移除已填对 (${r1},${c1}) / (${r2},${c2}) 后仍唯一，移除该对。`);
//     //                 // 从 filledPairs 中移除（已遍历，后续不会再操作）
//     //             } else {
//     //                 // 必要，恢复该对
//     //                 if (inp1) inp1.value = saved1;
//     //                 if (inp2) inp2.value = saved2;
//     //                 board[r1][c1] = pair.v1;
//     //                 board[r2][c2] = pair.v2;
//     //                 log_process(`移除已填对 (${r1},${c1}) / (${r2},${c2}) 会破坏唯一性，恢复该对。`);
//     //             }
//     //         }
//     //         log_process('最小化完成。');
//     //     } else if (res.solution_count !== 1) {
//     //         log_process('尝试一轮对称填充后仍未达到唯一解：将继续以现有提示进行后续删减（可能无法完全保证唯一）。');
//     //     }
//     // }

//     // // 收集所有可删除的外部提示位置（跳过四角）
//     // const borderPositions = [];
//     // for (let r = 0; r < size; r++) {
//     //     for (let c = 0; c < size; c++) {
//     //         const isBorder = r === 0 || r === size - 1 || c === 0 || c === size - 1;
//     //         const isCorner = (r === 0 || r === size - 1) && (c === 0 || c === size - 1);
//     //         if (isBorder && !isCorner) {
//     //             borderPositions.push([r, c]);
//     //         }
//     //     }
//     // }

//     // // --- 新增：基于提示值计算删除优先级并排序（优先删除分数小的） ---
//     // function buildPrioritySets_for_sandwich(n) {
//     //     // 使用与你旧逻辑相近的规则（按内盘大小 interior_size = n-2）
//     //     const interior = n - 2;
//     //     if (interior === 4) return { semi: [2,3], excl: [1,4] };
//     //     if (interior === 6) return { semi: [0,2,3,4,6,8,10,11,12,14], excl: [1,13] };
//     //     if (interior === 9) return { semi: [], excl: [1,34] };
//     //     return { semi: [], excl: [] };
//     // }
//     // const { semi: semi_excluded, excl: excluded_values } = buildPrioritySets_for_sandwich(size);

//     // const prioritized = borderPositions
//     //     .map(([r,c]) => {
//     //         const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//     //         const val = input && input.value ? parseInt(input.value, 10) : 0;
//     //         let score = Math.random(); // 基本随机扰动
//     //         if (!val) score -= 2; // 空值优先尝试（尽快跳过）
//     //         if (excluded_values.includes(val)) score += 100; // 最后尝试删除
//     //         else if (semi_excluded.includes(val)) score += 50; // 次之
//     //         else score += 0; // 普通候选
//     //         return { pos: [r,c], score };
//     //     })
//     //     // .sort((a,b) => a.score - b.score)
//     //     .sort((a,b) => b.score - a.score)
//     //     .map(x => x.pos);

//     // // 用排序后的顺序替换原来随机顺序
//     // // shuffle(borderPositions);
//     // // const orderedBorderPositions = borderPositions;
//     // const orderedBorderPositions = prioritized;
//     // // --- 结束新增 ---

//     // // 用于判断哪些格子已经被删除（字符串键）
//     // const removedSet = new Set();

//     // for (const [r, c] of orderedBorderPositions) {
//     //     const key = `${r},${c}`;
//     //     if (removedSet.has(key)) continue;

//     //     const [sr, sc] = get_symmetric_position(r, c, size, symmetry);
//     //     const skey = `${sr},${sc}`;
//     //     if (removedSet.has(skey)) continue;

//     //     // 保存原值
//     //     const input1 = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//     //     const input2 = grid.querySelector(`input[data-row="${sr}"][data-col="${sc}"]`);
//     //     const old1 = input1 ? input1.value : '';
//     //     const old2 = input2 ? input2.value : '';

//     //     // 如果两个位置本来就空，则继续
//     //     if ((!old1 || old1 === '') && (!old2 || old2 === '')) {
//     //         removedSet.add(key);
//     //         removedSet.add(skey);
//     //         continue;
//     //     }

//     //     // 临时删除（置空）
//     //     if (input1) input1.value = '';
//     //     if (input2) input2.value = '';
//     //     board[r][c] = 0;
//     //     board[sr][sc] = 0;

//     //     // 唯一性检测：在没有内部数字的情况下（board 内部为 0），检查是否唯一解
//     //     backup_original_board();
//     //     const result = solve(board, interior_size, isValid, true);
//     //     if (result.solution_count === 1) {
//     //         // 保留删除
//     //         removedSet.add(key);
//     //         removedSet.add(skey);
//     //         log_process(`删除外部提示 (${r},${c}) 与 (${sr},${sc})：仍保持唯一解，保留删除。`);
//     //     } else {
//     //         // 恢复
//     //         restore_original_board();
//     //         if (input1) input1.value = old1;
//     //         if (input2) input2.value = old2;
//     //         board[r][c] = old1 ? parseInt(old1, 10) : 0;
//     //         board[sr][sc] = old2 ? parseInt(old2, 10) : 0;
//     //         log_process(`删除外部提示 (${r},${c}) 与 (${sr},${sc})：导致非唯一/无解，恢复提示。`);
//     //     }
//     // }

//     // // 最终备份并显示结果
//     // backup_original_board();
//     // show_result(`已生成三明治数独题目（外部提示通过终盘标记并尽量删减，保留唯一性）`);
// }
// // ...existing code...

// 添加标记外部提示数的功能
export function mark_outer_clues_sandwich(size) {
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

    const clues = state.clues_board;
    const hasCluesBoard = Array.isArray(clues) && clues.length === size + 2;

    const readClue = (r, c) => {
        if (!hasCluesBoard) return null;
        const v = clues[r]?.[c];
        return (typeof v === 'number') ? v : null; // 允许 0；空白为 null
    };

    // 2. 检查行的三明治规则（对照左侧外提示）
    const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));
    const row_values = temp_board[row];
    const idx1_row = row_values.indexOf(1);
    const idxSize_row = row_values.indexOf(size);

    if (idx1_row !== -1 && idxSize_row !== -1) {
        const start = Math.min(idx1_row, idxSize_row) + 1;
        const end = Math.max(idx1_row, idxSize_row);

        const has_array_in_row = row_values.slice(start, end).some(cell => Array.isArray(cell));
        if (!has_array_in_row) {
            const sum = row_values.slice(start, end).reduce((acc, val) => acc + (val || 0), 0);

            const clue = readClue(row + 1, 0);
            if (typeof clue === 'number') {
                if (clue !== sum) return false;
            }
        }
    }

    // 3. 检查列的三明治规则（对照上侧外提示）
    const col_values = temp_board.map(r => r[col]);
    const idx1_col = col_values.indexOf(1);
    const idxSize_col = col_values.indexOf(size);

    if (idx1_col !== -1 && idxSize_col !== -1) {
        const start = Math.min(idx1_col, idxSize_col) + 1;
        const end = Math.max(idx1_col, idxSize_col);

        const has_array_in_col = col_values.slice(start, end).some(cell => Array.isArray(cell));
        if (!has_array_in_col) {
            const sum = col_values.slice(start, end).reduce((acc, val) => acc + (val || 0), 0);

            const clue = readClue(0, col + 1);
            if (typeof clue === 'number') {
                if (clue !== sum) return false;
            }
        }
    }

    return true;
}
// export function is_valid_sandwich(board, size, row, col, num) {
//     const container = document.querySelector('.sudoku-container');

//     // 1. 常规区域判断（与普通数独一致）
//     const mode = state.current_mode || 'sandwich';
//     const regions = get_all_regions(size, mode);
//     for (const region of regions) {
//         if (region.cells.some(([r, c]) => r === row && c === col)) {
//             for (const [r, c] of region.cells) {
//                 if ((r !== row || c !== col) && board[r][c] === num) {
//                     return false;
//                 }
//             }
//         }
//     }

//     // 2. 检查行的三明治规则
//     const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));
//     const row_values = temp_board[row];
//     // log_process(`检查行 ${row} 的三明治规则: ${row_values}`);
//     const idx1_row = row_values.indexOf(1);
//     const idxSize_row = row_values.indexOf(size);

//     if (idx1_row !== -1 && idxSize_row !== -1) {
//         const start = Math.min(idx1_row, idxSize_row) + 1;
//         const end = Math.max(idx1_row, idxSize_row);

//         // 检查是否存在数组状态的格子
//         const has_array_in_row = row_values.slice(start, end).some(cell => Array.isArray(cell));
//         if (has_array_in_row) {
//             // log_process(`行 ${row} 存在数组状态的格子，跳过三明治规则检查`);
//         } else {
//             const sum = row_values.slice(start, end).reduce((acc, val) => acc + (val || 0), 0);
//             // log_process(`行 ${row} 三明治部分的和为 ${sum}`);
//             const left_clue = container.querySelector(`input[data-row="${row + 1}"][data-col="0"]`);
//             if (left_clue && left_clue.value !== '') {
//                 const clue = parseInt(left_clue.value);
//                 if (clue !== sum) {
//                     return false;
//                 }
//             }
//         }
//     }

//     // 3. 检查列的三明治规则
//     const col_values = temp_board.map(r => r[col]);
//     const idx1_col = col_values.indexOf(1);
//     const idxSize_col = col_values.indexOf(size);

//     if (idx1_col !== -1 && idxSize_col !== -1) {
//         const start = Math.min(idx1_col, idxSize_col) + 1;
//         const end = Math.max(idx1_col, idxSize_col);

//         // 检查是否存在数组状态的格子
//         const has_array_in_col = col_values.slice(start, end).some(cell => Array.isArray(cell));
//         if (has_array_in_col) {
//             // log_process(`列 ${col} 存在数组状态的格子，跳过三明治规则检查`);
//         } else {
//             const sum = col_values.slice(start, end).reduce((acc, val) => acc + (val || 0), 0);
//             const top_clue = container.querySelector(`input[data-row="0"][data-col="${col + 1}"]`);
//             if (top_clue && top_clue.value !== '') {
//                 const clue = parseInt(top_clue.value);
//                 if (clue !== sum) {
//                     return false;
//                 }
//             }
//         }
//     }

//     return true;
// }