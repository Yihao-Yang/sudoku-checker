import { state } from '../modules/state.js';
import { show_result, log_process } from '../modules/core.js';
import { eliminate_Candidates, isEqual, getCombinations, getRowLetter } from './solver_tool.js';

// // 总的技巧调用函数
// export function solve_By_Elimination(board, size) {
//     let changed;
//     do {
//         changed = false;
//         const initialBoard = JSON.parse(JSON.stringify(board));

//         // 根据技巧开关状态执行不同的排除方法
//         // 宫排除
//         if (state.techniqueSettings?.boxElimination) {
//             const Box_Conflict = check_Box_Elimination(board, size);
//             if (Box_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
//         // 行/列排除
//         if (state.techniqueSettings?.rowElimination) {
//             const Row_Conflict = check_Row_Elimination(board, size);
//             if (Row_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
        
//         if (state.techniqueSettings?.colElimination) {
//             const Col_Conflict = check_Col_Elimination(board, size);
//             if (Col_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
//         // 唯余
//         if (state.techniqueSettings?.cellElimination) {
//             const Cell_Conflict_1 = check_Cell_Elimination(board, size, 1);
//             if (Cell_Conflict_1) return { changed: false, hasEmptyCandidate: true };
//         }
//         if (state.techniqueSettings?.cellElimination) {
//             const Cell_Conflict_2 = check_Cell_Elimination(board, size, 2);
//             if (Cell_Conflict_2) return { changed: false, hasEmptyCandidate: true };
//         }
//         if (state.techniqueSettings?.cellElimination) {
//             const Cell_Conflict_3 = check_Cell_Elimination(board, size, 3);
//             if (Cell_Conflict_3) return { changed: false, hasEmptyCandidate: true };
//         }
//         if (state.techniqueSettings?.cellElimination) {
//             const Cell_Conflict_4 = check_Cell_Elimination(board, size, 4);
//             if (Cell_Conflict_4) return { changed: false, hasEmptyCandidate: true };
//         }
//         if (state.techniqueSettings?.cellElimination) {
//             const Cell_Conflict_5 = check_Cell_Elimination(board, size, 5);
//             if (Cell_Conflict_5) return { changed: false, hasEmptyCandidate: true };
//         }
//         if (state.techniqueSettings?.cellElimination) {
//             const Cell_Conflict_6 = check_Cell_Elimination(board, size, 6);
//             if (Cell_Conflict_6) return { changed: false, hasEmptyCandidate: true };
//         }
        
//         if (state.techniqueSettings?.boxBlock) {
//             const Box_Block_Conflict = check_Box_Block_Elimination(board, size);
//             if (Box_Block_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
        
//         if (state.techniqueSettings?.rowBlock) {
//             const Row_Block_Conflict = check_Row_Block_Elimination(board, size);
//             if (Row_Block_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
        
//         if (state.techniqueSettings?.colBlock) {
//             const Col_Block_Conflict = check_Col_Block_Elimination(board, size);
//             if (Col_Block_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
        
//         if (state.techniqueSettings?.boxSubset) {
//             const Box_Subset_Conflict = check_Box_Subset_Elimination(board, size);
//             if (Box_Subset_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
        
//         if (state.techniqueSettings?.rowSubset) {
//             const Row_Subset_Conflict = check_Row_Subset_Elimination(board, size);
//             if (Row_Subset_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }
        
//         if (state.techniqueSettings?.colSubset) {
//             const Col_Subset_Conflict = check_Col_Subset_Elimination(board, size);
//             if (Col_Subset_Conflict) return { changed: false, hasEmptyCandidate: true };
//         }

//         changed = !isEqual(board, initialBoard);
//     } while (changed);
//     return { changed, hasEmptyCandidate: false };
// }

