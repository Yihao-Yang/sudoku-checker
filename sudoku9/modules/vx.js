import { 
    show_result, 
    clear_result, 
    bold_border, 
    add_Extra_Button,
    create_base_grid,
    create_base_cell,
    add_base_input_handlers,
    handle_key_navigation,
    base_solve,
    fill_solution
} from './core.js';
import { state } from './state.js';

let is_vx_mode_active = false;
let current_vx_mark = null;
let vx_marks = [];

/**
 * 创建VX数独网格
 */
export function create_vx_sudoku(size = 9) {
    state.is_vx_mode = true;
    clear_result();
    vx_marks = [];
    
    // 使用基础网格创建函数
    const { container, grid } = create_base_grid(size);
    container.style.position = 'relative';
    
    // 存储所有输入框的引用
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 创建单元格
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const { cell, input } = create_base_cell(row, col, size);
            inputs[row][col] = input;
            
            // 添加输入处理
            add_base_input_handlers(input, size);
            
            // 添加键盘导航
            input.addEventListener('keydown', (e) => {
                handle_key_navigation(e, row, col, size, inputs);
            });
            
            cell.appendChild(input);
            grid.appendChild(cell);
        }
    }

    container.appendChild(grid);
    
    // 添加VX专属按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';
    add_Extra_Button('添加V标记', () => set_vx_mode('V'));
    add_Extra_Button('添加X标记', () => set_vx_mode('X'));
    add_Extra_Button('一键标记', auto_mark_vx);
    add_Extra_Button('验证VX唯一性', check_vx_uniqueness);
    add_Extra_Button('清除标记', clear_vx_marks);
    
    gridDisplay.appendChild(container);
    setup_vx_event_listeners();
}

/**
 * 设置VX标记模式
 */
export function set_vx_mode(type) {
    if (current_vx_mark === type) {
        // 如果再次点击相同按钮，则退出连续标记模式
        current_vx_mark = null;
        is_vx_mode_active = false;
        show_result(`已退出${type}标记模式`, 'info');
    } else {
        // 进入连续标记模式
        current_vx_mark = type;
        is_vx_mode_active = true;
        show_result(`已进入${type}标记模式，点击相邻两格之间的边线添加标记。再次点击按钮可退出此模式。`, 'info');
    }
}

/**
 * 设置VX事件监听器
 */
function setup_vx_event_listeners() {
    const container = document.querySelector('.sudoku-container');
    const cells = container.querySelectorAll('.sudoku-cell');
    
    cells.forEach(cell => {
        cell.addEventListener('click', function(e) {
            if (!is_vx_mode_active || !current_vx_mark) return;
            
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const edge = y < 10 ? 'top' : 
                        y > rect.height - 10 ? 'bottom' :
                        x < 10 ? 'left' : 
                        x > rect.width - 10 ? 'right' : null;
            
            if (!edge) return;
            
            const row = parseInt(this.dataset.row);
            const col = parseInt(this.dataset.col);
            let targetRow = row, targetCol = col;
            
            switch(edge) {
                case 'top': targetRow = row - 1; break;
                case 'bottom': targetRow = row + 1; break;
                case 'left': targetCol = col - 1; break;
                case 'right': targetCol = col + 1; break;
            }
            
            // 检查是否在网格范围内
            if (targetRow < 0 || targetRow >= state.current_grid_size || 
                targetCol < 0 || targetCol >= state.current_grid_size) {
                return;
            }
            
            // 添加VX标记
            add_vx_mark(row, col, targetRow, targetCol, current_vx_mark);
        });
    });
}

/**
 * 添加VX标记
 */
function add_vx_mark(row1, col1, row2, col2, type) {
    // 检查是否已存在标记
    const existingMark = vx_marks.find(mark => 
        (mark.row1 === row1 && mark.col1 === col1 && mark.row2 === row2 && mark.col2 === col2) ||
        (mark.row1 === row2 && mark.col1 === col2 && mark.row2 === row1 && mark.col2 === col1)
    );
    
    if (existingMark) {
        // 移除现有标记
        existingMark.element.remove();
        vx_marks = vx_marks.filter(mark => mark !== existingMark);
        
        // 如果是相同类型则不添加新标记
        if (existingMark.type === type) {
            return;
        }
    }
    
    // 创建新标记
    const container = document.querySelector('.sudoku-container');
    const markElement = document.createElement('div');
    markElement.className = 'vx-mark';
    markElement.textContent = type;
    
    // 计算位置 (在两格中间)
    const cellSize = 60; // 每个单元格的大小
    const markSize = 20; // 标记的大小
    
    // 微调偏移量
    const horizontalAdjust = 1; // 水平方向微调
    const verticalAdjust = 21;   // 垂直方向微调
    
    // 确定是水平还是垂直边线
    const isHorizontal = row1 !== row2;
    
    let x, y;
    
    if (isHorizontal) {
        // 垂直方向相邻的格子 (上下关系)
        const minRow = Math.min(row1, row2);
        x = (col1 + 0.5) * cellSize - markSize / 2 + horizontalAdjust;
        y = (minRow + 1) * cellSize - markSize / 2 + verticalAdjust;
    } else {
        // 水平方向相邻的格子 (左右关系)
        const minCol = Math.min(col1, col2);
        x = (minCol + 1) * cellSize - markSize / 2 + horizontalAdjust;
        y = (row1 + 0.5) * cellSize - markSize / 2 + verticalAdjust;
    }
    
    markElement.style.left = `${x}px`;
    markElement.style.top = `${y}px`;
    markElement.style.width = `${markSize}px`;
    markElement.style.height = `${markSize}px`;
    markElement.style.display = 'flex';
    markElement.style.justifyContent = 'center';
    markElement.style.alignItems = 'center';
    
    container.appendChild(markElement);
    
    // 存储标记信息
    vx_marks.push({
        row1, col1, row2, col2,
        type,
        element: markElement
    });
}

