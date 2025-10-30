import { solve, isValid, eliminate_candidates, get_all_regions } from './solver_tool.js';
import { log_process,backup_original_board,show_result, restore_original_board, clear_all_inputs} from '../modules/core.js';
import { state } from '../modules/state.js';
import { is_valid_exclusion } from '../modules/exclusion.js';
import { is_valid_quadruple } from '../modules/quadruple.js';
// import { isValid_multi_diagonal } from '../modules/multi_diagonal.js';
// import { isValid_diagonal } from '../modules/diagonal.js';


// 自动生成标准数独题目
export function generate_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    // 记录开始时间
    const startTime = performance.now();
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
    const existing_numbers = null;
    while (true) {
        try_count++;
        if (try_count > MAX_TRY) {
            log_process(`尝试${MAX_TRY}次仍未生成符合条件的题目，已中止。`);
            show_result(`生成失败，请降低分值下限或调整参数后重试。`);
            return null;
        }

        // 2. 随机选择对称模式并挖洞
        symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
        // 1. 生成终盘
        solution = generate_solution(size, existing_numbers, symmetry);
        // symmetry = 'none';
        // puzzle = solution;
        puzzle = dig_holes(solution, size, 0, symmetry, holes_count);

        // 计算实际挖洞数
        holesDug = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (puzzle[i][j] === 0) holesDug++;
            }
        }

        // // 4. 验证题目唯一性并显示技巧统计
        // const testBoard = puzzle.map(row => 
        //     row.map(cell => cell === 0 ? 
        //         [...Array(size)].map((_, n) => n + 1) : cell
        //     )
        // );
        let test_board;
        if (state.current_mode === 'X_sums') {
            // X和模式，去掉边界
            test_board = Array.from({ length: size + 2 }, (_, i) =>
                Array.from({ length: size + 2 }, (_, j) => {
                    if (i === 0 || i === size + 1 || j === 0 || j === size + 1) {
                        return 0; // 边界填充为 0
                    }
                    const cell = puzzle[i - 1][j - 1];
                    return cell === 0
                        ? [...Array(size)].map((_, n) => n + 1)
                        : cell;
                })
            );
        } else {
            test_board = puzzle.map(row =>
                row.map(cell => cell === 0
                    ? [...Array(size)].map((_, n) => n + 1)
                    : cell
                )
            );
        }

        // let is_valid_func;
        // if (state.current_mode === 'multi_diagonal') {
        //     is_valid_func = isValid_multi_diagonal;
        // } else if (state.current_mode === 'diagonal') {
        //     is_valid_func = isValid_diagonal;
        // } else {
        //     is_valid_func = isValid;
        // }
        result = solve(test_board, size, isValid, true);

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

    // if (state.current_mode === 'X_sums') {
    //     // X_sums模式，跳过边界
    //     for (let i = 1; i <= size; i++) {
    //         for (let j = 1; j <= size; j++) {
    //             const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
    //             input.value = puzzle[i - 1][j - 1] || '';
    //         }
    //     }
    // } else {
        // 默认模式
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                input.value = puzzle[i][j] || '';
            }
        }
    // }

    // 记录结束时间
    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(3); // 秒，保留三位小数

    backup_original_board();
    show_result(`已生成${size}宫格数独题目（不加标记部分用时${elapsed}秒）`);

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

