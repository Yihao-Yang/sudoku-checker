import { state, set_current_mode } from './state.js';
import { show_result, log_process, bold_border, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell, add_Extra_Button } from './core.js';
import { create_technique_panel } from './classic.js';
import { get_all_regions } from '../solver/solver_tool.js';

// 新数独主入口
export function create_palindrome_sudoku(size) {
    set_current_mode('palindrome');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

    // 技巧设置（可根据需要调整）
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
        Special_Combination_Region_Elimination: true,
    };
    for (let i = 1; i <= 9; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    create_technique_panel();

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        main_input.addEventListener('input', function() {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
            if (this.value.length > 1) {
                this.value = this.value[this.value.length - 1];
            }
        });

        main_input.addEventListener('keydown', function(e) {
            handle_key_navigation(e, row, col, size, inputs);
        });

        bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加新数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    // 可添加唯一性验证等按钮
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
        // add_Extra_Button('验证唯一解', check_multi_diagonal_uniqueness, '#2196F3');
        // add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
        add_Extra_Button('清除标记', clear_multi_diagonal_marks, '#2196F3');
        add_Extra_Button('自动出题', () => generate_multi_diagonal_puzzle(size), '#2196F3');
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
    state.multi_diagonal_lines = [];
    show_result('所有标记已清除。');
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

    let first_cell = null;
    let temp_line = null;

    function get_cell_percent_center(cell) {
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

    function draw_temp_line(x1, y1, x2, y2) {
        if (!temp_line) {
            temp_line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            temp_line.setAttribute('stroke', '#888');
            temp_line.setAttribute('stroke-width', '4');
            temp_line.setAttribute('stroke-linecap', 'round');
            temp_line.setAttribute('opacity', '1');
            svg.appendChild(temp_line);
        }
        temp_line.setAttribute('x1', `${x1}%`);
        temp_line.setAttribute('y1', `${y1}%`);
        temp_line.setAttribute('x2', `${x2}%`);
        temp_line.setAttribute('y2', `${y2}%`);
    }

    function clear_temp_line() {
        if (temp_line) {
            temp_line.remove();
            temp_line = null;
        }
    }

    function draw_final_line(x1, y1, x2, y2) {
        // 通过百分比坐标反推格子坐标
        const size = Math.sqrt(grid.querySelectorAll('.sudoku-cell').length);
        const col1 = Math.round((x1 / 100) * size - 0.5);
        const row1 = Math.round((y1 / 100) * size - 0.5);
        const col2 = Math.round((x2 / 100) * size - 0.5);
        const row2 = Math.round((y2 / 100) * size - 0.5);
        // 调用统一画线函数
        draw_multi_diagonal_line(size, [row1, col1], [row2, col2]);
    }

    function on_cell_click(e) {
        const cell = e.currentTarget;
        if (!first_cell) {
            first_cell = cell;
            cell.classList.add('marking-cell');
            container._markMouseMove = on_mouse_move;
            container.addEventListener('mousemove', on_mouse_move);
        } else if (cell !== first_cell) {
            const p1 = get_cell_percent_center(first_cell);
            const p2 = get_cell_percent_center(cell);
            draw_final_line(p1.x, p1.y, p2.x, p2.y);
            first_cell.classList.remove('marking-cell');
            clear_temp_line();
            first_cell = null;
            container.removeEventListener('mousemove', on_mouse_move);
        }
    }

    function on_mouse_move(e) {
        if (!first_cell) return;
        // 鼠标在grid上的百分比位置
        const grid_rect = grid.getBoundingClientRect();
        const x2 = ((e.clientX - grid_rect.left) / grid_rect.width) * 100;
        const y2 = ((e.clientY - grid_rect.top) / grid_rect.height) * 100;
        const p1 = get_cell_percent_center(first_cell);
        draw_temp_line(p1.x, p1.y, x2, y2);
    }

    Array.from(grid.querySelectorAll('.sudoku-cell')).forEach(cell => {
        cell._markListener = on_cell_click;
        cell.addEventListener('mousedown', on_cell_click);
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
        // svg.setAttribute('width', grid.clientWidth);
        // svg.setAttribute('height', grid.clientHeight);
        // svg.style.pointerEvents = 'none';
        grid.appendChild(svg);
    }

    // **每次画线前都同步 SVG 尺寸**
    svg.setAttribute('width', grid.clientWidth);
    svg.setAttribute('height', grid.clientHeight);
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
    // 优先读取 state.multi_diagonal_lines
    if (state.multi_diagonal_lines && state.multi_diagonal_lines.length > 0) {
        return state.multi_diagonal_lines;
    }
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

/**
 * 合并所有首尾相接的线段，返回合并后的线段（每条线是点数组）
 * @param {Array} lines - 线段数组，每个元素为[[r1,c1],[r2,c2]]
 * @returns {Array} 合并后的线，每条线是[[r1,c1],[r2,c2],...]
 */
export function merge_connected_lines(lines) {
    // 复制一份，避免修改原数组
    const segments = lines.map(line => [...line]);
    const merged = [];

    while (segments.length > 0) {
        let current = segments.shift();
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i];
                // current尾和seg头相接
                if (
                    current[current.length - 1][0] === seg[0][0] &&
                    current[current.length - 1][1] === seg[0][1]
                ) {
                    current = current.concat(seg.slice(1));
                    segments.splice(i, 1);
                    changed = true;
                    break;
                }
                // current头和seg尾相接
                if (
                    current[0][0] === seg[seg.length - 1][0] &&
                    current[0][1] === seg[seg.length - 1][1]
                ) {
                    current = seg.slice(0, -1).concat(current);
                    segments.splice(i, 1);
                    changed = true;
                    break;
                }
                // current头和seg头相接（反转seg）
                if (
                    current[0][0] === seg[0][0] &&
                    current[0][1] === seg[0][1]
                ) {
                    current = seg.reverse().slice(0, -1).concat(current);
                    segments.splice(i, 1);
                    changed = true;
                    break;
                }
                // current尾和seg尾相接（反转seg）
                if (
                    current[current.length - 1][0] === seg[seg.length - 1][0] &&
                    current[current.length - 1][1] === seg[seg.length - 1][1]
                ) {
                    current = current.concat(seg.reverse().slice(1));
                    segments.splice(i, 1);
                    changed = true;
                    break;
                }
            }
        }
        merged.push(current);
    }
    return merged;
}

// 回文数独有效性检测函数
export function is_valid_palindrome(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'palindrome';
    const regions = get_all_regions(size, mode);
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col)) {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 回文线规则
    // 获取所有回文线（合并后的线，每条线是格子数组）
    let palindrome_lines = [];
    if (typeof get_all_mark_lines === 'function' && typeof get_cells_on_line === 'function' && typeof merge_connected_lines === 'function') {
        const mark_lines = get_all_mark_lines();
        const expanded_lines = mark_lines.map(line => get_cells_on_line(size, line[0], line[1]));
        palindrome_lines = merge_connected_lines(expanded_lines);
    }

    for (const line of palindrome_lines) {
        // 检查该格是否在这条线内
        const idx = line.findIndex(([r, c]) => r === row && c === col);
        if (idx === -1) continue;
        const mirror_idx = line.length - 1 - idx;
        const [mirror_r, mirror_c] = line[mirror_idx];
        // 如果镜像格是自己，跳过
        if (mirror_r === row && mirror_c === col) continue;
        const mirror_val = board[mirror_r][mirror_c];
        // 如果镜像格已填且不是num，则不合法
        if (typeof mirror_val === 'number' && mirror_val !== 0 && mirror_val !== num) {
            return false;
        }
    }

    return true;
}