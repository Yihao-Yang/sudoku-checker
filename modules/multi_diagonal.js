import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, show_logical_solution, create_base_cell, show_generating_timer, hide_generating_timer, clear_all_inputs } from '../solver/core.js';
import { solve, isValid, invalidate_regions_cache } from '../solver/solver_tool.js';
import { generate_puzzle, get_symmetric_positions } from '../solver/generate.js';
import { create_technique_panel } from '../solver/classic.js';

// 斜线数独主入口
export function create_multi_diagonal_sudoku(size) {
    set_current_mode('multi_diagonal');
    show_result(`当前模式为斜线数独`);
    log_process('', true);
    log_process('规则：');
    log_process('斜线上数字不重复');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    log_process('"额外区域"：附加的不可重复区域');
    // log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('');
    log_process('自动出题：');
    log_process('蓝色：自动添加标记出题');
    log_process('绿色：根据给定标记出题');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

    // 修改技巧开关
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        // 区块技巧全部打开
        Box_Block: true,
        Variant_Box_Block: true,
        Box_Pair_Block: true,
        Extra_Region_Pair_Block: true,
        Row_Col_Block: true,
        Variant_Row_Col_Block: true,
        Extra_Region_Block: true,
        Variant_Extra_Region_Block: true,
        // 数对技巧
        Box_Naked_Pair: true,
        Row_Col_Naked_Pair: true,
        Box_Hidden_Pair: true,
        Row_Col_Hidden_Pair: true,
        // 数组技巧
        Box_Naked_Triple: true,
        Row_Col_Naked_Triple: true,
        Box_Hidden_Triple: true,
        Row_Col_Hidden_Triple: true,
        All_Quad: false,
        Cell_Elimination: true,
        Brute_Force: false,
        // 额外区域技巧
        Extra_Region_Elimination: true,
        Extra_Region_Naked_Pair: true,
        Extra_Region_Hidden_Pair: true,
        Extra_Region_Naked_Triple: true,
        Extra_Region_Hidden_Triple: true
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= size; i++) {
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

        // 斜线高亮（主对角线和副对角线）
        if (row === col || row + col === size - 1) {
            cell.classList.add('multi_diagonal-cell');
        }

        // 添加元素到DOM
        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
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

        // // 加粗边框
        // bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);

    // 添加斜线数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('斜线', () => {create_multi_diagonal_sudoku(size)}, '#2196F3');
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
    
    toggle_multi_diagonal_mark_mode();
    toggle_multi_diagonal_mark_mode();
    show_result(`当前模式为斜线数独`);
    // exit_multi_diagonal_mark();
    // add_Extra_Button('验证唯一解', check_multi_diagonal_uniqueness, '#2196F3');
    // add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
    add_Extra_Button('清除标记', clear_multi_diagonal_marks, '#2196F3');
    add_Extra_Button('自动出题', () => generate_multi_diagonal_puzzle(size), '#2196F3');
}

