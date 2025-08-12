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
    fill_solution,
    log_process,
    backup_original_board
} from './core.js';
import { state, set_current_mode } from './state.js';
import { solve } from '../solver/solver_tool.js';
import { shuffle, get_symmetric_positions, generate_solution } from '../solver/generate.js';

let is_consecutive_mode_active = false;
let is_inequality_mode_active = false;
let current_direction = null;
let consecutive_marks = [];

/**
 * 创建定向连续数独网格
 */
export function create_consecutive_sudoku(size = 9) {
    set_current_mode('consecutive');
    // state.is_consecutive_mode = true;
    clear_result();
    consecutive_marks = [];
    
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
    
    // 添加定向连续数独专属按钮
    const extraButtons = document.getElementById('extraButtons');
    extraButtons.innerHTML = '';
    const toggleButton = add_Extra_Button('添加连续标记', toggle_consecutive_mode);
    const inequalityButton = add_Extra_Button('添加不等号标记', toggle_inequality_mode);
    add_Extra_Button('一键标记', auto_mark_consecutive);
    add_Extra_Button('定向连续', convert_to_directional_marks);
    add_Extra_Button('验证唯一性', check_consecutive_uniqueness);
    add_Extra_Button('清除标记', clear_consecutive_marks);
    add_Extra_Button('自动出题', () => generate_consecutive_puzzle(size));
    
    gridDisplay.appendChild(container);
    setup_consecutive_event_listeners();
}

/**
 * 验证定向连续数独唯一性
 */
export function check_consecutive_uniqueness() {
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
    
    // 收集连续约束
    const consecutiveConstraints = consecutive_marks.map(mark => {
        // 对于方向性标记
        if (mark.isDirectional) {
            return {
                cell1: { row: mark.row1, col: mark.col1 },
                cell2: { row: mark.row2, col: mark.col2 },
                direction: mark.direction,
                isDirectional: true,
                isFirstGreater: mark.isFirstGreater
            };
        }
        // 对于普通连续标记
        else {
            const input1 = container.querySelector(`input[data-row="${mark.row1}"][data-col="${mark.col1}"]`);
            const input2 = container.querySelector(`input[data-row="${mark.row2}"][data-col="${mark.col2}"]`);
            
            const val1 = parseInt(input1?.value);
            const val2 = parseInt(input2?.value);
            
            return {
                cell1: { row: mark.row1, col: mark.col1 },
                cell2: { row: mark.row2, col: mark.col2 },
                direction: mark.direction,
                isDirectional: false,
                isFirstGreater: !isNaN(val1) && !isNaN(val2) ? val1 > val2 : null
            };
        }
    });
    
    // 验证当前盘面是否有效
    if (!validateCurrentBoard(board, size, consecutiveConstraints)) {
        show_result("当前盘面存在冲突，无法验证唯一解", 'error');
        return;
    }

    // 使用基础求解函数
    const { solution_count, solution } = base_solve(
        board, 
        size, 
        (r, c, num) => isValidPlacement(r, c, num, board, size, consecutiveConstraints, allAdjacentPairs),
        true // 查找所有解
    );
    
    // 显示结果
    if (solution_count === 0) {
        show_result("当前定向连续数独无解！请检查数字和连续标记是否正确。", 'error');
    } else if (solution_count === 1) {
        show_result("当前定向连续数独有唯一解！", 'success');
        
        // if (confirm("是否要填充唯一解？")) {
            fill_solution(container, solution, size);
        // }
    } else {
        show_result(`当前定向连续数独有 ${solution_count} 个解！`, 'error');
    }
}
// ... 其他已有代码保持不变 ...

const SYMMETRY_TYPES = ['horizontal', 'vertical', 'central', 'diagonal', 'anti-diagonal'];

// /**
//  * 生成连续数独终盘
//  * @param {number} size - 数独大小 (4,6,9)
//  */
// export function generate_consecutive_solution(size) {
//     // 1. 创建空盘面
//     const board = Array.from({ length: size }, () => 
//         Array.from({ length: size }, () => 0)
//     );

//     // 2. 回溯填充数字
//     function backtrack() {
//         for (let row = 0; row < size; row++) {
//             for (let col = 0; col < size; col++) {
//                 if (board[row][col] === 0) {
//                     const nums = shuffle([...Array(size)].map((_, i) => i + 1));
                    
//                     for (const num of nums) {
//                         if (isValidPlacement(row, col, num, board, size, [], getAllAdjacentPairs(size))) {
//                             board[row][col] = num;
                            
//                             if (backtrack()) {
//                                 return true;
//                             }
                            