/**
 * 清除所有VX标记
 */
export function clear_vx_marks() {
    vx_marks.forEach(mark => mark.element.remove());
    vx_marks = [];
    show_result("已清除所有VX标记", 'info');
}

/**
 * 检查VX规则
 */
function check_vx_rules() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    
    let isValid = true;
    
    // 检查所有VX标记是否满足条件
    vx_marks.forEach(mark => {
        const input1 = container.querySelector(`input[data-row="${mark.row1}"][data-col="${mark.col1}"]`);
        const input2 = container.querySelector(`input[data-row="${mark.row2}"][data-col="${mark.col2}"]`);
        
        const val1 = parseInt(input1?.value);
        const val2 = parseInt(input2?.value);
        
        if (isNaN(val1) || isNaN(val2)) return;
        
        const sum = val1 + val2;
        const requiredSum = mark.type === 'V' ? 5 : 10;
        
        if (sum !== requiredSum) {
            input1.style.backgroundColor = '#ffcdd2';
            input2.style.backgroundColor = '#ffcdd2';
            isValid = false;
        }
    });
    
    // 检查没有标记的相邻格子是否违反规则
    const size = state.current_grid_size;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (!input || !input.value) continue;
            
            // 检查右侧格子
            if (col < size - 1) {
                check_unmarked_pair(row, col, row, col + 1);
            }
            
            // 检查下方格子
            if (row < size - 1) {
                check_unmarked_pair(row, col, row + 1, col);
            }
        }
    }
    
    if (isValid) {
        show_result("VX规则检查通过", 'success');
    } else {
        show_result("部分VX规则未满足", 'error');
    }
}

/**
 * 检查未标记的相邻对
 */
function check_unmarked_pair(row1, col1, row2, col2) {
    const container = document.querySelector('.sudoku-container');
    
    // 检查是否有VX标记
    const hasMark = vx_marks.some(mark => 
        (mark.row1 === row1 && mark.col1 === col1 && mark.row2 === row2 && mark.col2 === col2) ||
        (mark.row1 === row2 && mark.col1 === col2 && mark.row2 === row1 && mark.col2 === col1)
    );
    
    if (hasMark) return;
    
    const input1 = container.querySelector(`input[data-row="${row1}"][data-col="${col1}"]`);
    const input2 = container.querySelector(`input[data-row="${row2}"][data-col="${col2}"]`);
    
    const val1 = parseInt(input1?.value);
    const val2 = parseInt(input2?.value);
    
    if (isNaN(val1) || isNaN(val2)) return;
    
    const sum = val1 + val2;
    
    if (sum === 5 || sum === 10) {
        input1.style.backgroundColor = '#ffcdd2';
        input2.style.backgroundColor = '#ffcdd2';
        show_result(`未标记的相邻格子${row1+1},${col1+1}和${row2+1},${col2+1}的和为${sum}，但未添加V/X标记`, 'error');
    }
}

/**
 * 一键标记所有符合V/X规则的相邻数字对
 */
export function auto_mark_vx() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    // 先清除所有现有标记
    clear_vx_marks();
    
    // 遍历所有相邻单元格对
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // 检查右侧相邻单元格
            if (col < size - 1) {
                check_and_mark_pair(row, col, row, col + 1);
            }
            
            // 检查下方相邻单元格
            if (row < size - 1) {
                check_and_mark_pair(row, col, row + 1, col);
            }
        }
    }
    
    show_result("已自动标记所有符合V/X规则的相邻数字对", 'success');
}

/**
 * 检查并标记符合条件的数字对
 */
