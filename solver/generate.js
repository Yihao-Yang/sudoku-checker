import { solve, isValid, eliminate_candidates } from './solver_tool.js';
import { log_process,backup_original_board,show_result, restore_original_board, clear_all_inputs} from '../modules/core.js';
import { state } from '../modules/state.js';
import { isValid_exclusion } from '../modules/exclusion.js';
// import { isValid_multi_diagonal } from '../modules/multi_diagonal.js';
// import { isValid_diagonal } from '../modules/diagonal.js';


// 自动生成标准数独题目
export function generate_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    // 清除之前的结果
    clear_all_inputs();
    log_process('', true);

    let puzzle, solution, result, holesDug, symmetry;

    // 根据分值下限自动设置难度
    let difficulty = 'easy';
    if (size === 6) {
        if (score_lower_limit >= 40) difficulty = 'hard';
        else if (score_lower_limit >= 20) difficulty = 'medium';
        else difficulty = 'easy';
    } else if (size === 9) {
        if (score_lower_limit >= 200) difficulty = 'hard';
        else if (score_lower_limit >= 100) difficulty = 'medium';
        else difficulty = 'easy';
    }

    // 尝试次数限制
    let try_count = 0;
    const MAX_TRY = 20;
    while (true) {
        try_count++;
        if (try_count > MAX_TRY) {
            log_process(`尝试${MAX_TRY}次仍未生成符合条件的题目，已中止。`);
            show_result(`生成失败，请降低分值下限或调整参数后重试。`);
            return null;
        }
        // 1. 生成终盘
        solution = generate_solution(size);

        // 2. 随机选择对称模式并挖洞
        symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
        // symmetry = 'none';
        puzzle = dig_holes(solution, size, 0, symmetry, holes_count);

        // 计算实际挖洞数
        holesDug = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (puzzle[i][j] === 0) holesDug++;
            }
        }

        // 4. 验证题目唯一性并显示技巧统计
        const testBoard = puzzle.map(row => 
            row.map(cell => cell === 0 ? 
                [...Array(size)].map((_, n) => n + 1) : cell
            )
        );
        // let is_valid_func;
        // if (state.current_mode === 'multi_diagonal') {
        //     is_valid_func = isValid_multi_diagonal;
        // } else if (state.current_mode === 'diagonal') {
        //     is_valid_func = isValid_diagonal;
        // } else {
        //     is_valid_func = isValid;
        // }
        result = solve(testBoard, size, isValid, true);

        // 老分值判断（包含用户输入的下限）
        if (state.solve_stats.total_score < score_lower_limit) {
            log_process(`题目分值为${state.solve_stats.total_score}，低于下限${score_lower_limit}，重新生成...`);
            continue;
        }
        // // 新分值判断（包含用户输入的下限）
        // if (state.total_score_sum < score_lower_limit) {
        //     log_process(`题目分值为${state.total_score_sum}，低于下限${score_lower_limit}，重新生成...`);
        //     continue;
        // }
        break;
    }

    log_process(`${size}宫格${difficulty}难度数独生成成功，提示数: ${size*size-holesDug}，对称模式: ${symmetry}`);
    // log_process(`生成${size}宫格数独，提示数: ${size*size-holesDug}，对称模式: ${symmetry}`);

    // 3. 填充到网格
    const container = document.querySelector('.sudoku-container');
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            input.value = puzzle[i][j] || '';
        }
    }

    backup_original_board();
    show_result(`已生成${size}宫格数独题目`);

    if (result.technique_counts) {
        log_process("\n=== 技巧使用统计 ===");
        for (const [technique, count] of Object.entries(result.technique_counts)) {
            if (count > 0) {
                log_process(`${technique}: ${count}次`);
            }
        }
        if (state.solve_stats.total_score !== undefined) {
            log_process(`总分值: ${state.solve_stats.total_score}`);
        }
    }

    log_process(`新的总分值: ${state.total_score_sum}`);

    return {
        puzzle: puzzle,
        solution: solution
    };
}

// // 获取当前盘面已有数字
// function get_existing_numbers(size) {
//     const container = document.querySelector('.sudoku-container');
//     const existing = [];
//     for (let i = 0; i < size; i++) {
//         existing[i] = [];
//         for (let j = 0; j < size; j++) {
//             const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
//             const val = parseInt(input.value);
//             existing[i][j] = (val && val > 0 && val <= size) ? val : 0;
//         }
//     }
//     return existing;
// }