//                             board[row][col] = 0;
//                         }
//                     }
//                     return false;
//                 }
//             }
//         }
//         // 回溯完成后，收集所有相邻差为1的数字对作为连续标记
//         consecutive_marks = [];
//         for (let row = 0; row < size; row++) {
//             for (let col = 0; col < size; col++) {
//                 // 检查右侧相邻
//                 if (col < size - 1 && Math.abs(board[row][col] - board[row][col+1]) === 1) {
//                     consecutive_marks.push({
//                         row1: row, col1: col,
//                         row2: row, col2: col+1,
//                         direction: 'horizontal'
//                     });
//                 }
//                 // 检查下方相邻
//                 if (row < size - 1 && Math.abs(board[row][col] - board[row+1][col]) === 1) {
//                     consecutive_marks.push({
//                         row1: row, col1: col,
//                         row2: row+1, col2: col,
//                         direction: 'vertical'
//                     });
//                 }
//             }
//         }
//         return true;
//     }
    
//     backtrack();
//     return board;
// }

export function generate_consecutive_solution(size) {
    // 1. 调用标准数独生成函数
    const solution = generate_solution(size);
    
    // 2. 填充到网格以便自动标记
    const container = document.querySelector('.sudoku-container');
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            input.value = solution[row][col];
        }
    }
    
    // 3. 自动标记连续关系
    auto_mark_consecutive();
    
    // 4. 返回终盘
    return solution;
}

/**
 * 生成连续数独题目
 * @param {number} size - 数独大小 (4,6,9)
 */
export function generate_consecutive_puzzle(size) {
    log_process('', true);

    // 1. 重置盘面 - 清除所有数字和标记
    const container = document.querySelector('.sudoku-container');
    const inputs = container.querySelectorAll('input');
    
    // 清除所有数字
    inputs.forEach(input => {
        input.value = '';
        input.disabled = false;
        input.style.backgroundColor = '';
        input.style.color = '';
        input.classList.remove('solution-cell');
    });
    
    // 清除所有连续标记
    clear_consecutive_marks();
    
    // 2. 生成终盘
    const solution = generate_consecutive_solution(size);
    
    // 3. 创建可挖洞的盘面副本
    // const puzzle = solution.map(row => [...row]);
    
    // 4. 随机选择对称模式并挖洞
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
    const { puzzle, holesDug } = dig_consecutive_holes(solution, size, symmetry);
    
    log_process(`生成${size}宫格连续数独，提示数: ${size*size-holesDug}，对称模式: ${symmetry}`);
    
    // 5. 填充到网格
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            input.value = puzzle[row][col] || '';
        }
    }
    
    // 6. 自动标记所有相邻差为1的数字对
    auto_mark_consecutive();
    
    backup_original_board();
    show_result(`已生成${size}宫格连续数独题目`);

    // 7. 验证题目唯一性并显示技巧统计
    const testBoard = puzzle.map(row => [...row]);
    const { solution_count, technique_counts } = base_solve(
        testBoard, 
        size,
        (r, c, num) => isValidPlacement(r, c, num, testBoard, size, consecutive_marks, getAllAdjacentPairs(size)),
        true
    );
    
    if (technique_counts) {
        log_process("\n=== 技巧使用统计 ===");
        for (const [technique, count] of Object.entries(technique_counts)) {
            if (count > 0) {
                log_process(`${technique}: ${count}次`);
            }
        }
    }
    
    return {
        puzzle: puzzle,
        solution: solution,
        consecutiveMarks: [...consecutive_marks]
    };
}

/**
 * 挖洞函数（支持对称挖洞，考虑连续约束）
 */
function dig_consecutive_holes(puzzle, size, solution, symmetry = 'none') {
// 创建可挖洞的盘面副本
    // const puzzle = solution.map(row => [...row]);

    // 收集所有可挖洞的位置
    const positions = [...Array(size * size).keys()];
    shuffle(positions);
    
    let holesDug = 0;
    let changed;
    
    do {
        changed = false;
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const row = Math.floor(pos / size);
            const col = pos % size;
            
            if (puzzle[row][col] === 0) continue;
            
            // 获取对称位置
            const symmetricPositions = get_symmetric_positions(row, col, size, symmetry);
            const positionsToDig = [ [row, col], ...symmetricPositions ];
            
            // 临时保存数字
            const tempValues = positionsToDig.map(([r, c]) => puzzle[r][c]);
            
            // 尝试挖洞
            for (const [r, c] of positionsToDig) {
                puzzle[r][c] = 0;
            }
            
            // 验证唯一解（考虑连续约束）
            const testBoard = puzzle.map(row => [...row]);
            const { solution_count } = base_solve(
                testBoard, 
                size,
                (r, c, num) => isValidPlacement(r, c, num, testBoard, size, consecutive_marks, getAllAdjacentPairs(size)),
                true
            );
            
            if (solution_count === 1) {
                // 输出挖洞信息
                positionsToDig.forEach(([r, c], idx) => {
                    log_process(`挖除位置: (${r+1},${c+1}) 数字: ${tempValues[idx]}`);
                });
                holesDug += positionsToDig.length;
                changed = true;
            } else {
                // 恢复数字
                positionsToDig.forEach(([r, c], idx) => {
                    puzzle[r][c] = tempValues[idx];
                });
            }
        }
    } while (changed);
    
    return { puzzle, holesDug };
}
// /**
//  * 生成连续数独题目
//  * @param {number} size - 数独大小 (4,6,9)
//  */
// export function generate_consecutive_puzzle(size) {
//     log_process('', true);