// 生成完整数独终盘
export function generate_solution(sudoku_size, existing_numbers = null, symmetry = 'none') {
    // 对于hashtag模式，使用旧的生成方法
    if (state.current_mode !== 'classic') {
        // log_process("直接生成终盘")
        return generate_solution_old(sudoku_size);
    }

    // 初始化为候选数数组
    let sudoku_board;
    if (state.current_mode === 'X_sums') {
        // X和模式，去掉边界
        // sudoku_board = Array.from({ length: sudoku_size + 2 }, () =>
        //     Array.from({ length: sudoku_size + 2 }, () => [...Array(sudoku_size)].map((_, i) => i + 1))
        //     // Array.from({ length: sudoku_size + 2 }, (_, j) => {
        //     //     if (i === 0 || i === sudoku_size + 1 || j === 0 || j === sudoku_size + 1) {
        //     //         return 0; // 边界填充为 0
        //     //     }
        //     //     return [...Array(sudoku_size)].map((_, i) => i + 1);
        //     // })
        // );

        sudoku_board = Array.from({ length: sudoku_size + 2 }, (_, i) =>
            Array.from({ length: sudoku_size + 2 }, (_, j) => {
                if (i === 0 || i === sudoku_size + 1 || j === 0 || j === sudoku_size + 1) {
                    return 0; // 边界填充为 0
                }
                return [...Array(sudoku_size)].map((_, n) => n + 1); // 中间部分填充候选数
            })
        );
        
        // // X和模式，去掉边界 - 只处理内部盘面
        // sudoku_board = Array.from({ length: sudoku_size }, () =>
        //     Array.from({ length: sudoku_size }, () => [...Array(sudoku_size)].map((_, i) => i + 1))
        // );

    } else {
        sudoku_board = Array.from({ length: sudoku_size }, () =>
            Array.from({ length: sudoku_size }, () => [...Array(sudoku_size)].map((_, i) => i + 1))
        );
    }
    // log_process(`初始化候选数盘面: \n${sudoku_board.map(r => r.map(cell => cell.join('/')).join(' ')).join('\n')}`);
    // 主动给数的记录
    let given_numbers = [];
    // 如果有已有数字，直接填入
    if (existing_numbers) {
        for (let r = 0; r < sudoku_size; r++) {
            for (let c = 0; c < sudoku_size; c++) {
                if (existing_numbers[r][c]) {
                    // sudoku_board[r][c] = [existing_numbers[r][c]];
                    given_numbers.push({ row: r, col: c, num: existing_numbers[r][c] });
                }
            }
        }
    }
    // log_process(`填入已有数字后的盘面: \n${sudoku_board.map(r => r.map(cell => Array.isArray(cell) ? cell.join('/') : cell).join(' ')).join('\n')}`);
    let max_attempts = 10000;
    let attempt_count = 0;

    // 生成所有格子的坐标并打乱
    const cell_positions = [];
    for (let r = 0; r < sudoku_size; r++) {
        for (let c = 0; c < sudoku_size; c++) {
            cell_positions.push([r, c]);
        }
    }
    shuffle(cell_positions);

    
    let best_score = -1;
    let second_best_score = -1;
    let second_best_solution = null;
    let second_best_given_numbers = null;
    let found_valid = false;
    let second_best_count = 0; // 新增：备选方案计数变量
    const MAX_SECOND_BEST = 20; // 新增：备选方案最大数量

    // 唯一解检测
    let test_board;
    if (state.current_mode === 'X_sums') {
        test_board = Array.from({ length: sudoku_size + 2 }, (_, r) =>
            Array.from({ length: sudoku_size + 2 }, (_, c) => {
                const found = given_numbers.find(item => item.row === r && item.col === c);
                return found ? found.num : 0;
            })
        );
    } else {
        test_board = Array.from({ length: sudoku_size }, (_, r) =>
            Array.from({ length: sudoku_size }, (_, c) => {
                const found = given_numbers.find(item => item.row === r && item.col === c);
                return found ? found.num : 0;
            })
        );
    }
    const result = solve(
        test_board.map(r => r.map(cell => cell === 0 ? [...Array(sudoku_size)].map((_, n) => n + 1) : cell)),
        sudoku_size,
        isValid,
        true
    );
    // 用逻辑解更新候选数
    if (result.solution_count === 1) {
        // 找到唯一解，直接填充整个棋盘
        for (let i = 0; i < sudoku_size; i++) {
            for (let j = 0; j < sudoku_size; j++) {
                sudoku_board[i][j] = [result.solution[i][j]];
            }
        }
        return sudoku_board.map(row => row.map(cell => Array.isArray(cell) ? cell[0] : cell));
    } else {
        // 更新逻辑解
        if (state.logical_solution) {
            for (let i = 0; i < sudoku_size; i++) {
                for (let j = 0; j < sudoku_size; j++) {
                    if (Array.isArray(state.logical_solution[i][j])) {
                        sudoku_board[i][j] = [...state.logical_solution[i][j]];
                    } else {
                        sudoku_board[i][j] = state.logical_solution[i][j];
                    }
                }
            }
        }
    }

    if (state.solve_stats.total_score >= best_score) {
        // log_process(`当前分值: ${state.solve_stats.total_score} >= ${best_score}`);
        best_score = state.solve_stats.total_score;
    }

    function backtrack(cell_index = 0) {
        if (++attempt_count > max_attempts) return false;
        if (cell_index >= cell_positions.length) return true;

        const [row, col] = cell_positions[cell_index];

        // 获取对称位置（以中心对称为例，可根据需要调整 symmetry）
        // const symmetry = 'central';
        const symmetric_positions = get_symmetric_positions(row, col, sudoku_size, symmetry);
        let sym_row = row, sym_col = col;
        if (symmetric_positions.length > 0) {
            [sym_row, sym_col] = symmetric_positions[0];
        }

        // 跳过：只有当本格和对称格都已填定时才跳过
        if (symmetric_positions.length > 0) {
            [sym_row, sym_col] = symmetric_positions[0];
        }
        if (
            (!Array.isArray(sudoku_board[row][col]) || sudoku_board[row][col].length === 1) &&
            (!Array.isArray(sudoku_board[sym_row][sym_col]) || sudoku_board[sym_row][sym_col].length === 1)
        ) {
            return backtrack(cell_index + 1);
        }

        // 获取两个格子的候选数
        let candidates1, candidates2;
        if (!Array.isArray(sudoku_board[row][col]) || sudoku_board[row][col].length === 1) {
            // 本格已填定
            const filledNum = Array.isArray(sudoku_board[row][col])
                ? sudoku_board[row][col][0]
                : sudoku_board[row][col];
            candidates1 = [filledNum];
        } else {
            candidates1 = shuffle([...sudoku_board[row][col]]);
        }
        if (!Array.isArray(sudoku_board[sym_row][sym_col]) || sudoku_board[sym_row][sym_col].length === 1) {
            // 对称格已填定
            const filledNum = Array.isArray(sudoku_board[sym_row][sym_col])
                ? sudoku_board[sym_row][sym_col][0]
                : sudoku_board[sym_row][sym_col];
            candidates2 = [filledNum];
        } else {
            candidates2 = shuffle([...sudoku_board[sym_row][sym_col]]);
        }

        found_valid = false;

        for (const num1 of candidates1) {
            for (const num2 of candidates2) {
                // 如果是同一个格子（中心格），只填一次
                if (row === sym_row && col === sym_col && num1 !== num2) continue;
                if (!isValid(sudoku_board, sudoku_size, row, col, num1)) continue;
                if (!(row === sym_row && col === sym_col) && !isValid(sudoku_board, sudoku_size, sym_row, sym_col, num2)) continue;

                backup_original_board();
                sudoku_board[row][col] = [num1];
                if (!(row === sym_row && col === sym_col)) {
                    sudoku_board[sym_row][sym_col] = [num2];
                }
                given_numbers.push({ row, col, num: num1 });
                if (!(row === sym_row && col === sym_col)) {
                    given_numbers.push({ row: sym_row, col: sym_col, num: num2 });
                }
                // log_process(`尝试在 [${row+1},${col+1}] 填入 ${num1}` + (row !== sym_row || col !== sym_col ? `，在 [${sym_row+1},${sym_col+1}] 填入 ${num2}` : ''));
                // log_process(`当前主动给数: ${given_numbers.map(item => `[${item.row+1},${item.col+1}]=${item.num}`).join(' ')}`);

                // 构造只包含主动给数的盘面
                if (state.current_mode === 'X_sums') {
                    test_board = Array.from({ length: sudoku_size + 2 }, (_, r) =>
                        Array.from({ length: sudoku_size + 2 }, (_, c) => {
                            const found = given_numbers.find(item => item.row === r && item.col === c);
                            return found ? found.num : 0;
                        })
                    );
                } else {
                    test_board = Array.from({ length: sudoku_size }, (_, r) =>
                        Array.from({ length: sudoku_size }, (_, c) => {
                            const found = given_numbers.find(item => item.row === r && item.col === c);
                            return found ? found.num : 0;
                        })
                    );
                }

                // 唯一解检测
                const result = solve(
                    test_board.map(r => r.map(cell => cell === 0 ? [...Array(sudoku_size)].map((_, n) => n + 1) : cell)),
                    sudoku_size,
                    isValid,
                    true
                );

                if (result.solution_count === 0 || result.solution_count === -2) {
                    restore_original_board();
                    sudoku_board[row][col] = candidates1;
                    if (!(row === sym_row && col === sym_col)) sudoku_board[sym_row][sym_col] = candidates2;
                    given_numbers.pop();
                    if (!(row === sym_row && col === sym_col)) given_numbers.pop();
                    continue;
                }

                if (state.solve_stats.total_score >= best_score) {
                    // log_process(`当前分值: ${state.solve_stats.total_score} >= ${best_score}，采用此方案`);
                    best_score = state.solve_stats.total_score;

                    if (result.solution_count === 1) {
                        for (let i = 0; i < sudoku_size; i++) {
                            for (let j = 0; j < sudoku_size; j++) {
                                sudoku_board[i][j] = [result.solution[i][j]];
                            }
                        }
                        return true;
                    } else {
                        if (state.logical_solution) {
                            for (let i = 0; i < sudoku_size; i++) {
                                for (let j = 0; j < sudoku_size; j++) {
                                    if (Array.isArray(state.logical_solution[i][j])) {
                                        sudoku_board[i][j] = [...state.logical_solution[i][j]];
                                    } else {
                                        sudoku_board[i][j] = state.logical_solution[i][j];
                                    }
                                }
                            }
                        }
                        second_best_solution = null;
                        second_best_score = -1;
                        second_best_given_numbers = null;
                        found_valid = true;
                        second_best_count = 0; // 重置计数
                        // 继续递归尝试下一个格子
                        if (backtrack(cell_index + 1)) return true;

                        // 回溯失败，恢复状态
                        restore_original_board();
                        sudoku_board[row][col] = candidates1;
                        if (!(row === sym_row && col === sym_col)) sudoku_board[sym_row][sym_col] = candidates2;
                        given_numbers.pop();
                        if (!(row === sym_row && col === sym_col)) given_numbers.pop();
                    }
                } else {
                    // log_process(`当前分值: ${state.solve_stats.total_score} < ${best_score}，记录为备选方案`);
                    // 新增：备选方案数量限制
                    second_best_count++; // 计数加一
                    if (second_best_count >= MAX_SECOND_BEST) {
                        return false; // 达到最大数量，直接跳出
                    }
                    if (state.solve_stats.total_score > second_best_score) {
                        second_best_score = state.solve_stats.total_score;
                        if (result.solution_count === 1) {
                            second_best_solution = [];
                            for (let i = 0; i < sudoku_size; i++) {
                                second_best_solution[i] = [];
                                for (let j = 0; j < sudoku_size; j++) {
                                    second_best_solution[i][j] = result.solution[i][j];
                                }
                            }
                            second_best_given_numbers = [...given_numbers];
                        } else if (state.logical_solution) {
                            second_best_solution = [];
                            for (let i = 0; i < sudoku_size; i++) {
                                second_best_solution[i] = [];
                                for (let j = 0; j < sudoku_size; j++) {
                                    if (Array.isArray(state.logical_solution[i][j])) {
                                        second_best_solution[i][j] = [...state.logical_solution[i][j]];
                                    } else {
                                        second_best_solution[i][j] = state.logical_solution[i][j];
                                    }
                                }
                            }
                            second_best_given_numbers = [...given_numbers];
                        }
                    }
                    restore_original_board();
                    sudoku_board[row][col] = candidates1;
                    if (!(row === sym_row && col === sym_col)) sudoku_board[sym_row][sym_col] = candidates2;
                    given_numbers.pop();
                    if (!(row === sym_row && col === sym_col)) given_numbers.pop();
                }
            }
        }

        return backtrack(cell_index + 1);
    }

    backtrack();

    let max_attempt = 20; // 最多尝试次数
    let attempt = 0;

    while (attempt < max_attempt) {
        attempt++;

        // 如果所有候选数都尝试过但没有找到更好的解，检查是否有备选方案
        if (!found_valid && second_best_solution) {
            // log_process(`所有尝试均未超过最高分值${best_score}，采用备选方案，分值: ${second_best_score}`);
            best_score = second_best_score;

            for (let i = 0; i < sudoku_size; i++) {
                for (let j = 0; j < sudoku_size; j++) {
                    if (Array.isArray(second_best_solution[i][j])) {
                        sudoku_board[i][j] = [...second_best_solution[i][j]];
                    } else {
                        sudoku_board[i][j] = second_best_solution[i][j];
                    }
                }
            }
            given_numbers = [...second_best_given_numbers];
            second_best_solution = null;
            second_best_score = -1;
            second_best_given_numbers = null;
            found_valid = false;
            second_best_count = 0; // 重置计数
            backtrack(0);
        }
    }

    const result_board = Array.from({ length: sudoku_size }, (_, r) =>
        Array.from({ length: sudoku_size }, (_, c) => {
            const found = given_numbers.find(item => item.row === r && item.col === c);
            return found ? found.num : 0;
        })
    );
    return result_board;
}

