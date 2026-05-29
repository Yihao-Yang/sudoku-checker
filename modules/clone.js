import { state, set_current_mode } from '../solver/state.js';
import { bold_border, create_base_grid, handle_key_navigation, add_Extra_Button, log_process, create_base_cell, show_result, show_generating_timer, hide_generating_timer } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_puzzle } from '../solver/generate.js';
import { get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';


// 克隆数独主入口
export function create_clone_sudoku(size) {
    set_current_mode('clone');
    show_result(`当前模式为克隆数独`);
    log_process('', true);
    log_process('规则：');
    log_process('若灰色区域形状相同，则相同位置的数字一致');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    // log_process('"额外区域"：附加的不可重复区域');
    log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('');
    log_process('自动出题：');
    log_process('尚不支持自动添加标记出题，需要手动给定标记');
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
        Extra_Region_Hidden_Triple: true,
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        // Special_Combination_Region_Most_Not_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        // Special_Combination_Region_Most_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        // Special_Combination_Region_Cell_Elimination_3: true,
        // Multi_Special_Combination_Region_Cell_Elimination_1: true,
        // Multi_Special_Combination_Region_Cell_Elimination_2: true,
        // Multi_Special_Combination_Region_Cell_Elimination_3: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        // Special_Combination_Region_Elimination_3: true,
        // Multi_Special_Combination_Region_Elimination_1: true,
        // Multi_Special_Combination_Region_Elimination_2: true,
        // Multi_Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        // Special_Combination_Region_Block_3: true,
        // Multi_Special_Combination_Region_Block_1: true,
        // Multi_Special_Combination_Region_Block_2: true,
        // Multi_Special_Combination_Region_Block_3: true,
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 刷新技巧面板
    create_technique_panel();

    // 克隆格子集合
    state.clone_cells = new Set();

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 标记模式状态
    let is_mark_mode = false;
    let mark_mode_btn = null;

    // 切换标记模式
    function toggle_mark_mode() {
        is_mark_mode = !is_mark_mode;
        if (!mark_mode_btn) {
            mark_mode_btn = Array.from(document.getElementById('extraButtons').children).find(btn => btn.textContent.includes('标记'));
        }
        if (mark_mode_btn) {
            mark_mode_btn.textContent = is_mark_mode ? '退出标记' : '添加标记';
        }
    }

    // 添加按钮（风格与多斜线一致）
    const extra_buttons = document.getElementById('extraButtons');
    extra_buttons.innerHTML = '';
    add_Extra_Button('克隆', () => {create_clone_sudoku(size)}, '#2196F3');
    add_Extra_Button('添加标记', toggle_mark_mode, '#2196F3');
    add_Extra_Button('清除标记', () => clear_clone_marks(state.current_grid_size), '#2196F3');
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_clone_puzzle(size, score_lower_limit, holes_count)) || (() => generate_clone_puzzle(size)), '#2196F3');

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

    // 克隆模式标记
    cell.classList.add('extra-region-mode');

        // 克隆高亮
        const cell_key = `${row},${col}`;
            if (state.clone_cells.has(cell_key)) {
                cell.classList.add('extra-region-cell');
                cell.classList.add('gray-cell');
        }

        // 点击格子添加/移除克隆
        cell.addEventListener('click', function () {
            if (!is_mark_mode) return;
            if (state.clone_cells.has(cell_key)) {
                state.clone_cells.delete(cell_key);
                cell.classList.remove('extra-region-cell');
                cell.classList.remove('gray-cell');
            } else {
                state.clone_cells.add(cell_key);
                cell.classList.add('extra-region-cell');
                    cell.classList.add('gray-cell');
            }
        });

        // 添加元素到DOM
        cell.appendChild(main_input);
        cell.appendChild(candidates_grid);
        grid.appendChild(cell);
        inputs[row][col] = main_input;

        main_input.addEventListener('input', function () {
            const max_value = size;
            const regex = new RegExp(`[^1-${max_value}]`, 'g');
            this.value = this.value.replace(regex, '');
            if (this.value.length > 1) {
                this.value = this.value[this.value.length - 1];
            }
        });

        main_input.addEventListener('keydown', function (e) {
            handle_key_navigation(e, row, col, size, inputs);
        });

        bold_border(cell, row, col, size);
    }

    container.appendChild(grid);
    gridDisplay.appendChild(container);
}