//     // 1. 重置盘面 - 清除所有数字和标记
//     const container = document.querySelector('.sudoku-container');
//     const inputs = container.querySelectorAll('input');
    
//     // 清除所有数字
//     inputs.forEach(input => {
//         input.value = '';
//         input.disabled = false;
//         input.style.backgroundColor = '';
//         input.style.color = '';
//         input.classList.remove('solution-cell');
//     });
    
//     // 清除所有连续标记
//     clear_consecutive_marks();
    
//     // 2. 生成终盘
//     const solution = generate_consecutive_solution(size);
    
//     // 3. 创建可挖洞的盘面副本
//     const puzzle = solution.map(row => [...row]);
    
//     // 4. 随机选择对称模式并挖洞
//     const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
//     const holesDug = dig_consecutive_holes(puzzle, size, symmetry);
    
//     log_process(`生成${size}宫格连续数独，提示数: ${size*size-holesDug}，对称模式: ${symmetry}`);
    
//     // 5. 填充到网格
//     for (let row = 0; row < size; row++) {
//         for (let col = 0; col < size; col++) {
//             const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//             input.value = puzzle[row][col] || '';
//         }
//     }
    
//     // 6. 自动标记所有相邻差为1的数字对
//     auto_mark_consecutive();
    
//     backup_original_board();
//     show_result(`已生成${size}宫格连续数独题目`);

//     // 7. 验证题目唯一性并显示技巧统计
//     const testBoard = puzzle.map(row => [...row]);
//     const { solution_count, technique_counts } = base_solve(
//         testBoard, 
//         size,
//         (r, c, num) => isValidPlacement(r, c, num, testBoard, size, consecutive_marks, getAllAdjacentPairs(size)),
//         true
//     );
    
//     if (technique_counts) {
//         log_process("\n=== 技巧使用统计 ===");
//         for (const [technique, count] of Object.entries(technique_counts)) {
//             if (count > 0) {
//                 log_process(`${technique}: ${count}次`);
//             }
//         }
//     }
    
//     return {
//         puzzle: puzzle,
//         solution: solution,
//         consecutiveMarks: [...consecutive_marks]
//     };
// }

// /**
//  * 挖洞函数（支持对称挖洞）
//  */
// function dig_consecutive_holes(puzzle, size, symmetry = 'none') {
//     // 收集所有可挖洞的位置
//     const positions = [...Array(size * size).keys()];
//     shuffle(positions);
    
//     let holesDug = 0;
//     let changed;
    
//     do {
//         changed = false;
//         for (let i = 0; i < positions.length; i++) {
//             const pos = positions[i];
//             const row = Math.floor(pos / size);
//             const col = pos % size;
            
//             if (puzzle[row][col] === 0) continue;
            
//             // 获取对称位置
//             const symmetricPositions = get_symmetric_positions(row, col, size, symmetry);
//             const positionsToDig = [ [row, col], ...symmetricPositions ];
            
//             // 临时保存数字
//             const tempValues = positionsToDig.map(([r, c]) => puzzle[r][c]);
            
//             // 尝试挖洞
//             for (const [r, c] of positionsToDig) {
//                 puzzle[r][c] = 0;
//             }
            
//             // 验证唯一解（考虑连续约束）
//             const testBoard = puzzle.map(row => [...row]);
//             const { solution_count } = base_solve(
//                 testBoard, 
//                 size,
//                 (r, c, num) => isValidPlacement(r, c, num, testBoard, size, consecutive_marks, getAllAdjacentPairs(size)),
//                 true
//             );
            
//             if (solution_count === 1) {
//                 // 输出挖洞信息
//                 positionsToDig.forEach(([r, c], idx) => {
//                     log_process(`挖除位置: (${r+1},${c+1}) 数字: ${tempValues[idx]}`);
//                 });
//                 holesDug += positionsToDig.length;
//                 changed = true;
//             } else {
//                 // 恢复数字
//                 positionsToDig.forEach(([r, c], idx) => {
//                     puzzle[r][c] = tempValues[idx];
//                 });
//             }
//         }
//     } while (changed);
    
//     return holesDug;
// }
// /**
//  * 生成连续数独题目
//  * @param {number} size - 数独大小 (4,6,9)
//  */
// export function generate_consecutive_puzzle(size) {
//     log_process('', true);

//     // 1. 生成终盘
//     const solution = generate_consecutive_solution(size);
    
//     // 2. 创建可挖洞的盘面副本
//     const puzzle = solution.map(row => [...row]);
    
//     // 3. 随机选择对称模式并挖洞
//     const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];
//     const holesDug = dig_consecutive_holes(puzzle, size, symmetry);
    
//     log_process(`生成${size}宫格连续数独，提示数: ${size*size-holesDug}，对称模式: ${symmetry}`);
    
