import { state, set_current_mode } from './state.js';
import { bold_border, create_base_grid, handle_key_navigation, add_Extra_Button, log_process } from './core.js';
import { create_technique_panel } from './classic.js';
import { generate_puzzle } from '../solver/generate.js';


// 额外区域数独主入口
export function create_extra_region_sudoku(size) {
    set_current_mode('extra_region');
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
        Variant_Hidden_Triple: true
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= 9; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 刷新技巧面板
    create_technique_panel();

    // 额外区域格子集合
    state.extra_region_cells = new Set();

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
    add_Extra_Button('清除标记', () => clear_extra_region_marks(state.current_grid_size), '#2196F3');
    add_Extra_Button('自动出题', () => generate_extra_region_puzzle(size), '#2196F3');

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const cell = document.createElement('div');
        cell.className = 'sudoku-cell extra-region-mode';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const main_input = document.createElement('input');
        main_input.type = 'text';
        main_input.className = 'main-input';
        main_input.maxLength = size;
        main_input.dataset.row = row;
        main_input.dataset.col = col;

        // 额外区域高亮
        const cell_key = `${row},${col}`;
        if (state.extra_region_cells.has(cell_key)) {
            cell.classList.add('extra-region-cell');
        }

        // 点击格子添加/移除额外区域
        cell.addEventListener('click', function () {
            if (!is_mark_mode) return;
            if (state.extra_region_cells.has(cell_key)) {
                state.extra_region_cells.delete(cell_key);
                cell.classList.remove('extra-region-cell');
            } else {
                state.extra_region_cells.add(cell_key);
                cell.classList.add('extra-region-cell');
            }
        });

        cell.appendChild(main_input);
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


// export function generate_extra_region_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
//     clear_extra_region_marks(size);

//     // 支持的对称类型
//     const SYMMETRY_TYPES = [
//         'central', 'horizontal', 'vertical', 'diagonal', 'anti-diagonal'
//     ];
//     const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

//     // 生成对称点
//     function get_symmetric_pos(row, col, size, symmetry) {
//         switch (symmetry) {
//             case 'horizontal':
//                 return [size - 1 - row, col];
//             case 'vertical':
//                 return [row, size - 1 - col];
//             case 'central':
//                 return [size - 1 - row, size - 1 - col];
//             case 'diagonal':
//                 return [col, row];
//             case 'anti-diagonal':
//                 return [size - 1 - col, size - 1 - row];
//             default:
//                 return [row, col];
//         }
//     }

//     // 8连通方向
//     const directions = [
//         [-1, 0], [1, 0], [0, -1], [0, 1],
//         [-1, -1], [-1, 1], [1, -1], [1, 1]
//     ];

//     // 判断两个格子是否相邻
//     function are_adjacent(r1, c1, r2, c2) {
//         for (const [dr, dc] of directions) {
//             if (r1 + dr === r2 && c1 + dc === c2) {
//                 return true;
//             }
//         }
//         return false;
//     }

//     // 检查两个区域是否连通
//     function are_regions_connected(regionA, regionB) {
//         for (const [r1, c1] of regionA) {
//             for (const [r2, c2] of regionB) {
//                 if (are_adjacent(r1, c1, r2, c2)) {
//                     return true;
//                 }
//             }
//         }
//         return false;
//     }

//     // 自动生成题目
//     generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
// }

// ...existing code...

// ...existing code...

export function generate_extra_region_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    clear_extra_region_marks(size);

    // 支持的对称类型
    const SYMMETRY_TYPES = [
        'horizontal', 'vertical', 'diagonal', 'anti-diagonal', 'diagonal', 'anti-diagonal', 'diagonal', 'anti-diagonal'
    ];
    const symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

    // 生成对称点
    function get_symmetric_pos(row, col, size, symmetry) {
        switch (symmetry) {
            case 'horizontal':
                return [size - 1 - row, col];
            case 'vertical':
                return [row, size - 1 - col];
            // case 'central':
            //     return [size - 1 - row, size - 1 - col];
            case 'diagonal':
                return [col, row];
            case 'anti-diagonal':
                return [size - 1 - col, size - 1 - row];
            default:
                return [row, col];
        }
    }

    // 判断是否在对称线上
    function is_on_symmetry_line(row, col, size, symmetry) {
        switch (symmetry) {
            case 'horizontal':
                return row === (size - 1 - row);
            case 'vertical':
                return col === (size - 1 - col);
            // case 'central':
            //     return row === (size - 1 - row) && col === (size - 1 - col);
            case 'diagonal':
                return row === col;
            case 'anti-diagonal':
                return row + col === size - 1;
            default:
                return false;
        }
    }

    // 判断是否挨着对称线
    function is_adjacent_to_symmetry_line(row, col, size, symmetry) {
        switch (symmetry) {
            case 'horizontal':
                return Math.abs(row - (size - 1 - row)) === 1;
            case 'vertical':
                return Math.abs(col - (size - 1 - col)) === 1;
            // case 'central':
            //     return (Math.abs(row - (size - 1 - row)) === 1 && col === (size - 1 - col)) ||
            //            (Math.abs(col - (size - 1 - col)) === 1 && row === (size - 1 - row));
            case 'diagonal':
                return Math.abs(row - col) === 1;
            case 'anti-diagonal':
                return Math.abs((row + col) - (size - 1)) === 1;
            default:
                return false;
        }
    }

    // 8连通方向
    const directions = [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

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
    
    // 方式一：生成一个对称区域（允许对称线上的格子）——随机选格子再检查8连通
    function generate_single_symmetric_region() {
        // 判断格子是否合法（在对称线或邻近对称线）
        function is_valid_cell(row, col, size, symmetry) {
            return (
                row >= 0 && row < size && col >= 0 && col < size &&
                (is_on_symmetry_line(row, col, size, symmetry) ||
                 is_adjacent_to_symmetry_line(row, col, size, symmetry))
            );
        }
    
        // 判断8连通
        function is_connected(cells) {
            if (cells.length === 0) return false;
            const visited = new Set();
            const queue = [cells[0]];
            visited.add(cells[0].join(','));
            const directions8 = [
                [-1, 0], [1, 0], [0, -1], [0, 1],
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ];
            while (queue.length) {
                const [r, c] = queue.shift();
                for (const [dr, dc] of directions8) {
                    const nr = r + dr, nc = c + dc;
                    const key = `${nr},${nc}`;
                    if (
                        cells.some(([rr, cc]) => rr === nr && cc === nc) &&
                        !visited.has(key)
                    ) {
                        visited.add(key);
                        queue.push([nr, nc]);
                    }
                }
            }
            return visited.size === cells.length;
        }
    
        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            // 找到所有合法格子
            let candidates = [];
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if (is_valid_cell(row, col, size, symmetry)) {
                        candidates.push([row, col]);
                    }
                }
            }
            if (candidates.length < size) continue;
            // 随机选size个格子
            shuffle(candidates);
            let region = candidates.slice(0, size);
            // 检查8连通
            if (!is_connected(region)) continue;
            // 检查对称性
            let regionSym = region.map(([r, c]) => get_symmetric_pos(r, c, size, symmetry));
            let isSymmetric = region.every(([r, c]) =>
                regionSym.some(([sr, sc]) => sr === r && sc === c)
            );
            if (!isSymmetric) continue;
            return [region];
        }
        return [];
    }
    
    // 方式二：生成两个对称区域（都不在对称线及其邻近）——随机选格子再检查8连通
    function generate_double_symmetric_regions() {
        // 判断格子是否合法
        function is_valid_cell(row, col, size, symmetry) {
            return (
                row >= 0 && row < size && col >= 0 && col < size &&
                !is_on_symmetry_line(row, col, size, symmetry) &&
                !is_adjacent_to_symmetry_line(row, col, size, symmetry)
            );
        }
    
        // 判断8连通
        function is_connected(cells) {
            if (cells.length === 0) return false;
            const visited = new Set();
            const queue = [cells[0]];
            visited.add(cells[0].join(','));
            const directions8 = [
                [-1, 0], [1, 0], [0, -1], [0, 1],
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ];
            while (queue.length) {
                const [r, c] = queue.shift();
                for (const [dr, dc] of directions8) {
                    const nr = r + dr, nc = c + dc;
                    const key = `${nr},${nc}`;
                    if (
                        cells.some(([rr, cc]) => rr === nr && cc === nc) &&
                        !visited.has(key)
                    ) {
                        visited.add(key);
                        queue.push([nr, nc]);
                    }
                }
            }
            return visited.size === cells.length;
        }
    
        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            // 找到所有合法格子
            let candidates = [];
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if (is_valid_cell(row, col, size, symmetry)) {
                        candidates.push([row, col]);
                    }
                }
            }
            if (candidates.length < size) continue;
            // 随机选size个格子
            shuffle(candidates);
            let regionA = candidates.slice(0, size);
            // 检查8连通
            if (!is_connected(regionA)) continue;
            // 生成对称区域
            let regionB = regionA.map(([r, c]) => get_symmetric_pos(r, c, size, symmetry));
            // 检查对称区域是否合法
            if (!regionB.every(([r, c]) => is_valid_cell(r, c, size, symmetry))) continue;
            if (!is_connected(regionB)) continue;
            return [regionA, regionB];
        }
        return [];
    }

    // 随机选择生成方式
    let regions = [];
    if (Math.random() < 0.3) {
        regions = generate_single_region();
    } else if (Math.random() < 0.5) {
        regions = generate_single_symmetric_region();
    } else {
        regions = generate_double_symmetric_regions();
    }
    if (regions.length === 0) {
        log_process('自动生成额外区域失败，请重试');
        return;
    }

    state.extra_region_cells.clear();
    for (const region of regions) {
        for (const [row, col] of region) {
            let key = `${row},${col}`;
            state.extra_region_cells.add(key);
            let cell = document.querySelector(`.sudoku-cell.extra-region-mode[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('extra-region-cell');
        }
    }

    generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
}


// ...existing

export function get_extra_region_cells() {
    const all_cells = Array.from(state.extra_region_cells).map(key => key.split(',').map(Number));
    const size = state.current_grid_size;
    const visited = new Set();
    const regions = [];

    // 8连通方向
    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    // BFS查找连通块
    function bfs(start_row, start_col) {
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

    // 分组所有连通块
    for (const [row, col] of all_cells) {
        const key = `${row},${col}`;
        if (!visited.has(key)) {
            const region = bfs(row, col);
            // log_process(`检测到一个连通区域，格子数量为: ${region.length}`, region);
            regions.push(region);
        }
    }

    // 如果只有一个区域，且格子数量等于size，直接返回（不要求连通）
    if (all_cells.length === size) {
        return [all_cells];
    }

    // 只保留格子数量等于size的连通块
    const valid_regions = regions.filter(region => region.length === size);

    // 检查不同区域之间是否有相邻格子（8连通）
    function are_regions_adjacent(regionA, regionB) {
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
    for (let i = 0; i < valid_regions.length; i++) {
        for (let j = i + 1; j < valid_regions.length; j++) {
            if (are_regions_adjacent(valid_regions[i], valid_regions[j])) {
                return [];
            }
        }
    }

    // 返回所有合法的额外区域（每个区域是一个数组，外层是数组）
    return valid_regions;
}
// 清除所有额外区域标记（界面和数据都恢复）
export function clear_extra_region_marks(size) {
    state.extra_region_cells.clear();
    // 移除所有格子的高亮
    const cells = document.querySelectorAll('.sudoku-cell.extra-region-mode');
    cells.forEach(cell => {
        cell.classList.remove('extra-region-cell');
    });
}