// 生成克隆数独题目
export function generate_clone_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    clear_clone_marks(size);
    invalidate_regions_cache();

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    const box_size = size === 6 ? [2, 3] : [Math.sqrt(size), Math.sqrt(size)];
    const directions4 = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    function cell_key(row, col) {
        return `${row},${col}`;
    }

    function box_index(row, col) {
        return `${Math.floor(row / box_size[0])},${Math.floor(col / box_size[1])}`;
    }

    // 8邻接判定：包含正交与对角相邻
    function are_touching_8(cell_a, cell_b) {
        return Math.abs(cell_a[0] - cell_b[0]) <= 1 && Math.abs(cell_a[1] - cell_b[1]) <= 1;
    }

    function build_extended_region(region) {
        const extended = new Set();
        for (const [r, c] of region) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
                    extended.add(cell_key(nr, nc));
                }
            }
        }
        return extended;
    }

    // 构造一个随机连通形状（相对坐标）
    function generate_base_shape(target_len) {
        const shape = [[0, 0]];
        const shape_set = new Set(['0,0']);

        while (shape.length < target_len) {
            const frontier = [];
            for (const [r, c] of shape) {
                for (const [dr, dc] of directions4) {
                    const nr = r + dr;
                    const nc = c + dc;
                    const key = `${nr},${nc}`;
                    if (!shape_set.has(key)) {
                        frontier.push([nr, nc]);
                    }
                }
            }

            if (frontier.length === 0) break;
            const pick = frontier[Math.floor(Math.random() * frontier.length)];
            const key = `${pick[0]},${pick[1]}`;
            if (!shape_set.has(key)) {
                shape.push(pick);
                shape_set.add(key);
            }
        }

        // 规范化为最小行列从0开始，并固定排序，确保对应位稳定
        const min_r = Math.min(...shape.map(([r]) => r));
        const min_c = Math.min(...shape.map(([, c]) => c));
        return shape
            .map(([r, c]) => [r - min_r, c - min_c])
            .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }

    function build_placement(shape, base_row, base_col) {
        const cells = [];
        for (const [dr, dc] of shape) {
            const r = base_row + dr;
            const c = base_col + dc;
            if (r < 0 || r >= size || c < 0 || c >= size) return null;
            cells.push([r, c]);
        }
        return cells;
    }

    function enumerate_placements(shape) {
        const max_r = Math.max(...shape.map(([r]) => r));
        const max_c = Math.max(...shape.map(([, c]) => c));
        const placements = [];
        for (let r0 = 0; r0 <= size - 1 - max_r; r0++) {
            for (let c0 = 0; c0 <= size - 1 - max_c; c0++) {
                const cells = build_placement(shape, r0, c0);
                if (cells) placements.push(cells);
            }
        }
        return placements;
    }

    function placements_compatible(candidate, selected_regions) {
        const candidate_set = new Set(candidate.map(([r, c]) => cell_key(r, c)));
        const candidate_extended = build_extended_region(candidate);

        for (const region of selected_regions) {
            const region_set = new Set(region.map(([r, c]) => cell_key(r, c)));
            const region_extended = build_extended_region(region);

            // 区域间距离约束（按盘面规模）
            if (size === 6) {
                // 六宫：不同克隆区域的延伸区域不能重合
                for (const key of candidate_extended) {
                    if (region_extended.has(key)) {
                        return false;
                    }
                }
            } else if (size === 9) {
                // 九宫：不同克隆区域的延伸区域不能相邻（含重合）
                const ext_cells_a = Array.from(candidate_extended).map(s => s.split(',').map(Number));
                const ext_cells_b = Array.from(region_extended).map(s => s.split(',').map(Number));
                for (const a of ext_cells_a) {
                    for (const b of ext_cells_b) {
                        if (are_touching_8(a, b)) {
                            return false;
                        }
                    }
                }
            } else {
                // 四宫及其它：沿用原有更宽松限制
                for (const key of candidate_set) {
                    if (region_set.has(key)) {
                        return false;
                    }
                }
                for (const cell_c of candidate) {
                    for (const cell_r of region) {
                        if (are_touching_8(cell_c, cell_r)) {
                            return false;
                        }
                    }
                }
            }

            // 对应位不能同一行、同一列、同一宫
            for (let i = 0; i < candidate.length; i++) {
                const [ra, ca] = region[i];
                const [rb, cb] = candidate[i];
                if (ra === rb || ca === cb) {
                    return false;
                }
                if (box_index(ra, ca) === box_index(rb, cb)) {
                    return false;
                }
            }
        }
        return true;
    }

    function try_generate_regions() {
        const min_len = Math.max(2, Math.floor(size / 2));
        const max_len = Math.max(min_len, size - 1);
        const target_len = min_len + Math.floor(Math.random() * (max_len - min_len + 1));
        const shape = generate_base_shape(target_len);
        if (shape.length < 2) return [];

        const placements = enumerate_placements(shape);
        if (placements.length < 2) return [];

        shuffle(placements);

        for (const A of placements) {
            const selected = [A];
            let expanded = true;

            while (expanded) {
                expanded = false;
                const candidates = [];
                for (const p of placements) {
                    if (selected.includes(p)) continue;
                    if (placements_compatible(p, selected)) {
                        candidates.push(p);
                    }
                }
                if (candidates.length > 0) {
                    shuffle(candidates);
                    selected.push(candidates[0]);
                    expanded = true;
                }
            }

            if (selected.length >= 2) {
                return selected;
            }
        }

        return [];
    }

    let regions = [];
    for (let attempt = 0; attempt < 200; attempt++) {
        regions = try_generate_regions();
        if (regions.length >= 2) break;
    }

    if (regions.length < 2) {
        log_process('自动生成克隆失败，请重试');
        return;
    }

    state.clone_cells.clear();
    for (const region of regions) {
        for (const [row, col] of region) {
            let key = `${row},${col}`;
            state.clone_cells.add(key);
            let cell = document.querySelector(`.sudoku-cell.extra-region-mode[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('extra-region-cell');
                cell.classList.add('gray-cell');
            }
        }
    }

    show_generating_timer();
    
    setTimeout(() => {
        generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        hide_generating_timer();
    }, 0);
}

// // 获取所有合法的克隆
// export function get_clone_cells() {
//     const all_cells = Array.from(state.clone_cells).map(key => key.split(',').map(Number));
//     const size = state.current_grid_size;
//     const visited4 = new Set();
//     const visited8 = new Set();
//     const regions4 = [];
//     const regions8 = [];

//     // 4连通方向
//     const directions4 = [
//         [-1, 0], [1, 0], [0, -1], [0, 1]
//     ];
//     // 8连通方向
//     const directions8 = [
//         [-1, 0], [1, 0], [0, -1], [0, 1],
//         [-1, -1], [-1, 1], [1, -1], [1, 1]
//     ];

//     // BFS查找连通块（可选方向）
//     function bfs(start_row, start_col, directions, visited) {
//         const queue = [[start_row, start_col]];
//         const region = [[start_row, start_col]];
//         visited.add(`${start_row},${start_col}`);

//         while (queue.length) {
//             const [r, c] = queue.shift();
//             for (const [dr, dc] of directions) {
//                 const nr = r + dr, nc = c + dc;
//                 const key = `${nr},${nc}`;
//                 if (
//                     all_cells.some(([rr, cc]) => rr === nr && cc === nc) &&
//                     !visited.has(key)
//                 ) {
//                     visited.add(key);
//                     queue.push([nr, nc]);
//                     region.push([nr, nc]);
//                 }
//             }
//         }
//         return region;
//     }

//     // // 如果只有一个区域，且格子数量等于size，直接返回（不要求连通）
//     // if (all_cells.length === size) {
//     //     return [all_cells];
//     // }

//     // 先用4连通分组所有连通块
//     for (const [row, col] of all_cells) {
//         const key = `${row},${col}`;
//         if (!visited4.has(key)) {
//             const region = bfs(row, col, directions4, visited4);
//             regions4.push(region);
//         }
//     }

//     // 只保留格子数量等于size的连通块
//     const valid_regions4 = regions4.filter(region => region.length === size);

//     // 检查不同区域之间是否有相邻格子（4连通）
//     function are_regions_adjacent(regionA, regionB, directions) {
//         for (const [r1, c1] of regionA) {
//             for (const [r2, c2] of regionB) {
//                 for (const [dr, dc] of directions) {
//                     if (r1 + dr === r2 && c1 + dc === c2) {
//                         return true;
//                     }
//                 }
//             }
//         }
//         return false;
//     }

//     // 如果有两个区域相邻，则全部无效
//     let valid = true;
//     for (let i = 0; i < valid_regions4.length; i++) {
//         for (let j = i + 1; j < valid_regions4.length; j++) {
//             if (are_regions_adjacent(valid_regions4[i], valid_regions4[j], directions4)) {
//                 valid = false;
//                 break;
//             }
//         }
//         if (!valid) break;
//     }

//     // 如果4连通合法，直接返回
//     if (valid_regions4.length > 0 && valid) {
//         return valid_regions4;
//     }

//     // 否则用8连通分组
//     for (const [row, col] of all_cells) {
//         const key = `${row},${col}`;
//         if (!visited8.has(key)) {
//             const region = bfs(row, col, directions8, visited8);
//             regions8.push(region);
//         }
//     }
//     const valid_regions8 = regions8.filter(region => region.length === size);

//     // 检查不同区域之间是否有相邻格子（8连通）
//     valid = true;
//     for (let i = 0; i < valid_regions8.length; i++) {
//         for (let j = i + 1; j < valid_regions8.length; j++) {
//             if (are_regions_adjacent(valid_regions8[i], valid_regions8[j], directions8)) {
//                 valid = false;
//                 break;
//             }
//         }
//         if (!valid) break;
//     }

//     // 返回所有合法的克隆（每个区域是一个数组，外层是数组）
//     if (valid_regions8.length > 0 && valid) {
//         return valid_regions8;
//     }
//     return [];
// }

// 获取所有合法的克隆
export function get_clone_cells() {
    const all_cells = Array.from(state.clone_cells).map(key => key.split(',').map(Number));
    const size = state.current_grid_size;
    const visited4 = new Set();
    const visited8 = new Set();
    const regions4 = [];
    const regions8 = [];

    // 4连通方向
    const directions4 = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    // 8连通方向
    const directions8 = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    // BFS查找连通块（可选方向）
    function bfs(start_row, start_col, directions, visited) {
        const queue = [[start_row, start_col]];
        const region = [[start_row, start_col]];
        visited.add(`${start_row},${start_col}`);

        while (queue.length) {
            const [r, c] = queue.shift();
            for (const [dr, dc] of directions) {
                const nr = r + dr, nc = c + dc;
                const key = `${nr},${nc}`;
                if (
                    all_cells.some(([rr, cc]) => rr === nr && cc === nc) &&
                    !visited.has(key)
                ) {
                    visited.add(key);
                    queue.push([nr, nc]);
                    region.push([nr, nc]);
                }
            }
        }
        return region;
    }

    // 检查不同区域之间是否有相邻格子
    function are_regions_adjacent(regionA, regionB, directions) {
        for (const [r1, c1] of regionA) {
            for (const [r2, c2] of regionB) {
                for (const [dr, dc] of directions) {
                    if (r1 + dr === r2 && c1 + dc === c2) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 先用4连通分组所有连通块（不限制单个区域格子数）
    for (const [row, col] of all_cells) {
        const key = `${row},${col}`;
        if (!visited4.has(key)) {
            const region = bfs(row, col, directions4, visited4);
            regions4.push(region);
        }
    }

    // 检查4连通得到的区域数是否超过size
    if (regions4.length >= size) {
        // 如果总区域数 >= size，改用8连通分组
        for (const [row, col] of all_cells) {
            const key = `${row},${col}`;
            if (!visited8.has(key)) {
                const region = bfs(row, col, directions8, visited8);
                regions8.push(region);
            }
        }

        // 检查不同区域之间是否有相邻格子（8连通）
        let valid = true;
        for (let i = 0; i < regions8.length; i++) {
            for (let j = i + 1; j < regions8.length; j++) {
                if (are_regions_adjacent(regions8[i], regions8[j], directions8)) {
                    valid = false;
                    break;
                }
            }
            if (!valid) break;
        }

        if (regions8.length > 0 && valid) {
            return regions8;
        }
        return [];
    }

    // 如果4连通区域数 <= size，检查不同区域之间是否有相邻格子（4连通）
    let valid = true;
    for (let i = 0; i < regions4.length; i++) {
        for (let j = i + 1; j < regions4.length; j++) {
            if (are_regions_adjacent(regions4[i], regions4[j], directions4)) {
                valid = false;
                break;
            }
        }
        if (!valid) break;
    }

    // 如果4连通合法，直接返回
    if (regions4.length > 0 && valid) {
        return regions4;
    }

    return [];
}

// 清除所有克隆标记（界面和数据都恢复）
export function clear_clone_marks(size) {
    state.clone_cells.clear();
    // 移除所有格子的高亮
    const cells = document.querySelectorAll('.sudoku-cell.extra-region-mode');
    cells.forEach(cell => {
        cell.classList.remove('extra-region-cell');
            cell.classList.remove('gray-cell');
    });
}

/**
 * 判断两个区域的形状是否一致（通过相对坐标比较）
 * @param {Array} region1 - 第一个区域的格子坐标数组
 * @param {Array} region2 - 第二个区域的格子坐标数组
 * @returns {boolean} 是否形状一致
 */
export function are_regions_same_shape(region1, region2) {
    // 格子数必须相同
    if (region1.length !== region2.length) {
        return false;
    }

    // 将两个区域按坐标排序
    const sorted1 = [...region1].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const sorted2 = [...region2].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    // 计算第一个区域的最小坐标
    const [minR1, minC1] = sorted1[0];
    
    // 计算第二个区域的最小坐标
    const [minR2, minC2] = sorted2[0];

    // 将两个区域转换为相对坐标
    const relative1 = sorted1.map(([r, c]) => `${r - minR1},${c - minC1}`).sort().join('|');
    const relative2 = sorted2.map(([r, c]) => `${r - minR2},${c - minC2}`).sort().join('|');

    // 比较相对坐标是否相同
    return relative1 === relative2;
}

/**
 * 克隆数独有效性检测函数
 * @param {Array} board - 数独盘面（二维数组）
 * @param {number} size - 数独盘面大小
 * @param {number} row - 要检测的格子行号
 * @param {number} col - 要检测的格子列号
 * @param {number} num - 要填入的数字
 * @returns {boolean} 是否有效
 */
export function is_valid_clone(board, size, row, col, num) {
    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'clone';
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

    // 2. 克隆区域规则
    // 获取所有克隆区域
    const clone_regions = get_clone_cells();
    
    if (clone_regions.length === 0) {
        return true;
    }

    // 对于每一对克隆区域（形状相同），检查对应位置的数字是否相同
    // 如果只有一个克隆区域，跳过此检查
    if (clone_regions.length === 1) {
        return true;
    }

    // 遍历所有克隆区域对
    for (let i = 0; i < clone_regions.length; i++) {
        for (let j = i + 1; j < clone_regions.length; j++) {
            const region_i = clone_regions[i];
            const region_j = clone_regions[j];

            // // 必须形状一致（格子数相同）
            // if (region_i.length !== region_j.length) {
            //     continue;
            // }
            // 必须形状一致（相对坐标相同）
            if (!are_regions_same_shape(region_i, region_j)) {
                continue;
            }

            // 对于每个克隆区域对，找到它们的映射关系
            // 按照相同的顺序排列，然后逐个对应检查
            // 这里假设两个形状相同的区域，对应位置应该数值相同
            
            // 简单方案：将两个区域按照坐标排序，然后逐个对应检查
            const sorted_i = [...region_i].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const sorted_j = [...region_j].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

            // 检查是否当前填入的数字违反了克隆约束
            for (let k = 0; k < sorted_i.length; k++) {
                const [r_i, c_i] = sorted_i[k];
                const [r_j, c_j] = sorted_j[k];

                // 如果当前格子是在region_i中被填写
                if (r_i === row && c_i === col) {
                    // 检查对应的region_j格子
                    const val_j = board[r_j][c_j];
                    if (typeof val_j === 'number' && val_j !== 0 && val_j !== num) {
                        return false;
                    }
                }

                // 如果当前格子是在region_j中被填写
                if (r_j === row && c_j === col) {
                    // 检查对应的region_i格子
                    const val_i = board[r_i][c_i];
                    if (typeof val_i === 'number' && val_i !== 0 && val_i !== num) {
                        return false;
                    }
                }
            }
        }
    }

    return true;
}