//     // // 4. 自动标记所有相邻差为1的数字对
//     // const container = document.querySelector('.sudoku-container');
//     // for (let row = 0; row < size; row++) {
//     //     for (let col = 0; col < size; col++) {
//     //         const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
//     //         input.value = puzzle[row][col] || '';
//     //     }
//     // }
    
//     // // 自动标记连续关系
//     // auto_mark_consecutive();
//     // // 5. 清除现有标记并重新渲染
//     // clear_consecutive_marks();
//     // consecutive_marks.forEach(mark => {
//     //     add_consecutive_mark(mark.row1, mark.col1, mark.row2, mark.col2, mark.direction);
//     // });
    
//     backup_original_board();
//     show_result(`已生成${size}宫格连续数独题目`);

//     return {
//         puzzle: puzzle,
//         solution: solution
//     };
// }

/**
 * 挖洞函数（支持对称挖洞）
 */
// function dig_consecutive_holes(puzzle, size, symmetry = 'none') {
//     // 收集所有可挖洞的位置
//     // const puzzle = solution.map(row => [...row]);
//     const positions = [...Array(size * size).keys()];
//     shuffle(positions);
    
//     let holesDug = 0;
//     let changed;
    
//     do {
//         changed = false;
//         for (let i = 0; i < positions.length; i++) {
//             const pos = positions[i];
//             const row = Math.floor(pos / size);
//             const col = pos % size;
            
//             if (puzzle[row][col] === 0) continue;
            
//             // 获取对称位置
//             const symmetricPositions = get_symmetric_positions(row, col, size, symmetry);
//             const positionsToDig = [ [row, col], ...symmetricPositions ];
            
//             // 临时保存数字
//             const tempValues = positionsToDig.map(([r, c]) => puzzle[r][c]);
            
//             // 尝试挖洞
//             for (const [r, c] of positionsToDig) {
//                 puzzle[r][c] = 0;
//             }
            
//             // 验证唯一解（考虑连续约束）
//             const testBoard = puzzle.map(row => [...row]);
//             const { solution_count } = base_solve(
//                 testBoard, 
//                 size,
//                 (r, c, num) => isValidPlacement(r, c, num, testBoard, size, consecutive_marks, getAllAdjacentPairs(size)),
//                 // (r, c, num) => isValidPlacement(r, c, num, testBoard, size, consecutiveConstraints, getAllAdjacentPairs(size)),
//                 true
//             );
            
//             if (solution_count === 1) {
//                 holesDug += positionsToDig.length;
//                 changed = true;
//             } else {
//                 // 恢复数字
//                 positionsToDig.forEach(([r, c], idx) => {
//                     puzzle[r][c] = tempValues[idx];
//                 });
//             }
//         }
//     } while (changed);
    
//     return holesDug;
// }


// ... 其他已有代码保持不变 ...
/**
 * 切换连续标记模式
 */
export function toggle_consecutive_mode() {
    is_consecutive_mode_active = !is_consecutive_mode_active;
    
    const button = document.querySelector('#extraButtons button:first-child');
    if (is_consecutive_mode_active) {
        button.textContent = '退出连续标记';
        show_result('已进入连续标记模式，点击相邻两格之间的边线添加标记。再次点击按钮可退出此模式。', 'info');
    } else {
        button.textContent = '添加连续标记';
        show_result('已退出连续标记模式', 'info');
    }
}

/**
 * 切换不等号标记模式
 */
function toggle_inequality_mode() {
    is_inequality_mode_active = !is_inequality_mode_active;
    
    const button = document.querySelector('#extraButtons button:nth-child(2)');
    if (is_inequality_mode_active) {
        button.textContent = '退出不等号标记';
        show_result('已进入不等号标记模式，点击相邻两格之间的边线添加/修改标记。再次点击按钮可退出此模式。', 'info');
    } else {
        button.textContent = '添加不等号标记';
        show_result('已退出不等号标记模式', 'info');
    }
}

/**
 * 处理不等号标记的添加/修改/删除
 */
function handle_inequality_mark(row1, col1, row2, col2, direction) {
    // 检查是否已存在标记
    const existingMarkIndex = consecutive_marks.findIndex(mark => 
        ((mark.row1 === row1 && mark.col1 === col1 && mark.row2 === row2 && mark.col2 === col2) ||
        (mark.row1 === row2 && mark.col1 === col2 && mark.row2 === row1 && mark.col2 === col1)) &&
        mark.isDirectional
    );
    
    if (existingMarkIndex !== -1) {
        const existingMark = consecutive_marks[existingMarkIndex];
        
        if (existingMark.symbol === '＞' || existingMark.symbol === '∨') {
            // 如果当前是大于号，改为小于号
            existingMark.element.textContent = direction === 'horizontal' ? '＜' : '∧';
            existingMark.symbol = direction === 'horizontal' ? '＜' : '∧';
            existingMark.isFirstGreater = false;
        } else {
            // 如果当前是小于号，移除标记
            existingMark.element.remove();
            consecutive_marks.splice(existingMarkIndex, 1);
        }
    } else {
        // 添加新的大于号标记
        add_directional_mark(
            row1, col1, 
            row2, col2, 
            direction, 
            true // 默认为大于号
        );
    }
}