// ...existing code...
// 生成多斜线数独题目
export function generate_multi_diagonal_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    clear_all_inputs();
    clear_multi_diagonal_marks();
    const container = document.querySelector('.sudoku-container');
    if (!container) return;
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    invalidate_regions_cache();
    log_process('', true);

    // 斜线数量在 sqrt(size) 到 size 之间随机
    const min_lines = Math.ceil(Math.sqrt(size));
    const max_lines = size;
    const num_lines = Math.floor(Math.random() * (max_lines - min_lines + 1)) + min_lines;

    let lines_drawn = 0;
    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];

    // 选取对称类型
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
        // 'none'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    // 判断两点是否在同一个宫内
    function is_same_box(r1, c1, r2, c2) {
        const box_row1 = Math.floor(r1 / box_size[0]);
        const box_col1 = Math.floor(c1 / box_size[1]);
        const box_row2 = Math.floor(r2 / box_size[0]);
        const box_col2 = Math.floor(c2 / box_size[1]);
        return box_row1 === box_row2 && box_col1 === box_col2;
    }

    // 获取对称端点
    function get_symmetric_line(start, end, size, symmetry) {
        const [r1, c1] = start;
        const [r2, c2] = end;
        switch (symmetry) {
            case 'horizontal':
                return [
                    [size - 1 - r1, c1],
                    [size - 1 - r2, c2]
                ];
            case 'vertical':
                return [
                    [r1, size - 1 - c1],
                    [r2, size - 1 - c2]
                ];
            case 'central':
                return [
                    [size - 1 - r1, size - 1 - c1],
                    [size - 1 - r2, size - 1 - c2]
                ];
            case 'diagonal':
                return [
                    [c1, r1],
                    [c2, r2]
                ];
            case 'anti-diagonal':
                return [
                    [size - 1 - c1, size - 1 - r1],
                    [size - 1 - c2, size - 1 - r2]
                ];
            default:
                return null;
        }
    }

    // 用于去重，避免重复画线
    const line_set = new Set();

    const all_lines = [];
    let try_count = 0;
    const MAX_TRY = 100 * num_lines;
    while (lines_drawn < num_lines && try_count < MAX_TRY) {
        try_count++;
        const start_row = Math.floor(Math.random() * size);
        const start_col = Math.floor(Math.random() * size);
        const delta = Math.floor(Math.random() * (size - 1)) + 1; // 1~size-1
        const dir = Math.random() < 0.5 ? 1 : -1;
        let end_row, end_col;

        if (Math.random() < 0.5) {
            // 主对角线方向
            end_row = start_row + delta * dir;
            end_col = start_col + delta * dir;
        } else {
            // 副对角线方向
            end_row = start_row + delta * dir;
            end_col = start_col - delta * dir;
        }

        // 端点有效性
        if (
            end_row >= 0 && end_row < size &&
            end_col >= 0 && end_col < size &&
            (start_row !== end_row || start_col !== end_col) &&
            !is_same_box(start_row, start_col, end_row, end_col)
        ) {
            // 生成对称线
            const start = [start_row, start_col];
            const end = [end_row, end_col];
            const sym = get_symmetric_line(start, end, size, symmetry);

            // 端点不能落在已有线的任何格子上
            function endpoint_on_any_line(pt, lines) {
                for (const [lstart, lend] of lines) {
                    const cells = get_cells_on_line(size, lstart, lend);
                    for (const [r, c] of cells) {
                        if (pt[0] === r && pt[1] === c) return true;
                    }
                }
                return false;
            }
            // 检查主线端点
            if (endpoint_on_any_line(start, all_lines) || endpoint_on_any_line(end, all_lines)) {
                continue;
            }
            // 检查已有线的端点不能落在新线的任何格子上
            const new_line_cells = get_cells_on_line(size, start, end);
            let endpoint_on_new_line = false;
            for (const [lstart, lend] of all_lines) {
                if (
                    new_line_cells.some(([r, c]) => (lstart[0] === r && lstart[1] === c) || (lend[0] === r && lend[1] === c))
                ) {
                    endpoint_on_new_line = true;
                    break;
                }
            }
            if (endpoint_on_new_line) continue;

            // 检查对称线端点
            if (sym) {
                if (endpoint_on_any_line(sym[0], all_lines) || endpoint_on_any_line(sym[1], all_lines)) {
                    continue;
                }
                // 新线端点不能落在对称线的任何格子上
                const sym_cells = get_cells_on_line(size, sym[0], sym[1]);
                if (
                    sym_cells.some(([r, c]) => (start[0] === r && start[1] === c) || (end[0] === r && end[1] === c))
                ) {
                    continue;
                }
                // 已有线的端点不能落在对称线的任何格子上
                let endpoint_on_sym_line = false;
                for (const [lstart, lend] of all_lines) {
                    if (
                        sym_cells.some(([r, c]) => (lstart[0] === r && lstart[1] === c) || (lend[0] === r && lend[1] === c))
                    ) {
                        endpoint_on_sym_line = true;
                        break;
                    }
                }
                if (endpoint_on_sym_line) continue;
            }

            // 线自身和对称线都不能在同一宫内
            let valid = true;
            if (sym) {
                if (
                    is_same_box(sym[0][0], sym[0][1], sym[1][0], sym[1][1]) ||
                    (sym[0][0] === start[0] && sym[0][1] === start[1] && sym[1][0] === end[0] && sym[1][1] === end[1])
                ) {
                    valid = false;
                }
            }

            // 线去重（无向线，起止点顺序无关）
            const key1 = `${start[0]},${start[1]}-${end[0]},${end[1]}`;
            const key2 = `${end[0]},${end[1]}-${start[0]},${start[1]}`;
            let sym_key1, sym_key2;
            if (sym) {
                sym_key1 = `${sym[0][0]},${sym[0][1]}-${sym[1][0]},${sym[1][1]}`;
                sym_key2 = `${sym[1][0]},${sym[1][1]}-${sym[0][0]},${sym[0][1]}`;
            }

            if (
                valid &&
                !line_set.has(key1) && !line_set.has(key2) &&
                (!sym || (!line_set.has(sym_key1) && !line_set.has(sym_key2)))
            ) {
                let lines_to_add = 1;
                if (sym && (sym[0][0] !== start[0] || sym[0][1] !== start[1] || sym[1][0] !== end[0] || sym[1][1] !== end[1])) {
                    lines_to_add = 2;
                }
                // 如果加上线会超出总数，则跳过本次
                if (all_lines.length + lines_to_add > num_lines) {
                    break;
                }
                draw_multi_diagonal_line(size, start, end);
                all_lines.push([start, end]);
                line_set.add(key1);
                line_set.add(key2);
                if (lines_to_add === 2) {
                    draw_multi_diagonal_line(size, sym[0], sym[1]);
                    all_lines.push([sym[0], sym[1]]);
                    line_set.add(sym_key1);
                    line_set.add(sym_key2);
                }
                lines_drawn++;
            }
        }
    }
    state.multi_diagonal_lines = all_lines;
    // generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
    log_process(`注意生成的斜线位置，若无解，请重启网页`);
    log_process(`正在生成题目，请稍候...`);
    show_result(`注意生成的斜线位置，若无解，请重启网页`);
    show_generating_timer();

    setTimeout(() => {
        generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        hide_generating_timer();
    }, 0);
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