export function solve_By_Elimination(board, size) {
    let changed;
    // const techniqueGroups = [
    //     // 第一优先级：余1数的唯余法
    //     [() => state.techniqueSettings?.cellElimination && check_Cell_Elimination(board, size, 1)],
    //     // 第二优先级：余2数的唯余法
    //     [() => state.techniqueSettings?.cellElimination && check_Cell_Elimination(board, size, 2)],
    //     // 第三优先级：宫排除法
    //     [() => state.techniqueSettings?.boxElimination && check_Box_Elimination(board, size)],
    //     // 第四优先级：余3数的唯余法
    //     [() => state.techniqueSettings?.cellElimination && check_Cell_Elimination(board, size, 3)],
    //     // 第五优先级：行列排除法（同一级）
    //     [
    //         () => state.techniqueSettings?.rowElimination && check_Row_Elimination(board, size, 3),
    //         () => state.techniqueSettings?.colElimination && check_Col_Elimination(board, size, 3)
    //     ],
    //     // 第六优先级：宫区块
    //     [() => state.techniqueSettings?.boxBlock && check_Box_Block_Elimination(board, size)],
    //     // 第七优先级：行列区块（同一级）
    //     [
    //         () => state.techniqueSettings?.rowBlock && check_Row_Block_Elimination(board, size),
    //         () => state.techniqueSettings?.colBlock && check_Col_Block_Elimination(board, size)
    //     ],
    //     // 第八优先级：余4数的唯余法
    //     [() => state.techniqueSettings?.cellElimination && check_Cell_Elimination(board, size, 4)],
    //     // 第九优先级：余5数的唯余法
    //     [() => state.techniqueSettings?.cellElimination && check_Cell_Elimination(board, size, 5)],
    //     // 第十优先级：余6数的唯余法
    //     [() => state.techniqueSettings?.cellElimination && check_Cell_Elimination(board, size, 6)],
    //     // 第十一优先级：宫隐性数对
    //     [() => state.techniqueSettings?.boxHiddenPair && check_Box_Hidden_Pair_Elimination(board, size)],
    //     // 第十二优先级：宫隐性三数组
    //     [() => state.techniqueSettings?.boxHiddenTriple && check_Box_Hidden_Triple_Elimination(board, size)],
    //     // 第十二优先级：宫显性数对
    //     [() => state.techniqueSettings?.boxNakedPair && check_Box_Naked_Subset_Elimination(board, size, 2)],
    //     // 第十三优先级：行列显性数对
    //     [
    //         () => state.techniqueSettings?.Row_Naked_Pair && check_Row_Naked_Subset_Elimination(board, size, 2),
    //         () => state.techniqueSettings?.Col_Naked_Pair && check_Col_Naked_Subset_Elimination(board, size, 2)
    //     ],
    //     // 第十四优先级：行列隐性数对
    //     [
    //         () => state.techniqueSettings?.rowHiddenPair && check_Row_Hidden_Pair_Elimination(board, size),
    //         () => state.techniqueSettings?.colHiddenPair && check_Col_Hidden_Pair_Elimination(board, size)
    //     ],
    //     // 第十优先级：行列隐性三数组
    //     [
    //         () => state.techniqueSettings?.rowHiddenTriple && check_Row_Hidden_Triple_Elimination(board, size),
    //         () => state.techniqueSettings?.colHiddenTriple && check_Col_Hidden_Triple_Elimination(board, size)
    //     ],
    //     // 第十二优先级：宫显性三数组
    //     [() => state.techniqueSettings?.Box_Naked_Triple && check_Box_Naked_Subset_Elimination(board, size, 3)],
    //     // 第十二优先级：行列显性三数组（同一级）
    //     [
    //         () => state.techniqueSettings?.Row_Naked_Triple && check_Row_Naked_Subset_Elimination(board, size, 3),
    //         () => state.techniqueSettings?.Col_Naked_Triple && check_Col_Naked_Subset_Elimination(board, size, 3)
    //     ],
    //     // 第十四优先级：宫隐性四数组
    //     [() => state.techniqueSettings?.Box_Hidden_Quad && check_Box_Hidden_Quad_Elimination(board, size),]
    //     // 第十四优先级：行列隐性四数组
    //     [
    //         () => state.techniqueSettings?.Row_Hidden_Quad && check_Row_Hidden_Quad_Elimination(board, size),
    //         () => state.techniqueSettings?.Col_Hidden_Quad && check_Col_Hidden_Quad_Elimination(board, size)
    //     ],
        
    //     // 第十五优先级：宫显性四数组
    //     [() => state.techniqueSettings?.Box_Naked_Quad && check_Box_Naked_Subset_Elimination(board, size, 4),]
    //     // 第十五优先级：行列显性四数组
    //     [
    //         () => state.techniqueSettings?.rowHiddenQuad && check_Row_Naked_Subset_Elimination(board, size, 4),
    //         () => state.techniqueSettings?.colHiddenQuad && check_Col_Naked_Subset_Elimination(board, size, 4)
    //     ]
    // ];

    const techniqueGroups = [
        // 第一优先级：余1数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 1)],
        // 第二优先级：余2数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 2)],
        // 第三优先级：宫排除法
        [() => state.techniqueSettings?.Box_Elimination && check_Box_Elimination(board, size)],
        // 第四优先级：余3数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 3)],
        // 第五优先级：行列排除法（同一级）
        [
            () => state.techniqueSettings?.Row_Elimination && check_Row_Elimination(board, size, size),
            () => state.techniqueSettings?.Col_Elimination && check_Col_Elimination(board, size, size)
        ],
        // 第六优先级：宫区块
        [() => state.techniqueSettings?.Box_Block && check_Box_Block_Elimination(board, size)],
        // 第七优先级：行列区块（同一级）
        [
            () => state.techniqueSettings?.Row_Block && check_Row_Block_Elimination(board, size),
            () => state.techniqueSettings?.Col_Block && check_Col_Block_Elimination(board, size)
        ],
        // 第八优先级：余4，5数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 4)],
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 5)],
        // 第九优先级：余6，7数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 6)],
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 7)],
        // 第十优先级：余8，9数的唯余法
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 8)],
        [() => state.techniqueSettings?.Cell_Elimination && check_Cell_Elimination(board, size, 9)],
        // 第十一优先级：宫隐性数对
        [() => state.techniqueSettings?.Box_Hidden_Pair && check_Box_Hidden_Pair_Elimination(board, size)],
        // 第十二优先级：宫隐性三数组
        [() => state.techniqueSettings?.Box_Hidden_Triple && check_Box_Hidden_Triple_Elimination(board, size)],
        // 第十三优先级：宫显性数对
        [() => state.techniqueSettings?.Box_Naked_Pair && check_Box_Naked_Subset_Elimination(board, size, 2)],
        // 第十四优先级：行列显性数对
        [
            () => state.techniqueSettings?.Row_Naked_Pair && check_Row_Naked_Subset_Elimination(board, size, 2),
            () => state.techniqueSettings?.Col_Naked_Pair && check_Col_Naked_Subset_Elimination(board, size, 2)
        ],
        // 第十五优先级：行列隐性数对
        [
            () => state.techniqueSettings?.Row_Hidden_Pair && check_Row_Hidden_Pair_Elimination(board, size),
            () => state.techniqueSettings?.Col_Hidden_Pair && check_Col_Hidden_Pair_Elimination(board, size)
        ],
        // 第十六优先级：行列隐性三数组
        [
            () => state.techniqueSettings?.Row_Hidden_Triple && check_Row_Hidden_Triple_Elimination(board, size),
            () => state.techniqueSettings?.Col_Hidden_Triple && check_Col_Hidden_Triple_Elimination(board, size)
        ],
        // 第十七优先级：宫显性三数组
        [() => state.techniqueSettings?.Box_Naked_Triple && check_Box_Naked_Subset_Elimination(board, size, 3)],
        // 第十八优先级：行列显性三数组（同一级）
        [
            () => state.techniqueSettings?.Row_Naked_Triple && check_Row_Naked_Subset_Elimination(board, size, 3),
            () => state.techniqueSettings?.Col_Naked_Triple && check_Col_Naked_Subset_Elimination(board, size, 3)
        ],
        // 第十九优先级：宫隐性四数组
        [() => state.techniqueSettings?.Box_Hidden_Quad && check_Box_Hidden_Quad_Elimination(board, size)],
        // 第二十优先级：行列隐性四数组
        [
            () => state.techniqueSettings?.Row_Hidden_Quad && check_Row_Hidden_Quad_Elimination(board, size),
            () => state.techniqueSettings?.Col_Hidden_Quad && check_Col_Hidden_Quad_Elimination(board, size)
        ],
        // 第二十一优先级：宫显性四数组
        [() => state.techniqueSettings?.Box_Naked_Quad && check_Box_Naked_Subset_Elimination(board, size, 4)],
        // 第二十二优先级：行列显性四数组
        [
            () => state.techniqueSettings?.Row_Naked_Quad && check_Row_Naked_Subset_Elimination(board, size, 4),
            () => state.techniqueSettings?.Col_Naked_Quad && check_Col_Naked_Subset_Elimination(board, size, 4)
        ]
    ];
    do {
        changed = false;
        const initialBoard = JSON.parse(JSON.stringify(board));

        // 按优先级顺序执行技巧组
        for (let i = 0; i < techniqueGroups.length; i++) {
            const group = techniqueGroups[i];
            let groupChanged = false;
            
            do {
                groupChanged = false;
                const groupInitialBoard = JSON.parse(JSON.stringify(board));

                for (const technique of group) {
                    const result = technique();
                    if (result === true) {
                        log_process("[冲突检测] 发现无解局面");
                        return { changed: false, hasEmptyCandidate: true };
                    }
                    if (!groupChanged && !isEqual(board, groupInitialBoard)) {
                        groupChanged = true;
                    }
                }

                if (groupChanged) {
                    changed = true;
                    i = -1; // 重置循环
                    break;
                }
            } while (groupChanged);
        }
    } while (changed);

    return { changed, hasEmptyCandidate: false };
}
// 宫排除
function check_Box_Elimination(board, size) {
    // 宫的大小定义（兼容6宫格）
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    // 遍历每个宫
    for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
        for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
            // 统计每个数字在该宫出现的候选格位置
            const numPositions = {};

            // 计算宫的起始行列
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];

            // 先检查宫中是否已有确定数字
            const existingNums = new Set();
            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                    if (typeof board[r][c] === 'number') {
                        existingNums.add(board[r][c]);
                    }
                }
            }

            for (let num = 1; num <= size; num++) {
                numPositions[num] = [];
                // 如果数字已存在，跳过统计
                if (existingNums.has(num)) continue;

                for (let r = startRow; r < startRow + boxSize[0]; r++) {
                    for (let c = startCol; c < startCol + boxSize[1]; c++) {
                        const cell = board[r][c];
                        if (Array.isArray(cell) && cell.includes(num)) {
                            numPositions[num].push([r, c]);
                        }
                    }
                }

                if (numPositions[num].length === 1) {
                    const [row, col] = numPositions[num][0];
                    const cell = board[row][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        board[row][col] = num;
                        log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                        eliminate_Candidates(board, size, row, col, num);
                        return;
                    }
                } else if (numPositions[num].length === 0) {
                    hasConflict = true; // 直接标记冲突
                    const boxNum = boxRow * (size / boxSize[1]) + boxCol + 1;
                    log_process(`[冲突] ${boxNum}宫中数字${num}无可填入位置，无解`);
                    // log_process(`[冲突] ${boxRow*3+boxCol+1}宫中数字${num}无可填入位置，无解`);
                    return true;
                }
            }
        }
    }
}

// 行排除 
function check_Row_Elimination(board, size, nat) {    
    // log_process("...");
    let hasConflict = false;
    
    for (let row = 0; row < size; row++) {
        // 统计每个数字在该行出现的候选格位置
        const numPositions = {};
        // 先检查行中是否已有确定数字
        const existingNums = new Set();
        for (let col = 0; col < size; col++) {
            if (typeof board[row][col] === 'number') {
                existingNums.add(board[row][col]);
            }
        }

        for (let num = 1; num <= size; num++) {
            numPositions[num] = [];
            // 如果数字已存在，跳过统计
            if (existingNums.has(num)) continue;

            for (let col = 0; col < size; col++) {
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    numPositions[num].push(col);
                }
            }

            if (existingNums.size >= size - nat && numPositions[num].length === 1) {
                const col = numPositions[num][0];
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    board[row][col] = num;
                    log_process(`[行排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                    eliminate_Candidates(board, size, row, col, num);
                    return;
                }
            } else if (numPositions[num].length === 0) {
                hasConflict = true;
                log_process(`[冲突] ${getRowLetter(row+1)}行数字${num}无可填入位置，无解`);
                return true;
            }
        }
    }
    return hasConflict;
}

// 列排除
function check_Col_Elimination(board, size, nat) {    
    let hasConflict = false;
    
    for (let col = 0; col < size; col++) {
        // 统计每个数字在该列出现的候选格位置
        const numPositions = {};
        // 先检查列中是否已有确定数字
        const existingNums = new Set();
        for (let row = 0; row < size; row++) {
            if (typeof board[row][col] === 'number') {
                existingNums.add(board[row][col]);
            }
        }

        for (let num = 1; num <= size; num++) {
            numPositions[num] = [];
            // 如果数字已存在，跳过统计
            if (existingNums.has(num)) continue;

            for (let row = 0; row < size; row++) {
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    numPositions[num].push(row);
                }
            }

            if (existingNums.size >= size - nat && numPositions[num].length === 1) {
                const row = numPositions[num][0];
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    board[row][col] = num;
                    log_process(`[列排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                    eliminate_Candidates(board, size, row, col, num);
                    return;
                }
            } else if (numPositions[num].length === 0) {
                hasConflict = true;
                log_process(`[冲突] ${col+1}列数字${num}无可填入位置，无解`);
                return true;
            }
        }
    }
    return hasConflict;
}