/**
 * 设置连续标记模式
 */
export function set_consecutive_mode(direction) {
    if (current_direction === direction) {
        // 如果再次点击相同按钮，则退出连续标记模式
        current_direction = null;
        is_consecutive_mode_active = false;
        show_result(`已退出${direction === 'horizontal' ? '水平' : '垂直'}连续标记模式`, 'info');
    } else {
        // 进入连续标记模式
        current_direction = direction;
        is_consecutive_mode_active = true;
        show_result(`已进入${direction === 'horizontal' ? '水平' : '垂直'}连续标记模式，点击相邻两格之间的边线添加标记。再次点击按钮可退出此模式。`, 'info');
    }
}

/**
 * 设置连续数独事件监听器
 */
function setup_consecutive_event_listeners() {
    const container = document.querySelector('.sudoku-container');
    const cells = container.querySelectorAll('.sudoku-cell');
    const cellSize = 60; // 假设每个单元格大小为60px
    
    cells.forEach(cell => {
        cell.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 定义边线点击区域宽度（像素）
            const edgeThreshold = 8;
            
            // 确定点击的是哪条边
            let edge = null;
            if (x < edgeThreshold) edge = 'left';
            else if (x > rect.width - edgeThreshold) edge = 'right';
            else if (y < edgeThreshold) edge = 'top';
            else if (y > rect.height - edgeThreshold) edge = 'bottom';
            
            if (!edge) return;
            
            const row = parseInt(this.dataset.row);
            const col = parseInt(this.dataset.col);
            let targetRow = row, targetCol = col;
            let direction;
            
            switch(edge) {
                case 'top': 
                    targetRow = row - 1; 
                    direction = 'vertical';
                    break;
                case 'bottom': 
                    targetRow = row + 1; 
                    direction = 'vertical';
                    break;
                case 'left': 
                    targetCol = col - 1; 
                    direction = 'horizontal';
                    break;
                case 'right': 
                    targetCol = col + 1; 
                    direction = 'horizontal';
                    break;
            }
            
            // 检查是否在网格范围内
            if (targetRow < 0 || targetRow >= state.current_grid_size || 
                targetCol < 0 || targetCol >= state.current_grid_size) {
                return;
            }
            
            if (is_consecutive_mode_active && !is_inequality_mode_active) {
                // 处理连续标记逻辑
                const existingMarkIndex = consecutive_marks.findIndex(mark => 
                    ((mark.row1 === row && mark.col1 === col && mark.row2 === targetRow && mark.col2 === targetCol) ||
                     (mark.row1 === targetRow && mark.col1 === targetCol && mark.row2 === row && mark.col2 === col)) &&
                    mark.direction === direction &&
                    !mark.isDirectional // 确保不是不等号标记
                );
                
                if (existingMarkIndex !== -1) {
                    // 移除现有标记
                    consecutive_marks[existingMarkIndex].element.remove();
                    consecutive_marks.splice(existingMarkIndex, 1);
                    return;
                }
                
                // 添加新连续标记
                add_consecutive_mark(row, col, targetRow, targetCol, direction);
            } 
            else if (is_inequality_mode_active && !is_consecutive_mode_active) {
                // 处理不等号标记逻辑
                handle_inequality_mark(row, col, targetRow, targetCol, direction);
            }
        });
    });
}

/**
 * 添加连续标记
 */
function add_consecutive_mark(row1, col1, row2, col2, direction) {
    // 创建新标记
    const container = document.querySelector('.sudoku-container');
    const markElement = document.createElement('div');
    markElement.className = 'consecutive-mark';
    
    // 设置标记样式
    const cellSize = 60; // 每个单元格的大小
    const markWidth = direction === 'horizontal' ? 4 : 30;
    const markHeight = direction === 'horizontal' ? 30 : 4;
    
    // 计算位置 (在两格中间)
    let x, y;
    const horizontalAdjust = 0.5; // 水平方向微调
    const verticalAdjust = 0.5;   // 垂直方向微调
    
    if (direction === 'horizontal') {
        // 水平方向标记 (左右关系)
        const minCol = Math.min(col1, col2);
        x = (minCol + 1) * cellSize - markWidth / 2 + horizontalAdjust;
        y = (row1 + 0.5) * cellSize - markHeight / 2 + verticalAdjust;
    } else {
        // 垂直方向标记 (上下关系)
        const minRow = Math.min(row1, row2);
        x = (col1 + 0.5) * cellSize - markWidth / 2 + horizontalAdjust;
        y = (minRow + 1) * cellSize - markHeight / 2 + verticalAdjust;
    }
    
    markElement.style.left = `${x}px`;
    markElement.style.top = `${y}px`;
    markElement.style.width = `${markWidth}px`;
    markElement.style.height = `${markHeight}px`;
    markElement.style.backgroundColor = '#000';
    markElement.style.position = 'absolute';
    markElement.style.pointerEvents = 'none'; // 防止标记阻挡点击事件
    
    container.appendChild(markElement);
    
    // 存储标记信息
    consecutive_marks.push({
        row1, col1, row2, col2,
        direction,
        element: markElement
    });
}

