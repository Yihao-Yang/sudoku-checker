import { log_process, show_result } from "../modules/core.js";
import { solve_By_Elimination } from "./Technique.js";
import { state } from "../modules/state.js";
import { get_all_mark_lines, get_cells_on_line } from "../modules/multi_diagonal.js";
import { get_extra_region_cells } from '../modules/extra_region.js';

/**
 * 从所有相关区域移除指定数字的候选数
 */
export function eliminate_candidates(board, size, i, j, num, calc_score = true) {
    const eliminations = [];
    // 根据当前模式获取所有区域
    const mode = (typeof state !== "undefined" && state.current_mode) ? state.current_mode : "classic";

    // 满格区域
    const regions = get_all_regions(size, mode);
    const related_regions = regions.filter(region =>
        region.cells.some(([r, c]) => r === i && c === j)
    );
    for (const region of related_regions) {
        for (const [r, c] of region.cells) {
            if (Array.isArray(board[r][c])) {
                // 新增：无论是否真的被消除，都加分
                if (calc_score) {
                    const key = `${r},${c},${num}`;
                    if (!state.candidate_elimination_score[key]) {
                        state.candidate_elimination_score[key] = 0;
                    }
                    state.candidate_elimination_score[key] += 1;
                    // log_process(`候选数消除分值: [${getRowLetter(r+1)}${c+1}] 候选${num} -> 分值=${state.candidate_elimination_score[key]}`);
                }

                // 只有真的被消除才记录eliminations
                if (Array.isArray(board[r][c])) {
                    const before = board[r][c].slice();
                    board[r][c] = board[r][c].filter(candidate_num => candidate_num !== num);
                    const eliminated = before.filter(candidate_num => candidate_num === num);
                    if (eliminated.length > 0) {
                        eliminations.push({ row: r, col: c, eliminated });
                    }
                }
            }
        }
    }
    return eliminations;
}

/**
 * 获取所有区域（宫、行、列、对角线）格子坐标
 * @param {number} size - 盘面大小
 * @param {string} mode - 模式，可选 'classic' | 'diagonal' | 'missing'
 * @returns {Array<{type: string, index: number, cells: Array<[number, number]>}>}
 */
