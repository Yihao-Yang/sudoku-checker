import { state, set_current_mode } from '../solver/state.js';
import { bold_border, create_base_grid, handle_key_navigation, add_Extra_Button, log_process, create_base_cell, show_result, show_generating_timer, hide_generating_timer, clear_all_inputs } from '../solver/core.js';
import { create_technique_panel } from '../solver/classic.js';
import { generate_puzzle, generate_solved_board_brute_force } from '../solver/generate.js';
import { invalidate_regions_cache, get_all_regions } from '../solver/solver_tool.js';


// 行号转字母（1→A, 2→B, ...）
function getRowLetter(rowNum) {
    return String.fromCharCode(64 + rowNum);
}

// 计算区域的唯一索引键（排序后的坐标串，用于 killer_sums 的 key）
function get_region_index(region) {
    return region
        .slice()
        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
        .map(([r, c]) => `${getRowLetter(r + 1)}${c + 1}`)
        .join('-');
}

// 杀手数独主入口
export function create_killer_sudoku(size) {
    set_current_mode('killer');
    show_result(`当前模式为杀手数独`);
    log_process('', true);
    log_process('规则：');
    log_process('灰色额外区域内数字不重复');
    log_process('');
    log_process('技巧：');
    log_process('"变型"：用到变型条件删数的技巧');
    log_process('"_n"后缀：区域内剩余空格数/区块用到的空格数');
    log_process('"额外区域"：附加的不可重复区域');
    // log_process('"特定组合"：受附加条件影响的区域');
    log_process('');
    log_process('出题：');
    log_process('10秒，超1分钟请重启页面或调整限制条件');
    log_process('若生成图案无解请重启页面');
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

    // 杀手格子集合与区域列表
    state.killer_cells = new Set();
    state.killer_regions = [];
    state.killer_sums = {};

    const { container, grid } = create_base_grid(size);
    const inputs = Array.from({ length: size }, () => new Array(size));

    // 标记模式状态
    let is_mark_mode = false;
    let is_dragging = false;
    let current_drag_region = null;
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
    add_Extra_Button('杀手', () => {create_killer_sudoku(size)}, '#2196F3');
    add_Extra_Button('添加标记', toggle_mark_mode, '#2196F3');
    add_Extra_Button('清除标记', () => clear_killer_marks(state.current_grid_size), '#2196F3');
    add_Extra_Button('自动出题', state.create_mode_specific_generate_handler?.((score_lower_limit, holes_count) => generate_killer_puzzle(size, score_lower_limit, holes_count)) || (() => generate_killer_puzzle(size)), '#2196F3');

    for (let i = 0; i < size * size; i++) {
        const row = Math.floor(i / size);
        const col = i % size;

        const { cell, main_input, candidates_grid } = create_base_cell(row, col, size);

        // 杀手模式标记
        cell.classList.add('extra-region-mode');

        const cell_key = `${row},${col}`;

        // 按住鼠标拖动标记杀手区域
        cell.addEventListener('mousedown', function (e) {
            if (!is_mark_mode) return;
            e.preventDefault();
            is_dragging = true;
            current_drag_region = [[row, col]];
            state.killer_regions.push(current_drag_region);
            state.killer_cells.add(cell_key);
            update_killer_borders();
        });

        cell.addEventListener('mouseenter', function () {
            if (!is_mark_mode || !is_dragging) return;
            if (!state.killer_cells.has(cell_key)) {
                state.killer_cells.add(cell_key);
                current_drag_region.push([row, col]);
                update_killer_borders();
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

    // 创建完成后绘制虚线边框

    // 全局 mouseup 结束拖动，弹出和值输入框
    document.addEventListener('mouseup', function () {
        if (!is_dragging) return;
        const finished_region = current_drag_region;
        is_dragging = false;
        current_drag_region = null;

        // 在区域左上角弹出和值输入框（与虚线框保持相同间距）
        if (finished_region && finished_region.length > 0) {
            let minRow = Infinity, minCol = Infinity;
            for (const [r, c] of finished_region) {
                if (r < minRow || (r === minRow && c < minCol)) {
                    minRow = r;
                    minCol = c;
                }
            }

            // 与 update_killer_borders 保持一致的边距计算
            let boxRows, boxCols;
            if (size === 6) { boxRows = 2; boxCols = 3; }
            else { boxRows = Math.sqrt(size); boxCols = Math.sqrt(size); }
            const leftOff = minCol === 0 ? 5.5 : (minCol % boxCols === 0 ? 3.4 : 1.5);
            const topOff = minRow === 0 ? 5.5 : (minRow % boxRows === 0 ? 3.4 : 1.5);

            const index = get_region_index(finished_region);
            const currentVal = state.killer_sums?.[index] || '';

            const inp = document.createElement('input');
            inp.type = 'number';
            inp.className = 'killer-sum-input';
            inp.style.left = (minCol * 60 + leftOff) + 'px';
            inp.style.top = (minRow * 60 + topOff) + 'px';
            inp.value = currentVal;
            inp.min = 1;
            inp.placeholder = '?';
            inp.addEventListener('input', function () {
                const v = parseInt(this.value, 10);
                if (!isNaN(v) && v > 0) {
                    if (!state.killer_sums) state.killer_sums = {};
                    state.killer_sums[index] = v;
                } else if (this.value === '') {
                    if (state.killer_sums) delete state.killer_sums[index];
                }
            });
            grid.appendChild(inp);
        }
    });

    update_killer_borders();

    container.appendChild(grid);
    gridDisplay.appendChild(container);
}

// 渲染/刷新所有杀手区域的和值输入框
function render_killer_sum_inputs(size) {
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;
    // 移除旧输入框
    grid.querySelectorAll('.killer-sum-input').forEach(el => el.remove());
    if (!state.killer_regions || state.killer_regions.length === 0) return;

    let boxRows, boxCols;
    if (size === 6) { boxRows = 2; boxCols = 3; }
    else { boxRows = Math.sqrt(size); boxCols = Math.sqrt(size); }

    for (const region of state.killer_regions) {
        if (!Array.isArray(region) || region.length === 0) continue;
        const index = get_region_index(region);
        const sum = state.killer_sums?.[index];
        if (!Number.isFinite(sum) || sum <= 0) continue;

        // 找区域左上角
        let minRow = Infinity, minCol = Infinity;
        for (const [r, c] of region) {
            if (r < minRow || (r === minRow && c < minCol)) {
                minRow = r;
                minCol = c;
            }
        }

        const leftOff = minCol === 0 ? 5.5 : (minCol % boxCols === 0 ? 3.4 : 1.5);
        const topOff = minRow === 0 ? 5.5 : (minRow % boxRows === 0 ? 3.4 : 1.5);

        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'killer-sum-input';
        inp.style.left = (minCol * 60 + leftOff) + 'px';
        inp.style.top = (minRow * 60 + topOff) + 'px';
        inp.value = sum;
        inp.min = 1;
        inp.readOnly = true; // 自动生成的和值不可编辑
        grid.appendChild(inp);
    }
}

// 生成杀手数独题目
// 流程：生成终盘 → 对称划分区域（数字不重复）→ 验证唯一解 → 挖洞出题
export function generate_killer_puzzle(size, score_lower_limit = 0, holes_count = undefined) {
    clear_all_inputs();
    clear_killer_marks(size);
    invalidate_regions_cache();
    log_process('', true);

    const MAX_TRY = 15;
    const SYMMETRY_TYPES = [
        'central','central','central','central','central',
        'diagonal','diagonal',
        'anti-diagonal','anti-diagonal',
        'horizontal',
        'vertical',
    ];
    let symmetry; // 在 for 循环内赋值，供闭包函数访问

    function get_symmetric_pos(row, col) {
        switch (symmetry) {
            case 'horizontal':  return [size - 1 - row, col];
            case 'vertical':    return [row, size - 1 - col];
            case 'central':     return [size - 1 - row, size - 1 - col];
            case 'diagonal':    return [col, row];
            case 'anti-diagonal': return [size - 1 - col, size - 1 - row];
            default:            return [row, col];
        }
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // 从终盘计算区域和值
    function compute_region_sum(region, solvedBoard) {
        let sum = 0;
        for (const [r, c] of region) {
            sum += solvedBoard[r][c];
        }
        return sum;
    }

    // 从一个种子格出发，生长对称区域（4连通）
    // 自对称种子 → 单区域，配对加入保持 symmetric(R)=R
    // 非自对称种子 → 双区域 lockstep，跳过自对称 frontier 格
    function grow_region_pair(seedR, seedC, solvedBoard, assigned) {
        const [sSR, sSC] = get_symmetric_pos(seedR, seedC);
        const seedIsSelfSym = (sSR === seedR && sSC === seedC);

        const directions = [[-1,0],[1,0],[0,-1],[0,1]];
        const targetSize = 3 + Math.floor(Math.random() * (size - 2)); // 3 ~ size

        if (seedIsSelfSym) {
            // === 自对称区域：单区域生长 ===
            const region = [[seedR, seedC]];
            const regionSet = new Set([`${seedR},${seedC}`]);
            const regionDigits = new Set([solvedBoard[seedR][seedC]]);

            while (region.length < targetSize) {
                // 收集区域的所有邻居
                const frontier = [];
                const seen = new Set();
                for (const [r, c] of region) {
                    for (const [dr, dc] of directions) {
                        const nr = r + dr, nc = c + dc;
                        const key = `${nr},${nc}`;
                        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
                        if (regionSet.has(key) || assigned.has(key)) continue;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        frontier.push([nr, nc]);
                    }
                }
                shuffle(frontier);

                let added = false;
                for (const [nr, nc] of frontier) {
                    const digit = solvedBoard[nr][nc];
                    const [sr, sc] = get_symmetric_pos(nr, nc);
                    const isSelfSym = (sr === nr && sc === nc);

                    if (isSelfSym) {
                        // 自对称邻居：单格加入
                        if (regionDigits.has(digit)) continue;
                        region.push([nr, nc]);
                        regionSet.add(`${nr},${nc}`);
                        regionDigits.add(digit);
                        added = true;
                        break;
                    } else {
                        // 非自对称邻居：格 + 对称格成对加入同一区域
                        if (regionDigits.has(digit)) continue;
                        const sKey = `${sr},${sc}`;
                        if (assigned.has(sKey)) continue;
                        if (regionSet.has(sKey)) continue;
                        const sDigit = solvedBoard[sr][sc];
                        if (regionDigits.has(sDigit)) continue;
                        if (digit === sDigit) continue; // 成对两格之间也不能重复

                        region.push([nr, nc]);
                        regionSet.add(`${nr},${nc}`);
                        regionDigits.add(digit);
                        region.push([sr, sc]);
                        regionSet.add(sKey);
                        regionDigits.add(sDigit);
                        added = true;
                        break;
                    }
                }
                if (!added) break;
            }

            return { primary: region, secondary: [] };

        } else {
            // === 对称配对区域：primary + secondary lockstep 生长 ===
            const primary = [[seedR, seedC]];
            const primarySet = new Set([`${seedR},${seedC}`]);
            const primaryDigits = new Set([solvedBoard[seedR][seedC]]);

            const secondary = [[sSR, sSC]];
            const secondarySet = new Set([`${sSR},${sSC}`]);
            const secondaryDigits = new Set([solvedBoard[sSR][sSC]]);

            while (primary.length < targetSize) {
                // 收集 primary 区域的邻居
                const frontier = [];
                const seen = new Set();
                for (const [r, c] of primary) {
                    for (const [dr, dc] of directions) {
                        const nr = r + dr, nc = c + dc;
                        const key = `${nr},${nc}`;
                        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
                        if (primarySet.has(key) || assigned.has(key)) continue;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        frontier.push([nr, nc]);
                    }
                }
                shuffle(frontier);

                let added = false;
                for (const [nr, nc] of frontier) {
                    const digit = solvedBoard[nr][nc];
                    if (primaryDigits.has(digit)) continue;

                    const [sr, sc] = get_symmetric_pos(nr, nc);
                    const sKey = `${sr},${sc}`;

                    // 跳过自对称格（留给自对称区域处理）
                    if (sr === nr && sc === nc) continue;

                    // 对称格必须未分配且不与当前区域冲突
                    if (assigned.has(sKey)) continue;
                    if (primarySet.has(sKey)) continue;
                    if (secondarySet.has(sKey)) continue;

                    const sDigit = solvedBoard[sr][sc];
                    if (secondaryDigits.has(sDigit)) continue;

                    // 双向加入
                    primary.push([nr, nc]);
                    primarySet.add(`${nr},${nc}`);
                    primaryDigits.add(digit);

                    secondary.push([sr, sc]);
                    secondarySet.add(sKey);
                    secondaryDigits.add(sDigit);

                    added = true;
                    break;
                }
                if (!added) break;
            }

            return { primary, secondary };
        }
    }

    for (let attempt = 0; attempt < MAX_TRY; attempt++) {
        // 1) 生成终盘
        const solvedBoard = generate_solved_board_brute_force(size);
        if (!solvedBoard) continue;

        // 2) 随机选对称类型
        symmetry = SYMMETRY_TYPES[Math.floor(Math.random() * SYMMETRY_TYPES.length)];

        // 3) 对称划分全盘
        const assigned = new Set();
        const allRegions = [];

        // 自对称格优先，再处理非自对称格
        const selfSymCells = [];
        const nonSelfSymCells = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const [sr, sc] = get_symmetric_pos(r, c);
                if (sr === r && sc === c) {
                    selfSymCells.push([r, c]);
                } else {
                    nonSelfSymCells.push([r, c]);
                }
            }
        }
        shuffle(selfSymCells);
        shuffle(nonSelfSymCells);
        const allCells = [...selfSymCells, ...nonSelfSymCells];

        for (const [seedR, seedC] of allCells) {
            if (assigned.has(`${seedR},${seedC}`)) continue;

            const { primary, secondary } = grow_region_pair(seedR, seedC, solvedBoard, assigned);

            // 标记 primary
            allRegions.push(primary);
            for (const [r, c] of primary) assigned.add(`${r},${c}`);

            // 标记 secondary（若非空）
            if (secondary.length > 0) {
                allRegions.push(secondary);
                for (const [r, c] of secondary) assigned.add(`${r},${c}`);
            }
        }

        if (assigned.size !== size * size) continue; // 没覆盖全盘，重试

        // 4) 计算和值
        const sums = {};
        for (const region of allRegions) {
            const index = get_region_index(region);
            sums[index] = compute_region_sum(region, solvedBoard);
        }

        // 5) 写入 state
        state.killer_cells.clear();
        state.killer_regions = [];
        state.killer_sums = {};
        for (const region of allRegions) {
            state.killer_regions.push(region);
            for (const [row, col] of region) {
                state.killer_cells.add(`${row},${col}`);
            }
        }
        state.killer_sums = sums;
        update_killer_borders();
        render_killer_sum_inputs(size);

        // 6) 挖洞出题（终盘作为种子传入）
        log_process(`杀手区域生成成功，正在挖洞出题...`);
        show_result(`正在生成题目，请稍候...`);
        show_generating_timer();
        setTimeout(() => {
            const result = generate_puzzle(size, score_lower_limit, holes_count, solvedBoard, { symmetry: symmetry });
            hide_generating_timer();
            if (!result || !result.puzzle) return;

            // 7) 提取题目数字所在区域并切分
            const puzzle = result.puzzle;
            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            const regionsToSplit = new Set();
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (puzzle[r][c] === 0) continue;
                    for (const region of allRegions) {
                        for (const [rr, cc] of region) {
                            if (rr === r && cc === c) { regionsToSplit.add(region); break; }
                        }
                    }
                }
            }

            for (const region of regionsToSplit) {
                if (allRegions.indexOf(region) < 0) continue; // 可能已被对称切分处理掉
                if (region.length < 3) continue;
                const symIdx = get_region_index(region.map(([r, c]) => {
                    const [sr, sc] = get_symmetric_pos(r, c); return [sr, sc];
                }));
                const isSelfSym = symIdx === get_region_index(region);

                if (isSelfSym) {
                    const selfSym = [], nonSelf = [];
                    for (const [r, c] of region) {
                        const [sr, sc] = get_symmetric_pos(r, c);
                        if (sr === r && sc === c) selfSym.push([r, c]);
                        else nonSelf.push([r, c]);
                    }
                    for (const cell of selfSym) allRegions.push([cell]);
                    const ri = allRegions.indexOf(region);
                    if (ri >= 0) allRegions.splice(ri, 1);
                    if (nonSelf.length > 0) {
                        const nsSet = new Set(nonSelf.map(([r, c]) => `${r},${c}`));
                        const visited = new Set();
                        for (const [r, c] of nonSelf) {
                            if (visited.has(`${r},${c}`)) continue;
                            const comp = [];
                            const q = [[r, c]];
                            visited.add(`${r},${c}`);
                            while (q.length) {
                                const [cr, cc] = q.shift();
                                comp.push([cr, cc]);
                                for (const [dr, dc] of dirs) {
                                    const k = `${cr + dr},${cc + dc}`;
                                    if (nsSet.has(k) && !visited.has(k)) {
                                        visited.add(k);
                                        q.push([cr + dr, cc + dc]);
                                    }
                                }
                            }
                            allRegions.push(comp);
                        }
                    }
                } else {
                    let counterpart = null;
                    for (const other of allRegions) {
                        if (other !== region && get_region_index(other) === symIdx) { counterpart = other; break; }
                    }
                    if (!counterpart) continue;

                    const cellSet = new Set(region.map(([r, c]) => `${r},${c}`));
                    let far = region[0], v = new Set([`${far[0]},${far[1]}`]), queue = [far];
                    while (queue.length) {
                        const [r, c] = queue.shift(); far = [r, c];
                        for (const [dr, dc] of dirs) {
                            const k = `${r + dr},${c + dc}`;
                            if (cellSet.has(k) && !v.has(k)) { v.add(k); queue.push([r + dr, c + dc]); }
                        }
                    }
                    const half = Math.floor(region.length / 2);
                    const subA = []; v = new Set(); queue = [far]; v.add(`${far[0]},${far[1]}`);
                    while (queue.length && subA.length < half) {
                        const [r, c] = queue.shift(); subA.push([r, c]);
                        for (const [dr, dc] of dirs) {
                            const k = `${r + dr},${c + dc}`;
                            if (cellSet.has(k) && !v.has(k)) { v.add(k); queue.push([r + dr, c + dc]); }
                        }
                    }
                    const aSet = new Set(subA.map(([r, c]) => `${r},${c}`));
                    const subB = region.filter(([r, c]) => !aSet.has(`${r},${c}`));
                    if (subB.length === 0) continue;
                    const bv = new Set(), bq = [subB[0]]; bv.add(`${subB[0][0]},${subB[0][1]}`);
                    while (bq.length) {
                        const [r, c] = bq.shift();
                        for (const [dr, dc] of dirs) {
                            const k = `${r + dr},${c + dc}`;
                            if (cellSet.has(k) && !aSet.has(k) && !bv.has(k)) { bv.add(k); bq.push([r + dr, c + dc]); }
                        }
                    }
                    if (bv.size !== subB.length) continue;
                    const dup = (cells) => { const s = new Set(); for (const [r, c] of cells) { const d = solvedBoard[r][c]; if (s.has(d)) return true; s.add(d); } return false; };
                    if (dup(subA) || dup(subB)) continue;
                    const symA = subA.map(([r, c]) => { const [sr, sc] = get_symmetric_pos(r, c); return [sr, sc]; });
                    const symB = subB.map(([r, c]) => { const [sr, sc] = get_symmetric_pos(r, c); return [sr, sc]; });
                    const i1 = allRegions.indexOf(region);
                    if (i1 >= 0) allRegions.splice(i1, 1, subA, subB);
                    const i2 = allRegions.indexOf(counterpart);
                    if (i2 >= 0) allRegions.splice(i2, 1, symA, symB);
                }
            }

            // 重算 sums + 更新 state
            const newSums = {};
            for (const region of allRegions) {
                newSums[get_region_index(region)] = compute_region_sum(region, solvedBoard);
            }
            state.killer_cells.clear(); state.killer_regions = [];
            for (const region of allRegions) {
                state.killer_regions.push(region);
                for (const [row, col] of region) state.killer_cells.add(`${row},${col}`);
            }
            state.killer_sums = newSums;
            update_killer_borders();
            render_killer_sum_inputs(size);
            generate_puzzle(size, score_lower_limit, holes_count, solvedBoard, { symmetry: symmetry });
        }, 0);
        return;
    }

    // 所有尝试均失败
    log_process('自动生成杀手失败，请重试');
    show_result('自动生成杀手失败，请重试');
}

// 计算所有连通分量的外边缘
// 返回 Map<"row,col", Set<"top"|"bottom"|"left"|"right">>
export function compute_region_outer_edges(cellSet, size) {
    const edgeMap = new Map();
    if (!cellSet || cellSet.size === 0) return edgeMap;

    const allCells = Array.from(cellSet).map(key => key.split(',').map(Number));
    const visited = new Set();
    const components = [];

    // 4连通BFS找所有连通分量
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    function bfs(startRow, startCol) {
        const queue = [[startRow, startCol]];
        const comp = [[startRow, startCol]];
        visited.add(`${startRow},${startCol}`);
        while (queue.length) {
            const [r, c] = queue.shift();
            for (const [dr, dc] of directions) {
                const nr = r + dr, nc = c + dc;
                const key = `${nr},${nc}`;
                if (cellSet.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push([nr, nc]);
                    comp.push([nr, nc]);
                }
            }
        }
        return comp;
    }

    for (const [row, col] of allCells) {
        const key = `${row},${col}`;
        if (!visited.has(key)) {
            components.push(bfs(row, col));
        }
    }

    // 对每个分量计算外边缘
    for (const comp of components) {
        const compSet = new Set(comp.map(([r, c]) => `${r},${c}`));
        for (const [r, c] of comp) {
            const key = `${r},${c}`;
            const edges = new Set();

            // 上边
            if (r === 0 || !compSet.has(`${r - 1},${c}`)) edges.add('top');
            // 下边
            if (r === size - 1 || !compSet.has(`${r + 1},${c}`)) edges.add('bottom');
            // 左边
            if (c === 0 || !compSet.has(`${r},${c - 1}`)) edges.add('left');
            // 右边
            if (c === size - 1 || !compSet.has(`${r},${c + 1}`)) edges.add('right');

            if (edges.size > 0) {
                edgeMap.set(key, edges);
            }
        }
    }

    return edgeMap;
}

// 计算单个区域的外边缘（不做BFS，区域已独立）
// regionSet: Set<"row,col">
function compute_single_region_edges(regionSet, size) {
    const edgeMap = new Map();
    if (!regionSet || regionSet.size === 0) return edgeMap;

    for (const key of regionSet) {
        const [r, c] = key.split(',').map(Number);
        const edges = new Set();

        if (r === 0 || !regionSet.has(`${r - 1},${c}`)) edges.add('top');
        if (r === size - 1 || !regionSet.has(`${r + 1},${c}`)) edges.add('bottom');
        if (c === 0 || !regionSet.has(`${r},${c - 1}`)) edges.add('left');
        if (c === size - 1 || !regionSet.has(`${r},${c + 1}`)) edges.add('right');

        if (edges.size > 0) {
            edgeMap.set(key, edges);
        }
    }

    return edgeMap;
}

// 更新杀手区域虚线边框（SVG叠加层，不覆盖宫线/格线）
export function update_killer_borders() {
    const size = state.current_grid_size;
    const grid = document.querySelector('.sudoku-grid');
    if (!grid) return;

    // 找到或创建 SVG 叠加层（参照多斜线模式）
    let svg = grid.querySelector('.killer-svg');
    if (svg) {
        svg.innerHTML = ''; // 清空旧线条
    } else {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('killer-svg');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        grid.style.position = 'relative';
        grid.appendChild(svg);
    }
    svg.setAttribute('width', grid.clientWidth);
    svg.setAttribute('height', grid.clientHeight);

    if (!state.killer_regions || state.killer_regions.length === 0) return;

    // 宫格尺寸（与 bold_border 一致）
    let boxRows, boxCols;
    if (size === 6) { boxRows = 2; boxCols = 3; }
    else { boxRows = Math.sqrt(size); boxCols = Math.sqrt(size); }

    // 根据边挨着的线类型返回偏移：边缘线→7，宫线→5，格线→3
    function hOffset(row, side) {
        const br = side === 'top' ? row : row + 1;
        if (br === 0 || br === size) return 7;
        if (br % boxRows === 0) return 5;
        return 3;
    }
    function vOffset(col, side) {
        const bc = side === 'left' ? col : col + 1;
        if (bc === 0 || bc === size) return 7;
        if (bc % boxCols === 0) return 5;
        return 3;
    }

    const allSegments = [];

    // 逐区域独立计算边框，各区域边框不连接
    for (const region of state.killer_regions) {
        const regionSet = new Set(region.map(([r, c]) => `${r},${c}`));
        const edgeMap = compute_single_region_edges(regionSet, size);
        if (edgeMap.size === 0) continue;

        // 将 Map<"row,col", Set<side>> 转为边列表 [{row, col, side}]
        const edges = [];
        for (const [key, sides] of edgeMap) {
            const [row, col] = key.split(',').map(Number);
            for (const side of sides) {
                edges.push({ row, col, side });
            }
        }

        // 从原始边列表构建拐角交点 Map<"gr,gc", {x: number|null, y: number|null}>
        const corners = new Map();
        function addCorner(gr, gc, x, y) {
            const key = `${gr},${gc}`;
            let c = corners.get(key);
            if (!c) { c = { x: null, y: null }; corners.set(key, c); }
            if (x !== null) c.x = x;
            if (y !== null) c.y = y;
        }
        for (const { row, col, side } of edges) {
            if (side === 'top') {
                const y = row * 60 + hOffset(row, 'top');
                addCorner(row, col, null, y);
                addCorner(row, col + 1, null, y);
            } else if (side === 'bottom') {
                const y = (row + 1) * 60 - hOffset(row, 'bottom');
                addCorner(row + 1, col, null, y);
                addCorner(row + 1, col + 1, null, y);
            } else if (side === 'left') {
                const x = col * 60 + vOffset(col, 'left');
                addCorner(row, col, x, null);
                addCorner(row + 1, col, x, null);
            } else if (side === 'right') {
                const x = (col + 1) * 60 - vOffset(col, 'right');
                addCorner(row, col + 1, x, null);
                addCorner(row + 1, col + 1, x, null);
            }
        }

        const groups = { top: {}, bottom: {}, left: {}, right: {} };
        for (const { row, col, side } of edges) {
            if (side === 'top' || side === 'bottom') {
                if (!groups[side][row]) groups[side][row] = [];
                groups[side][row].push(col);
            } else {
                if (!groups[side][col]) groups[side][col] = [];
                groups[side][col].push(row);
            }
        }

        // 处理水平边（top / bottom）——端点对齐到拐角交点
        for (const side of ['top', 'bottom']) {
            for (const [rowStr, cols] of Object.entries(groups[side])) {
                const row = parseInt(rowStr);
                const y = side === 'top'
                    ? row * 60 + hOffset(row, 'top')
                    : (row + 1) * 60 - hOffset(row, 'bottom');

                cols.sort((a, b) => a - b);
                let start = cols[0], end = cols[0];
                for (let i = 1; i < cols.length; i++) {
                    if (cols[i] === end + 1) {
                        end = cols[i];
                    } else {
                        const gridRow = side === 'top' ? row : row + 1;
                        const cl = corners.get(`${gridRow},${start}`);
                        const cr = corners.get(`${gridRow},${end + 1}`);
                        const sx = (cl && cl.x !== null) ? cl.x : start * 60 + 2;
                        const ex = (cr && cr.x !== null) ? cr.x : (end + 1) * 60 - 2;
                        allSegments.push({ x1: sx, y1: y, x2: ex, y2: y });
                        start = end = cols[i];
                    }
                }
                const gridRow = side === 'top' ? row : row + 1;
                const cl = corners.get(`${gridRow},${start}`);
                const cr = corners.get(`${gridRow},${end + 1}`);
                const sx = (cl && cl.x !== null) ? cl.x : start * 60 + 2;
                const ex = (cr && cr.x !== null) ? cr.x : (end + 1) * 60 - 2;
                allSegments.push({ x1: sx, y1: y, x2: ex, y2: y });
            }
        }

        // 处理垂直边（left / right）——端点对齐到拐角交点
        for (const side of ['left', 'right']) {
            for (const [colStr, rows] of Object.entries(groups[side])) {
                const col = parseInt(colStr);
                const x = side === 'left'
                    ? col * 60 + vOffset(col, 'left')
                    : (col + 1) * 60 - vOffset(col, 'right');

                rows.sort((a, b) => a - b);
                let start = rows[0], end = rows[0];
                for (let i = 1; i < rows.length; i++) {
                    if (rows[i] === end + 1) {
                        end = rows[i];
                    } else {
                        const gridCol = side === 'left' ? col : col + 1;
                        const ct = corners.get(`${start},${gridCol}`);
                        const cb = corners.get(`${end + 1},${gridCol}`);
                        const sy = (ct && ct.y !== null) ? ct.y : start * 60 + 2;
                        const ey = (cb && cb.y !== null) ? cb.y : (end + 1) * 60 - 2;
                        allSegments.push({ x1: x, y1: sy, x2: x, y2: ey });
                        start = end = rows[i];
                    }
                }
                const gridCol = side === 'left' ? col : col + 1;
                const ct = corners.get(`${start},${gridCol}`);
                const cb = corners.get(`${end + 1},${gridCol}`);
                const sy = (ct && ct.y !== null) ? ct.y : start * 60 + 2;
                const ey = (cb && cb.y !== null) ? cb.y : (end + 1) * 60 - 2;
                allSegments.push({ x1: x, y1: sy, x2: x, y2: ey });
            }
        }
    }

    // 绘制 SVG 线段
    for (const seg of allSegments) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', seg.x1);
        line.setAttribute('y1', seg.y1);
        line.setAttribute('x2', seg.x2);
        line.setAttribute('y2', seg.y2);
        line.setAttribute('stroke', '#666');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-dasharray', '6,4');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);
    }
}

