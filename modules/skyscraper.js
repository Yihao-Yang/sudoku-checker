// ...existing code...
import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button, clear_inner_numbers, clear_outer_clues, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { get_all_regions, isValid, solve, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_solution, shuffle, generate_puzzle, generate_exterior_puzzle } from '../solver/generate.js';

// 新数独主入口
export function create_skyscraper_sudoku(size) {
    set_current_mode('skyscraper');
    show_result(`当前模式为摩天楼数独`);
    log_process('', true);
    log_process('规则：');
    log_process('外提示数：该方向看到的楼房数');
    log_process('盘内数字：楼房');
    log_process('数字大小：高度，高楼会挡住矮楼');
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

    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
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
        Special_Combination_Region_Most_Not_Contain_4: true,
        // Special_Combination_Region_Most_Not_Contain_n: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_4: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Most_Contain_4: true,
        // Special_Combination_Region_Most_Contain_n: true,
        // Multi_Special_Combination_Region_Most_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Contain_4: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        Special_Combination_Region_Cell_Elimination_4: true,
        // Special_Combination_Region_Cell_Elimination_n: true,
        // Multi_Special_Combination_Region_Cell_Elimination_1: true,
        // Multi_Special_Combination_Region_Cell_Elimination_2: true,
        // Multi_Special_Combination_Region_Cell_Elimination_3: true,
        // Multi_Special_Combination_Region_Cell_Elimination_4: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Elimination_4: true,
        // Special_Combination_Region_Elimination_n: true,
        // Multi_Special_Combination_Region_Elimination_1: true,
        // Multi_Special_Combination_Region_Elimination_2: true,
        // Multi_Special_Combination_Region_Elimination_3: true,
        // Multi_Special_Combination_Region_Elimination_4: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Special_Combination_Region_Block_4: true,
        // Special_Combination_Region_Block_n: true,
        // Multi_Special_Combination_Region_Block_1: true,
        // Multi_Special_Combination_Region_Block_2: true,
        // Multi_Special_Combination_Region_Block_3: true,
        // Multi_Special_Combination_Region_Block_4: true,
        Lookup_Table: true
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
                    // 外部格子：只允许 1~size
                    const max_value = size;
                    regex = /[^\d]/g;
                    this.value = this.value.replace(regex, '');
                    if (this.value.startsWith('0')) {
                        this.value = this.value.replace(/^0+/, '');
                    }
                    if (this.value !== '') {
                        const numeric = parseInt(this.value, 10);
                        if (numeric > max_value) {
                            this.value = max_value.toString();
                        } else if (numeric < 1) {
                            this.value = '1';
                        }
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
    add_Extra_Button('摩天楼', () => {create_skyscraper_sudoku(size)}, '#2196F3');
    add_Extra_Button('清除内部', clear_inner_numbers, '#2196F3'); // 添加清除内部数字按钮
    add_Extra_Button('清除提示', clear_outer_clues, '#2196F3'); // 清除外部提示数
    add_Extra_Button('标记提示', () => mark_outer_clues_skyscraper(size), '#2196F3'); // 添加标记外部提示数按钮
    // add_Extra_Button('自动出题(老)', () => generate_skyscraper_puzzle_old(size), '#2196F3');
    add_Extra_Button('自动出题', () => generate_exterior_puzzle(size), '#2196F3');
    // add_Extra_Button('一键标记', auto_mark_skyscraper_clues, '#2196F3');
    // add_Extra_Button('验证摩天楼唯一性', check_skyscraper_uniqueness, '#2196F3');
    // add_Extra_Button('清除标记', clear_outer_clues, '#2196F3');
}

// // 生成X和数独题目
// export function generate_skyscraper_puzzle_old(size, score_lower_limit = 0, holes_count = undefined) {
//     size = size + 2;
//     clear_inner_numbers();
//     clear_outer_clues();
//     log_process('', true);
//     const container = document.querySelector('.sudoku-container');
//     if (!container) return;
//     const grid = container.querySelector('.sudoku-grid');
//     if (!grid) return;
//     invalidate_regions_cache();

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

//     // // 添加提示数
//     // const add_clue = (row, col, value) => {
//     //     const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//     //     if (input) {
//     //         input.value = value;
//     //     }
//     // };
//         // 初始化空盘面
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


//     // 获取对称位置
//     const get_symmetric_position = (row, col, size, symmetry) => {
//         switch (symmetry) {
//             case 'central':
//                 return [size - 1 - row, size - 1 - col];
//             case 'diagonal':
//                 return [col, row];
//             case 'anti-diagonal':
//                 return [size - 1 - col, size - 1 - row];
//             case 'horizontal':
//                 return [size - 1 - row, col];
//             case 'vertical':
//                 return [row, size - 1 - col];
//             default:
//                 return [row, col];
//         }
//     };


//     // 随机生成提示数，只在首行、首列、尾行、尾列
//     const positions_set = new Set();
//     let marks_added = 0;
//     let try_limit = 1000; // 防止死循环
//     while (try_limit-- > 0) {
//         let row, col;

//         // 随机选择提示数位置：首行、首列、尾行、尾列
//         const edge = Math.floor(Math.random() * 4);
//         if (edge === 0) {
//             // 首行，跳过左上角和右上角
//             row = 0;
//             col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
//         } else if (edge === 1) {
//             // 尾行，跳过左下角和右下角
//             row = size - 1;
//             col = Math.floor(Math.random() * (size - 2)) + 1; // 列范围为 [1, size - 2]
//         } else if (edge === 2) {
//             // 首列，跳过左上角和左下角
//             row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
//             col = 0;
//         } else {
//             // 尾列，跳过右上角和右下角
//             row = Math.floor(Math.random() * (size - 2)) + 1; // 行范围为 [1, size - 2]
//             col = size - 1;
//         }

//         // 根据 size 设置半排除数组
//         let semi_excluded_values = [];
//         if (size === 6) {
//             semi_excluded_values = [1, 4];
//         } else if (size === 8) {
//             semi_excluded_values = [1, 6];
//         } else if (size === 11) {
//             semi_excluded_values = [1, 9];
//         }
//         const excluded_values = []; // 要排除的值
//         let value1, value2;
        
//         do {
//             value1 = Math.floor(Math.random() * (size - 2)) + 1;
//             // 完全排除
//             if (excluded_values.includes(value1)) continue;
//             // 半排除
//             if (semi_excluded_values.includes(value1) && Math.random() < 0.5) continue;
//             break;
//         } while (true);

//         do {
//             value2 = Math.floor(Math.random() * (size - 2)) + 1;
//             if (excluded_values.includes(value2)) continue;
//             if (semi_excluded_values.includes(value2) && Math.random() < 0.5) continue;
//             break;
//         } while (true);
//         const [sym_row, sym_col] = get_symmetric_position(row, col, size, symmetry);

//         if (positions_set.has(`${row},${col}`) || positions_set.has(`${sym_row},${sym_col}`)) continue;

//         // 添加标记
//         add_clue(row, col, value1);
//         add_clue(sym_row, sym_col, value2);

//         // // 检查是否有解
//         // let board = [];

//         log_process(`尝试添加提示数 (${row},${col})=${value1} 和 (${sym_row},${sym_col})=${value2}，当前已添加 ${marks_added} 个提示数`);
//         backup_original_board();
//         // const result = solve(board.map(r => r.map(cell => cell === 0 ? [...Array(size)].map((_, n) => n + 1) : cell)), size, isValid, true);
//         const result = solve(board, size - 2, isValid, true);

//         if (result.solution_count === 0 || result.solution_count === -2) {
//             log_process(`添加提示数 (${row},${col})=${value1} 和 (${sym_row},${sym_col})=${value2} 后无解，撤销标记`);
//             restore_original_board();
//             // 无解，撤销标记
//             const input1 = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//             const input2 = grid.querySelector(`input[data-row="${sym_row}"][data-col="${sym_col}"]`);
//             if (input1) input1.value = '';
//             if (input2) input2.value = '';
//             continue;
//         }
//         if (result.solution_count === 1) {
//             positions_set.add(`${row},${col}`);
//             positions_set.add(`${sym_row},${sym_col}`);
//             marks_added += (row === sym_row && col === sym_col) ? 1 : 2;
//             break;
//         }
//         positions_set.add(`${row},${col}`);
//         positions_set.add(`${sym_row},${sym_col}`);
//         marks_added += (row === sym_row && col === sym_col) ? 1 : 2;
//     }

//     // generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
// }

// // 生成X和数独题目
// export function generate_skyscraper_puzzle_new(size, score_lower_limit = 0, holes_count = undefined) {
//     // 记录开始时间
//     const start_time = performance.now();
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

//     // 1) 生成完整终盘（内盘）
//     const solved_interior = generate_solution(interior_size);
//     if (!solved_interior) {
//         log_process('生成终盘失败，无法出题。');
//         show_result('生成失败，请重试。');
//         return;
//     }

//     // // 2) 把终盘暂时填入内部以便标记外部提示（可见数）
//     // for (let r = 1; r <= interior_size; r++) {
//     //     for (let c = 1; c <= interior_size; c++) {
//     //         const val = solved_interior[r - 1][c - 1];
//     //         const input = grid.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
//     //         if (input) input.value = val;
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

//     // 使用现有标记函数依据已填内部数字自动标注外部提示
//     mark_outer_clues_skyscraper(interior_size);

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

//     // 清除内部数字，准备进行提示数挖空
//     clear_inner_numbers();

//     // log_process(`注意生成的斜线位置，若无解，请重启网页`);
//     log_process(`正在生成题目，请稍候...`);
//     log_process('九宫：1-5分钟，超时请重启页面或调整限制条件');
//     show_result(`正在生成题目，请稍候...`);
//     show_generating_timer();

//     setTimeout(() => {
//         const {puzzle: inner_puzzle} = generate_puzzle(interior_size, score_lower_limit, holes_count, board_all);

//         // 3) 按对称规则尝试删除外提示（对抗搜索）
//         const SYMMETRY_TYPES = ['central','central','central','central','central','diagonal','diagonal','anti-diagonal','anti-diagonal','horizontal','vertical'];
//         const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

//         const get_symmetric_position = (row, col, size, symmetry) => {
//             // symmetry = 'diagonal';
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
//         const elapsed = ((performance.now() - start_time) / 1000).toFixed(3);
//         show_result(`已生成${interior_size}宫格数独题目（用时${elapsed}秒）`);
//     }, 0);
// }

// 根据摩天楼外提示规则标记候选数（从 board 读取外提示）
export function apply_skyscraper_marks(board, size) {
    // if (!board || board.length !== size + 2) return false;
    // log_process('打表调用');
    let marked = false;
    
    // 从 board 读取外部提示
    const parse_clue = (r, c) => {
        const val = state.clues_board[r][c];
        // log_process(`解析提示位置 (${r+1},${c+1})，值为 ${val}`);
        if (typeof val === 'number' && val > 0) return val;
        return 0;
    };
    
    // 辅助函数：从候选数中删除特定数字
    const remove_candidate = (candidates, num) => {
        if (Array.isArray(candidates) && candidates.includes(num)) {
            const index = candidates.indexOf(num);
            if (index !== -1) {
                candidates.splice(index, 1);
                return true;
            }
        }
        return false;
    };
    
    // 处理行提示（左侧和右侧）
    for (let row = 0; row < size; row++) {
        const left_clue = parse_clue(row + 1, 0);
        const right_clue = parse_clue(row + 1, size + 1);
        
        // 处理左侧提示
        if (left_clue > 0) {
            if (left_clue === 1) {
                // 左侧提示为1：第一格只能填最大值size
                const candidates = board[row][0];
                if (Array.isArray(candidates)) {
                    for (let num = 1; num < size; num++) {
                        if (remove_candidate(candidates, num)) marked = true;
                    }
                }
            } else if (left_clue === size) {
                // 左侧提示为size：第k格只能填k
                for (let k = 0; k < size; k++) {
                    const candidates = board[row][k];
                    // log_process(`处理左侧提示为 size，行 ${row+1}，位置 (${row+1},${k+1}) 的候选数：${Array.isArray(candidates) ? candidates.join(',') : candidates}`);
                    if (Array.isArray(candidates)) {
                        for (let num = 1; num <= size; num++) {
                            if (num !== k + 1 && remove_candidate(candidates, num)) {
                                marked = true;
                                // log_process(`从位置 (${row+1},${k+1}) 的候选数中删除 ${num}`);
                            }
                        }
                    }
                }
            } else {
                // 左侧提示为n：前n-1格删掉size的候选，前n-2格删掉size-1的候选...
                for (let i = 0; i < left_clue - 1; i++) {
                    const num_to_remove = size - i;
                    for (let j = 0; j <= left_clue - 2 - i; j++) {
                        const candidates = board[row][j];
                        if (Array.isArray(candidates)) {
                            if (remove_candidate(candidates, num_to_remove)) marked = true;
                        }
                    }
                }
            }
        }
        
        // 处理右侧提示
        if (right_clue > 0) {
            if (right_clue === 1) {
                // 右侧提示为1：最后一格只能填最大值size
                const candidates = board[row][size-1];
                if (Array.isArray(candidates)) {
                    for (let num = 1; num < size; num++) {
                        if (remove_candidate(candidates, num)) marked = true;
                    }
                }
            } else if (right_clue === size) {
                // 右侧提示为size：从右侧数第k格只能填k
                for (let k = 0; k < size; k++) {
                    const candidates = board[row][size - k - 1];
                    if (Array.isArray(candidates)) {
                        for (let num = 1; num <= size; num++) {
                            if (num !== k + 1 && remove_candidate(candidates, num)) {
                                marked = true;
                            }
                        }
                    }
                }
            } else {
                // 右侧提示为n：从右侧数前n-1格删掉size的候选...
                for (let i = 0; i < right_clue - 1; i++) {
                    const num_to_remove = size - i;
                    for (let j = 0; j <= right_clue - 2 - i; j++) {
                        const candidates = board[row][size - j - 1];
                        if (Array.isArray(candidates)) {
                            if (remove_candidate(candidates, num_to_remove)) marked = true;
                        }
                    }
                }
            }
        }
    }
    
    // 处理列提示（上方和下方）
    for (let col = 0; col < size; col++) {
        const top_clue = parse_clue(0, col + 1);
        const bottom_clue = parse_clue(size + 1, col + 1);
        
        // 处理上方提示
        if (top_clue > 0) {
            if (top_clue === 1) {
                // 上方提示为1：第一格只能填最大值size
                const candidates = board[0][col];
                if (Array.isArray(candidates)) {
                    for (let num = 1; num < size; num++) {
                        if (remove_candidate(candidates, num)) marked = true;
                    }
                }
            } else if (top_clue === size) {
                // 上方提示为size：第k格只能填k
                for (let k = 0; k < size; k++) {
                    const candidates = board[k][col];
                    if (Array.isArray(candidates)) {
                        for (let num = 1; num <= size; num++) {
                            if (num !== k + 1 && remove_candidate(candidates, num)) {
                                marked = true;
                            }
                        }
                    }
                }
            } else {
                // 上方提示为n：前n-1格删掉size的候选...
                for (let i = 0; i < top_clue - 1; i++) {
                    const num_to_remove = size - i;
                    for (let j = 0; j <= top_clue - 2 - i; j++) {
                        const candidates = board[j][col];
                        if (Array.isArray(candidates)) {
                            if (remove_candidate(candidates, num_to_remove)) marked = true;
                        }
                    }
                }
            }
        }
        
        // 处理下方提示
        if (bottom_clue > 0) {
            if (bottom_clue === 1) {
                // 下方提示为1：最后一格只能填最大值size
                const candidates = board[size-1][col];
                if (Array.isArray(candidates)) {
                    for (let num = 1; num < size; num++) {
                        if (remove_candidate(candidates, num)) marked = true;
                    }
                }
            } else if (bottom_clue === size) {
                // 下方提示为size：从下方数第k格只能填k
                for (let k = 0; k < size; k++) {
                    const candidates = board[size - k - 1][col];
                    if (Array.isArray(candidates)) {
                        for (let num = 1; num <= size; num++) {
                            if (num !== k + 1 && remove_candidate(candidates, num)) {
                                marked = true;
                            }
                        }
                    }
                }
            } else {
                // 下方提示为n：从下方数前n-1格删掉size的候选...
                for (let i = 0; i < bottom_clue - 1; i++) {
                    const num_to_remove = size - i;
                    for (let j = 0; j <= bottom_clue - 2 - i; j++) {
                        const candidates = board[size - j - 1][col];
                        if (Array.isArray(candidates)) {
                            if (remove_candidate(candidates, num_to_remove)) marked = true;
                        }
                    }
                }
            }
        }
    }
    
    return marked;
}

function count_visible(sequence) {
    let maxHeight = 0;
    let visible = 0;
    for (const val of sequence) {
        if (val > maxHeight) {
            maxHeight = val;
            visible++;
        }
    }
    return visible;
}

// 添加标记外部提示数的功能
export function mark_outer_clues_skyscraper(size) {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    const get_value = (row, col) => {
        const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
        const val = parseInt(input?.value ?? '', 10);
        return Number.isFinite(val) ? val : 0;
    };

    const set_clue = (row, col, value) => {
        const input = grid.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
        if (input && !input.value) {
            input.value = value;
        }
    };

    const interior_size = size;
    for (let col = 1; col <= interior_size; col++) {
        const column_values = Array.from({ length: interior_size }, (_, idx) => get_value(idx + 1, col));
        if (column_values.every(val => val > 0)) {
            set_clue(0, col, count_visible(column_values));
            set_clue(interior_size + 1, col, count_visible([...column_values].reverse()));
        }
    }

    for (let row = 1; row <= interior_size; row++) {
        const row_values = Array.from({ length: interior_size }, (_, idx) => get_value(row, idx + 1));
        if (row_values.every(val => val > 0)) {
            set_clue(row, 0, count_visible(row_values));
            set_clue(row, interior_size + 1, count_visible([...row_values].reverse()));
        }
    }
}

function segment_has_valid_visible(segment, clue, size) {
    // 若没有提示则视为可行
    if (clue <= 0) return true;

    // 规范化：固定数保留；候选去重并限制在 1..size；空位默认 1..size
    const normalized = segment.map(cell => {
        if (Array.isArray(cell)) {
            return [...new Set(cell.filter(n => Number.isInteger(n) && n >= 1 && n <= size))];
        }
        if (typeof cell === 'number' && cell > 0) return cell;
        return Array.from({ length: size }, (_, idx) => idx + 1);
    });

    // 回溯尝试所有候选组合，只要存在满足可见数的组合即通过
    const backtrack = (idx, acc) => {
        if (idx === normalized.length) return count_visible(acc) === clue;

        const cell = normalized[idx];
        if (Array.isArray(cell)) {
            if (cell.length === 0) return false;
            for (const cand of cell) {
                acc.push(cand);
                if (backtrack(idx + 1, acc)) return true;
                acc.pop();
            }
            return false;
        }

        acc.push(cell);
        const ok = backtrack(idx + 1, acc);
        acc.pop();
        return ok;
    };

    return backtrack(0, []);
}
// // 验证摩天楼数独的合法性，检测候选数
// export function is_valid_skyscraper(board, size, row, col, num) {
//     const mode = state.current_mode || 'skyscraper';
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

//     const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

//     const clues = state.clues_board;
//     const hasCluesBoard = Array.isArray(clues) && clues.length === size + 2;
//     const parse_clue = (r, c) => {
//         if (!hasCluesBoard) return 0;
//         const v = clues[r]?.[c];
//         return (typeof v === 'number' && v > 0) ? v : 0;
//     };

//     const left_clue = parse_clue(row + 1, 0);
//     const right_clue = parse_clue(row + 1, size + 1);
//     const top_clue = parse_clue(0, col + 1);
//     const bottom_clue = parse_clue(size + 1, col + 1);

//     // 行方向：若行内已出现 size，则尝试所有未定格的组合
//     const pos_size_in_row = temp_board[row].findIndex(v => v === size);
//     if (left_clue > 0 && pos_size_in_row !== -1) {
//         const segment = temp_board[row].slice(0, pos_size_in_row + 1);
//         if (!segment_has_valid_visible(segment, left_clue, size)) return false;
//     }
//     if (right_clue > 0 && pos_size_in_row !== -1) {
//         const segment = temp_board[row].slice(pos_size_in_row).reverse();
//         if (!segment_has_valid_visible(segment, right_clue, size)) return false;
//     }

//     // 列方向：同理
//     const col_values = temp_board.map(r => r[col]);
//     const pos_size_in_col = col_values.findIndex(v => v === size);
//     if (top_clue > 0 && pos_size_in_col !== -1) {
//         const segment = col_values.slice(0, pos_size_in_col + 1);
//         if (!segment_has_valid_visible(segment, top_clue, size)) return false;
//     }
//     if (bottom_clue > 0 && pos_size_in_col !== -1) {
//         const segment = col_values.slice(pos_size_in_col).reverse();
//         if (!segment_has_valid_visible(segment, bottom_clue, size)) return false;
//     }

//     return true;
// }
// 验证摩天楼数独的合法性，不检测候选数
export function is_valid_skyscraper(board, size, row, col, num) {
    const mode = state.current_mode || 'skyscraper';
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

    // 将当前格视为已填入 num（不修改原 board）
    const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

    // 从 state.clues_board 读取外部提示（state.clues_board 的尺寸应为 size+2）
    const clues = state.clues_board;
    const hasCluesBoard = Array.isArray(clues) && clues.length === size + 2;

    const parse_clue = (r, c) => {
        if (!hasCluesBoard) return 0;
        const v = clues[r]?.[c];
        return (typeof v === 'number' && v > 0) ? v : 0;
    };

    const left_clue = parse_clue(row + 1, 0);
    const right_clue = parse_clue(row + 1, size + 1);
    const top_clue = parse_clue(0, col + 1);
    const bottom_clue = parse_clue(size + 1, col + 1);

    // 行方向：只在该行包含 size 的子段变为完整时才校验
    const pos_size_in_row = temp_board[row].findIndex(v => v === size);
    if (left_clue > 0 && pos_size_in_row !== -1) {
        const segment = temp_board[row].slice(0, pos_size_in_row + 1);
        const is_segment_complete = segment.every(v => typeof v === 'number' && v > 0);
        if (is_segment_complete) {
            if (count_visible(segment) !== left_clue) return false;
        }
    }
    if (right_clue > 0 && pos_size_in_row !== -1) {
        const segment = temp_board[row].slice(pos_size_in_row);
        const is_segment_complete = segment.every(v => typeof v === 'number' && v > 0);
        if (is_segment_complete) {
            if (count_visible([...segment].reverse()) !== right_clue) return false;
        }
    }

    // 列方向：同样只在该列包含 size 的子段变为完整时才校验
    const col_values = temp_board.map(r => r[col]);
    const pos_size_in_col = col_values.findIndex(v => v === size);
    if (top_clue > 0 && pos_size_in_col !== -1) {
        const segment = col_values.slice(0, pos_size_in_col + 1);
        const is_segment_complete = segment.every(v => typeof v === 'number' && v > 0);
        if (is_segment_complete) {
            if (count_visible(segment) !== top_clue) return false;
        }
    }
    if (bottom_clue > 0 && pos_size_in_col !== -1) {
        const segment = col_values.slice(pos_size_in_col);
        const is_segment_complete = segment.every(v => typeof v === 'number' && v > 0);
        if (is_segment_complete) {
            if (count_visible([...segment].reverse()) !== bottom_clue) return false;
        }
    }

    return true;
}