export function get_all_regions(size, mode = 'classic') {
    const regions = [];
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];

    // 宫
    for (let box_row = 0; box_row < size / box_size[0]; box_row++) {
        for (let box_col = 0; box_col < size / box_size[1]; box_col++) {
            const region_cells = [];
            for (let r = box_row * box_size[0]; r < (box_row + 1) * box_size[0]; r++) {
                for (let c = box_col * box_size[1]; c < (box_col + 1) * box_size[1]; c++) {
                    region_cells.push([r, c]);
                }
            }
            regions.push({ type: '宫', index: box_row * (size / box_size[1]) + box_col + 1, cells: region_cells });
        }
    }
    // 行
    for (let row = 0; row < size; row++) {
        const region_cells = [];
        for (let col = 0; col < size; col++) {
            region_cells.push([row, col]);
        }
        regions.push({ type: '行', index: row + 1, cells: region_cells });
    }
    // 列
    for (let col = 0; col < size; col++) {
        const region_cells = [];
        for (let row = 0; row < size; row++) {
            region_cells.push([row, col]);
        }
        regions.push({ type: '列', index: col + 1, cells: region_cells });
    }
    // 对角线
    if (mode === 'diagonal') {
        const diag1_cells = [];
        const diag2_cells = [];
        for (let i = 0; i < size; i++) {
            diag1_cells.push([i, i]);
            diag2_cells.push([i, size - 1 - i]);
        }
        regions.push({ type: '对角线', index: 1, cells: diag1_cells });
        regions.push({ type: '对角线', index: 2, cells: diag2_cells });
    }
    // 多斜线
    if (mode === 'multi_diagonal') {
        const mark_lines = get_all_mark_lines();
        let lineIndex = 1;
        for (const [start, end] of mark_lines) {
            const cells = get_cells_on_line(size, start, end);
            regions.push({ type: '斜线', index: lineIndex++, cells });
        }
    }
    // 窗口数独四个窗口区域
    if (mode === 'window' && size === 9) {
        // 左上窗口
        const window1 = [];
        for (let r = 1; r <= 3; r++) {
            for (let c = 1; c <= 3; c++) {
                window1.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 1, cells: window1 });

        // 右上窗口
        const window2 = [];
        for (let r = 1; r <= 3; r++) {
            for (let c = 5; c <= 7; c++) {
                window2.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 2, cells: window2 });

        // 左下窗口
        const window3 = [];
        for (let r = 5; r <= 7; r++) {
            for (let c = 1; c <= 3; c++) {
                window3.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 3, cells: window3 });

        // 右下窗口
        const window4 = [];
        for (let r = 5; r <= 7; r++) {
            for (let c = 5; c <= 7; c++) {
                window4.push([r, c]);
            }
        }
        regions.push({ type: '窗口', index: 4, cells: window4 });
        // 隐藏宫1：第1~3列，去掉1~3行和5~7行
        const hidden_box1 = [];
        for (let r = 0; r < 9; r++) {
            if (r >= 1 && r <= 3) continue;
            if (r >= 5 && r <= 7) continue;
            for (let c = 1; c <= 3; c++) {
                hidden_box1.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 1, cells: hidden_box1 });

        // 隐藏宫2：第5~7列，去掉1~3行和5~7行
        const hidden_box2 = [];
        for (let r = 0; r < 9; r++) {
            if (r >= 1 && r <= 3) continue;
            if (r >= 5 && r <= 7) continue;
            for (let c = 5; c <= 7; c++) {
                hidden_box2.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 2, cells: hidden_box2 });

        // 隐藏宫3：第1~3行，去掉1~3列和5~7列
        const hidden_box3 = [];
        for (let r = 1; r <= 3; r++) {
            for (let c = 0; c < 9; c++) {
                if (c >= 1 && c <= 3) continue;
                if (c >= 5 && c <= 7) continue;
                hidden_box3.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 3, cells: hidden_box3 });

        // 隐藏宫4：第5~7行，去掉1~3列和5~7列
        const hidden_box4 = [];
        for (let r = 5; r <= 7; r++) {
            for (let c = 0; c < 9; c++) {
                if (c >= 1 && c <= 3) continue;
                if (c >= 5 && c <= 7) continue;
                hidden_box4.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 4, cells: hidden_box4 });

        // 隐藏宫5：第0、4、8行与第0、4、8列交叉的格子
        const hidden_box5 = [];
        const rows = [0, 4, 8];
        const cols = [0, 4, 8];
        for (let r of rows) {
            for (let c of cols) {
                hidden_box5.push([r, c]);
            }
        }
        regions.push({ type: '隐藏宫', index: 5, cells: hidden_box5 });
    }
    // 金字塔数独四个金字塔区域
    if (mode === 'pyramid' && size === 9) {
        // 金字塔1：第0列的第1~5行，第1列的第2~4行，第2列的第3行
        const pyramid1 = [];
        for (let r = 1; r <= 5; r++) {
            pyramid1.push([r, 0]);
        }
        for (let r = 2; r <= 4; r++) {
            pyramid1.push([r, 1]);
        }
        pyramid1.push([3, 2]);
        regions.push({ type: '金字塔', index: 1, cells: pyramid1 });

        // 金字塔2：第0行的第3~7列，第1行的第4~6列，第2行的第5列
        const pyramid2 = [];
        for (let c = 3; c <= 7; c++) {
            pyramid2.push([0, c]);
        }
        for (let c = 4; c <= 6; c++) {
            pyramid2.push([1, c]);
        }
        pyramid2.push([2, 5]);
        regions.push({ type: '金字塔', index: 2, cells: pyramid2 });

        // 金字塔3：第8列的第3~7行，第7列的第4~6行，第6列的第5行
        const pyramid3 = [];
        for (let r = 3; r <= 7; r++) {
            pyramid3.push([r, 8]);
        }
        for (let r = 4; r <= 6; r++) {
            pyramid3.push([r, 7]);
        }
        pyramid3.push([5, 6]);
        regions.push({ type: '金字塔', index: 3, cells: pyramid3 });

        // 金字塔4：第8行的第1~5列，第7行的第2~4列，第6行的第3列
        const pyramid4 = [];
        for (let c = 1; c <= 5; c++) {
            pyramid4.push([8, c]);
        }
        for (let c = 2; c <= 4; c++) {
            pyramid4.push([7, c]);
        }
        pyramid4.push([6, 3]);
        regions.push({ type: '金字塔', index: 4, cells: pyramid4 });
    }
    // 额外区域数独：将手动标记的格子作为一个额外区域
    if (mode === 'extra_region' && typeof get_extra_region_cells === 'function') {
        const extra_region_cells = get_extra_region_cells();
        // if (extra_region_cells && extra_region_cells.length > 0) {
        //     regions.push({ type: '额外区域', index: 1, cells: extra_region_cells });
        // }
        if (Array.isArray(extra_region_cells) && extra_region_cells.length > 0) {
            // 判断是单区域还是多区域
            if (Array.isArray(extra_region_cells[0][0])) {
                // 多个区域
                extra_region_cells.forEach((region_cells, idx) => {
                    if (region_cells.length > 0) {
                        regions.push({ type: '额外区域', index: idx + 1, cells: region_cells });
                    }
                });
            } else {
                // 单个区域
                regions.push({ type: '额外区域', index: 1, cells: extra_region_cells });
            }
        }
    }
    return regions;
}