/**
 * 清除所有标记时也需要清除不等号标记
 */
export function clear_consecutive_marks() {
    consecutive_marks.forEach(mark => mark.element.remove());
    consecutive_marks = [];
    show_result("已清除所有标记", 'info');
}

/**
 * 一键标记所有符合连续规则的相邻数字对
 */
export function auto_mark_consecutive() {
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    
    // 先清除所有现有标记
    clear_consecutive_marks();
    
    // 遍历所有相邻单元格对
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // 检查右侧相邻单元格
            if (col < size - 1) {
                check_and_mark_pair(row, col, row, col + 1, 'horizontal');
            }
            
            // 检查下方相邻单元格
            if (row < size - 1) {
                check_and_mark_pair(row, col, row + 1, col, 'vertical');
            }
        }
    }
    
    show_result("已自动标记所有符合连续规则的相邻数字对", 'success');
}

/**
 * 检查并标记符合条件的数字对
 */
function check_and_mark_pair(row1, col1, row2, col2, direction) {
    const container = document.querySelector('.sudoku-container');
    const input1 = container.querySelector(`input[data-row="${row1}"][data-col="${col1}"]`);
    const input2 = container.querySelector(`input[data-row="${row2}"][data-col="${col2}"]`);
    
    const val1 = parseInt(input1?.value);
    const val2 = parseInt(input2?.value);
    
    // 只有当两个单元格都有数字时才检查
    if (!isNaN(val1) && !isNaN(val2)) {
        const diff = Math.abs(val1 - val2);
        
        if (diff === 1) {
            add_consecutive_mark(row1, col1, row2, col2, direction);
        }
    }
}

// /**
//  * 验证定向连续数独唯一性
//  */
// export function check_consecutive_uniqueness() {
//     const container = document.querySelector('.sudoku-container');
//     const size = state.current_grid_size;
    
//     // 收集当前盘面数据
//     let board = Array.from({ length: size }, (_, i) =>
//         Array.from({ length: size }, (_, j) => {
//             const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
//             const val = input ? parseInt(input.value) : NaN;
//             return isNaN(val) ? 0 : val;
//         })
//     );
    
//     // 收集所有相邻关系
//     const allAdjacentPairs = getAllAdjacentPairs(size);
    
//     // 收集连续约束
//     const consecutiveConstraints = consecutive_marks.map(mark => {
//         // 对于方向性标记
//         if (mark.isDirectional) {
//             return {
//                 cell1: { row: mark.row1, col: mark.col1 },
//                 cell2: { row: mark.row2, col: mark.col2 },
//                 direction: mark.direction,
//                 isDirectional: true,
//                 isFirstGreater: mark.isFirstGreater
//             };
//         }
//         // 对于普通连续标记
//         else {
//             const input1 = container.querySelector(`input[data-row="${mark.row1}"][data-col="${mark.col1}"]`);
//             const input2 = container.querySelector(`input[data-row="${mark.row2}"][data-col="${mark.col2}"]`);
            
//             const val1 = parseInt(input1?.value);
//             const val2 = parseInt(input2?.value);
            
//             return {
//                 cell1: { row: mark.row1, col: mark.col1 },
//                 cell2: { row: mark.row2, col: mark.col2 },
//                 direction: mark.direction,
//                 isDirectional: false,
//                 isFirstGreater: !isNaN(val1) && !isNaN(val2) ? val1 > val2 : null
//             };
//         }
//     });
    
//     // 验证当前盘面是否有效
//     if (!validateCurrentBoard(board, size, consecutiveConstraints)) {
//         show_result("当前盘面存在冲突，无法验证唯一解", 'error');
//         return;
//     }

//     // 转换为候选数板格式
//     const candidateBoard = board.map(row => 
//         row.map(cell => cell === 0 ? 
//             [...Array(size)].map((_, i) => i + 1) : 
//             cell
//         )
//     );

//     // 调用solve函数，传入自定义验证函数处理连续约束
//     const { solution_count, solution } = solve(
//         candidateBoard, 
//         size,
//         (r, c, num) => isValidPlacement(r, c, num, board, size, consecutiveConstraints, allAdjacentPairs)
//     );
    
//     // 显示结果
//     if (solution_count === 0) {
//         show_result("当前定向连续数独无解！请检查数字和连续标记是否正确。", 'error');
//     } else if (solution_count === 1) {
//         show_result("当前定向连续数独有唯一解！", 'success');
        
//         if (confirm("是否要填充唯一解？")) {
//             fill_solution(container, solution, size);
//         }
//     } else {
//         show_result(`当前定向连续数独有 ${solution_count} 个解！`, 'error');
//     }
// }

/**
 * 检查数字放置是否有效
 */
