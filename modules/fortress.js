import { state, set_current_mode } from '../solver/state.js';
import { bold_border, create_base_grid, handle_key_navigation, add_Extra_Button, log_process, create_base_cell } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_puzzle } from '../solver/generate.js';
import { get_all_regions } from '../solver/solver_tool.js';


// 额外区域数独主入口
export function create_fortress_sudoku(size) {
    set_current_mode('fortress');
    gridDisplay.innerHTML = '';
    controls.classList.remove('hidden');
    state.current_grid_size = size;

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
        Special_Combination_Region_Elimination_4: true,
        Multi_Special_Combination_Region_Elimination_1: true,
        Multi_Special_Combination_Region_Elimination_2: true,
        Multi_Special_Combination_Region_Elimination_3: true,
        Multi_Special_Combination_Region_Elimination_4: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Special_Combination_Region_Block_4: true,
        Multi_Special_Combination_Region_Block_1: true,
        Multi_Special_Combination_Region_Block_2: true,
        Multi_Special_Combination_Region_Block_3: true,
        Multi_Special_Combination_Region_Block_4: true,
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 刷新技巧面板
    create_technique_panel();

    // 额外区域格子集合
    state.fortress_cells = new Set();

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
    add_Extra_Button('清除标记', () => clear_fortress_marks(state.current_grid_size), '#2196F3');
    add_Extra_Button('自动出题', () => generate_fortress_puzzle(size), '#2196F3');

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

    // 额外区域模式标记
    cell.classList.add('extra-region-mode');

        // 额外区域高亮
        const cell_key = `${row},${col}`;
        if (state.fortress_cells.has(cell_key)) {
            cell.classList.add('extra-region-cell');
        }

        // 点击格子添加/移除额外区域
        cell.addEventListener('click', function () {
            if (!is_mark_mode) return;
            if (state.fortress_cells.has(cell_key)) {
                state.fortress_cells.delete(cell_key);
                cell.classList.remove('extra-region-cell');
            } else {
                state.fortress_cells.add(cell_key);
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

// 生成额外区域数独题目
export function generate_fortress_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    clear_fortress_marks(size);

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

    function generate_single_region() {
        // 根据 size 动态调整区域大小
        let region_size;
        if (size === 4) {
            region_size = Math.floor(Math.random() * (4 - 2 + 1)) + 2; // 2-4
        } else if (size === 6) {
            region_size = Math.floor(Math.random() * (12 - 6 + 1)) + 6; // 6-12
        } else if (size === 9) {
            region_size = Math.floor(Math.random() * (22 - 12 + 1)) + 12; // 12-22
        } else {
            region_size = Math.max(2, Math.floor(size * size / 5)); // 默认值
        }
    
        // 随机选格子并对称填充，直到达到 region_size
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
                if (regionSet.size >= region_size) break;
            }
            // 转为数组
            let region = Array.from(regionSet).map(s => s.split(',').map(Number));
            if (region.length === region_size) {
                return [region];
            }
        }
        return [];
    }

    // // 方式二：生成两个对称区域
    // function generate_double_symmetric_regions(size, symmetry, get_symmetric_pos) {
    //     // 随机选择连通方式
    //     const directions = Math.random() < 0.5
    //         ? [
    //             [-1, 0], [1, 0], [0, -1], [0, 1]
    //         ]
    //         : [
    //             [-1, 0], [1, 0], [0, -1], [0, 1],
    //             [-1, -1], [-1, 1], [1, -1], [1, 1]
    //         ];
    
    //     function is_adjacent(cell_a, cell_b) {
    //         const [r1, c1] = cell_a;
    //         const [r2, c2] = cell_b;
    //         for (const [dr, dc] of directions) {
    //             if (r1 + dr === r2 && c1 + dc === c2) {
    //                 return true;
    //             }
    //         }
    //         return false;
    //     }
    
    //     function cell_key(row, col) {
    //         return `${row},${col}`;
    //     }
    
    //     let attempts = 0;
    //     while (attempts < 100) {
    //         attempts++;
    //         // 1. 随机选一个格子
    //         let all_cells = [];
    //         for (let row = 0; row < size; row++) {
    //             for (let col = 0; col < size; col++) {
    //                 all_cells.push([row, col]);
    //             }
    //         }
    //         // 洗牌
    //         for (let i = all_cells.length - 1; i > 0; i--) {
    //             const j = Math.floor(Math.random() * (i + 1));
    //             [all_cells[i], all_cells[j]] = [all_cells[j], all_cells[i]];
    //         }
    //         let [start_row, start_col] = all_cells[0];
    //         let [sym_row, sym_col] = get_symmetric_pos(start_row, start_col, size, symmetry);
    
    //         // 2. 检查不是同一格且不连通
    //         if (start_row === sym_row && start_col === sym_col) continue;
    //         if (is_adjacent([start_row, start_col], [sym_row, sym_col])) continue;
    
    //         // 3. 初始化区域
    //         let region_1 = [[start_row, start_col]];
    //         let region_2 = [[sym_row, sym_col]];
    //         let region_1_set = new Set([cell_key(start_row, start_col)]);
    //         let region_2_set = new Set([cell_key(sym_row, sym_col)]);
    
    //         // 4. 循环扩展
    //         while (region_1.length < size) {
    //             // 在region_1的随机一个格子的8连通位置找可加入的格子
    //             let candidates = [];
    //             for (let [r, c] of region_1) {
    //                 for (const [dr, dc] of directions) {
    //                     let nr = r + dr, nc = c + dc;
    //                     let key = cell_key(nr, nc);
    //                     let [sym_nr, sym_nc] = get_symmetric_pos(nr, nc, size, symmetry);
    //                     let sym_key = cell_key(sym_nr, sym_nc);
    //                     // 边界判断
    //                     if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    //                     if (region_1_set.has(key) || region_2_set.has(key)) continue;
    //                     if (region_1_set.has(sym_key) || region_2_set.has(sym_key)) continue;
    //                     candidates.push([nr, nc]);
    //                 }
    //             }
    //             if (candidates.length === 0) break;
    //             // 随机选一个
    //             const idx = Math.floor(Math.random() * candidates.length);
    //             let [chosen_r, chosen_c] = candidates[idx];
    //             let [sym_chosen_r, sym_chosen_c] = get_symmetric_pos(chosen_r, chosen_c, size, symmetry);
    
    //             // 5. 判断区域2刚添加的格子是否和区域1的任意一个格子八连通
    //             let adjacent = false;
    //             for (let [r1, c1] of region_1) {
    //                 if (is_adjacent([r1, c1], [sym_chosen_r, sym_chosen_c])) {
    //                     adjacent = true;
    //                     break;
    //                 }
    //                 if (is_adjacent([chosen_r, chosen_c], [sym_chosen_r, sym_chosen_c])) {
    //                     adjacent = true;
    //                     break;
    //                 }
                    
    //             }
    //             if (adjacent) continue; // 跳过本次添加
    
    //             // 6. 添加到两个区域
    //             region_1.push([chosen_r, chosen_c]);
    //             region_1_set.add(cell_key(chosen_r, chosen_c));
    //             region_2.push([sym_chosen_r, sym_chosen_c]);
    //             region_2_set.add(cell_key(sym_chosen_r, sym_chosen_c));
    //         }
    
    //         // 7. 检查数量
    //         if (region_1.length === size && region_2.length === size) {
    //             return [region_1, region_2];
    //         }
    //         // 否则重试
    //     }
    //     return [];
    // }

    function generate_double_symmetric_regions(size, symmetry, get_symmetric_pos) {
        // 根据 size 动态调整区域大小范围
        let region_size_min, region_size_max;
        if (size === 4) {
            region_size_min = 1;
            region_size_max = 2;
        } else if (size === 6) {
            region_size_min = 3;
            region_size_max = 6;
        } else if (size === 9) {
            region_size_min = 6;
            region_size_max = 11;
        } else {
            region_size_min = Math.max(1, Math.floor(size * size / 10));
            region_size_max = Math.max(region_size_min + 1, Math.floor(size * size / 8));
        }
        const region_size = Math.floor(Math.random() * (region_size_max - region_size_min + 1)) + region_size_min;
    
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
            while (region_1.length < region_size) {
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
            if (region_1.length === region_size && region_2.length === region_size) {
                return [region_1, region_2];
            }
            // 否则重试
        }
        return [];
    }

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
        log_process('自动生成额外区域失败，请重试');
        return;
    }

    state.fortress_cells.clear();
    for (const region of regions) {
        for (const [row, col] of region) {
            let key = `${row},${col}`;
            state.fortress_cells.add(key);
            let cell = document.querySelector(`.sudoku-cell.extra-region-mode[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('extra-region-cell');
        }
    }

    generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
}

// 获取所有合法的额外区域
export function get_fortress_cells() {
    const all_cells = Array.from(state.fortress_cells).map(key => key.split(',').map(Number));
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

    // // 如果只有一个区域，且格子数量小于或等于size，直接返回（不要求连通）
    // if (all_cells.length <= size) {
    //     return [all_cells];
    // }

    // 先用4连通分组所有连通块
    for (const [row, col] of all_cells) {
        const key = `${row},${col}`;
        if (!visited4.has(key)) {
            const region = bfs(row, col, directions4, visited4);
            regions4.push(region);
        }
    }

    // 只保留格子数量小于或等于size的连通块
    const valid_regions4 = regions4.filter(region => region.length <= size);

    // 检查不同区域之间是否有相邻格子（4连通）
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

    // 如果有两个区域相邻，则全部无效
    let valid = true;
    for (let i = 0; i < valid_regions4.length; i++) {
        for (let j = i + 1; j < valid_regions4.length; j++) {
            if (are_regions_adjacent(valid_regions4[i], valid_regions4[j], directions4)) {
                valid = false;
                break;
            }
        }
        if (!valid) break;
    }

    // 如果4连通合法，直接返回
    if (valid_regions4.length > 0 && valid) {
        return valid_regions4;
    }

    // 否则用8连通分组
    for (const [row, col] of all_cells) {
        const key = `${row},${col}`;
        if (!visited8.has(key)) {
            const region = bfs(row, col, directions8, visited8);
            regions8.push(region);
        }
    }
    const valid_regions8 = regions8.filter(region => region.length <= size);

    // 检查不同区域之间是否有相邻格子（8连通）
    valid = true;
    for (let i = 0; i < valid_regions8.length; i++) {
        for (let j = i + 1; j < valid_regions8.length; j++) {
            if (are_regions_adjacent(valid_regions8[i], valid_regions8[j], directions8)) {
                valid = false;
                break;
            }
        }
        if (!valid) break;
    }

    // 返回所有合法的额外区域（每个区域是一个数组，外层是数组）
    if (valid_regions8.length > 0 && valid) {
        return valid_regions8;
    }
    return [];
}

// 清除所有额外区域标记（界面和数据都恢复）
export function clear_fortress_marks(size) {
    state.fortress_cells.clear();
    // 移除所有格子的高亮
    const cells = document.querySelectorAll('.sudoku-cell.extra-region-mode');
    cells.forEach(cell => {
        cell.classList.remove('extra-region-cell');
    });
}

export function is_valid_fortress(board, size, row, col, num) {
    const container = document.querySelector('.sudoku-container');

    // 1. 常规区域判断（与普通数独一致）
    const mode = state.current_mode || 'fortress';
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

    // // 2. 堡垒区域判断
    // if (state.fortress_cells) {
    //     const fortress_regions = get_fortress_cells(); // 获取所有堡垒区域
    //     for (const region of fortress_regions) {
    //         // 检查当前格子是否属于该区域
    //         if (region.some(([r, c]) => r === row && c === col)) {
    //             // 将当前格子视为已填入 num
    //             const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

    //             // 获取该区域内的所有数字
    //             const numbers = region.map(([r, c]) => temp_board[r][c]).filter(n => n > 0);

    //             // 如果区域未填满，跳过检查
    //             if (numbers.length < region.length) {
    //                 continue;
    //             }

    //             // 检查数字是否连续
    //             const sortedNumbers = [...numbers].sort((a, b) => a - b);
    //             for (let i = 1; i < sortedNumbers.length; i++) {
    //                 if (sortedNumbers[i] - sortedNumbers[i - 1] !== 1) {
    //                     return false; // 数字不连续
    //                 }
    //             }
    //         }
    //     }
    // }

    // 3. 灰格数字要比上下左右相邻的白格数字大
    const directions = [
        [-1, 0], // 上
        [1, 0],  // 下
        [0, -1], // 左
        [0, 1],  // 右
    ];
    const cell_key = `${row},${col}`;
    if (state.fortress_cells.has(cell_key)) {
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                const neighbor_key = `${nr},${nc}`;
                if (!state.fortress_cells.has(neighbor_key)) {
                    // 如果是白格，检查灰格数字是否大于白格数字
                    const neighbor_value = board[nr][nc];
                    if (neighbor_value > 0 && num <= neighbor_value) {
                        return false; // 灰格数字不大于相邻白格数字
                    }
                }
            }
        }
    }

    // 4. 白格数字要比上下左右相邻的灰格数字小
    if (!state.fortress_cells.has(cell_key)) {
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                const neighbor_key = `${nr},${nc}`;
                if (state.fortress_cells.has(neighbor_key)) {
                    // 如果是灰格，检查白格数字是否小于灰格数字
                    const neighbor_value = board[nr][nc];
                    if (neighbor_value > 0 && num >= neighbor_value) {
                        return false; // 白格数字不小于相邻灰格数字
                    }
                }
            }
        }
    }

    return true;
}

// export function is_valid_fortress(board, size, row, col, num) {
//     const container = document.querySelector('.sudoku-container');

//     // 1. 常规区域判断（与普通数独一致）
//     const mode = state.current_mode || 'fortress';
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

//     // 2. 堡垒区域判断
//     if (state.fortress_cells) {
//         const fortress_regions = get_fortress_cells(); // 获取所有堡垒区域
//         for (const region of fortress_regions) {
//             // 检查当前格子是否属于该区域
//             if (region.some(([r, c]) => r === row && c === col)) {
//                 // 将当前格子视为已填入 num
//                 const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

//                 // 获取该区域内的所有数字
//                 const numbers = region.map(([r, c]) => temp_board[r][c]).filter(n => n > 0);

//                 // 如果区域未填满，跳过检查
//                 if (numbers.length < region.length) {
//                     continue;
//                 }

//                 // 检查数字是否连续
//                 const sortedNumbers = [...numbers].sort((a, b) => a - b);
//                 for (let i = 1; i < sortedNumbers.length; i++) {
//                     if (sortedNumbers[i] - sortedNumbers[i - 1] !== 1) {
//                         return false; // 数字不连续
//                     }
//                 }
//             }
//         }
//     }

//     // 3. 灰格数字要比上下左右相邻的白格数字大
//     const directions = [
//         [-1, 0], // 上
//         [1, 0],  // 下
//         [0, -1], // 左
//         [0, 1],  // 右
//     ];
//     const cell_key = `${row},${col}`;
//     if (state.fortress_cells.has(cell_key)) {
//         for (const [dr, dc] of directions) {
//             const nr = row + dr;
//             const nc = col + dc;
//             if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
//                 const neighbor_key = `${nr},${nc}`;
//                 if (state.fortress_cells.has(neighbor_key)) {
//                     // 如果相邻格子也是灰格，跳过该方向
//                     continue;
//                 }
//                 // 如果是白格，检查灰格数字是否大于白格数字
//                 const neighbor_value = board[nr][nc];
//                 if (neighbor_value > 0 && num <= neighbor_value) {
//                     return false; // 灰格数字不大于相邻白格数字
//                 }
//             }
//         }
//     }

//     // 4. 白格数字要比上下左右相邻的灰格数字小
//     if (!state.fortress_cells.has(cell_key)) {
//         for (const [dr, dc] of directions) {
//             const nr = row + dr;
//             const nc = col + dc;
//             if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
//                 const neighbor_key = `${nr},${nc}`;
//                 if (!state.fortress_cells.has(neighbor_key)) {
//                     // 如果相邻格子也是白格，跳过该方向
//                     continue;
//                 }
//                 // 如果是灰格，检查白格数字是否小于灰格数字
//                 const neighbor_value = board[nr][nc];
//                 if (neighbor_value > 0 && num >= neighbor_value) {
//                     return false; // 白格数字不小于相邻灰格数字
//                 }
//             }
//         }
//     }

//     return true;
// }

// export function is_valid_fortress(board, size, row, col, num) {
//     const container = document.querySelector('.sudoku-container');

//     // 1. 常规区域判断（与普通数独一致）
//     const mode = state.current_mode || 'fortress';
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

//     // 2. 堡垒区域判断
//     if (state.fortress_cells) {
//         const fortress_regions = get_fortress_cells(); // 获取所有堡垒区域
//         for (const region of fortress_regions) {
//             // 检查当前格子是否属于该区域
//             if (region.some(([r, c]) => r === row && c === col)) {
//                 // 将当前格子视为已填入 num
//                 const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

//                 // 获取该区域内的所有数字
//                 const numbers = region.map(([r, c]) => temp_board[r][c]).filter(n => n > 0);

//                 // 如果区域未填满，跳过检查
//                 if (numbers.length < region.length) {
//                     continue;
//                 }

//                 // 检查数字是否连续
//                 const sortedNumbers = [...numbers].sort((a, b) => a - b);
//                 for (let i = 1; i < sortedNumbers.length; i++) {
//                     if (sortedNumbers[i] - sortedNumbers[i - 1] !== 1) {
//                         return false; // 数字不连续
//                     }
//                 }
//             }
//         }
//     }

//     // 3. 灰格数字要比上下左右相邻的白格数字大
//     const directions = [
//         [-1, 0], // 上
//         [1, 0],  // 下
//         [0, -1], // 左
//         [0, 1],  // 右
//     ];
//     const cell_key = `${row},${col}`;
//     if (state.fortress_cells.has(cell_key)) {
//         for (const [dr, dc] of directions) {
//             const nr = row + dr;
//             const nc = col + dc;
//             if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
//                 const neighbor_key = `${nr},${nc}`;
//                 if (state.fortress_cells.has(neighbor_key)) {
//                     // 如果相邻格子也是灰格，直接跳过该方向
//                     continue;
//                 }
//                 // 如果是白格，检查灰格数字是否大于白格数字
//                 const neighbor_value = board[nr][nc];
//                 if (neighbor_value > 0 && num <= neighbor_value) {
//                     return false; // 灰格数字不大于相邻白格数字
//                 }
//             }
//         }
//     }

//     // 4. 白格数字要比上下左右相邻的灰格数字小
//     if (!state.fortress_cells.has(cell_key)) {
//         for (const [dr, dc] of directions) {
//             const nr = row + dr;
//             const nc = col + dc;
//             if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
//                 const neighbor_key = `${nr},${nc}`;
//                 if (!state.fortress_cells.has(neighbor_key)) {
//                     // 如果相邻格子也是白格，直接跳过该方向
//                     continue;
//                 }
//                 // 如果是灰格，检查白格数字是否小于灰格数字
//                 const neighbor_value = board[nr][nc];
//                 if (neighbor_value > 0 && num >= neighbor_value) {
//                     return false; // 白格数字不小于相邻灰格数字
//                 }
//             }
//         }
//     }

//     return true;
// }