export function generate_solution_old(size) {
    const board = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0)
    );

    // 用于存储每次调用 eliminate_candidates 前的候选数状态
    const candidate_stack = [];

    // 获取所有区域（宫、行、列）
    const regions = get_all_regions(size, state.current_mode);

    // 检查某区域是否存在某个候选数只剩一格可填
    function check_unique_candidate_in_regions() {
        for (const region of regions) {
            const candidateCounts = Array.from({ length: size }, () => 0);
            const candidatePositions = Array.from({ length: size }, () => []);

            for (const [r, c] of region.cells) {
                if (board[r][c] === 0) {
                    const candidates = [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, r, c, n));
                    for (const candidate of candidates) {
                        candidateCounts[candidate - 1]++;
                        candidatePositions[candidate - 1].push([r, c]);
                    }
                }
            }

            for (let num = 0; num < size; num++) {
                if (candidateCounts[num] === 1) {
                    const [r, c] = candidatePositions[num][0];
                    board[r][c] = num + 1;
                    // log_process(`区域 ${region.type} ${region.index} 中数字 ${num + 1} 只能填在位置 [${r + 1}, ${c + 1}]`);
                    eliminate_candidates(board, size, r, c, num + 1);
                    return true; // 发现唯一候选数后立即返回
                }
            }
        }
        return false;
    }

    // 找到候选数最少的空格
    function find_best_cell() {
        let best_cell = null;

        // 获取所有区域
        const regions = get_all_regions(size, state.current_mode);

        // 计算每个格子所属的区域数量
        const region_counts = Array.from({ length: size }, () => Array(size).fill(0));
        for (const region of regions) {
            for (const [r, c] of region.cells) {
                region_counts[r][c]++;
            }
        }

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === 0) {
                    const candidates = [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, row, col, n));
                    const region_count = region_counts[row][col];

                    // 优先比较区域覆盖数，其次比较候选数
                    if (
                        !best_cell ||
                        region_count > region_counts[best_cell.row][best_cell.col] ||
                        (region_count === region_counts[best_cell.row][best_cell.col] && candidates.length < best_cell.candidates.length)
                    ) {
                        best_cell = { row, col, candidates };
                    }

                    // // 如果找到只有一个候选数的格子，直接返回
                    // if (minCandidates === 1) {
                    //     return best_cell;
                    // }
                }
            }
        }

        return best_cell;
    }
    // function find_best_cell() {
    //     let minCandidates = size + 1;
    //     let bestCell = null;

    //     for (let row = 0; row < size; row++) {
    //         for (let col = 0; col < size; col++) {
    //             if (board[row][col] === 0) {
    //                 const candidates = [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, row, col, n));
    //                 if (candidates.length < minCandidates) {
    //                     minCandidates = candidates.length;
    //                     bestCell = { row, col, candidates };
    //                 }
    //                 if (minCandidates === 1) {
    //                     // 如果找到只有一个候选数的格子，直接返回
    //                     return bestCell;
    //                 }
    //             }
    //         }
    //     }

    //     return bestCell;
    // }

    // 回溯填充数字
    function backtrack() {
        const best_cell = find_best_cell();
        if (!best_cell) {
            // 如果没有空格，说明已经填满
            return true;
        }

        const { row, col, candidates } = best_cell;

        for (const num of shuffle(candidates)) {
            if (isValid(board, size, row, col, num)) {
                // 备份当前候选数状态
                const boardBackup = board.map(row => row.map(cell => (Array.isArray(cell) ? [...cell] : cell)));
                candidate_stack.push(boardBackup);

                // 填入数字
                board[row][col] = num;

                // 输出当前填入的数字
                // log_process(`在位置 [${row + 1}, ${col + 1}] 填入数字 ${num}`);

                // 调用 eliminate_candidates 删除相关区域的候选数
                eliminate_candidates(board, size, row, col, num);

                // 检查是否有唯一可填的格子
                let progress = true;
                while (progress) {
                    progress = false;
                    for (let r = 0; r < size; r++) {
                        for (let c = 0; c < size; c++) {
                            if (board[r][c] === 0) {
                                const candidates = [...Array(size)].map((_, i) => i + 1).filter(n => isValid(board, size, r, c, n));
                                if (candidates.length === 1) {
                                    board[r][c] = candidates[0];
                                    // log_process(`位置 [${r + 1}, ${c + 1}] 填入数字 ${candidates[0]}`);
                                    eliminate_candidates(board, size, r, c, candidates[0]);
                                    progress = true;
                                }
                            }
                        }
                    }

                    // 检查某区域是否存在某个候选数只剩一格可填
                    if (check_unique_candidate_in_regions()) {
                        progress = true;
                    }
                }

                if (backtrack()) {
                    return true;
                }

                // 回溯时恢复候选数状态
                // log_process(`回溯：撤销位置 [${row + 1}, ${col + 1}] 的数字 ${num}`);
                const previousState = candidate_stack.pop();
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        board[r][c] = previousState[r][c];
                    }
                }
            }
        }

        return false;
    }

    backtrack();
    return board; // 全部填完返回终盘
}