// // 生成完整数独终盘
// export function generate_solution(sudoku_size, existing_numbers = null) {
//     // 初始化为候选数数组
//     const sudoku_board = Array.from({ length: sudoku_size }, () =>
//         Array.from({ length: sudoku_size }, () => [...Array(sudoku_size)].map((_, i) => i + 1))
//     );
//     // log_process(`初始化候选数盘面: \n${sudoku_board.map(r => r.map(cell => cell.join('/')).join(' ')).join('\n')}`);
//     // 主动给数的记录
//     let given_numbers = [];
//     // 如果有已有数字，直接填入
//     if (existing_numbers) {
//         for (let r = 0; r < sudoku_size; r++) {
//             for (let c = 0; c < sudoku_size; c++) {
//                 if (existing_numbers[r][c]) {
//                     // sudoku_board[r][c] = [existing_numbers[r][c]];
//                     given_numbers.push({ row: r, col: c, num: existing_numbers[r][c] });
//                 }
//             }
//         }
//     }
//     // log_process(`填入已有数字后的盘面: \n${sudoku_board.map(r => r.map(cell => Array.isArray(cell) ? cell.join('/') : cell).join(' ')).join('\n')}`);
//     let max_attempts = 10000;
//     let attempt_count = 0;

//     // 生成所有格子的坐标并打乱
//     const cell_positions = [];
//     for (let r = 0; r < sudoku_size; r++) {
//         for (let c = 0; c < sudoku_size; c++) {
//             cell_positions.push([r, c]);
//         }
//     }
//     shuffle(cell_positions);

    
//     let best_score = -1;
//     let second_best_score = -1;
//     let second_best_solution = null;
//     let second_best_given_numbers = null;
//     let found_valid = false;

//     // 唯一解检测
//     const test_board = Array.from({ length: sudoku_size }, (_, r) =>
//         Array.from({ length: sudoku_size }, (_, c) => {
//             const found = given_numbers.find(item => item.row === r && item.col === c);
//             return found ? found.num : 0;
//         })
//     );
//     const result = solve(
//         test_board.map(r => r.map(cell => cell === 0 ? [...Array(sudoku_size)].map((_, n) => n + 1) : cell)),
//         sudoku_size,
//         isValid,
//         true
//     );
//     if (state.solve_stats.total_score >= best_score) {
//         log_process(`当前分值: ${state.solve_stats.total_score} >= ${best_score}`);
//         best_score = state.solve_stats.total_score;
//     }

//     function backtrack(cell_index = 0) {
//         if (++attempt_count > max_attempts) return false;
//         // log_process(`回溯尝试次数: ${attempt_count}`);
//         if (cell_index >= cell_positions.length) return true; // 填满
//         // log_process(`当前处理格子索引: ${cell_index}，位置: [${cell_positions[cell_index][0]+1},${cell_positions[cell_index][1]+1}]`);

//         const [row, col] = cell_positions[cell_index];
//         // log_process(`当前格子候选数: ${Array.isArray(sudoku_board[row][col]) ? sudoku_board[row][col].join(',') : sudoku_board[row][col]}`);
//         if (Array.isArray(sudoku_board[row][col]) && sudoku_board[row][col].length > 1) {
//             const candidates = shuffle([...sudoku_board[row][col]]);
//             // log_process(`打乱后的候选数顺序: ${candidates.join(',')}`);
//             found_valid = false;
            
//             for (const num of candidates) {
//                 if (isValid(sudoku_board, sudoku_size, row, col, num)) {
//                     backup_original_board();
//                     sudoku_board[row][col] = [num];
//                     log_process(`尝试在 [${row+1},${col+1}] 填入 ${num}`);

//                     // 记录主动给数
//                     given_numbers.push({ row, col, num });
//                     log_process(`当前主动给数: ${given_numbers.map(item => `[${item.row+1},${item.col+1}]=${item.num}`).join(' ')}`);

//                     // 构造只包含主动给数的盘面
//                     const test_board = Array.from({ length: sudoku_size }, (_, r) =>
//                         Array.from({ length: sudoku_size }, (_, c) => {
//                             const found = given_numbers.find(item => item.row === r && item.col === c);
//                             return found ? found.num : 0;
//                         })
//                     );

