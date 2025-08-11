import { state, set_current_mode } from './state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation } from './core.js';
import { solve, isValid } from '../solver/solver_tool.js';
import { generate_puzzle, get_symmetric_positions } from '../solver/generate.js';

// 斜线数独主入口
export function create_multi_diagonal_sudoku(size) {
    set_current_mode('multi_diagonal');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

    // 创建基础数独盘面
    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        // 创建单元格容器
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell multi_diagonal-mode';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // 创建主输入框
        const main_input = document.createElement('input');
        main_input.type = 'text';
        main_input.className = 'main-input';
        main_input.maxLength = size;
        main_input.dataset.row = row;
        main_input.dataset.col = col;

        // 斜线高亮（主对角线和副对角线）
        if (row === col || row + col === size - 1) {
            cell.classList.add('multi_diagonal-cell');
        }

        // 添加元素到DOM
        cell.appendChild(main_input);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        // 输入事件处理
        main_input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
            // 只允许输入一个数字，后输入的覆盖前面的
            if (this.value.length > 1) {
                this.value = this.value[this.value.length - 1];
            }
        });

        // 键盘导航（可复用 classic 的 handle_key_navigation）
        main_input.addEventListener('keydown', function(e) {
            handle_key_navigation(e, row, col, size, inputs);
        });

        // 加粗边框
        bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加斜线数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('添加标记', toggle_multi_diagonal_mark_mode, '#2196F3');
    // 标记模式状态
    let is_mark_mode = false;
    let mark_mode_btn = null;
    // 切换标记模式
    function toggle_multi_diagonal_mark_mode() {
        if (!is_mark_mode) {
            is_mark_mode = true;
            if (!mark_mode_btn) {
                mark_mode_btn = Array.from(document.getElementById('extraButtons').children).find(btn => btn.textContent.includes('标记'));
            }
            if (mark_mode_btn) mark_mode_btn.textContent = '退出标记';
            add_multi_diagonal_mark();
        } else {
            is_mark_mode = false;
            if (!mark_mode_btn) {
                mark_mode_btn = Array.from(document.getElementById('extraButtons').children).find(btn => btn.textContent.includes('标记'));
            }
            if (mark_mode_btn) mark_mode_btn.textContent = '添加标记';
            exit_multi_diagonal_mark();
        }
    }

    // 退出标记模式，保留已画线
    function exit_multi_diagonal_mark() {
        const container = document.querySelector('.sudoku-container');
        if (!container) return;
        Array.from(container.querySelectorAll('.sudoku-cell')).forEach(cell => {
            cell.removeEventListener('mousedown', cell._markListener);
            cell._markListener = null;
        });
        container.removeEventListener('mousemove', container._markMouseMove);
        // 保留SVG和已画线，不清除
        show_result('已退出标记模式。');
    }
    add_Extra_Button('验证唯一解', check_multi_diagonal_uniqueness, '#2196F3');
    add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
    add_Extra_Button('清除标记', clear_multi_diagonal_marks, '#2196F3');
    add_Extra_Button('自动出题', () => generate_multi_diagonal_puzzle(size), '#2196F3');
}

// 自动生成多斜线数独题目（含对称斜线标记）
export function generate_multi_diagonal_puzzle(size) {
// 随机生成斜线标记
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;

    // 随机生成 2 到 4 条斜线标记
    const numLines = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4 lines
    for (let i = 0; i < numLines; i++) {
        // 随机选择起点和终点格子
        const startRow = Math.floor(Math.random() * size);
        const startCol = Math.floor(Math.random() * size);
        const endRow = Math.floor(Math.random() * size);
        const endCol = Math.floor(Math.random() * size);

        // 确保起点和终点不同
        if (startRow !== endRow || startCol !== endCol) {
            draw_multi_diagonal_line(size, [startRow, startCol], [endRow, endCol]);
        }
    }

    // 调用自动出题
    generate_puzzle(size);

}

// 清除所有斜线标记线
export function clear_multi_diagonal_marks() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    const svg = grid.querySelector('.mark-svg');
    if (svg) {
        // 只移除所有已画线（保留SVG容器）
        Array.from(svg.querySelectorAll('line')).forEach(line => line.remove());
    }
    show_result('所有标记已清除。');
}

// 验证斜线数独唯一解
export function check_multi_diagonal_uniqueness() {
    // 清空之前的日志
    log_process('', true);

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
            return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
        })
    );


    const { solutionCount, solution } = solve(board, size, isValid_multi_diagonal); // 调用主求解函数
    state.solutionCount = solutionCount;


    // 显示结果
    if (state.solutionCount === -1) {
        show_result("当前技巧无法解出");
    } else if (state.solutionCount === 0 || state.solutionCount === -2) {
        show_result("当前数独无解！");
    } else if (state.solutionCount === 1) {
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
                    // 如果是标准数独模式且该格已有数字，则跳过
                    if (!state.is_candidates_mode && input.value) {
                        continue;
                    }
                    input.value = solution[i][j];
                    input.classList.add("solution-cell");
                }
            }
        }
        show_result("当前数独恰好有唯一解！已自动填充答案。");
    } else if (state.solutionCount > 1) {
        show_result("当前数独有多个解。");
    } else {
        show_result(`当前数独有${state.solutionCount}个解！`);
    }
}

    // 斜线数独“添加标记”功能（仅弹窗，后续可扩展）
