import { state, set_current_mode } from './state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation } from './core.js';
import { solve, isValid } from '../solver/solver_tool.js';

// 对角线数独主入口
export function create_diagonal_sudoku(size) {
    set_current_mode('diagonal');
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
        cell.className = 'sudoku-cell diagonal-mode';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // 创建主输入框
        const main_input = document.createElement('input');
        main_input.type = 'text';
        main_input.className = 'main-input';
        main_input.maxLength = size;
        main_input.dataset.row = row;
        main_input.dataset.col = col;

        // 对角线高亮（主对角线和副对角线）
        if (row === col || row + col === size - 1) {
            cell.classList.add('diagonal-cell');
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

    // 自动绘制两条对角线
    draw_diagonal_lines(container, size);

    // 添加对角线数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('验证唯一解', check_diagonal_uniqueness, '#2196F3');
    add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
}

// 绘制两条对角线
function draw_diagonal_lines(container, size) {
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    // 保证grid是相对定位
    grid.style.position = 'relative';
    // 移除旧的SVG，避免重复
    const oldSvg = grid.querySelector('.diagonal-svg');
    if (oldSvg) oldSvg.remove();

    // 创建新的SVG，插入到grid内
    let s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.classList.add('diagonal-svg');
    s.style.position = 'absolute';
    s.style.left = '0';
    s.style.top = '0';
    s.style.width = '100%';
    s.style.height = '100%';
    s.setAttribute('width', grid.clientWidth);
    s.setAttribute('height', grid.clientHeight);
    s.style.pointerEvents = 'none';
    grid.appendChild(s);
    // 主对角线（整体向右下偏移2px，灰色，细线）
    let line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', 0);
    line1.setAttribute('y1', 0);
    line1.setAttribute('x2', grid.clientWidth);
    line1.setAttribute('y2', grid.clientHeight);
    line1.setAttribute('stroke', '#888');
    line1.setAttribute('stroke-width', '4');
    line1.setAttribute('opacity', '1');
    s.appendChild(line1);
    // 副对角线（整体向右下偏移2px，灰色，细线）
    let line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', grid.clientWidth);
    line2.setAttribute('y1', 0);
    line2.setAttribute('x2', 0);
    line2.setAttribute('y2', grid.clientHeight);
    line2.setAttribute('stroke', '#888');
    line2.setAttribute('stroke-width', '4');
    line2.setAttribute('opacity', '1');
    s.appendChild(line2);

    // 响应式：窗口变化时重绘
    if (!grid._resizeListenerAdded) {
        grid._resizeListenerAdded = true;
        window.addEventListener('resize', () => {
            draw_diagonal_lines(container, size);
        });
    }
}

// 验证对角线数独唯一解
export function check_diagonal_uniqueness() {
    log_process('', true);
    const container = document.querySelector('.sudoku-container');
    const size = state.current_grid_size;
    backup_original_board();
    let board = Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => {
            const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
            const val = parseInt(input.value);
            if (state.is_candidates_mode && input.value.length > 1) {
                return [...new Set(input.value.split('').map(Number))].filter(n => n >= 1 && n <= size);
            }
            return isNaN(val) ? Array.from({length: size}, (_, n) => n + 1) : val;
        })
    );
    const { solutionCount, solution } = solve(board, size, isValid); // 调用主求解函数
    state.solutionCount = solutionCount;
    if (state.solutionCount === -1) {
        show_result("当前技巧无法解出");
    } else if (state.solutionCount === 0 || state.solutionCount === -2) {
        show_result("当前数独无解！");
    } else if (state.solutionCount === 1) {
        state.is_candidates_mode = false;
        document.getElementById('toggleCandidatesMode').textContent = '切换候选数模式';
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const input = container.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
                const cell = input.parentElement;
                const candidatesGrid = cell.querySelector('.candidates-grid');
                input.style.display = 'block';
                input.classList.remove('hide-input-text');
                if (candidatesGrid) {
                    candidatesGrid.style.display = 'none';
                }
                if (solution[i][j] > 0) {
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