//                     // 唯一解检测
//                     const result = solve(
//                         test_board.map(r => r.map(cell => cell === 0 ? [...Array(sudoku_size)].map((_, n) => n + 1) : cell)),
//                         sudoku_size,
//                         isValid,
//                         true
//                     );

//                     if (result.solution_count === 0 || result.solution_count === -2) {
//                         restore_original_board();
//                         sudoku_board[row][col] = candidates;
//                         given_numbers.pop();
//                         continue;
//                     }

//                     if (state.solve_stats.total_score >= best_score) {
//                         log_process(`当前分值: ${state.solve_stats.total_score} >= ${best_score}，采用此方案`);
//                         best_score = state.solve_stats.total_score;
                        
//                         if (result.solution_count === 1) {
//                             // 找到唯一解，直接填充整个棋盘
//                             for (let i = 0; i < sudoku_size; i++) {
//                                 for (let j = 0; j < sudoku_size; j++) {
//                                     sudoku_board[i][j] = [result.solution[i][j]];
//                                 }
//                             }
//                             return true;
//                         } else {
//                             // 更新逻辑解
//                             if (state.logical_solution) {
//                                 for (let i = 0; i < sudoku_size; i++) {
//                                     for (let j = 0; j < sudoku_size; j++) {
//                                         if (Array.isArray(state.logical_solution[i][j])) {
//                                             sudoku_board[i][j] = [...state.logical_solution[i][j]];
//                                         } else {
//                                             sudoku_board[i][j] = state.logical_solution[i][j];
//                                         }
//                                     }
//                                 }
//                             }
                            
//                             found_valid = true;
//                             if (backtrack(cell_index + 1)) return true;
                            
//                             // 回溯失败，恢复状态
//                             restore_original_board();
//                             sudoku_board[row][col] = candidates;
//                             given_numbers.pop();
//                         }
//                     } else {
//                         log_process(`当前分值: ${state.solve_stats.total_score} < ${best_score}，记录为备选方案`);
//                         // 记录备选方案
//                         if (state.solve_stats.total_score > second_best_score) {
//                             second_best_score = state.solve_stats.total_score;
                            
//                             if (result.solution_count === 1) {
//                                 second_best_solution = [];
//                                 for (let i = 0; i < sudoku_size; i++) {
//                                     second_best_solution[i] = [];
//                                     for (let j = 0; j < sudoku_size; j++) {
//                                         second_best_solution[i][j] = result.solution[i][j];
//                                     }
//                                 }
//                                 second_best_given_numbers = [...given_numbers];
//                             } else if (state.logical_solution) {
//                                 second_best_solution = [];
//                                 for (let i = 0; i < sudoku_size; i++) {
//                                     second_best_solution[i] = [];
//                                     for (let j = 0; j < sudoku_size; j++) {
//                                         if (Array.isArray(state.logical_solution[i][j])) {
//                                             second_best_solution[i][j] = [...state.logical_solution[i][j]];
//                                         } else {
//                                             second_best_solution[i][j] = state.logical_solution[i][j];
//                                         }
//                                     }
//                                 }
//                                 second_best_given_numbers = [...given_numbers];
//                             }
//                         }
                        
//                         restore_original_board();
//                         sudoku_board[row][col] = candidates;
//                         given_numbers.pop();
//                         // return backtrack(cell_index + 1);
//                     }
//                 }
//             }

//             return backtrack(cell_index + 1);
//             // 如果所有候选数都尝试过但没有找到更好的解，检查是否有备选方案
//             if (!found_valid && second_best_solution) {
//                 log_process(`所有尝试均未超过最高分值${best_score}，采用备选方案，分值: ${second_best_score}`);
//                 best_score = second_best_score;
                
//                 // 应用备选方案
//                 second_best_solution.forEach((row, i) => {
//                     row.forEach((value, j) => {
//                         sudoku_board[i][j] = [value];
//                     });
//                 });
                
//                 // 恢复主动给数
//                 given_numbers = [...second_best_given_numbers];
//                 log_process(`备选方案的主动给数: ${given_numbers.map(item => `[${item.row+1},${item.col+1}]=${item.num}`).join(' ')}`);
                