function isValidPlacement(row, col, num, board, size, consecutiveConstraints, allAdjacentPairs) {
    // 检查行、列是否有效
    for (let i = 0; i < size; i++) {
        if (board[row][i] === num) return false;
        if (board[i][col] === num) return false;
    }
    
    // 修改为支持6宫格的特殊处理 - 替换原有的宫格大小计算
    const boxHeight = size === 6 ? 2 : Math.sqrt(size);
    const boxWidth = size === 6 ? 3 : Math.sqrt(size);

    const startRow = Math.floor(row / boxHeight) * boxHeight;
    const startCol = Math.floor(col / boxWidth) * boxWidth;

    // 检查宫格内是否有效
    for (let r = startRow; r < startRow + boxHeight; r++) {
        for (let c = startCol; c < startCol + boxWidth; c++) {
            if (board[r][c] === num) return false;
        }
    }
    
    // // 检查连续约束 - 修复点2
    // for (const constraint of consecutiveConstraints) {
    //     const isCell1 = (constraint.cell1.row === row && constraint.cell1.col === col);
    //     const isCell2 = (constraint.cell2.row === row && constraint.cell2.col === col);
        
    //     if (isCell1 || isCell2) {
    //         const otherCell = isCell1 ? constraint.cell2 : constraint.cell1;
    //         const otherValue = board[otherCell.row][otherCell.col];
            
    //         if (otherValue !== 0) {
    //             if (constraint.isDirectional) {
    //                 // 方向标记检查
    //                 if (isCell1) {
    //                     if (constraint.isFirstGreater && num <= otherValue) return false;
    //                     if (!constraint.isFirstGreater && num >= otherValue) return false;
    //                 } else {
    //                     if (constraint.isFirstGreater && otherValue <= num) return false;
    //                     if (!constraint.isFirstGreater && otherValue >= num) return false;
    //                 }
    //             } 
    //             // 额外检查：方向标记的相邻数字差必须为1
    //             if (Math.abs(num - otherValue) !== 1) return false;
    //         }
    //     }
    // }
    
    // // 检查未标记的相邻单元格不能差为1 - 修复点3
    // for (const pair of allAdjacentPairs) {
    //     if ((pair.row1 === row && pair.col1 === col) || 
    //         (pair.row2 === row && pair.col2 === col)) {
            
    //         const otherRow = pair.row1 === row ? pair.row2 : pair.row1;
    //         const otherCol = pair.col1 === col ? pair.col2 : pair.col1;
    //         const otherValue = board[otherRow][otherCol];
            
    //         if (otherValue !== 0) {
    //             const diff = Math.abs(num - otherValue);
    //             const hasMark = consecutiveConstraints.some(c => 
    //                 (c.cell1.row === pair.row1 && c.cell1.col === pair.col1 &&
    //                  c.cell2.row === pair.row2 && c.cell2.col === pair.col2) ||
    //                 (c.cell1.row === pair.row2 && c.cell1.col === pair.col2 &&
    //                  c.cell2.row === pair.row1 && c.cell2.col === pair.col1));
                
    //             if (!hasMark && diff === 1) {
    //                 return false;
    //             }
    //         }
    //     }
    // }
    // 检查连续约束 - 添加空约束检查
    if (!consecutiveConstraints || !Array.isArray(consecutiveConstraints)) {
        consecutiveConstraints = [];
    }

    for (const constraint of consecutiveConstraints) {
        // 确保约束对象有效
        if (!constraint || !constraint.cell1 || !constraint.cell2) continue;
        
        const isCell1 = (constraint.cell1.row === row && constraint.cell1.col === col);
        const isCell2 = (constraint.cell2.row === row && constraint.cell2.col === col);
        
        if (isCell1 || isCell2) {
            const otherCell = isCell1 ? constraint.cell2 : constraint.cell1;
            const otherValue = board[otherCell.row][otherCell.col];
            
            if (otherValue !== 0) {
                if (constraint.isDirectional) {
                    // 方向标记检查
                    if (isCell1) {
                        if (constraint.isFirstGreater && num <= otherValue) return false;
                        if (!constraint.isFirstGreater && num >= otherValue) return false;
                    } else {
                        if (constraint.isFirstGreater && otherValue <= num) return false;
                        if (!constraint.isFirstGreater && otherValue >= num) return false;
                    }
                } 
                // 额外检查：方向标记的相邻数字差必须为1
                if (Math.abs(num - otherValue) !== 1) return false;
            }
        }
    }
    
    // 检查未标记的相邻单元格不能差为1
    for (const pair of allAdjacentPairs) {
        if ((pair.row1 === row && pair.col1 === col) || 
            (pair.row2 === row && pair.col2 === col)) {
            
            const otherRow = pair.row1 === row ? pair.row2 : pair.row1;
            const otherCol = pair.col1 === col ? pair.col2 : pair.col1;
            const otherValue = board[otherRow][otherCol];
            
            if (otherValue !== 0) {
                const diff = Math.abs(num - otherValue);
                const hasMark = consecutiveConstraints.some(c => 
                    c && c.cell1 && c.cell2 && 
                    ((c.cell1.row === pair.row1 && c.cell1.col === pair.col1 &&
                     c.cell2.row === pair.row2 && c.cell2.col === pair.col2) ||
                    (c.cell1.row === pair.row2 && c.cell1.col === pair.col2 &&
                     c.cell2.row === pair.row1 && c.cell2.col === pair.col1)));
                
                if (!hasMark && diff === 1) {
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
                row2: row, col2: col + 1,
                direction: 'horizontal'
            });
        }
    }
    // 垂直相邻对
    for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size; col++) {
            pairs.push({
                row1: row, col1: col,
                row2: row + 1, col2: col,
                direction: 'vertical'
            });
        }
    }
    return pairs;
}
/**
 * 将连续标记转换为方向标记(>或<)
 */
