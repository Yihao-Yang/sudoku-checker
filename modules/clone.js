import { state, set_current_mode } from '../solver/state.js';
import { bold_border, create_base_grid, handle_key_navigation, add_Extra_Button, log_process, create_base_cell } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_puzzle } from '../solver/generate.js';
import { get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';


// 克隆数独主入口
export function create_clone_sudoku(size) {
    set_current_mode('clone');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;
    invalidate_regions_cache();

        // 修改技巧开关
    state.techniqueSettings = {
        Box_Elimination: true,
        Row_Col_Elimination: true,
        Box_Block: true,        // 
        Box_Pair_Block: true,
        Row_Col_Block: true,    // 
        Box_Naked_Pair: true,   // 
        Row_Col_Naked_Pair: true, // 
        Box_Hidden_Pair: true,  // 
        Row_Col_Hidden_Pair: true, // 
        Box_Naked_Triple: true, // 
        Row_Col_Naked_Triple: true, // 
        Box_Hidden_Triple: true, // 
        Row_Col_Hidden_Triple: true, // 
        All_Quad: false,         // 
        Cell_Elimination: true,  // 
        Brute_Force: false,
        Variant_Elimination: true,
        Variant_Block: true,
        Variant_Pair_Block: true,
        Variant_Naked_Pair: true,
        Variant_Hidden_Pair: true,
        Variant_Naked_Triple: true,
        Variant_Hidden_Triple: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
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
    add_Extra_Button('添加标记', toggle_mark_mode, '#2196F3');
    add_Extra_Button('清除标记', () => clear_clone_marks(state.current_grid_size), '#2196F3');
    // add_Extra_Button('自动出题', () => generate_clone_puzzle(size), '#2196F3');

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
        }

        // 点击格子添加/移除克隆
        cell.addEventListener('click', function () {
            if (!is_mark_mode) return;
            if (state.clone_cells.has(cell_key)) {
                state.clone_cells.delete(cell_key);
                cell.classList.remove('extra-region-cell');
            } else {
                state.clone_cells.add(cell_key);
                cell.classList.add('extra-region-cell');
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

    // 支持的对称类型
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    // 生成对称点
    function get_symmetric_pos(row, col, size, symmetry) {
        switch (symmetry) {
            case 'horizontal':
                return [size - 1 - row, col];
            case 'vertical':
                return [row, size - 1 - col];
            case 'central':
                return [size - 1 - row, size - 1 - col];
            case 'diagonal':
                return [col, row];
            case 'anti-diagonal':
                return [size - 1 - col, size - 1 - row];
            default:
                return [row, col];
        }
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // 生成一个对称区域（不要求连通，只要求对称且数量为size）
    function generate_single_region() {
        // 随机选格子并对称填充，直到达到size
        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            let regionSet = new Set();
            // 找到所有格子
            let all_cells = [];
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    all_cells.push([row, col]);
                }
            }
            shuffle(all_cells);
            for (let [row, col] of all_cells) {
                let key = `${row},${col}`;
                let [sym_row, sym_col] = get_symmetric_pos(row, col, size, symmetry);
                let sym_key = `${sym_row},${sym_col}`;
                regionSet.add(key);
                regionSet.add(sym_key);
                if (regionSet.size >= size) break;
            }
            // 转为数组
            let region = Array.from(regionSet).map(s => s.split(',').map(Number));
            if (region.length === size) {
                return [region];
            }
        }
        return [];
    }

    // 方式二：生成两个对称区域
    function generate_double_symmetric_regions(size, symmetry, get_symmetric_pos) {
        // 随机选择连通方式
        const directions = Math.random() < 0.5
            ? [
                [-1, 0], [1, 0], [0, -1], [0, 1]
            ]
            : [
                [-1, 0], [1, 0], [0, -1], [0, 1],
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ];
    
        function is_adjacent(cell_a, cell_b) {
            const [r1, c1] = cell_a;
            const [r2, c2] = cell_b;
            for (const [dr, dc] of directions) {
                if (r1 + dr === r2 && c1 + dc === c2) {
                    return true;
                }
            }
            return false;
        }
    
        function cell_key(row, col) {
            return `${row},${col}`;
        }
    
        let attempts = 0;
        while (attempts < 100) {
            attempts++;
            // 1. 随机选一个格子
            let all_cells = [];
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    all_cells.push([row, col]);
                }
            }
            // 洗牌
            for (let i = all_cells.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [all_cells[i], all_cells[j]] = [all_cells[j], all_cells[i]];
            }
            let [start_row, start_col] = all_cells[0];
            let [sym_row, sym_col] = get_symmetric_pos(start_row, start_col, size, symmetry);
    
            // 2. 检查不是同一格且不连通
            if (start_row === sym_row && start_col === sym_col) continue;
            if (is_adjacent([start_row, start_col], [sym_row, sym_col])) continue;
    
            // 3. 初始化区域
            let region_1 = [[start_row, start_col]];
            let region_2 = [[sym_row, sym_col]];
            let region_1_set = new Set([cell_key(start_row, start_col)]);
            let region_2_set = new Set([cell_key(sym_row, sym_col)]);
    
            // 4. 循环扩展
            while (region_1.length < size) {
                // 在region_1的随机一个格子的8连通位置找可加入的格子
                let candidates = [];
                for (let [r, c] of region_1) {
                    for (const [dr, dc] of directions) {
                        let nr = r + dr, nc = c + dc;
                        let key = cell_key(nr, nc);
                        let [sym_nr, sym_nc] = get_symmetric_pos(nr, nc, size, symmetry);
                        let sym_key = cell_key(sym_nr, sym_nc);
                        // 边界判断
                        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
                        if (region_1_set.has(key) || region_2_set.has(key)) continue;
                        if (region_1_set.has(sym_key) || region_2_set.has(sym_key)) continue;
                        candidates.push([nr, nc]);
                    }
                }
                if (candidates.length === 0) break;
                // 随机选一个
                const idx = Math.floor(Math.random() * candidates.length);
                let [chosen_r, chosen_c] = candidates[idx];
                let [sym_chosen_r, sym_chosen_c] = get_symmetric_pos(chosen_r, chosen_c, size, symmetry);
    
                // 5. 判断区域2刚添加的格子是否和区域1的任意一个格子八连通
                let adjacent = false;
                for (let [r1, c1] of region_1) {
                    if (is_adjacent([r1, c1], [sym_chosen_r, sym_chosen_c])) {
                        adjacent = true;
                        break;
                    }
                    if (is_adjacent([chosen_r, chosen_c], [sym_chosen_r, sym_chosen_c])) {
                        adjacent = true;
                        break;
                    }
                    
                }
                if (adjacent) continue; // 跳过本次添加
    
                // 6. 添加到两个区域
                region_1.push([chosen_r, chosen_c]);
                region_1_set.add(cell_key(chosen_r, chosen_c));
                region_2.push([sym_chosen_r, sym_chosen_c]);
                region_2_set.add(cell_key(sym_chosen_r, sym_chosen_c));
            }
    
            // 7. 检查数量
            if (region_1.length === size && region_2.length === size) {
                return [region_1, region_2];
            }
            // 否则重试
        }
        return [];
    }
    // ...existing code...

    // 随机选择生成方式
    let regions = [];
    if (Math.random() < 0.3) {
        regions = generate_single_region();
    // } else if (Math.random() < 0.5) {
    //     regions = generate_single_symmetric_region();
    } else {
        regions = generate_double_symmetric_regions(size, symmetry, get_symmetric_pos);
    }
    if (regions.length === 0) {
        log_process('自动生成克隆失败，请重试');
        return;
    }

    state.clone_cells.clear();
    for (const region of regions) {
        for (const [row, col] of region) {
            let key = `${row},${col}`;
            state.clone_cells.add(key);
            let cell = document.querySelector(`.sudoku-cell.extra-region-mode[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('extra-region-cell');
        }
    }

    generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
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