//行/列排除
function check_Line_Elimination(board, size) {
    let hasConflict = false;
    
    // 同时处理行和列
    for (let i = 0; i < size; i++) {
        
        // 行排除逻辑
        const rowNumPositions = {};
        const rowExistingNums = new Set();
        
        // 收集列的已填数字
        for (let j = 0; j < size; j++) {
            // 行数据收集
            const rowCell = board[i][j];
            if (typeof rowCell === 'number') {
                rowExistingNums.add(rowCell);
            }
        }
        
        // 检查行和列的数字候选情况
        for (let num = 1; num <= size; num++) {
            // 行检查
            if (!rowExistingNums.has(num)) {
                rowNumPositions[num] = [];
                for (let j = 0; j < size; j++) {
                    const cell = board[i][j];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        rowNumPositions[num].push(j);
                    }
                }
                
                if (rowNumPositions[num].length === 1) {
                    const col = rowNumPositions[num][0];
                    const cell = board[i][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        board[i][col] = num;
                        log_process(`[行排除] ${getRowLetter(i+1)}${col+1}=${num}`);
                        eliminate_Candidates(board, size, i, col, num);
                    }
                } 
                else if (rowNumPositions[num].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(i+1)}行数字${num}无可填入位置，无解`);
                    return true;
                }
            }
        }
    }
    // 列排除
    for (let i = 0; i < size; i++) {
        // 列排除逻辑
        const colNumPositions = {};
        const colExistingNums = new Set();
        
        // 收集列的已填数字
        for (let j = 0; j < size; j++) {
            // 列数据收集
            const colCell = board[j][i];
            if (typeof colCell === 'number') {
                colExistingNums.add(colCell);
            }
        }
        
        for (let num = 1; num <= size; num++) {   
            // 列检查
            if (!colExistingNums.has(num)) {
                colNumPositions[num] = [];
                for (let j = 0; j < size; j++) {
                    const cell = board[j][i];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        colNumPositions[num].push(j);
                    }
                }
                
                if (colNumPositions[num].length === 1) {
                    const row = colNumPositions[num][0];
                    const cell = board[row][i];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        board[row][i] = num;
                        log_process(`[列排除] ${getRowLetter(row+1)}${i+1}=${num}`);
                        eliminate_Candidates(board, size, row, i, num);
                    }
                } 
                else if (colNumPositions[num].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${i+1}列数字${num}无可填入位置，无解1`);
                    return true;
                }
            }
        }
    }
    
    return hasConflict;
}

// // 检查格唯一候选数（唯一余数法）
// function check_Cell_Elimination(board, size) {
//     let hasConflict = false;
    
//     for (let row = 0; row < size; row++) {
//         for (let col = 0; col < size; col++) {
//             const cell = board[row][col];
//             if (Array.isArray(cell)) {
//                 if (cell.length === 1) {
//                     const num = cell[0];
//                     board[row][col] = num;
//                     log_process(`[唯一余数] ${getRowLetter(row+1)}${col+1}=${num}`);
//                     eliminate_Candidates(board, size, row, col, num);
//                 } else if (cell.length === 0) {
//                     hasConflict = true;
//                     log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
//                     return true;
//                 }
//             }
//         }
//     }
//     return hasConflict;
// }

// 检查格唯一候选数（唯一余数法）
function check_Cell_Elimination(board, size, nat = 1) {
    let hasConflict = false;
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = board[row][col];
            
            if (Array.isArray(cell)) {
                // 先检查冲突情况
                if (cell.length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                
                // 检查单一候选数情况
                if (cell.length === 1) {
                    const num = cell[0];
                    
                    // 检查当前宫是否已填size-1个数字
                    const boxRow = Math.floor(row / boxSize[0]);
                    const boxCol = Math.floor(col / boxSize[1]);
                    const startRow = boxRow * boxSize[0];
                    const startCol = boxCol * boxSize[1];
                    const boxNums = new Set();
                    
                    for (let r = startRow; r < startRow + boxSize[0]; r++) {
                        for (let c = startCol; c < startCol + boxSize[1]; c++) {
                            if (typeof board[r][c] === 'number') {
                                boxNums.add(board[r][c]);
                            }
                        }
                    }

                    if (boxNums.size === size - nat && !boxNums.has(num)) {
                        board[row][col] = num;
                        log_process(`[唯余法] ${getRowLetter(row+1)}${col+1}=${num}（宫内余${nat}数）`);
                        eliminate_Candidates(board, size, row, col, num);
                        return;
                        continue; // 处理完后直接进入下一个格子
                    }
                    
                    // 检查当前行是否已填size-1个数字
                    const rowNums = new Set();
                    for (let c = 0; c < size; c++) {
                        if (typeof board[row][c] === 'number') {
                            rowNums.add(board[row][c]);
                        }
                    }
                    
                    // 检查当前列是否已填size-1个数字
                    const colNums = new Set();
                    for (let r = 0; r < size; r++) {
                        if (typeof board[r][col] === 'number') {
                            colNums.add(board[r][col]);
                        }
                    }
                    
                    // 如果宫/行/列中已填size-1个数字，且当前数字是缺失的那个
                    if (rowNums.size === size - nat && !rowNums.has(num) ||
                        colNums.size === size - nat && !colNums.has(num)) {
                        
                        board[row][col] = num;
                        log_process(`[唯余法] ${getRowLetter(row+1)}${col+1}=${num}（行/列余${nat}数）`);
                        eliminate_Candidates(board, size, row, col, num);
                        return;
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查宫区块排除
function check_Box_Block_Elimination(board, size) {
    // 宫的大小定义（兼容6宫格）
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    // 遍历每个宫
    for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
        for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
            // 统计每个数字在该宫出现的候选格位置
            const numPositions = {};
            // 计算宫的起始行列
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];
            
            // 先检查宫中是否已有确定数字
            const existingNums = new Set();
            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                    if (typeof board[r][c] === 'number') {
                        existingNums.add(board[r][c]);
                    }
                }
            }

            for (let num = 1; num <= size; num++) {
                numPositions[num] = [];
                // 如果数字已存在，跳过统计
                if (existingNums.has(num)) continue;
                
                for (let r = startRow; r < startRow + boxSize[0]; r++) {
                    for (let c = startCol; c < startCol + boxSize[1]; c++) {
                        const cell = board[r][c];
                        if (Array.isArray(cell) && cell.includes(num)) {
                            numPositions[num].push([r, c]);
                        }
                    }
                }

                // 区块排除法逻辑
                if (numPositions[num].length > 1) {
                    // 检查是否全部在同一行
                    const allSameRow = numPositions[num].every(([r, _]) => r === numPositions[num][0][0]);
                    // 检查是否全部在同一列
                    const allSameCol = numPositions[num].every(([_, c]) => c === numPositions[num][0][1]);

                    if (allSameRow) {
                        const targetRow = numPositions[num][0][0];
                        let excludedCells = [];
                        
                        // 删除该行其他宫中该数字的候选
                        for (let col = 0; col < size; col++) {
                            if (col < startCol || col >= startCol + boxSize[1]) {
                                const cell = board[targetRow][col];
                                if (Array.isArray(cell) && cell.includes(num)) {
                                    board[targetRow][col] = cell.filter(n => n !== num);
                                    excludedCells.push(`${getRowLetter(targetRow+1)}${col+1}`);
                                }
                            }
                        }

                        if (excludedCells.length > 0) {
                            const blockCells = numPositions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                            log_process(`[宫区块排除] ${blockCells}构成${num}区块，排除${excludedCells.join('、')}的${num}`);
                            return;
                        }
                    }

                    if (allSameCol) {
                        const targetCol = numPositions[num][0][1];
                        let excludedCells = [];
                        // 删除该列其他宫中该数字的候选
                        for (let row = 0; row < size; row++) {
                            if (row < startRow || row >= startRow + boxSize[0]) {
                                const cell = board[row][targetCol];
                                if (Array.isArray(cell) && cell.includes(num)) {
                                    board[row][targetCol] = cell.filter(n => n !== num);
                                    excludedCells.push(`${getRowLetter(row+1)}${targetCol+1}`);
                                }
                            }
                        }
                        if (excludedCells.length > 0) {
                            const blockCells = numPositions[num].map(pos => `${getRowLetter(pos[0]+1)}${pos[1]+1}`).join('、');
                            log_process(`[宫区块排除] ${blockCells}构成${num}区块，排除${excludedCells.join('、')}的${num}`);
                            return;
                        }
                    }
                }

                // 原有单一候选数逻辑
                if (numPositions[num].length === 1) {
                    // const [row, col] = numPositions[num][0];
                    // const cell = board[row][col];
                    // if (Array.isArray(cell) && cell.includes(num)) {
                    //     board[row][col] = num;
                    //     log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                    //     eliminate_Candidates(board, size, row, col, num);
                    // }
                } else if (numPositions[num].length === 0) {
                    hasConflict = true;
                    const boxNum = boxRow * (size / boxSize[1]) + boxCol + 1;
                    log_process(`[冲突] ${boxNum}宫中数字${num}无可填入位置，无解`);
                    // log_process(`[冲突] ${boxRow*3+boxCol+1}宫中数字${num}无可填入位置，无解`);
                    return true;
                }
            }
        }
    }
    return hasConflict;
}