// 获取所有合法的杀手区域
export function get_killer_cells() {
    const regions = state.killer_regions || [];
    // 每个区域直接作为额外区域，不做 size/adjacency 校验
    return regions.filter(region => region && region.length > 0);
}

// 清除所有杀手标记（界面和数据都恢复）
export function clear_killer_marks(size) {
    state.killer_cells.clear();
    state.killer_regions = [];
    state.killer_sums = {};
    // 移除 SVG 虚线层
    const svg = document.querySelector('.sudoku-grid .killer-svg');
    if (svg) svg.innerHTML = '';
    // 移除和值输入框
    document.querySelectorAll('.sudoku-grid .killer-sum-input').forEach(el => el.remove());
    // 移除所有格子的高亮（兼容旧数据）
    const cells = document.querySelectorAll('.sudoku-cell.extra-region-mode');
    cells.forEach(cell => {
        cell.classList.remove('extra-region-cell', 'gray-cell');
    });
}

// 杀手数独自定义有效性检测：标准区域重复 + 杀手区域和值约束
export function is_valid_killer(board, size, row, col, num) {
    // 1. 标准区域重复检查（行/列/宫/杀手额外区域）
    const regions = get_all_regions(size, 'killer');
    for (const region of regions) {
        if (region.cells.some(([r, c]) => r === row && c === col)) {
            for (const [r, c] of region.cells) {
                if ((r !== row || c !== col) && board[r][c] === num) {
                    return false;
                }
            }
        }
    }

    // 2. 杀手区域和值约束检查
    const killer_regions = state.killer_regions;
    const killer_sums = state.killer_sums || {};
    if (!Array.isArray(killer_regions)) return true;

    for (const region of killer_regions) {
        if (!Array.isArray(region) || region.length === 0) continue;

        // 当前格是否在此区域内
        if (!region.some(([r, c]) => r === row && c === col)) continue;

        // 计算区域索引，查找和值
        const index = region
            .slice()
            .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
            .map(([r, c]) => `${String.fromCharCode(64 + r + 1)}${c + 1}`)
            .join('-');
        const targetSum = killer_sums[index];
        if (!Number.isFinite(targetSum) || targetSum <= 0) continue;

        // 统计区域内其他格子的填数情况和空格数
        let currentSum = 0;
        let emptyCount = 0;
        for (const [r, c] of region) {
            if (r === row && c === col) continue;
            const cell = board[r][c];
            if (typeof cell === 'number' && cell > 0) {
                currentSum += cell;
            } else {
                emptyCount++;
            }
        }

        const totalAfter = currentSum + num;

        if (emptyCount === 0) {
            // 所有格已填：和必须精确等于目标
            if (totalAfter !== targetSum) return false;
        } else {
            // 还有空格：不能提前达到/超过目标，也不能连理论最小值都达不到
            if (totalAfter + emptyCount > targetSum) return false;
            if (totalAfter + emptyCount * size < targetSum) return false;
        }
    }

    return true;
}