// 挖洞，返回题目盘
function dig_holes(solution, size, _, symmetry = 'none', holes_limit = undefined) {
    const puzzle = solution.map(row => [...row]);
    let holes_dug = 0;
    let changed;

    // 获取所有区域并计算每个格子所属的区域数量
    // const regions = get_all_regions(size, state.current_mode);
    let regions = get_all_regions(size, state.current_mode);
    // 如果是反对角线模式，仅返回两条对角线区域
    if (state.current_mode === 'anti_diagonal') {
        const diag1_cells = [];
        const diag2_cells = [];
        for (let i = 0; i < size; i++) {
            diag1_cells.push([i, i]);
            diag2_cells.push([i, size - 1 - i]);
        }
        regions = [
            { type: '对角线', index: 1, cells: diag1_cells },
            { type: '对角线', index: 2, cells: diag2_cells }
        ];
    }
    const region_counts = Array.from({ length: size }, () => Array(size).fill(0));
    for (const region of regions) {
        for (const [r, c] of region.cells) {
            region_counts[r][c]++;
        }
    }

    do {
        if (holes_limit !== undefined && holes_dug >= holes_limit) break; // 挖洞数量达到上限，停止
        
        changed = false;
        let best_region_count = -1;
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
            let test_board;
            if (state.current_mode === 'X_sums') {
                // X和模式，去掉边界
                test_board = Array.from({ length: size + 2 }, (_, i) =>
                    Array.from({ length: size + 2 }, (_, j) => {
                        if (i === 0 || i === size + 1 || j === 0 || j === size + 1) {
                            return 0; // 边界填充为 0
                        }
                        const cell = puzzle[i - 1][j - 1];
                        return cell === 0
                            ? [...Array(size)].map((_, n) => n + 1)
                            : cell;
                    })
                );
            } else {
                test_board = puzzle.map(row =>
                    row.map(cell => cell === 0
                        ? [...Array(size)].map((_, n) => n + 1)
                        : cell
                    )
                );
            }

            solve(test_board, size, isValid, true);
    
            // // 仅考虑唯一解的情况，老分值系统
            // if (state.solve_stats.solution_count === 1 && state.solve_stats.total_score !== undefined) {
            //     if (state.solve_stats.total_score > best_score) {
            //         best_score = state.solve_stats.total_score;
            //         best_candidates = [{
            //             positions: positions_to_dig.map(([r, c]) => [r, c]),
            //             temp_values: [...temp_values]
            //         }];
            //     } else if (state.solve_stats.total_score === best_score) {
            //         best_candidates.push({
            //             positions: positions_to_dig.map(([r, c]) => [r, c]),
            //             temp_values: [...temp_values]
            //         });
            //     }
            // }

            // 仅考虑唯一解的情况
            if (state.solve_stats.solution_count === 1 && state.solve_stats.total_score !== undefined) {
                const current_region_count = Math.max(...positions_to_dig.map(([r, c]) => region_counts[r][c]));
                const current_score = state.solve_stats.total_score;
                
                // 优先比较区域数量
                if (current_region_count > best_region_count) {
                    best_region_count = current_region_count;
                    best_score = current_score;
                    best_candidates = [{
                        positions: positions_to_dig.map(([r, c]) => [r, c]),
                        temp_values: [...temp_values],
                        region_count: current_region_count,
                        score: current_score
                    }];
                } else if (current_region_count === best_region_count) {
                    // 区域数量相同时，比较分值
                    if (current_score > best_score) {
                        best_score = current_score;
                        best_candidates = [{
                            positions: positions_to_dig.map(([r, c]) => [r, c]),
                            temp_values: [...temp_values],
                            region_count: current_region_count,
                            score: current_score
                        }];
                    } else if (current_score === best_score) {
                        best_candidates.push({
                            positions: positions_to_dig.map(([r, c]) => [r, c]),
                            temp_values: [...temp_values],
                            region_count: current_region_count,
                            score: current_score
                        });
                    }
                }
            }
    
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
            // log_process(`挖洞位置: ${chosen.positions.map(([r, c]) => `[${r+1},${c+1}]`).join(' ')}，当前已挖洞数: ${holes_dug}`);
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