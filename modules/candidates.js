import { state } from './state.js';
import { show_result, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid } from './core.js';

export function create_candidates_sudoku(size) {
    // 初始化状态 - 强制设置为候选数模式
    state.is_skyscraper_mode = false;
    state.is_vx_mode = false;
    state.is_candidates_mode = true; // 强制为候选数模式
    const { container, grid } = create_base_grid(size, false);
    

    // 存储所有输入框的引用
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 隐藏切换候选数模式的按钮（因为始终是候选数模式）
    document.getElementById('toggleCandidatesMode').style.display = 'none';

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        // 创建单元格容器
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell candidates-mode'; // 添加候选数模式class
        cell.dataset.row = row;
        cell.dataset.col = col;

        // 创建主输入框
        const mainInput = document.createElement('input');
        mainInput.type = 'text';
        mainInput.className = 'main-input hide-input-text'; // 默认隐藏文字
        mainInput.maxLength = size;
        mainInput.dataset.row = row;
        mainInput.dataset.col = col;

        // 创建候选数容器
        const candidatesGrid = document.createElement('div');
        candidatesGrid.className = 'candidates-grid';
        candidatesGrid.style.display = 'grid'; // 默认显示候选数网格

        // 根据数独尺寸创建候选数格子
        const subSize = Math.sqrt(size);
        candidatesGrid.style.gridTemplateColumns = `repeat(${subSize}, 1fr)`;
        candidatesGrid.style.gridTemplateRows = `repeat(${subSize}, 1fr)`;
        
        // 创建固定位置的候选数格子
        for (let n = 1; n <= size; n++) {
            const candidateCell = document.createElement('div');
            candidateCell.className = 'candidates-cell';
            candidateCell.dataset.number = n;
            candidateCell.textContent = n;
            candidateCell.style.display = 'none';
            candidateCell.style.gridArea = getGridArea(n, subSize);
            candidatesGrid.appendChild(candidateCell);
        }

        // 辅助函数：计算固定位置
        function getGridArea(number, subSize) {
            const row = Math.ceil(number / subSize);
            const col = ((number - 1) % subSize) + 1;
            return `${row} / ${col} / ${row} / ${col}`;
        }

        // 添加元素到DOM
        cell.appendChild(mainInput);
        cell.appendChild(candidatesGrid);
        
        // 存储输入框引用
        inputs[row][col] = mainInput;

        // 输入事件处理（仅候选数模式逻辑）
        mainInput.addEventListener('input', function() {
            // 根据数独尺寸限制输入范围
            const maxValue = size;
            const regex = new RegExp(`[^1-${maxValue}]`, 'g');
            this.value = this.value.replace(regex, '');
            
            // 提取有效数字
            const inputNumbers = [...new Set(this.value.split(''))]
                .filter(c => c >= '1' && c <= maxValue.toString())
                .map(Number)
                .sort((a, b) => a - b);
            
            // 更新候选数显示
            cell.querySelectorAll('.candidates-cell').forEach(cell => {
                const num = parseInt(cell.dataset.number);
                cell.style.display = inputNumbers.includes(num) ? 'flex' : 'none';
            });
            
            // 存储实际值（去重排序）
            this.value = inputNumbers.join('');
        });

        // 键盘事件监听（仅候选数模式逻辑）
        mainInput.addEventListener('keydown', function(e) {
            // 处理数字键
            if (e.key >= '1' && e.key <= size.toString()) {
                e.preventDefault();
                const num = parseInt(e.key);
                const currentNumbers = [...new Set(this.value.split('').map(Number))];
                
                // 切换数字状态
                const newNumbers = currentNumbers.includes(num)
                    ? currentNumbers.filter(n => n !== num)
                    : [...currentNumbers, num].sort((a, b) => a - b);
                
                this.value = newNumbers.join('');
                this.dispatchEvent(new Event('input'));
            }
            // 处理导航键
            handleKeyNavigation(e, row, col);
        });

        // 加粗边框
        bold_border(cell, row, col, size);

        grid.appendChild(cell);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 键盘导航函数
    function handleKeyNavigation(e, row, col) {
        const key = e.key;
        
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
            
            let targetRow = row, targetCol = col;
            
            switch(key) {
                case 'ArrowUp': targetRow--; break;
                case 'ArrowDown': targetRow++; break;
                case 'ArrowLeft': targetCol--; break;
                case 'ArrowRight': targetCol++; break;
            }
            
            if (targetRow >= 0 && targetRow < size && targetCol >= 0 && targetCol < size) {
                const targetInput = inputs[targetRow][targetCol];
                targetInput.focus();
                targetInput.select();
            }
        }
    }

    // 添加候选数专属按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';

    add_Extra_Button('验证唯一性', check_candidates_uniqueness, '#2196F3');
    add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
}

