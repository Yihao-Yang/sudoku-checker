import { state, set_current_mode } from '../solver/state.js';
import { bold_border, create_base_grid, handle_key_navigation, add_Extra_Button, log_process, create_base_cell, show_result, show_generating_timer, hide_generating_timer, clear_all_inputs } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_puzzle } from '../solver/generate.js';
import { get_all_regions, invalidate_regions_cache } from '../solver/solver_tool.js';


// 额外区域数独主入口
export function create_renban_sudoku(size) {
    set_current_mode('renban');
    show_result(`当前模式为灰格连续数独`);
    log_process('', true);
    log_process('规则：');
    log_process('灰色额外区域内数字连续');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    log_process('"额外区域"：附加的不可重复区域');
    log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('若自动生成图案无解请重启页面');
    log_process('若手动给的标记不合理可能会产生错误');
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
        // // 额外区域技巧
        Extra_Region_Elimination: true,
        Extra_Region_Naked_Pair: true,
        Extra_Region_Hidden_Pair: true,
        Extra_Region_Naked_Triple: true,
        Extra_Region_Hidden_Triple: true,
        Special_Combination_Region_Most_Not_Contain_1: true,
        Special_Combination_Region_Most_Not_Contain_2: true,
        Special_Combination_Region_Most_Not_Contain_3: true,
        Special_Combination_Region_Most_Not_Contain_4: true,
        // Special_Combination_Region_Most_Not_Contain_n: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Not_Contain_4: true,
        Special_Combination_Region_Most_Contain_1: true,
        Special_Combination_Region_Most_Contain_2: true,
        Special_Combination_Region_Most_Contain_3: true,
        Special_Combination_Region_Most_Contain_4: true,
        // Special_Combination_Region_Most_Contain_n: true,
        // Multi_Special_Combination_Region_Most_Contain_1: true,
        // Multi_Special_Combination_Region_Most_Contain_2: true,
        // Multi_Special_Combination_Region_Most_Contain_3: true,
        // Multi_Special_Combination_Region_Most_Contain_4: true,
        Special_Combination_Region_Cell_Elimination_1: true,
        Special_Combination_Region_Cell_Elimination_2: true,
        Special_Combination_Region_Cell_Elimination_3: true,
        Special_Combination_Region_Cell_Elimination_4: true,
        // Special_Combination_Region_Cell_Elimination_n: true,
        // Multi_Special_Combination_Region_Cell_Elimination_1: true,
        // Multi_Special_Combination_Region_Cell_Elimination_2: true,
        // Multi_Special_Combination_Region_Cell_Elimination_3: true,
        // Multi_Special_Combination_Region_Cell_Elimination_4: true,
        Special_Combination_Region_Elimination_1: true,
        Special_Combination_Region_Elimination_2: true,
        Special_Combination_Region_Elimination_3: true,
        Special_Combination_Region_Elimination_4: true,
        // Special_Combination_Region_Elimination_n: true,
        // Multi_Special_Combination_Region_Elimination_1: true,
        // Multi_Special_Combination_Region_Elimination_2: true,
        // Multi_Special_Combination_Region_Elimination_3: true,
        // Multi_Special_Combination_Region_Elimination_4: true,
        Special_Combination_Region_Block_1: true,
        Special_Combination_Region_Block_2: true,
        Special_Combination_Region_Block_3: true,
        Special_Combination_Region_Block_4: true,
        // Special_Combination_Region_Block_n: true,
        // Multi_Special_Combination_Region_Block_1: true,
        // Multi_Special_Combination_Region_Block_2: true,
        // Multi_Special_Combination_Region_Block_3: true,
        // Multi_Special_Combination_Region_Block_4: true,
    };
    // 唯余法全部默认开启
    for (let i = 1; i <= size; i++) {
        state.techniqueSettings[`Cell_Elimination_${i}`] = true;
    }

    // 刷新技巧面板
    create_technique_panel();

    // 额外区域格子集合
    state.renban_cells = new Set();

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
    add_Extra_Button('灰格连续', () => {create_renban_sudoku(size)}, '#2196F3');
    add_Extra_Button('添加标记', toggle_mark_mode, '#2196F3');
    add_Extra_Button('清除标记', () => clear_renban_marks(state.current_grid_size), '#2196F3');
    add_Extra_Button('自动出题', () => generate_renban_puzzle(size), '#2196F3');

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        // 额外区域模式标记
        cell.classList.add('extra-region-mode');

        // 额外区域高亮
        const cell_key = `${row},${col}`;
        if (state.renban_cells.has(cell_key)) {
            cell.classList.add('extra-region-cell');
            cell.classList.add('gray-cell');
        }

        // 点击格子添加/移除额外区域
        cell.addEventListener('click', function () {
            if (!is_mark_mode) return;
            if (state.renban_cells.has(cell_key)) {
                state.renban_cells.delete(cell_key);
                cell.classList.remove('extra-region-cell');
                cell.classList.remove('gray-cell');
                cell.classList.remove('gray-cell');
            } else {
                state.renban_cells.add(cell_key);
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

// 生成灰格连续数独题目
export function generate_renban_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    clear_all_inputs();
    clear_renban_marks(size);
    invalidate_regions_cache();
    log_process('', true);

    // 区域数量限制
    let min_region_count = 2, max_region_count = 4;
    if (size === 4) {
        min_region_count = 1;
        max_region_count = 2;
    } else if (size === 6) {
        min_region_count = 2;
        max_region_count = 4;
    } else if (size === 9) {
        min_region_count = 2;
        max_region_count = 6;
    }

    // 随机确定本次生成的区域数量
    const target_region_count = Math.floor(Math.random() * (max_region_count - min_region_count + 1)) + min_region_count;
    // log_process(`生成灰格连续区域个数：${target_region_count}`);

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

    // 方式二：生成两个对称区域（排除已占用格子）
    function generate_double_symmetric_regions(size, symmetry, get_symmetric_pos, occupied_cells) {
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
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
        while (attempts < 10) {
            attempts++;
            // 1. 随机选一个未被占用的格子
            let all_cells = [];
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    const key = cell_key(row, col);
                    if (!occupied_cells.has(key)) {
                        all_cells.push([row, col]);
                    }
                }
            }
            if (all_cells.length === 0) return [];
            
            // 洗牌
            for (let i = all_cells.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [all_cells[i], all_cells[j]] = [all_cells[j], all_cells[i]];
            }
            let [start_row, start_col] = all_cells[0];
            let [sym_row, sym_col] = get_symmetric_pos(start_row, start_col, size, symmetry);
    
            // 2. 检查对称点是否已被占用
            if (occupied_cells.has(cell_key(sym_row, sym_col))) continue;
    
            // 3. 检查不是同一格且不连通
            if (start_row === sym_row && start_col === sym_col) continue;
            if (is_adjacent([start_row, start_col], [sym_row, sym_col])) continue;
    
            // 4. 检查与已有区域是否相邻
            let adjacent_to_occupied = false;
            for (const occupied_key of occupied_cells) {
                const [occ_r, occ_c] = occupied_key.split(',').map(Number);
                if (is_adjacent([start_row, start_col], [occ_r, occ_c]) ||
                    is_adjacent([sym_row, sym_col], [occ_r, occ_c])) {
                    adjacent_to_occupied = true;
                    break;
                }
            }
            if (adjacent_to_occupied) continue;
    
            // 5. 初始化区域
            let region_1 = [[start_row, start_col]];
            let region_2 = [[sym_row, sym_col]];
            let region_1_set = new Set([cell_key(start_row, start_col)]);
            let region_2_set = new Set([cell_key(sym_row, sym_col)]);
    
            // 6. 随机确定区域大小（四宫和六宫：2到size-1，九宫：3到size-1）
            let min_size = 2;
            if (size === 9) {
                min_size = 3;
            }
            const max_size = size - 1;
            const target_size = Math.floor(Math.random() * (max_size - min_size + 1)) + min_size;
            // log_process(`生成灰格连续区域大小：${target_size}，对称类型：${symmetry}`);

            // 7. 循环扩展（穷尽候选并设置安全上限）
            let grow_attempts = 0;
            const MAX_GROW_ATTEMPTS = target_size * 50;
            
            while (region_1.length < target_size) {
                grow_attempts++;
                if (grow_attempts > MAX_GROW_ATTEMPTS) {
                    // 安全兜底：本区域扩展超过上限，结束生长，交由外层 attempts 重试
                    break;
                }
            
                // 构建完整候选 frontier
                const frontier = [];
                for (const [r, c] of region_1) {
                    for (const [dr, dc] of directions) {
                        const nr = r + dr, nc = c + dc;
                        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
            
                        const key = cell_key(nr, nc);
                        const [sym_nr, sym_nc] = get_symmetric_pos(nr, nc, size, symmetry);
                        const sym_key = cell_key(sym_nr, sym_nc);
            
                        if (region_1_set.has(key) || region_2_set.has(key)) continue;
                        if (region_1_set.has(sym_key) || region_2_set.has(sym_key)) continue;
                        if (occupied_cells.has(key) || occupied_cells.has(sym_key)) continue;
            
                        frontier.push([nr, nc]);
                    }
                }
            
                if (frontier.length === 0) {
                    // 没有可扩展的候选，放弃当前区域生长
                    break;
                }
            
                // 打乱候选，逐一尝试
                shuffle(frontier);
            
                let placed = false;
                for (const [cand_r, cand_c] of frontier) {
                    const [sym_r, sym_c] = get_symmetric_pos(cand_r, cand_c, size, symmetry);
            
                    // 相邻性检查（与对方对称格及已占用格保持不相邻）
                    let adjacent = false;
            
                    // 与自身区域相对的对称格的相邻性
                    for (const [r1, c1] of region_1) {
                        if (is_adjacent([r1, c1], [sym_r, sym_c])) { adjacent = true; break; }
                        if (is_adjacent([cand_r, cand_c], [sym_r, sym_c])) { adjacent = true; break; }
                    }
                    if (adjacent) continue;
            
                    // 与全局已占用格不相邻
                    for (const occupied_key of occupied_cells) {
                        const [occ_r, occ_c] = occupied_key.split(',').map(Number);
                        if (is_adjacent([cand_r, cand_c], [occ_r, occ_c]) ||
                            is_adjacent([sym_r, sym_c], [occ_r, occ_c])) {
                            adjacent = true;
                            break;
                        }
                    }
                    if (adjacent) continue;
            
                    // 通过校验，落子到两个区域
                    region_1.push([cand_r, cand_c]);
                    region_1_set.add(cell_key(cand_r, cand_c));
            
                    region_2.push([sym_r, sym_c]);
                    region_2_set.add(cell_key(sym_r, sym_c));
            
                    placed = true;
                    break; // 本轮扩展成功，进入下一轮
                }
            
                if (!placed) {
                    // 穷尽候选仍无法放置，放弃扩展
                    break;
                }
            }
            // // 7. 循环扩展
            // while (region_1.length < target_size) {
            //     let candidates = [];
            //     for (let [r, c] of region_1) {
            //         for (const [dr, dc] of directions) {
            //             let nr = r + dr, nc = c + dc;
            //             let key = cell_key(nr, nc);
            //             let [sym_nr, sym_nc] = get_symmetric_pos(nr, nc, size, symmetry);
            //             let sym_key = cell_key(sym_nr, sym_nc);
            //             // 边界判断
            //             if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
            //             if (region_1_set.has(key) || region_2_set.has(key)) continue;
            //             if (region_1_set.has(sym_key) || region_2_set.has(sym_key)) continue;
            //             // 检查是否已被其他区域占用
            //             if (occupied_cells.has(key) || occupied_cells.has(sym_key)) continue;
            //             candidates.push([nr, nc]);
            //         }
            //     }
            //     if (candidates.length === 0) break;
            //     // 随机选一个
            //     const idx = Math.floor(Math.random() * candidates.length);
            //     let [chosen_r, chosen_c] = candidates[idx];
            //     let [sym_chosen_r, sym_chosen_c] = get_symmetric_pos(chosen_r, chosen_c, size, symmetry);
    
            //     // 8. 判断新格子是否与已有区域或对方区域相邻
            //     let adjacent = false;
            //     for (let [r1, c1] of region_1) {
            //         if (is_adjacent([r1, c1], [sym_chosen_r, sym_chosen_c])) {
            //             adjacent = true;
            //             break;
            //         }
            //         if (is_adjacent([chosen_r, chosen_c], [sym_chosen_r, sym_chosen_c])) {
            //             adjacent = true;
            //             break;
            //         }
            //     }
            //     // 检查与已占用区域是否相邻
            //     for (const occupied_key of occupied_cells) {
            //         const [occ_r, occ_c] = occupied_key.split(',').map(Number);
            //         if (is_adjacent([chosen_r, chosen_c], [occ_r, occ_c]) ||
            //             is_adjacent([sym_chosen_r, sym_chosen_c], [occ_r, occ_c])) {
            //             adjacent = true;
            //             break;
            //         }
            //     }
            //     if (adjacent) continue;
    
            //     // 9. 添加到两个区域
            //     region_1.push([chosen_r, chosen_c]);
            //     region_1_set.add(cell_key(chosen_r, chosen_c));
            //     region_2.push([sym_chosen_r, sym_chosen_c]);
            //     region_2_set.add(cell_key(sym_chosen_r, sym_chosen_c));
            // }
    
            // 10. 检查数量
            if (region_1.length === target_size && region_2.length === target_size) {
                return [region_1, region_2];
            }
        }
        return [];
    }

    // 生成多个区域对
    let all_regions = [];
    let occupied_cells = new Set();
    
    // 计算需要生成的区域对数量（每次生成2个对称区域）
    const pair_count = Math.ceil(target_region_count / 2);
    
    for (let i = 0; i < pair_count; i++) {
        const new_regions = generate_double_symmetric_regions(size, symmetry, get_symmetric_pos, occupied_cells);
        if (new_regions.length === 0) {
            break;
        }
        
        // 将新区域添加到结果中
        for (const region of new_regions) {
            all_regions.push(region);
            // 标记格子为已占用
            for (const [row, col] of region) {
                occupied_cells.add(`${row},${col}`);
            }
            // 如果已达到目标数量，停止生成
            if (all_regions.length > target_region_count) {
                break;
            }
        }
        if (all_regions.length > target_region_count) {
            break;
        }
    }

    if (all_regions.length === 0) {
        log_process('自动生成额外区域失败，请重试');
        return;
    }

    state.renban_cells.clear();
    for (const region of all_regions) {
        for (const [row, col] of region) {
            let key = `${row},${col}`;
            state.renban_cells.add(key);
            let cell = document.querySelector(`.sudoku-cell.extra-region-mode[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('extra-region-cell');
        }
    }

    log_process(`注意生成的灰格连续区域位置，若无解，请重启网页`);
    log_process(`正在生成题目，请稍候...`)
    show_result(`注意生成的灰格连续区域位置，若无解，请重启网页`);
    show_generating_timer();
    
    setTimeout(() => {
        generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
        hide_generating_timer();
    }, 0);
    // generate_puzzle(state.current_grid_size, score_lower_limit, holes_count);
}

// 获取所有合法的额外区域
export function get_renban_cells() {
    const all_cells = Array.from(state.renban_cells).map(key => key.split(',').map(Number));
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
export function clear_renban_marks(size) {
    state.renban_cells.clear();
    invalidate_renban_cache(); // 清除缓存
    // 移除所有格子的高亮
    const cells = document.querySelectorAll('.sudoku-cell.extra-region-mode');
    cells.forEach(cell => {
        cell.classList.remove('extra-region-cell');
        cell.classList.remove('gray-cell');
    });
}

// export function is_valid_renban(board, size, row, col, num) {
//     const container = document.querySelector('.sudoku-container');

//     // 1. 常规区域判断（与普通数独一致）
//     const mode = state.current_mode || 'renban';
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

//     // 2. 灰格连续区域判断
//     if (state.renban_cells) {
//         const renban_regions = get_renban_cells(); // 获取所有灰格连续区域
//         for (const region of renban_regions) {
//             // 检查当前格子是否属于该区域
//             if (region.some(([r, c]) => r === row && c === col)) {
//                 // 获取该区域内的所有数字
//                 const numbers = region.map(([r, c]) => board[r][c]).filter(n => n > 0);

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

//     // 将当前格视为已填入 num（不修改原 board）
//     const temp_board = board.map((r, i) => r.map((c, j) => (i === row && j === col ? num : c)));

//     return true;
// }


// 缓存每个格子的相关格（Peers）
let _peers_cache = null;
let _peers_cache_size = 0;
let _peers_cache_mode = '';

function get_peers(size, mode) {
    if (_peers_cache && _peers_cache_size === size && _peers_cache_mode === mode) {
        return _peers_cache;
    }

    const peers = Array.from({ length: size }, () => Array.from({ length: size }, () => []));
    const regions = get_all_regions(size, mode);

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell_peers = new Set();
            for (const region of regions) {
                // 检查当前格是否在该区域
                if (region.cells.some(([row, col]) => row === r && col === c)) {
                    for (const [row, col] of region.cells) {
                        if (row !== r || col !== c) {
                            // 将坐标编码为整数以存入 Set: r * size + c
                            cell_peers.add(row * size + col);
                        }
                    }
                }
            }
            // 解码回坐标数组
            peers[r][c] = Array.from(cell_peers).map(val => [Math.floor(val / size), val % size]);
        }
    }

    _peers_cache = peers;
    _peers_cache_size = size;
    _peers_cache_mode = mode;
    return peers;
}

// export function is_valid_renban(board, size, row, col, num) {
//     // const container = document.querySelector('.sudoku-container');

//     // // 1. 常规区域判断（与普通数独一致）
//     // const mode = state.current_mode || 'renban';
//     // const regions = get_all_regions(size, mode);
//     // for (const region of regions) {
//     //     if (region.cells.some(([r, c]) => r === row && c === col)) {
//     //         for (const [r, c] of region.cells) {
//     //             if ((r !== row || c !== col) && board[r][c] === num) {
//     //                 return false;
//     //             }
//     //         }
//     //     }
//     // }

//     const mode = state.current_mode || 'renban';

//     // 1. 快速常规区域判断（使用预计算 Peers）
//     const peers = get_peers(size, mode)[row][col];
//     for (let i = 0; i < peers.length; i++) {
//         const [r, c] = peers[i];
//         if (board[r][c] === num) {
//             return false;
//         }
//     }

//     // 2. 灰格连续区域判断
//     if (state.renban_cells) {
//         const renban_regions = get_renban_cells(); // 获取所有灰格连续区域
//         for (const region of renban_regions) {
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

//     return true;
// }

// ...existing code...

// 缓存 renban 区域和格子映射
let _renban_regions_cache = null;
let _renban_cells_snapshot = null;
let _renban_cell_to_region_map = null;

function get_renban_regions_cached() {
    // 检查 renban_cells 是否有变化
    const current_snapshot = Array.from(state.renban_cells).sort().join('|');
    if (_renban_regions_cache && _renban_cells_snapshot === current_snapshot) {
        return { regions: _renban_regions_cache, cell_map: _renban_cell_to_region_map };
    }

    // 重新计算
    const regions = get_renban_cells();
    
    // 构建格子到区域索引的映射
    const cell_map = new Map();
    for (let i = 0; i < regions.length; i++) {
        for (const [r, c] of regions[i]) {
            cell_map.set(`${r},${c}`, i);
        }
    }

    _renban_regions_cache = regions;
    _renban_cells_snapshot = current_snapshot;
    _renban_cell_to_region_map = cell_map;

    return { regions, cell_map };
}

// 清除 renban 缓存（在标记变化时调用）
export function invalidate_renban_cache() {
    _renban_regions_cache = null;
    _renban_cells_snapshot = null;
    _renban_cell_to_region_map = null;
}

export function is_valid_renban(board, size, row, col, num) {
    const mode = state.current_mode || 'renban';

    // 1. 快速常规区域判断（使用预计算 Peers）
    const peers = get_peers(size, mode)[row][col];
    for (let i = 0; i < peers.length; i++) {
        const [r, c] = peers[i];
        if (board[r][c] === num) {
            return false;
        }
    }

    // 2. 灰格连续区域判断（优化版）
    if (state.renban_cells && state.renban_cells.size > 0) {
        const cell_key = `${row},${col}`;
        const { regions, cell_map } = get_renban_regions_cached();
        
        // 快速查找当前格子所属的区域索引
        const region_idx = cell_map.get(cell_key);
        if (region_idx === undefined) {
            return true; // 当前格子不在任何 renban 区域中
        }

        const region = regions[region_idx];
        const region_len = region.length;

        // 统计区域内已填数字，不创建临时数组
        let filled_count = 0;
        let min_num = Infinity;
        let max_num = -Infinity;
        const num_set = new Set();

        for (let i = 0; i < region_len; i++) {
            const [r, c] = region[i];
            let val;
            if (r === row && c === col) {
                val = num; // 当前格子视为已填入 num
            } else {
                val = board[r][c];
            }
            
            if (typeof val === 'number' && val > 0) {
                // 检查重复数字
                if (num_set.has(val)) {
                    return false; // renban 区域内数字不能重复
                }
                num_set.add(val);
                filled_count++;
                if (val < min_num) min_num = val;
                if (val > max_num) max_num = val;
            }
        }

        // 如果区域未填满，跳过连续性检查
        if (filled_count < region_len) {
            return true;
        }

        // 检查数字是否连续：最大值 - 最小值 + 1 应等于区域长度
        // 且没有重复数字（已在上面检查）
        if (max_num - min_num + 1 !== region_len) {
            return false;
        }
    }

    return true;
}