// 检查行区块排除
function check_Row_Block_Elimination(board, size) {
    // 宫的大小定义（兼容6宫格）
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    for (let row = 0; row < size; row++) {
        // 统计每个数字在该行出现的候选格位置
        const numPositions = {};
        // 先检查行中是否已有确定数字
        const existingNums = new Set();
        for (let col = 0; col < size; col++) {
            if (typeof board[row][col] === 'number') {
                existingNums.add(board[row][col]);
            }
        }

        for (let num = 1; num <= size; num++) {
            numPositions[num] = [];
            // 如果数字已存在，跳过统计
            if (existingNums.has(num)) continue;

            for (let col = 0; col < size; col++) {
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    numPositions[num].push(col);
                }
            }

            // 行区块排除逻辑
            if (numPositions[num].length > 1) {
                // 检查这些候选格是否都在同一个宫内
                const firstBoxCol = Math.floor(numPositions[num][0] / boxSize[1]);
                const allSameBox = numPositions[num].every(col => 
                    Math.floor(col / boxSize[1]) === firstBoxCol
                );

                if (allSameBox) {
                    const boxCol = firstBoxCol;
                    const startCol = boxCol * boxSize[1];
                    const boxRow = Math.floor(row / boxSize[0]);
                    const startRow = boxRow * boxSize[0];
                    let excludedCells = [];

                    // 从该宫的其他行中排除该数字
                    for (let r = startRow; r < startRow + boxSize[0]; r++) {
                        if (r === row) continue; // 跳过当前行
                        for (let c = startCol; c < startCol + boxSize[1]; c++) {
                            const cell = board[r][c];
                            if (Array.isArray(cell) && cell.includes(num)) {
                                board[r][c] = cell.filter(n => n !== num);
                                excludedCells.push(`${getRowLetter(r+1)}${c+1}`);
                            }
                        }
                    }

                    if (excludedCells.length > 0) {
                        const blockCells = numPositions[num].map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
                        log_process(`[行区块排除] ${blockCells}构成${num}区块，排除${excludedCells.join('、')}的${num}`);
                        return;
                    }
                }
            }

            // 原有行排除逻辑
            if (numPositions[num].length === 1) {
                // const col = numPositions[num][0];
                // const cell = board[row][col];
                // if (Array.isArray(cell) && cell.includes(num)) {
                //     board[row][col] = num;
                //     log_process(`[行排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                //     eliminate_Candidates(board, size, row, col, num);
                // }
            } else if (numPositions[num].length === 0) {
                hasConflict = true;
                log_process(`[冲突] ${getRowLetter(row+1)}行数字${num}无可填入位置，无解`);
                return true;
            }
        }
    }
    return hasConflict;
}

// 检查列区块排除
function check_Col_Block_Elimination(board, size) {
    // 宫的大小定义（兼容6宫格）
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    for (let col = 0; col < size; col++) {
        // 统计每个数字在该列出现的候选格位置
        const numPositions = {};
        
        // 先检查列中是否已有确定数字
        const existingNums = new Set();
        for (let row = 0; row < size; row++) {
            if (typeof board[row][col] === 'number') {
                existingNums.add(board[row][col]);
            }
        }
        
        for (let num = 1; num <= size; num++) {
            numPositions[num] = [];
            // 如果数字已存在，跳过统计
            if (existingNums.has(num)) continue;
            
            for (let row = 0; row < size; row++) {
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    numPositions[num].push(row);
                }
            }
            
            // 列区块排除逻辑
            if (numPositions[num].length > 1) {
                // 检查这些候选格是否都在同一个宫内
                const firstBoxRow = Math.floor(numPositions[num][0] / boxSize[0]);
                const allSameBox = numPositions[num].every(row =>
                    Math.floor(row / boxSize[0]) === firstBoxRow
                );
                
                if (allSameBox) {
                    const boxRow = firstBoxRow;
                    const startRow = boxRow * boxSize[0];
                    const boxCol = Math.floor(col / boxSize[1]);
                    const startCol = boxCol * boxSize[1];
                    let excludedCells = [];
                    
                    // 从该宫的其他列中排除该数字
                    for (let c = startCol; c < startCol + boxSize[1]; c++) {
                        if (c === col) continue; // 跳过当前列
                        for (let r = startRow; r < startRow + boxSize[0]; r++) {
                            const cell = board[r][c];
                            if (Array.isArray(cell) && cell.includes(num)) {
                                board[r][c] = cell.filter(n => n !== num);
                                excludedCells.push(`${getRowLetter(r+1)}${c+1}`);
                            }
                        }
                    }
                    
                    if (excludedCells.length > 0) {
                        const blockCells = numPositions[num].map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
                        log_process(`[列区块排除] ${blockCells}构成${num}区块，排除${excludedCells.join('、')}的${num}`);
                        return;
                    }
                }
            }
            
            // 原有列排除逻辑
            if (numPositions[num].length === 1) {
                // const row = numPositions[num][0];
                // const cell = board[row][col];
                // if (Array.isArray(cell) && cell.includes(num)) {
                //     board[row][col] = num;
                //     log_process(`[列排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                //     eliminate_Candidates(board, size, row, col, num);
                // }
            } else if (numPositions[num].length === 0) {
                hasConflict = true;
                log_process(`[冲突] ${col+1}列数字${num}无可填入位置，无解`);
                return true;
            }
        }
    }
    return hasConflict;
}

// // 检查宫显性数组
// function check_Box_Subset_Elimination(board, size) {
//     // 宫的大小定义（兼容6宫格）
//     const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
//     let hasConflict = false;
    
//     // 遍历每个宫
//     for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
//         for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
//             // 计算宫的起始行列
//             const startRow = boxRow * boxSize[0];
//             const startCol = boxCol * boxSize[1];
            
//             // 收集宫内的所有候选格及其候选数
//             const candidates = [];
//             for (let r = startRow; r < startRow + boxSize[0]; r++) {
//                 for (let c = startCol; c < startCol + boxSize[1]; c++) {
//                     const cell = board[r][c];
//                     if (Array.isArray(cell)) {
//                         if (cell.length === 0) {
//                             hasConflict = true;
//                             log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
//                             return true;
//                         }
//                         candidates.push({
//                             pos: [r, c],
//                             nums: [...cell]
//                         });
//                     }
//                 }
//             }
            
//             // 检查所有可能的子集组合
//             for (let subsetSize = 2; subsetSize <= Math.min(size, candidates.length); subsetSize++) {
//                 const combinations = getCombinations(candidates, subsetSize);
                
//                 for (const combo of combinations) {
//                     // 跳过包含单候选数格子的组合（理论上不会发生，防御性检查）
//                     if (combo.some(c => c.nums.length <= 1)) continue;
                    
//                     // 合并所有候选数
//                     const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                    
//                     // 如果候选数数量等于子集大小，则形成数组关系
//                     if (unionNums.length === subsetSize) {
//                         const affectedCells = [];
                        
//                         // 从宫的其他格子中排除这些候选数
//                         for (const cell of candidates) {
//                             if (!combo.some(c => c.pos[0] === cell.pos[0] && c.pos[1] === cell.pos[1])) {
//                                 const originalLength = cell.nums.length;
//                                 cell.nums = cell.nums.filter(n => !unionNums.includes(n));
//                                 board[cell.pos[0]][cell.pos[1]] = cell.nums.filter(n => !unionNums.includes(n));
                                
//                                 if (cell.nums.length < originalLength) {
//                                     affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
//                                 }
//                             }
//                         }
                        
                        
//                         if (affectedCells.length > 0) {
//                             const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
//                             log_process(`[宫数组] ${subsetCells}构成${subsetSize}数数组${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
//                             return;
//                         }
//                     }
//                 }
//             }
//         }
//     }
    