export function convert_to_directional_marks() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    
    // 先检查所有标记是否满足连续条件
    let allValid = true;
    const marksToUpdate = [];
    
    consecutive_marks.forEach(mark => {
        const input1 = container.querySelector(`input[data-row="${mark.row1}"][data-col="${mark.col1}"]`);
        const input2 = container.querySelector(`input[data-row="${mark.row2}"][data-col="${mark.col2}"]`);
        
        const val1 = parseInt(input1?.value);
        const val2 = parseInt(input2?.value);
        
        if (isNaN(val1) || isNaN(val2)) {
            allValid = false;
            return;
        }
        
        const diff = Math.abs(val1 - val2);
        if (diff !== 1) {
            allValid = false;
            input1.style.backgroundColor = '#ffcdd2';
            input2.style.backgroundColor = '#ffcdd2';
            return;
        }
        
        // 确定方向
        const isFirstGreater = val1 > val2;
        marksToUpdate.push({
            ...mark,
            isFirstGreater
        });
    });
    
    if (!allValid) {
        show_result("部分连续标记不满足差为1的条件，无法转换为方向标记", 'error');
        return;
    }

    // 清除原有标记
    clear_consecutive_marks();
    
    // 添加新的方向标记
    marksToUpdate.forEach(mark => {
        add_directional_mark(
            mark.row1, 
            mark.col1, 
            mark.row2, 
            mark.col2, 
            mark.direction, 
            mark.isFirstGreater
        );
    });
    
    show_result("已将所有连续标记转换为方向标记", 'success');
}

/**
 * 验证当前盘面是否有效
 */
function validateCurrentBoard(board, size, constraints) {
    // 检查所有已填数字是否符合规则
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const num = board[row][col];
            if (num !== 0) {
                // 临时清空该单元格以便验证
                const temp = board[row][col];
                board[row][col] = 0;
                
                if (!isValidPlacement(row, col, num, board, size, constraints, getAllAdjacentPairs(size))) {
                    board[row][col] = temp;
                    return false;
                }
                
                board[row][col] = temp;
            }
        }
    }
    return true;
}

/**
 * 添加方向标记(>或<)
 */
function add_directional_mark(row1, col1, row2, col2, direction, isFirstGreater) {
    // 创建新标记
    const container = document.querySelector('.sudoku-container');
    const markElement = document.createElement('div');
    markElement.className = 'vx-mark';
 
    // 设置标记内容
    let symbol;
    if (direction === 'horizontal') {
        symbol = isFirstGreater ? '＞' : '＜';
    } else {
        symbol = isFirstGreater ? '∨' : '∧'; // 使用箭头表示垂直方向
    }
    
    markElement.textContent = symbol;
    markElement.style.fontSize = '16px';
    markElement.style.fontWeight = 'bold';
    
    // 计算位置 (在两格中间)
    const cellSize = 60; // 每个单元格的大小
    const markSize = 20; // 标记的大小
    
    let x, y;
    const horizontalAdjust = 0.5; // 水平方向微调
    const verticalAdjust = 0.5;   // 垂直方向微调

    if (direction === 'horizontal') {
        // 水平方向标记 (左右关系)
        const minCol = Math.min(col1, col2);
        x = (minCol + 1) * cellSize - markSize / 2 + horizontalAdjust;
        y = (row1 + 0.5) * cellSize - markSize / 2 + verticalAdjust;
    } else {
        // 垂直方向标记 (上下关系)
        const minRow = Math.min(row1, row2);
        x = (col1 + 0.5) * cellSize - markSize / 2 + horizontalAdjust;
        y = (minRow + 1) * cellSize - markSize / 2 + verticalAdjust;
    }
    
    markElement.style.left = `${x}px`;
    markElement.style.top = `${y}px`;
    markElement.style.width = `${markSize}px`;
    markElement.style.height = `${markSize}px`;
    markElement.style.display = 'flex';
    markElement.style.justifyContent = 'center';
    markElement.style.alignItems = 'center';
    markElement.style.position = 'absolute';
    markElement.style.pointerEvents = 'none'; // 防止标记阻挡点击事件
    
    container.appendChild(markElement);
    
    // 存储标记信息
    consecutive_marks.push({
        row1, col1, row2, col2,
        direction,
        isFirstGreater,
        symbol,
        element: markElement,
        isDirectional: true
    });
}