// 辅助函数：比较两个board状态是否相同
export function isEqual(board1, board2) {
    return JSON.stringify(board1) === JSON.stringify(board2);
}

// 辅助函数：获取所有可能的组合
export function getCombinations(array, size) {
    const result = [];
    
    function backtrack(start, current) {
        if (current.length === size) {
            result.push([...current]);
            return;
        }
        
        for (let i = start; i < array.length; i++) {
            current.push(array[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }
    
    backtrack(0, []);
    return result;
}

/**
 * 通用有效性检测函数，根据当前模式自动判断所有相关区域
 */
export function isValid(board, size, row, col, num) {
    // 获取当前模式（classic/diagonal/missing/...）
    const mode = state.current_mode || 'classic';
    // 获取所有相关区域
    const regions = get_all_regions(size, mode);
    // 找出包含(row, col)的所有区域
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col)) {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }
    return true;
}

let board = null;
let size = 0;
// let solution_count = 0;
let solution = null;
// 主求解函数
export function solve(currentBoard, currentSize, isValid = isValid, silent = false) {
    
    board = currentBoard;
    size = currentSize;
    state.solve_stats.solution_count = 0;
    solution = null;
    state.candidate_elimination_score = {};
    state.total_score_sum = 0;
    // state.solve_stats.solution_count = 0;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = board[i][j];
            if (cell === 0) {
                board[i][j] = Array.from({length: size}, (_, n) => n + 1);
            }
            else if (typeof cell === 'number' && cell !== 0) {
                const num = cell;
                board[i][j] = 0; // 临时清空
                if (!isValid(board, size, i, j, num)) {
                    // log_process(`[冲突] ${getRowLetter(i+1)}${j+1}=${num}与已有数字冲突，无解！`);
                    // return { changed: false, hasEmptyCandidate: true }; // 直接返回冲突状态
                    state.solve_stats.solution_count = -2; // 直接返回冲突状态
                    return {solution_count: state.solve_stats.solution_count}
                }
                board[i][j] = num; // 恢复原值
                eliminate_candidates(board, size, i, j, num); // 移除相关候选数
                // log_process("移除相关候选数");
            }
        }
    }

    if (silent) {
        // log_process = () => {}; // 静默模式下不输出
        state.silentMode = true;
    }
    else {
        state.silentMode = false;
    }

    // 先尝试逻辑求解
    const logical_result = solve_By_Logic();
    
    // 如果逻辑求解未完成，则尝试暴力求解
    if (!logical_result.isSolved) {
        if (state.techniqueSettings.Brute_Force) {
            solve_By_BruteForce();
        } else {
            if (state.solve_stats.solution_count === -2) {
                return {solution_count: state.solve_stats.solution_count};
            }
            else {
                state.solve_stats.solution_count = -1;  // 设置特殊标记值
                return {solution_count: state.solve_stats.solution_count};  // 提前返回防止后续覆盖
            }
        }
    }

    // 添加技巧使用统计
    if (logical_result.technique_counts) {
        state.solve_stats.technique_counts = logical_result.technique_counts;
        if (!state.silentMode) log_process("\n=== 技巧使用统计 ===");
        for (const [technique, count] of Object.entries(logical_result.technique_counts)) {
            if (count > 0) {
                if (!state.silentMode) log_process(`${technique}: ${count}次`);
            }
        }
        // 输出总分值
        if (logical_result.total_score !== undefined) {
            state.solve_stats.total_score = logical_result.total_score;
            if (!state.silentMode) log_process(`总分值: ${logical_result.total_score}`);
        }
        state.total_score_sum = Math.round(state.total_score_sum * 100) / 100; // 保留两位小数
        if (!state.silentMode) log_process(`新的总分值: ${state.total_score_sum}`);
    }

    // 恢复日志函数
    if (silent) {
        // log_process = originalLog;
        state.silentMode = false;
    }

    return {
        solution_count: state.solve_stats.solution_count,
        solution,
        technique_counts: state.solve_stats.technique_counts,
        total_score: state.solve_stats.total_score
    };
}

