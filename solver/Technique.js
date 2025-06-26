import { state } from '../modules/state.js';
import { show_result, log_process } from '../modules/core.js';
import { eliminate_Candidates, isEqual, getCombinations, getRowLetter } from './solver_tool.js';

export function solve_By_Elimination(board, size) {
    let changed;
    do {
        changed = false;
        const initialBoard = JSON.parse(JSON.stringify(board));

        // 根据技巧开关状态执行不同的排除方法
        if (state.techniqueSettings?.boxElimination) {
            const Box_Conflict = check_Box_Elimination(board, size);
            if (Box_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.rowElimination) {
            const Row_Conflict = check_Row_Elimination(board, size);
            if (Row_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.colElimination) {
            const Col_Conflict = check_Col_Elimination(board, size);
            if (Col_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.cellElimination) {
            const Cell_Conflict = check_Cell_Elimination(board, size);
            if (Cell_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.boxBlock) {
            const Box_Block_Conflict = check_Box_Block_Elimination(board, size);
            if (Box_Block_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.rowBlock) {
            const Row_Block_Conflict = check_Row_Block_Elimination(board, size);
            if (Row_Block_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.colBlock) {
            const Col_Block_Conflict = check_Col_Block_Elimination(board, size);
            if (Col_Block_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.boxSubset) {
            const Box_Subset_Conflict = check_Box_Subset_Elimination(board, size);
            if (Box_Subset_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.rowSubset) {
            const Row_Subset_Conflict = check_Row_Subset_Elimination(board, size);
            if (Row_Subset_Conflict) return { changed: false, hasEmptyCandidate: true };
        }
        
        if (state.techniqueSettings?.colSubset) {
            const Col_Subset_Conflict = check_Col_Subset_Elimination(board, size);
            if (Col_Subset_Conflict) return { changed: false, hasEmptyCandidate: true };
        }

        changed = !isEqual(board, initialBoard);
    } while (changed);
    return { changed, hasEmptyCandidate: false };
}

// 检查宫唯一候选数
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
                    }
                } else if (numPositions[num].length === 0) {
                    hasConflict = true; // 直接标记冲突
                    log_process(`[冲突] ${boxRow*3+boxCol+1}宫中数字${num}无可填入位置，无解`);
                    return true;
                }
            }
        }
    }
}

// 检查行唯一候选数
function check_Row_Elimination(board, size) {    
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

            if (numPositions[num].length === 1) {
                const col = numPositions[num][0];
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    board[row][col] = num;
                    log_process(`[行排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                    eliminate_Candidates(board, size, row, col, num);
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

// 检查列唯一候选数
function check_Col_Elimination(board, size) {    
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

            if (numPositions[num].length === 1) {
                const row = numPositions[num][0];
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    board[row][col] = num;
                    log_process(`[列排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                    eliminate_Candidates(board, size, row, col, num);
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

// 检查格唯一候选数（唯一余数法）
function check_Cell_Elimination(board, size) {
    let hasConflict = false;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = board[row][col];
            if (Array.isArray(cell)) {
                if (cell.length === 1) {
                    const num = cell[0];
                    board[row][col] = num;
                    log_process(`[唯一余数] ${getRowLetter(row+1)}${col+1}=${num}`);
                    eliminate_Candidates(board, size, row, col, num);
                } else if (cell.length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${getRowLetter(row+1)}${col+1}无候选数，无解`);
                    return true;
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
                        }
                    }
                }

                // 原有单一候选数逻辑
                if (numPositions[num].length === 1) {
                    const [row, col] = numPositions[num][0];
                    const cell = board[row][col];
                    if (Array.isArray(cell) && cell.includes(num)) {
                        board[row][col] = num;
                        log_process(`[宫排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                        eliminate_Candidates(board, size, row, col, num);
                    }
                } else if (numPositions[num].length === 0) {
                    hasConflict = true;
                    log_process(`[冲突] ${boxRow*3+boxCol+1}宫中数字${num}无可填入位置，无解`);
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
                    }
                }
            }

            // 原有行排除逻辑
            if (numPositions[num].length === 1) {
                const col = numPositions[num][0];
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    board[row][col] = num;
                    log_process(`[行排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                    eliminate_Candidates(board, size, row, col, num);
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
                    }
                }
            }
            
            // 原有列排除逻辑
            if (numPositions[num].length === 1) {
                const row = numPositions[num][0];
                const cell = board[row][col];
                if (Array.isArray(cell) && cell.includes(num)) {
                    board[row][col] = num;
                    log_process(`[列排除] ${getRowLetter(row+1)}${col+1}=${num}`);
                    eliminate_Candidates(board, size, row, col, num);
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

// 检查宫数组排除
function check_Box_Subset_Elimination(board, size) {
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
            
            // 检查所有可能的子集组合
            for (let subsetSize = 2; subsetSize <= Math.min(size, candidates.length); subsetSize++) {
                const combinations = getCombinations(candidates, subsetSize);
                
                for (const combo of combinations) {
                    // 跳过包含单候选数格子的组合（理论上不会发生，防御性检查）
                    if (combo.some(c => c.nums.length <= 1)) continue;
                    
                    // 合并所有候选数
                    const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                    
                    // 如果候选数数量等于子集大小，则形成数组关系
                    if (unionNums.length === subsetSize) {
                        const affectedCells = [];
                        
                        // 从宫的其他格子中排除这些候选数
                        for (const cell of candidates) {
                            if (!combo.some(c => c.pos[0] === cell.pos[0] && c.pos[1] === cell.pos[1])) {
                                const originalLength = cell.nums.length;
                                cell.nums = cell.nums.filter(n => !unionNums.includes(n));
                                board[cell.pos[0]][cell.pos[1]] = cell.nums.filter(n => !unionNums.includes(n));
                                
                                if (cell.nums.length < originalLength) {
                                    affectedCells.push(`${getRowLetter(cell.pos[0]+1)}${cell.pos[1]+1}`);
                                }
                            }
                        }
                        
                        
                        if (affectedCells.length > 0) {
                            const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                            log_process(`[宫数组] ${subsetCells}构成${subsetSize}数数组${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
                        }
                    }
                }
            }
        }
    }
    
    return hasConflict;
}

// 检查行数组排除
function check_Row_Subset_Elimination(board, size) {
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
        
        // 检查所有可能的子集组合
        for (let subsetSize = 2; subsetSize <= Math.min(size, candidates.length); subsetSize++) {
            const combinations = getCombinations(candidates, subsetSize);
            
            for (const combo of combinations) {
                // 跳过包含单候选数格子的组合（理论上不会发生，防御性检查）
                if (combo.some(c => c.nums.length <= 1)) continue;

                // 合并所有候选数
                const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                
                // 如果候选数数量等于子集大小，则形成数组关系
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
                        const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                        log_process(`[行数组] ${subsetCells}构成${subsetSize}数数组${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
                    }
                }
            }
        }
    }
    
    return hasConflict;
}

// 检查列数组排除
function check_Col_Subset_Elimination(board, size) {
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
        
        // 检查所有可能的子集组合
        for (let subsetSize = 2; subsetSize <= Math.min(size, candidates.length); subsetSize++) {
            const combinations = getCombinations(candidates, subsetSize);
            
            for (const combo of combinations) {
                // 跳过包含单候选数格子的组合（理论上不会发生，防御性检查）
                if (combo.some(c => c.nums.length <= 1)) continue;

                // 合并所有候选数
                const unionNums = [...new Set(combo.flatMap(c => c.nums))];
                
                // 如果候选数数量等于子集大小，则形成数组关系
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
                        const subsetCells = combo.map(c => `${getRowLetter(c.pos[0]+1)}${c.pos[1]+1}`).join('、');
                        log_process(`[列数组] ${subsetCells}构成${subsetSize}数数组${unionNums.join('')}，排除${affectedCells.join('、')}的${unionNums.join('、')}`);
                    }
                }
            }
        }
    }
    
    return hasConflict;
}