//                 // 重置备选方案记录
//                 second_best_solution = null;
//                 second_best_score = -1;
//                 second_best_given_numbers = null;
                
//                 // 继续回溯
//                 return backtrack(cell_index + 1);
//             }
            
//             return false;
//         } else {
//             // 已确定，递归下一个
//             return backtrack(cell_index + 1);
//         }
//     }

//     backtrack();

//     // 如果所有候选数都尝试过但没有找到更好的解，检查是否有备选方案
//     while (!found_valid && second_best_solution) {
//         log_process(`所有尝试均未超过最高分值${best_score}，采用备选方案，分值: ${second_best_score}`);
//         best_score = second_best_score;

//         // 应用备选方案（仿照逻辑解赋值方式）
//         for (let i = 0; i < sudoku_size; i++) {
//             for (let j = 0; j < sudoku_size; j++) {
//                 if (Array.isArray(second_best_solution[i][j])) {
//                     sudoku_board[i][j] = [...second_best_solution[i][j]];
//                 } else {
//                     sudoku_board[i][j] = second_best_solution[i][j];
//                 }
//             }
//         }
        
//         // 恢复主动给数
//         given_numbers = [...second_best_given_numbers];
//         // log_process(`备选方案的主动给数: ${given_numbers.map(item => `[${item.row+1},${item.col+1}]=${item.num}`).join(' ')}`);
        
//         // 重置备选方案记录
//         second_best_solution = null;
//         second_best_score = -1;
//         second_best_given_numbers = null;
        
//         // 继续回溯
//         found_valid = false;
//         backtrack(0);
//     }
    
//     // 只返回主动给数的盘面
//     const result_board = Array.from({ length: sudoku_size }, (_, r) =>
//         Array.from({ length: sudoku_size }, (_, c) => {
//             const found = given_numbers.find(item => item.row === r && item.col === c);
//             return found ? found.num : 0;
//         })
//     );
//     return result_board;
// }

