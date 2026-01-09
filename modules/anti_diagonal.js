import { state, set_current_mode } from '../solver/state.js';
import { show_result, log_process, clear_result, clear_outer_clues, bold_border, add_Extra_Button, create_base_grid, backup_original_board, restore_original_board, handle_key_navigation, create_base_cell } from '../solver/core.js';
import { solve, isValid, get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';
import { create_technique_panel } from '../solver/classic.js';

// 对角线数独主入口
export function create_anti_diagonal_sudoku(size) {
    set_current_mode('anti_diagonal');
    show_result(`当前模式为反对角线数独`);
    log_process('', true);
    log_process('规则：');
    log_process(`对角线上只能出现${size/3}种数字`);
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    log_process('"额外区域"：附加的不可重复区域');
    // log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
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

        // cell.classList.add('anti_diagonal-mode');

        // 添加元素到DOM
        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        // 对角线高亮（主对角线和副对角线）
        if (row === col || row + col === size - 1) {
            cell.classList.add('anti_diagonal-cell');
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
    draw_anti_diagonal_lines(container, size);

    // 添加对角线数独专属按钮
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('反对角', () => {create_anti_diagonal_sudoku(size)}, '#2196F3');
    // add_Extra_Button('隐藏答案', restore_original_board, '#2196F3');
}

// 绘制两条对角线
function draw_anti_diagonal_lines(container, size) {
    const grid = container.querySelector('.sudoku-grid');
    if (!grid) return;
    // 保证grid是相对定位
    grid.style.position = 'relative';
    // 移除旧的SVG，避免重复
    const oldSvg = grid.querySelector('.anti_diagonal-svg');
    if (oldSvg) oldSvg.remove();

    // 创建新的SVG，插入到grid内
    let s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.classList.add('anti_diagonal-svg');
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
            draw_anti_diagonal_lines(container, size);
        });
    }
}

// export function is_valid_anti_diagonal(board, size, row, col, num) {
//     // 标准数独区域判定
//     const mode = 'classic';
//     const regions = get_all_regions(size, mode);
//     for (const region of regions) {
//         if (region.cells.some(([r, c]) => r === row && c === col)) {
//             for (const [r, c] of region.cells) {
//                 if ((r !== row || c !== col) && board[r][c] === num) {
//                     return false;
//                 }
//             }
//         }
//     }

//     // log_process(`检查对角线数独规则：位置(${row}, ${col})放置数字${num}`);

//     // 主对角线判定
//     if (row === col) {
//         const group_size = Math.floor(size / 3); // 每组的大小
//         const group_index = Math.floor(row / group_size); // 当前格子所在的组

//         // 检查所有组中出现的数字
//         const all_groups = [];
//         for (let g = 0; g < size / group_size; g++) {
//             const group_start = g * group_size;
//             const group_end = Math.min((g + 1) * group_size, size);

//             const group_numbers = new Set();
//             for (let i = group_start; i < group_end; i++) {
//                 const cell_value = board[i][i];
//                 // 仅将确定的数字加入集合，忽略候选数数组
//                 if (typeof cell_value === 'number' && cell_value !== 0) {
//                     group_numbers.add(cell_value);
//                 }
//             }
//             all_groups.push(group_numbers);
//         }

//         // 将当前尝试的数字加入对应组
//         const current_group = all_groups[group_index];
//         current_group.add(num);

//         // 判断总共出现的数字种类是否超过限制
//         const unique_numbers = new Set();
//         all_groups.forEach(group => {
//             group.forEach(num => unique_numbers.add(num));
//             // log_process(`主对角线第${all_groups.indexOf(group) + 1}组数字：${Array.from(group).join(', ')}`);
//         });
//         if (unique_numbers.size > group_size) {
//             // log_process(`主对角线违规：超过允许的数字种类`);
//             return false; // 超过允许的数字种类
//         }

//         // // 检查当前组内是否有冲突
//         // const group_start = group_index * group_size;
//         // const group_end = Math.min((group_index + 1) * group_size, size);
//         // for (let i = group_start; i < group_end; i++) {
//         //     if (i !== row && board[i][i] === num) {
//         //         return false; // 当前组内有重复数字
//         //     }
//         // }
//     }

//     // 副对角线判定
//     if (row + col === size - 1) {
//         const group_size = Math.floor(size / 3); // 每组的大小
//         const group_index = Math.floor(row / group_size); // 当前格子所在的组

//         // 检查所有组中出现的数字
//         const all_groups = [];
//         for (let g = 0; g < size / group_size; g++) {
//             const group_start = g * group_size;
//             const group_end = Math.min((g + 1) * group_size, size);

//             const group_numbers = new Set();
//             for (let i = group_start; i < group_end; i++) {
//                 const cell_value = board[i][size - 1 - i];
//                 // 仅将确定的数字加入集合，忽略候选数数组
//                 if (typeof cell_value === 'number' && cell_value !== 0) {
//                     group_numbers.add(cell_value);
//                 }
//             }
//             all_groups.push(group_numbers);
//         }

//         // 将当前尝试的数字加入对应组
//         const current_group = all_groups[group_index];
//         current_group.add(num);

//         // 判断总共出现的数字种类是否超过限制
//         const unique_numbers = new Set();
//         all_groups.forEach(group => {
//             group.forEach(num => unique_numbers.add(num));
//         });
//         if (unique_numbers.size > group_size) {
//             return false; // 超过允许的数字种类
//         }

//         // // 检查当前组内是否有冲突
//         // const group_start = group_index * group_size;
//         // const group_end = Math.min((group_index + 1) * group_size, size);
//         // for (let i = group_start; i < group_end; i++) {
//         //     if (i !== row && board[i][size - 1 - i] === num) {
//         //         return false; // 当前组内有重复数字
//         //     }
//         // }
//     }
    
//     return true;
// }