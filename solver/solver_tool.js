import { log_process, show_result } from "../modules/core.js";
import { solve_By_Elimination } from "./Technique.js";
import { state } from "../modules/state.js";

/**
 * 从同行同列同宫中移除指定数字的候选数
 */
export function eliminate_Candidates(board, size, i, j, num) {
    // 处理行和列
    for (let k = 0; k < size; k++) {
        if (Array.isArray(board[i][k])) {
            board[i][k] = board[i][k].filter(n => n !== num);
        }
        if (Array.isArray(board[k][j])) {
            board[k][j] = board[k][j].filter(n => n !== num);
        }
    }
    
    // 处理宫
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    const startRow = Math.floor(i / boxSize[0]) * boxSize[0];
    const startCol = Math.floor(j / boxSize[1]) * boxSize[1];
    
    for (let r = startRow; r < startRow + boxSize[0]; r++) {
        for (let c = startCol; c < startCol + boxSize[1]; c++) {
            if (Array.isArray(board[r][c])) {
                board[r][c] = board[r][c].filter(n => n !== num);
            }
        }
    }
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
 * 自定义验证函数
 */
export function isValid(board, size, row, col, num) {
    for (let i = 0; i < size; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
    }

    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    const startRow = Math.floor(row / boxSize[0]) * boxSize[0];
    const startCol = Math.floor(col / boxSize[1]) * boxSize[1];

    for (let r = startRow; r < startRow + boxSize[0]; r++) {
        for (let c = startCol; c < startCol + boxSize[1]; c++) {
            if (board[r][c] === num) return false;
        }
    }
    return true;
}

let board = null;
let size = 0;
// let solutionCount = 0;
let solution = null;
// 主求解函数
export function solve(currentBoard, currentSize, silent = false) {
    
    board = currentBoard;
    size = currentSize;
    state.solutionCount = 0;
    solution = null;
    // state.solutionCount = 0;

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
                    log_process(`[冲突] ${getRowLetter(i+1)}${j+1}=${num}与已有数字冲突，无解！`);
                    // return { changed: false, hasEmptyCandidate: true }; // 直接返回冲突状态
                    return { solutionCount: -2 }; // 直接返回冲突状态
                }
                board[i][j] = num; // 恢复原值
                eliminate_Candidates(board, size, i, j, num); // 移除相关候选数
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
    const logicalResult = solve_By_Logic();
    
    // 如果逻辑求解未完成，则尝试暴力求解
    if (!logicalResult.isSolved) {
        if (state.techniqueSettings.Brute_Force) {
            solve_By_BruteForce();
        } else {
            if (state.solutionCount === -2) {
                return {solutionCount: state.solutionCount};
            }
            else {
                state.solutionCount = -1;  // 设置特殊标记值
                return {solutionCount: state.solutionCount};  // 提前返回防止后续覆盖
            }
        }
    }
    // 添加技巧使用统计
    if (logicalResult.techniqueCounts) {
        if (!state.silentMode) log_process("\n=== 技巧使用统计 ===");
        for (const [technique, count] of Object.entries(logicalResult.techniqueCounts)) {
            if (count > 0) {
                if (!state.silentMode) log_process(`${technique}: ${count}次`);
            }
        }
    }

    // 恢复日志函数
    if (silent) {
        // log_process = originalLog;
        state.silentMode = false;
    }

    // 返回求解结果
    return {
        solutionCount: state.solutionCount,
        solution,
        techniqueCounts: logicalResult.techniqueCounts
    };
}

// 逻辑求解函数
function solve_By_Logic() {
    const { changed, hasEmptyCandidate, techniqueCounts } = solve_By_Elimination(board, size);
    if (!state.silentMode) log_process("1...判断当前数独是否有解");
    
    if (hasEmptyCandidate) {
        state.solutionCount = -2;
        if (!state.silentMode) log_process("2...当前数独无解");
        return { isSolved: false };
    }
    if (!state.silentMode) log_process("2...当前数独有解");

    state.logicalSolution = board.map(row => [...row]);

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
        state.solutionCount = 1;
        solution = board.map(row => [...row]);
        return { isSolved: true, techniqueCounts };
    }

    if (!state.silentMode) log_process("4...当前候选数数独无法通过逻辑推理完全解出，尝试暴力求解...");
    return { isSolved: false, techniqueCounts };
}

// 暴力求解函数
function solve_By_BruteForce(r = 0, c = 0) {
    const backup = board.map(row => [...row]);
    
    if (state.solutionCount >= 2) return;
    if (r === size) {
        state.solutionCount++;
        if (state.solutionCount === 1) {
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
                eliminate_Candidates(board, size, r, c, num);
                
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

// ... 其他代码保持不变 ...

// // 新增 countSolutions 函数
// export function countSolutions(board, size) {
//     const copy = board.map(row => [...row]);
//     let count = 0;
    
//     function backtrack() {
//         for (let r = 0; r < size; r++) {
//             for (let c = 0; c < size; c++) {
//                 if (copy[r][c] === 0) {
//                     for (let num = 1; num <= size; num++) {
//                         if (isValid(copy, size, r, c, num)) {
//                             copy[r][c] = num;
//                             if (count < 2) backtrack();
//                             copy[r][c] = 0;
//                             if (count >= 2) return; // 提前终止
//                         }
//                     }
//                     return;
//                 }
//             }
//         }
//         count++;
//     }
    
//     // 重置技巧统计
//     state.lastTechniqueCounts = {};
//     // 先尝试逻辑求解以获取技巧统计
//     const logicalResult = solve_By_Logic(copy, size);
//     if (logicalResult.techniqueCounts) {
//         state.lastTechniqueCounts = logicalResult.techniqueCounts;
//     }
    
//     backtrack();
//     return count;
// }

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
    state.lastTechniqueCounts = result.techniqueCounts || {};
    
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