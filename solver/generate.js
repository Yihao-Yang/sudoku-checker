import { solve, isValid } from './solver_tool.js';
import { log_process,backup_original_board,show_result, restore_original_board, clear_all_inputs} from '../modules/core.js';
import { state } from '../modules/state.js';
import { isValid_multi_diagonal } from '../modules/multi_diagonal.js';
import { isValid_diagonal } from '../modules/diagonal.js';


/**
 * 自动生成标准数独题目
 * @param {number} size - 数独大小 (4,6,9)
 * @param {string} difficulty - 难度 ('easy', 'medium', 'hard')
 */
export function generate_puzzle(size) {
    // 清除之前的结果
    clear_all_inputs();
    log_process('', true);

    let puzzle, solution, result, holesDug, symmetry;

    // 允许用户自定义分值下限
    let score_lower_limit = 0;
    if (typeof window !== 'undefined') {
        const input = window.prompt(
            `请输入你想要的题目分值下限（六宫简单0，普通20，困难40：九宫简单0，普通100，困难200）：`,
            '0'
        );
        score_lower_limit = Number(input) || 0;
    }

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

    while (true) {
        // 1. 生成终盘
        solution = generate_solution(size);

        // 2. 随机选择对称模式并挖洞
        symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
        puzzle = dig_holes(solution, size, 0, symmetry);

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
        let is_valid_func;
        if (state.current_mode === 'multi_diagonal') {
            is_valid_func = isValid_multi_diagonal;
        } else if (state.current_mode === 'diagonal') {
            is_valid_func = isValid_diagonal;
        } else {
            is_valid_func = isValid;
        }
        result = solve(testBoard, size, is_valid_func, true);

        // 分值判断（包含用户输入的下限）
        if (result.total_score < score_lower_limit) {
            log_process(`题目分值为${result.total_score}，低于下限${score_lower_limit}，重新生成...`);
            continue;
        }
        break;
    }

    log_process(`生成${size}宫格${difficulty}难度数独，提示数: ${size*size-holesDug}，对称模式: ${symmetry}`);
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

    if (result.techniqueCounts) {
        log_process("\n=== 技巧使用统计 ===");
        for (const [technique, count] of Object.entries(result.techniqueCounts)) {
            if (count > 0) {
                log_process(`${technique}: ${count}次`);
            }
        }
        if (result.total_score !== undefined) {
            log_process(`总分值: ${result.total_score}`);
        }
    }

    return {
        puzzle: puzzle,
        solution: solution
    };
}

// 生成数独终盘（直接使用回溯法生成）
export function generate_solution(size) {
    
    const board = Array.from({ length: size }, () => 
        Array.from({ length: size }, () => 0)
    );
    
    // 回溯填充数字
    function backtrack() {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === 0) {
                    const nums = shuffle([...Array(size)].map((_, i) => i + 1));
                    
                    for (const num of nums) {
                        // 根据模式选择有效性检测函数
                        let is_valid_func;
                        if (state.current_mode === 'multi_diagonal') {
                            is_valid_func = isValid_multi_diagonal;
                        } else if (state.current_mode === 'diagonal') {
                            is_valid_func = isValid_diagonal;
                        } else {
                            is_valid_func = isValid;
                        }
                        if (is_valid_func(board, size, row, col, num)) {
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

function dig_holes(solution, size, _, symmetry = 'none') {
    const puzzle = solution.map(row => [...row]);
    let holes_dug = 0;
    let changed;

    do {
        changed = false;
        let best_score = -1;
        let best_positions_to_dig = null;
        let best_temp_values = null;

        // 新增：收集本轮所有候选方案及分值
        const candidates = [];

        // 遍历所有可挖位置，寻找分值最高的方案
        for (let pos = 0; pos < size * size; pos++) {
            let row = Math.floor(pos / size);
            let col = pos % size;
            if (puzzle[row][col] === 0) continue;

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
            // const test_board = puzzle.map(row => [...row]);
            const test_board = puzzle.map(row =>
                row.map(cell => cell === 0
                    ? [...Array(size)].map((_, n) => n + 1) // 空格转为全候选数
                    : cell
                )
            );
            let is_valid_func;
            if (state.current_mode === 'multi_diagonal') {
                is_valid_func = isValid_multi_diagonal;
            } else if (state.current_mode === 'diagonal') {
                is_valid_func = isValid_diagonal;
            } else {
                is_valid_func = isValid;
            }
            const result = solve(test_board, size, is_valid_func, true);

            // 仅考虑唯一解的情况
            if (result.solutionCount === 1 && result.total_score !== undefined) {
                // // 测试用
                // candidates.push({
                //     positions: positions_to_dig.map(([r, c]) => [r, c]),
                //     score: result.total_score
                // });
                if (result.total_score > best_score) {
                    best_score = result.total_score;
                    best_positions_to_dig = positions_to_dig.map(([r, c]) => [r, c]);
                    best_temp_values = [...temp_values];
                }
            }

            // 恢复数字
            positions_to_dig.forEach(([r, c], idx) => puzzle[r][c] = temp_values[idx]);
        }

        // // 测试用
        // // 输出本轮所有候选方案及分值
        // if (candidates.length > 0) {
        //     log_process(`本轮候选挖洞方案分值如下:`);
        //     candidates.forEach((item, idx) => {
        //         const pos_str = item.positions.map(([r, c]) => `(${r},${c})`).join(' ');
        //         const chosen = (item.score === best_score) ? ' <-- 本轮最优' : '';
        //         log_process(`方案${idx+1}: 挖洞位置: ${pos_str}，分值: ${item.score}${chosen}`);
        //     });
        // }

        // 如果本轮有最优挖洞方案，则实际挖洞
        if (best_positions_to_dig) {
            best_positions_to_dig.forEach(([r, c]) => puzzle[r][c] = 0);
            holes_dug += best_positions_to_dig.length;
            changed = true;
        }
    } while (changed);

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



const SYMMETRY_TYPES = ['horizontal', 'vertical', 'central', 'diagonal', 'anti-diagonal'];



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