// 生成数独终盘（直接使用回溯法生成）
export function generate_solution(size) {
    
    const board = Array.from({ length: size }, () => 
        Array.from({ length: size }, () => 0)
    );
    let max_try = 100000;
    let try_count = 0;
    // 判断当前模式，选择不同的有效性检测函数
    let valid_func = isValid;
    if (state.current_mode === 'exclusion') {
        valid_func = isValid_exclusion;
    }
    // 回溯填充数字
    function backtrack() {
        if (++try_count > max_try) return false;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === 0) {
                    const nums = shuffle([...Array(size)].map((_, i) => i + 1));
                    
                    for (const num of nums) {
                        if (valid_func(board, size, row, col, num)) {
                            board[row][col] = num;
                            
                            if (backtrack()) {
                                return true;
                            }
                            
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    backtrack();
    return board; // 全部填完返回终盘
}

// 挖洞，返回题目盘
function dig_holes(solution, size, _, symmetry = 'none', holes_limit = undefined) {
    const puzzle = solution.map(row => [...row]);
    let holes_dug = 0;
    let changed;

    do {
        if (holes_limit !== undefined && holes_dug >= holes_limit) break; // 挖洞数量达到上限，停止
        
        changed = false;
        let best_score = -1;
        let best_candidates = []; // 用于存储所有最高分方案
    
        // 遍历所有可挖位置，寻找分值最高的方案
        for (let pos = 0; pos < size * size; pos++) {
            let row = Math.floor(pos / size);
            let col = pos % size;
            if (puzzle[row][col] === 0) continue;

            // // 检查行、列、宫是否已挖满4个洞
            // const { row_holes, col_holes, block_holes } = count_holes(puzzle, size, row, col);
            // if (row_holes >= 5 || col_holes >= 5 || block_holes >= 5) continue;

    
            // 获取对称位置
            const symmetric_positions = get_symmetric_positions(row, col, size, symmetry);
            const positions_to_dig = [ [row, col], ...symmetric_positions ];
    
            // 跳过已挖过的格子
            if (positions_to_dig.some(([r, c]) => puzzle[r][c] === 0)) continue;
    
            // 临时保存所有位置的数字
            const temp_values = positions_to_dig.map(([r, c]) => puzzle[r][c]);
    
            // 预挖洞
            positions_to_dig.forEach(([r, c]) => puzzle[r][c] = 0);
    
            // 验证唯一解并计算分值
            const test_board = puzzle.map(row =>
                row.map(cell => cell === 0
                    ? [...Array(size)].map((_, n) => n + 1)
                    : cell
                )
            );

            solve(test_board, size, isValid, true);
    
            // 仅考虑唯一解的情况，老分值系统
            if (state.solve_stats.solution_count === 1 && state.solve_stats.total_score !== undefined) {
                if (state.solve_stats.total_score > best_score) {
                    best_score = state.solve_stats.total_score;
                    best_candidates = [{
                        positions: positions_to_dig.map(([r, c]) => [r, c]),
                        temp_values: [...temp_values]
                    }];
                } else if (state.solve_stats.total_score === best_score) {
                    best_candidates.push({
                        positions: positions_to_dig.map(([r, c]) => [r, c]),
                        temp_values: [...temp_values]
                    });
                }
            }

            // // 仅考虑唯一解的情况，新分值系统
            // if (state.solve_stats.solution_count === 1 && state.total_score_sum !== undefined) {
            //     if (state.total_score_sum > best_score) {
            //         best_score = state.total_score_sum;
            //         best_candidates = [{
            //             positions: positions_to_dig.map(([r, c]) => [r, c]),
            //             temp_values: [...temp_values]
            //         }];
            //     } else if (state.total_score_sum === best_score) {
            //         best_candidates.push({
            //             positions: positions_to_dig.map(([r, c]) => [r, c]),
            //             temp_values: [...temp_values]
            //         });
            //     }
            // }
    
            // 恢复数字
            positions_to_dig.forEach(([r, c], idx) => puzzle[r][c] = temp_values[idx]);
        }
    
        // 如果本轮有最优挖洞方案，则随机选择一个实际挖洞
        if (best_candidates.length > 0) {
            const chosen = best_candidates[Math.floor(Math.random() * best_candidates.length)];
            // 对称组大小
            const group_size = chosen.positions.length;
            // 如果剩余可挖洞数量小于对称组大小，则不挖，直接结束
            if (holes_limit !== undefined && holes_dug + group_size > holes_limit) {
                break;
            }
            chosen.positions.forEach(([r, c]) => puzzle[r][c] = 0);
            holes_dug += group_size;
            changed = group_size > 0;
            log_process(`挖洞位置: ${chosen.positions.map(([r, c]) => `[${r+1},${c+1}]`).join(' ')}，当前已挖洞数: ${holes_dug}`);
        }
    } while (changed && (holes_limit === undefined || holes_dug < holes_limit));

    return puzzle;
}

// 获取对称位置
export function get_symmetric_positions(row, col, size, symmetry) {
    const positions = [];
    const center = (size - 1) / 2;
    
    switch(symmetry) {
        case 'horizontal':
            if (row !== size - 1 - row) {
                positions.push([size - 1 - row, col]);
            }
            break;
        case 'vertical':
            if (col !== size - 1 - col) {
                positions.push([row, size - 1 - col]);
            }
            break;
        case 'central':
            if (row !== size - 1 - row || col !== size - 1 - col) {
                positions.push([size - 1 - row, size - 1 - col]);
            }
            break;
        case 'diagonal':
            if (row !== col) {
                positions.push([col, row]);
            }
            break;
        case 'anti-diagonal':
            if (row + col !== size - 1) {
                positions.push([size - 1 - col, size - 1 - row]);
            }
            break;
        case 'none':
            // 不对称模式，不添加任何对称位置
            break;
    }
    
    return positions;
}

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}



// const SYMMETRY_TYPES = ['horizontal', 'vertical', 'central', 'diagonal', 'anti-diagonal', 'none'];

// 中心对称概率最高，其次对角线/反对角线，再其次水平/垂直，最后不对称
const SYMMETRY_TYPES = [
    'central','central','central','central','central',
    'diagonal','diagonal',
    'anti-diagonal','anti-diagonal',
    'horizontal',
    'vertical',
    // 'none'
];

/**
 * 将生成的题目填充到网格
 */
export function fill_puzzle_to_grid(puzzle) {
    const container = document.querySelector('.sudoku-container');
    const size = puzzle.length;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            input.value = puzzle[i][j] || '';
            // input.readOnly = puzzle[i][j] !== 0;
        }
    }
    
    backup_original_board();
    show_result(`已生成${size}宫格数独题目`);
}