export function add_multi_diagonal_mark() {
    show_result('请依次点击两个格子以添加标记线。');

    const container = document.querySelector('.sudoku-container');
    if (!container) return;

    // 保留已画线，只移除临时线和事件
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    grid.style.position = 'relative';
    // 移除旧的SVG，避免重复
    let svg = grid.querySelector('.mark-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('mark-svg');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.setAttribute('width', grid.clientWidth);
        svg.setAttribute('height', grid.clientHeight);
        svg.style.pointerEvents = 'none';
        grid.appendChild(svg);
    }

    let firstCell = null;
    let tempLine = null;

    function getCellPercentCenter(cell) {
        // 获取cell在grid中的百分比中心
        const cells = Array.from(grid.querySelectorAll('.sudoku-cell'));
        const idx = cells.indexOf(cell);
        const size = Math.sqrt(cells.length);
        const row = Math.floor(idx / size);
        const col = idx % size;
        // 计算每格宽高百分比
        const x = (col + 0.5) * (100 / size);
        const y = (row + 0.5) * (100 / size);
        return { x, y };
    }

    function drawTempLine(x1, y1, x2, y2) {
        if (!tempLine) {
            tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tempLine.setAttribute('stroke', '#888');
            tempLine.setAttribute('stroke-width', '4');
            tempLine.setAttribute('stroke-linecap', 'round');
            tempLine.setAttribute('opacity', '1');
            svg.appendChild(tempLine);
        }
        tempLine.setAttribute('x1', `${x1}%`);
        tempLine.setAttribute('y1', `${y1}%`);
        tempLine.setAttribute('x2', `${x2}%`);
        tempLine.setAttribute('y2', `${y2}%`);
    }

    function clearTempLine() {
        if (tempLine) {
            tempLine.remove();
            tempLine = null;
        }
    }

    function drawFinalLine(x1, y1, x2, y2) {
        // 通过百分比坐标反推格子坐标
        const size = Math.sqrt(grid.querySelectorAll('.sudoku-cell').length);
        const col1 = Math.round((x1 / 100) * size - 0.5);
        const row1 = Math.round((y1 / 100) * size - 0.5);
        const col2 = Math.round((x2 / 100) * size - 0.5);
        const row2 = Math.round((y2 / 100) * size - 0.5);
        // 调用统一画线函数
        draw_multi_diagonal_line(size, [row1, col1], [row2, col2]);
    }

    function onCellClick(e) {
        const cell = e.currentTarget;
        if (!firstCell) {
            firstCell = cell;
            cell.classList.add('marking-cell');
            container._markMouseMove = onMouseMove;
            container.addEventListener('mousemove', onMouseMove);
        } else if (cell !== firstCell) {
            const p1 = getCellPercentCenter(firstCell);
            const p2 = getCellPercentCenter(cell);
            drawFinalLine(p1.x, p1.y, p2.x, p2.y);
            firstCell.classList.remove('marking-cell');
            clearTempLine();
            firstCell = null;
            container.removeEventListener('mousemove', onMouseMove);
        }
    }

    function onMouseMove(e) {
        if (!firstCell) return;
        // 鼠标在grid上的百分比位置
        const gridRect = grid.getBoundingClientRect();
        const x2 = ((e.clientX - gridRect.left) / gridRect.width) * 100;
        const y2 = ((e.clientY - gridRect.top) / gridRect.height) * 100;
        const p1 = getCellPercentCenter(firstCell);
        drawTempLine(p1.x, p1.y, x2, y2);
    }

    Array.from(grid.querySelectorAll('.sudoku-cell')).forEach(cell => {
        cell._markListener = onCellClick;
        cell.addEventListener('mousedown', onCellClick);
    });

    // 响应式：窗口变化时重设SVG尺寸
    if (!grid._resizeListenerAdded) {
        grid._resizeListenerAdded = true;
        window.addEventListener('resize', () => {
            svg.setAttribute('width', grid.clientWidth);
            svg.setAttribute('height', grid.clientHeight);
        });
    }
}