function check_and_mark_pair(row1, col1, row2, col2) {
    const container = document.querySelector('.sudoku-container');
    const input1 = container.querySelector(`input[data-row="${row1}"][data-col="${col1}"]`);
    const input2 = container.querySelector(`input[data-row="${row2}"][data-col="${col2}"]`);
    
    const val1 = parseInt(input1?.value);
    const val2 = parseInt(input2?.value);
    
    // 只有当两个单元格都有数字时才检查
    if (!isNaN(val1) && !isNaN(val2)) {
        const sum = val1 + val2;
        
        if (sum === 5) {
            add_vx_mark(row1, col1, row2, col2, 'V');
        } else if (sum === 10) {
            add_vx_mark(row1, col1, row2, col2, 'X');
        }
    }
}

/**
 * 验证VX数独唯一性
 */
export function check_vx_uniqueness() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    // 收集当前盘面数据
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const val = input ? parseInt(input.value) : NaN;
            return isNaN(val) ? 0 : val;
        })
    );
    
    // 收集所有相邻关系
    const allAdjacentPairs = getAllAdjacentPairs(size);
    
    // 收集VX约束
    const vxConstraints = vx_marks.map(mark => ({
        cell1: { row: mark.row1, col: mark.col1 },
        cell2: { row: mark.row2, col: mark.col2 },
        type: mark.type,
        requiredSum: mark.type === 'V' ? 5 : 10
    }));
    
    // 使用基础求解函数
    const { solutionCount, solution } = base_solve(
        board, 
        size, 
        (r, c, num) => isValidPlacement(r, c, num, board, size, vxConstraints, allAdjacentPairs),
        true
    );
    
    // 显示结果
    if (solutionCount === 0) {
        show_result("当前VX数独无解！请检查数字和VX标记是否正确。", 'error');
    } else if (solutionCount === 1) {
        show_result("当前VX数独有唯一解！", 'success');
        
        // 可选：填充唯一解
        if (confirm("是否要填充唯一解？")) {
            fill_solution(container, solution, size);
        }
    } else {
        show_result("当前VX数独有多个解！", 'error');
    }
}

/**
 * 检查数字放置是否有效
 */
function isValidPlacement(row, col, num, board, size, vxConstraints, allAdjacentPairs) {
    // 检查行、列、宫是否有效
    for (let i = 0; i < size; i++) {
        if (board[row][i] === num) return false;
        if (board[i][col] === num) return false;
    }
    
    // 检查宫
    const boxSize = Math.sqrt(size);
    const startRow = Math.floor(row / boxSize) * boxSize;
    const startCol = Math.floor(col / boxSize) * boxSize;
    
    for (let r = startRow; r < startRow + boxSize; r++) {
        for (let c = startCol; c < startCol + boxSize; c++) {
            if (board[r][c] === num) return false;
        }
    }
    
    // 检查VX约束
    for (const constraint of vxConstraints) {
        // 检查是否涉及当前单元格
        const isCell1 = (constraint.cell1.row === row && constraint.cell1.col === col);
        const isCell2 = (constraint.cell2.row === row && constraint.cell2.col === col);
        
        if (isCell1 || isCell2) {
            const otherCell = isCell1 ? constraint.cell2 : constraint.cell1;
            const otherValue = board[otherCell.row][otherCell.col];
            
            if (otherValue !== 0) { // 另一个单元格有数字时才检查
                const sum = isCell1 ? (num + otherValue) : (otherValue + num);
                if (sum !== constraint.requiredSum) {
                    return false;
                }
            }
        }
    }
    
    // 检查未标记的相邻单元格不能和为5或10
    for (const pair of allAdjacentPairs) {
        if ((pair.row1 === row && pair.col1 === col) || 
            (pair.row2 === row && pair.col2 === col)) {
            
            const otherRow = pair.row1 === row ? pair.row2 : pair.row1;
            const otherCol = pair.col1 === col ? pair.col2 : pair.col1;
            const otherValue = board[otherRow][otherCol];
            
            if (otherValue !== 0) {
                const sum = num + otherValue;
                // 检查这对相邻单元格是否有VX标记
                const hasMark = vxConstraints.some(c => 
                    (c.cell1.row === pair.row1 && c.cell1.col === pair.col1 &&
                    c.cell2.row === pair.row2 && c.cell2.col === pair.col2) ||
                    (c.cell1.row === pair.row2 && c.cell1.col === pair.col2 &&
                    c.cell2.row === pair.row1 && c.cell2.col === pair.col1));
                
                if (!hasMark && (sum === 5 || sum === 10)) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

/**
 * 获取所有相邻单元格对
 */
function getAllAdjacentPairs(size) {
    const pairs = [];
    // 水平相邻对
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size - 1; col++) {
            pairs.push({
                row1: row, col1: col,
                row2: row, col2: col + 1
            });
        }
    }
    // 垂直相邻对
    for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size; col++) {
            pairs.push({
                row1: row, col1: col,
                row2: row + 1, col2: col
            });
        }
    }
    return pairs;
}