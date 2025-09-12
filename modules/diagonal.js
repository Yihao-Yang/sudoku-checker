import { state, set_current_mode } from './state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell } from './core.js';
import { solve, isValid, get_all_regions } from '../solver/solver_tool.js';
import { create_technique_panel } from './classic.js';

// 对角线数独主入口
export function create_diagonal_sudoku(size) {
    set_current_mode('diagonal');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

    // 修改技巧开关
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,
        Box_Pair_Block: true,
        Row_Col_Block: true,
        Box_Naked_Pair: true,
        Row_Col_Naked_Pair: true,
        Box_Hidden_Pair: true,
        Row_Col_Hidden_Pair: true,
        Box_Naked_Triple: true,
        Row_Col_Naked_Triple: true,
        Box_Hidden_Triple: true,
        Row_Col_Hidden_Triple: true,
        All_Quad: false,
        Cell_Elimination: true,
        Brute_Force: false,
        Variant_Elimination: true,
        Variant_Block: true,
        Variant_Naked_Pair: true,
        Variant_Hidden_Pair: true,
        Variant_Naked_Triple: true,
        Variant_Hidden_Triple: true
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= 9; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 刷新技巧面板
    create_technique_panel();

    // 创建基础数独盘面
    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        // cell.classList.add('diagonal-mode');

        // 添加元素到DOM
        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        // 对角线高亮（主对角线和副对角线）
        if (row === col || row + col === size - 1) {
            cell.classList.add('diagonal-cell');
        }

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

        // // 加粗边框
        // bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 自动绘制两条对角线
    draw_diagonal_lines(container, size);

    // 添加对角线数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    // add_Extra_Button('验证唯一解', check_diagonal_uniqueness, '#2196F3');
    // add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
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