/**
 * 验证候选数数独的唯一解
 */
export function check_candidates_uniqueness() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;

    // 备份当前题目状态
    backup_original_board();
    
    // 获取当前数独状态，包括候选数信息
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const val = parseInt(input.value);
            
            // 如果是候选数模式且有候选数，则返回候选数数组，否则返回单个数字或0
            if (state.is_candidates_mode && input.value.length > 1) {
                return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
            }
            return isNaN(val) ? 0 : val;
        })
    );

    let solutionCount = 0;
    let arrayCount = 0;
    let solution = null;

    /**
     * 自定义验证函数
     */
    function isValid(row, col, num) {
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

    // 求解函数
    function solve_Array(r = 0, c = 0) {

        if (r === size) {
            arrayCount++;
            // if (arrayCount === 1) {
            //     solution = board.map(row => row.map(cell => 
            //         Array.isArray(cell) ? cell[0] : cell
            //     ));
            // }
            // 保存当前解的状态
            const tempBoard = board.map(row => [...row]);
            
            // 基于当前解进行验证
            // const { solutionCount: verifyCount } = solve(0, 0);
            solve(0, 0);
            
            // 恢复状态
            board = tempBoard.map(row => [...row]);
            return;
        }

        const nextRow = c === size - 1 ? r + 1 : r;
        const nextCol = (c + 1) % size;

        const cellValue = board[r][c];
        
        // 如果单元格已经有确定值，判断该值是否合理，再跳到下一个
        if (typeof cellValue === 'number' && cellValue !== 0) {
            const num = cellValue;
            board[r][c] = 0; // Temporarily clear
            if (!isValid(r, c, num)) {
                board[r][c] = num; // Restore before returning
                return; // Invalid board
            }
            board[r][c] = num; // Restore
            solve_Array(nextRow, nextCol);
            return;
        }
        
        // 如果是候选数数组，只尝试数组中的数字
        if (Array.isArray(cellValue)) {
            for (const num of cellValue) {
                if (isValid(r, c, num)) {
                    const original = board[r][c];
                    board[r][c] = num; // 暂时设为确定值
                    solve_Array(nextRow, nextCol);
                    board[r][c] = original; // 恢复候选数
                }
            }
            return;
        }
        
        // 如果是空单元格，先跳过（最后处理）
        if (cellValue === 0) {
            solve_Array(nextRow, nextCol);
            return;
        }

    }

    function solve(r = 0, c = 0) {
        if (solutionCount >= 51) return;
        if (r === size) {
            solutionCount++;
            if (solutionCount === 1) {
                solution = board.map(row => row.map(cell => 
                    Array.isArray(cell) ? cell[0] : cell
                ));
            }
            return;
        }

        const nextRow = c === size - 1 ? r + 1 : r;
        const nextCol = (c + 1) % size;

        const cellValue = board[r][c];
        
        // 如果单元格已经有确定值，判断该值是否合理，再跳到下一个
        if (typeof cellValue === 'number' && cellValue !== 0) {
            const num = cellValue;
            board[r][c] = 0; // Temporarily clear
            if (!isValid(r, c, num)) {
                board[r][c] = num; // Restore before returning
                return; // Invalid board
            }
            board[r][c] = num; // Restore
            solve(nextRow, nextCol);
            return;
        }
        
        // 如果是候选数数组，只尝试数组中的数字
        if (Array.isArray(cellValue)) {
            for (const num of cellValue) {
                if (isValid(r, c, num)) {
                    const original = board[r][c];
                    board[r][c] = num; // 暂时设为确定值
                    solve(nextRow, nextCol);
                    board[r][c] = original; // 恢复候选数
                }
            }
            return;
        }
        // 普通空单元格，尝试所有可能数字
        for (let num = 1; num <= size; num++) {
            if (isValid(r, c, num)) {
                board[r][c] = num;
                solve(nextRow, nextCol);
                board[r][c] = 0;
            }
        }

    }

    solve_Array(0, 0);
    // solve(0, 0);
    // if (solutionCount < 2) {
    //     processEmptyCells();
    // }

    // 显示结果
    if (solutionCount === 0) {
        show_result("当前候选数数独无解！");
    } else if (solutionCount === 1) {
        // 退出候选数模式
        state.is_candidates_mode = false;
        document.getElementById('toggleCandidatesMode').textContent = '切换候选数模式';
        
        // 填充唯一解
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const cell = input.parentElement;
                const candidatesGrid = cell.querySelector('.candidates-grid');
                
                // 更新显示状态
                input.style.display = 'block';
                input.classList.remove('hide-input-text');
                if (candidatesGrid) {
                    candidatesGrid.style.display = 'none';
                }
                
                // 填充答案
                if (solution[i][j] > 0) {
                    input.value = solution[i][j];
                    input.classList.add("solution-cell");
                }
            }
        }
        show_result("当前候选数数独恰好有唯一解！已自动填充答案并退出候选数模式。");
    } else if (solutionCount > 50) {
        show_result("当前数独有多于50个解。");
    } else {
        show_result(`当前数独有${solutionCount}个解！`);
    }
}