//     return hasConflict;
// }
// 检查宫显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
function check_Box_Naked_Subset_Elimination(board, size, subsetSize = 2) {
    // 宫的大小定义（兼容6宫格）
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    // 遍历每个宫
    for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
        for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
            // 计算宫的起始行列
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];
            
            // 收集宫内的所有候选格及其候选数
            const candidates = [];
            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                    const cell = board[r][c];
                    if (Array.isArray(cell)) {
                        if (cell.length === 0) {
                            hasConflict = true;
                            log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
                            return true;
                        }
                        candidates.push({
                            pos: [r, c],
                            nums: [...cell]
                        });
                    }
                }
            }
            
            // 检查指定大小的组合
            const combinations = getCombinations(candidates, subsetSize);
            
            for (const combo of combinations) {
                // 合并所有候选数
                const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                
                // 如果合并后的候选数数量等于子集大小，则形成显性数组
                if (unionNums.length === subsetSize) {
                    const affectedCells = [];
                    
                    // 从宫的其他格子中排除这些候选数
                    for (const cell of candidates) {
                        if (!combo.some(c => c.pos[0] === cell.pos[0] && c.pos[1] === cell.pos[1])) {
                            const originalLength = cell.nums.length;
                            cell.nums = cell.nums.filter(n => !unionNums.includes(n));
                            board[cell.pos[0]][cell.pos[1]] = cell.nums;
                            
                            if (cell.nums.length < originalLength) {
                                affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                            }
                        }
                    }
                    
                    if (affectedCells.length > 0) {
                        const subsetName = subsetSize === 2 ? '数对' : subsetSize === 3 ? '三数组' : '四数组';
                        const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                        log_process(`[宫显性${subsetName}] ${subsetCells}构成${subsetName}${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
                        return;
                    }
                }
            }
        }
    }
    
    return hasConflict;
}
// // 检查行显性数组
// function check_Row_Subset_Elimination(board, size) {
//     let hasConflict = false;
    
//     for (let row = 0; row < size; row++) {
//         // 收集行内的所有候选格及其候选数
//         const candidates = [];
//         for (let col = 0; col < size; col++) {
//             const cell = board[row][col];
//             if (Array.isArray(cell)) {
//                 if (cell.length === 0) {
//                     hasConflict = true;
//                     log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
//                     return true;
//                 }
//                 candidates.push({
//                     pos: [row, col],
//                     nums: [...cell]
//                 });
//             }
//         }
        
//         // 检查所有可能的子集组合
//         for (let subsetSize = 2; subsetSize <= Math.min(size, candidates.length); subsetSize++) {
//             const combinations = getCombinations(candidates, subsetSize);
            
//             for (const combo of combinations) {
//                 // 跳过包含单候选数格子的组合（理论上不会发生，防御性检查）
//                 if (combo.some(c => c.nums.length <= 1)) continue;

//                 // 合并所有候选数
//                 const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                
//                 // 如果候选数数量等于子集大小，则形成数组关系
//                 if (unionNums.length === subsetSize) {
//                     const affectedCells = [];
                    
//                     // 从行的其他格子中排除这些候选数
//                     for (const cell of candidates) {
//                         if (!combo.some(c => c.pos[1] === cell.pos[1])) {
//                             const originalLength = cell.nums.length;
//                             cell.nums = cell.nums.filter(n => !unionNums.includes(n));
//                             board[cell.pos[0]][cell.pos[1]] = cell.nums;
                            
//                             if (cell.nums.length < originalLength) {
//                                 affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
//                             }
//                         }
//                     }
                    
//                     if (affectedCells.length > 0) {
//                         const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
//                         log_process(`[行数组] ${subsetCells}构成${subsetSize}数数组${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
//                         return;
//                     }
//                 }
//             }
//         }
//     }
    
//     return hasConflict;
// }

// // 检查列显性数组
// function check_Col_Subset_Elimination(board, size) {
//     let hasConflict = false;
    
//     for (let col = 0; col < size; col++) {
//         // 收集列内的所有候选格及其候选数
//         const candidates = [];
//         for (let row = 0; row < size; row++) {
//             const cell = board[row][col];
//             if (Array.isArray(cell)) {
//                 if (cell.length === 0) {
//                     hasConflict = true;
//                     log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
//                     return true;
//                 }
//                 candidates.push({
//                     pos: [row, col],
//                     nums: [...cell]
//                 });
//             }
//         }
        
//         // 检查所有可能的子集组合
//         for (let subsetSize = 2; subsetSize <= Math.min(size, candidates.length); subsetSize++) {
//             const combinations = getCombinations(candidates, subsetSize);
            
//             for (const combo of combinations) {
//                 // 跳过包含单候选数格子的组合（理论上不会发生，防御性检查）
//                 if (combo.some(c => c.nums.length <= 1)) continue;

//                 // 合并所有候选数
//                 const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                
//                 // 如果候选数数量等于子集大小，则形成数组关系
//                 if (unionNums.length === subsetSize) {
//                     const affectedCells = [];
                    
//                     // 从列的其他格子中排除这些候选数
//                     for (const cell of candidates) {
//                         if (!combo.some(c => c.pos[0] === cell.pos[0])) {
//                             const originalLength = cell.nums.length;
//                             cell.nums = cell.nums.filter(n => !unionNums.includes(n));
//                             board[cell.pos[0]][cell.pos[1]] = cell.nums;
                            
//                             if (cell.nums.length < originalLength) {
//                                 affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
//                             }
//                         }
//                     }
                    
//                     if (affectedCells.length > 0) {
//                         const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
//                         log_process(`[列数组] ${subsetCells}构成${subsetSize}数数组${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
//                         return;
//                     }
//                 }
//             }
//         }
//     }
    
//     return hasConflict;
// }
// 检查行显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
function check_Row_Naked_Subset_Elimination(board, size, subsetSize = 2) {
    let hasConflict = false;
    
    for (let row = 0; row < size; row++) {
        // 收集行内的所有候选格及其候选数
        const candidates = [];
        for (let col = 0; col < size; col++) {
            const cell = board[row][col];
            if (Array.isArray(cell)) {
                if (cell.length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidates.push({
                    pos: [row, col],
                    nums: [...cell]
                });
            }
        }
        
        // 检查指定大小的组合
        const combinations = getCombinations(candidates, subsetSize);
        
        for (const combo of combinations) {
            // 合并所有候选数
            const unionNums = [...new Set(combo.flatMap(c => c.nums))];
            
            // 如果合并后的候选数数量等于子集大小，则形成显性数组
            if (unionNums.length === subsetSize) {
                const affectedCells = [];
                
                // 从行的其他格子中排除这些候选数
                for (const cell of candidates) {
                    if (!combo.some(c => c.pos[1] === cell.pos[1])) {
                        const originalLength = cell.nums.length;
                        cell.nums = cell.nums.filter(n => !unionNums.includes(n));
                        board[cell.pos[0]][cell.pos[1]] = cell.nums;
                        
                        if (cell.nums.length < originalLength) {
                            affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                        }
                    }
                }
                
                if (affectedCells.length > 0) {
                    const subsetName = subsetSize === 2 ? '数对' : subsetSize === 3 ? '三数组' : '四数组';
                    const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                    log_process(`[行显性${subsetName}] ${subsetCells}构成${subsetName}${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
                    return;
                }
            }
        }
    }
    
    return hasConflict;
}

// 检查列显性数组（可指定子集大小：2=数对，3=三数组，4=四数组）
function check_Col_Naked_Subset_Elimination(board, size, subsetSize = 2) {
    let hasConflict = false;
    
    for (let col = 0; col < size; col++) {
        // 收集列内的所有候选格及其候选数
        const candidates = [];
        for (let row = 0; row < size; row++) {
            const cell = board[row][col];
            if (Array.isArray(cell)) {
                if (cell.length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidates.push({
                    pos: [row, col],
                    nums: [...cell]
                });
            }
        }
        
        // 检查指定大小的组合
        const combinations = getCombinations(candidates, subsetSize);
        
        for (const combo of combinations) {
            // 合并所有候选数
            const unionNums = [...new Set(combo.flatMap(c => c.nums))];
            
            // 如果合并后的候选数数量等于子集大小，则形成显性数组
            if (unionNums.length === subsetSize) {
                const affectedCells = [];
                
                // 从列的其他格子中排除这些候选数
                for (const cell of candidates) {
                    if (!combo.some(c => c.pos[0] === cell.pos[0])) {
                        const originalLength = cell.nums.length;
                        cell.nums = cell.nums.filter(n => !unionNums.includes(n));
                        board[cell.pos[0]][cell.pos[1]] = cell.nums;
                        
                        if (cell.nums.length < originalLength) {
                            affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                        }
                    }
                }
                
                if (affectedCells.length > 0) {
                    const subsetName = subsetSize === 2 ? '数对' : subsetSize === 3 ? '三数组' : '四数组';
                    const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                    log_process(`[列显性${subsetName}] ${subsetCells}构成${subsetName}${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
                    return;
                }
            }
        }
    }
    
    return hasConflict;
}
// 检查宫隐性数对
function check_Box_Hidden_Pair_Elimination(board, size) {
  const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
  let hasConflict = false;
  
  // 遍历每个宫
  for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
    for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
      const startRow = boxRow * boxSize[0];
      const startCol = boxCol * boxSize[1];
      
      // 收集宫内的所有候选格
      const candidateCells = [];
      for (let r = startRow; r < startRow + boxSize[0]; r++) {
        for (let c = startCol; c < startCol + boxSize[1]; c++) {
          if (Array.isArray(board[r][c])) {
            if (board[r][c].length === 0) {
              hasConflict = true;
              log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
              return true;
            }
            candidateCells.push([r, c]);
          }
        }
      }
      
      // 检查1-size的所有数字组合（仅检查数对）
      for (let num1 = 1; num1 <= size; num1++) {
        for (let num2 = num1 + 1; num2 <= size; num2++) {
          // 统计这两个数字在哪些候选格中出现
          const positions = [];
          for (const [r, c] of candidateCells) {
            if (board[r][c].includes(num1) || board[r][c].includes(num2)) {
              positions.push([r, c]);
            }
          }
          
          // 如果这两个数字出现的候选格正好是两个
          if (positions.length === 2) {
            // 检查这两个格子是否都包含这两个数字
            let isPair = true;
            for (const [r, c] of positions) {
              if (!board[r][c].includes(num1) || !board[r][c].includes(num2)) {
                isPair = false;
                break;
              }
            }
            
            if (isPair) {
              let modified = false;
              // 从这两个格子中删除其他数字
              for (const [r, c] of positions) {
                const originalLength = board[r][c].length;
                board[r][c] = board[r][c].filter(n => n === num1 || n === num2);
                if (board[r][c].length < originalLength) {
                  modified = true;
                }
              }
              
              if (modified) {
                const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
                log_process(`[宫隐性数对] ${cells}构成隐性数对${num1}${num2}，删除其他候选数`);
                return;
              }
            }
          }
        }
      }
    }
  }
  return hasConflict;
}

// 检查宫隐性三数组
function check_Box_Hidden_Triple_Elimination(board, size) {
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    // 遍历每个宫
    for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
        for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];
            
            // 收集宫内的所有候选格
            const candidateCells = [];
            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                    if (Array.isArray(board[r][c])) {
                        if (board[r][c].length === 0) {
                            hasConflict = true;
                            log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
                            return true;
                        }
                        candidateCells.push([r, c]);
                    }
                }
            }
            
            // 检查1-size的所有数字组合（仅检查三数组）
            for (let num1 = 1; num1 <= size; num1++) {
                for (let num2 = num1 + 1; num2 <= size; num2++) {
                    for (let num3 = num2 + 1; num3 <= size; num3++) {
                        // 统计这三个数字在哪些候选格中出现
                        const positions = [];
                        for (const [r, c] of candidateCells) {
                            if (board[r][c].includes(num1) || board[r][c].includes(num2) || board[r][c].includes(num3)) {
                                positions.push([r, c]);
                            }
                        }
                        
                        // 如果这三个数字出现的候选格正好是三个
                        if (positions.length === 3) {
                            // 检查这三个格子是否都包含这三个数字中的至少两个
                            let isTriple = true;
                            for (const [r, c] of positions) {
                                // const count = [num1, num2, num3].filter(n => board[r][c].includes(n)).length;
                                // if (count < 2) {
                                //     isTriple = false;
                                //     break;
                                // }
                                if (!board[r][c].includes(num1) || !board[r][c].includes(num2) || !board[r][c].includes(num3)) {
                                    isTriple = false;
                                    break;
                                }
                            }
                            
                            if (isTriple) {
                                let modified = false;
                                // 从这三个格子中删除其他数字
                                for (const [r, c] of positions) {
                                    const originalLength = board[r][c].length;
                                    board[r][c] = board[r][c].filter(n => n === num1 || n === num2 || n === num3);
                                    if (board[r][c].length < originalLength) {
                                        modified = true;
                                    }
                                }
                                
                                if (modified) {
                                    const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
                                    log_process(`[宫隐性三数组] ${cells}构成隐性三数组${num1}${num2}${num3}，删除其他候选数`);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查宫隐性四数组
function check_Box_Hidden_Quad_Elimination(board, size) {
    const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    let hasConflict = false;
    
    // 遍历每个宫
    for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
        for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
            const startRow = boxRow * boxSize[0];
            const startCol = boxCol * boxSize[1];
            
            // 收集宫内的所有候选格
            const candidateCells = [];
            for (let r = startRow; r < startRow + boxSize[0]; r++) {
                for (let c = startCol; c < startCol + boxSize[1]; c++) {
                    if (Array.isArray(board[r][c])) {
                        if (board[r][c].length === 0) {
                            hasConflict = true;
                            log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
                            return true;
                        }
                        candidateCells.push([r, c]);
                    }
                }
            }
            
            // 检查1-size的所有数字组合（仅检查四数组）
            for (let num1 = 1; num1 <= size; num1++) {
                for (let num2 = num1 + 1; num2 <= size; num2++) {
                    for (let num3 = num2 + 1; num3 <= size; num3++) {
                        for (let num4 = num3 + 1; num4 <= size; num4++) {
                            // 统计这四个数字在哪些候选格中出现
                            const positions = [];
                            for (const [r, c] of candidateCells) {
                                if (board[r][c].includes(num1) || board[r][c].includes(num2) || 
                                    board[r][c].includes(num3) || board[r][c].includes(num4)) {
                                    positions.push([r, c]);
                                }
                            }
                            
                            // 如果这四个数字出现的候选格正好是四个
                            if (positions.length === 4) {
                                // 检查这四个格子是否都包含这四个数字中的至少两个
                                let isQuad = true;
                                for (const [r, c] of positions) {
                                    // const count = [num1, num2, num3, num4].filter(n => board[r][c].includes(n)).length;
                                    // if (count < 2) {
                                    //     isQuad = false;
                                    //     break;
                                    // }
                                    if (!board[r][c].includes(num1) || !board[r][c].includes(num2) || !board[r][c].includes(num3) || !board[r][c].includes(num4)) {
                                        isQuad = false;
                                        break;
                                    }
                                }
                                
                                if (isQuad) {
                                    let modified = false;
                                    // 从这四个格子中删除其他数字
                                    for (const [r, c] of positions) {
                                        const originalLength = board[r][c].length;
                                        board[r][c] = board[r][c].filter(n => n === num1 || n === num2 || n === num3 || n === num4);
                                        if (board[r][c].length < originalLength) {
                                            modified = true;
                                        }
                                    }
                                    
                                    if (modified) {
                                        const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
                                        log_process(`[宫隐性四数组] ${cells}构成隐性四数组${num1}${num2}${num3}${num4}，删除其他候选数`);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查行隐性数对
function check_Row_Hidden_Pair_Elimination(board, size) {
    let hasConflict = false;
    
    for (let row = 0; row < size; row++) {
        // 收集行内的所有候选格
        const candidateCells = [];
        for (let col = 0; col < size; col++) {
            if (Array.isArray(board[row][col])) {
                if (board[row][col].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidateCells.push(col);
            }
        }
        
        // 检查1-size的所有数字组合（仅检查数对）
        for (let num1 = 1; num1 <= size; num1++) {
            for (let num2 = num1 + 1; num2 <= size; num2++) {
                // 统计这两个数字在哪些候选格中出现
                const positions = [];
                for (const col of candidateCells) {
                    if (board[row][col].includes(num1) || board[row][col].includes(num2)) {
                        positions.push(col);
                    }
                }
                
                // 如果这两个数字出现的候选格正好是两个
                if (positions.length === 2) {
                    // 检查这两个格子是否都包含这两个数字
                    let isPair = true;
                    for (const col of positions) {
                        if (!board[row][col].includes(num1) || !board[row][col].includes(num2)) {
                            isPair = false;
                            break;
                        }
                    }
                    
                    if (isPair) {
                        let modified = false;
                        // 从这两个格子中删除其他数字
                        for (const col of positions) {
                            const originalLength = board[row][col].length;
                            board[row][col] = board[row][col].filter(n => n === num1 || n === num2);
                            if (board[row][col].length < originalLength) {
                                modified = true;
                            }
                        }
                        
                        if (modified) {
                            const cells = positions.map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
                            log_process(`[行隐性数对] ${cells}构成隐性数对${num1}${num2}，删除其他候选数`);
                            return;
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查行隐性三数组
function check_Row_Hidden_Triple_Elimination(board, size) {
    let hasConflict = false;
    
    for (let row = 0; row < size; row++) {
        // 收集行内的所有候选格
        const candidateCells = [];
        for (let col = 0; col < size; col++) {
            if (Array.isArray(board[row][col])) {
                if (board[row][col].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidateCells.push(col);
            }
        }
        
        // 检查1-size的所有数字组合（仅检查三数组）
        for (let num1 = 1; num1 <= size; num1++) {
            for (let num2 = num1 + 1; num2 <= size; num2++) {
                for (let num3 = num2 + 1; num3 <= size; num3++) {
                    // 统计这三个数字在哪些候选格中出现
                    const positions = [];
                    for (const col of candidateCells) {
                        if (board[row][col].includes(num1) || board[row][col].includes(num2) || board[row][col].includes(num3)) {
                            positions.push(col);
                        }
                    }
                    
                    // 如果这三个数字出现的候选格正好是三个
                    if (positions.length === 3) {
                        // 检查这三个格子是否都包含这三个数字中的至少两个
                        let isTriple = true;
                        for (const col of positions) {
                            if (!board[row][col].includes(num1) || !board[row][col].includes(num2) || !board[row][col].includes(num3)) {
                                isTriple = false;
                                break;
                            }
                        }
                        
                        if (isTriple) {
                            let modified = false;
                            // 从这三个格子中删除其他数字
                            for (const col of positions) {
                                const originalLength = board[row][col].length;
                                board[row][col] = board[row][col].filter(n => n === num1 || n === num2 || n === num3);
                                if (board[row][col].length < originalLength) {
                                    modified = true;
                                }
                            }
                            
                            if (modified) {
                                const cells = positions.map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
                                log_process(`[行隐性三数组] ${cells}构成隐性三数组${num1}${num2}${num3}，删除其他候选数`);
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查行隐性四数组
function check_Row_Hidden_Quad_Elimination(board, size) {
    let hasConflict = false;
    
    for (let row = 0; row < size; row++) {
        // 收集行内的所有候选格
        const candidateCells = [];
        for (let col = 0; col < size; col++) {
            if (Array.isArray(board[row][col])) {
                if (board[row][col].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidateCells.push(col);
            }
        }
        
        // 检查1-size的所有数字组合（仅检查四数组）
        for (let num1 = 1; num1 <= size; num1++) {
            for (let num2 = num1 + 1; num2 <= size; num2++) {
                for (let num3 = num2 + 1; num3 <= size; num3++) {
                    for (let num4 = num3 + 1; num4 <= size; num4++) {
                        // 统计这四个数字在哪些候选格中出现
                        const positions = [];
                        for (const col of candidateCells) {
                            if (board[row][col].includes(num1) || board[row][col].includes(num2) || 
                                board[row][col].includes(num3) || board[row][col].includes(num4)) {
                                positions.push(col);
                            }
                        }
                        
                        // 如果这四个数字出现的候选格正好是四个
                        if (positions.length === 4) {
                            // 检查这四个格子是否都包含这四个数字中的至少两个
                            let isQuad = true;
                            for (const col of positions) {
                                if (!board[row][col].includes(num1) || !board[row][col].includes(num2) || !board[row][col].includes(num3) || !board[row][col].includes(num4)) {
                                    isQuad = false;
                                    break;
                                }
                            }
                            
                            if (isQuad) {
                                let modified = false;
                                // 从这四个格子中删除其他数字
                                for (const col of positions) {
                                    const originalLength = board[row][col].length;
                                    board[row][col] = board[row][col].filter(n => n === num1 || n === num2 || n === num3 || n === num4);
                                    if (board[row][col].length < originalLength) {
                                        modified = true;
                                    }
                                }
                                
                                if (modified) {
                                    const cells = positions.map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
                                    log_process(`[行隐性四数组] ${cells}构成隐性四数组${num1}${num2}${num3}${num4}，删除其他候选数`);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查列隐性数对
function check_Col_Hidden_Pair_Elimination(board, size) {
    let hasConflict = false;
    
    for (let col = 0; col < size; col++) {
        // 收集列内的所有候选格
        const candidateCells = [];
        for (let row = 0; row < size; row++) {
            if (Array.isArray(board[row][col])) {
                if (board[row][col].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidateCells.push(row);
            }
        }
        
        // 检查1-size的所有数字组合（仅检查数对）
        for (let num1 = 1; num1 <= size; num1++) {
            for (let num2 = num1 + 1; num2 <= size; num2++) {
                // 统计这两个数字在哪些候选格中出现
                const positions = [];
                for (const row of candidateCells) {
                    if (board[row][col].includes(num1) || board[row][col].includes(num2)) {
                        positions.push(row);
                    }
                }
                
                // 如果这两个数字出现的候选格正好是两个
                if (positions.length === 2) {
                    // 检查这两个格子是否都包含这两个数字
                    let isPair = true;
                    for (const row of positions) {
                        if (!board[row][col].includes(num1) || !board[row][col].includes(num2)) {
                            isPair = false;
                            break;
                        }
                    }
                    
                    if (isPair) {
                        let modified = false;
                        // 从这两个格子中删除其他数字
                        for (const row of positions) {
                            const originalLength = board[row][col].length;
                            board[row][col] = board[row][col].filter(n => n === num1 || n === num2);
                            if (board[row][col].length < originalLength) {
                                modified = true;
                            }
                        }
                        
                        if (modified) {
                            const cells = positions.map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
                            log_process(`[列隐性数对] ${cells}构成隐性数对${num1}${num2}，删除其他候选数`);
                            return;
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查列隐性三数组
function check_Col_Hidden_Triple_Elimination(board, size) {
    let hasConflict = false;
    
    for (let col = 0; col < size; col++) {
        // 收集列内的所有候选格
        const candidateCells = [];
        for (let row = 0; row < size; row++) {
            if (Array.isArray(board[row][col])) {
                if (board[row][col].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidateCells.push(row);
            }
        }
        
        // 检查1-size的所有数字组合（仅检查三数组）
        for (let num1 = 1; num1 <= size; num1++) {
            for (let num2 = num1 + 1; num2 <= size; num2++) {
                for (let num3 = num2 + 1; num3 <= size; num3++) {
                    // 统计这三个数字在哪些候选格中出现
                    const positions = [];
                    for (const row of candidateCells) {
                        if (board[row][col].includes(num1) || board[row][col].includes(num2) || board[row][col].includes(num3)) {
                            positions.push(row);
                        }
                    }
                    
                    // 如果这三个数字出现的候选格正好是三个
                    if (positions.length === 3) {
                        // 检查这三个格子是否都包含这三个数字中的至少两个
                        let isTriple = true;
                        for (const row of positions) {
                            if (!board[row][col].includes(num1) || !board[row][col].includes(num2) || !board[row][col].includes(num3)) {
                                isTriple = false;
                                break;
                            }
                        }
                        
                        if (isTriple) {
                            let modified = false;
                            // 从这三个格子中删除其他数字
                            for (const row of positions) {
                                const originalLength = board[row][col].length;
                                board[row][col] = board[row][col].filter(n => n === num1 || n === num2 || n === num3);
                                if (board[row][col].length < originalLength) {
                                    modified = true;
                                }
                            }
                            
                            if (modified) {
                                const cells = positions.map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
                                log_process(`[列隐性三数组] ${cells}构成隐性三数组${num1}${num2}${num3}，删除其他候选数`);
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// 检查列隐性四数组
function check_Col_Hidden_Quad_Elimination(board, size) {
    let hasConflict = false;
    
    for (let col = 0; col < size; col++) {
        // 收集列内的所有候选格
        const candidateCells = [];
        for (let row = 0; row < size; row++) {
            if (Array.isArray(board[row][col])) {
                if (board[row][col].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
                }
                candidateCells.push(row);
            }
        }
        
        // 检查1-size的所有数字组合（仅检查四数组）
        for (let num1 = 1; num1 <= size; num1++) {
            for (let num2 = num1 + 1; num2 <= size; num2++) {
                for (let num3 = num2 + 1; num3 <= size; num3++) {
                    for (let num4 = num3 + 1; num4 <= size; num4++) {
                        // 统计这四个数字在哪些候选格中出现
                        const positions = [];
                        for (const row of candidateCells) {
                            if (board[row][col].includes(num1) || board[row][col].includes(num2) || 
                                board[row][col].includes(num3) || board[row][col].includes(num4)) {
                                positions.push(row);
                            }
                        }
                        
                        // 如果这四个数字出现的候选格正好是四个
                        if (positions.length === 4) {
                            // 检查这四个格子是否都包含这四个数字中的至少两个
                            let isQuad = true;
                            for (const row of positions) {
                                if (!board[row][col].includes(num1) || !board[row][col].includes(num2) || !board[row][col].includes(num3) || !board[row][col].includes(num4)) {
                                    isQuad = false;
                                    break;
                                }
                            }
                            
                            if (isQuad) {
                                let modified = false;
                                // 从这四个格子中删除其他数字
                                for (const row of positions) {
                                    const originalLength = board[row][col].length;
                                    board[row][col] = board[row][col].filter(n => n === num1 || n === num2 || n === num3 || n === num4);
                                    if (board[row][col].length < originalLength) {
                                        modified = true;
                                    }
                                }
                                
                                if (modified) {
                                    const cells = positions.map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
                                    log_process(`[列隐性四数组] ${cells}构成隐性四数组${num1}${num2}${num3}${num4}，删除其他候选数`);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return hasConflict;
}

// // 检查宫隐性数组
// function check_Box_Hidden_Subset_Elimination(board, size) {
//     const boxSize = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
//     let hasConflict = false;
    
//     // 遍历每个宫
//     for (let boxRow = 0; boxRow < size / boxSize[0]; boxRow++) {
//         for (let boxCol = 0; boxCol < size / boxSize[1]; boxCol++) {
//             const startRow = boxRow * boxSize[0];
//             const startCol = boxCol * boxSize[1];
            
//             // 收集宫内的所有候选格
//             const candidateCells = [];
//             for (let r = startRow; r < startRow + boxSize[0]; r++) {
//                 for (let c = startCol; c < startCol + boxSize[1]; c++) {
//                     if (Array.isArray(board[r][c])) {
//                         if (board[r][c].length === 0) {
//                             hasConflict = true;
//                             log_process(`[冲突] ${getRowLetter(r+1)}${c+1}无候选数，无解`);
//                             return true;
//                         }
//                         candidateCells.push([r, c]);
//                     }
//                 }
//             }
            
//             // 检查1-size的所有数字
//             for (let num = 1; num <= size; num++) {
//                 // 统计数字num在哪些候选格中出现
//                 const positions = [];
//                 for (const [r, c] of candidateCells) {
//                     if (board[r][c].includes(num)) {
//                         positions.push([r, c]);
//                     }
//                 }
                
//                 // 如果数字num没有出现，跳过（可能是已填数字）
//                 if (positions.length === 0) continue;
                
//                 // 检查是否有其他数字与num共享相同的候选格
//                 const sharedNums = new Set([num]);
//                 for (let otherNum = num + 1; otherNum <= size; otherNum++) {
//                     let samePositions = true;
//                     for (const [r, c] of candidateCells) {
//                         const hasNum = board[r][c].includes(num);
//                         const hasOtherNum = board[r][c].includes(otherNum);
//                         if (hasNum !== hasOtherNum) {
//                             samePositions = false;
//                             break;
//                         }
//                     }
//                     if (samePositions) {
//                         sharedNums.add(otherNum);
//                     }
//                 }
                
//                 // 如果共享候选格的数字数量等于候选格数量，形成隐性数组
//                 if (sharedNums.size === positions.length && sharedNums.size > 1) {
//                     const nums = Array.from(sharedNums);
//                     let modified = false;
                    
//                     // 从这些格子中删除其他数字
//                     for (const [r, c] of positions) {
//                         const originalLength = board[r][c].length;
//                         board[r][c] = board[r][c].filter(n => nums.includes(n));
                        
//                         if (board[r][c].length < originalLength) {
//                             modified = true;
//                         }
//                     }
                    
//                     if (modified) {
//                         const cells = positions.map(([r, c]) => `${getRowLetter(r+1)}${c+1}`).join('、');
//                         log_process(`[宫隐性数组] ${cells}构成隐性数组${nums.join('')}，删除其他候选数`);
//                         return;
//                     }
//                 }
//             }
//         }
//     }
//     return hasConflict;
// }

// // 检查行隐性数组排除
// function check_Row_Hidden_Subset_Elimination(board, size) {
//     let hasConflict = false;
    
//     for (let row = 0; row < size; row++) {
//         // 收集行内的所有候选格
//         const candidateCells = [];
//         for (let col = 0; col < size; col++) {
//             if (Array.isArray(board[row][col])) {
//                 if (board[row][col].length === 0) {
//                     hasConflict = true;
//                     log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
//                     return true;
//                 }
//                 candidateCells.push(col);
//             }
//         }
        
//         // 检查1-size的所有数字
//         for (let num = 1; num <= size; num++) {
//             // 统计数字num在哪些候选格中出现
//             const positions = [];
//             for (const col of candidateCells) {
//                 if (board[row][col].includes(num)) {
//                     positions.push(col);
//                 }
//             }
            
//             if (positions.length === 0) continue;
            
//             // 检查共享相同候选格的数字
//             const sharedNums = new Set([num]);
//             for (let otherNum = num + 1; otherNum <= size; otherNum++) {
//                 let samePositions = true;
//                 for (const col of candidateCells) {
//                     const hasNum = board[row][col].includes(num);
//                     const hasOtherNum = board[row][col].includes(otherNum);
//                     if (hasNum !== hasOtherNum) {
//                         samePositions = false;
//                         break;
//                     }
//                 }
//                 if (samePositions) {
//                     sharedNums.add(otherNum);
//                 }
//             }
            
//             // 形成隐性数组
//             if (sharedNums.size === positions.length && sharedNums.size > 1) {
//                 const nums = Array.from(sharedNums);
//                 let modified = false;
                
//                 for (const col of positions) {
//                     const originalLength = board[row][col].length;
//                     board[row][col] = board[row][col].filter(n => nums.includes(n));
                    
//                     if (board[row][col].length < originalLength) {
//                         modified = true;
//                     }
//                 }
                
//                 if (modified) {
//                     const cells = positions.map(col => `${getRowLetter(row+1)}${col+1}`).join('、');
//                     log_process(`[行隐性数组] ${cells}构成隐性数组${nums.join('')}，删除其他候选数`);
//                     return;
//                 }
//             }
//         }
//     }
//     return hasConflict;
// }

// // 检查列隐性数组排除
// function check_Col_Hidden_Subset_Elimination(board, size) {
//     let hasConflict = false;
    
//     for (let col = 0; col < size; col++) {
//         // 收集列内的所有候选格
//         const candidateCells = [];
//         for (let row = 0; row < size; row++) {
//             if (Array.isArray(board[row][col])) {
//                 if (board[row][col].length === 0) {
//                     hasConflict = true;
//                     log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
//                     return true;
//                 }
//                 candidateCells.push(row);
//             }
//         }
        
//         // 检查1-size的所有数字
//         for (let num = 1; num <= size; num++) {
//             // 统计数字num在哪些候选格中出现
//             const positions = [];
//             for (const row of candidateCells) {
//                 if (board[row][col].includes(num)) {
//                     positions.push(row);
//                 }
//             }
            
//             if (positions.length === 0) continue;
            
//             // 检查共享相同候选格的数字
//             const sharedNums = new Set([num]);
//             for (let otherNum = num + 1; otherNum <= size; otherNum++) {
//                 let samePositions = true;
//                 for (const row of candidateCells) {
//                     const hasNum = board[row][col].includes(num);
//                     const hasOtherNum = board[row][col].includes(otherNum);
//                     if (hasNum !== hasOtherNum) {
//                         samePositions = false;
//                         break;
//                     }
//                 }
//                 if (samePositions) {
//                     sharedNums.add(otherNum);
//                 }
//             }
            
//             // 形成隐性数组
//             if (sharedNums.size === positions.length && sharedNums.size > 1) {
//                 const nums = Array.from(sharedNums);
//                 let modified = false;
                
//                 for (const row of positions) {
//                     const originalLength = board[row][col].length;
//                     board[row][col] = board[row][col].filter(n => nums.includes(n));
                    
//                     if (board[row][col].length < originalLength) {
//                         modified = true;
//                     }
//                 }
                
//                 if (modified) {
//                     const cells = positions.map(row => `${getRowLetter(row+1)}${col+1}`).join('、');
//                     log_process(`[列隐性数组] ${cells}构成隐性数组${nums.join('')}，删除其他候选数`);
//                     return;
//                 }
//             }
//         }
//     }
//     return hasConflict;
// }