// /**
//  * 在数独盘面上画一条斜线标记
//  * @param {number} size - 数独盘面大小
//  * @param {[number, number]} start - 起点坐标 [row, col]
//  * @param {[number, number]} end - 终点坐标 [row, col]
//  * @param {string} [color='#888'] - 线条颜色
//  */
// export function draw_multi_diagonal_line(size, start, end, color = '#888') {
//     const container = document.querySelector('.sudoku-container');
//     if (!container) return;
//     const grid = container.querySelector('.sudoku-grid');
//     if (!grid) return;
//     let svg = grid.querySelector('.mark-svg');
//     if (!svg) {
//         svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
//         svg.classList.add('mark-svg');
//         svg.style.position = 'absolute';
//         svg.style.left = '0';
//         svg.style.top = '0';
//         svg.style.width = '100%';
//         svg.style.height = '100%';
//         svg.setAttribute('width', grid.clientWidth);
//         svg.setAttribute('height', grid.clientHeight);
//         svg.style.pointerEvents = 'none';
//         grid.appendChild(svg);
//     }
//     // 百分比中心
//     function percent_center(row, col) {
//         return {
//             x: (col + 0.5) * (100 / size),
//             y: (row + 0.5) * (100 / size)
//         };
//     }
//     const p1 = percent_center(start[0], start[1]);
//     const p2 = percent_center(end[0], end[1]);
//     const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
//     line.setAttribute('x1', `${p1.x}%`);
//     line.setAttribute('y1', `${p1.y}%`);
//     line.setAttribute('x2', `${p2.x}%`);
//     line.setAttribute('y2', `${p2.y}%`);
//     line.setAttribute('stroke', color);
//     line.setAttribute('stroke-width', '4');
//     line.setAttribute('stroke-linecap', 'round');
//     line.setAttribute('opacity', '1');
//     svg.appendChild(line);
// }

// ...existing code...
/**
 * 在数独盘面上画一条斜线标记
 * @param {number} size - 数独盘面大小
 * @param {[number, number]|HTMLElement} start - 起点坐标 [row, col] 或格子DOM
 * @param {[number, number]|HTMLElement} end - 终点坐标 [row, col] 或格子DOM
 * @param {string} [color='#888'] - 线条颜色
 */
export function draw_multi_diagonal_line(size, start, end, color = '#888') {
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    let svg = grid.querySelector('.mark-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('mark-svg');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.setAttribute('width', grid.clientWidth);
        svg.setAttribute('height', grid.clientHeight);
        svg.style.pointerEvents = 'none';
        grid.appendChild(svg);
    }
    // 百分比中心
    function percent_center(row, col) {
        return {
            x: (col + 0.5) * (100 / size),
            y: (row + 0.5) * (100 / size)
        };
    }
    // 支持DOM元素输入
    function get_center(pos) {
        if (Array.isArray(pos)) {
            return percent_center(pos[0], pos[1]);
        } else if (pos instanceof HTMLElement) {
            const cells = Array.from(grid.querySelectorAll('.sudoku-cell'));
            const idx = cells.indexOf(pos);
            const row = Math.floor(idx / size);
            const col = idx % size;
            return percent_center(row, col);
        }
        return { x: 0, y: 0 };
    }
    const p1 = get_center(start);
    const p2 = get_center(end);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${p1.x}%`);
    line.setAttribute('y1', `${p1.y}%`);
    line.setAttribute('x2', `${p2.x}%`);
    line.setAttribute('y2', `${p2.y}%`);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '1');
    svg.appendChild(line);
}
// ...existing code...

// 获取所有标记线经过的格子（假设有此辅助函数）
export function get_cells_on_line(size, start, end) {
    const cells = [];
    const [r1, c1] = start;
    const [r2, c2] = end;
    const dr = r2 - r1;
    const dc = c2 - c1;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    for (let k = 0; k <= steps; k++) {
        const row = Math.round(r1 + (dr * k) / steps);
        const col = Math.round(c1 + (dc * k) / steps);
        cells.push([row, col]);
    }
    return cells;
}
// 获取所有已画标记线的端点坐标
export function get_all_mark_lines() {
    const container = document.querySelector('.sudoku-container');
    if (!container) return [];
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return [];
    const svg = grid.querySelector('.mark-svg');
    if (!svg) return [];
    const lines = Array.from(svg.querySelectorAll('line'));
    const size = state.current_grid_size;
    const result = [];
    for (const line of lines) {
        // 获取百分比坐标
        const x1 = parseFloat(line.getAttribute('x1'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y2 = parseFloat(line.getAttribute('y2'));
        // 转换为格子坐标
        const col1 = Math.round((x1 / 100) * size - 0.5);
        const row1 = Math.round((y1 / 100) * size - 0.5);
        const col2 = Math.round((x2 / 100) * size - 0.5);
        const row2 = Math.round((y2 / 100) * size - 0.5);
        // 检查坐标有效性
        if (
            row1 >= 0 && row1 < size && col1 >= 0 && col1 < size &&
            row2 >= 0 && row2 < size && col2 >= 0 && col2 < size
        ) {
            result.push([[row1, col1], [row2, col2]]);
        }
    }
    return result;
}

// 多斜线数独专用有效性检测（含标记线）
export function isValid_multi_diagonal(board, size, row, col, num) {
    // 标准数独规则
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
    // 检查所有已画标记线
    const markLines = get_all_mark_lines(); // 需你实现或已有
    for (const [start, end] of markLines) {
        const cells = get_cells_on_line(size, start, end);
        // 如果当前格子在这条线上
        if (cells.some(([r, c]) => r === row && c === col)) {
            // 检查线上其他格子是否有重复数字
            for (const [r, c] of cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }
    return true;
}