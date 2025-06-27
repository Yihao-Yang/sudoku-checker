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

// 将数字行号转换为字母 (1=A, 2=B, ..., 26=Z)
export function getRowLetter(rowNum) {
    return String.fromCharCode(64 + rowNum); // 65 is 'A' in ASCII
}