// 逻辑求解函数
function solve_By_Logic() {
    const { changed, hasEmptyCandidate, technique_counts, total_score } = solve_By_Elimination(board, size);
    if (!state.silentMode) log_process("1...判断当前数独是否有解");
    
    if (hasEmptyCandidate) {
        state.solve_stats.solution_count = -2;
        if (!state.silentMode) log_process("2...当前数独无解");
        return { isSolved: false };
    }
    if (!state.silentMode) log_process("2...当前数独有解");

    state.logical_solution = board.map(row => [...row]);

    // 检查是否已完全解出
    let isSolved = true;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (Array.isArray(board[i][j])) {
                isSolved = false;
                break;
            }
        }
        if (!isSolved) break;
    }
    if (!state.silentMode) log_process("3...判断当前数独能通过逻辑推理完全解出");

    if (isSolved) {
        if (!state.silentMode) log_process("4...当前数独通过逻辑推理完全解出");
        state.solve_stats.solution_count = 1;
        solution = board.map(row => [...row]);
        return { isSolved: true, technique_counts, total_score };
    }

    if (!state.silentMode) log_process("4...当前候选数数独无法通过逻辑推理完全解出，尝试暴力求解...");
    return { isSolved: false, technique_counts, total_score };
}

// 暴力求解函数
function solve_By_BruteForce(r = 0, c = 0, isValid = isValid) {
    const backup = board.map(row => [...row]);
    
    if (state.solve_stats.solution_count >= 2) return;
    if (r === size) {
        state.solve_stats.solution_count++;
        if (state.solve_stats.solution_count === 1) {
            solution = board.map(row => row.map(cell => 
                Array.isArray(cell) ? cell[0] : cell
            ));
        }
        return;
    }

    const nextRow = c === size - 1 ? r + 1 : r;
    const nextCol = (c + 1) % size;

    const cellValue = board[r][c];
    
    if (typeof cellValue === 'number' && cellValue !== 0) {
        solve_By_BruteForce(nextRow, nextCol);
        return;
    }
    
    if (Array.isArray(cellValue)) {
        for (const num of cellValue) {
            if (isValid(board, size, r, c, num)) {
                const boardBackup = JSON.parse(JSON.stringify(board));
                board[r][c] = num;
                log_process(`[试数] ${getRowLetter(r+1)}${c+1}=${num}`);
                eliminate_candidates(board, size, r, c, num);
                
                const { changed, hasEmptyCandidate } = solve_By_Elimination(board, size);
                if (hasEmptyCandidate) {
                    board = JSON.parse(JSON.stringify(boardBackup));
                    continue;
                }
                
                solve_By_BruteForce(nextRow, nextCol);
                board = JSON.parse(JSON.stringify(boardBackup));
            }
        }
        return;
    }
}

// 将数字行号转换为字母 (1=A, 2=B, ..., 26=Z)
export function getRowLetter(rowNum) {
    return String.fromCharCode(64 + rowNum); // 65 is 'A' in ASCII
}



// 修改 countSolutions 函数
export function countSolutions(board, size) {
    // 转换为候选数板
    const candidateBoard = board.map(row => 
        row.map(cell => cell === 0 ? 
            [...Array(size)].map((_, i) => i + 1) : 
            cell
        )
    );
    
    // 使用主 solve 函数获取技巧统计
    const result = solve(candidateBoard, size);
    state.solve_stats.technique_count = result.technique_counts || {};
    
    // 传统回溯计数
    const copy = board.map(row => [...row]);
    let count = 0;
    
    function backtrack() {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (copy[r][c] === 0) {
                    for (let num = 1; num <= size; num++) {
                        if (isValid(copy, size, r, c, num)) {
                            copy[r][c] = num;
                            if (count < 2) backtrack();
                            copy[r][c] = 0;
                            if (count >= 2) return;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    
    backtrack();
    return count;
}