/**
 * 备份当前题目状态
 */
function backup_original_board() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    state.originalBoard = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            return {
                value: input.value,
                isCandidateMode: state.is_candidates_mode,
                displayStyle: input.style.display,
                classList: [...input.classList]
            };
        })
    );
}

/**
 * 填充答案并更新状态
 */
function fill_solution_with_backup(solution) {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    // 退出候选数模式
    state.is_candidates_mode = false;
    state.isShowingSolution = true;
    document.getElementById('toggleCandidatesMode').textContent = '切换候选数模式';
    
    // 更新检查按钮文本
    const checkBtn = document.getElementById('checkUniqueness');
    const originalBtnText = checkBtn.textContent;
    checkBtn.textContent = '隐藏答案';
    
    // 填充唯一解
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const cell = input.parentElement;
            const candidatesGrid = cell.querySelector('.candidates-grid');
            
            // 更新显示状态
            input.style.display = 'block';
            input.classList.remove('hide-input-text');
            if (candidatesGrid) {
                candidatesGrid.style.display = 'none';
            }
            
            // 填充答案
            if (solution[i][j] > 0) {
                input.value = solution[i][j];
                input.classList.add("solution-cell");
            }
        }
    }
    
    // 存储原始按钮文本以便恢复
    checkBtn.dataset.originalText = originalBtnText;
    show_result("当前候选数数独恰好有唯一解！已自动填充答案。点击隐藏答案按钮可恢复题目。");
}

/**
 * 恢复原始题目状态
 */
function restore_original_board() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    if (!state.originalBoard) return;
    
    // 恢复原始状态
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const original = state.originalBoard[i][j];
            
            input.value = original.value;
            input.style.display = original.displayStyle;
            input.className = 'main-input';
            original.classList.forEach(cls => input.classList.add(cls));
            
            // 恢复候选数网格显示
            const candidatesGrid = input.parentElement.querySelector('.candidates-grid');
            if (candidatesGrid) {
                candidatesGrid.style.display = original.isCandidateMode ? 'grid' : 'none';
            }
        }
    }
    
    // 恢复候选数模式状态
    state.is_candidates_mode = state.originalBoard[0][0].isCandidateMode;
    state.isShowingSolution = false;
    document.getElementById('toggleCandidatesMode').textContent = 
        state.is_candidates_mode ? '退出候选数模式' : '切换候选数模式';
    
    // 恢复按钮文本
    const checkBtn = document.getElementById('checkUniqueness');
    checkBtn.textContent = checkBtn.dataset.originalText || '验证唯一性';
    
    show_result("已恢复原始题目状态");
}